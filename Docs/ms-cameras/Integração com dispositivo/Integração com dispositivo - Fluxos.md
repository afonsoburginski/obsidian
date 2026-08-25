---
tags:
  - doc
  - ms-cameras
  - cameras
  - dispositivo
  - hardware
atualizado: 2026-08-24
---

# Integração com dispositivo - Fluxos

> Fluxos técnicos do adaptador multi-protocolo. Índice: [[Integração com dispositivo]]. Diagrama: [[02 - MOD-002 multi-protocol-adapter.excalidraw|diagrama]].

Camada **transversal**: não há user flow (UF-\*) próprio. Cada fluxo abaixo é acionado por um consumidor ([[PTZ e presets\|PTZ]], [[Streaming\|Streaming]], [[Saúde e monitoramento\|Saúde]], [[Cameras\|CRUD]]); aqui só o trecho de integração com o hardware.

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

Vale também para Hikvision: depois que o cadastro ativa o ONVIF automaticamente (INT-020, ver fluxo 6), o PTZ de uma Hikvision passa por este mesmo caminho - não existe um fluxo de PTZ separado por ISAPI.

## 2. Comando VAPIX (Axis proprietário)

Origem: `ptz.service.ts` → `executeVapixZoom` / `executeVapixAbsolute` / `executeVapixZoomStop`. **Não** passa pela factory nem pelo `OnvifDriver` - chama os utils direto.

| # | Passo | Detalhe |
| --- | --- | --- |
| 1 | Carrega câmera | `loadForVapix` (id + ip + credencial; sem guard de ONVIF/kind - vale p/ câmera fixa com zoom) |
| 2 | Permissão | `cameras:ptz` se houver operador |
| 3 | Chama VAPIX | `vapixAbsolutePtz` (`ptz.cgi?pan&tilt&zoom&speed`) ou `vapixContinuousZoom` (`continuouszoommove`) - unidades **nativas** (graus, zoom 1..9999) |
| 4 | Digest auth | `AxisDigestClient.get()` - probe → 401 → reenvia com header Digest; 2xx = ok |
| 5 | Auditoria | `CameraEventLog` (`PTZ_COMMAND`); stop é best-effort (não lança) |

Conversões em `vapix-ptz.utils.ts`: `presetZoomLevelToVapix` (0..100% → 1..9999), `speedPercentToVapix` (0..100% → 1..100). Falha → `ExternalServiceException('camera-vapix', …, CAMERA_UNREACHABLE)`.

## 3. Construção do descritor de stream (consumido pelo Streaming)

Origem: `streaming/services/camera-stream-source.resolver.ts` → `resolve(cameraId, quality)`.

| # | Passo | Detalhe |
| --- | --- | --- |
| 1 | Cadeia de fallback | `QUALITY_FALLBACK_CHAIN` (SECONDARY→PRIMARY, TERTIARY→SECONDARY→PRIMARY) |
| 2 | Lookup | `cameraStreamProfile` (role, ativo) + `camera` + `cameraCredential` em paralelo |
| 3 | Seleciona estratégia | `selector.select(camera.communicationProtocol)` - hoje `rtsp`, `onvif` ou `isapi` |
| 4 | Injeta credenciais | `injectRtspCredentials` na URL do perfil (se houver user) |
| 5 | Params Axis | `appendAxisVapixCodecParams` (só URLs `/axis-media/`: `videocodec`, keyframe, resolução) + `buildAxisFallbackUrl` (H.264 se codec ≠ H.264). Não se aplica à Hikvision - a estratégia ISAPI não anexa parâmetros na URL (INT-007) |
| 6 | Descritor | `strategy.buildLiveStreamDescriptor(source)` → `ICameraStream` (`protocol: 'RTSP'`, `sourceUrl`, `suggestedCodec`) |

Nenhum profile ativo em toda a cadeia → `BusinessRuleViolationException('STREAM_PROFILE_NOT_CONFIGURED')`. Detalhe do pipeline em [[Streaming|Streaming]].

## 4. Probe de credenciais (descoberta ONVIF no cadastro)

Origem: `cameras/services/camera-credential-probe.service.ts` → `probe(item)` (usado por `POST /cameras/validate-credentials`).

| # | Passo | Detalhe |
| --- | --- | --- |
| 1 | Conecta ONVIF | `new OnvifDevice({address, user, pass})` → `servicesInit()`, sob timeout 10 s |
| 2 | Enriquece | `Promise.allSettled([deviceInformationInit(), mediaGetProfiles()])` |
| 3 | Extrai device info | fabricante, modelo, serial, firmware, hardwareId |
| 4 | Extrai perfis | tokens, resolução, encoding, framerate, bitrate, streamUrl, snapshotUrl; range PTZ → `hasPtz` |
| 5 | Classifica erro | 401→`CAMERA_CREDENTIALS_INVALID`; timeout/ECONNREFUSED/EHOSTUNREACH→`CAMERA_UNREACHABLE`; resto→`CAMERA_CONNECTION_FAILED`; `/onvif/device_service` 404 numa Hikvision→reconhecido como "ONVIF desligado", não como falha de conectividade (ver fluxo 6) |

