---
tags: [doc, cameras, ms-cameras, eventos]
---

# Eventos, incidentes e alarmes — Fluxos

> Submódulo do [[ms-cameras - visão geral]]. Índice: [[00 - Eventos, incidentes e alarmes]]. Arquitetura: [[Eventos, incidentes e alarmes - Arquitetura e estratégias]]. Visual: [[07 - MOD-007 camera-events.excalidraw|diagrama]].

Use cases (backend) e user flow (frontend) passo a passo. Sem diagrama — ver o canvas.

## UC-019 — Registro de evento

### Fonte A: transição interna (worker de saúde)

1. Worker detecta transição (offline, reconexão, evento VAPIX, PTZError…) — ver [[00 - Saúde e monitoramento]].
2. `safeAppendEvent` grava em `CameraEventLog` (`HEALTH_*`/`CONNECTIVITY_CHANGED` + `causeCode`).
3. `eventBus.publish(CameraEventLogCreatedEvent)` → WebSocket `camera:event:new`.
4. **Fim.** Não publica em `event-logged` → não dispara correlação/alarme (ver nuance no índice).

### Fonte B: ingest Kafka (dispositivos/serviços externos)

1. Produtor externo publica `ICameraEventIngestMessage` em `attlas.cameras.event-ingest`.
2. `CameraEventIngestListener.handle`: valida `cameraId`/`eventType` (drop se faltar) e cap 4 KiB (drop se exceder).
3. `RecordCameraEventService.record`:
   1. Câmera existe e não deletada? Não → `ResourceNotFoundException` → listener dropa com `warn`.
   2. `parseOccurredAt`: ISO-8601 com offset explícito, senão `InvalidInputException` → listener dropa.
   3. `correlationId` já gravado? Sim → retorna a linha existente (dedup).
   4. `repository.insert` (severity default `INFO`); enriquece com categoria derivada.
   5. `eventBus.publish` (WebSocket) **e** `publisher.publishEventLogged` (Kafka, best-effort).
4. `event-logged` faz **fan-out** para UC-021 (correlação) e UC-022 (alarme, Branch B).

## UC-021 — Correlação em incidente

Consumidor de `event-logged`. `CorrelateEventsListener.handle` valida o payload (`validateEventLogEntry`; drop se inválido) e chama `CorrelateEventsService.correlate`:

1. Extrai `causeCode`. `isCorrelatable(eventType, causeCode)` falso → retorna.
2. `eventAlreadyLinked(entry.id)` verdadeiro → skip (idempotência fail-fast).
3. Monta `correlationKey` e as janelas (`now-60s`, `now-120s`).
4. `findOpenIncidentByKey`:
   - **Achou aberto** → `attachEvent`:
     1. Cria `CameraIncidentEvent` (idempotente via `@@unique`; ignora P2002).
     2. Recomputa `eventCount` e câmeras distintas.
     3. `TENTATIVE` e (≥2 câmeras **ou** ≥3 eventos)? → `updateMany` condicional `TENTATIVE→DETECTED`.
     4. `wasPromoted` → publica `incident-created`. Senão só toca `updatedAt`.
   - **Nenhum aberto** → `createIncidentWithEvent` cria `TENTATIVE` + liga o evento; **não publica**.

**Housekeeping** (`@Cron` a cada minuto, uma réplica via advisory lock):

| Operação | Condição | Efeito |
| --- | --- | --- |
| `autoCloseExpiredDetected` | `DETECTED`, `updatedAt` < now-30min | → `RESOLVED` |
| `dropExpiredTentative` | `TENTATIVE`, `updatedAt` < now-120s | → `DROPPED` |
| `autoResolveByRecovery` | `DETECTED`, ≥80% das câmeras com `HEALTH_ONLINE` após `detectedAt` | → `RESOLVED` |

## UC-022 — Emissão de alarme (2 branches)

`EmitAlarmListener` consome dois tópicos; erros não-swallowable são relançados (Kafka reentrega).

### Branch A — incidente correlacionado (`incident-created`)

1. Guarda: `affectedCameraIds` vazio → `warn` + drop.
2. `mapToAlarm({ causeCode, fromCluster: true })`; `null` → não emite.
3. `alarmId = deriveAlarmId('INCIDENT', incidentId)`; `affectedEntities` = todas as câmeras.
4. Publica `alarm-raised` (key = `incidentId`).

### Branch B — evento crítico isolado (`event-logged`)

1. `isAlarmableEvent(causeCode, severity)` falso → não emite (`ERROR` sempre; `VAPIX_TAMPERING` sempre; senão não).
2. `findIncidentByEventLogId` achou ligação → skip (cluster já cobre).
3. `mapToAlarm({ causeCode, fromCluster: false })`; `null` → não emite.
4. `alarmId = deriveAlarmId('EVENT', eventLogId)`; `affectedEntities` = a câmera.
5. Publica `alarm-raised` (key = `cameraId`).

## UC-017 / UC-018 — Leitura de log e detalhe

- **Log** (`GET /cameras/:id/events`): valida câmera (404), aplica filtros `eventType`/`severity`/`category` (CSV), `search` (em `summary`/`translationKey`), janela `from`/`to` (sobre **`createdAt`**) e `sort` (default `occurredAt desc`; aceita `severity`/`actor`). Paginação `limit` (default 20, máx 100). Categoria derivada por item.
- **Detalhe** (`GET /cameras/:id/events/:eventId`): `findEventScopedByCamera` — evento de outra câmera ou de câmera deletada resolve `null` → 404 sem vazar existência. Inclui `linkedIncident {id, status}` (link mais recente).

## UC-023 / UC-024 — Leitura de incidentes

- **Lista** (`GET /cameras/incidents`): sem `from`/`to`, janela default = 7 dias. Status default oculta `TENTATIVE`/`DROPPED` (só `DETECTED`/`INVESTIGATING`/`RESOLVED`). Filtros `severity`/`type`/`status`/`cameraId`; `type` traduzido para sufixos de `correlationKey`. `affectedCameraIds`/`eventCount` agregados à parte (não limitados pela página).
- **Detalhe** (`GET /cameras/incidents/:id`): status interno (`TENTATIVE`/`DROPPED`) → 404. Timeline ASC (cronológica), cap `MAX_TIMELINE_ITEMS = 200` com flag `timelineTruncated`. Traz `reportedBy`/`assignedTo`/`workOrderId` (nullable hoje).

## User flow (frontend `cameras-dashboard`)

O feature module consome exclusivamente os endpoints acima; sem detalhe de tela aqui (pertence às UFs do `web-attlas`).

- **Aba "Log de Eventos" / "Eventos recentes"**: lista paginada de `GET /cameras/:id/events` com filtros por tipo/severidade/categoria/período e busca; push ao vivo por WebSocket (`camera:event:new` na sala `camera:<id>`). Clique num item → detalhe (UC-018) com `payload` e incidente vinculado.
- **Lista de incidentes**: `GET /cameras/incidents` (janela + filtros); cada linha mostra severidade, tipo, câmeras afetadas, contagem de eventos e status.
- **Detalhe do incidente**: `GET /cameras/incidents/:id` com timeline correlacionada dos eventos e campos de atribuição/OS (quando o fluxo de manutenção for plugado).
