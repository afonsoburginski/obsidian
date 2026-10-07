---
tags:
  - doc
  - cameras
  - dashboard
aliases:
  - "Dashboard de câmeras - Fluxos"
atualizado: 2026-10-07
---

# Câmeras - Dashboard - Fluxos

Volta para [[Câmeras - Dashboard]].

## Resumo

A mecânica de cada agregação está em [[Câmeras - Dashboard - Arquitetura e estratégias]]; aqui fica a ordem dos
passos. Frontend em `apps/web-attlas/src/app/modules/cameras-dashboard/`, backend em
`apps/ms-cameras/src/dashboard/`.

| Fluxo | Gatilho | Resultado |
| --- | --- | --- |
| Carregar a tela | Abrir `/cameras/dashboard` | Todos os cards buscados em paralelo e o canal ao vivo assinado |
| Trocar período ou escopo | Filtro do topo | Todos os cards refeitos e a assinatura ao vivo trocada |
| Conectividade | Carga da tela ou troca de filtro | Tabela única de intermitência e latência, com busca e ordenação no navegador |
| Exportar a conectividade | Botão de exportação do topo | Arquivo CSV ou XLSX da lista já carregada |
| Banda | Carga da tela, troca de filtro ou abertura do modal de comparação | Série de consumo, banda por área e comparação |
| Push do servidor | Escrita de dado de origem em outro subdomínio | Frame do widget afetado no socket de cada assinante |
| Reconexão e saída | Queda do socket, saída da tela ou logout | Catch-up pelo snapshot completo, ou assinatura liberada |
| Atualização manual | Botão de atualizar | Todos os fetches REST refeitos |

## Carregar a tela

**Gatilho.** O usuário abre `/cameras/dashboard`.

**Passos.**

1. `CamerasDashboardPageComponent` monta com período `D30` e escopo vazio (`CamerasDashboardStateService`).
2. `trigger$` (parâmetros e `refreshNonce`) emite, e cada `widget()` dispara o seu fetch em paralelo: `kpis`,
   `uptime`, `connectivity-gauge`, `events-heatmap`, `map`, `type-distribution`, `connectivity-distribution`,
   `analytic-capacity`, `bandwidth-consumption` e `bandwidth-by-area`, mais `connectivity/intermittent` e
   `connectivity/latency` dentro do card de conectividade.
3. `CamerasDashboardService` monta `?period=&areas=&subareas=&intersections=&routes=` (`buildDashboardParams`) e
   chama `/api/dashboard/<rota>`; `System-Id`, `Authorization` e `x-locale` vêm dos interceptors globais.
4. No backend, `@RequireSystemDuty()` confere o pertencimento, `DashboardQueryDto` valida e o controller executa
   o `Get<Widget>Query`.
5. O handler resolve escopo e período, agrega e devolve o contrato.
6. Em paralelo, `DashboardLiveService.frames$()` abre o socket, emite `subscribe_dashboard` no `connect`, recebe
   `dashboard:subscribed` (o chip vira ao vivo) e passa a receber `dashboard:widget:update`, descartando frames
   enquanto espera o ack de uma nova assinatura (`awaitingResubscribeAck`).

**Resultado.** Cada card tem o próprio estado (`loading`, `empty`, `error`), então um widget em erro não derruba
os outros.

**Erros.**

| Código | HTTP | Quando |
| --- | --- | --- |
| `VALIDATION_FAILED` | 400 | Período ausente ou UUID inválido no escopo |
| `TOO_MANY_SCOPES` (detalhe de `INVALID_INPUT`) | 400 | Mais de 6 entidades de escopo |
| `FORBIDDEN_ACTION` | 403 | Requisitante fora do sistema |
| `EXTERNAL_SERVICE_ERROR` | 502 | `ms-traffic-model` fora do ar com escopo de área ou subárea |

## Trocar período ou escopo

