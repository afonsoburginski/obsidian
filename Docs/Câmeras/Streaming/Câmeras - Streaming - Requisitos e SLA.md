---
tags:
  - doc
  - cameras
  - streaming
  - ms-cameras
aliases:
  - "Streaming - Requisitos e SLA"
  - "Câmeras - Streaming - Requisitos e SLA"
atualizado: 2026-10-07
---

# Câmeras - Streaming - Requisitos e SLA

Volta para [[Câmeras - Streaming]].

## Resumo

A meta do vídeo ao vivo é menos de 1,5 s por célula no WebRTC, ainda sem medição na tela; o LL-HLS, a reserva,
fica segundos atrás. Uma câmera custa uma puxada por path, não uma por espectador, e o fleet inteiro aceita até
40 paths de câmera no ar. O MediaMTX dá 8 s para a câmera abrir e fecha a puxada 30 s depois do último leitor; o
player espera até 15 s pela negociação WebRTC. O passo a passo que estas metas medem está em
[[Câmeras - Streaming - Fluxos]].

## Regras

| Regra | Valor | Onde no código |
| --- | --- | --- |
| Latência no WebRTC (primário, operação ao vivo e PTZ) | meta abaixo de 1,5 s por célula, sem medição na tela; cerca de 500 ms na referência externa | RNF-CAM-03, UF-040, INT-024 |
| Latência no LL-HLS (reserva) | segundos; não medida na config atual | RNF-CAM-03 |
| Custo por câmera, não por espectador | uma puxada RTSP por path (câmera, tier e codec), N leitores nela | `live-stream-path.service.ts`, RNF-CAM-21 |
| Teto de paths de câmera no ar | 40, para o fleet inteiro | `live-stream-fleet.service.ts` |
| Abertura da câmera pelo primeiro leitor | até 8 s | `live-stream-path.config.ts` |
| Puxada depois do último leitor | 30 s | `live-stream-path.config.ts` |
| Keyframe nas Axis | a cada 300 ms (`round(fps x 0,3)` quadros) | `camera-stream-source.resolver.ts`, INT-024 |
| Negociação WHEP | 15 s; 404 repetido com recuo de 1 s a 5 s por até 60 s | `media-connection.ts` |
| Mídia WebRTC e primeiro quadro | 8 s para a mídia chegar, 6 s para o primeiro quadro | `media-connection.ts` |
| Primeiro quadro no LL-HLS | 12 s; depois disso, erro terminal | `media-connection.ts` |
| Memória de falha WHEP | 60 s por origem, câmera e codec | `utils/whep-failure-tracker.util.ts` |
| Volta do LL-HLS ao WebRTC | 30 s, dobrando até 300 s | `constants/media-connection.constants.ts` |
| Conexão compartilhada sem dono | sobrevive 8 s | `live-media-registry.service.ts` |
| AV1 decodificado em software | até 4 sessões por aba; a seguinte pede H.264 | `stream-codec-probe.constants.ts`, UF-047 |
| Retenção do TTFF no banco | 7 dias, a mesma das janelas de disponibilidade (`AVAILABILITY_WINDOW_RETENTION_DAYS`) | `health/workers/availability-rollup.service.ts` |

Na entrada de um espectador pesam a abertura da câmera, paga só pelo primeiro leitor de um path fechado (até 8 s),
e o próximo keyframe (cerca de 300 ms nas Axis). O atraso que o selo do player mostra vai do servidor ao vidro,
porque os carimbos são do relógio do MediaMTX. Espectadores no LL-HLS ficam segundos atrás dos que estão no WebRTC.

### TTFF

O watcher mede uma amostra por abertura de path: `availableTime` novo do path menos o `created` do leitor mais
antigo dele, entre `/v3/webrtc/sessions/list` e `/v3/hls/sessions/list` (num path sob demanda é o pedido desse
leitor que liga a fonte). Abertura cujos leitores já saíram não gera amostra, e a primeira leitura depois do boot
só aprende o que já estava disponível. Abertura que estoura o timeout vira falha do leitor, não amostra.

