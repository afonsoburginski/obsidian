---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2223
epico: SOFTWARE-2047
frente: Eventos de câmeras - backend
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: MERGEADA (22/07) - PR #897, base develop
pontos: 3
atualizado: 2026-07-22
spec: UC-042
pr: https://github.com/atmanadmin/attlas-2026/pull/897
---

# SOFTWARE-2223 - Eventos câmeras: recorrência

Backend do gráfico de recorrência do evento. Contrato pronto. 1 PR.

**Endpoint**: `GET /api/cameras/events/:id/recurrence?period=`

**Contrato** (`ICameraEventRecurrence`): { period ('1h'|'24h'|'7d'|'30d'), buckets: [{bucketStart, total, categoryCount}] }.

**Fonte**: `CameraEventLog` da câmera-fonte.

**Falta**: agregação bucketizada por período com `total` (todos) + `categoryCount` (mesma categoria, via `buildCategoryWhere`). Molde de bucket = `i-dashboard-events-heatmap` / resolver de [[SOFTWARE-2212 - Fundação do dashboard de câmeras - resolver de período-escopo|2212]].

Edital 4.6 (histórico e recorrência por câmera). Frente: [[Eventos de câmeras - backend]]. Épico SOFTWARE-2047.

## Review (21/7)

felipeaquino aprovou; bot Claude e igor pediram ajustes (nada impeditivo). Resolvido e pushado: `period` opcional + `@IsIn` derivado dos PRESETS (V3/HC), ramo morto do ternário de categoria removido (V7), anotei no handler o porquê de agregar in-app em vez de date_trunc (V9 - mover pra SQL duplicaria a derivação de categoria), SPEC-IDs fora dos comentários (comment-guide), e a spec teve o DoF de frontend movido pra task UF-* própria + status in-review. 3 threads respondidas e resolvidas.
