---
tags:
  - doc
  - cameras
  - dashboard
aliases:
  - "Dashboard de câmeras - Arquitetura e estratégias"
atualizado: 2026-10-07
banner: "dashboard analytics dark"
---

# Câmeras - Dashboard - Arquitetura e estratégias

Volta para [[Câmeras - Dashboard]].

## Resumo

O dashboard é uma camada de agregação na hora da leitura: cada widget lê, no pedido, tabelas de outros
subdomínios, sem tabela, worker nem snapshot próprios. Uma fundação comum resolve a janela de tempo (período) e
o conjunto de câmeras (escopo), e os handlers ficam finos. São 16 rotas GET sob `/api/dashboard`, sem chave de
permissão, mais um canal WebSocket que empurra o widget inteiro quando o dado de origem muda. O mesmo handler
atende o REST e o push.

## Onde está no código

Caminhos relativos a `apps/ms-cameras/src/` quando não começam por `apps/`, `libs/` ou `docker/`.

| Caminho | Papel |
| --- | --- |
| `dashboard/shared/` | Fundação: resolvedor de período (`shared/period/dashboard-period.resolver.ts`), resolvedor de escopo (`shared/scope/dashboard-scope.resolver.ts`) e DTO comum |
| `dashboard/connectivity/` | KPIs, gauge e distribuição de conectividade |
| `dashboard/connectivity-tables/` | Tabelas de intermitência, latência e degradação; população comum em `candidates/`, frações de janelas em `shared/health-shares.ts` |
| `dashboard/distribution/` | Donuts de tipo, capacidade analítica e severidade de incidente |
| `dashboard/heatmap/` | Heatmap de eventos |
| `dashboard/map/` | Marcadores do mapa |
| `dashboard/uptime/` | Série de uptime |
| `dashboard/bandwidth/` | Banda: snapshot (também do VMS), consumo, por área e comparação; regra de escolha de perfil em `bandwidth-profile-selection.ts`, agregação em `aggregation/` |
| `dashboard/realtime/` | Push ao vivo: `DashboardPushService`, `DashboardWidgetComposer`, `DashboardChangeBus`, mapa domínio para widget, gate por valor |
| `cameras/realtime/camera-status.gateway.ts` | Gateway WebSocket compartilhado, onde moram `subscribe_dashboard` e `unsubscribe_dashboard` |
| `cameras/realtime/dashboard-invalidation.publisher.ts` | Publicador de invalidação usado pelos outros subdomínios |
| `cameras/clients/cached-topology-node-ids.client.ts`, `cameras/clients/topology-cache-keys.ts` | Cache Redis da topologia do `ms-traffic-model` |
| `health/availability/` | Leitura de janelas e rollups de disponibilidade, com o corte ao tempo de vida da câmera (`clampToLifetime`) |
| `libs/contracts/src/lib/camera/dashboard/` | Contratos de resposta, `DashboardWidget` e `EnumDashboardPeriod` |
| `apps/web-attlas/src/app/modules/cameras-dashboard/` | Frontend, rota `/cameras/dashboard` carregada sob demanda |
| `docker/kong.yml` | Rotas explícitas sob `/api/dashboard/*` |
| `apps/ms-cameras/docs/modules/MOD-013-dashboard-aggregation.md`, `apps/ms-cameras/docs/atomic/` (UC-033 a UC-039, UC-047), `apps/web-attlas/docs/modules/cameras-dashboard/` | Specs do backend e do frontend |

## Contratos

### Rotas

Prefixo `/api`. Todas são GET, com `@RequireSystemDuty()` em cada método (não na classe) e sem chave de
permissão. Query comum (`DashboardQueryDto`): `period` obrigatório, `from` e `to` no período `CUSTOM`, e UUIDs
por dimensão de escopo (`areas`, `subareas`, `intersections`, `routes`).

| Controller | Rotas sob `/dashboard` | Spec |
| --- | --- | --- |
| `ConnectivityController` | `kpis`, `connectivity-gauge`, `connectivity-distribution` | UC-033 |
| `ConnectivityTablesController` | `connectivity/intermittent`, `connectivity/latency`, `connectivity/degradation` (página até 100, busca até 120 caracteres) | UC-039 |
| `DistributionController` | `type-distribution`, `analytic-capacity`, `incident-severity` | UC-034 |
| `EventsHeatmapController` | `events-heatmap` | UC-036 |
| `MapController` | `map` | UC-037 |
| `UptimeController` | `uptime` | UC-035 |
| `BandwidthController` | `bandwidth?cameraIds=` (snapshot), `bandwidth-consumption`, `bandwidth-by-area`, `bandwidth-comparison` | UC-019, UC-038 |

