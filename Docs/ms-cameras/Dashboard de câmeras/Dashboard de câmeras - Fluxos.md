---
tags:
  - doc
  - ms-cameras
  - dashboard
atualizado: 2026-10-01
---

# Dashboard de câmeras - Fluxos

Parte do [[Dashboard de câmeras]]. Mecânica de cada agregação em
[[Dashboard de câmeras - Arquitetura e estratégias]]. Frontend em
`apps/web-attlas/src/app/modules/cameras-dashboard/`, backend em `apps/ms-cameras/src/dashboard/`.

## Fluxo 1: carregar a tela

1. `CamerasDashboardPageComponent` monta com período `D30` e escopo vazio (`CamerasDashboardStateService`).
2. `trigger$` (período, escopo e `refreshNonce`) emite e cada `widget()` dispara o seu fetch em paralelo:
   `kpis`, `uptime`, `connectivity-gauge`, `events-heatmap`, `map`, `type-distribution`,
   `connectivity-distribution`, `analytic-capacity`, `bandwidth-consumption` e `bandwidth-by-area`, mais
   `connectivity/intermittent` e `connectivity/latency` dentro do card de conectividade (Fluxo 3).
3. `CamerasDashboardService` monta `?period=&areas=&subareas=&intersections=&routes=` (`buildDashboardParams`)
   e chama `/api/dashboard/<rota>`; `System-Id`, `Authorization` e `x-locale` vêm dos interceptors globais.
4. No backend, `@RequireSystemDuty()` confere o pertencimento, `DashboardQueryDto` valida (período
   obrigatório, UUIDs por dimensão de escopo) e o controller executa o `Get<Widget>Query`.
5. O handler resolve escopo e período, agrega e devolve o contrato. Cada card tem o próprio `WidgetState`
   (`loading`, `empty`, `error`), então um widget em erro não derruba os outros.
6. Em paralelo, `DashboardLiveService.frames$()` abre o socket, emite `subscribe_dashboard` no `connect`,
   recebe `dashboard:subscribed` (o chip vira ao vivo) e passa a receber `dashboard:widget:update`,
   descartando frames enquanto espera o ack de uma nova assinatura (`awaitingResubscribeAck`).

## Fluxo 2: trocar período ou escopo

1. O usuário troca o período (`HOUR`, `H24`, `D7`, `D30`, `CUSTOM`) ou o escopo
   (`DashboardScopeFilterComponent`: área, subárea, interseção, rota; seleção múltipla liga a comparação).
2. `trigger$` reemite e todo widget refaz o fetch; `switchMap` cancela o anterior.
3. A página observa a mesma mudança e chama `live.resubscribe(systemId)`. No backend, o novo subscribe
   substitui a assinatura do socket, resolve o escopo de novo e limpa o gate por valor.
4. O servidor responde com `dashboard:subscribed` e o snapshot dos 12 widgets, que pousa por cima do
   resultado REST da mesma mudança.
5. Com duas ou mais entidades resolvíveis, os donuts de conectividade, tipo e severidade trazem `byScope`;
   o uptime traz uma série por entidade sempre que há escopo; o consumo de banda traz no bloco
   `consolidated` um total por escopo; os KPIs agregam a união, sem quebra por entidade.
6. Com qualquer filtro de escopo e um payload com `consolidated`, o card de consumo troca o gráfico pelo
   bloco numérico (dois totais, a utilização e a lista por escopo).

## Fluxo 3: conectividade

No frontend, o card (`components/dashboard-connectivity-tabs/`) busca intermitência e latência em paralelo,
primeira página de 100 linhas cada (`DASHBOARD_CONNECTIVITY_PAGE_SIZE`), junta as duas por `cameraId`
(`merge-intermittent-latency.util.ts`; câmera presente em só uma das listas fica com os campos da outra em
branco) e faz busca, ordenação e paginação no navegador, numa tabela única
(`DashboardIntermittentLatencyTableComponent`). Passou de 100 linhas em alguma das leituras, o card avisa
que a lista é parcial. Clicar numa linha abre o painel de saúde da câmera (`CameraHealthPanelComponent`).

No backend:

1. `ConnectivityTablesController` serve `intermittent`, `latency` e `degradation`, cada uma com DTO próprio
   sobre `ConnectivityListQueryBaseDto` (`page`, `pageSize`, `q`, `sortBy`, `sortDir`; página até 100; busca
   até 120 caracteres).
2. `ConnectivityCandidatesRepository` busca uma vez a população: câmeras não removidas em `OPERATIONAL` ou
   `TESTING`, com busca em nome e endereço pelo `PrismaListQueryBuilder`.
