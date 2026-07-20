---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2222
epico: SOFTWARE-2047
frente: Eventos de câmeras - backend
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: to do
pontos: 5
atualizado: 2026-07-20
spec: UC-041
pr: https://github.com/atmanadmin/attlas-2026/pull/896
---

# SOFTWARE-2222 - Eventos câmeras: timeline do evento + acionamentos (INCIDENT)

Timeline do evento e acionamentos relacionados. O **detalhe base** (`GET /api/cameras/events/:id`) **já foi entregue pelo UC-032** (SOFTWARE-1914, PR #803, lucas) e o front consome sem mock. Falta o que segue mockado/stub. 1 PR.

## Endpoints / campos

- **`GET /api/cameras/events/:id/timeline`** -> `ICameraEventLogEntry[]`: sem backend hoje. O `MAX_TIMELINE_ITEMS` que existe é do detalhe de INCIDENTE (UC-024), não do evento. Construir a timeline do próprio evento (sequência de `CameraEventLog` por `occurredAt`).
- **`triggeredActions`** no detalhe: hoje o `GetCrossCameraEventDetailHandler` devolve `[]` hard-coded. Preencher o link real de **INCIDENT** (via `CameraIncidentEvent`, que já existe). **ALARM** não é persistido e **SERVICE_ORDER** não existe (só `CameraIncident.workOrderId` nullable) -> follow-up bloqueado (Alarmes/Inventário adiados).

## Reuso

`ICameraEventLogRepository`, `CameraIncidentEvent`, `events/_shared/*`.

Edital 4.6 (correlação temporal; integração Alarmes/Inventário). Frente: [[Eventos de câmeras - backend]]. Épico SOFTWARE-2047.
