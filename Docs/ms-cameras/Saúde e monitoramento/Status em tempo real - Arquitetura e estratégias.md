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

# Status em tempo real — Arquitetura e estratégias

> Parte de [[Status em tempo real (push)]]. Diagrama: [[00 - Geral - Modulo Cameras.excalidraw|diagrama geral]].

## Gateway `cameras-status` guardado por JWT

`camera-status.gateway.ts` — `@WebSocketGateway({ namespace: 'cameras-status' })`. CORS lê `CORS_ALLOWED_ORIGINS` (default `http://localhost:4200`), `credentials: false`.

As duas mensagens do cliente têm `@UseGuards(WsAuthGuard)`:

- `subscribe_camera { cameraId }` — valida `isUUID(cameraId)`; entra na sala `camera:<id>` (`client.join`); busca o snapshot (cache-ou-DB) e responde **só ao próprio socket** com `camera:status:snapshot`. Erros viram `WsException` tipada por `errorCode` (`VALIDATION_FAILED`, `RESOURCE_NOT_FOUND`, `INTERNAL_ERROR`).
- `unsubscribe_camera { cameraId }` — sai da sala (`client.leave`).

**`WsAuthGuard`** (`guards/ws-auth.guard.ts`): pega o token do header `Authorization: Bearer` **ou** do handshake auth do Socket.IO (`handshake.auth.token`) e chama `JwtSignerService.verify` (`@attlas/core-auth`). Sem token ou token inválido → `WsException` code `4001` / `errors.UNAUTHORIZED`. O fallback por query-string é **intencionalmente omitido** (token em URL vaza para log). `handleConnection`/`handleDisconnect` só logam — a autorização é por mensagem, não no handshake.

## Modelo de salas

Uma sala por câmera: `camera:<cameraId>`. O cliente assina as câmeras que a tela mostra; os handlers fazem `server.to('camera:<id>').emit(...)`, então só quem assinou aquela câmera recebe. A entrega é fire-and-forget: não há ack nem replay de eventos perdidos — quem reconecta reassina e recebe um novo `snapshot`.

## Snapshot cacheado no Redis

- **Chave** `camera:status:<id>`, valor = `ICameraStatusPayload` serializado. **TTL** = `CameraStatusConfig.REDIS_TTL_SECONDS` (`cameras/cameras.constants.ts`), vindo do env `REDIS_STATUS_CACHE_TTL_SECONDS`. Escrito com `SETEX`.
- **Quem escreve:** só o events-handler de status, **antes** de emitir o broadcast (assim um assinante que chega atrasado lê cache fresco).
- **Quem lê:** o gateway no `subscribe_camera`, via `getCachedOrFetchStatus` — tenta o Redis; em miss, parse inválido ou Redis fora, cai para `GetCameraStatusQuery` (DB).
- **Best-effort:** o Redis é cache, **o banco é a fonte de verdade**. O client (`redis/redis.module.ts`) usa `enableOfflineQueue: false`, `maxRetriesPerRequest: 2`, backoff exponencial com teto e um único warning throttled — se o Redis estiver fora, o comando rejeita rápido e o caller usa o DB.

## Events-handlers in-process (CQRS EventBus, não Kafka)

Os três handlers reagem a eventos publicados **dentro do mesmo processo** pelo worker de saúde (`EventBus.publish`), sem passar por Kafka:

| Handler | Evento | Query? | Redis? | Emite |
| --- | --- | --- | --- | --- |
| `camera-status.events-handler.ts` | `CameraConnectivityHealthChangedEvent` | Sim (`GetCameraStatusQuery`) | Grava `SETEX` | `camera:status:update` |
| `camera-ptz-position.events-handler.ts` | `CameraPtzPositionChangedEvent` | Não | Não | `camera:ptz:position` |
| `camera-event-log.events-handler.ts` | `CameraEventLogCreatedEvent` | Não | Não | `camera:event:new` |

Só o de **status** refaz o payload completo e persiste no cache. PTZ e event-log são **efêmeros e já carregam o payload no evento** — não valem uma query nem uma escrita de cache (a última posição PTZ já fica no `operationalSnapshot`). O handler de status ainda trata a corrida "câmera apagada entre a emissão e o handle": `ResourceNotFoundException` → `return` silencioso (não é incidente).

## Distinção do gateway de streaming

O `streaming/streaming.gateway.ts` (namespace `/cameras`) é **outro** gateway:

- **Público** (sem `WsAuthGuard`) — streaming é servido como `@Public()`.
- Fonte por `@OnEvent` do **EventEmitter** (`CAMERA_STATUS_CHANGED_EVENT`, `HLS_STREAM_EVENT`), não pelo **EventBus** do CQRS.
- Emite ciclo de vida de mídia: `status.changed`, `stream.started/stopped/reconnecting/error`.

Ou seja: mesmo modelo de sala (`camera:<id>`), propósitos e canais diferentes. Detalhe em [[00 - Streaming]].

## Limitação de escala (pré-requisito para escalar)

> [!warning] Broadcast não cruza réplicas
> Cada réplica do `ms-cameras` tem seu próprio adapter Socket.IO **em memória** e só conhece os sockets conectados **a ela**. Um `server.to('camera:<id>').emit(...)` roda em **um pod só** e alcança só os sockets daquele pod. Se o cliente está ligado na réplica A e o evento nasce na réplica B, **o cliente não recebe**. Enquanto há uma réplica, não aparece; quando o KEDA escala, aparece.

Para escalar com segurança é preciso o **adapter Redis do Socket.IO** (`@socket.io/redis-adapter` via `IoAdapter` custom no `main.ts`) — e antes disso **provisionar o Redis do `ms-cameras`**, que hoje existe só como config de cache. Detalhe, teste no cluster e plano em [[06-PROBLEMAS-IDENTIFICADOS]] (Problema 2). Impacta RNF-CAM-01 (ver [[Status em tempo real - Requisitos e SLA]]).

## Decisões

- **EventBus in-process, não Kafka, para status ao vivo.** O worker de saúde e o gateway vivem no mesmo serviço; push ao vivo não precisa da durabilidade/latência do Kafka. `attlas.cameras.status-changed` está nas constantes mas sem producer ativo.
- **Cache write-before-broadcast.** Grava Redis antes de emitir, para que um assinante recém-chegado leia o mesmo estado que os já conectados acabaram de receber.
- **PTZ e event-log não tocam Redis.** São efêmeros; a posição PTZ persiste no `operationalSnapshot` e o log tem seu próprio armazenamento — cachear seria custo sem ganho.
- **Cache best-effort com DB como verdade.** Redis fora nunca derruba a leitura de status; degrada para query no banco.
- **Autorização por mensagem, não no handshake.** JWT é validado no `subscribe`/`unsubscribe`, mantendo o handshake barato e o token fora da URL.
