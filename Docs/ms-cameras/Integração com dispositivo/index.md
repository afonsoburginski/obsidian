---
tags:
  - doc
  - ms-cameras
  - cameras
  - dispositivo
  - hardware
aliases:
  - "Integração com dispositivo"
  - "00 - Integração com dispositivo"
atualizado: 2026-08-24
---

# Integração com dispositivo (ms-cameras)

> Domínio MOD-002 (adaptador multi-protocolo) do [[ms-cameras]]. Código: `apps/ms-cameras/src/hardware/`. Diagrama: [[02 - MOD-002 multi-protocol-adapter.excalidraw|diagrama]].

> [!info] Estado em 24/08
> Revisão leve (6 commits desde 03/07, todos concentrados na chegada da Hikvision - PR #1738/#SOFTWARE-2532,
> meados de agosto). Confirmado: driver ONVIF ganhou leitura de bitrate configurado (`getEncoderConfig`,
> INT-006/PROJ-008); nova `IsapiCameraCommunicationStrategy` cobre Hikvision com ONVIF desligado de fábrica;
> canais de saúde ganharam dois clients ISAPI dedicados. Detalhe em
> [[Integração com dispositivo - Arquitetura e estratégias]].

## Propósito

Cobre **só a integração com o hardware da câmera** - a abstração sobre protocolos (ONVIF/RTSP/VAPIX/ISAPI). É o "o que sai da câmera", não o negócio.

O `ms-cameras` **é ele próprio o ponto de integração**: não há connector externo dedicado nem SDK proprietário intermediário. O mesmo serviço que faz o negócio (CRUD, PTZ, saúde) fala TCP/HTTP/SOAP direto com o dispositivo. Isso está afirmado no [[ms-cameras]] e no paradigma de `docs/modules/cameras.md` seção 2 (RNF-CAM-02: ONVIF obrigatório; RTSP e APIs proprietárias como fallback; RF-INT-05: novo fabricante sem dev específico).

A câmera é **dispositivo de captura/transmissão, não de armazenamento** - gravação é do VMS externo (RF-INT-01). Este domínio entrega ao restante do sistema um **descritor de stream** (URL RTSP), executa **comandos PTZ**, provê **heartbeat** e lê o **bitrate configurado** do device; não persiste vídeo.

## Mapa de código

| Peça | Arquivo | Papel |
| --- | --- | --- |
| Porta do driver | `hardware/drivers/i-camera-driver.interface.ts` | Contrato stateful (`ICameraDriver`): connect/disconnect, status, streamUrl, movePTZ, analytics, `getEncoderConfig` (bitrate, opcional) |
| Factory | `hardware/drivers/camera-driver.factory.ts` | Resolve o driver por `ProtocolType` |
| Driver ONVIF | `hardware/drivers/onvif/onvif.driver.ts` | Única implementação de `ICameraDriver` - ONVIF Profile S genérico |
| Porta da estratégia | `hardware/communication/i-camera-communication-strategy.interface.ts` | Contrato stateless (`ICameraCommunicationStrategy`): `supports()` + `buildLiveStreamDescriptor()` |
| Selector | `hardware/communication/camera-communication-strategy.selector.ts` | Escolhe a estratégia cujo `supports(protocol)` casa |
| Estratégias | `hardware/communication/strategies/{rtsp,onvif,isapi}-camera-communication.strategy.ts` | Constroem o descritor de stream (URL RTSP); `isapi` é a chegada de agosto (Hikvision) |
| Helper de URL | `hardware/communication/strategies/helpers/rtsp-source-url.helper.ts` + `rtsp-defaults.constants.ts` | Monta/normaliza URL RTSP (default `rtsp://host:554/stream1`); fonte única reusada pelas 3 estratégias |
| Enums | `hardware/enums/{protocol-type,stream-type,connection-state,ptz-*}.enum.ts` | `ProtocolType` (agora com `ISAPI`), `StreamType`, `ConnectionState`, PTZ |
| Types | `hardware/types/` | `ICameraStream`, `ICameraStreamSource`, `ICameraStatus`, `IOnvifConnectionOptions`, `IDeviceBitrateConfig`, comandos PTZ |
| Bitrate configurado | `health/device-bitrate.reader.ts` (+ `hardware/types/device-bitrate-config.interface.ts`) | INT-006/PROJ-008 - lê o teto/target configurado no device (não o consumo real) combinando ONVIF + VAPIX/ISAPI |
| VAPIX PTZ/zoom | `cameras/utils/vapix-ptz.utils.ts`, `vapix-zoom.utils.ts` | Comandos Axis proprietários (`/axis-cgi/com/ptz.cgi`) |
| Digest auth | `health/utils/digest-auth.utils.ts` (`AxisDigestClient`) | HTTP Digest RFC 7616 - hoje autentica VAPIX **e** ISAPI (Hikvision), apesar do nome (ver nota no código) |
| Clients de evento | `health/clients/axis-ws.client.ts`, `onvif-pullpoint.client.ts`, `hikvision-isapi-heartbeat.client.ts`, `hikvision-alert-stream.client.ts` | Canais de heartbeat/evento (WebSocket Axis · PullPoint ONVIF · poll ISAPI · alertStream ISAPI) |
| Probe de credenciais | `cameras/services/camera-credential-probe.service.ts` | Handshake ONVIF de descoberta (device info + perfis + range PTZ); reconhece firmware Hikvision com ONVIF desligado |
| Credenciais | `database/schema/camera/camera_credential.prisma` (`CameraCredential`) | user/pass 1:1 por câmera |

