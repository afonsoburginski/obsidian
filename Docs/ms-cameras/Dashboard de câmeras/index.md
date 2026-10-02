---
tags:
  - doc
  - ms-cameras
  - dashboard
aliases:
  - "Dashboard de câmeras"
  - "00 - Dashboard de câmeras"
atualizado: 2026-10-01
---

# Dashboard de câmeras

Visão consolidada da rede de câmeras (RF-DSH-01): KPIs e distribuição de conectividade, tabela de
intermitência e latência, donuts de tipo e capacidade analítica, heatmap de eventos, mapa, série de uptime
e banda, filtrados por período e por escopo topológico, com atualização ao vivo por WebSocket. É uma camada
de agregação na hora da leitura sobre dados de outros domínios do [[ms-cameras]], sem tabela própria.
Backend em `apps/ms-cameras/src/dashboard/` (MOD-013 e UC-033 a UC-039, push UC-047), frontend no feature
module `apps/web-attlas/src/app/modules/cameras-dashboard/`, negócio em `docs/modules/cameras.md` seções
3.5 e 8.5.

## Notas deste domínio

- [[Dashboard de câmeras - Arquitetura e estratégias]] - mapa de código, rotas, fontes de cada widget,
  resolvedores de período e escopo, push ao vivo, cobertura do RF-DSH-01, pendências.
- [[Dashboard de câmeras - Fluxos]] - carga da tela, troca de filtro, conectividade, banda, push, reconexão
  e atualização manual.
- Explicação para o usuário final: [[Dashboard de câmeras - Como cada número é calculado]].

## Relacionados

[[ms-cameras]] · [[Saúde e monitoramento]] · [[Eventos, incidentes e alarmes]] · [[Cameras]] ·
[[Streaming - Banda e bitrate]]
