---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2220
epico: SOFTWARE-2047
frente: Eventos de câmeras - backend
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: to do
pontos: 5
atualizado: 2026-07-20
spec: UC-043
pr: https://github.com/atmanadmin/attlas-2026/pull/899
---

# SOFTWARE-2220 - Eventos câmeras: campos reais + filtros da lista/detalhe

Completar a lista/detalhe de eventos cross-câmera. O endpoint base (`GET /api/cameras/events` e `/events/:id`) **já foi entregue pelo UC-032** (SOFTWARE-1914, PR #803, lucas) e o front consome sem mock. Este card fecha os campos que voltam **placeholder** e os filtros que o handler **ignora**. 1 PR.

## Gaps (handlers `ListCameraEventsHandler` + `GetCrossCameraEventDetailHandler`, `events/reading/`)

- **area / subarea**: hoje string vazia. Resolver o nome via topologia a partir de `Camera.trafficElementId` (`ITopologyNodeIdsClient` / traffic-model). O client hoje só resolve node IDs (UC-025); falta a resolução de NOME. Estava marcado como SOFTWARE-2016 no backend; puxar pra cá.
- **Filtros ignorados**: o DTO aceita `area/subarea/origin/state/status` mas o handler os ignora (forward-compat, BR-CAM-EVT-032-05). Passar a aplicar no `where`.
- **status / triggerCount**: placeholders fixos (`'OPEN'`, `1`) sem coluna. Decidir derivar ou adicionar coluna.
- **origin**: já derivado (`deriveCameraEventOrigin`); confirmar que casa com o filtro.

## Fora de escopo

- `eventCode`: já derivado (`deriveCameraEventCode`), ok.
- `triggeredActions`: card [[SOFTWARE-2222 - Eventos câmeras - timeline + acionamentos|2222]] (INCIDENT) / ALARM e OS bloqueados.

## Reuso

`deriveCameraEventCategory` / `deriveCameraEventOrigin` (`events/_shared/`), `ITopologyNodeIdsClient`.

Edital 4.6 (Eventos: classificação e filtragem). Frente: [[Eventos de câmeras - backend]]. Épico SOFTWARE-2047.
