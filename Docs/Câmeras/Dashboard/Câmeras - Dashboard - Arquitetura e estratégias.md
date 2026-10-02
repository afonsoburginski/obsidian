---
tags:
  - doc
  - ms-cameras
  - dashboard
atualizado: 2026-10-01
aliases:
  - "Dashboard de câmeras - Arquitetura e estratégias"
---

# Câmeras - Dashboard - Arquitetura e estratégias

Parte do [[Câmeras - Dashboard]]. Caminhos relativos a `apps/ms-cameras/src/` quando não começam por
`apps/` ou `libs/`.

## Mapa de código

| Área | Caminho |
| --- | --- |
| Fundação: período, escopo, DTO comum | `dashboard/shared/` |
| KPIs, gauge e distribuição de conectividade (UC-033) | `dashboard/connectivity/` |
| Tabelas de intermitência, latência e degradação (UC-039) | `dashboard/connectivity-tables/` |
| Donuts de tipo, capacidade analítica e severidade de incidente (UC-034) | `dashboard/distribution/` |
| Heatmap de eventos (UC-036) | `dashboard/heatmap/` |
| Marcadores do mapa (UC-037) | `dashboard/map/` |
| Série de uptime (UC-035) | `dashboard/uptime/` |
| Banda: snapshot e série, por área e comparação (UC-019, UC-038) | `dashboard/bandwidth/` |
| Push ao vivo por widget (UC-047) | `dashboard/realtime/` |
| Gateway WebSocket compartilhado | `cameras/realtime/camera-status.gateway.ts` |
| Publicador de invalidação | `cameras/realtime/dashboard-invalidation.publisher.ts` |
| Cache da topologia do `ms-traffic-model` | `cameras/clients/cached-topology-node-ids.client.ts`, `topology-cache-keys.ts` |
| Contratos | `libs/contracts/src/lib/camera/dashboard/` |
| Frontend | `apps/web-attlas/src/app/modules/cameras-dashboard/`, rota `/cameras/dashboard` carregada sob demanda |
| Specs | `apps/ms-cameras/docs/modules/MOD-013-dashboard-aggregation.md`, `apps/ms-cameras/docs/atomic/UC-033` a `UC-039`, `UC-047`; frontend em `apps/web-attlas/docs/modules/cameras-dashboard/` (MOD-001, UF-001 a UF-024) |

## Decisão central: agregação na leitura, sem tabela própria

Todo widget lê, na hora do pedido, tabelas de outros domínios: `Camera`, `CameraAvailabilityWindow` e
`CameraAvailabilityDailyRollup` e `CameraHeartbeatHistory` ([[Câmeras - Saúde e monitoramento]]), `CameraEventLog`
e `CameraIncident` ([[Câmeras - Eventos, incidentes e alarmes]]) e `CameraStreamProfile`. Não existe worker, snapshot
materializado nem tabela `Dashboard*`. A fundação (MOD-013) resolve as duas perguntas que todo card
repetiria, que janela ler e que câmeras o escopo cobre, e os handlers ficam finos.

## Rotas

Prefixo `/api`; no Kong, paths explícitos sob `/api/dashboard/*` (`docker/kong.yml`). Todas são GET, com
`@RequireSystemDuty()` em cada método (não na classe) e sem chave de permissão.

| Controller | Rotas | Spec |
| --- | --- | --- |
| `ConnectivityController` | `kpis`, `connectivity-gauge`, `connectivity-distribution` | UC-033 |
| `ConnectivityTablesController` | `connectivity/intermittent`, `connectivity/latency`, `connectivity/degradation` | UC-039 |
| `DistributionController` | `type-distribution`, `analytic-capacity`, `incident-severity` | UC-034 |
| `EventsHeatmapController` | `events-heatmap` | UC-036 |
| `MapController` | `map` | UC-037 |
| `UptimeController` | `uptime` | UC-035 |
| `BandwidthController` | `bandwidth`, `bandwidth-consumption`, `bandwidth-by-area`, `bandwidth-comparison` | UC-019, UC-038 |
| `CameraStatusGateway` (namespace `cameras-status`) | `subscribe_dashboard`, `unsubscribe_dashboard` | UC-047 |

São 16 rotas REST mais o canal WebSocket. Dois testes travam a superfície:
`shared/authorization/authorization-surface.spec.ts` põe os sete controllers em
`DUTY_PER_ROUTE_CONTROLLERS` (pertencimento por rota, então uma rota nova sem o decorator não é barrada por
esse teste), e `shared/audit/audit-surface.spec.ts` os põe em `READ_ONLY_CONTROLLERS` (um verbo de escrita
novo quebra o teste).

## De onde cada widget lê

