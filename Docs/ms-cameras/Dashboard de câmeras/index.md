---
tags:
  - doc
  - ms-cameras
  - cameras
  - dashboard
aliases:
  - "Dashboard de câmeras"
  - "00 - Dashboard de câmeras"
atualizado: 2026-08-24
---

# Dashboard de câmeras (ms-cameras)

> Submódulo do [[ms-cameras]]. Backend: **MOD-013 dashboard-aggregation** (fundação de período/escopo,
> sem endpoint próprio) mais **UC-033 a UC-039** (um card por atômica) mais **UC-047
> dashboard-realtime-push** (substitui a UC-045, retirada). Frontend: feature module
> `cameras-dashboard`. Contexto de negócio: `docs/modules/cameras.md` seção 3.5 e 8.5, RF-DSH-01.

> [!info] Estado em 24/08: primeira nota do domínio no vault
> Zero notas existiam antes deste lote (Lote 2 do plano de documentação). **63 commits** em
> `apps/ms-cameras/src/dashboard/` desde 03/07, do PR de fundação (SOFTWARE-2212, 22/07) aos fixes de
> concorrência do push realtime (24/07). O trilho de spec já existe no repo (`apps/ms-cameras/docs/`):
> MOD-013 e sete atômicas UC-033 a UC-039 mais UC-047 (supersede UC-045). O frontend passou a falar com
> o backend real (não mock) a partir da PR #1058 (`cameras/feat/SOFTWARE-2326-2`, tabelas de
> conectividade reais + invalidação realtime) - o comentário de topo de
> `cameras-dashboard.service.ts` confirma: "All widgets are backed by real `/api/dashboard/*`
> endpoints".

## O que o dashboard é

Uma camada de **agregação read-time multi-câmera** sobre dados que já existem em outros domínios do
`ms-cameras`. Nenhum widget tem tabela própria: todo `Get*Handler` lê `Camera`,
`CameraAvailabilityWindow`/`CameraAvailabilityDailyRollup` (Saúde, MOD-003), `CameraHeartbeatHistory`
(Saúde), `CameraEventLog`/`CameraIncident` (Eventos e Incidentes) ou `CameraStreamProfile`
(Integração com dispositivo) e monta o payload do widget na hora da requisição. A fundação comum
(MOD-013) resolve duas coisas que todo widget precisaria resolver sozinho: **período** (mapeia
`EnumDashboardPeriod` para janela + granularidade de bucket + tabela-fonte) e **escopo** (mapeia
área/subárea/interseção/rota para o conjunto de `Camera.trafficElementId` a agregar).

Ver [[Dashboard de câmeras - Arquitetura e estratégias]] para a mecânica de cada agregação e
[[Dashboard de câmeras - Fluxos]] para o fluxo de tela por tela.

## Mapa de código

| Área | Caminho no repo |
| --- | --- |
| Fundação (período + escopo + DTO) | `apps/ms-cameras/src/dashboard/shared/` |
| KPIs + gauge + distribuição de conectividade (UC-033) | `apps/ms-cameras/src/dashboard/connectivity/` |
| Tabelas de conectividade: intermitência, latência, degradação (UC-039) | `apps/ms-cameras/src/dashboard/connectivity-tables/` |
| Donuts: tipo, capacidade analítica, severidade de incidente (UC-034) | `apps/ms-cameras/src/dashboard/distribution/` |
| Heatmap de eventos (UC-036) | `apps/ms-cameras/src/dashboard/heatmap/` |
| Marcadores do mapa (UC-037) | `apps/ms-cameras/src/dashboard/map/` |
| Série de uptime (UC-035) | `apps/ms-cameras/src/dashboard/uptime/` |
| Banda: snapshot da sessão + série/por área/comparação (UC-019, UC-038) | `apps/ms-cameras/src/dashboard/bandwidth/` |
| Push realtime por widget (UC-047) | `apps/ms-cameras/src/dashboard/realtime/` |
| Wiring do módulo Nest | `apps/ms-cameras/src/dashboard/dashboard.module.ts` |
| Gateway WS compartilhado (recebe `subscribe_dashboard`) | `apps/ms-cameras/src/cameras/realtime/camera-status.gateway.ts` |
| Publisher de invalidação (liga escritas de domínio ao push) | `apps/ms-cameras/src/cameras/realtime/dashboard-invalidation.publisher.ts` |
| Contratos (~35 interfaces, `EnumDashboardPeriod`, `IDashboardScope`, `i-dashboard-*`) | `libs/contracts/src/lib/camera/dashboard/` |
| Frontend (página + cards + serviços) | `apps/web-attlas/src/app/modules/cameras-dashboard/` |
| Especificações do domínio | `apps/ms-cameras/docs/modules/MOD-013-dashboard-aggregation.md`, `apps/ms-cameras/docs/atomic/UC-033..039`, `UC-045`, `UC-047` |