## Protocolos suportados

| Protocolo | Estado | Como | Fonte |
| --- | --- | --- | --- |
| **ONVIF Profile S** | Obrigatório, preferido (RNF-CAM-02) | `OnvifDriver` genérico via `@atmanadmin/node-onvif-ts`; PTZ sobre `ContinuousMove`/`AbsoluteMove`/`RelativeMove`/`Stop`; também lê bitrate configurado (`getEncoderConfig`) | `onvif.driver.ts` |
| **RTSP / RTSPS** | Suportado (streaming) | Sem driver stateful - `RtspCameraCommunicationStrategy` só constrói a URL; `RTSPS` tratado como variante segura de RTSP | `rtsp-camera-communication.strategy.ts`, `rtsp-defaults.constants.ts` |
| **VAPIX / Axis** | Suportado (proprietário) | Chamado **direto** por PtzService e health worker - zoom em câmera fixa, PTZ absoluto em unidades nativas, eventos WS, posição PTZ, enriquecimento de bitrate (`RateControl`). **Não** passa pela factory | `vapix-ptz.utils.ts`, `vapix-zoom.utils.ts`, `axis-ws.client.ts` |
| **ISAPI / Hikvision** | Suportado (proprietário, chegada de agosto - PR #1738) | Firmware Hikvision sai de fábrica com `/onvif/device_service` desligado (404). `IsapiCameraCommunicationStrategy` constrói o descritor de stream direto do IP + canal Hikvision, sem depender de descoberta ONVIF; saúde usa poll `GET /ISAPI/System/status` com fallback para o alertStream nativo; bitrate lido via `Streaming/channels/<id>`. No cadastro, INT-020 **ativa o ONVIF automaticamente** para que PTZ e perfis de mídia sigam usando o `OnvifDriver` comum - ISAPI cobre só o que o ONVIF desligado não alcança | `isapi-camera-communication.strategy.ts`, `hikvision-isapi-heartbeat.client.ts`, `hikvision-alert-stream.client.ts` |
| **Dahua / Bosch / outros** | Via ONVIF | Sem adaptador dedicado - cobertos pelo `OnvifDriver` genérico (mencionados como ONVIF-compatíveis no cabeçalho de `i-camera-driver.interface.ts`) | - |
| **PROPRIETARY (driver dedicado)** | **Não implementado** | `ProtocolType.PROPRIETARY` na factory **lança** `PROPRIETARY_PROTOCOL_NOT_SUPPORTED`; registry (`INT-004-proprietary-registry.md`, ex. `AxisVapixDriver`) reservado, não existe. `ISAPI` também não tem case na factory (cai no `default`), mas nunca é chamado assim na prática - Hikvision usa o `OnvifDriver` para tudo que é stateful | `camera-driver.factory.ts` |

> Nuance: VAPIX e ISAPI **existem e rodam**, mas não como `ICameraDriver` registrado - são invocados por fora do par factory/driver (ver [[Integração com dispositivo - Arquitetura e estratégias]]). O "PROPRIETARY como driver formal" é o que está pendente.

## Como cada consumidor usa

| Consumidor | O que consome | Caminho |
| --- | --- | --- |
| [[Streaming\|Streaming]] | Descritor de stream (URL RTSP) via **estratégia** | `streaming/services/camera-stream-source.resolver.ts` → `selector.select()` → `buildLiveStreamDescriptor()` |
| [[PTZ e presets\|PTZ e presets]] | Comando PTZ via **driver** (ONVIF) ou **VAPIX** (Axis) | `cameras/services/ptz.service.ts` → `driverFactory.createDriver(ONVIF)` ou `vapixAbsolutePtz`/`vapixContinuousZoom` |
| [[Saúde e monitoramento\|Saúde e monitoramento]] | Heartbeat/eventos via **clients** WS/PullPoint/ISAPI; bitrate configurado via `DeviceBitrateReader` | `health/workers/camera-health.worker.ts` → `AxisWsClient` / `OnvifPullPointClient` / `HikvisionIsapiHeartbeatClient` / `HikvisionAlertStreamClient` |
| [[Cameras\|Cameras]] (CRUD) | Probe de credenciais no cadastro; ativação automática do ONVIF em Hikvision (INT-020) | `cameras/services/camera-credential-probe.service.ts` (ONVIF handshake) |

## Notas deste domínio

- [[Integração com dispositivo - Arquitetura e estratégias]] - padrões (Factory + Strategy), portas, descritor de stream, bitrate configurado, digest auth, erros/timeouts.
- [[Integração com dispositivo - Fluxos]] - fluxos técnicos: driver ONVIF, VAPIX, ISAPI, descritor de stream, probe, heartbeat.
- [[Integração com dispositivo - Requisitos e SLA]] - RF-INT-05, RNF-CAM-02, RF-CAM-03, RNF-CAM-01, RNF-CAM-03; fallback e SLA.

Runbooks (mão na massa, não referência de arquitetura):

- [[Runbook - câmeras reais para teste]] - quais câmeras reais existem, como alcançá-las e credenciais de teste.
- [[Runbook - teste de câmera por terminal (ffmpeg e ONVIF)]] - checar RTSP, codec e ONVIF direto do terminal, sem subir o serviço.

## Relacionados

[[ms-cameras]] · [[Cameras]] · [[Saúde e monitoramento]] · [[Streaming]] · [[PTZ e presets]] · [[02 - MOD-002 multi-protocol-adapter.excalidraw|diagrama]]