| Widget | Handler ou serviço | Fonte | População |
| --- | --- | --- | --- |
| KPIs, gauge, distribuição de conectividade | `ConnectivityAggregationService` | janelas ou rollups de disponibilidade | `OPERATIONAL` |
| Tabela de intermitência (BR-CT-01) | `IntermittentRowBuilder` | `CameraHeartbeatHistory` em HOUR e H24; `degradedWindows` do rollup nos períodos em dias | `OPERATIONAL` e `TESTING` |
| Tabela de latência (BR-CT-02) | `LatencyRowBuilder` | `avgLatencyMs` das janelas ou rollups | `OPERATIONAL` e `TESTING` |
| Tabela de degradação (BR-CT-03) | `DegradationRowBuilder` | perfil PRIMARY ativo mais a janela de saúde | `OPERATIONAL` e `TESTING` |
| Donuts de tipo e capacidade analítica | `CameraDistributionRepository` | `Camera` | - |
| Donut de severidade de incidente | `IncidentSeverityRepository` | `CameraIncident` | - |
| Heatmap de eventos | `DashboardEventsHeatmapRepository` | `CameraEventLog` (`groupBy` e `$queryRaw` para o bucket) | - |
| Mapa | `DashboardMapAggregationService` | `Camera` e `CameraEventLog` | - |
| Uptime | `GetDashboardUptimeHandler` | janelas ou rollups de disponibilidade | - |
| Banda (snapshot, também do VMS) | `BandwidthMonitoringService` | perfis de stream e snapshot de saúde | `OPERATIONAL` online |
| Banda (consumo, por área, comparação) | `BandwidthSeriesService` | perfis de stream e `avgBitrateMbps` das janelas e rollups | `OPERATIONAL` e `TESTING` |

O padrão que se repete é um único fetch e agregação em memória por escopo: `ConnectivityAggregationService`
reparticiona as linhas por entidade no modo comparação (`partitionByNodeIds`), `BandwidthSeriesService` faz o
mesmo para os três endpoints de banda, e `ConnectivityCandidatesRepository` busca uma vez a população das
três tabelas (até 5000 câmeras; acima disso trunca e loga), que compartilham `health-shares.ts`.

Os KPIs são a foto atual do `connectionStatus` do snapshot de saúde: online é `STABLE`, offline é `OFFLINE`,
e **Degradação de Stream** (`streamDegradation`) conta as câmeras em qualquer outro estado de conexão
(instável ou parcialmente instável), não qualidade de vídeo; intermitência vem da oscilação e pode sobrepor
as outras contagens. Gauge e distribuição particionam a frota em três fatias exclusivas.

Uptime da tabela (`uptimePct`) é a fração de janelas saudáveis: `DEGRADED` e `OFFLINE` contam contra, e
câmera sem nenhuma janela fica sem valor, não com 0%. Os rollups e as janelas são cortados ao tempo de vida
da câmera (`clampToLifetime`, `health/availability/`): dia anterior ao cadastro não deve janela.

## Banda no dashboard

Como os widgets de banda usam o dado, em `dashboard/bandwidth/aggregation/bandwidth-series.aggregator.ts`:

- **Disponível**: soma, por câmera, do bitrate configurado de um perfil (`pickPreferredProfile`: SECONDARY,
  senão PRIMARY, só perfil com bitrate utilizável). O perfil não tem histórico, então a linha é plana.
- **Consumido**: só o medido. O `avgBitrateMbps` das janelas é somado por instante e tirado a média dentro
  do bucket; a janela que guarda o provisionado como aproximação, sem espectador, sai de todos os números
  (série, totais, `byScope`, fatias por área, comparação) por `excludeProvisionedFallback`, e o sentinela VBR
  é descartado na leitura.
- **Por área**: cada câmera conta a média do próprio período, agrupada pela área do nó
  (`groupConsumedByArea`); câmera sem área cai numa fatia sem rótulo para o total bater.

De onde vêm o bitrate medido e o configurado, a heurística de exclusão e o snapshot do VMS:
[[Câmeras - Streaming - Banda e bitrate]].

## Fundação 1: período (`shared/period/dashboard-period.resolver.ts`)

`resolveDashboardRange(period, now, custom?)` é função pura.

| Período | Janela | Bucket | Buckets | Fonte |
| --- | --- | --- | --- | --- |
| `HOUR` | últimos 60 min | 5 min | 12 | janelas |
| `H24` | últimas 24 h | 1 h | 24 | janelas |
| `D7` | 7 dias corridos | 1 dia | 7 | rollups |
| `D30` | 30 dias corridos | 1 dia | 30 | rollups |
| `CUSTOM` | `from` e `to` livres, até 92 dias | 1 dia até 14 dias, senão cerca de 6 buckets | conforme o intervalo | rollups |

