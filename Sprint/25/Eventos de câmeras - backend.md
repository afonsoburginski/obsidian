---
tags:
  - attlas
  - sprint-25
  - card
cards: SOFTWARE-2220, 2221, 2222, 2223, 2224
epico: SOFTWARE-2047 (Eventos - Eventos de todas as câmeras)
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: Sprint 25 - lista+detalhe base entregues pelo UC-032 (#803, lucas). Em 22/07: 2220 (#899) e 2224 (#903) MERGEADOS; 2221 (#895)/2222 (#896)/2223 (#897) com conflitos resolvidos + fix de CI (resolveNodeTopology), 2221 verde e 2222/2223 reexecutando. integração front aberta (SOFTWARE-2289, PR #951) - depende de 2222/2223
atualizado: 2026-07-22
---

# Eventos de câmeras - backend

Backend da tela de **Eventos de câmeras** (`/cameras/events` + detalhe `/cameras/events/:id`). O frontend já existe (Lucas, épico SOFTWARE-2047). A **lista e o detalhe cross-câmera já foram entregues** pelo UC-032 (SOFTWARE-1914, PR #803) e o front consome sem mock. Falta o `ms-cameras` expor `stats / timeline / recurrence / observations-report` (ainda mockados) e preencher os **campos placeholder e filtros ignorados** da lista/detalhe. Backend-only, 1 card = 1 PR.

## Cuidado: "eventos" tem três camadas

1. **Eventos cross-câmera** (esta frente). Feed agregado de **todas as câmeras** (lista, stats, detalhe, timeline, recorrência). Feature module `cameras-events` (separado do dashboard em 2026-07-07, SOFTWARE-2051).
2. **Eventos por-câmera** (já existe). `GET cameras/:id/events` e `:id/events/:eventId` já respondem no `ms-cameras`. Falta a camada cross-câmera por cima.
3. **Módulo Alarmes** (`ms-alarms`, esqueleto). Sistema transversal (`/api/alarms/*`). Críticos de câmera são *encaminhados* pra lá (edital 4.6), mas esta tela **não consome** Alarmes.

## Estado atual e achado da investigação (2026-07-15)

- Front: `apps/web-attlas/src/app/modules/cameras-events/`; `camera-events.service.ts` com `useMock = true`, ramos `http.get/post` prontos.
- Contratos: `libs/contracts/src/lib/camera/` (`i-list-camera-events-*`, `-stats`, `-recurrence`, `-observation`, `-triggered-action`, `-detail`, `-log-entry`). Prontos.
- Backend hoje: **lista + detalhe cross-câmera JÁ existem** (`ListCameraEventsHandler`, `GetCrossCameraEventDetailHandler`, `events/reading/`) via UC-032 (SOFTWARE-1914, #803, lucas, mergeada); mais os por-câmera (`GetCameraEventLogHandler`, `GetCameraEventDetailHandler`). **Sem backend**: stats, timeline de evento, recurrence, observations/report. **Placeholder na lista/detalhe**: area/subarea (string vazia), status (`'OPEN'`), triggerCount (`1`); os filtros area/subarea/origin/state/status são aceitos mas **ignorados**.

**O model `CameraEventLog` é mais magro que o contrato de lista.** Colunas que existem: `id, cameraId, occurredAt, eventType, subType, severity (String INFO/WARN/ERROR), summary, translationKey, payload Json, correlationId, operatorId, createdAt`. Colunas que o contrato pede e **NÃO existem**: `eventCode`, `category` (derivada read-time via `deriveCameraEventCategory`), `area`, `subarea`, `origin`, `status`, `triggerCount`, `durationSeconds` (vive em `payload.durationMinutes`), `detectedAt` (= `occurredAt`), `updatedAt`. `Camera` também **não tem** `code` (CAM-###) nem area/subarea (deriva de `trafficElementId` via topologia).

Enums: `category` = enum `CameraEventCategory` (OPERATIONAL/HARDWARE/COMMUNICATION/POWER/ANALYTICS); `severity` = union string plana; `origin`/`status`/`state` = **string plana, enum aberto (MOD BLOCKER 4)**; `triggeredAction.type` = union ALARM/INCIDENT/SERVICE_ORDER.

## Cards (1 PR cada) e mapa

Base **lista + detalhe** entregue pelo UC-032 (SOFTWARE-1914, #803, lucas). Estes cards são o que sobra:

| Card | Escopo | Existe / falta | Pts |
| --- | --- | --- | --- |
| **2220** (re-escopado) | campos reais + filtros da lista/detalhe | area/subarea via topologia, honrar filtros ignorados (area/subarea/origin/state/status), status/triggerCount reais | 5 |
| **2221** | `/events/stats` (`ICameraEventsStats`: total/critical/warning/info + trend) | nada existe; `COUNT GROUP BY severity` no mesmo `where` da lista + `trendPct` (janela anterior) | 3 |
| **2222** (re-escopado) | `/events/:id/timeline` + `triggeredActions` INCIDENT | timeline do evento não existe (só de incidente); `triggeredActions` devolve `[]` (só INCIDENT viável; ALARM/OS bloqueados) | 5 |
| **2223** | `/events/:id/recurrence?period=` (1h/24h/7d/30d) | nada; agregação bucketizada `total` + `categoryCount` (via `buildCategoryWhere`) | 3 |
| **2224** | `/events/:id/observations` (GET/POST), `POST /events/:id/report` | **feito (PR #903, UC-044)**: model `CameraEventObservation` novo + migration; report cria `CameraIncident` DETECTED. Evidências multipart e ALARM/OS = follow-up | 3 |

Pré-req `SPEC-ms-cameras`: bootado pelo card SOFTWARE-2212. Follow-up fora da base: real-time (prepend via WS, `camera:event:new`), ~2 pts.

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

- [[SOFTWARE-2220 - Eventos câmeras - campos reais + filtros]]
- [[SOFTWARE-2221 - Eventos câmeras - stats]]
- [[SOFTWARE-2222 - Eventos câmeras - timeline + acionamentos]]
- [[SOFTWARE-2223 - Eventos câmeras - recorrência]]
- [[SOFTWARE-2224 - Eventos câmeras - observações + reportar (condicional)]]

## Referências

- Front: `apps/web-attlas/src/app/modules/cameras-events/`. Contratos: `libs/contracts/src/lib/camera/`. Backend: `apps/ms-cameras/src/{events,cameras}/`.
- Edital: `obsidian/Docs/Attlas nova definicao modulos.docx.md` (4.6 Câmeras > Eventos/Incidentes, linhas ~723-747). Módulo: `docs/modules/cameras.md` (RF-EVT-01..03).
- Épico ClickUp: SOFTWARE-2047. Cards: 2220-2224. Frente irmã: [[Dashboard de câmeras - backend]].
