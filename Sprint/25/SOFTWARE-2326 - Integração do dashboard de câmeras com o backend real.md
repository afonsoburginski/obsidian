---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2326
epico: SOFTWARE-1899
frente: Dashboard de câmeras - backend
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: code review
pontos: a estimar
atualizado: 2026-07-28
---

# SOFTWARE-2326 - Integração do dashboard de câmeras com o backend real

Virada de mock pra HTTP real da tela de Dashboard de câmeras, análoga à SOFTWARE-2289 dos Eventos
(#951). Continuação da PR #1054 (que mergeou por engano só a spec CROSS-040). Branch
`cameras/feat/SOFTWARE-2326-2`.

Com os 7 backends do dashboard (2213-2219, PRs #856-863) todos mergeados em 25/07, a integração saiu
completa numa passada: os **15 métodos** do `CamerasDashboardService` são HTTP puro contra
`/api/dashboard/*` (query de período/escopo via `buildDashboardQuery`; as 3 tabelas de conectividade
somam paginação/busca/ordenação via `buildConnectivityQuery`, novo). Mock apagado
(`cameras-dashboard.mock.ts` + `paginate-mock-rows.util.ts` + `dashboard-mock-latency.constant.ts`).

**Achados no caminho**:
- `getAnalyticCapacity` não tinha consumidor no front e estava mistipado contra o endpoint real
  (`/analytic-capacity` retorna `IDashboardCameraCapabilities`, não `IDashboardDistribution`) -
  removido; o donut de capacidades (UF-013) usa `getCameraCapabilities` apontando pro mesmo endpoint.
- `getMapMarkers` aponta pra `/map` (não `/map-markers` como o CROSS-040 previa); as tabelas apontam
  pra `/connectivity/{intermittent,latency,degradation}` (controller `dashboard/connectivity`).
- Faltava a rota `/api/dashboard/kpis` no `docker/kong.yml` (única sem cobertura - o Kong faz
  prefix-match, então `connectivity`/`bandwidth` já cobriam o resto) - adicionada nesta PR.

**Specs**: [[CROSS-040]] (as-built) + `UF-002-dashboard-service-and-contracts.md` atualizadas. Specs
dos serviços/componentes: `HttpTestingController` no service spec, stub do serviço no spec das
connectivity-tabs (dependia do delay do mock).

**Pendência**: e2e visual real na tela - bloqueado pelo Kong do ambiente `dev.v2` estar defasado da
develop (só a família `bandwidth` respondia em 28/07). Mesma pendência do card de QA
[[SOFTWARE-2318 - Dashboard de câmeras - validação E2E de dados|SOFTWARE-2318]] ("clique-a-clique no
web-attlas"), que já validou os 13 endpoints via API+banco em 27/07.

Frente: [[Dashboard de câmeras - backend]]. Épico SOFTWARE-1899.

---
**Spec** `docs/specs/cross-service/CROSS-040-cameras-dashboard-fullstack-integration.md` · **PR**
[#1058](https://github.com/atmanadmin/attlas-2026/pull/1058) (code review, base `develop`) ·
**ClickUp** Sprint 25 / code review
