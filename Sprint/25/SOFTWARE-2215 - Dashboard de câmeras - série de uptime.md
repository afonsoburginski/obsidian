---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2215
epico: SOFTWARE-1899
frente: Dashboard de câmeras - backend
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: code review
pontos: 5
atualizado: 2026-07-24
---

# SOFTWARE-2215 - Dashboard de câmeras - série de uptime

Backend da série temporal de disponibilidade (uptime). Contrato pronto. 1 PR.

**Endpoint**: `/uptime`

**Contrato**: `IDashboardUptimeSeries { buckets: string[], series: IDashboardScopeSeries[] }`; série = { scopeLabel ("Network" sem escopo), points: [{bucket, value | null}] }. 1 série normal, N em comparação.

**Fonte**: `CameraAvailabilityDailyRollup` (dias fechados: onlineWindows/degradedWindows/offlineWindows) + `CameraAvailabilityWindow` (dia parcial, 5 min). % uptime = onlineWindows / total.

**Agregação (falta)**: somar windows de N câmeras por bucket, por rede/escopo. `health-metrics.composer.ts` compõe `dailyAvailability[]`/`uptimePercent` mas **por câmera única** - generalizar e alinhar buckets ao período ([[SOFTWARE-2212 - Fundação do dashboard de câmeras - resolver de período-escopo|2212]]).

**Reuso**: `health-metrics.composer.ts`, `health-range.ts`, `availability.aggregator.ts`.

Edital 4.6 (tendência de disponibilidade). Frente: [[Dashboard de câmeras - backend]]. Épico SOFTWARE-1899.

---
**Spec** `apps/ms-cameras/docs/atomic/UC-035-dashboard-uptime-series.md` · **PR** [#858](https://github.com/atmanadmin/attlas-2026/pull/858) (code review, base `develop`) · **ClickUp** Sprint 25 / code review · review interno 24/07: fixes aplicados (1 commit) + atualizada com a develop
