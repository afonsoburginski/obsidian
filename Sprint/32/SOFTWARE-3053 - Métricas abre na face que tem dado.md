---
tags:
  - attlas
  - task
  - sprint-32
  - analitico
card: SOFTWARE-3053
clickup: https://app.clickup.com/t/86akffme4
titulo: "[Front] Métricas abre na face que tem dado"
frente: Analítico
tamanho: 1 pts
pr: #3190
status: MERGEADA em 11/09 às 23:39 (#3190), base develop, ci-pr verde. Card fecha.
sprint: "[[Attlas - Sprint 32]]"
atualizado: 2026-09-11
---

# SOFTWARE-3053 - Métricas abre na face que tem dado

O conserto mais barato da pior aparência do módulo. Hoje a aba default é a ATSPM, que abre com 34 dos 38 cartões vazios porque só 4 métricas têm produtor. Trocar a face default não cria dado nenhum, só para de anunciar o vazio como se fosse a tela.

## Escopo

Spec-only. Entrega `UF-048-metrics-default-data-face.md`.

## Estado

PR #3190, aberta em 11/09 e sem review. Ela sobe na cascata que tem a
[[SOFTWARE-3057 - Refinamento de emergência das telas do Analítico|SOFTWARE-3057]] na base, e por
isso não dispara o `ci-pr.yml`, que só roda com base `develop`.

## Ver também

- [[Attlas - Sprint 32]] - a pilha inteira e a ordem de merge
