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

# Status em tempo real — Fluxos

> Parte de [[Status em tempo real (push)]]. Diagrama: [[00 - Geral - Modulo Cameras.excalidraw|diagrama geral]].

## Fluxo 1 — Mudança de conectividade → push ao vivo

Caminho do "câmera caiu/voltou / mudou qualidade" até o badge no navegador.

| # | Passo | Onde |
| --- | --- | --- |
| 1 | Worker de saúde detecta a mudança de status de conexão | `health/workers/camera-health.worker.ts` (ver [[00 - Saúde e monitoramento]]) |
| 2 | Publica `CameraConnectivityHealthChangedEvent` no EventBus | `eventBus.publish(...)` |
| 3 | Handler reconstrói o payload completo via `GetCameraStatusQuery` → `buildStatusPayload` | `camera-status.events-handler.ts` |
| 4 | Grava o snapshot no Redis (`SETEX camera:status:<id>`, TTL) **antes** de emitir | idem |
| 5 | `server.to('camera:<id>').emit('camera:status:update', payload)` | idem |
| 6 | Cada cliente inscrito naquela sala recebe e atualiza o estado | frontend |

Câmera apagada entre 2 e 3 → `ResourceNotFoundException` → handler faz `return` (corrida esperada, não é erro).

## Fluxo 2 — Posição PTZ ao vivo

| # | Passo | Onde |
| --- | --- | --- |
| 1 | Worker observa nova posição PTZ (pan/tilt/zoom) | `health/workers/camera-health.worker.ts` |
| 2 | Persiste no `operationalSnapshot` e publica `CameraPtzPositionChangedEvent` | idem |
| 3 | Handler emite `camera:ptz:position { cameraId, pan, tilt, zoom, observedAt }` — **sem query, sem Redis** | `camera-ptz-position.events-handler.ts` |
| 4 | Clientes na sala atualizam o badge/overlay PTZ | frontend |

## Fluxo 3 — Novo evento de log ao vivo

| # | Passo | Onde |
| --- | --- | --- |
| 1 | Um evento de câmera é registrado (worker de saúde ou `RecordCameraEventService`) | `health/workers/camera-health.worker.ts` · `cameras/services/record-camera-event.service.ts` |
| 2 | Publica `CameraEventLogCreatedEvent` (o `entry` já vai no evento) | `eventBus.publish(...)` |
| 3 | Handler emite `camera:event:new` com o `entry` — **sem query** | `camera-event-log.events-handler.ts` |
| 4 | Clientes na sala anexam o evento à timeline ao vivo | frontend |

## Fluxo 4 — Assinatura e snapshot inicial (WebSocket)

| # | Passo | Onde |
| --- | --- | --- |
| 1 | Cliente conecta ao namespace `cameras-status` com JWT (header ou `handshake.auth.token`) | `camera-status.gateway.ts` |
| 2 | Envia `subscribe_camera { cameraId }` → `WsAuthGuard` valida o JWT | `guards/ws-auth.guard.ts` |
| 3 | Valida `isUUID(cameraId)`; entra na sala `camera:<id>` | gateway |
| 4 | Busca snapshot: Redis (`camera:status:<id>`) → em miss/erro cai para `GetCameraStatusQuery` (DB) | `getCachedOrFetchStatus` |
| 5 | Emite `camera:status:snapshot` **só ao próprio socket** | gateway |
| 6 | A partir daí o cliente recebe `update`/`ptz:position`/`event:new` da sala | fluxos 1–3 |

Sair: `unsubscribe_camera { cameraId }` → `client.leave`.

## Fluxo 5 — Leitura sob demanda (REST)

`GET /api/cameras/:id/status` → `GetCameraStatusQuery` → `buildStatusPayload` → `ICameraStatusPayload`. Sem WebSocket, sem sala; JWT no Kong. Usado no primeiro carregamento de tela e por quem não precisa de push. `cameras/cameras.controller.ts` (`getStatus`).

## User flow — onde o status vivo aparece

- **Lista de câmeras:** badge online/offline por linha; atualiza via `camera:status:update`.
- **Detalhe da câmera:** estado de conexão, qualidade (resolução/fps/bitrate), modo, posição PTZ e presets ao vivo; carrega inicial por REST (Fluxo 5), depois assina o WebSocket (Fluxo 4).
- **Video Wall:** cada célula assina a sua câmera; badge de status e overlay PTZ acompanham em tempo real (o vídeo em si vem do gateway de [[00 - Streaming]]).

## O que o payload carrega

`ICameraStatusPayload` (montado em `camera-status.service.ts`): `cameraId`, `connectionStatus` (do snapshot), `streamQuality` (`resolution`/`fps`/`bitrate` do stream **SECONDARY** ativo), `operationMode` (= `lifecycleState`), `ptz` (`pan`/`tilt`/`zoom` do snapshot), `presets` (id + nome), `location` (`lat`/`lng`), `updatedAt`. `irStatus` vem **sempre `null` (reservado — não implementado)**.
