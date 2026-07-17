---
tags:
  - attlas
  - sem-prazo
  - card
card: SOFTWARE-2221
epico: SOFTWARE-2047
frente: Eventos de câmeras - backend
sprint: sem prazo (ClickUp Sprint 25 / backlog)
status: backlog
pontos: 3
atualizado: 2026-07-17
---

# SOFTWARE-2221 - Eventos câmeras: stats (KPIs + trend)

Backend dos 4 cards de KPI da tela de Eventos. Contrato pronto. 1 PR.

**Endpoint**: `GET /api/cameras/events/stats`

**Contrato** (`ICameraEventsStats`): { total, critical, warning, info }, cada `ICameraEventsStatTile { count, trendPct, captionKey, captionParams? }`. critical/warning/info = ERROR/WARN/INFO.

**Fonte**: `CameraEventLog.severity`.

**Falta**: `COUNT GROUP BY severity` + total, no **mesmo `where` da lista** ([[SOFTWARE-2220 - Eventos câmeras - lista cross-câmera|2220]]); `trendPct` = janela atual vs anterior; `captionParams` (ex. nº de câmeras afetadas = `COUNT(DISTINCT cameraId)`).

**Reuso**: mesmo `where`/`buildCategoryWhere` da lista; escopo por `systemId`.

Edital 4.6 (Eventos). Frente: [[Eventos de câmeras - backend]]. Épico SOFTWARE-2047.
