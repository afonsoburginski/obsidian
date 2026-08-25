---
tags:
  - doc
  - ms-cameras
  - cameras
  - dashboard
atualizado: 2026-08-24
---

# Dashboard de câmeras - Arquitetura e estratégias

> Parte do [[Dashboard de câmeras]]. Cobre a fundação **MOD-013 dashboard-aggregation** e o subsistema
> de push **UC-047 dashboard-realtime-push**. Para o fluxo de cada tela, ver
> [[Dashboard de câmeras - Fluxos]].

## Decisão central: agregação read-time, zero tabela própria

Todo widget lê tabelas de outros domínios do `ms-cameras` na hora da requisição - não existe worker,
job, snapshot materializado nem tabela `Dashboard*` no schema Prisma
(`apps/ms-cameras/src/database/schema/`). A justificativa, tirada de `MOD-013-dashboard-aggregation.md`
seção 1: até a fundação existir, toda agregação do serviço era **por câmera única**
(`resolveHealthRange`, `GetCameraHealthMetricsHandler`); o único agregado de frota
(`BandwidthMonitoringService`) era um snapshot escalar. As telas 2213-2219 precisavam de agregação
**multi-câmera, por escopo e por bucket de tempo** - em vez de cada card reimplementar "que janela?" e
"que câmeras esse escopo cobre?", a fundação concentra as duas resoluções.

Consequência de design: cada `Get<Widget>Handler` é fino, orquestra um repositório/serviço que já
existe (ou um repositório novo, mas sobre uma tabela existente) e devolve o contrato do widget. Nenhum
deles escreve.

## Fundação 1: resolver de período (`dashboard-period.resolver.ts`)

`resolveDashboardRange(period, now, custom?)` é **função pura**, sem DI, análoga ao `resolveHealthRange`
per-câmera (MOD-003) mas não uma generalização dele - o de health é dia-a-dia com `from`/`to` livre; o
de dashboard tem enum fechado e buckets sub-dia.

| Período | Janela | `bucketUnit` | `bucketSize` | `bucketCount` | `source` |
| --- | --- | --- | --- | --- | --- |
| `HOUR` | últimos 60 min | minute | 5 | 12 | `window` |
| `H24` | últimas 24h | hour | 1 | 24 | `window` |
| `D7` | 7 dias corridos | day | 1 | 7 | `rollup` |
| `D30` | 30 dias corridos | day | 1 | 30 | `rollup` |
| `CUSTOM` | `from`/`to` livre, até `MAX_DASHBOARD_CUSTOM_RANGE_DAYS` (92 dias) | day | 1 (até 14 dias) ou fold em ~6 buckets | conforme o span | `rollup` |

`source` decide **qual tabela ler**: `window` lê `CameraAvailabilityWindow` (granularidade fina,
retenção curta); `rollup` lê `CameraAvailabilityDailyRollup`, com o dia de hoje (ainda aberto)
completado a partir das windows finas via `AvailabilitySourceReader.readAllDayRowsForCameras`
(`partialTodayFromWindows`). `CUSTOM` é deliberadamente mais restrito que o teto de 366 dias do
endpoint de saúde por câmera: toda leitura do dashboard é multi-câmera, então o número de linhas cresce
com o tamanho da frota e não só com o span - uma janela livre sem teto deixaria uma query varrer o
histórico de rollup inteiro de todas as câmeras do tenant.

`baselineDays` (usado por `BR-DSH-02`, a tendência `trendPct`) é derivado junto com o resto: um dia de
rollup por dia da janela viva, para uma janela livre comparar contra um período igualmente longo sem
precisar de tabela própria de baseline.

## Fundação 2: resolver de escopo (`DashboardScopeResolver`, injetável)

Mapeia `IDashboardScope { areas, subareas, intersections, routes }` para o conjunto de
`Camera.trafficElementId` que os widgets agregam:

```
DashboardScopeResolver.resolve(scope, systemId, bearer)
  routes            -> unsupportedRoutes (capturado, não resolvido - "rota" não é modelada em ms-cameras)
  AREA/SUBAREA       -> resolveNodeIds(id) via cliente CACHEADO (1 walk por entidade, POLYGON -> NODE)
  INTERSECTION       -> trafficElementIds = [id] direto (0 roundtrips - o id de interseção JÁ é um trafficElementId)
  > MAX_COMPARISON_SCOPES (6) entidades -> InvalidInputException 400 (TOO_MANY_SCOPES)
  entries            = polígonos resolvidos + interseções (mantém entrada vazia se o polígono resolveu [])
  trafficElementIds  = união distinta das entries
  comparisonMode     = entries com >= 1 node id, contagem >= 2
  isNetworkWide      = entries.length === 0
```

