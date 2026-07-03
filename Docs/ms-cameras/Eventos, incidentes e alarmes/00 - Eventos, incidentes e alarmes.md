---
tags: [doc, cameras, ms-cameras, eventos]
---

# Eventos, incidentes e alarmes (ms-cameras)

> Submódulo do [[ms-cameras - visão geral]] (MOD-007 camera-events). Código: `apps/ms-cameras/src/cameras/`. Visual: [[07 - MOD-007 camera-events.excalidraw|diagrama]].

Como o `ms-cameras` registra ocorrências das câmeras (eventos), as agrupa em **incidentes** por correlação temporal e emite **alarmes** para o módulo Alarmes. Cobre RF-EVT-01/02/03 e RF-INC-01/02/03/04. As **regras de negócio** (tipos, severidades, SLA, MTTR/MTBF) vivem em `docs/modules/cameras.md` — aqui documentamos **a implementação**.

## Pipeline (em prosa)

Um evento nasce de duas fontes. **(1)** O worker de saúde (`src/health/`, ver [[00 - Saúde e monitoramento]]) grava direto no `CameraEventLog` transições de estado/comunicação/energia/PTZ (`HEALTH_ONLINE`/`HEALTH_OFFLINE`/`HEALTH_EVENT`/`CONNECTIVITY_CHANGED`, com `causeCode` VAPIX) e empurra por WebSocket. **(2)** Dispositivos, no-breaks e outros serviços publicam no tópico Kafka `attlas.cameras.event-ingest`; o `CameraEventIngestListener` consome e delega ao `RecordCameraEventService` (UC-019), o **seam único** de registro.

O seam valida a câmera, normaliza `occurredAt`, deduplica por `correlationId`, persiste em `CameraEventLog`, transmite por WebSocket (EventBus) **e** publica em `attlas.cameras.event-logged`. Esse `event-logged` faz **fan-out** para dois consumidores independentes: o worker de **correlação** (UC-021) e o **emissor de alarme** (UC-022).

A correlação agrupa eventos correlacionáveis por `correlationKey = eventType:causeCode` dentro de uma janela temporal, criando um `CameraIncident` `TENTATIVE`; quando cruza o limiar (≥2 câmeras ou ≥3 eventos) promove para `DETECTED` e publica `attlas.cameras.incident-created`. O emissor de alarme reage em dois branches: um evento crítico isolado (branch B, via `event-logged`) e um incidente correlacionado (branch A, via `incident-created`) — ambos derivam um `alarmId` determinístico (UUID v5) e publicam `attlas.alarms.alarm-raised`, consumido pelo futuro `ms-alarms`.

> [!warning] Nuance de wiring — o que hoje alimenta correlação/alarme
> O único produtor de `event-logged` no repositório é o `RecordCameraEventService` (alimentado pelo **ingest**). Os eventos gerados internamente pelo worker de saúde (`CameraHealthEventLogRepository.append`) são **persistidos e empurrados por WebSocket, mas não publicados em `event-logged`** — logo não entram no pipeline Kafka de correlação/alarme. Na prática, correlação e alarme são dirigidos hoje pelos eventos **ingeridos externamente**.

## Mapa de código (`apps/ms-cameras/src/cameras/`)

| Peça | Arquivo | Papel |
| --- | --- | --- |
| Seam de registro | `services/record-camera-event.service.ts` | Valida, dedup por `correlationId`, persiste, EventBus + publish `event-logged` (UC-019) |
| Ingest Kafka | `events/camera-event-ingest.listener.ts` | Consome `event-ingest`; cap 4 KiB; drop sem poison-pill (UC-019) |
| Publisher | `events/camera-events.publisher.ts` | `event-logged`, `incident-created`, `alarm-raised` (best-effort) |
| Categoria | `handlers/_helpers/derive-camera-event-category.ts` | `(eventType, causeCode)` → `CameraEventCategory` (read-time) + `where` de filtro |
| Correlação | `handlers/correlate-events/{listener,service,correlation-rules}.ts` | Cluster + housekeeping cron (UC-021) |
| Emissão de alarme | `handlers/emit-alarm/{listener,service,alarm-mapping}.ts` | Branch A (incidente) + Branch B (evento) (UC-022) |
| Read: log | `handlers/get-camera-event-log/` | `GET /cameras/:id/events` (UC-017) |
| Read: detalhe | `handlers/get-camera-event-detail/` | `GET /cameras/:id/events/:eventId` (UC-018) |
| Read: incidentes | `handlers/list-camera-incidents/`, `handlers/get-camera-incident/` | `GET /cameras/incidents[/:id]` (UC-023/024) |
| Mapeamentos | `handlers/_helpers/incident-mapping.ts` | `causeCode` → tipo/severidade; parse `correlationKey` |
| Repositórios | `repositories/camera-event-log.repository.ts`, `repositories/camera-incidents.repository.ts` | Persistência de eventos e incidentes |
| Constantes | `cameras.constants.ts` (`CorrelationConfig`, `AlarmEmitConfig`) | Janelas, limiares, cron |
| Bridge WS | `realtime/camera-event-log.events-handler.ts` | EventBus → `camera:event:new` na sala `camera:<id>` |

