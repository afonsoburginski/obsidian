---
tags:
  - doc
  - ms-cameras
  - cameras
  - streaming
atualizado: 2026-10-01
---

# Streaming - Fluxos e SLA

Volta para [[Streaming]]. Os mecanismos citados aqui estão em [[Streaming - Arquitetura e estratégias]].
Fonte: `apps/ms-cameras/src/streaming/` (`streaming.controller.ts`, `services/live-stream-path.service.ts`,
`services/live-stream-fleet.service.ts`, `workers/live-stream-path-watcher.service.ts`,
`services/stream-ttff-recorder.service.ts`, `services/stream-diagnostics.service.ts`).

## `GET /api/cameras/:id/hls?quality=&codec=`

`@Public()`, rota Kong `ms-cameras-allowlist-hls-session` sem plugin `jwt`. Garante o path e devolve as
URLs; não espera a câmera.

1. **Parse**: `ParseUUIDPipe` no id e `ParseStreamTypePipe` (`pipes/parse-stream-type.pipe.ts`) na
   qualidade, padrão `PRIMARY`; valor inválido vira 400 `INVALID_INPUT` com `field: 'quality'`. O mesmo
   pipe serve o endpoint de diagnóstico.
2. **Codec efetivo** (`negotiateEffectiveCodec`): `H264` ou `H265`; analítico embarcado ativo força `H264`.
3. **Teto antes do resolve** (`refuseWhenFull`): teto cheio e câmera sem path disponível nem admitido
   responde 429 `RATE_LIMIT_EXCEEDED`, detalhe `STREAM_SESSION_CAP_REACHED`.
4. **Resolve a fonte**: cadeia de qualidade, VAPIX e URL H264 de reserva. `DomainException` sai intacta
   (409 `BUSINESS_RULE_VIOLATION`, detalhe `STREAM_PROFILE_NOT_CONFIGURED`, em que o front ramifica);
   qualquer outra falha, Prisma incluído, vira 502 `EXTERNAL_SERVICE_ERROR` com detalhe
   `HLS_START_TIMEOUT`, que o player repete.
5. **H265 no H264 disponível**: responde o path H264 com `codec: 'H264'`, sem tocar em config.
6. **Admite e garante**: `LiveStreamFleet.admit` e `LiveStreamPathService.ensure` (read-before-write).
   Falha na escrita, com o MediaMTX fora incluído, vira o mesmo 502.
7. **Resposta** `{ url, hlsUrl, status, quality, codec }`:
   - `url`: `<MEDIAMTX_WEBRTC_BASE_URL>/<id>-<quality>[-h265]/whep`.
   - `hlsUrl`: `<MEDIAMTX_HLS_BASE_URL>/<id>-<quality>[-h265]/index.m3u8`.
   - `status`: `ACTIVE` se o path já está disponível, `STARTING` se este leitor vai abri-lo.
   - `quality` e `codec` servidos; `<quality>` vai em minúsculas na URL.
   - `leaseId` do contrato `IHlsSessionResponse` é `@deprecated` e nunca vem preenchido.

Quem espera a câmera é o MediaMTX, segurando o POST do WHEP do primeiro leitor até a fonte ficar pronta
ou até `STREAM_SOURCE_START_TIMEOUT_MS`. Não há o que liberar depois: o path fecha sozinho 30 s depois do
último leitor, e não existe `DELETE /hls`. É assim que se cumpre o RNF-CAM-21: o segundo operador entra na
entrega existente, ela só acaba quando o último sai, e a saída de um nunca derruba os outros.

## Fluxo do player

1. `GET .../hls`, recebe `url` e `hlsUrl`.
2. WHEP, exceto se o WHEP daquela câmera e codec falhou nos últimos 60 s. Negociação até 15 s; 404
   repetido por até 60 s.
3. Vigias: ICE `failed`/`closed`, `disconnected` por 3 s, mídia que não chega em 8 s, faixa `ended` ou
   stream `inactive`, nenhum quadro decodificado 6 s depois da faixa.
4. Perda depois de imagem: segura o último quadro, reconecta o WHEP no lugar (60 s) e avisa o host, que
   faz um único `GET /hls` por episódio. Fazem esse `GET` o videowall do VMS, o detalhe de câmera e a
   Detecção, nunca por timer.
5. LL-HLS quando o WebRTC nunca mostrou imagem ou esgotou o orçamento; falha no LL-HLS é terminal, com
   botão de reconectar.
6. Volta ao WebRTC em segundo plano, de 30 s a 300 s, make-before-break.
7. Ao sair, o player só fecha o peer.

## Eventos WebSocket (`streaming.gateway.ts`)

Namespace `cameras-stream`, path `/api/cameras/stream/realtime` (rota própria no Kong). O cliente entra na
sala `camera:<id>` com `camera.join` (`{ cameraId }`) e sai com `camera.leave`, sob `WsAuthGuard`. Única
emissão: `status.changed` (`cameraId, status`), na mudança de conectividade do device. Nenhum cliente do
`web-attlas` assina esse namespace; o front usa `/api/cameras/status/realtime` e
`/api/cameras/analytics/realtime`.

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

## Diagnóstico do stream (UC-027)

`GET /api/cameras/:id/stream-diagnostics?quality=&codec=` (`stream-diagnostics.controller.ts`),
autenticado e escopado pelo `System-Id`, devolve a config do path, a ingestão (`bytesReceived`,
`framesInError`, leitores) e as sessões WebRTC com IPs mascarados (`redactAddress`), mais um
`StreamHealthStatus` separado da alcançabilidade do device:

| Status | Significado |
| --- | --- |
| `OK` | path disponível, ingestão limpa e, havendo sessões WebRTC, ao menos uma com peer estabelecido |
| `DEGRADED` | path disponível com quadros em erro na ingestão, ou nenhuma sessão WebRTC com peer estabelecido |
| `DOWN` | path indisponível com erro na puxada (`lastError` da fonte) |
| `INACTIVE` | path indisponível sem erro: ninguém assistindo, o normal entre espectadores |

É o que impede um stream travado de aparecer como "Estável".

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
