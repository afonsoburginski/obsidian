---
tags:
  - doc
  - ms-cameras
  - dispositivo
atualizado: 2026-10-01
aliases:
  - "Integração com dispositivo - Fluxos"
---

# Câmeras - Integração com dispositivo - Fluxos

Parte da [[Câmeras - Integração com dispositivo]]. Camada transversal, sem tela própria: cada fluxo é acionado por um
consumidor ([[Câmeras - PTZ e presets]], [[Câmeras - Streaming]], [[Câmeras - Saúde e monitoramento]], [[Câmeras - Cadastro]]) e aqui fica só o trecho
que fala com o equipamento. Caminhos relativos a `apps/ms-cameras/src/`.

## 1. Comando PTZ por ONVIF

Origem: `cameras/services/ptz.service.ts`, `executeOnvifPtz`. O driver é por operação: instancia, conecta,
executa e desconecta. A autorização acontece antes, na rota (ver [[Câmeras - PTZ e presets - Arquitetura e estratégias]]).

| Passo | O quê |
| --- | --- |
| 1 | `findForPtz`: câmera, credencial e perfil PRIMARY |
| 2 | Guards: protocolo ONVIF, câmera com PTZ mecânico ou digital, `mediaProfileToken`, credencial |
| 3 | `IOnvifConnectionOptions`: ONVIF em `ip:porta do perfil`, RTSP em `ip:554`, token do perfil |
| 4 | `driverFactory.createDriver(ONVIF, options)` |
| 5 | `connect()` sob timeout de 5 s |
| 6 | `movePTZ` de cada comando, em sequência, sob timeout de 4 s |
| 7 | `disconnect()` no `finally`, best-effort |
| 8 | Uma linha `PTZ_COMMAND` em `CameraEventLog` |

Timeout ou erro de I/O vira `ExternalServiceException('camera-onvif', ...)` com `CAMERA_UNREACHABLE`;
`DomainException` de guard propaga sem reembrulhar. A Hikvision passa por este mesmo caminho depois que o
cadastro liga o ONVIF (fluxo 6).

## 2. Comando VAPIX (Axis)

Origem: `ptz.service.ts`, `executeVapixAbsolute`, `executeVapixAbsoluteZoom`, `executeVapixZoom` e
`executeVapixZoomStop`. Não passa pela factory nem pelo driver.

| Passo | O quê |
| --- | --- |
| 1 | `loadForVapix`: id, IP e credencial; sem guard de ONVIF nem de tipo, então vale para câmera fixa com zoom |
| 2 | `vapixAbsolutePtz` (`ptz.cgi?pan&tilt&zoom&speed`), `vapixAbsoluteZoom` ou `vapixContinuousZoom` (`continuouszoommove`), em unidades nativas (graus, zoom 1 a 9999) |
| 3 | `AxisDigestClient.get()`: probe, 401, reenvio com Digest; qualquer 2xx é sucesso |
| 4 | Linha `PTZ_COMMAND`; o stop de zoom é best-effort e não grava linha |

Conversões em `vapix-ptz.utils.ts`: `presetZoomLevelToVapix` (0 a 100% para 1 a 9999) e `speedPercentToVapix`
(0 a 100% para 1 a 100). Falha vira `ExternalServiceException('camera-vapix', ...)` com `CAMERA_UNREACHABLE`.

## 3. Descritor de stream (para o Streaming)

Origem: `streaming/services/camera-stream-source.resolver.ts`, `resolve(cameraId, quality)`.

| Passo | O quê |
| --- | --- |
| 1 | Cadeia de fallback `QUALITY_FALLBACK_CHAIN`: SECONDARY para PRIMARY; TERTIARY para SECONDARY para PRIMARY |
| 2 | Lê em paralelo o perfil ativo do papel, a câmera e a credencial |
| 3 | `selector.select(camera.communicationProtocol)`: `rtsp`, `onvif` ou `isapi` |
| 4 | `injectRtspCredentials` na URL do perfil |
| 5 | Só em URL `/axis-media/`: `appendAxisVapixCodecParams` (codec, keyframe, resolução) e `buildAxisFallbackUrl` (variante H.264 quando o codec não é H.264). A Hikvision não recebe parâmetros na URL (INT-007) |
| 6 | `strategy.buildLiveStreamDescriptor(source)`: `ICameraStream` com `protocol: 'RTSP'` |

Nenhum perfil ativo na cadeia: `BusinessRuleViolationException('STREAM_PROFILE_NOT_CONFIGURED')`.

## 4. Sondagem no cadastro

Origem: `cameras/services/camera-credential-probe.service.ts`, `probe(item)`, usado por
`POST /cameras/validate-credentials` e de novo dentro do `POST /cameras`.