Sem diagrama Excalidraw ainda - lacuna conhecida da pasta `Diagramas/` (que vai de MOD-001 a MOD-008 e
para Streaming, mas não tem MOD-013).

## Superfície HTTP

Todas sob o prefixo global `/api`, autenticadas por JWT (Kong) e por `@RequireSystemDuty()` (escopo de
organização/sistema do header `System-Id`). 16 rotas REST GET mais o canal WS compartilhado com a
Saúde (o "~17 rotas" do diagnóstico do plano fecha exatamente ao contar o canal WS como a 17ª via de
acesso ao dominio).

| Controller | Rotas | UC |
| --- | --- | --- |
| `ConnectivityController` (`dashboard/`) | `kpis`, `connectivity-gauge`, `connectivity-distribution` | UC-033 |
| `ConnectivityTablesController` (`dashboard/connectivity/`) | `intermittent`, `latency`, `degradation` | UC-039 |
| `DistributionController` (`dashboard/`) | `type-distribution`, `analytic-capacity`, `incident-severity` | UC-034 |
| `EventsHeatmapController` (`dashboard/`) | `events-heatmap` | UC-036 |
| `MapController` (`dashboard/`) | `map` | UC-037 |
| `UptimeController` (`dashboard/`) | `uptime` | UC-035 |
| `BandwidthController` (`dashboard/`) | `bandwidth`, `bandwidth-consumption`, `bandwidth-by-area`, `bandwidth-comparison` | UC-019, UC-038 |
| `CameraStatusGateway` (WS, namespace `cameras-status`) | `subscribe_dashboard` / `unsubscribe_dashboard` | UC-047 |

> [!warning] Pendência conhecida: `ms-cameras` ocupa `/api/dashboard` na raiz, sem prefixo próprio
> Todas as rotas REST acima vivem em `docker/kong.yml` como `/api/dashboard/*` (paths explícitos,
> `strip_path: false`), **não** `/api/cameras/dashboard/*`. É namespace de topo compartilhável por
> qualquer outro microsserviço que um dia precise de um endpoint `/api/dashboard/algo` - hoje não há
> colisão porque nenhum outro serviço usa o prefixo, mas o isolamento por serviço que o resto do
> `ms-cameras` segue (`/api/cameras/*`, `/api/vms/*`) não se aplica aqui. Registrado como pendência
> conhecida por pedido explícito deste lote - não é para corrigir agora.

## Domínio próprio x compartilhado

