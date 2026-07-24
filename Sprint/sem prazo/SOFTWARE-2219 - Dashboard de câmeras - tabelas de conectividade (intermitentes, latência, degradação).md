---
tags:
  - attlas
  - sem-prazo
  - card
card: SOFTWARE-2219
epico: SOFTWARE-1899
frente: Dashboard de câmeras - backend
sprint: sem prazo (ClickUp Sprint 25 / backlog)
status: code review
pontos: 5
atualizado: 2026-07-24
---

# SOFTWARE-2219 - Dashboard de câmeras - tabelas de conectividade (intermitentes, latência, degradação)

Backend das 3 tabelas da seção de conectividade. Contrato pronto. 1 PR.

**Endpoints**: `/connectivity/intermittent`, `/connectivity/latency`, `/connectivity/degradation`

**Wrapper**: `IPaginatedResponse<Row>` + `IDashboardConnectivityQueryParams` (= `IPaginatedQueryParams<IDashboardConnectivityFilters>`, filtros `q`, `sortBy`, `sortDir`); período/escopo no `IDashboardQueryParams` global.

**Rows**:
- `IDashboardIntermittentRow { cameraId, cameraName, address, area, totalDrops, dailyAvg, worstDay:{count,date}, dailySeries[] }`.
- `IDashboardLatencyRow { ..., severity, avgMs, minMs, maxMs, recentSeries[] }`.
- `IDashboardDegradationRow { ..., health, resolution/fps/bitrate: IDashboardQualityMetric{label,pct} }`.

**Fonte + gap por aba**:
- **Intermittent**: sem coluna/flag - derivar de flapping (`CameraHeartbeatHistory`) ou `degradedWindows`; `worstDay`/`dailySeries` do rollup diário. Agregação nova.
- **Latency**: `CameraAvailabilityWindow.avgLatencyMs`/`rollup.avgLatencyMs`/`snapshot.latencyMs`; ranking top-N por escopo.
- **Degradation**: `CameraAvailabilityDailyRollup.degradedWindows` + `CameraStreamProfile` (resolution/fps/bitrate vs máximos pro `pct`).

**Reuso**: `PrismaListQueryBuilder` (list-query). Molde: `apps/ms-organization/src/api-key/repositories/api-key.repository.ts` (`static LIST_DESCRIPTOR`). NÃO o ms-audit (repo custom).

Edital 4.6 (intermitentes / latência / degradação). Frente: [[Dashboard de câmeras - backend]]. Épico SOFTWARE-1899.

---
**Spec** `apps/ms-cameras/docs/atomic/UC-039-dashboard-connectivity-tables.md` · **PR** [#863](https://github.com/atmanadmin/attlas-2026/pull/863) (code review, base `develop`) · **ClickUp** Sprint 25 / code review · review interno 24/07: fixes aplicados (1 commit) + atualizada com a develop