Na fonte de rollups, o dia de hoje, ainda aberto, é completado pelas janelas finas. O teto de 92 dias é
menor que o do endpoint de saúde por câmera porque toda leitura do dashboard é multi-câmera e o volume cresce
com a frota. `baselineDays` alimenta a tendência `trendPct` (BR-DSH-02). A tela abre em `D30`.

## Fundação 2: escopo (`shared/scope/dashboard-scope.resolver.ts`)

`DashboardScopeResolver.resolve(scope, systemId, bearer)` mapeia
`IDashboardScope { areas, subareas, intersections, routes }` para o conjunto de `Camera.trafficElementId`:

- Área e subárea viram nós pelo cliente cacheado do `ms-traffic-model` (POLYGON para NODE).
- Interseção entra direto, sem chamada: o id da interseção já é o id do nó para onde `trafficElementId`
  aponta (`Camera.intersection` é só rótulo).
- `routes` é aceito e devolvido em `unsupportedRoutes`, sem resolver, porque rota não é modelada no
  `ms-cameras`; `comparisonMode` conta só entidades resolvíveis, o que diverge do contrato quando o usuário
  escolhe uma rota e uma área (decisão aberta registrada na MOD-013).
- Mais de 6 entidades: 400 `TOO_MANY_SCOPES`. `comparisonMode` com duas ou mais entidades resolvidas;
  `isNetworkWide` sem entidade.
- Fail-closed: queda do `ms-traffic-model` vira 502 `ExternalServiceException`, nunca a rede inteira.
- Cache Redis `cameras:topology:nodeids:<systemId>:<escopo do requisitante>:<polygonId>` (e
  `cameras:topology:tree:...` para a árvore inteira), TTL `TOPOLOGY_CACHE_TTL_SECONDS`, default 300 s. O
  escopo do requisitante é o SHA-256 do Bearer, porque o `ms-traffic-model` filtra a topologia pelo alcance
  operacional de quem chama. Falha nunca é cacheada.

## Um handler, dois transportes

Cada `Get<Widget>Handler` aceita `resolvedScope?` (e `areaTopology?` no por área). O REST não passa nada e o
controller resolve a cada pedido; o push resolve uma vez no `subscribe` e passa o resultado congelado pelo
`DashboardWidgetComposer`. É a mesma agregação. O gate por valor do push hasheia o payload inteiro, e campos
derivados do relógio (`rangeStart` e `rangeEnd` do mapa) ficam fora do hash em `dashboard-value-gate.util.ts`:
widget novo com campo volátil precisa revisar esse arquivo, senão o gate emite a cada composição.

## Push ao vivo (UC-047)

Decisões DR-1 a DR-11 em `apps/ms-cameras/docs/atomic/UC-047-dashboard-realtime-push.md`:

- **Sem gateway próprio**: `subscribe_dashboard` e `unsubscribe_dashboard` são mensagens do
  `CameraStatusGateway` (namespace `cameras-status`, path `/api/cameras/status/realtime`), o mesmo de status
  de câmera e de videowall.
- **Payload inteiro, nunca delta**: o frame `dashboard:widget:update` carrega a resposta do widget, o mesmo
  contrato do REST, então frame perdido não importa.
- **Filtros congelados**: o subscribe leva `{ systemId, period, from?, to?, scope }`; escopo e topologia por
  área são resolvidos uma vez, com o Bearer do handshake. Se o walk falhou no subscribe, o por área resolve
  ao vivo a cada composição.
- **Gate por valor**: hash do último payload por assinatura e widget; só emite quando muda.
- **Snapshot no subscribe**: todo subscribe compõe e emite os 12 widgets do enum `DashboardWidget`; o ack
  `dashboard:subscribed` sai antes dos frames.
- **Emissão direta no socket**, nunca em room, porque o registro de rooms é local por réplica.
- **Entre réplicas**: `DashboardChangeBus` publica `{ systemId, domain }` no canal Redis
  `attlas:cameras:dashboard-change`; sem Redis, despacho só na própria réplica.
- **Custo zero sem assinante**: domínios sujos acumulam por assinatura e são drenados por debounce
  (`DASHBOARD_PUSH_DEBOUNCE_MS`, 1500 ms), com até 4 composições em paralelo por assinatura. Limites: 500
  assinaturas por réplica (`DASHBOARD_MAX_SUBSCRIPTIONS_PER_REPLICA`) e 300 ms entre dois subscribes do mesmo
  socket.
