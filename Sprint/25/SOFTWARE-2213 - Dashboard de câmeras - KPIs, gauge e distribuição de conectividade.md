---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2213
epico: SOFTWARE-1899
frente: Dashboard de câmeras - backend
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: code review
pontos: 5
atualizado: 2026-07-24
---

# SOFTWARE-2213 - Dashboard de câmeras - KPIs, gauge e distribuição de conectividade

Backend dos KPIs e conectividade da tela de Dashboard de câmeras. Front mockado, contrato pronto. 1 PR.

**Endpoints**: `GET /api/cameras/dashboard/kpis`, `/connectivity-gauge`, `/connectivity-distribution`

**Contratos**:
- `IDashboardKpis` = { total, online, offline, intermittent, streamDegradation }, cada `IDashboardKpiValue { value, trendPct? }` (trendPct ausente = sem badge, ex. total).
- `IDashboardConnectivityGauge` = { onlinePct, online, intermittent, offline, targetPct } (0-100).
- `IDashboardDistribution` = { total, slices:[{key,value}], byScope? }, keys Online/Intermitente/Offline.

**Fonte de dado**:
- Estado agora: `CameraOperationalSnapshot` (`isOnline`, `connectionStatus` STABLE/PARTIALLY_UNSTABLE/UNSTABLE/OFFLINE). `ConnectivityHealthEvaluator` mapeia STABLE->ONLINE, PARTIALLY/UNSTABLE->DEGRADED.
- Trend: `CameraAvailabilityDailyRollup` do período anterior.
- **Intermitente NÃO é estado persistido**: derivar de flapping (`CameraHeartbeatHistory`) ou janelas DEGRADED.

**Agregação (falta)**: `COUNT(*) GROUP BY connectionStatus` por escopo/tenant (hoje só `findAll()` cru). `targetPct` de config.

**Reuso**: `CameraHealthSnapshotRepository`, `ConnectivityHealthEvaluator`, `computeUptimeByCamera` (`cameras.repository.ts:124`). Escopo/período: [[SOFTWARE-2212 - Fundação do dashboard de câmeras - resolver de período-escopo|SOFTWARE-2212]].

Edital 4.6 (Indicadores de conectividade). Frente: [[Dashboard de câmeras - backend]]. Épico SOFTWARE-1899.

---
**Spec** `apps/ms-cameras/docs/atomic/UC-033-dashboard-kpis-connectivity.md` · **PR** [#856](https://github.com/atmanadmin/attlas-2026/pull/856) (code review, base `develop`) · **ClickUp** Sprint 25 / code review · review interno 24/07: migration do índice `Camera(systemId, lifecycleState)` (infra network-wide compartilhada do lote de dashboard, ancorada aqui por ser a 1ª PR) + atualizada com a develop