Dois testes travam a superfície: `shared/authorization/authorization-surface.spec.ts` põe os sete controllers em
`DUTY_PER_ROUTE_CONTROLLERS`, e `shared/audit/audit-surface.spec.ts` os põe em `READ_ONLY_CONTROLLERS` (um verbo
de escrita novo quebra o teste).

### Canal WebSocket

Namespace `cameras-status`, path `/api/cameras/status/realtime`, o mesmo do status de câmera e do videowall.

| Mensagem | Direção | Conteúdo |
| --- | --- | --- |
| `subscribe_dashboard` | cliente para servidor | `{ systemId, period, from?, to?, scope }`; substitui a assinatura anterior do mesmo socket |
| `dashboard:subscribed` | servidor para cliente | Ack, enviado antes do snapshot |
| `dashboard:widget:update` | servidor para cliente | `{ widget, data }` com a resposta inteira do widget, o mesmo contrato do REST, ou `errorCode` quando a composição falhou |
| `unsubscribe_dashboard` | cliente para servidor | Libera a assinatura |
| `exception` | servidor para cliente | Emitido pelo Nest quando o subscribe é recusado |

O enum `DashboardWidget` tem 12 valores: `KPIS`, `UPTIME`, `CONNECTIVITY_GAUGE`, `CONNECTIVITY_DISTRIBUTION`,
`TYPE_DISTRIBUTION`, `ANALYTIC_CAPACITY`, `EVENTS_HEATMAP`, `MAP`, `BANDWIDTH_CONSUMPTION`, `BANDWIDTH_BY_AREA`,
`CONNECTIVITY_INTERMITTENT` e `CONNECTIVITY_LATENCY`. O dashboard não consome nem produz tópico Kafka: a
propagação entre réplicas usa o canal Redis `attlas:cameras:dashboard-change`.

### Fontes de cada widget

| Widget | Handler ou serviço | Tabela lida | População |
| --- | --- | --- | --- |
| KPIs, gauge, distribuição de conectividade | `ConnectivityAggregationService` | Janelas ou rollups de disponibilidade e o snapshot de saúde | `OPERATIONAL` |
| Tabela de intermitência (BR-CT-01) | `IntermittentRowBuilder` | `CameraHeartbeatHistory` em `HOUR` e `H24`; `degradedWindows` do rollup nos períodos em dias | `OPERATIONAL` e `TESTING` |
| Tabela de latência (BR-CT-02) | `LatencyRowBuilder` | `avgLatencyMs` das janelas ou dos rollups | `OPERATIONAL` e `TESTING` |
| Tabela de degradação (BR-CT-03) | `DegradationRowBuilder` | Perfil PRIMARY ativo mais as janelas de saúde | `OPERATIONAL` e `TESTING` |
| Donuts de tipo e capacidade analítica | `CameraDistributionRepository` | `Camera` | Toda câmera não removida, em qualquer estado |
| Donut de severidade de incidente | `IncidentSeverityRepository` | `CameraIncident` | - |
| Heatmap de eventos | `DashboardEventsHeatmapRepository` | `CameraEventLog` (`groupBy` e `$queryRaw` para o bucket) | - |
| Mapa | `DashboardMapAggregationService` | `Camera` e `CameraEventLog` (até 5000 eventos por pedido, 20 por marcador) | - |
| Uptime | `GetDashboardUptimeHandler` | Janelas ou rollups de disponibilidade | - |
| Banda, snapshot | `BandwidthMonitoringService` | Perfis de stream e snapshot de saúde | `OPERATIONAL` online |
| Banda, consumo, por área e comparação | `BandwidthSeriesService` | Perfis de stream e `avgBitrateMbps` das janelas e rollups | `OPERATIONAL` e `TESTING` |

### Domínios de invalidação

`DashboardInvalidationPublisher` recebe o sinal dos outros subdomínios e o mapa `DASHBOARD_DOMAIN_WIDGETS`
(`dashboard/realtime/dashboard-widget-domain.map.ts`) decide quais widgets recompor.

