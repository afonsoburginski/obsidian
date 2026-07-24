---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2222
epico: SOFTWARE-2047
frente: Eventos de câmeras - backend
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: MERGEADA (22/07) - PR #896, base develop
pontos: 5
atualizado: 2026-07-22
spec: UC-041
pr: https://github.com/atmanadmin/attlas-2026/pull/896
---

> [!success] Entrega (2026-07-20) — PR #896 ready
> Backend implementado. `GET /api/cameras/events/:id/timeline` (`GetCameraEventTimelineQuery/Handler`, cadeia por `correlationId`, escopo do tenant, `occurredAt` asc; âncora sem correlação -> só ela; 404 cross-tenant) + rota antes de `@Get(':id')`. `triggeredActions` do detalhe cross-camera passa a trazer os INCIDENT via `CameraIncidentEvent` (helper puro `build-triggered-actions` + `derive-camera-incident-code` -> `INC-YYYY-XXXX`); ALARM/SERVICE_ORDER seguem fora. Mapeamento `ICameraEventLogEntry` extraído p/ `_shared/map-camera-event-log-entry` e reusado (DRY, BR-041-03).
> Gate: lint 0 erros, tsc app+spec limpo, suíte unitária ms-cameras verde (114 suites / 935 testes). `nx build` webpack quebra só em peers opcionais não instalados (mqtt/nats/typeorm...) — idêntico na develop, alheio ao diff. Só backend; desligar mocks no front é follow-up. Spec -> in-implementation.

# SOFTWARE-2222 - Eventos câmeras: timeline do evento + acionamentos (INCIDENT)

Timeline do evento e acionamentos relacionados. O **detalhe base** (`GET /api/cameras/events/:id`) **já foi entregue pelo UC-032** (SOFTWARE-1914, PR #803, lucas) e o front consome sem mock. Falta o que segue mockado/stub. 1 PR.

## Endpoints / campos

- **`GET /api/cameras/events/:id/timeline`** -> `ICameraEventLogEntry[]`: sem backend hoje. O `MAX_TIMELINE_ITEMS` que existe é do detalhe de INCIDENTE (UC-024), não do evento. Construir a timeline do próprio evento (sequência de `CameraEventLog` por `occurredAt`).
- **`triggeredActions`** no detalhe: hoje o `GetCrossCameraEventDetailHandler` devolve `[]` hard-coded. Preencher o link real de **INCIDENT** (via `CameraIncidentEvent`, que já existe). **ALARM** não é persistido e **SERVICE_ORDER** não existe (só `CameraIncident.workOrderId` nullable) -> follow-up bloqueado (Alarmes/Inventário adiados).

## Reuso

`ICameraEventLogRepository`, `CameraIncidentEvent`, `events/_shared/*`.

Edital 4.6 (correlação temporal; integração Alarmes/Inventário). Frente: [[Eventos de câmeras - backend]]. Épico SOFTWARE-2047.

## Review (21/7)

Aprovada pelo bot Claude e pelo igor, sem ajustes. Único nit: `derive-camera-incident-code` parecido com `derive-camera-event-code` (2x, RB-34 só exige a partir de 3x) - deixei como está, consolido num `deriveHumanCode` quando surgir o terceiro. Registrei a resposta na PR. Segue pro merge.
