---
id: S25-01
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2295
frente: Eventos de câmeras - front
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: Closed - entregue DENTRO da PR #951 (junto com 2289 e 2294)
atualizado: 2026-07-24
pr: https://github.com/atmanadmin/attlas-2026/pull/951
aliases:
  - "SOFTWARE-2295 - Side card de eventos integrado ao backend"
---

# S25-01 - Câmeras - Eventos, incidentes e alarmes - Side card de eventos integrado ao backend

O drawer lateral do evento (abas Geral + Histórico) rodava com dados mockados. A integração com o backend real saiu como parte da #951: o card puxa o detalhe completo do evento, e a aba Histórico consome a timeline nova da [[S25-08 - Câmeras - Eventos, incidentes e alarmes - Timeline pela cadeia do incidente|2294]] (cadeia do incidente + fallback de contexto de 30 min).

Nasceu como card próprio na divisão da tela de Eventos em três entregas (tela principal 2289, side card 2295, detalhes 2294), mas o commit já estava dentro da #951 quando a divisão foi feita, então fechou junto.

Frente: [[S25-09 - Câmeras - Eventos, incidentes e alarmes - Backend da tela de eventos de câmeras]].