A amostra vai para o histograma `ms_cameras_stream_ttff_seconds{quality,codec}` (buckets até 15 s) e, sem
bloquear o watcher se falhar, para a tabela `CameraTtffSample` (`CameraTtffRepository.insert`, uma linha por
abertura); a gravação avisa a sala da câmera para os cards de saúde reconsultarem.

### Métricas

No `/metrics` do `ms-cameras` (`Authorization: Bearer $METRICS_SCRAPE_TOKEN`), definidas em
`streaming/streaming.metrics.ts`:

| Métrica | O que mede |
| --- | --- |
| `ms_cameras_stream_ttff_seconds{quality,codec}` | TTFF por abertura de path |
| `ms_cameras_stream_relays_active{quality,codec}` | paths de câmera disponíveis por variante |
| `ms_cameras_stream_viewers_active` | leitores somados sobre os paths disponíveis |
| `ms_cameras_stream_sessions_refused_total` | aberturas recusadas pelo teto |
| `ms_cameras_stream_path_config_writes_total{outcome}` | `UNCHANGED`, `CREATED`, `UPDATED` ou `DEFERRED` |

Leitores divididos por paths é a taxa de reuso. `UNCHANGED` dominante é o regime estável. O MediaMTX em si não
expõe métricas (`metrics: no`).

## Variáveis de ambiente

Do `ms-cameras`, salvo indicação. A explicação de cada uma também está em `apps/ms-cameras/docs/ENV.md`.

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `STREAM_SOURCE_START_TIMEOUT_MS` | `8000` | Quanto o MediaMTX segura o WHEP do primeiro leitor enquanto a câmera conecta; fica abaixo dos 15 s do player. |
| `STREAM_SOURCE_CLOSE_AFTER_MS` | `30000` | Quanto o path segue puxando depois do último leitor; cobre reconexão e troca de tier sem reabrir a câmera. |
| `MAX_CONCURRENT_STREAM_SESSIONS` | `40` | Teto de paths de câmera no ar, para o fleet inteiro. |
| `RTSP_TRANSPORT` | `tcp` | `tcp`, `udp`, `multicast` ou `automatic`; `udp_multicast` é lido como `multicast`; outro valor recusa o boot. |
| `STREAM_AV1_ENABLED` | `false` | Liga o AV1 nativo da câmera; desligado, nenhum pedido recebe AV1. |
| `MEDIAMTX_WEBRTC_BASE_URL` | `/live` | Base da `url` WHEP que o player recebe e da URL WHIP do espelho do videowall; relativa ou absoluta, precisa de rota com o mesmo prefixo na frente do SPA. |
| `MEDIAMTX_HLS_BASE_URL` | `/live-hls` | Base da `hlsUrl`; mesma regra da anterior. |
| `MEDIAMTX_RTSP_URL` | `rtsp://localhost:8554` | Endereço RTSP do MediaMTX que o processador do videowall usa para ler o espelho e a projeção. |
| `MEDIAMTX_API_URL` | `http://localhost:9997` | Control API, endereço de servidor. |
| `MEDIAMTX_DIAG_TIMEOUT_MS` | `2000` | Timeout de cada chamada à control API. |
| `CAMERA_KEYFRAME_INTERVAL_MS` | `300` | Orçamento de keyframe VAPIX (Axis). |
| `CAMERA_KEYFRAME_INTERVAL` | vazio | Quadros fixos que vencem o orçamento. |
| `MEDIAMTX_API_ALLOWED_IPS` | loopback e RFC1918 | Do compose, não do `ms-cameras`: faixa que alcança a control API (`MTX_AUTHINTERNALUSERS_2_IPS`). |
| `MTX_WEBRTCADDITIONALHOSTS` | vazio | Do MediaMTX, no compose do servidor: o IP público que ele anuncia para a mídia WebRTC. |

As quatro `MEDIAMTX_*_URL` são obrigatórias: faltando uma, o `ms-cameras` recusa o boot.

## Glossário

| Termo | O que é |
| --- | --- |
| TTFF | Tempo até o primeiro quadro de uma abertura de path |
| Path | Entrada do MediaMTX com um nome e uma fonte; cada câmera, tier e codec é um path |
| Fleet | O conjunto de todas as réplicas do `ms-cameras` contra o mesmo MediaMTX |
| Selo do player | Indicador na célula com o caminho em uso (`HLS`) e o atraso medido |