Wiring: `apps/ms-cameras/src/cameras/cameras.module.ts` (controllers `CameraEventIngestListener`, `CorrelateEventsListener`, `EmitAlarmListener`).

## Endpoints (prefixo `/api`)

| Método | Rota | O que retorna | Origem |
| --- | --- | --- | --- |
| `GET` | `/cameras/:id/events` | Página de eventos (filtros tipo/severidade/categoria/`from`/`to`/busca/`sort`) | UC-017 `GetCameraEventLogHandler` |
| `GET` | `/cameras/:id/events/:eventId` | Detalhe do evento + `linkedIncident` `{id,status}` | UC-018 `GetCameraEventDetailHandler` |
| `GET` | `/cameras/incidents` | Página de incidentes (janela default 7d; `TENTATIVE`/`DROPPED` ocultos) | UC-023 `ListCameraIncidentsHandler` |
| `GET` | `/cameras/incidents/:id` | Detalhe + timeline ASC (cap 200, flag `timelineTruncated`) | UC-024 `GetCameraIncidentHandler` |

As rotas `incidents` e `incidents/:id` são declaradas **antes** de `@Get(':id')` no controller para não caírem no `ParseUUIDPipe` de `:id`.

## Kafka

Constantes: `libs/contracts/src/lib/camera/cameras-topics.constant.ts` e `libs/contracts/src/lib/alarm/alarms-topics.constant.ts`.

| Direção | Tópico | Onde | Payload |
| --- | --- | --- | --- |
| Consome | `attlas.cameras.event-ingest` | `camera-event-ingest.listener.ts` (UC-019) | `ICameraEventIngestMessage` |
| Consome | `attlas.cameras.event-logged` | **fan-out**: `correlate-events` **e** `emit-alarm` (Branch B) | `ICameraEventLogEntry` |
| Consome | `attlas.cameras.incident-created` | `emit-alarm.listener.ts` (Branch A) | `ICameraIncidentCreatedEvent` |
| Produz | `attlas.cameras.event-logged` | `RecordCameraEventService` (key = `cameraId`) | `ICameraEventLogEntry` |
| Produz | `attlas.cameras.incident-created` | `CorrelateEventsService` (só na promoção) | `ICameraIncidentCreatedEvent` |
| Produz | `attlas.alarms.alarm-raised` | `EmitAlarmService` (key = `sourceId`/câmera) | `IAlarmRaisedEvent` |

Sem broker (`KAFKA_BROKERS` ausente) todos os publishes são suprimidos silenciosamente; o registro/correlação já foi persistido.

## Persistência (`apps/ms-cameras/src/database/schema/`)

| Modelo | Arquivo | Papel |
| --- | --- | --- |
| `CameraEventLog` | `audit/camera_event_log.prisma` | Evento bruto: `eventType`, `subType`, `severity`, `payload` (JSON), `correlationId`, `operatorId`, `occurredAt` (Timestamptz). **Sem coluna `category`** (derivada em read-time) |
| `CameraIncident` | `incident/camera_incident.prisma` | Cluster: `status`, `priority`, `correlationKey` (VarChar 64), `detectedAt`/`resolvedAt`; `reportedBy`/`assignedTo`/`workOrderId` nullable (fluxo manual/manutenção futuro) |
| `CameraIncidentEvent` | `incident/camera_incident_event.prisma` | Ligação N:N evento↔incidente; `@@unique([incidentId, eventLogId])` = idempotência forte |

## Relacionados

[[00 - Saúde e monitoramento]] · [[00 - PTZ e presets]] · [[Status em tempo real (push)]] · [[00 - Streaming]]
