---
tags:
  - attlas
  - sem-prazo
  - card
card: SOFTWARE-2220
epico: SOFTWARE-2047
frente: Eventos de câmeras - backend
sprint: sem prazo (ClickUp Sprint 25 / backlog)
status: backlog
pontos: 5
atualizado: 2026-07-17
---

# SOFTWARE-2220 - Eventos câmeras: lista cross-câmera (list-query)

Backend da listagem agregada de eventos de todas as câmeras (`/cameras/events`). Front mockado (`useMock`), contrato pronto. 1 PR.

**Endpoint**: `GET /api/cameras/events` -> `IListCameraEventsResponse` = `IPaginatedResponse<IListCameraEventItem>`.

**Item** (`IListCameraEventItem`): id, eventCode, cameraId, cameraCode, cameraName, descriptionKey/descriptionParams, category (`CameraEventCategory`: OPERATIONAL/HARDWARE/COMMUNICATION/POWER/ANALYTICS), severity ('INFO'|'WARN'|'ERROR'), area, subarea, origin, status, triggerCount, durationSeconds?, detectedAt, updatedAt.

**Query** (`IListCameraEventsQueryParams`): page, pageSize, search, sortBy, sortOrder; filtros severity[], category[], area[], subarea[], origin[], state[], status[], period ('7d'|'30d'|'90d'|'range'), from/to.

**Fonte**: `CameraEventLog`. Molde: `GetCameraEventLogHandler` (`events/reading/get-camera-event-log/`) já faz findMany+count+filtro categoria, mas **força `where.cameraId`** e retorna `ICameraEventLogPage`.

**Falta**: escopar por `systemId` (`CameraTenancyService`); join `Camera` (cameraName/Code/Address); area/subarea via topologia. **Colunas inexistentes**: `eventCode` (gerar EVT-YYYY-####), `category` (derivar via `deriveCameraEventCategory`), `origin`/`status`/`state` (sem coluna, enum aberto - MOD BLOCKER 4), `triggerCount` (agregar repetidos), `durationSeconds` (= `payload.durationMinutes*60`); `descriptionKey` = `translationKey`; envelope `IPaginatedResponse`.

**Reuso**: `PrismaListQueryBuilder` + molde `apps/ms-organization/src/api-key/repositories/api-key.repository.ts` (`static LIST_DESCRIPTOR`); `deriveCameraEventCategory`/`buildCategoryWhere`.

Edital 4.6 (Eventos: classificação e filtragem). Frente: [[Eventos de câmeras - backend]]. Épico SOFTWARE-2047.