- **Publicação na origem só quando o dado moveu**: o `AvailabilityWindowSampler` compara a janela fechada com
  a anterior (estado, latência em ms inteiro, bitrate arredondado a 0,1 Mbps) antes de publicar
  `CameraHealthMetricsUpdatedEvent`.
- **Autorização igual à do REST**: `assertSystemMembership()` no `subscribe_dashboard`; o MASTER passa.
- Métricas: `ms_cameras_dashboard_push_frames_total{widget,outcome}`, `ms_cameras_dashboard_push_subscriptions`,
  `ms_cameras_dashboard_push_compose_duration_seconds{widget}`.

> [!warning] UC-047 desatualizada no repo
> A DR-11 ainda descreve a validação de pertencimento no WebSocket como dívida (CROSS-007), e a DR-10 diz
> que o bitrate é comparado com 3 casas decimais; o código já valida o pertencimento e compara a 0,1 Mbps.

### Quem dispara o push

`DashboardInvalidationPublisher` concentra os produtores com coalescência Redis (`SET NX EX`, um sinal por
sistema e domínio a cada `DASHBOARD_INVALIDATE_COALESCE_SECONDS`, 5 s) e resolve câmera para sistema com
cache em processo de 10 min.

| Domínio | Quem publica | Widgets recompostos |
| --- | --- | --- |
| `HEALTH` | `camera-health-metrics.events-handler.ts`, `camera-status.events-handler.ts` | KPIs, gauge, distribuição, uptime, mapa, intermitência, latência |
| `EVENTS` | `events/realtime/camera-event-log.events-handler.ts` | heatmap, mapa |
| `INCIDENTS` | `correlate-events.service.ts` | nenhum (mapeamento vazio de propósito) |
| `BANDWIDTH` | `camera-health-metrics.events-handler.ts` na janela fechada, `health/workers/provisioned-bandwidth-collector.service.ts` quando o bitrate configurado mudou | consumo de banda, banda por área |
| `INVENTORY` | handlers de cadastro, edição, remoção, substituição, estado, localização em lote e vínculo com interseção | tipo, capacidade analítica, KPIs, mapa |

### Rotas fora do push

`bandwidth-comparison`, `connectivity/degradation`, `incident-severity` e o snapshot `bandwidth` não têm
valor no enum nem `case` em `DashboardWidgetComposer.queryFor`. Só a comparação é usada pela tela, sob demanda
ao abrir o modal. `getDegradation` e `getIncidentSeverity` existem em `cameras-dashboard.service.ts` sem
chamador: as duas rotas vivem no backend sem tela.

## Frontend: canal REST e canal ao vivo por widget

`CamerasDashboardPageComponent.widget()` compõe cada card como `merge(loud$, silent$)`. `loud$` é o fetch REST
disparado por troca de filtro, atualização manual ou nova tentativa, com skeleton e erro; `silent$` é o frame
do push aplicado direto, e frame com `errorCode` é descartado para o card manter o último dado bom.
`DashboardLiveService` abre o próprio socket por sistema (`io()` no namespace de status), compartilhado pelos
widgets da página com `shareReplay({ bufferSize: 1, refCount: true })`; os serviços de status de câmera e de
videowall abrem os seus. O compartilhado é o gateway, não o socket.

## Cobertura do RF-DSH-01

| Parte do requisito | Estado |
| --- | --- |
| Conectividade (online, offline, intermitência, latência, uptime) | Na tela |
| Operacional (tipo, capacidade analítica, mapa, heatmap de eventos) | Na tela |
| Rede (banda consumida e disponível, por área, comparação) | Na tela |
| Degradação de vídeo por câmera | Fora da tela: a rota da tabela de degradação existe sem card, e o KPI `streamDegradation` mede conexão, não vídeo |
| Incidentes abertos por severidade | Rota `incident-severity` sem card |
| MTTR e hotspots | Não existem no backend, no frontend nem nos contratos |
| Exportação XLSX e CSV | Só frontend: `ConnectivityExportService` gera o arquivo da lista de conectividade já carregada (CSV direto, XLSX por `exceljs` sob demanda), sem rota de exportação |

## Pendências

- O `ms-cameras` ocupa `/api/dashboard` na raiz do Kong, sem prefixo de serviço; não há colisão hoje (o
  dashboard de alarmes mora em `/api/alarms`), mas o isolamento por serviço do resto não vale aqui.
- Limiares de latência (80, 130, 180 ms, `latency-severity.ts`) e de degradação (10% e 50% de janelas não
  saudáveis, `degradation-reference.constants.ts`) aguardam revisão de produto, como dizem os comentários do
  código.
- A exclusão do provisionado no consumo é heurística; a correção durável (coluna de origem na janela) está
  em [[Câmeras - Streaming - Banda e bitrate]].
