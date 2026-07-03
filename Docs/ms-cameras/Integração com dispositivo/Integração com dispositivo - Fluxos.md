---
tags: [doc, cameras, ms-cameras, hardware]
---

# Integração com dispositivo — Fluxos

> Fluxos técnicos do adaptador multi-protocolo. Índice: [[00 - Integração com dispositivo]]. Diagrama: [[02 - MOD-002 multi-protocol-adapter.excalidraw|diagrama]].

Camada **transversal**: não há user flow (UF-\*) próprio. Cada fluxo abaixo é acionado por um consumidor ([[00 - PTZ e presets\|PTZ]], [[00 - Streaming\|Streaming]], [[00 - Saúde e monitoramento\|Saúde]], [[00 - Cameras\|CRUD]]); aqui só o trecho de integração com o hardware.

## 1. Resolução de driver + comando PTZ (ONVIF)

Origem: `cameras/services/ptz.service.ts` → `executeOnvifPtz()`. Driver é **por operação** (instancia, conecta, executa, desconecta).

| # | Passo | Detalhe |
| --- | --- | --- |
| 1 | Carrega câmera | `findForPtz` (credencial + perfil primário) |
| 2 | Guards | `assertProtocolIsOnvif`, `assertCameraIsPtz`, `assertHasMediaProfile`; credencial presente; permissão `cameras:ptz` (ms-organization) |
| 3 | Monta opções | `buildConnectionOptions` → `IOnvifConnectionOptions` (onvif=`ip:portaControle`, rtsp=`ip:554`, token de perfil) |
| 4 | Resolve driver | `driverFactory.createDriver(ONVIF, options)` → `OnvifDriver` |
| 5 | `connect()` | `servicesInit` + heartbeat + cache de URL; sob timeout `connect` (5 s) |
| 6 | `movePTZ(cmd)` | Cada comando da lista, sequencial, sob timeout `movePTZ` (4 s) |
| 7 | `finally disconnect()` | Best-effort (erros engolidos) |
| 8 | Auditoria | 1 linha em `CameraEventLog` (`PTZ_COMMAND` + subType) |

Erro/timeout em qualquer I/O → `ExternalServiceException('camera-onvif', …)` com `errorCode = CAMERA_UNREACHABLE` (`runWithTimeout`). `DomainException` já lançada (guard) propaga sem reembrulhar.

## 2. Comando VAPIX (Axis proprietário)

Origem: `ptz.service.ts` → `executeVapixZoom` / `executeVapixAbsolute` / `executeVapixZoomStop`. **Não** passa pela factory nem pelo `OnvifDriver` — chama os utils direto.

| # | Passo | Detalhe |
| --- | --- | --- |
| 1 | Carrega câmera | `loadForVapix` (id + ip + credencial; sem guard de ONVIF/kind — vale p/ câmera fixa com zoom) |
| 2 | Permissão | `cameras:ptz` se houver operador |
| 3 | Chama VAPIX | `vapixAbsolutePtz` (`ptz.cgi?pan&tilt&zoom&speed`) ou `vapixContinuousZoom` (`continuouszoommove`) — unidades **nativas** (graus, zoom 1..9999) |
| 4 | Digest auth | `AxisDigestClient.get()` — probe → 401 → reenvia com header Digest; 2xx = ok |
| 5 | Auditoria | `CameraEventLog` (`PTZ_COMMAND`); stop é best-effort (não lança) |

Conversões em `vapix-ptz.utils.ts`: `presetZoomLevelToVapix` (0..100% → 1..9999), `speedPercentToVapix` (0..100% → 1..100). Falha → `ExternalServiceException('camera-vapix', …, CAMERA_UNREACHABLE)`.

## 3. Construção do descritor de stream (consumido pelo Streaming)

Origem: `streaming/services/camera-stream-source.resolver.ts` → `resolve(cameraId, quality)`.

