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
status: to do
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

- [ ] KPIs + gauge + distribuição de conectividade
- [ ] Donuts (tipo, capacidade analítica, incidentes)
- [ ] Série de uptime
- [ ] Heatmap de eventos
- [ ] Marcadores do mapa
- [ ] Banda (consumo, por área, comparação)
- [ ] Tabelas de conectividade (intermitentes, latência, degradação)

## Pendências conhecidas (herdadas da validação de [[SOFTWARE-2317 - Fluxo E2E de cadastro de câmera]])

- Login real via `ms-organization` bloqueado pelo Kafka local (ver `local_dev_machine_setup` —
  memória do Claude); testar via API pode exigir o mesmo contorno de JWT assinado manualmente.
- web-attlas confirmado compilando e com proxy correto pro `ms-cameras` (porta 3300 direto,
  bypassando Kong em dev local).