**Gatilho.** O usuário troca o período (`HOUR`, `H24`, `D7`, `D30`, `CUSTOM`) ou o escopo no
`DashboardScopeFilterComponent` (área, subárea, interseção, rota; seleção múltipla liga a comparação).

**Passos.**

1. `trigger$` reemite e todo widget refaz o fetch; `switchMap` cancela o pedido anterior.
2. A página observa a mesma mudança e chama `live.resubscribe(systemId)`. No backend, o novo subscribe substitui
   a assinatura do socket, resolve o escopo de novo e limpa o gate por valor.
3. O servidor responde com `dashboard:subscribed` e o snapshot dos 12 widgets, que pousa por cima do resultado
   REST da mesma mudança.

**Resultado.**

- Com duas ou mais entidades resolvíveis, os donuts de conectividade, tipo e severidade trazem `byScope`.
- O uptime traz uma série por entidade sempre que há escopo.
- O consumo de banda traz no bloco `consolidated` um total por escopo; com qualquer filtro de escopo, o card
  troca o gráfico pelo bloco numérico (dois totais, a utilização e a lista por escopo).
- Os KPIs agregam a união, sem quebra por entidade.

**Erros.** Os mesmos da carga da tela.

## Conectividade

**Gatilho.** Carga da tela ou troca de filtro, no card `components/dashboard-connectivity-tabs/`.

**Passos.**

1. O card busca intermitência e latência em paralelo, primeira página de 100 linhas cada
   (`DASHBOARD_CONNECTIVITY_PAGE_SIZE`).
2. No backend, `ConnectivityTablesController` recebe o DTO de cada tabela sobre `ConnectivityListQueryBaseDto`
   (`page`, `pageSize`, `q`, `sortBy`, `sortDir`; página até 100, busca até 120 caracteres).
3. `ConnectivityCandidatesRepository` busca uma vez a população: câmeras não removidas em `OPERATIONAL` ou
   `TESTING`, com busca em nome e endereço pelo `PrismaListQueryBuilder`.
4. Cada builder calcula sobre a mesma leitura de saúde (regras na nota de arquitetura): intermitência por quedas,
   latência por média e severidade.
5. O card junta as duas listas por `cameraId` (`merge-intermittent-latency.util.ts`); câmera presente em só uma
   das listas fica com os campos da outra em branco.
6. Busca, ordenação e paginação acontecem no navegador, na tabela única
   `DashboardIntermittentLatencyTableComponent`.
7. Intermitência e latência também chegam pelo push, nos inputs `liveIntermittent` e `liveLatency`.

**Resultado.** Tabela única de conectividade. Passou de 100 linhas em alguma das leituras, o card avisa que a
lista é parcial. Clicar numa linha abre o painel de saúde da câmera (`CameraHealthPanelComponent`).

**Erros.** Falha de uma das leituras mostra o estado de erro do card; a tabela de degradação não é buscada pela
tela.

## Exportar a conectividade

**Gatilho.** O botão de exportação do topo, que delega ao card (`connectivityCard().exportAs(format)`).

**Passos.**

1. Pega a lista unificada inteira já carregada, filtrada e ordenada; não faz fetch novo.
2. `ConnectivityExportService` gera o CSV em memória ou, para XLSX, importa `exceljs` sob demanda e escreve duas
   planilhas (dados e filtros).

**Resultado.** Arquivo baixado no navegador. Arquivo de lista parcial sai com aviso.

**Erros.** Lista vazia ou leitura com erro viram toast, sem arquivo.

## Banda

**Gatilho.** Carga da tela ou troca de filtro para consumo e por área; abertura do modal de comparação
(`openBandwidthCompare()`) para a comparação.

**Passos.**

1. O handler pede ao `BandwidthSeriesService`, uma vez para a união do escopo, a população, os perfis ativos e as
   janelas ou rollups.
2. Fatia em memória por escopo ou por área.
3. As linhas que parecem bitrate provisionado e os valores de sentinela VBR saem de todos os números.

