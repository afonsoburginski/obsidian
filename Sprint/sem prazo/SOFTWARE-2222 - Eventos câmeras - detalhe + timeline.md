---
tags:
  - attlas
  - sem-prazo
  - card
card: SOFTWARE-2222
epico: SOFTWARE-2047
frente: Eventos de câmeras - backend
sprint: sem prazo (ClickUp Sprint 25 / backlog)
status: backlog
pontos: 5
atualizado: 2026-07-17
---

# SOFTWARE-2222 - Eventos câmeras: detalhe + timeline

Backend do detalhe de evento (drawer/página) + timeline. Detalhe já existe por-câmera. 1 PR.

**Endpoints**: `GET /api/cameras/events/:id`, `GET /api/cameras/events/:id/timeline`

**Contrato detalhe** (`ICameraEventDetail` extends `ICameraEventLogEntry`): base + occurredAt/subType/summary/correlationId/`linkedIncident{id,status}` (@deprecated) + opcionais: eventCode, cameraCode/Name/Address, cameraLatitude/Longitude, connectionStatus, area/subarea, origin/status, durationSeconds, operatorName, `triggeredActions[]` ({type ALARM/INCIDENT/SERVICE_ORDER, code}).

**Existe**: `GetCameraEventDetailHandler` já entrega base + `linkedIncident` (via `record.incidentLinks[0].incident`).

**Falta**:
- Enriquecimento: join `Camera` (code/name/address/geo/connectionStatus), area/subarea via topologia, operatorName via ms-organization, durationSeconds.
- `triggeredActions[]` **NÃO é populado hoje**: INCIDENT vem do `CameraIncidentEvent`; **ALARM não é persistido** e **SERVICE_ORDER não existe** (só `CameraIncident.workOrderId` nullable). Servir cross-câmera (por eventId).
- **Timeline**: NÃO existe endpoint de timeline de evento (só de incidente, `GetCameraIncidentHandler`); matéria-prima = sequência de `CameraEventLog` por `occurredAt`.

Edital 4.6 (correlação temporal; integração Alarmes/Inventário). Frente: [[Eventos de câmeras - backend]]. Épico SOFTWARE-2047.
