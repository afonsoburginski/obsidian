---
tags:
  - attlas
  - sprint-26
  - task
  - cameras
  - qa
  - dashboard
card: SOFTWARE-2318
clickup: https://app.clickup.com/t/86ajpnu4j
titulo: "[QA] Dashboard de câmeras — validação E2E de dados (front x banco)"
frente: Dashboard
tamanho: a estimar
status: validado (API+banco); front já estava ligado ao real desde 25/07 (SOFTWARE-2326, PR #1058, Closed); falta o e2e visual (Kong do dev defasado)
sprint: "[[Attlas - Sprint 26]]"
atualizado: 2026-07-28
---

# Dashboard de câmeras — validação E2E de dados

> Validação manual da tela de Dashboard de câmeras: KPIs, gauge, donuts, marcadores do mapa,
> heatmap de eventos, série de uptime, banda e tabelas de conectividade. Conferir se os valores
> exibidos batem com o que está persistido no banco (`ms-cameras`), não só com o esperado
> visualmente. Insumo pro relatório de QA repassado ao QA que entra semana que vem (~03/08).

## Objetivo

Validar, card a card do dashboard, se o número/gráfico exibido no front reflete corretamente a
agregação feita pelo backend sobre o dado real do Postgres — e corrigir ajustes pontuais
encontrados no caminho.

## Contexto

Backend construído na Sprint 25: [[Dashboard de câmeras - backend]] (SOFTWARE-2212 a 2219, PRs
#856-863). Endpoints cobrem KPIs, gauge, distribuição de conectividade, donuts (tipo/capacidade
analítica/incidentes), série de uptime, heatmap de eventos, marcadores do mapa e banda
(consumo/por área/comparação) + tabelas de conectividade (intermitentes/latência/degradação).

## Escopo da validação

- [x] KPIs + gauge + distribuição de conectividade
- [x] Donuts (tipo, capacidade analítica, incidentes)
- [x] Série de uptime
- [x] Heatmap de eventos
- [x] Marcadores do mapa
- [x] Banda (consumo, por área*, comparação) — *by-area não testado no caminho feliz (exige `ms-traffic-model`)
- [x] Tabelas de conectividade (intermitentes, latência, degradação)

## Resultado

Relatório completo: [[SOFTWARE-2318-dashboard-e2e-validation]].

Todos os 13 endpoints validados via API + cruzamento com Postgres — dados batem exatamente. Nenhum
bug de código encontrado. 2 achados: rollup diário do ambiente local parado em 24/07 (limitação de
dado, não bug) e 6 specs atômicas (UC-033/034/036/037/038/039) documentando a rota errada
(`/api/cameras/dashboard/*` em vez de `/api/dashboard/*` real) — corrigidas.

## Pendências

- [ ] `bandwidth-by-area` no caminho feliz — exige `ms-traffic-model` rodando (não estava no ar).
- [x] ~~Clique-a-clique no `web-attlas` — sessão sem ferramenta de browser.~~ Front já estava ligado
      ao backend real desde 25/07 ([[SOFTWARE-2326 - Integração do dashboard de câmeras com o backend real|SOFTWARE-2326]],
      PR #1058, Closed - inclusive com realtime via Socket.IO/Redis) — falta ainda o e2e visual pela
      tela, bloqueado pelo Kong do ambiente `dev.v2` estar defasado da develop (só a família
      `bandwidth` respondia no probe de 28/07).
- [ ] Rodar o job de rollup diário (ou reseed) antes de validar visualmente os gráficos de tendência,
      senão os últimos 2-3 dias aparecem vazios/zerados.
- Login real via `ms-organization` continua bloqueado pelo Kafka local (ver `local_dev_machine_setup`
  — memória do Claude); testado via JWT assinado manualmente, mesmo contorno de
  [[SOFTWARE-2317 - Fluxo E2E de cadastro de câmera]].

## Achados do clique-a-clique (28/07)

Card novo aberto no ClickUp ([SOFTWARE-2357](https://app.clickup.com/t/86ajr4e0z), status "code
review"):

- [x] **Sem largura limite** — o grid esticava full-bleed em monitor ultra-wide (nenhum ponto da
      cadeia `.dashboard`/`SystemLayout` tinha `max-width`). Corrigido na branch
      `cameras/feat/SOFTWARE-2326-2`, mesmo padrão já usado na home da Organization (`max-width`
      via token `--container-7xl` + `margin: auto`). PR [#1119](https://github.com/atmanadmin/attlas-2026/pull/1119) aberta (a #1058 já foi mergeada).