**Resultado.** O card de consumo mostra o estado vazio sem buckets, e o de área sem fatias; os dois continuam no
DOM. A comparação é buscada uma vez ao abrir o modal e fica fora do push. O snapshot `GET /dashboard/bandwidth`
é o do VMS (ver [[Câmeras - Streaming - Banda e bitrate]]); snapshot e série compartilham só a regra de escolha do
perfil (`pickPreferredProfile`).

**Erros.** `ms-traffic-model` fora do ar no por área responde 502, porque o agrupamento por área não tem resposta
degradada.

## Push do servidor

**Gatilho.** Uma escrita de origem: janela de disponibilidade fechada com mudança, transição de conectividade,
evento novo, incidente correlacionado, CRUD de câmera ou bitrate configurado diferente.

**Passos.**

1. O handler de origem chama `DashboardInvalidationPublisher.invalidateForCamera` ou `invalidateForSystem` com o
   domínio.
2. O publicador resolve o sistema, passa pela coalescência de 5 s e publica no `DashboardChangeBus`.
3. O bus despacha localmente e publica no canal Redis para as outras réplicas, que ignoram a própria mensagem
   pela origem.
4. `DashboardPushService.onDomainChanged` marca o domínio sujo nas assinaturas do sistema nesta réplica e arma o
   debounce de 1500 ms.
5. No disparo, `DASHBOARD_DOMAIN_WIDGETS` traduz os domínios em widgets, com até 4 composições em paralelo.
6. `DashboardWidgetComposer` roda o mesmo `Get*Query` do REST com o escopo congelado, e o gate compara o hash.
7. `socket.emit('dashboard:widget:update', frame)` direto no socket.

**Resultado.** Só os widgets cujo valor mudou chegam ao navegador, e o card aplica o frame sem skeleton.

**Erros.** Falha de composição vira `errorCode` só no frame daquele widget; o frontend descarta o frame e mantém
o último dado bom.

## Reconexão e saída

**Gatilho.** Queda do socket, saída da tela ou logout.

**Passos.**

1. Na queda momentânea, `disconnect` e `connect_error` só mudam o chip para reconectando; os cards mantêm os
   últimos dados.
2. Na reconexão, o `connect` dispara de novo e o serviço reemite `subscribe_dashboard` com os filtros atuais; o
   snapshot completo é o catch-up, sem replay de frames perdidos.
3. Na saída da tela, quando o último assinante sai, o teardown emite `unsubscribe_dashboard` e desconecta; no
   logout, todo socket do serviço é desconectado.
4. No servidor, `handleDisconnect` libera a assinatura e atualiza o gauge de assinaturas.

**Resultado.** A tela volta ao vivo sem recarregar, ou a réplica para de compor para aquele socket.

**Erros.** Subscribe recusado faz o Nest emitir `exception` no socket, e o chip vira erro sem derrubar a
conexão.

| Código | Quando |
| --- | --- |
| `VALIDATION_FAILED` | `systemId`, período ou escopo inválido no payload, ou `CUSTOM` sem `from` e `to` |
| `FORBIDDEN_ACTION` | Requisitante fora do sistema |
| `RATE_LIMIT_EXCEEDED` | Teto de assinaturas da réplica atingido, ou novo subscribe do mesmo socket em menos de 300 ms |

## Atualização manual

**Gatilho.** O botão de atualizar do topo.

**Passos.**

1. `refresh()` incrementa `refreshNonce`.
2. `trigger$` reemite e todos os fetches REST são refeitos, sem novo `subscribe_dashboard`.
3. Por `REFRESH_FEEDBACK_MS` (600 ms), um clique repetido é ignorado pela guarda `refreshing` do método, porque o
   `zLoading` sozinho não desabilita o botão do Zard.

**Resultado.** Todos os cards recarregam com skeleton.

**Erros.** Os mesmos da carga da tela, card a card.