| Domínio | Quem publica | Widgets recompostos |
| --- | --- | --- |
| `HEALTH` | `camera-health-metrics.events-handler.ts`, `camera-status.events-handler.ts` | KPIs, gauge, distribuição, uptime, mapa, intermitência, latência |
| `EVENTS` | `events/realtime/camera-event-log.events-handler.ts` | Heatmap, mapa |
| `INCIDENTS` | `correlate-events.service.ts` | Nenhum, de propósito |
| `BANDWIDTH` | `camera-health-metrics.events-handler.ts` na janela fechada; `health/workers/provisioned-bandwidth-collector.service.ts` quando o bitrate configurado mudou | Consumo de banda, banda por área |
| `INVENTORY` | Handlers de cadastro, edição, remoção, substituição, estado, localização em lote e vínculo com interseção | Tipo, capacidade analítica, KPIs, mapa |

### Variáveis de ambiente

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `DASHBOARD_INVALIDATE_COALESCE_SECONDS` | 5 | Um sinal por sistema e domínio nessa janela |
| `DASHBOARD_PUSH_DEBOUNCE_MS` | 1500 | Espera antes de recompor os widgets sujos de uma assinatura |
| `DASHBOARD_MAX_SUBSCRIPTIONS_PER_REPLICA` | 500 | Teto de assinaturas por réplica; acima dele o subscribe é recusado |
| `TOPOLOGY_CACHE_TTL_SECONDS` | 300 | TTL do cache Redis da topologia |
| `DASHBOARD_CONNECTIVITY_GAUGE_TARGET_PCT` | 98 | Meta do gauge de conectividade; valor fora de (0, 100] cai no padrão |

## Por que é assim

### Agregação na leitura, sem tabela própria

Todo widget lê, na hora do pedido, tabelas que outros subdomínios já mantêm: `Camera`,
`CameraAvailabilityWindow`, `CameraAvailabilityDailyRollup` e `CameraHeartbeatHistory`
([[Câmeras - Saúde e monitoramento]]), `CameraEventLog` e `CameraIncident`
([[Câmeras - Eventos, incidentes e alarmes]]) e `CameraStreamProfile`. Não existe tabela `Dashboard*`. A fundação
resolve as duas perguntas que todo card repetiria, que janela ler e que câmeras o escopo cobre.

O padrão é um único fetch e agregação em memória por escopo: `ConnectivityAggregationService` reparticiona as
linhas por entidade no modo comparação (`partitionByNodeIds`), `BandwidthSeriesService` faz o mesmo para os três
endpoints de banda, e `ConnectivityCandidatesRepository` busca uma vez a população das três tabelas.

### Período

`resolveDashboardRange(period, now, custom?)` é função pura. A tela abre em `D30`.

| Período | Janela | Bucket | Buckets | Fonte |
| --- | --- | --- | --- | --- |
| `HOUR` | Últimos 60 min | 5 min | 12 | Janelas |
| `H24` | Últimas 24 h | 1 h | 24 | Janelas |
| `D7` | 7 dias corridos | 1 dia | 7 | Rollups |
| `D30` | 30 dias corridos | 1 dia | 30 | Rollups |
| `CUSTOM` | `from` e `to` livres, até 92 dias | 1 dia até 14 dias; acima, cerca de 6 buckets | conforme o intervalo | Rollups |

Na fonte de rollups, o dia de hoje, ainda aberto, é completado pelas janelas finas, e dia fechado sem rollup é
preenchido pela média das janelas retidas. O teto de 92 dias é menor que o do endpoint de saúde por câmera porque
toda leitura do dashboard é de várias câmeras e o volume cresce com a frota. `baselineDays` alimenta a
tendência `trendPct` (BR-DSH-02).

### Escopo

`DashboardScopeResolver.resolve(scope, systemId, bearer)` mapeia
`IDashboardScope { areas, subareas, intersections, routes }` para o conjunto de `Camera.trafficElementId`.

- Área e subárea viram nós pelo cliente cacheado do `ms-traffic-model` (polígono para nó).
- Interseção entra direto, sem chamada: o id da interseção já é o id do nó para onde `trafficElementId` aponta
  (`Camera.intersection` é só rótulo).
- `routes` é aceito e devolvido em `unsupportedRoutes`, sem resolver, porque rota não é modelada no
  `ms-cameras`.
- Mais de 6 entidades responde 400 `INVALID_INPUT` com detalhe `TOO_MANY_SCOPES`. `comparisonMode` liga com
  duas ou mais entidades resolvíveis; `isNetworkWide`, sem entidade nenhuma.
- Fail-closed: queda do `ms-traffic-model` vira 502 `EXTERNAL_SERVICE_ERROR` (`ExternalServiceException`), nunca a
  rede inteira.
- Cache Redis `cameras:topology:nodeids:<systemId>:<escopo do requisitante>:<polygonId>` e
  `cameras:topology:tree:...` para a árvore inteira. O escopo do requisitante é o SHA-256 do Bearer, porque o
  `ms-traffic-model` filtra a topologia pelo alcance operacional de quem chama. Falha nunca é cacheada.

