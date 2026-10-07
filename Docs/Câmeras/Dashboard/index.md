---
tags:
  - doc
  - cameras
  - dashboard
aliases:
  - "Câmeras - Dashboard"
  - "Dashboard de câmeras"
  - "00 - Dashboard de câmeras"
atualizado: 2026-10-07
---

# Câmeras - Dashboard

## Resumo

Visão consolidada da rede de câmeras do domínio [[Câmeras]]: KPIs e distribuição de conectividade, tabela de
intermitência e latência, donuts de tipo e capacidade analítica, heatmap de eventos, mapa, série de uptime e
banda, filtrados por período e por escopo topológico e atualizados ao vivo por WebSocket. É uma camada de
agregação na hora da leitura sobre tabelas de outros subdomínios, sem tabela própria. O backend está em
`apps/ms-cameras/src/dashboard/` e a tela em `apps/web-attlas/src/app/modules/cameras-dashboard/`.

## Notas

| Nota | Abra quando |
| --- | --- |
| [[Câmeras - Dashboard - Arquitetura e estratégias]] | precisa saber as rotas, de que tabela cada widget lê, como período e escopo são resolvidos, como o push funciona, como a banda é calculada, ou uma armadilha conhecida |
| [[Câmeras - Dashboard - Fluxos]] | precisa do passo a passo da carga da tela, da troca de filtro, da conectividade, da exportação, da banda, do push, da reconexão ou da atualização manual |

## Explicações para usuário

| Explicação | Abra quando |
| --- | --- |
| [[Câmeras - Dashboard - Explicação - Como cada número é calculado]] | alguém pergunta de onde vem um número dos cards de banda ou de conectividade |

## Diagramas

O Dashboard não tem desenho. A origem do bitrate que o dashboard soma está desenhada em
[[Câmeras - Streaming - Diagrama - Banda e bitrate.excalidraw|Streaming: banda]].
