---
tags:
  - attlas
  - sprint-25
  - moc
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: planejada - backend do Dashboard de câmeras (2213-2219, 7 cards, to do); specs escritas (UC-033..039) e 7 draft PRs abertos (#856-863) base develop; implementação na semana
atualizado: 2026-07-17
---

# Attlas - Sprint 25

Foco: **backend do Dashboard de câmeras** (`/api/cameras/dashboard/*`). O frontend já roda 100% em mock (épico [Front] SOFTWARE-1899) e os ~35 contratos estão prontos em `@attlas/contracts`; falta o `ms-cameras` responder as agregações. Backend-only, 1 card = 1 PR, tudo sobre a fundação de período/escopo do 2212 (MOD-013).

Dependência: o **2212** (fundação, PR #822, code review na Sprint 24) precisa mergear antes - os 7 widgets abaixo dependem do resolver de período/escopo dele.

## Cards (1 PR cada) - specs escritas + draft PRs abertos

Cada card já tem a atômica `UC-*` escrita e uma PR em draft na base `develop`, assignee afonsoburginski. Falta a implementação.

| Card | Widget | Endpoints | Spec | PR (draft) | Pts |
| --- | --- | --- | --- | --- | --- |
| [[SOFTWARE-2213 - Dashboard câmeras - KPIs + gauge + distribuição conectividade\|2213]] | KPIs + gauge + distribuição de conectividade | `/kpis`, `/connectivity-gauge`, `/connectivity-distribution` | UC-033 | [#856](https://github.com/atmanadmin/attlas-2026/pull/856) | 5 |
| [[SOFTWARE-2214 - Dashboard câmeras - donuts tipo + capacidade + incident-severity\|2214]] | donuts (tipo, capacidade analítica, incidentes) | `/type-distribution`, `/analytic-capacity`, `/incident-severity` | UC-034 | [#857](https://github.com/atmanadmin/attlas-2026/pull/857) | 3 |
| [[SOFTWARE-2215 - Dashboard câmeras - série de uptime\|2215]] | série de uptime | `/uptime` | UC-035 | [#858](https://github.com/atmanadmin/attlas-2026/pull/858) | 5 |
| [[SOFTWARE-2216 - Dashboard câmeras - heatmap de eventos\|2216]] | heatmap de eventos | `/events-heatmap` | UC-036 | [#860](https://github.com/atmanadmin/attlas-2026/pull/860) | 5 |
| [[SOFTWARE-2217 - Dashboard câmeras - marcadores do mapa\|2217]] | marcadores do mapa | `/map` | UC-037 | [#861](https://github.com/atmanadmin/attlas-2026/pull/861) | 3 |
| [[SOFTWARE-2218 - Dashboard câmeras - banda\|2218]] | banda (consumo, por área, comparação) | `/bandwidth`, `/bandwidth-by-area`, `/bandwidth-comparison` | UC-038 | [#862](https://github.com/atmanadmin/attlas-2026/pull/862) | 5 |
| [[SOFTWARE-2219 - Dashboard câmeras - tabelas de conectividade\|2219]] | tabelas de conectividade (intermitentes, latência, degradação) | `/connectivity/{intermittent,latency,degradation}` | UC-039 | [#863](https://github.com/atmanadmin/attlas-2026/pull/863) | 5 |
| **Total** | | | | | **31** |

Frente e mapa dado-por-métrica: [[Dashboard de câmeras - backend]].

## Backlog (sem prazo)

Eventos de câmeras (2220-2224) + SOFTWARE-2200 + SOFTWARE-2201 estão na pasta `Sprint/sem prazo` (ClickUp Sprint 25 / backlog) - não entram nesta semana.

## Processo (SDD + gate)

- 1 atômica = 1 PR; gate completo do serviço (`nx test/lint/build`), não só affected; 0 erros de lint.
- PR base `develop`. Sem `HttpException`/`Error` crus. CI antes do deploy.
- Specs em `apps/ms-cameras/docs/atomic/UC-033..UC-039`; fundação compartilhada MOD-013 (2212).