É a peça que sustenta "cadastrar sem dev por fabricante" (RF-INT-05, RF-CAM-01): a própria câmera declara suas capacidades via ONVIF.

## 5. Heartbeat via WebSocket / PullPoint / ISAPI

Origem: `health/workers/camera-health.worker.ts`; quem decide QUAL device cada réplica monitora (bootstrap + lease Redis) é o `health/leases/device-monitor-coordinator.service.ts` (ver [[Saúde e monitoramento\|Saúde e monitoramento]] para a mecânica de dedupe/lease). Quatro canais (`HealthChannel`):

| Canal | Client | Heartbeat | Notas |
| --- | --- | --- | --- |
| `AXIS_WEBSOCKET` | `AxisWsClient` (`health/clients/axis-ws.client.ts`) | `measurePing()` (RTT WS ping/pong) em loop auto-agendado | Token wssession via digest; filtros de tópico (NetworkLost, PTZError, Move, Tampering…); mapeia tópico→`CameraEventCauseCode`; rastreia posição PTZ enquanto `is_moving=1` |
| `ONVIF_PULLPOINT` | `OnvifPullPointClient` (`health/clients/onvif-pullpoint.client.ts`) | cada `PullMessages` (long-poll `PT5S`) bem-sucedido = 1 heartbeat | Canal para fabricantes sem canal nativo (nem Axis nem Hikvision); subscription TTL `PT60S` |
| `HIKVISION_ISAPI_ALERT_STREAM` (agosto, INT-019) | `HikvisionAlertStreamClient` (`health/clients/hikvision-alert-stream.client.ts`) | conexão HTTP que nunca fecha; cada parte `EventNotificationAlert` recebida = 1 heartbeat | Único canal Hikvision que entrega o que o device realmente viu (evento real, não só liveness); filtra o keep-alive `videoloss`/`inactive` (~1/s) para não gerar 1 evento/s por câmera; janela de inatividade 30 s |
| `HIKVISION_ISAPI_POLL` (agosto, INT-018) | `HikvisionIsapiHeartbeatClient` (`health/clients/hikvision-isapi-heartbeat.client.ts`) | poll `GET /ISAPI/System/status` a cada 15 s = 1 heartbeat | Fallback quando a firmware não tem `alertStream` (o próprio client escolhe, não o coordinator); tolera 2 falhas consecutivas antes de reportar offline, para equiparar à tolerância do ping WS/PullPoint |

Fluxo comum: `startMonitoring` → abre client → eventos `connected`/`disconnected`/`error`/`heartbeat` alimentam snapshot + histórico + `EventBus`; reconexão com backoff+jitter. Avaliação de estado (STABLE/UNSTABLE/OFFLINE), incidentes e métricas pertencem a [[Saúde e monitoramento|Saúde e monitoramento]].

> [!info] Correção - seleção de canal por fabricante já existe (era um "ainda não" até 03/07)
> A versão anterior desta nota dizia que o bootstrap fixava `AXIS_WEBSOCKET` e que a seleção dinâmica
> por fabricante "ainda não estava no bootstrap". Isso mudou: `resolveMonitoringOptions` (dentro do
> `device-monitor-coordinator.service.ts`) escolhe o canal por `manufacturer.code` tanto no bootstrap/
> reconcile quanto no cadastro (`attachRegisteredCamera`) - `AXIS`→`AXIS_WEBSOCKET`,
> `HIKVISION`→`HIKVISION_ISAPI_ALERT_STREAM` (com `HIKVISION_ISAPI_POLL` como fallback interno do
> client), qualquer outro→`ONVIF_PULLPOINT`. A motivação registrada no código (INT-020) é justamente
> ter corrigido o caso em que uma Hikvision recém-cadastrada abria uma conexão Axis contra um device
> sem VAPIX nenhum.

## 6. Ativação automática do ONVIF no cadastro (Hikvision, INT-020)

Origem: fluxo de cadastro/validação de credenciais, quando o fabricante é Hikvision e o probe detecta ONVIF desligado (fluxo 4).

| # | Passo | Detalhe |
| --- | --- | --- |
| 1 | Detecta ONVIF desligado | `GET /ISAPI/System/Network/Integrate` → `<ONVIF><enable>false</enable></ONVIF>` |
| 2 | Ativa | `PUT /ISAPI/System/Network/Integrate` só com o bloco ONVIF → `statusCode 1, OK` |
| 3 | Garante conta ONVIF | `GET`/`POST /ISAPI/Security/ONVIF/users` - contas ONVIF são uma lista separada das contas web/ISAPI; pode estar ligado sem ninguém autenticar |
| 4 | Confirma | Releitura confirma `enable=true`; ONVIF `GetProfiles` autenticado passa a responder (validado: ~2 s de atraso até responder) |

Validado em campo em 18/08/2026 contra uma DS-2CD1023G0E-I real (192.168.210.80, firmware V5.7.12) - ver [[Runbook - câmeras reais para teste]]. Depois deste passo, PTZ e leitura de perfis de mídia da Hikvision seguem o fluxo 1 (ONVIF comum) como qualquer outro fabricante; ISAPI continua sendo usado só para streaming (fluxo 3) e saúde (fluxo 5).
