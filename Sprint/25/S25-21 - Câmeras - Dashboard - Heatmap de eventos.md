---
id: S25-21
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2216
epico: SOFTWARE-1899
frente: Dashboard de câmeras - backend
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: Closed
pontos: 5
atualizado: 2026-07-28
aliases:
  - "SOFTWARE-2216 - Dashboard de câmeras - heatmap de eventos"
---

# S25-21 - Câmeras - Dashboard - Heatmap de eventos

Backend do heatmap câmera x tempo. Contrato pronto. 1 PR.

**Endpoint**: `/events-heatmap`

**Contrato**: `IDashboardEventsHeatmap { cameras: string[] (Y, top N), buckets: string[] (X), cells: IDashboardHeatmapCell[] }`; cell = { x (índice bucket), y (índice câmera), total, info, warn, crit }.

**Fonte**: `CameraEventLog` (`occurredAt`, `severity` INFO/WARN/ERROR, `cameraId`).

**Agregação (falta)**: `COUNT GROUP BY cameraId, time_bucket(occurredAt), severity`, top-N câmeras por volume, multi-câmera. Hoje só listagem paginada por câmera.

**Reuso**: `deriveCameraEventCategory` (`events/_shared/`) se filtrar por categoria; bucketização de [[S25-17 - Câmeras - Dashboard - Fundação com resolver de período e escopo|2212]].

Edital 4.6 (mapa de calor de eventos). Frente: [[S25-10 - Câmeras - Dashboard - Backend das agregações do dashboard de câmeras]]. Épico SOFTWARE-1899.

---
**Spec** `apps/ms-cameras/docs/atomic/UC-036-dashboard-events-heatmap.md` · **PR** [#860](https://github.com/atmanadmin/attlas-2026/pull/860) (**MERGEADA** 25/07) · **ClickUp** Closed · review interno 24/07: fixes aplicados (1 commit) + atualizada com a develop
