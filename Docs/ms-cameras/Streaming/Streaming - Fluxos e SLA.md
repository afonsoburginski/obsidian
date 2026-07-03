---
tags: [doc, cameras, ms-cameras, streaming]
---

# Streaming - Fluxos e SLA

Volta para [[00 - Streaming]] · [[ms-cameras - visão geral]]. Irmãs: [[01-Arquitetura-streaming]], [[02-HLS]], [[03-WebRTC-WHEP]], [[04-Diagnostico-travamento-WebRTC]], [[Streaming - Codecs e fallbacks]], [[Streaming - Estratégias de entrega (Strategy)]].

Os fluxos ponta a ponta de abrir e fechar um stream, os eventos WebSocket que o frontend
observa, e os indicadores de qualidade/SLA (latência, TTFF, disponibilidade). Fonte:
`apps/ms-cameras/src/streaming/streaming.controller.ts`, `.../services/ffmpeg-session.service.ts`,
`.../streaming.gateway.ts`, `.../services/camera-ttff.repository.ts`,
`.../services/stream-diagnostics.service.ts`. Requisito de latência: RNF-CAM-03.

## Fluxo — `GET /api/cameras/:id/hls?quality=`

Abre (ou reaproveita) a sessão e devolve as duas URLs de playback.

1. **Parse da qualidade** — `ParseStreamTypePipe` (default `PRIMARY`; inválido → `INVALID_INPUT`).
   Ver [[Streaming - Estratégias de entrega (Strategy)]].
2. **Reuso** — se já há sessão viva (`ACTIVE`/`STARTING`/`RECONNECTING`), anexa como viewer
   (`attachToExisting`) e pula para o passo 6. `STARTING` aguarda `ensureRunning`.
3. **Criação única** — sem sessão viva, o `Map inFlight` garante um único criador por
   `cameraId:quality`; concorrentes fazem piggyback e só incrementam viewers.
4. **Resolve a origem** — `CameraStreamSourceResolver.resolve()`: cadeia de qualidade + params
   VAPIX + `fallbackRtspUrl` de codec (ver [[Streaming - Codecs e fallbacks]]). Devolve o
   `resolvedQuality` (pode diferir do pedido).
5. **Spawn + espera pronto** — `registry.create` → `spawnFfmpeg` → `ensureRunning` →
   `waitForStreamReady`: faz poll no mediamtx (`GET /v3/paths/get/<path>`) a cada 500ms até
   `ready:true` ou estourar `HLS_START_TIMEOUT_MS` (default 15_000). Timeout → `ERROR`
   (`HLS_START_TIMEOUT`) e o controller responde `ExternalServiceException`. Ao ficar pronto,
   grava a amostra de **TTFF** (best-effort) e marca `ACTIVE`.
6. **Resposta** — `{ url, hlsUrl, status, quality }`:
   - `url` — WebRTC/WHEP: `<MEDIAMTX_WEBRTC_BASE_URL>/<id>-<quality>/whep` (primário).
   - `hlsUrl` — LL-HLS: `<MEDIAMTX_HLS_BASE_URL>/<id>-<quality>/index.m3u8` (fallback).

## Fluxo — `DELETE /api/cameras/:id/hls?quality=`

`204 No Content`. Chama `decrementViewers`; **não derruba na hora**. Ao chegar a 0 viewers,
arma o `graceTimer` (`HLS_SESSION_GRACE_MS`, default 60_000) e só depois dele o `stopSession`
mata o ffmpeg (`SIGTERM`→`SIGKILL` em 5s), emite `stream.stopped` e remove do registry. Um novo
viewer dentro da janela de graça cancela o timer e reaproveita a sessão. Detalhe do ref-count
em [[Streaming - Estratégias de entrega (Strategy)]].

## Fluxo do player (frontend)

1. Chama `GET .../hls`, recebe `url` (WHEP) e `hlsUrl`.
2. Tenta **WebRTC/WHEP** — caminho primário, sub-segundo ([[03-WebRTC-WHEP]]).
3. **Watchdog** de conexão ICE: `failed`/`closed` cai na hora; `disconnected` por 3s também
   força a queda.
