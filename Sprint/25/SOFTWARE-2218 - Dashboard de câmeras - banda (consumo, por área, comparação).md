---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2218
epico: SOFTWARE-1899
frente: Dashboard de câmeras - backend
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: code review
pontos: 5
atualizado: 2026-07-24
---

# SOFTWARE-2218 - Dashboard de câmeras - banda (consumo, por área, comparação)

Backend dos indicadores de rede/banda. Contrato pronto. 1 PR.

**Endpoints**: `/bandwidth`, `/bandwidth-by-area`, `/bandwidth-comparison`

**Contratos**:
- `IDashboardBandwidthConsumption { buckets, available[], consumed[], consolidated? }`; consolidated = { totalAvailable, totalConsumed, utilizationPct, byScope[] }.
- `IDashboardBandwidthByArea { totalConsumed, totalAvailable, utilizationPct, slices:[{areaLabel, consumed}] }`.
- `IDashboardBandwidthComparison { buckets, series:[{scopeLabel, available[], consumed[]}] }`.

**Fonte**:
- Consumida (série): `CameraAvailabilityWindow.avgBitrateMbps` (5 min) / `CameraAvailabilityDailyRollup.avgBitrateMbps` (diário).
- Provisionada/available: `CameraStreamProfile.bitrateKbps` (device-truth, `provisioned-bandwidth-collector`).
- Por área: cruzar com `resolveNodeIds` (topologia).

**Reconciliar**: `/dashboard/bandwidth` existente (`BandwidthMonitoringService`) é **snapshot escalar** (`IBandwidthMonitoringPayload`), não série. Reescrever/estender pra série por bucket/escopo.

**Agregação (falta)**: `SUM(avgBitrateMbps) GROUP BY bucket [, escopo/área]`; cruzar consumida x provisionada.

Edital 4.6 (Indicadores de rede). Frente: [[Dashboard de câmeras - backend]]. Épico SOFTWARE-1899.

---
**Spec** `apps/ms-cameras/docs/atomic/UC-038-dashboard-bandwidth-series.md` · **PR** [#862](https://github.com/atmanadmin/attlas-2026/pull/862) (code review, base `develop`) · **ClickUp** Sprint 25 / code review · review interno 24/07: fixes aplicados (1 commit) + atualizada com a develop
