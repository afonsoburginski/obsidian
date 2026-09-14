---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
card: SOFTWARE-3185
clickup: https://app.clickup.com/t/86akhpeuv
titulo: "[Full] Contadores `OPEN` e `DETECTED` na fila de incidentes"
frente: Analítico
tamanho: 1 pts
pr: "#3449"
status: "PR #3449 aberta: a tradução `OPEN` -> `DETECTED` que o filtro já fazia na ida passa a ser feita na volta, na mesma borda, em vez de renomear um dos dois vocabulários - no backend `DETECTED` é um estado legítimo e distinto do ciclo de `CameraIncident`."
sprint: "[[Attlas - Sprint 33]]"
atualizado: 2026-09-13
---

# Incidentes - contadores `OPEN` e `DETECTED` na fila

`list-camera-events.handler.ts` devolve `statusCounts` com a chave `OPEN` e a página indexa os tiles por
`DETECTED`, então o tile correspondente mostra zero. O filtro já foi corrigido numa frente anterior; os
contadores não.

## O que o card faz

Uma chave só nas duas pontas, com o teste que prova a contagem na tela.