| Widget/família | Fonte dos dados | Dono do dado |
| --- | --- | --- |
| KPIs, gauge, distribuição de conectividade | `CameraAvailabilityWindow`/`CameraAvailabilityDailyRollup` via `ConnectivityAggregationService` | Saúde (MOD-003) |
| Tabela de intermitência | `CameraHeartbeatHistory` (períodos sub-dia) ou `degradedWindows` do rollup diário (D7/D30) | Saúde |
| Tabela de latência | `avgLatencyMs` das mesmas windows/rollups de disponibilidade | Saúde |
| Tabela de degradação | `CameraStreamProfile` (resolução/fps/bitrate) mais a mesma janela de saúde para o tier | Integração com dispositivo + Saúde |
| Donuts de tipo e capacidade analítica | `Camera` (`groupBy` de tipo/capacidades) | Cameras (CRUD) |
| Donut de severidade de incidente | `CameraIncident` (`groupBy` de severidade) | Eventos, incidentes e alarmes |
| Heatmap de eventos | `CameraEventLog` (`groupBy` + bucket SQL) | Eventos, incidentes e alarmes |
| Marcadores do mapa | `Camera` + `CameraEventLog` | Cameras + Eventos |
| Série de uptime | `CameraAvailabilityWindow`/`CameraAvailabilityDailyRollup` | Saúde |
| Banda (snapshot da sessão) | `CameraStreamProfile` mais `CameraHealthSnapshotRepository` (online) | Integração com dispositivo + Saúde, ver [[VMS - Banda e alertas]] |
| Banda (série/por área/comparação) | `CameraStreamProfile` (provisionado) mais `CameraAvailabilityWindow`/`DailyRollup` (medido, `avgBitrateMbps`) | Integração com dispositivo + Saúde |
| Resolver de período/escopo (MOD-013) | `Camera.trafficElementId` mais topologia do `ms-traffic-model` (UC-025, cacheada) | Cameras + `ms-traffic-model` |
| Push realtime (UC-047) | Reexecuta os mesmos `Get*Query` acima via `QueryBus` | O mesmo de cada widget |

**Não existe uma única tabela Prisma dedicada ao dashboard.** É o domínio inteiro do `ms-cameras` visto
por período e escopo - a fundação (MOD-013) e o subsistema de push (UC-047) são a única coisa que o
dashboard de fato possui.

## Realtime: o dashboard compartilha o socket da Saúde, não tem gateway próprio

`subscribe_dashboard`/`unsubscribe_dashboard` são mensagens do **mesmo** `CameraStatusGateway`
(namespace `cameras-status`, path `/api/cameras/status/realtime`) que atende `subscribe_camera` e
`subscribe_videowall`. A UC-047 decidiu explicitamente não criar gateway novo (DR-1). Consequência
prática: o `web-attlas` abre **um socket por sistema**, compartilhado entre o chip "ao vivo" do
dashboard e qualquer assinatura de status de câmera/videowall que a mesma sessão tenha aberta. Ver
[[Saúde e monitoramento]] e [[Status em tempo real]] para o resto do que esse gateway carrega.

## Pendências e achados desta revisão (24/08)

> [!warning] `UC-047-dashboard-realtime-push.md` (atualizado 02/08) está desatualizado quanto à DR-11
> O doc do repo descreve a validação de membership de tenant no WS como "dívida declarada" com "gancho
> pronto, CROSS-007" ainda em aberto. O código já fechou isso: o commit `b397f2f5e5` ("fix: exige
> membership de sistema no dashboard (WS + REST) e endurece a validacao do subscribe") adicionou
> `@RequireSystemDuty()` nos sete controllers REST listados acima **e** `assertSystemMembership()` no
> `subscribe_dashboard`/`subscribe_videowall` do gateway - confirmado lendo
> `camera-status.gateway.ts` hoje. Achado de código vs. doc do repo, não editado (fora do escopo deste
> lote de vault) - fica registrado aqui para quem for tocar UC-047 de novo atualizar o arquivo do
> repo.

