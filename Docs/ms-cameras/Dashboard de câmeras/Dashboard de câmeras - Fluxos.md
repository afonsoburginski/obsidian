---
tags:
  - doc
  - ms-cameras
  - cameras
  - dashboard
atualizado: 2026-08-24
---

# Dashboard de câmeras - Fluxos

> Parte do [[Dashboard de câmeras]]. Mecânica de cada agregação em
> [[Dashboard de câmeras - Arquitetura e estratégias]]. Fluxos descritos a partir de
> `apps/web-attlas/src/app/modules/cameras-dashboard/` e `apps/ms-cameras/src/dashboard/`.

## Fluxo 1: carregar a tela (primeiro load)

1. `CamerasDashboardPageComponent` monta com `period` e `scope` default (estado em
   `CamerasDashboardStateService`).
2. `trigger$` (period/scope + `refreshNonce`) emite uma vez -> cada `widget()` dispara seu fetch REST
   em paralelo (`kpis`, `uptime`, `connectivity-gauge`, `events-heatmap`, `map`, `type-distribution`,
   `connectivity-distribution`, `analytic-capacity`, `bandwidth-consumption`, `bandwidth-by-area`) mais
   as tabelas de conectividade (intermitência/latência/degradação, com sua própria paginação) dentro do
   card `DashboardConnectivityTabsComponent`.
3. Cada fetch chama `CamerasDashboardService`, que monta `?period=&areas=&subareas=&intersections=&routes=`
   via `buildDashboardParams` e bate em `/api/dashboard/<rota>`. `System-Id`/`Authorization`/`x-locale`
   entram pelos interceptors globais, não pelo service.
4. No backend, `@RequireSystemDuty()` valida a organização/sistema do JWT antes do controller;
   `DashboardQueryDto` valida o shape (`period` obrigatório, UUIDs por dimensão de escopo); o controller
   monta o `Get<Widget>Query` e executa via `QueryBus`.
5. O handler resolve escopo (se `resolvedScope` não veio pronto - só vem pronto no caminho do push) e
   período, agrega e devolve o contrato do widget. Um widget em erro isolado no seu próprio
   `catchError` - os demais continuam carregando normalmente (`WidgetState` por card, MOD-013 seção
   12.1, isolamento por widget).
6. Em paralelo, `DashboardLiveService.frames$()` abre o socket (`cameras-status`), emite
   `subscribe_dashboard { systemId, period, scope, from?, to? }` no `connect`, recebe
   `dashboard:subscribed` (chip vira "live") e passa a receber `dashboard:widget:update` - que a
   página descarta enquanto `awaitingResubscribeAck` está setado (evita aplicar frame da assinatura
   sendo substituída).

## Fluxo 2: trocar período ou escopo

1. Usuário troca o seletor de período (`HOUR`/`H24`/`D7`/`D30`/`CUSTOM`) ou o filtro de escopo
   (`DashboardScopeFilterComponent`: área, subárea, interseção, rota - múltipla seleção habilita modo
   comparação).
2. `CamerasDashboardStateService.queryParams` muda -> `trigger$` reemite -> todo `widget()` refaz o
   fetch REST (`switchMap` cancela o fetch anterior ainda em voo).
3. O construtor da página observa a mesma mudança (`toObservable(state.queryParams).pipe(skip(1))`) e
   chama `live.resubscribe(systemId)`: emite um novo `subscribe_dashboard` com os filtros atuais. No
   backend, o subscribe substitui a assinatura do mesmo socket, resolve escopo de novo (um novo walk de
   topologia se for área/subárea) e limpa o gate por valor.
4. O servidor responde com um novo `dashboard:subscribed` e um snapshot completo dos 12 widgets - que
   pousa silenciosamente por cima do resultado REST da mesma mudança (os dois canais convergem para o
   mesmo dado; o push nunca chega antes por causa do `awaitingResubscribeAck`).
5. Com >= 2 entidades de escopo resolvíveis, `comparisonMode = true`: os widgets que suportam
   comparação (uptime, KPIs, banda) devolvem uma série por entidade em vez de uma linha única de rede.
6. Escopo com uma única entidade filtrada (`hasScope()`) troca o card de banda para o bloco
   consolidado em vez do detalhamento por área.

