---
tags:
  - doc
  - ms-cameras
  - cameras
  - streaming
atualizado: 2026-10-02
aliases:
  - "Streaming - Requisitos e SLA"
---

# Câmeras - Streaming - Requisitos e SLA

Volta para [[Câmeras - Streaming]]. O passo a passo que estas metas medem está em [[Câmeras - Streaming - Fluxos]].
Fonte: `apps/ms-cameras/src/streaming/` (`streaming.metrics.ts`, `services/stream-ttff-recorder.service.ts`,
`workers/live-stream-path-watcher.service.ts`).

## Latência (RNF-CAM-03)

| Caminho | Latência | Uso |
| --- | --- | --- |
| WebRTC/WHEP | meta abaixo de 1,5 s por célula, sem medição na tela; cerca de 500 ms na referência externa | primário, operação ao vivo e PTZ |
| LL-HLS | segundos, não medido na config atual | reserva |

Na entrada de um espectador pesam a abertura da câmera, paga só pelo primeiro leitor de um path fechado
(até 8 s), e o próximo keyframe (cerca de 300 ms nas Axis). O atraso que o selo do player mostra vai do
servidor ao vidro, porque os carimbos são do relógio do MediaMTX. Espectadores no LL-HLS ficam segundos
atrás dos que estão no WebRTC.

## TTFF

O watcher mede uma amostra por abertura de path: `availableTime` novo do path menos o `created` do leitor
mais antigo dele, entre `/v3/webrtc/sessions/list` e `/v3/hls/sessions/list` (num path sob demanda é o
pedido desse leitor que liga a fonte). Abertura cujos leitores já saíram não gera amostra, e o primeiro
tick depois do boot só aprende o que já estava disponível. Abertura que estoura o timeout vira falha do
leitor, não amostra.

A amostra vai para o histograma `ms_cameras_stream_ttff_seconds{quality,codec}` (buckets até 15 s) e,
best-effort, para `cameraTtffSample` (`CameraTtffRepository.insert`, uma linha por abertura, retenção de
7 dias); a gravação avisa a sala da câmera para os cards de saúde reconsultarem.

## Métricas (`streaming/streaming.metrics.ts`)

No `/metrics` do `ms-cameras` (`Authorization: Bearer $METRICS_SCRAPE_TOKEN`):

| Métrica | O que mede |
| --- | --- |
| `ms_cameras_stream_ttff_seconds{quality,codec}` | TTFF por abertura de path |
| `ms_cameras_stream_relays_active{quality,codec}` | paths de câmera disponíveis por variante |
| `ms_cameras_stream_viewers_active` | leitores somados sobre os paths disponíveis |
| `ms_cameras_stream_sessions_refused_total` | aberturas recusadas pelo teto |
| `ms_cameras_stream_path_config_writes_total{outcome}` | `UNCHANGED`, `CREATED`, `UPDATED` ou `DEFERRED` |

Leitores divididos por paths é a taxa de reuso. `UNCHANGED` dominante é o regime estável. O MediaMTX em si
não expõe métricas.

## Env vars

| Var | Padrão | Efeito |
| --- | --- | --- |
| `STREAM_SOURCE_START_TIMEOUT_MS` | `8000` | Quanto o MediaMTX segura o WHEP do primeiro leitor enquanto a câmera conecta; abaixo dos 15 s do player. |
| `STREAM_SOURCE_CLOSE_AFTER_MS` | `30000` | Quanto o path segue puxando depois do último leitor; cobre reconexão e troca de tier sem reabrir a câmera. |
| `MAX_CONCURRENT_STREAM_SESSIONS` | `40` | Teto de paths de câmera no ar, para o fleet inteiro. |
| `RTSP_TRANSPORT` | `tcp` | `tcp`, `udp`, `multicast` ou `automatic`; `udp_multicast` é lido como `multicast`; outro valor recusa o boot. |
| `MEDIAMTX_WEBRTC_BASE_URL` / `MEDIAMTX_HLS_BASE_URL` | `/live` / `/live-hls` | Bases de navegador; absoluta continua aceita. |
| `MEDIAMTX_API_URL` | `http://localhost:9997` | Control API, endereço de servidor. |
| `MEDIAMTX_DIAG_TIMEOUT_MS` | `2000` | Timeout de cada chamada à control API. |
| `CAMERA_KEYFRAME_INTERVAL_MS` | `300` | Orçamento de keyframe VAPIX (Axis). |
| `CAMERA_KEYFRAME_INTERVAL` | vazio | Quadros fixos que vencem o orçamento. |
| `MEDIAMTX_API_ALLOWED_IPS` | loopback e RFC1918 | Faixa que alcança a control API (`MTX_AUTHINTERNALUSERS_2_IPS` no compose). |
