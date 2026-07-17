---
tags:
  - attlas
  - sem-prazo
  - card
cards: SOFTWARE-2220, 2221, 2222, 2223, 2224
epico: SOFTWARE-2047 (Eventos - Eventos de todas as câmeras)
sprint: sem prazo (ClickUp Sprint 25 / backlog)
status: backlog - 5 cards (1 PR cada, 1 condicional), linkados ao épico 2047; contratos + backend existente mapeados (2026-07-15)
atualizado: 2026-07-17
---

# Eventos de câmeras - backend

Backend da tela de **Eventos de câmeras** (`/cameras/events` + detalhe `/cameras/events/:id`). O frontend já existe e roda **em mock** (flag `useMock = true`; Lucas, épico SOFTWARE-2047, subtasks [Front] Closed). Contratos prontos. Falta o `ms-cameras` expor a **agregação cross-câmera** em `/api/cameras/events/*`. Backend-only, 1 card = 1 PR.

## Cuidado: "eventos" tem três camadas

1. **Eventos cross-câmera** (esta frente). Feed agregado de **todas as câmeras** (lista, stats, detalhe, timeline, recorrência). Feature module `cameras-events` (separado do dashboard em 2026-07-07, SOFTWARE-2051).
2. **Eventos por-câmera** (já existe). `GET cameras/:id/events` e `:id/events/:eventId` já respondem no `ms-cameras`. Falta a camada cross-câmera por cima.
3. **Módulo Alarmes** (`ms-alarms`, esqueleto). Sistema transversal (`/api/alarms/*`). Críticos de câmera são *encaminhados* pra lá (edital 4.6), mas esta tela **não consome** Alarmes.

## Estado atual e achado da investigação (2026-07-15)

- Front: `apps/web-attlas/src/app/modules/cameras-events/`; `camera-events.service.ts` com `useMock = true`, ramos `http.get/post` prontos.
- Contratos: `libs/contracts/src/lib/camera/` (`i-list-camera-events-*`, `-stats`, `-recurrence`, `-observation`, `-triggered-action`, `-detail`, `-log-entry`). Prontos.
- Backend hoje: só eventos por-câmera (`GetCameraEventLogHandler`, `GetCameraEventDetailHandler`).

**O model `CameraEventLog` é mais magro que o contrato de lista.** Colunas que existem: `id, cameraId, occurredAt, eventType, subType, severity (String INFO/WARN/ERROR), summary, translationKey, payload Json, correlationId, operatorId, createdAt`. Colunas que o contrato pede e **NÃO existem**: `eventCode`, `category` (derivada read-time via `deriveCameraEventCategory`), `area`, `subarea`, `origin`, `status`, `triggerCount`, `durationSeconds` (vive em `payload.durationMinutes`), `detectedAt` (= `occurredAt`), `updatedAt`. `Camera` também **não tem** `code` (CAM-###) nem area/subarea (deriva de `trafficElementId` via topologia).

Enums: `category` = enum `CameraEventCategory` (OPERATIONAL/HARDWARE/COMMUNICATION/POWER/ANALYTICS); `severity` = union string plana; `origin`/`status`/`state` = **string plana, enum aberto (MOD BLOCKER 4)**; `triggeredAction.type` = union ALARM/INCIDENT/SERVICE_ORDER.

## Cards (1 PR cada) e mapa

| Card | Endpoints | Existe / falta | Pts |
| --- | --- | --- | --- |
| **2220** | `GET /api/cameras/events` (lista `IPaginatedResponse<IListCameraEventItem>`) | molde `GetCameraEventLogHandler` (mas força `cameraId` e retorna `ICameraEventLogPage`); falta: escopar por `systemId`, join `Camera`, derivar area/subarea/category, gerar `eventCode`, agregar `triggerCount`, `origin`/`status` (sem coluna), envelope `IPaginatedResponse` | 5 |
| **2221** | `/events/stats` (`ICameraEventsStats`: total/critical/warning/info + trend) | nada existe; `COUNT GROUP BY severity` no mesmo `where` da lista + `trendPct` (janela anterior) + `captionParams` (`COUNT DISTINCT cameraId`) | 3 |
| **2222** | `/events/:id`, `/events/:id/timeline` | detalhe base já existe (`GetCameraEventDetailHandler` + `linkedIncident`); falta enriquecimento (join Camera/geo/operatorName) e `triggeredActions[]` (**ALARM não persistido, OS não existe**); timeline de evento não existe (só de incidente) | 5 |
| **2223** | `/events/:id/recurrence?period=` (`ICameraEventRecurrence` 1h/24h/7d/30d) | nada; agregação bucketizada com `total` + `categoryCount` (via `buildCategoryWhere`) | 3 |
| **2224** | `/events/:id/observations`, `POST /events/:id/report` | **condicional** (Incidents/Inventário adiado; botão desabilitado no front); model Prisma novo + CRUD + report multipart | 3 |
| **Total base (2220-2223)** | | | **16** |

Pré-req `SPEC-ms-cameras` está no card SOFTWARE-2212 (Dashboard). Follow-up fora da base: real-time (prepend via WS, `CameraStatusRealtimeService` frame `camera:event:new`), ~2 pts.

## Reuso concreto

- `CameraEventLog` + `GetCameraEventLogHandler` (`events/reading/get-camera-event-log/`): molde de query (a generalizar de por-câmera pra por-`systemId`).
- `deriveCameraEventCategory` / `buildCategoryWhere` (`events/_shared/`): fonte única da categoria derivada (não criar segunda).
- `PrismaListQueryBuilder` (`@attlas/core-common` list-query); molde de uso: `apps/ms-organization/src/api-key/repositories/api-key.repository.ts` (`static LIST_DESCRIPTOR`).
- `CameraTenancyService` (escopo tenant), `ITopologyNodeIdsClient` (area/subarea), `CameraIncidentEvent` (link de incidente no detalhe).
- Tópico Kafka `attlas.cameras.event-logged` (`CameraEventsPublisher`) + `event-ingest`.

## Validações em aberto

- Path (`/api/cameras/events` cross-câmera vs `/api/cameras/:id/events`) a travar no `SPEC-ms-cameras`.
- `origin`/`status`/`state`: string plana hoje, fixar como enum (MOD BLOCKER 4).
- `eventCode` (EVT-YYYY-####) e `cameraCode` (CAM-###) não têm coluna - gerar ou adicionar.
- `triggeredActions[]`: só INCIDENT disponível; ALARM/OS dependem de outros módulos.
- Observações/report (2224) dependem de Incidents/Inventário (adiado).

## Notas por card (1 PR cada)

- [[SOFTWARE-2220 - Eventos câmeras - lista cross-câmera]]
- [[SOFTWARE-2221 - Eventos câmeras - stats]]
- [[SOFTWARE-2222 - Eventos câmeras - detalhe + timeline]]
- [[SOFTWARE-2223 - Eventos câmeras - recorrência]]
- [[SOFTWARE-2224 - Eventos câmeras - observações + reportar (condicional)]]

## Referências

- Front: `apps/web-attlas/src/app/modules/cameras-events/`. Contratos: `libs/contracts/src/lib/camera/`. Backend: `apps/ms-cameras/src/{events,cameras}/`.
- Edital: `obsidian/Docs/Attlas nova definicao modulos.docx.md` (4.6 Câmeras > Eventos/Incidentes, linhas ~723-747). Módulo: `docs/modules/cameras.md` (RF-EVT-01..03).
- Épico ClickUp: SOFTWARE-2047. Cards: 2220-2224. Frente irmã: [[Dashboard de câmeras - backend]].
