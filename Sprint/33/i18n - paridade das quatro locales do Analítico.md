---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
card: SOFTWARE-3210
clickup: https://app.clickup.com/t/86akhq1k5
titulo: "[Front] Paridade das quatro locales depois das chaves novas do Analítico"
frente: Analítico
tamanho: 1 pts
pr: "[#3461](https://github.com/atmanadmin/attlas-2026/pull/3461)"
status: PR #3461 aberta em 14/09. As quatro locales ja estavam em paridade - nenhuma chave precisou nascer; o que entrou foi o guarda de paridade por slice (CROSS-122).
sprint: "[[Attlas - Sprint 33]]"
atualizado: 2026-09-14
---

# i18n - paridade das quatro locales do Analítico

A frente adicionou chaves novas - entre elas `analytics.metrics.virtualLoop.state.unavailable` - nas
quatro locales. Vale passar o conferidor de paridade para garantir que as quatro terminam com a mesma
contagem e sem chave órfã, agora que a #3328 também mexeu no catálogo de classes de objeto.