| Passo | O quê |
| --- | --- |
| 1 | `new OnvifDevice({ address, user, pass })` e `servicesInit()`, com 10 s para a conexão |
| 2 | `deviceInformationInit()` e `mediaGetProfiles()` em `Promise.allSettled`, depois `mediaGetStreamUri` |
| 3 | Identidade: fabricante, modelo, serial, firmware, hardwareId |
| 4 | Perfis: tokens, resolução, codec, fps, bitrate, `streamUrl` (com o esquema forçado para `rtsp://`), snapshot; PTZ só com faixa real de pan ou tilt |
| 5 | Analítico embarcado: testa os transportes candidatos do ACAP com orçamento próprio; esgotar o orçamento deixa `hasEmbeddedAnalytics` indefinido, nunca `false` |
| 6 | Erro classificado: 401 `CAMERA_CREDENTIALS_INVALID`; timeout, `ECONNREFUSED`, `EHOSTUNREACH` `CAMERA_UNREACHABLE`; 404 `CAMERA_CREDENTIALS_UNSUPPORTED`; resto `CAMERA_CONNECTION_FAILED` |
| 7 | Em `CAMERA_CREDENTIALS_UNSUPPORTED` (ONVIF desligado): confirma a credencial por ISAPI em `/ISAPI/System/deviceInfo`, lê os canais em `/ISAPI/Streaming/channels` e tenta ligar o ONVIF (fluxo 6), sondando de novo por ONVIF se der certo |

Sem os perfis lidos por ISAPI, a Hikvision seria salva sem stream e o player responderia 409 ao pedir o
vídeo. É a sondagem que sustenta cadastrar sem desenvolvimento por fabricante (RF-INT-05): a câmera declara
as próprias capacidades.

## 5. Canais de saúde

Origem: `health/workers/camera-health.worker.ts`; qual réplica monitora qual equipamento é decidido pelo
`health/leases/device-monitor-coordinator.service.ts` (ver [[Câmeras - Saúde e monitoramento - Arquitetura e estratégias]]).
`resolveMonitoringOptions` escolhe o canal pelo `manufacturer.code`, no bootstrap, na reconciliação e no
cadastro.

| Fabricante | Canal | Cliente | Heartbeat |
| --- | --- | --- | --- |
| `AXIS` | `AXIS_WEBSOCKET` | `AxisWsClient` | RTT de ping e pong do WebSocket, em laço; token wssession pelo digest; mapeia tópicos de evento para `CameraEventCauseCode` e acompanha a posição PTZ enquanto `is_moving=1` |
| `HIKVISION` | `HIKVISION_ISAPI_ALERT_STREAM` | `HikvisionAlertStreamClient` | Cada parte `EventNotificationAlert` da conexão HTTP aberta em `/ISAPI/Event/notification/alertStream`; filtra o keep-alive `videoloss`/`inactive`; 30 s de silêncio é desconexão |
| `HIKVISION` sem alertStream | `HIKVISION_ISAPI_POLL` | `HikvisionIsapiHeartbeatClient` | `GET /ISAPI/System/status` a cada 15 s; 2 falhas seguidas antes de offline. O próprio cliente escolhe esse fallback |
| outros | `ONVIF_PULLPOINT` | `OnvifPullPointClient` | Cada `PullMessages` (long-poll `PT5S`) bem-sucedido; assinatura com TTL `PT60S` |

Os eventos `connected`, `disconnected`, `error` e `heartbeat` alimentam snapshot, histórico e `EventBus`, com
reconexão por backoff e jitter. Avaliação de estado, incidentes e métricas são da Saúde.

## 6. Ativação do ONVIF na Hikvision (INT-020)

Origem: sondagem do cadastro e da validação de credenciais, quando o ISAPI confirmou a credencial e o ONVIF
está desligado. Best-effort: se falhar, fica a leitura ISAPI e a câmera continua cadastrável.

| Passo | O quê |
| --- | --- |
| 1 | `GET /ISAPI/System/Network/Integrate` mostra `<ONVIF><enable>false</enable></ONVIF>` |
| 2 | `PUT` do mesmo recurso só com o bloco ONVIF |
| 3 | `GET` e `POST /ISAPI/Security/ONVIF/users`: as contas ONVIF são separadas das contas web, e o ONVIF pode estar ligado sem ninguém autenticar |
| 4 | Relê `enable=true` e sonda de novo por ONVIF (o `GetProfiles` passa a responder com cerca de 2 s de atraso) |

Validado em campo contra a Hikvision de bancada (`192.168.210.80`). Depois disso, PTZ e perfis de mídia da
Hikvision seguem o fluxo 1; ISAPI fica para streaming (fluxo 3) e saúde (fluxo 5).
