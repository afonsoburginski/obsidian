---
tags: [doc, cameras, ms-cameras, hardware]
---

# Integração com dispositivo (ms-cameras)

> Domínio MOD-002 (adaptador multi-protocolo) do [[ms-cameras - visão geral]]. Código: `apps/ms-cameras/src/hardware/`. Diagrama: [[02 - MOD-002 multi-protocol-adapter.excalidraw|diagrama]].

## Propósito

Cobre **só a integração com o hardware da câmera** — a abstração sobre protocolos (ONVIF/RTSP/VAPIX). É o "o que sai da câmera", não o negócio.

O `ms-cameras` **é ele próprio o ponto de integração**: não há connector externo dedicado nem SDK proprietário intermediário. O mesmo serviço que faz o negócio (CRUD, PTZ, saúde) fala TCP/HTTP/SOAP direto com o dispositivo. Isso está afirmado no [[ms-cameras - visão geral]] e no paradigma de `docs/modules/cameras.md` §2 (RNF-CAM-02: ONVIF obrigatório; RTSP e APIs proprietárias como fallback; RF-INT-05: novo fabricante sem dev específico).

A câmera é **dispositivo de captura/transmissão, não de armazenamento** — gravação é do VMS externo (RF-INT-01). Este domínio entrega ao restante do sistema um **descritor de stream** (URL RTSP), executa **comandos PTZ** e provê **heartbeat**; não persiste vídeo.

## Mapa de código

| Peça | Arquivo | Papel |
| --- | --- | --- |
| Porta do driver | `hardware/drivers/i-camera-driver.interface.ts` | Contrato stateful (`ICameraDriver`): connect/disconnect, status, streamUrl, movePTZ, analytics |
| Factory | `hardware/drivers/camera-driver.factory.ts` | Resolve o driver por `ProtocolType` |
| Driver ONVIF | `hardware/drivers/onvif/onvif.driver.ts` | Única implementação de `ICameraDriver` — ONVIF Profile S genérico |
| Porta da estratégia | `hardware/communication/i-camera-communication-strategy.interface.ts` | Contrato stateless (`ICameraCommunicationStrategy`): `supports()` + `buildLiveStreamDescriptor()` |
| Selector | `hardware/communication/camera-communication-strategy.selector.ts` | Escolhe a estratégia cujo `supports(protocol)` casa |
| Estratégias | `hardware/communication/strategies/{rtsp,onvif}-camera-communication.strategy.ts` | Constroem o descritor de stream (URL RTSP) |
| Helper de URL | `hardware/communication/strategies/helpers/rtsp-source-url.helper.ts` + `rtsp-defaults.constants.ts` | Monta/normaliza URL RTSP (default `rtsp://host:554/stream1`) |
| Enums | `hardware/enums/{protocol-type,stream-type,connection-state,ptz-*}.enum.ts` | `ProtocolType`, `StreamType`, `ConnectionState`, PTZ |
| Types | `hardware/types/` | `ICameraStream`, `ICameraStreamSource`, `ICameraStatus`, `IOnvifConnectionOptions`, comandos PTZ |
| VAPIX PTZ/zoom | `cameras/utils/vapix-ptz.utils.ts`, `vapix-zoom.utils.ts` | Comandos Axis proprietários (`/axis-cgi/com/ptz.cgi`) |
| Digest auth | `health/utils/digest-auth.utils.ts` (`AxisDigestClient`) | HTTP Digest RFC 7616 para VAPIX + token wssession |
| Clients de evento | `health/clients/axis-ws.client.ts`, `onvif-pullpoint.client.ts` | Canais de heartbeat/evento (WebSocket Axis · PullPoint ONVIF) |
| Probe de credenciais | `cameras/services/camera-credential-probe.service.ts` | Handshake ONVIF de descoberta (device info + perfis + range PTZ) |
| Credenciais | `database/schema/camera/camera_credential.prisma` (`CameraCredential`) | user/pass 1:1 por câmera |