O insight que sustenta o caminho direto de `INTERSECTION`: a topologia NODE **é** a interseção, e
`Camera.trafficElementId` aponta para um NODE - então o id de interseção já é o node id e mandá-lo ao
`resolveNodeIds` (que é POLYGON-only) daria 404 e voltaria `[]`. `Camera.intersection` é só rótulo
`VarChar`, nunca o id do nó.

**Fail-closed**: uma queda do `ms-traffic-model` propaga como `ExternalServiceException` (502) - o
escopo nunca é silenciosamente ampliado para a rede inteira. O cache (`CachedTopologyNodeIdsClient`,
Redis, `cameras:dashboard:topology:nodeids:<systemId>:<polygonId>`, TTL `DASHBOARD_TOPOLOGY_CACHE_TTL_SECONDS`,
default 300s) só existe para colapsar polígonos repetidos dentro do TTL; uma falha do walk **nunca** é
cacheada, só o resultado (inclusive `[]`).

> [!info] `routes` é decisão registrada, não lacuna esquecida
> O contrato `IDashboardScope` tem a dimensão `routes`, mas rota não é modelada em `ms-cameras` (só
> área -> subárea -> NODE/interseção). Decisão SOFTWARE-2212: aceitar `routes` no DTO, devolver em
> `unsupportedRoutes` sem resolver, para o frontend poder avisar o usuário. Consequência conhecida:
> `comparisonMode` conta só entidades resolvíveis, o que diverge do contrato ("`>= 2` itens no total,
> incluindo rotas") quando o usuário seleciona 1 rota + 1 área - registrado como decisão aberta no
> próprio `MOD-013`.

## Um handler, dois transportes: o mesmo `Get*Query` serve REST e o push

Cada `Get<Widget>Handler` aceita um `resolvedScope?` opcional (e `areaTopology?` no caso do
by-area). O caminho REST não passa nenhum dos dois - o controller injeta `DashboardScopeResolver`
direto e resolve a cada request. O caminho do push (ver seção seguinte) resolve **uma vez**, no
`subscribe`, e passa o resultado congelado para o mesmo handler via `DashboardWidgetComposer`. É a
mesma agregação, nunca duplicada; o handler nem sabe qual dos dois transportes o chamou.

Consequência de contrato (`MOD-013 seção 12.1`): o gate por valor do push hasheia o payload composto
inteiro; campos derivados do relógio (`rangeStart`/`rangeEnd` do mapa) ficam fora do hash de propósito
em `dashboard-value-gate.util.ts` - um widget novo com campo volátil precisa revisar esse arquivo, ou o
gate nunca deixa passar um frame porque o hash muda a cada composição mesmo sem mudança de dado.

## Cada família de widget, por onde lê

| Widget | Handler/serviço | Tabela(s) lida(s) |
| --- | --- | --- |
| KPIs (online/offline/intermitente/degradação + tendência) | `GetDashboardKpisHandler` via `ConnectivityAggregationService` | `Camera`, `CameraAvailabilityWindow`/`DailyRollup` |
| Gauge + distribuição de conectividade | `GetConnectivityGaugeHandler`, `GetConnectivityDistributionHandler` (mesma `ConnectivityAggregationService`) | idem |
| Tabela de intermitência (UF-019, `BR-CT-01`) | `IntermittentRowBuilder` | `CameraHeartbeatHistory` (sub-dia) ou `degradedWindows` do rollup (D7/D30) |
| Tabela de latência (UF-020, `BR-CT-02`) | `LatencyRowBuilder`, reusa `averageLatency` (health) | `avgLatencyMs` das windows/rollups de disponibilidade |
| Tabela de degradação (UF-021, `BR-CT-03`) | `DegradationRowBuilder` | `CameraStreamProfile` (resolução/fps/bitrate) + janela de saúde para o tier |
| Donuts de tipo e capacidade analítica | `CameraDistributionRepository.groupBy` | `Camera` |
| Donut de severidade de incidente | `IncidentSeverityRepository.groupBy` | `CameraIncident` |
| Heatmap de eventos (UC-036) | `DashboardEventsHeatmapRepository` (`groupBy` + `$queryRaw` para o bucket) | `CameraEventLog` |
| Marcadores do mapa (UC-037) | `DashboardMapAggregationService` | `Camera` + `CameraEventLog` |
| Série de uptime (UC-035) | `GetDashboardUptimeHandler` via `CameraAvailabilityRepository`/`AvailabilitySourceReader` | `CameraAvailabilityWindow`/`DailyRollup` |
| Banda: snapshot (UC-019, reusado pelo VMS) | `BandwidthMonitoringService.buildSnapshot` | `CameraStreamProfile` + snapshot de saúde online, ver [[VMS - Banda e alertas]] |
| Banda: série/por área/comparação (UC-038) | `BandwidthSeriesService`/`BandwidthSeriesRepository` | `CameraStreamProfile` (provisionado) + `CameraAvailabilityWindow`/`DailyRollup` (medido, `avgBitrateMbps`) |

O padrão que se repete: **um único fetch, agregação em memória por escopo**. `ConnectivityAggregationService`
busca as linhas escopadas uma vez e o `partitionByNodeIds` reparticiona em memória para o modo
comparação (evita N+1 por entidade comparada, SOFTWARE-2213); `BandwidthSeriesService` faz o mesmo para
os três endpoints de banda; `ConnectivityCandidatesRepository` busca a população elegível uma vez para
as três tabelas de conectividade, que compartilham `health-shares.ts` para a fração de janelas não
saudáveis.

## Subsistema de push realtime (UC-047)

Documentado em `apps/ms-cameras/docs/atomic/UC-047-dashboard-realtime-push.md` com onze decisões de
arquitetura fechadas (DR-1 a DR-11). As que mais moldam o código:

- **DR-1 - reusa o gateway existente**: nenhum gateway novo. `CameraStatusGateway` (namespace
  `cameras-status`) ganha `subscribe_dashboard`/`unsubscribe_dashboard`. As mensagens
  `subscribe_system`/`unsubscribe_system` e o evento `dashboard:invalidate` da UC-045 (sinal-e-refetch)
  foram removidos - o dashboard era o único consumidor.
- **DR-2 - payload completo, nunca delta**: cada frame `dashboard:widget:update` carrega a resposta
  inteira do widget, o mesmo contrato do REST. Frame perdido é irrelevante porque o próximo é estado
  completo; delta exigiria ordem garantida e reducer por widget, sem ganho real (maior payload medido:
  ~21 kB contra o teto de 1 MB por mensagem do socket).
- **DR-3 - uma implementação, dois transportes**: já descrito acima.
- **DR-4 - assinatura com filtros congelados**: `subscribe_dashboard` carrega
  `{ systemId, period, from?, to?, scope }`; escopo e mapa de topologia por área são resolvidos **uma
  vez** no subscribe (com o bearer do handshake) e congelados. Mudança de topologia só entra na
  próxima troca de filtro ou reconexão - exceção declarada: se o walk falhou no subscribe
  (`areaTopology` congelado em `null`), o widget by-area cai para resolução ao vivo por request.
- **DR-5 - gate por valor**: hash do último payload por (assinatura, widget); só emite quando difere.
- **DR-6 - snapshot no (re)subscribe**: todo subscribe compõe e emite os 12 widgets, seed do gate e
  catch-up de reconexão sem caso especial. O ack `dashboard:subscribed` sai **antes** dos frames.
- **DR-7 - emissão direta no socket, nunca em room**: o registro de rooms do Socket.IO é local por
  réplica mesmo com adapter Redis - emitir por room sob N réplicas duplicaria ou perderia frames.
- **DR-8 - propagação entre réplicas**: `DashboardChangeBus` publica `{ systemId, domain }` (~60 bytes)
  no canal Redis `attlas:cameras:dashboard-change`. Sem Redis, degrada para despacho in-process (réplica
  única continua correta; N réplicas atendem só quem compartilha a réplica que viu a mudança).
- **DR-9 - custo zero sem assinante**: nenhuma composição roda quando `hasSubscribersFor(systemId)` é
  falso. Mudanças acumulam num `Set` de domínios sujos por assinatura e são drenadas por debounce
  (`DASHBOARD_PUSH_DEBOUNCE_MS`, default 1500ms) com single-flight - zero mudanças, zero timers ativos.
- **DR-10 - publica na origem só quando o dado moveu**: o `AvailabilityWindowSampler` compara a janela
  recém-fechada com a anterior (estado, latência em ms inteiro, bitrate em 3 decimais) antes de publicar
  `CameraHealthMetricsUpdatedEvent`.
- **DR-11 - autorização em paridade com o REST**: ver o callout no índice do domínio - o doc do repo
  ainda descreve isso como dívida aberta (CROSS-007), mas o commit `b397f2f5e5` já fechou os dois lados
  (`@RequireSystemDuty()` nos controllers, `assertSystemMembership()` no gateway).

### `DashboardInvalidateDomain`: quem dispara o push

`DashboardInvalidationPublisher` funil a todo produtor por dois invariantes: **coalescing** (Redis
`SET NX EX`, no máximo um sinal por `(systemId, domain)` a cada `DASHBOARD_INVALIDATE_COALESCE_SECONDS`,
default 5s - uma frota oscilando não estoura o pipeline de push) e **resolução câmera->sistema** (cache
em processo, TTL 10 min, porque o tenant de uma câmera praticamente nunca muda).

| Domínio | Quem publica | Widgets que recompõem |
| --- | --- | --- |
| `HEALTH` | `camera-health-metrics.events-handler.ts`, `camera-status.events-handler.ts` | KPIs, gauge, distribuição de conectividade, uptime, mapa, tabelas de intermitência e latência |
| `EVENTS` | `camera-event-log.events-handler.ts` | heatmap de eventos, mapa |
| `INCIDENTS` | `correlate-events.service.ts` | nenhum widget renderizado consome hoje (mapeamento vazio, de propósito) |
| `BANDWIDTH` | `camera-health-metrics.events-handler.ts`, `provisioned-bandwidth-collector.service.ts` | consumo de banda, banda por área |
| `INVENTORY` | os cinco handlers de CRUD de câmera (`create`, `update`, `soft-delete`, `replace`, `change-state`, `batch-update-locations`) | distribuição por tipo, capacidade analítica, KPIs, mapa |

`INCIDENTS` mapear para `[]` em `dashboard-widget-domain.map.ts` é intencional (comentário no próprio
arquivo: "no rendered widget consumes it today") - o produtor existe, o consumidor ainda não.

### Widgets fora do push: comparação de banda e tabela de degradação

`DashboardWidget` (o enum que endereça os frames) tem 12 valores; `BANDWIDTH_COMPARISON` e a tabela de
**degradação** não estão entre eles, e `DashboardWidgetComposer.queryFor` não tem `case` para nenhum
dos dois - cairiam no `assertNever` se alguém tentasse. Os dois seguem servidos só pelo REST. O
frontend reflete isso: `openBandwidthCompare()` busca uma vez com `take(1)` ao abrir o modal, e a
tabela de degradação (`dashboard-degradation-table`) não tem sinal `live*` equivalente aos de
intermitência/latência na página.

## Frontend: canal alto (REST) e canal silencioso (push) por widget

`CamerasDashboardPageComponent.widget()` compõe cada card como `merge(loud$, silent$)`: `loud$` é o
fetch REST disparado por troca de filtro, refresh manual ou retry (com skeleton/erro); `silent$` é o
frame do push aplicado direto, sem flash de loading - um frame com `errorCode` é descartado, então o
card mantém o último dado bom em vez de quebrar numa atualização que o usuário não pediu
(comentário do próprio arquivo: "stale beats broken"). `DashboardLiveService` mantém **um socket por
sistema**, compartilhado por todos os widgets da página via `shareReplay({ bufferSize: 1, refCount: true })`,
e resolve o mesmo path/namespace que o `CameraStatusGateway` usa para status de câmera
(`CAMERA_STATUS_SOCKET_PATH`, `STATUS_NAMESPACE`) - não é um socket dedicado ao dashboard.

## Relacionados

[[Dashboard de câmeras]] · [[Dashboard de câmeras - Fluxos]] · [[Saúde e monitoramento]] ·
[[Status em tempo real]] · [[VMS - Banda e alertas]] · [[Eventos, incidentes e alarmes]] · [[Cameras]]