### Um handler, dois transportes

Cada `Get<Widget>Handler` aceita `resolvedScope?` (e `areaTopology?` no por área). O REST não passa nada e o
controller resolve a cada pedido; o push resolve uma vez no subscribe e passa o resultado congelado pelo
`DashboardWidgetComposer`. É a mesma agregação, então o frame do push e a resposta do REST têm o mesmo
contrato.

### Push ao vivo

As decisões numeradas (DR-1 a DR-11) estão na spec atômica do push, listada em [[#Onde está no código]].

- **Sem gateway próprio.** As mensagens moram no `CameraStatusGateway`.
- **Payload inteiro, nunca delta.** Frame perdido não importa, porque o próximo traz o widget inteiro.
- **Filtros congelados.** Escopo e topologia por área são resolvidos uma vez, com o Bearer do handshake. Se a
  topologia falhou no subscribe, o por área resolve ao vivo a cada composição.
- **Gate por valor.** Hash do último payload por assinatura e widget; só emite quando muda.
- **Snapshot no subscribe.** Todo subscribe compõe e emite os 12 widgets, depois do ack.
- **Emissão direta no socket, nunca em sala**, porque o registro de salas é local de cada réplica.
- **Entre réplicas.** `DashboardChangeBus` publica `{ systemId, domain }` no canal Redis; cada réplica ignora a
  própria mensagem pela origem. Sem Redis, o despacho fica na própria réplica.
- **Custo zero sem assinante.** Domínios sujos acumulam por assinatura e são drenados pelo debounce, com até 4
  composições em paralelo por assinatura. Dois subscribes do mesmo socket precisam de 300 ms de intervalo.
- **Origem só publica quando o dado moveu.** O `AvailabilityWindowSampler` compara a janela fechada com a
  anterior (estado, latência em milissegundo inteiro, bitrate arredondado a 0,1 Mbps) antes de publicar
  `CameraHealthMetricsUpdatedEvent`.
- **Coalescência na origem.** `DashboardInvalidationPublisher` usa `SET NX EX` no Redis, um sinal por sistema e
  domínio a cada 5 s, e resolve câmera para sistema com cache em processo de 10 min.
- **Autorização igual à do REST.** `assertSystemMembership()` no `subscribe_dashboard`; o MASTER passa.
- **Métricas.** `ms_cameras_dashboard_push_frames_total{widget,outcome}`,
  `ms_cameras_dashboard_push_subscriptions` e `ms_cameras_dashboard_push_compose_duration_seconds{widget}`.

### Conectividade: o que cada número significa

Os KPIs são a foto atual do `connectionStatus` do snapshot de saúde: online é `STABLE`, offline é `OFFLINE`, e
Degradação de Stream (`streamDegradation`) conta as câmeras em qualquer outro estado de conexão (instável ou
parcialmente instável), não a qualidade do vídeo. Intermitência vem da oscilação e pode sobrepor as outras
contagens. Gauge e distribuição particionam a frota em três fatias exclusivas.

O uptime da tabela (`uptimePct`) é a fração de janelas saudáveis: `DEGRADED` e `OFFLINE` contam contra, e
câmera sem nenhuma janela fica sem valor, não com 0%. Janelas e rollups são cortados ao tempo de vida da câmera
(`clampToLifetime`): dia anterior ao cadastro não conta.

| Tabela | Cálculo |
| --- | --- |
| Intermitência | Transições de online para offline por dia no `CameraHeartbeatHistory` (`HOUR`, `H24`) ou `degradedWindows` do rollup (períodos em dias); câmera sem queda aparece com zero |
| Latência | Média de `avgLatencyMs`; câmera sem amostra fica fora da lista. Severidade LOW até 80 ms, MEDIUM até 130 ms, HIGH até 180 ms, CRITICAL acima (`latency-severity.ts`) |
| Degradação | Só câmera com perfil PRIMARY ativo; saúde pela fração de janelas `DEGRADED` ou `OFFLINE`: OK abaixo de 10%, DEGRADED até 50%, POOR a partir de 50%; barras de resolução, fps e bitrate contra 1080p, 30 fps e 4000 kbps (`degradation-reference.constants.ts`) |

### Banda

A agregação mora em `dashboard/bandwidth/aggregation/bandwidth-series.aggregator.ts`.

- **Disponível.** Soma, por câmera, do bitrate configurado de um perfil (`pickPreferredProfile`: SECONDARY,
  senão PRIMARY, só perfil com bitrate utilizável). O perfil não tem histórico, então a linha é plana.
- **Consumido.** Só o medido. O `avgBitrateMbps` das janelas é somado por instante entre as câmeras e tirado a
  média dentro do bucket. A janela que guarda o provisionado como aproximação, sem espectador, sai de todos os
  números (série, totais, `byScope`, fatias por área, comparação) por `excludeProvisionedFallback`.
- **Sentinela VBR.** Câmera de taxa variável informa "sem limite" como 2147483647 kbps; toda leitura descarta
  valor a partir de 1000000 kbps (`MAX_SANE_BITRATE_KBPS`), inclusive o que já estava gravado.
- **Por área.** Cada câmera conta a média do próprio período, agrupada pela área do nó (`groupConsumedByArea`);
  câmera sem área cai numa fatia sem rótulo para o total bater.

De onde vêm o bitrate medido e o configurado e o snapshot do VMS: [[Câmeras - Streaming - Banda e bitrate]].

### Frontend: canal REST e canal ao vivo por widget

`CamerasDashboardPageComponent.widget()` compõe cada card como `merge(loud$, silent$)`. `loud$` é o fetch REST
disparado por troca de filtro, atualização manual ou nova tentativa, com skeleton e erro; `silent$` é o frame
do push aplicado direto, e frame com `errorCode` é descartado para o card manter o último dado bom.
`DashboardLiveService` abre o próprio socket por sistema no namespace de status, compartilhado pelos widgets da
página com `shareReplay({ bufferSize: 1, refCount: true })`; os serviços de status de câmera e de videowall abrem
os seus. O compartilhado é o gateway, não o socket.

## Armadilhas conhecidas

- **Consumo inflado nos períodos em dias e exclusão do provisionado por heurística.** Linha cujo valor casa com um
  bitrate configurado atual da câmera é tratada como aproximação, e perfil reconfigurado depois da gravação deixa a
  linha passar. A correção durável está em [[Câmeras - Dashboard - Pendências]].
- **Campo volátil no gate por valor.** O gate hasheia o payload inteiro; `rangeStart` e `rangeEnd` do mapa, que
  derivam do relógio, ficam fora do hash em `dashboard-value-gate.util.ts`. Widget novo com campo derivado do
  relógio precisa entrar nesse arquivo, senão o gate emite a cada composição.
- **Rotas fora do push.** Só a comparação de banda é usada pela tela, sob demanda ao abrir o modal. O que falta está
  em [[Câmeras - Dashboard - Pendências]].
- **Truncamento da população.** As tabelas de conectividade leem até 5000 câmeras por sistema; acima disso a
  população é truncada e um aviso vai para o log.
- **`/api/dashboard` sem prefixo de serviço.** O `ms-cameras` ocupa `/api/dashboard` na raiz do Kong. Não há
  colisão hoje (o dashboard de alarmes mora em `/api/alarms`), mas o isolamento por serviço do resto do Kong não
  vale aqui.

O que ainda falta fazer no Dashboard está em [[Câmeras - Dashboard - Pendências]].

## Cobertura do requisito do edital

Cobertura do RF-DSH-01 de `docs/modules/cameras.md`.

| Parte do requisito | Situação |
| --- | --- |
| Conectividade (online, offline, intermitência, latência, uptime) | Na tela |
| Operacional (tipo, capacidade analítica, mapa, heatmap de eventos) | Na tela |
| Rede (banda consumida e disponível, por área, comparação) | Na tela |

O que não está na tela (degradação de vídeo, incidentes por severidade, MTTR e hotspots, rota de exportação) está em [[Câmeras - Dashboard - Pendências]].

## Glossário

| Termo | O que é |
| --- | --- |
| Janela | `CameraAvailabilityWindow`, o estado consolidado de uma câmera em 5 min, retido por 7 dias |
| Rollup | `CameraAvailabilityDailyRollup`, o resumo diário por câmera, retido por 90 dias |
| Escopo | Seleção de áreas, subáreas, interseções e rotas que recorta as câmeras do dashboard |
| Modo comparação | Resposta com uma quebra por entidade de escopo (`byScope`), ligado com duas ou mais entidades |
| Gate por valor | Comparação do hash do último frame emitido, que evita emitir widget que não mudou |
| Provisionado | Bitrate configurado no perfil da câmera, gravado na janela como aproximação quando ninguém assiste |
| VBR | Taxa de bits variável; o perfil informa "sem limite" em vez de um teto |
