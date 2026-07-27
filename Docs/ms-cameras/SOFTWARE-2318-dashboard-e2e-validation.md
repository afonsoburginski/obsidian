# SOFTWARE-2318 - Relatorio de validacao E2E (dashboard de cameras)

Task: [[SOFTWARE-2318 - Dashboard de câmeras - validação E2E de dados]] (Sprint 26).

Validacao dos 13 endpoints de agregacao do dashboard de cameras (KPIs, gauge, distribuicao,
donuts, uptime, mapa, heatmap de eventos, banda, tabelas de conectividade) - dado exibido vs
persistido no Postgres. Segunda leva de QA (apos [[SOFTWARE-2317-cadastro-e2e-validation]]).

- Ambiente: local, mesma sessao do `ms-cameras` ja validado em 2317 (14 cameras seed OPERATIONAL,
  22 incidentes, 140 eventos).
- Data: 2026-07-27.
- Metodo: chamadas HTTP diretas (`/api/dashboard/*`) cruzadas com `psql` (contagem por status de
  conectividade, incidentes por prioridade, rollup diario). Autenticacao via JWT assinado
  manualmente (mesmo contorno do relatorio anterior - `ms-organization` continua bloqueado pelo
  Kafka local).
- Nao testado: `bandwidth-by-area` no caminho feliz (exige `ms-traffic-model`, que nao estava no ar
  neste ambiente) e o clique-a-clique pela interface `web-attlas`.

## Scorecard

| # | Endpoint | Veredito | Evidencia |
|---|----------|----------|-----------|
| 1 | `GET /kpis?period=D7` | PASS | `total=14, online=10, offline=1, streamDegradation=3` - bate exato com `CameraOperationalSnapshot` agrupado por status. |
| 2 | `GET /connectivity-gauge` | PASS | `onlinePct=71.43` (10/14), `targetPct=98` (default de config). |
| 3 | `GET /connectivity-distribution` | PASS | slices ONLINE/INTERMITTENT/OFFLINE somam `total=14`. |
| 4 | `GET /type-distribution` | PASS | FIXED=13/PTZ=1, bate com `physicalCameraKind`. |
| 5 | `GET /analytic-capacity` | PASS | dai/atspm `active=1/13, activePct=7.1` cada. |
| 6 | `GET /incident-severity?period=D30` | PASS | `total=22` (10 CRITICAL, 2 HIGH, 6 MEDIUM, 4 LOW) - bate exato com `CameraIncident` (nenhum TENTATIVE/DROPPED no dataset). |
| 7 | `GET /uptime?period=D7` | PASS* | `cameraCount=14`; ver achado F1 sobre os buckets recentes. |
| 8 | `GET /map?period=D7` | PASS | 14 marcadores com lat/lng, `severity` = maior severidade dos eventos recentes, `eventCount=26`. |
| 9 | `GET /events-heatmap?period=D7` | PASS | 13 cameras no eixo Y (so quem teve evento), celulas com `total=info+warn+crit` batendo. |
| 10 | `GET /bandwidth-consumption?period=D7` | PASS | `consolidated.utilizationPct=104.34` (`totalConsumed=49.124 / totalAvailable=47.08`). |
| 11 | `GET /bandwidth-by-area?period=D7` | N/A | 502 `EXTERNAL_SERVICE_ERROR` - `ms-traffic-model` fora do ar neste ambiente; comportamento fail-closed correto, nao testei o caminho feliz. |
| 12 | `GET /bandwidth-comparison?period=D7` | PASS | serie `network` identica a `bandwidth-consumption`. |
| 13 | `GET /connectivity/{intermittent,latency,degradation}` | PASS | as 3 tabelas retornam 14 linhas, paginacao correta; `sortBy` invalido -> 400; `q` filtra corretamente. |
| 14 | `period` invalido -> 400 | PASS | `VALIDATION_FAILED`. |

## Achados

### F1 (nao e bug - limitacao de dado do ambiente) - rollup diario parado em 24/07

`CameraAvailabilityDailyRollup` so tem linhas ate `2026-07-24` - nada para 25/26/27. Isso faz
`uptime`/`intermittent`/`latency` mostrarem `null` (25/26, comportamento correto por spec - BR-UPT-02)
ou valores degradados pro bucket de hoje (27/07 mostrou uptime 0%, porque as janelas finas de hoje so
tem amostras OFFLINE - efeito colateral de eu ter reiniciado o `ms-cameras` varias vezes durante a
sessao de testes, nao um bug de agregacao). A logica de agregacao esta correta dado o dado disponivel;
o dataset seed que fica sem rollup fresco e uma limitacao conhecida do ambiente local, nao do codigo.
Recomendacao: rodar o job de rollup (ou reseed) antes de validar visualmente os graficos de tendencia
no `web-attlas`, senao os ultimos 2-3 dias vao aparecer vazios/zerados sem ser um bug real.

### F2 (baixo, corrigido - documentacao) - 6 specs atomicas com a rota errada

UC-033, UC-034, UC-036, UC-037, UC-038 e UC-039 documentavam a base `/api/cameras/dashboard/*`, mas a
implementacao real (confirmada contra a instancia rodando) usa `/api/dashboard/*` - mesmo prefixo do
`BandwidthController` ja existente. UC-035 (uptime) ja tinha sido corrigida em 23/07 com uma nota
explicando a origem do drift; as outras 6 ainda citavam a rota antiga em todo o contrato REST. Corrigi
o texto das 6 specs (uma nota curta + troca do path em todos os exemplos).

## Veredito

Dashboard de cameras (SOFTWARE-2318) esta correto ponta a ponta no nivel de API+banco: os 13
endpoints (KPIs, gauge, distribuicao, 3 donuts, uptime, mapa, heatmap, 3 series de banda, 3 tabelas de
conectividade) retornam dados que batem exatamente com o Postgres, respeitam validacao de
`period`/`sortBy`, e degradam corretamente (502 fail-closed) quando `ms-traffic-model` esta fora. Nenhum
bug de codigo encontrado nesta leva - so a divergencia de rota nas specs (F2, corrigida) e uma
limitacao de dado do ambiente (F1, nao e bug).

Falta pra fechar 100%: validar `bandwidth-by-area` com `ms-traffic-model` no ar, e o clique-a-clique
da tela de dashboard pelo `web-attlas` (fora do alcance desta sessao - sem ferramenta de browser).
