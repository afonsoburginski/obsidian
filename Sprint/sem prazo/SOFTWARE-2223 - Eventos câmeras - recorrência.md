---
tags:
  - attlas
  - sem-prazo
  - card
card: SOFTWARE-2223
epico: SOFTWARE-2047
frente: Eventos de câmeras - backend
sprint: sem prazo (ClickUp Sprint 25 / backlog)
status: backlog
pontos: 3
atualizado: 2026-07-17
---

# SOFTWARE-2223 - Eventos câmeras: recorrência

Backend do gráfico de recorrência do evento. Contrato pronto. 1 PR.

**Endpoint**: `GET /api/cameras/events/:id/recurrence?period=`

**Contrato** (`ICameraEventRecurrence`): { period ('1h'|'24h'|'7d'|'30d'), buckets: [{bucketStart, total, categoryCount}] }.

**Fonte**: `CameraEventLog` da câmera-fonte.

**Falta**: agregação bucketizada por período com `total` (todos) + `categoryCount` (mesma categoria, via `buildCategoryWhere`). Molde de bucket = `i-dashboard-events-heatmap` / resolver de [[SOFTWARE-2212 - Dashboard câmeras - SPEC ms-cameras + resolver período-escopo|2212]].

Edital 4.6 (histórico e recorrência por câmera). Frente: [[Eventos de câmeras - backend]]. Épico SOFTWARE-2047.