3. Cada builder calcula sobre a mesma leitura de saúde:
   - **Intermitência**: transições online para offline por dia no `CameraHeartbeatHistory` (HOUR e H24) ou
     `degradedWindows` do rollup (períodos em dias). Câmera sem queda aparece com zero.
   - **Latência**: média de `avgLatencyMs`; câmera sem amostra fica fora desta lista. Severidade: LOW até
     80 ms, MEDIUM até 130, HIGH até 180, CRITICAL acima.
   - **Degradação**: perfil PRIMARY ativo (câmera sem ele fica fora); saúde pela fração de janelas
     `DEGRADED` ou `OFFLINE`: OK abaixo de 10%, DEGRADED até 50%, POOR a partir de 50%; barras de resolução,
     fps e bitrate contra 1080p, 30 fps e 4000 kbps.
4. Intermitência e latência entram no push e chegam ao card por `liveIntermittent` e `liveLatency`;
   degradação não entra.

Exportação: o botão do topo delega ao card (`connectivityCard().exportAs(format)`). Sai a lista unificada
inteira já carregada, filtrada e ordenada, nunca um fetch novo; lista vazia ou leitura com erro viram toast,
e arquivo parcial sai com aviso. `ConnectivityExportService` gera CSV em memória ou, para XLSX, importa
`exceljs` sob demanda e escreve duas planilhas (dados e filtros).

## Fluxo 4: banda

- **Snapshot** (`GET /dashboard/bandwidth?cameraIds=`): agora, para a sessão ou para a rede. É o do VMS, ver
  [[Streaming - Banda e bitrate]].
- **Consumo, por área e comparação** (UC-038): o handler pede ao `BandwidthSeriesService`, uma vez para a
  união do escopo, a população, os perfis ativos e as janelas ou rollups, e fatia em memória por escopo ou
  área. As linhas que parecem bitrate provisionado saem de todos os números (ver a seção de banda da
  arquitetura).
- O card de consumo mostra o estado vazio sem buckets, o de área sem fatias; os dois continuam no DOM. O
  modal de comparação (`openBandwidthCompare()`) busca uma vez ao abrir, fora do push.
- Snapshot e série compartilham só a regra de escolha do perfil (`pickPreferredProfile`), para o valor ao vivo
  do VMS e a série do dashboard não divergirem sobre qual perfil é o bitrate da câmera.

## Fluxo 5: push, do lado do servidor

1. Uma escrita de domínio acontece: janela de disponibilidade fechada com mudança, transição de
   conectividade, evento novo, incidente correlacionado, CRUD de câmera, bitrate configurado diferente.
2. O handler chama `DashboardInvalidationPublisher.invalidateForCamera` ou `invalidateForSystem` com o domínio.
3. O publicador resolve o sistema, passa pela coalescência de 5 s e publica no `DashboardChangeBus`.
4. O bus despacha localmente e publica no canal Redis para as outras réplicas, que ignoram a própria
   mensagem pelo `origin`.
5. `DashboardPushService.onDomainChanged` marca o domínio sujo nas assinaturas do sistema nesta réplica e
   arma o debounce de 1500 ms.
6. No disparo, `DASHBOARD_DOMAIN_WIDGETS` traduz os domínios em widgets; até 4 composições em paralelo.
7. `DashboardWidgetComposer` roda o mesmo `Get*Query` do REST com o escopo congelado; o gate compara o hash.
8. `socket.emit('dashboard:widget:update', frame)` direto no socket. Falha de composição vira `errorCode` só
   no frame daquele widget.

## Fluxo 6: reconexão e saída

- **Reconexão**: o `connect` dispara de novo; o serviço reemite `subscribe_dashboard` com os filtros atuais e
  o snapshot completo é o catch-up. Não há replay de frames perdidos.
- **Queda momentânea**: `disconnect` e `connect_error` só mudam o chip para reconectando; os cards mantêm os
  últimos dados.
- **Subscribe recusado** (`VALIDATION_FAILED`, `FORBIDDEN_ACTION`, `RATE_LIMIT_EXCEEDED` pelo teto de
  assinaturas, ou resubscribe em menos de 300 ms): o Nest emite `exception` no socket e o chip vira erro, sem
  derrubar a conexão.
- **Saída da tela ou logout**: quando o último assinante sai, o teardown emite `unsubscribe_dashboard` e
  desconecta; no logout, todo socket do serviço é desconectado. No servidor, `handleDisconnect` libera a
  assinatura e atualiza o gauge de assinaturas.

## Fluxo 7: atualização manual

`refresh()` incrementa `refreshNonce` e refaz todos os fetches REST, sem novo `subscribe_dashboard`. Por
`REFRESH_FEEDBACK_MS` (600 ms) um clique repetido é ignorado pela guarda `refreshing` do método, porque o
`zLoading` sozinho não desabilita o botão do Zard.