## Fluxo 3: as três tabelas de conectividade (UC-039)

1. `ConnectivityTablesController` (`dashboard/connectivity/*`) recebe `intermittent`, `latency` ou
   `degradation`, cada uma com seu próprio DTO de paginação/busca/ordenação sobre a base comum
   `ConnectivityListQueryBaseDto` (`page`, `pageSize`, `q`, `sortBy`, `sortDir`; `MAX_PAGE_SIZE = 100`,
   `SEARCH_MAX_LENGTH = 120`).
2. `ConnectivityCandidatesRepository` busca a população elegível do tenant/escopo **uma vez**
   (`MAX_CANDIDATES = 5000`; acima disso a população é truncada e um warn é logado).
3. Cada builder (`IntermittentRowBuilder`, `LatencyRowBuilder`, `DegradationRowBuilder`) computa sua
   métrica sobre a mesma janela de telemetria de saúde já buscada, sem round-trip adicional por câmera:
   - **Intermitência** conta transições `online -> offline` por dia a partir do `CameraHeartbeatHistory`
     (períodos sub-dia, retenção ~24h) ou usa `degradedWindows` do rollup diário como proxy fora dessa
     retenção (D7/D30). Câmera com zero quedas ainda aparece - só telemetria ausente é zero-preenchida.
   - **Latência** reusa `averageLatency` (Saúde) sobre `avgLatencyMs` das windows/rollups; câmera sem
     nenhuma amostra no período é **excluída** (não existe zero legítimo de latência sem amostra).
     Severidade por `avgMs`: LOW <= 80ms, MEDIUM 80-130ms, HIGH 130-180ms, CRITICAL > 180ms.
   - **Degradação** lê o perfil de stream ativo (`CameraStreamProfile`) por câmera; sem perfil PRIMARY
     ativo, a câmera é excluída (nada a avaliar). `health` classifica pela fração de janelas
     DEGRADED/OFFLINE: OK < 10%, DEGRADED 10-50%, POOR >= 50%. As três barras de qualidade
     (resolução/fps/bitrate) são independentes de `health`, contra os máximos de referência (1080p,
     30fps, 4000 kbps).
4. Intermitência e latência entram no push (UC-047); degradação não (ver
   [[Dashboard de câmeras - Arquitetura e estratégias]]).
5. Export: o botão de download no topo da página delega ao card de conectividade montado
   (`connectivityCard().exportAs(format)`) - as linhas exportadas são as que o card já tem carregadas,
   nunca um fetch novo. `ConnectivityExportService` gera CSV in-memory ou, para XLSX, importa `exceljs`
   sob demanda e escreve duas planilhas (dados + filtros vigentes).

## Fluxo 4: banda (snapshot x série, UC-019 x UC-038)

Dois endpoints com propósitos diferentes, ambos em `BandwidthController`:

- **Snapshot** (`GET /dashboard/bandwidth?cameraIds=`): pergunta "agora, para esta sessão (ou para a
  rede)". Reusado como está pelo VMS - ver [[VMS - Banda e alertas]] para a mecânica completa
  (perfil preferido SECONDARY -> PRIMARY, só câmeras online E com perfil usável somam, `provisioned: true`
  quando o bitrate vem device-truth).
- **Série/por área/comparação** (UC-038): pergunta "como a banda se moveu no período".
  `BandwidthSeriesService` busca a população escopada, os perfis provisionados ativos
  (`CameraStreamProfile`) e as janelas/rollups de disponibilidade medidos (`avgBitrateMbps`,
  PROJ-005/006) **uma vez**, e os três handlers (`GetBandwidthConsumptionHandler`,
  `GetBandwidthByAreaHandler`, `GetBandwidthComparisonHandler`) fatiam esse mesmo conjunto por
  escopo/área sem reconsultar o banco.
- O card de consumo (`dashboard-bandwidth-consumption`) some quando a série não tem buckets; o de área
  (`dashboard-bandwidth-by-area`) some quando não há fatias. O modal de comparação
  (`openBandwidthCompare()`) busca uma vez com `take(1)` ao abrir - não é assinante do push.
