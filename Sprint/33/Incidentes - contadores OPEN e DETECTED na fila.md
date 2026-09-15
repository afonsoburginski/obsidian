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


> [!warning] Estado em 15/09: a premissa acima não bate com o código
> A fila de incidentes (`analytics-incidents/pages/incidents`) não indexa nenhum tile por
> `DETECTED`/status do ciclo — os tiles ali são só por criticidade (Crítica/Alta/Média/Baixa). O campo
> `statusCounts` que a PR #3449 conserta existe em `ICameraIncidentsPage` mas não tem consumidor: nenhum
> componente da fila lê `page.statusCounts`. O único tile que desenha contagem por origem do ciclo é a
> face de Métricas (`analytics-metrics/utils/to-incident-metrics.util.ts`), que lê outro endpoint e já
> resolve `OPEN`/`DETECTED` sozinho, sem depender deste campo. A PR corrige a tradução da chave (bug
> real, o campo já existia e já estava sem consumidor antes dela) mas "o teste que prova a contagem na
> tela" não é possível como escrito — não há tela para provar. Card fica incompleto até decisão de
> produto: ou nasce o tile na fila (task nova), ou este card só preparava o campo e o texto acima está
> desatualizado.
