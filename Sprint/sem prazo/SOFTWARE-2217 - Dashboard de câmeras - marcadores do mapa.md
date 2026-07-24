---
tags:
  - attlas
  - sem-prazo
  - card
card: SOFTWARE-2217
epico: SOFTWARE-1899
frente: Dashboard de câmeras - backend
sprint: sem prazo (ClickUp Sprint 25 / backlog)
status: code review
pontos: 3
atualizado: 2026-07-24
---

# SOFTWARE-2217 - Dashboard de câmeras - marcadores do mapa

Backend dos marcadores geográficos. Contrato pronto. 1 PR.

**Endpoint**: `/map`

**Contrato**: `IDashboardMapResponse { markers: IDashboardCameraMarker[], cameraCount, eventCount }`; marker = { cameraId, cameraName, lat, lng, severity (maior entre eventos), events: [{code, severity, description, type, at}] }.

**Fonte**: `Camera.latitude`/`longitude` + `intersection` + `CameraOperationalSnapshot.connectionStatus`/`isOnline` (cor) + `CameraEventLog` (eventos recentes). `IListCameraItem` já carrega lat/lng + status.

**Agregação (falta)**: endpoint dedicado "todas as câmeras do escopo com geo + status + eventos recentes" (hoje paginado via `GET /cameras`).

**Cuidado**: `cameraName`/`description`/`code` são backend-sourced e o front escapa no popup - não injetar HTML cru.

Edital 4.6 (representação geoposicionada). Frente: [[Dashboard de câmeras - backend]]. Épico SOFTWARE-1899.

---
**Spec** `apps/ms-cameras/docs/atomic/UC-037-dashboard-map-markers.md` · **PR** [#861](https://github.com/atmanadmin/attlas-2026/pull/861) (code review, base `develop`) · **ClickUp** Sprint 25 / code review · review interno 24/07: fixes aplicados (1 commit) + atualizada com a develop