- Os dois lados (snapshot e série) compartilham só a regra de seleção de perfil
  (`pickPreferredProfile`), de propósito, para o valor ao vivo do VMS e a série histórica do dashboard
  não divergirem sobre qual perfil é "o" bitrate da câmera.

## Fluxo 5: push realtime, do lado do servidor

1. Uma escrita de domínio ocorre (janela de disponibilidade fechou mudando de estado, evento de câmera
   novo, incidente correlacionado, CRUD de câmera, coletor de bitrate provisionado).
2. O handler daquela escrita chama `DashboardInvalidationPublisher.invalidateForCamera`/`invalidateForSystem`
   com o `DashboardInvalidateDomain` certo (`HEALTH`, `EVENTS`, `INCIDENTS`, `BANDWIDTH`, `INVENTORY`).
3. O publisher resolve o `systemId` (cache de 10 min se veio por `cameraId`), passa pelo coalescing
   Redis de 5s por `(systemId, domain)` e publica no `DashboardChangeBus`.
4. O bus despacha localmente e publica ~60 bytes no canal Redis `attlas:cameras:dashboard-change` para
   as outras réplicas (cada uma ignora a própria mensagem, filtrando por `origin`).
5. `DashboardPushService.onDomainChanged` marca o domínio sujo em toda assinatura daquele `systemId`
   **nesta réplica** (custo zero se não houver nenhuma) e arma um debounce de
   `DASHBOARD_PUSH_DEBOUNCE_MS` (default 1500ms) por assinatura.
6. No disparo do debounce, `DASHBOARD_DOMAIN_WIDGETS` traduz os domínios sujos acumulados para a lista
   de widgets a recompor; até 4 composições rodam em paralelo por assinatura
   (`MAX_CONCURRENT_WIDGET_COMPOSITIONS`).
7. Cada widget é recomposto pelo `DashboardWidgetComposer`, que chama o **mesmo** `Get*Query` do REST
   com o escopo congelado da assinatura; o hash do payload é comparado ao último enviado
   (`dashboard-value-gate.util.ts`) - só sai frame se algo mudou.
8. `socket.emit('dashboard:widget:update', frame)` vai direto pro socket assinante (nunca por room,
   DR-7). Uma falha de composição emite `errorCode` no frame daquele widget só, sem afetar os outros.

## Fluxo 6: reconexão e desconexão

- **Reconexão**: o evento `connect` do socket.io-client dispara de novo em toda reconexão (não só na
  primeira). A página reemite `subscribe_dashboard` com os filtros atuais; o snapshot completo do
  servidor é o catch-up - não existe replay de frames perdidos.
- **Perda momentânea**: `disconnect`/`connect_error` só mudam o chip para "reconectando" - a página
  mantém os últimos dados bons nos cards, nunca limpa a tela.
- **Rejeição do subscribe** (`WsException`: `VALIDATION_FAILED`, `FORBIDDEN_ACTION` por membership,
  `RATE_LIMIT_EXCEEDED` por teto de assinaturas ou resubscribe muito rápido): Nest emite `exception` no
  socket, que a página traduz para o chip "erro" sem derrubar a conexão.
- **Saída da tela / logout**: `unsubscribe_dashboard` no `ngOnDestroy` do stream (via `finalize` do
  `shareReplay`), ou desconexão total no logout (`AuthService.isAuthenticated()` false desconecta todo
  socket vivo do `DashboardLiveService`). No servidor, `handleDisconnect` chama
  `dashboardPush.release(client.id)` - libera a assinatura e zera o gauge de assinaturas.

## Fluxo 7: refresh manual

`refresh()` na página incrementa `refreshNonce` (parte do `trigger$`) - refaz todos os fetches REST
como se período/escopo tivessem mudado, mas **não** dispara um novo `subscribe_dashboard` (o push
continua com a assinatura vigente, que já está atualizada). O botão fica desabilitado por
`REFRESH_FEEDBACK_MS` para não permitir clique repetido durante a janela de feedback.

## Relacionados

[[Dashboard de câmeras]] · [[Dashboard de câmeras - Arquitetura e estratégias]] ·
[[Saúde e monitoramento]] · [[VMS - Banda e alertas]] · [[Eventos, incidentes e alarmes]]
