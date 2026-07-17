---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2216
epico: SOFTWARE-1899
frente: Dashboard de câmeras - backend
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: to do
pontos: 5
atualizado: 2026-07-17
---

# SOFTWARE-2216 - Dashboard câmeras: heatmap de eventos

Backend do heatmap câmera x tempo. Contrato pronto. 1 PR.

**Endpoint**: `/events-heatmap`

**Contrato**: `IDashboardEventsHeatmap { cameras: string[] (Y, top N), buckets: string[] (X), cells: IDashboardHeatmapCell[] }`; cell = { x (índice bucket), y (índice câmera), total, info, warn, crit }.

**Fonte**: `CameraEventLog` (`occurredAt`, `severity` INFO/WARN/ERROR, `cameraId`).

**Agregação (falta)**: `COUNT GROUP BY cameraId, time_bucket(occurredAt), severity`, top-N câmeras por volume, multi-câmera. Hoje só listagem paginada por câmera.

**Reuso**: `deriveCameraEventCategory` (`events/_shared/`) se filtrar por categoria; bucketização de [[SOFTWARE-2212 - Dashboard câmeras - SPEC ms-cameras + resolver período-escopo|2212]].

Edital 4.6 (mapa de calor de eventos). Frente: [[Dashboard de câmeras - backend]]. Épico SOFTWARE-1899.

---
**Spec** `apps/ms-cameras/docs/atomic/UC-036-dashboard-events-heatmap.md` · **PR** [#860](https://github.com/atmanadmin/attlas-2026/pull/860) (draft, base `develop`) · **ClickUp** Sprint 25 / to do
