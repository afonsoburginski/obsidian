---
tags:
  - doc
  - cameras
  - ms-cameras
  - realtime
servico: ms-cameras
fonte: apps/ms-cameras/src/cameras/realtime
atualizado: 2026-07-03
---

# Status em tempo real (push)

> Camada de **push** do domínio [[00 - Saúde e monitoramento]] (MOD-005): entrega ao vivo ao operador o estado que o healthcheck 24/7 produz. Parte de [[ms-cameras - visão geral]]. Diagrama: [[00 - Geral - Modulo Cameras.excalidraw|diagrama geral]].

## Propósito

**Empurrar (push) o estado vivo da câmera ao frontend** assim que ele muda, sem polling: conexão online/offline, qualidade do stream (resolução/fps/bitrate), modo de operação, posição PTZ, presets e geoposicionamento (RF-CAM-04). O canal é um **Socket.IO** guardado por JWT; a fonte das mudanças é o **worker de saúde** (via EventBus in-process), não Kafka. Um snapshot também fica cacheado no Redis (`camera:status:<id>`) para o primeiro frame do cliente e para leitura sob demanda por REST.

> [!info] Não confundir com o Streaming
> Existem **dois** gateways Socket.IO no `ms-cameras`, em namespaces diferentes. Este submódulo é o `cameras-status` (status/PTZ/eventos, com JWT). O do vídeo é o `/cameras`, coberto em [[00 - Streaming]]. Ver seção [[#Namespaces Socket.IO]].

## Mapa de código

Tudo em `apps/ms-cameras/src/cameras/realtime/` salvo indicação.

| Peça | Arquivo | O que faz |
| --- | --- | --- |
| Gateway | `camera-status.gateway.ts` | Namespace `cameras-status`; `subscribe_camera`/`unsubscribe_camera` (com JWT); entrega snapshot inicial; expõe `server` para os handlers emitirem. |
| Service | `camera-status.service.ts` | `buildStatusPayload(cameraId)` — monta `ICameraStatusPayload` a partir do Prisma (`operationalSnapshot`, `ptzPresets`, `streamProfiles` SECONDARY). |
| Handler REST/WS | `../handlers/get-camera-status/get-camera-status.handler.ts` | `QueryHandler` de `GetCameraStatusQuery` → delega ao service. Reutilizado pelo gateway (fallback de cache) e pelo endpoint REST. |
| Events-handler status | `camera-status.events-handler.ts` | `@EventsHandler(CameraConnectivityHealthChangedEvent)` — refaz payload, grava Redis, emite `camera:status:update`. |
| Events-handler PTZ | `camera-ptz-position.events-handler.ts` | `@EventsHandler(CameraPtzPositionChangedEvent)` — emite `camera:ptz:position` (sem query, sem Redis). |
| Events-handler eventos | `camera-event-log.events-handler.ts` | `@EventsHandler(CameraEventLogCreatedEvent)` — emite `camera:event:new` (payload já vem no evento). |
| Eventos de domínio | `events/*.event.ts` | Classes publicadas no EventBus pelo worker de saúde. |
| Guard | `guards/ws-auth.guard.ts` | `WsAuthGuard` — valida JWT via `JwtSignerService.verify`. |
| Wiring | `camera-status.module.ts` | Registra gateway, service, 3 events-handlers, guard e handlers de query. |
| Cache | `../../redis/redis.module.ts` | `REDIS_CLIENT` (ioredis, best-effort); chave `camera:status:<id>`, TTL em `cameras/cameras.constants.ts` (`CameraStatusConfig.REDIS_TTL_SECONDS`). |

## Namespaces Socket.IO

| Namespace | Gateway | Auth | Fonte dos eventos | Emite |
| --- | --- | --- | --- | --- |
| `cameras-status` | `camera-status.gateway.ts` | **JWT** (`WsAuthGuard`) | EventBus CQRS (worker de saúde) | `camera:status:snapshot`, `camera:status:update`, `camera:ptz:position`, `camera:event:new` |
| `/cameras` | `streaming/streaming.gateway.ts` | Público (sem guard) | `@OnEvent` do EventEmitter (ciclo de vida HLS) | `status.changed`, `stream.started/stopped/reconnecting/error` |

Os dois usam salas `camera:<id>`, mas são servidores distintos: um cliente que só quer status assina o `cameras-status`; o player de vídeo fala com o `/cameras`. Detalhe do de streaming em [[00 - Streaming]].

**Mensagens do cliente (`cameras-status`):** `subscribe_camera { cameraId }` → entra na sala e recebe `camera:status:snapshot`; `unsubscribe_camera { cameraId }` → sai da sala. Ambas exigem JWT.

## Endpoint REST — leitura sob demanda

`GET /api/cameras/:id/status` (`cameras/cameras.controller.ts`, `getStatus`) → `GetCameraStatusQuery` → mesmo `buildStatusPayload`. Devolve o `ICameraStatusPayload` corrente sem abrir WebSocket — usado no carregamento inicial de tela e por quem não precisa de push. JWT validado no Kong.

## Fonte dos eventos

O estado não muda "sozinho" aqui: quem detecta é o **worker de saúde** (`health/workers/camera-health.worker.ts`), que publica no EventBus in-process:

- `CameraConnectivityHealthChangedEvent` (mudança online/offline / status de conexão)
- `CameraPtzPositionChangedEvent` (nova posição PTZ observada)
- `CameraEventLogCreatedEvent` (novo evento de log — também publicado por `cameras/services/record-camera-event.service.ts`)

Ver [[00 - Saúde e monitoramento]]. **Status não trafega por Kafka**: `attlas.cameras.status-changed` existe nas constantes/SPEC mas não tem producer ativo (ver [[ms-cameras - visão geral]]).

## Notas deste submódulo

- [[Status em tempo real - Arquitetura e estratégias]] — gateway, JWT, cache Redis, handlers in-process, distinção do streaming, limitação de escala.
- [[Status em tempo real - Fluxos]] — do worker até o cliente, e a leitura sob demanda.
- [[Status em tempo real - Requisitos e SLA]] — RF-CAM-04 e RNF-CAM-01 → estado.

## Relacionados

[[ms-cameras - visão geral]] · [[00 - Saúde e monitoramento]] · [[00 - PTZ e presets]] · [[00 - Streaming]] · [[06-PROBLEMAS-IDENTIFICADOS]]
