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
status: validado (API+banco); falta clique-a-clique no web-attlas
sprint: "[[Attlas - Sprint 26]]"
atualizado: 2026-07-27
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
- [ ] Clique-a-clique no `web-attlas` — sessão sem ferramenta de browser.
- [ ] Rodar o job de rollup diário (ou reseed) antes de validar visualmente os gráficos de tendência,
      senão os últimos 2-3 dias aparecem vazios/zerados.
- Login real via `ms-organization` continua bloqueado pelo Kafka local (ver `local_dev_machine_setup`
  — memória do Claude); testado via JWT assinado manualmente, mesmo contorno de
  [[SOFTWARE-2317 - Fluxo E2E de cadastro de câmera]].