| # | Passo | Detalhe |
| --- | --- | --- |
| 1 | Cadeia de fallback | `QUALITY_FALLBACK_CHAIN` (SECONDARY→PRIMARY, TERTIARY→SECONDARY→PRIMARY) |
| 2 | Lookup | `cameraStreamProfile` (role, ativo) + `camera` + `cameraCredential` em paralelo |
| 3 | Seleciona estratégia | `selector.select(camera.communicationProtocol)` |
| 4 | Injeta credenciais | `injectRtspCredentials` na URL do perfil (se houver user) |
| 5 | Params Axis | `appendAxisVapixCodecParams` (só URLs `/axis-media/`: `videocodec`, keyframe, resolução) + `buildAxisFallbackUrl` (H.264 se codec ≠ H.264) |
| 6 | Descritor | `strategy.buildLiveStreamDescriptor(source)` → `ICameraStream` (`protocol: 'RTSP'`, `sourceUrl`, `suggestedCodec`) |

Nenhum profile ativo em toda a cadeia → `BusinessRuleViolationException('STREAM_PROFILE_NOT_CONFIGURED')`. Detalhe do pipeline em [[00 - Streaming|Streaming]].

## 4. Probe de credenciais (descoberta ONVIF no cadastro)

Origem: `cameras/services/camera-credential-probe.service.ts` → `probe(item)` (usado por `POST /cameras/validate-credentials`).

| # | Passo | Detalhe |
| --- | --- | --- |
| 1 | Conecta ONVIF | `new OnvifDevice({address, user, pass})` → `servicesInit()`, sob timeout 10 s |
| 2 | Enriquece | `Promise.allSettled([deviceInformationInit(), mediaGetProfiles()])` |
| 3 | Extrai device info | fabricante, modelo, serial, firmware, hardwareId |
| 4 | Extrai perfis | tokens, resolução, encoding, framerate, bitrate, streamUrl, snapshotUrl; range PTZ → `hasPtz` |
| 5 | Classifica erro | 401→`CAMERA_CREDENTIALS_INVALID`; timeout/ECONNREFUSED/EHOSTUNREACH→`CAMERA_UNREACHABLE`; resto→`CAMERA_CONNECTION_FAILED` |

É a peça que sustenta "cadastrar sem dev por fabricante" (RF-INT-05, RF-CAM-01): a própria câmera declara suas capacidades via ONVIF.

## 5. Heartbeat via WebSocket / PullPoint

Origem: `health/workers/camera-health.worker.ts`; bootstrap em `camera-health-bootstrap.service.ts` (câmeras OPERATIONAL + TESTING). Dois canais (`HealthChannel`):

| Canal | Client | Heartbeat | Notas |
| --- | --- | --- | --- |
| `AXIS_WEBSOCKET` | `AxisWsClient` (`health/clients/axis-ws.client.ts`) | `measurePing()` (RTT WS ping/pong) em loop auto-agendado | Token wssession via digest; filtros de tópico (NetworkLost, PTZError, Move, Tampering…); mapeia tópico→`CameraEventCauseCode`; rastreia posição PTZ enquanto `is_moving=1` |
| `ONVIF_PULLPOINT` | `OnvifPullPointClient` (`health/clients/onvif-pullpoint.client.ts`) | cada `PullMessages` (long-poll `PT5S`) bem-sucedido = 1 heartbeat | Fallback SOAP p/ câmeras sem WebSocket Axis; subscription TTL `PT60S` |

Fluxo comum: `startMonitoring` → abre client → eventos `connected`/`disconnected`/`error`/`heartbeat` alimentam snapshot + histórico + `EventBus`; reconexão com backoff+jitter. Avaliação de estado (STABLE/UNSTABLE/OFFLINE), incidentes e métricas pertencem a [[00 - Saúde e monitoramento|Saúde e monitoramento]]. Bootstrap hoje fixa `AXIS_WEBSOCKET`; seleção dinâmica de canal por fabricante ainda não está no bootstrap.
</content>