> [!info] Dois widgets ficam fora do push realtime, só pull (por decisão, não por lacuna)
> `BANDWIDTH_COMPARISON` (o modal de comparação) e a tabela de **degradação** de stream não estão no
> enum `DashboardWidget` nem no `DASHBOARD_DOMAIN_WIDGETS` (`dashboard-widget-domain.map.ts`) - o
> `DashboardWidgetComposer` não tem `case` para nenhum dos dois. Os outros 10 widgets mais as duas
> tabelas de intermitência/latência (12 no total) recompõem e empurram frame a cada mudança de domínio
> relevante. Comparação e degradação continuam servidos só pelo REST (`getBandwidthComparison`,
> `getDegradation` no `cameras-dashboard.service.ts` do front, chamados sob demanda).

> [!info] Limiares de severidade de latência e degradação ainda não validados por design/produto
> `LatencySeverity` (BR-CT-02: 80/130/180 ms) e `DegradationReference` (BR-CT-03: 10%/50% de janelas
> não saudáveis) trazem o comentário explícito "pending design/product confirmation" - os valores
> vieram do mock que existia no frontend antes do backend real (SOFTWARE-2219), não de uma decisão de
> produto revisada. Não é bug, é decisão em aberto documentada no próprio código.

> [!info] Exportação XLSX/CSV (RF-DSH-01) é só frontend, sem endpoint de export no backend
> `ConnectivityExportService` (`apps/web-attlas/.../cameras-dashboard/services/connectivity-export.service.ts`)
> gera o arquivo no browser a partir das linhas que o card de conectividade já buscou (CSV síncrono,
> XLSX via `exceljs` importado sob demanda) - não existe uma rota `/api/dashboard/.../export` no
> `ms-cameras`. O arquivo nunca pode divergir da tela porque é literalmente a mesma resposta já
> renderizada.

## Rastreabilidade

- Contexto de negócio: `docs/modules/cameras.md` seção 3.5 e 8.5 - RF-DSH-01 (dashboard consolidado:
  conectividade, operacional, incidentes, rede, exportável em XLSX/CSV).
- Fundação: `MOD-013-dashboard-aggregation` (SOFTWARE-2212).
- Widgets: `UC-033-dashboard-kpis-connectivity` (SOFTWARE-2213), `UC-034-dashboard-distribution-donuts`
  (SOFTWARE-2214), `UC-035-dashboard-uptime-series` (SOFTWARE-2215), `UC-036-dashboard-events-heatmap`
  (SOFTWARE-2216), `UC-037-dashboard-map-markers` (SOFTWARE-2217), `UC-038-dashboard-bandwidth-series`
  (SOFTWARE-2218), `UC-039-dashboard-connectivity-tables` (SOFTWARE-2219, backend real em SOFTWARE-2326,
  PR #1058).
- Realtime: `UC-045-dashboard-realtime-invalidation` (superseded) e `UC-047-dashboard-realtime-push`
  (SOFTWARE-2326, épico SOFTWARE-1899).
- Regras de negócio citadas no código: `BR-DSH-01` a `BR-DSH-05` (período/escopo/tendência), `BR-CT-01`
  a `BR-CT-04` (tabelas de conectividade), `BR-BW-01` a `BR-BW-04` (banda), `BR-RTP-01` a `BR-RTP-05`
  (push realtime).
- Edital seção 4.6 (Dashboard / monitoramento em tempo real).

## Notas deste domínio

- [[Dashboard de câmeras - Arquitetura e estratégias]] - fundação de período/escopo, mecânica de cada
  agregação, o subsistema de push realtime, decisões de design (DR-1 a DR-11 da UC-047).
- [[Dashboard de câmeras - Fluxos]] - fluxo de carregamento de cada família de card, troca de
  filtro/comparação, assinatura e recomposição do push, export.

## Relacionados

[[ms-cameras]] · [[Saúde e monitoramento]] · [[Status em tempo real]] ·
[[Eventos, incidentes e alarmes]] · [[Cameras]] · [[Streaming]] · [[VMS]] ·
[[VMS - Banda e alertas]] · [[Plano - atualização da documentação do vault]]
