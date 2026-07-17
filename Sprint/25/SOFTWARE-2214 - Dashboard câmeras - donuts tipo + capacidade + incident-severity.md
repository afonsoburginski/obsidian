---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2214
epico: SOFTWARE-1899
frente: Dashboard de câmeras - backend
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: to do
pontos: 3
atualizado: 2026-07-17
---

# SOFTWARE-2214 - Dashboard câmeras: donuts (tipo + capacidade analítica + incident-severity)

Backend dos donuts operacionais/incidentes. Contrato pronto. 1 PR.

**Endpoints**: `/type-distribution`, `/analytic-capacity`, `/incident-severity`

**Contratos**:
- Tipo e incident-severity: `IDashboardDistribution { total, slices:[{key,value}], byScope? }`. Tipo -> FIXED/PTZ; incident-severity -> CRITICAL/HIGH/MEDIUM/LOW.
- Capacidade: `IDashboardCameraCapabilities { dai, atspm }`, cada `IDashboardCapabilityStat { activePct, active, inactive, total }`.

**Fonte + agregação (falta o GROUP BY)**:
- Tipo: `Camera.physicalCameraKind` (PTZ=0, FIXED=1) + `analyticsCapabilities.ptz`. `COUNT GROUP BY physicalCameraKind`.
- Capacidade: `Camera.analyticsCapabilities Json` (`buildJsonCapabilityWhere`). **Mismatch**: Json tem `dai`/`virtualLoop`/`ptz`, contrato pede `dai`/`atspm` - mapear.
- Incident-severity: `CameraIncident.priority` (`normalizeIncidentSeverity` em `events/incidents/incident-mapping.ts`). `COUNT GROUP BY priority`.

Edital 4.6 (operacionais + incidentes). Frente: [[Dashboard de câmeras - backend]]. Épico SOFTWARE-1899.

---
**Spec** `apps/ms-cameras/docs/atomic/UC-034-dashboard-distribution-donuts.md` · **PR** [#857](https://github.com/atmanadmin/attlas-2026/pull/857) (draft, base `develop`) · **ClickUp** Sprint 25 / to do
