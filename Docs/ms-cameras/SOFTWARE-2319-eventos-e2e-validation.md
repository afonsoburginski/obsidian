# SOFTWARE-2319 - Relatorio de validacao E2E (eventos de cameras)

Task: [[SOFTWARE-2319 - Eventos de câmeras - validação E2E de dados]] (Sprint 26).

Validacao dos 8 endpoints de eventos cross-camera (lista, detalhe, stats, timeline, recorrencia,
observacoes, reportar) - dado exibido vs persistido no Postgres. Terceira e ultima leva da QA desta
sprint (apos [[SOFTWARE-2317-cadastro-e2e-validation]] e [[SOFTWARE-2318-dashboard-e2e-validation]]).

- Ambiente: local, mesma sessao/seed do `ms-cameras` (140 eventos, 22 incidentes, 14 cameras).
- Data: 2026-07-27.
- Metodo: chamadas HTTP diretas (`/api/cameras/events*`) cruzadas com `psql`. Autenticacao via JWT
  assinado manualmente (mesmo contorno dos relatorios anteriores).
- Nao testado: resolucao real de `area`/`subarea` (exige `ms-traffic-model`, fora do ar), filtro
  `state` (connectionStatus) e o clique-a-clique pela interface `web-attlas`.

## Scorecard

| # | Endpoint | Veredito | Evidencia |
|---|----------|----------|-----------|
| 1 | `GET /events` (lista) | PASS | `totalItems=130` (30d default); `area`/`subarea` vazios - esperado sem `ms-traffic-model` (degradacao graciosa, BR-043-01). |
| 2 | `GET /events?severity=ERROR` | PASS | `totalItems=42`, bate exato com `stats.critical.count`. |
| 3 | `GET /events?origin=MANUAL` | PASS | vazio - nenhum evento com `operatorId` no seed (so SYSTEM). |
| 4 | `GET /events?status=DETECTED` | PASS | retornou exatamente o evento reportado no teste do endpoint 8 (filtro sobre status derivado, nao placeholder). |
| 5 | `GET /events/:id` (detalhe) | PASS | campos reais batem com o banco; `status`/`triggeredActions`/`linkedIncident` mudaram corretamente apos o report (endpoint 8). |
| 6 | `GET /events/stats` | PASS | `total=130=critical(42)+warning(50)+info(38)` - recorte identico a lista (BR-040-02). |
| 7 | `GET /events/:id/timeline` | PASS | sem incidente -> fallback contexto-da-camera (1 item, o proprio evento); apos reportar -> cadeia do incidente, sem erro. |
| 8 | `GET /events/:id/recurrence?period=24h` | PASS | 24 buckets zero-fill, ancora cai no ultimo bucket (`total=1,categoryCount=1`). |
| 9 | `GET`/`POST /events/:id/observations` | PASS | thread com reply aninhada; `author` = claim `name` do JWT; texto > 280 -> 400. |
| 10 | `POST /events/:id/report` | PASS | criou `CameraIncident` `DETECTED`/`priority=HIGH` (severidade ERROR->HIGH), `reportedBy`=JWT subject, `CameraIncidentEvent` linkado - conferido no banco. |
| 11 | `404` evento inexistente / `400` severity invalida / `400` description vazia | PASS | todos corretos. |

## Achados

Nenhum bug de código nesta leva. Duas limitações de ambiente (não são bugs):

- **`ms-traffic-model` fora do ar**: `area`/`subarea` sempre vazios (degradação correta, BR-043-01) -
  não testei o caminho feliz de resolução de topologia nem o filtro `area`/`subarea`.
- **`CameraIncidentEvent` vazio no seed**: nenhum evento tinha correlação prévia a incidente - só
  testei o fallback do timeline (contexto da câmera) e o caminho "recém-linkado" (via o `report` que
  eu mesmo disparei), não uma cadeia de incidente pré-existente com múltiplos eventos.

## Veredito

Eventos de câmeras (SOFTWARE-2319) está correto ponta a ponta: os 8 endpoints (lista, detalhe, stats,
timeline, recorrência, observações, report) retornam e persistem dados coerentes com o Postgres,
filtros reais (`severity`/`origin`/`status`) aplicam de fato (não são mais placeholder), e o ciclo
evento→observação→report→incidente→status-atualizado fecha corretamente de ponta a ponta. Nenhuma
correção de código foi necessária nesta leva.

Encerra a leva de QA da Sprint 26 (2317+2318+2319). Falta pra fechar 100%: `ms-traffic-model` no ar
pra validar área/subárea, e o clique-a-clique pelas 3 telas no `web-attlas`.