## Protocolos suportados

| Protocolo | Estado | Como | Fonte |
| --- | --- | --- | --- |
| **ONVIF Profile S** | Obrigatório, preferido (RNF-CAM-02) | `OnvifDriver` genérico via `@atmanadmin/node-onvif-ts`; PTZ sobre `ContinuousMove`/`AbsoluteMove`/`RelativeMove`/`Stop` | `onvif.driver.ts` |
| **RTSP / RTSPS** | Suportado (streaming) | Sem driver stateful — `RtspCameraCommunicationStrategy` só constrói a URL; `RTSPS` tratado como variante segura de RTSP | `rtsp-camera-communication.strategy.ts`, `rtsp-defaults.constants.ts` |
| **VAPIX / Axis** | Suportado (proprietário) | Chamado **direto** por PtzService e health worker — zoom em câmera fixa, PTZ absoluto em unidades nativas, eventos WS, posição PTZ. **Não** passa pela factory | `vapix-ptz.utils.ts`, `vapix-zoom.utils.ts`, `axis-ws.client.ts` |
| **Hikvision / Dahua / Bosch / outros** | Via ONVIF | Sem adaptador dedicado — cobertos pelo `OnvifDriver` genérico (mencionados como ONVIF-compatíveis no cabeçalho de `i-camera-driver.interface.ts`) | — |
| **PROPRIETARY (driver dedicado)** | **Não implementado** | `ProtocolType.PROPRIETARY` na factory **lança** `PROPRIETARY_PROTOCOL_NOT_SUPPORTED`; registry (`INT-004-proprietary-registry.md`, ex. `AxisVapixDriver`) reservado, não existe | `camera-driver.factory.ts` |

> Nuance: VAPIX **existe e roda**, mas não como um `ICameraDriver` registrado — é invocado por fora do par factory/driver (ver [[Integração com dispositivo - Arquitetura e estratégias]]). O "PROPRIETARY como driver formal" é o que está pendente.

## Como cada consumidor usa

| Consumidor | O que consome | Caminho |
| --- | --- | --- |
| [[00 - Streaming\|Streaming]] | Descritor de stream (URL RTSP) via **estratégia** | `streaming/services/camera-stream-source.resolver.ts` → `selector.select()` → `buildLiveStreamDescriptor()` |
| [[00 - PTZ e presets\|PTZ e presets]] | Comando PTZ via **driver** (ONVIF) ou **VAPIX** (Axis) | `cameras/services/ptz.service.ts` → `driverFactory.createDriver(ONVIF)` ou `vapixAbsolutePtz`/`vapixContinuousZoom` |
| [[00 - Saúde e monitoramento\|Saúde e monitoramento]] | Heartbeat/eventos via **clients** WS/PullPoint | `health/workers/camera-health.worker.ts` → `AxisWsClient` / `OnvifPullPointClient` |
| [[00 - Cameras\|Cameras]] (CRUD) | Probe de credenciais no cadastro | `cameras/services/camera-credential-probe.service.ts` (ONVIF handshake) |

## Notas do domínio

- [[Integração com dispositivo - Arquitetura e estratégias]] — padrões (Factory + Strategy), portas, descritor de stream, digest auth, erros/timeouts.
- [[Integração com dispositivo - Fluxos]] — fluxos técnicos: driver ONVIF, VAPIX, descritor de stream, probe, heartbeat.
- [[Integração com dispositivo - Requisitos e SLA]] — RF-INT-05, RNF-CAM-02, RF-CAM-03, RNF-CAM-01, RNF-CAM-03; fallback e SLA.

## Relacionados

[[ms-cameras - visão geral]] · [[00 - Cameras]] · [[00 - Saúde e monitoramento]] · [[00 - Streaming]] · [[00 - PTZ e presets]] · [[02 - MOD-002 multi-protocol-adapter.excalidraw|diagrama]]
</content>
</invoke>