4. Cai para **HLS** (`hls.js`) **uma única vez** ([[02-HLS]]); nova falha é terminal (retry).

## Eventos WebSocket (`streaming.gateway.ts`)

Namespace Socket.IO `/cameras`. O cliente entra na sala da câmera com `camera.join`
(`{ cameraId }`) e sai com `camera.leave`. O gateway escuta o evento interno `HLS_STREAM_EVENT`
(emitido pelo `FfmpegSessionService` via `EventEmitter2`) e o traduz para o cliente:

| Emissão (servidor→cliente) | Disparo | Payload |
| --- | --- | --- |
| `stream.started` | sessão virou `ACTIVE` | `cameraId, quality, url` |
| `stream.reconnecting` | ffmpeg caiu, retentando | `cameraId, quality, attempt, delayMs` |
| `stream.error` | timeout ou máx. de retries | `cameraId, quality, errorCode, message` |
| `stream.stopped` | sessão encerrada | `cameraId, quality` |
| `status.changed` | mudança de conectividade do device (evento de health) | `cameraId, status` |

Isso deixa o player reagir sem polling: mostra "reconectando", volta ao vivo em `stream.started`,
ou exibe erro com o `errorCode` estável (nunca traduzido).

## SLA e qualidade

### Latência (RNF-CAM-03)

| Caminho | Latência | Uso |
| --- | --- | --- |
| WebRTC/WHEP | sub-segundo | primário; operação ao vivo e PTZ |
| LL-HLS | ~2 a 6s | fallback quando o WebRTC não conecta |

O WebRTC é primário justamente pela latência exigida pelo RNF-CAM-03 (streaming e PTZ
responsivos durante incidentes). O trade-off completo está em [[01-Arquitetura-streaming]].

### TTFF (time-to-first-frame)

Tempo do request de abertura até o mediamtx reportar a path `ready`. Medido em
`waitForStreamReady` e persistido **best-effort** por `CameraTtffRepository.insert()` em
`cameraTtffSample` (`cameraId`, `sessionStartedAt`, `ttffMs`) — uma linha por abertura, esparso,
formato de evento (PROJ-006). Timeout **não** grava amostra de sucesso. Falha ao persistir nunca
derruba a subida do stream.

### Disponibilidade do stream (`streamStatus`, UC-027)

`GET /api/cameras/:id/stream-diagnostics?quality=` (`stream-diagnostics.service.ts`) consolida a
visão server-side e deriva um `StreamHealthStatus` **separado da alcançabilidade do device** —
uma câmera pode responder ao ping VAPIX/ONVIF e ainda ter o stream congelado:

| Status | Significado |
| --- | --- |
| `OK` | path publicando, ingest limpo, viewers conectados. |
| `DEGRADED` | fluindo com perda: frames corrompidos no ingest, sessão reconectando, ou viewers sem estabelecer o peer. |
| `DOWN` | há sessão esperada mas o mediamtx não tem path viva/pronta. |
| `INACTIVE` | nada streamando; saúde não avaliável. |

É o que impede um stream travado de aparecer como "Estável". A investigação de perda por trás
desse sinal (ingest vs egress UDP) está em [[04-Diagnostico-travamento-WebRTC]].

## Env vars dos fluxos

| Var | Default | Efeito |
| --- | --- | --- |
| `HLS_START_TIMEOUT_MS` | `15000` | Teto do poll de readiness antes de dar timeout. |
| `HLS_SESSION_GRACE_MS` | `60000` | Janela de graça com 0 viewers antes de matar o ffmpeg. |
| `MEDIAMTX_DIAG_TIMEOUT_MS` | `2000` | Timeout do cliente mediamtx no diagnóstico. |

Visual do pipeline e do fluxo: [[04 - MOD-004 hls-streaming-pipeline.excalidraw|diagrama]] ·
[[04 - MOD-004 hls-streaming-pipeline.excalidraw]].
