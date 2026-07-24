---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2221
epico: SOFTWARE-2047
frente: Eventos de câmeras - backend
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: MERGEADA (22/07) - PR #895, base develop
pontos: 3
atualizado: 2026-07-22
spec: UC-040
pr: https://github.com/atmanadmin/attlas-2026/pull/895
---

# SOFTWARE-2221 - Eventos câmeras: stats (KPIs + trend)

Backend dos 4 cards de KPI da tela de Eventos. Contrato pronto. 1 PR.

**Endpoint**: `GET /api/cameras/events/stats`

**Contrato** (`ICameraEventsStats`): { total, critical, warning, info }, cada `ICameraEventsStatTile { count, trendPct, captionKey, captionParams? }`. critical/warning/info = ERROR/WARN/INFO.

**Fonte**: `CameraEventLog.severity`.

**Falta**: `COUNT GROUP BY severity` + total, no **mesmo `where` da lista** ([[SOFTWARE-2220 - Eventos câmeras - lista cross-câmera|2220]]); `trendPct` = janela atual vs anterior; `captionParams` (ex. nº de câmeras afetadas = `COUNT(DISTINCT cameraId)`).

**Reuso**: mesmo `where`/`buildCategoryWhere` da lista; escopo por `systemId`.

Edital 4.6 (Eventos). Frente: [[Eventos de câmeras - backend]]. Épico SOFTWARE-2047.

## Review (21/7)

Hadson pediu mudanças (3 bloqueantes), igor e bot no mesmo sentido. Já resolvido/pushado: DTO whitelista `page`/`pageSize` (não estoura 400 no cutover do mock), `from`/`to` parseados como UTC (sem drift de timezone), shape de filtros derivado de `ListCameraEventsFilters` via Omit + renomeado pro padrão `Get*` (B4/V3), spec pra in-review + MOD-007 com as rotas, testes de range (só-from, só-to, from>=to, UTC offset-less), e §6.1 sincronizada com o handler sobre o where inline temporário até o builder da 2220. Threads de cast/regex/teste resolvidas; buildWhere/parseCsv/const de severity deixadas abertas de propósito (follow-up no rebase pós-2220). Respondi o Hadson e pedi re-review.
