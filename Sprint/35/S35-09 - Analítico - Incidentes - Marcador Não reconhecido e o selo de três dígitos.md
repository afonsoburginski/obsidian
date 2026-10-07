---
id: S35-09
tags:
  - attlas
  - task
  - sprint-35
  - analitico
  - incidentes
  - issues
  - frontend
titulo: "[Front] Marcador \"Não reconhecido\" com contador e selo do pino com três dígitos em Incidentes"
frente: Incidentes
pr: "#5140, #5146"
issues: "#4963, #4965"
status: "Feita. #5140 mergeada em 29/09 às 13h40 e #5146 às 14h28; as duas issues fechadas no mesmo dia."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-09 - Analítico - Incidentes - Marcador Não reconhecido e o selo de três dígitos

## O que estava errado

- **#4963**: no mapa de Incidentes, o número sobre o pino da câmera vazava do círculo com três dígitos,
  porque o selo tinha largura fixa para dois.
- **#4965**: a faixa de filtros acima da busca só tinha os marcadores de criticidade. Faltava o
  "Não reconhecido" com o número de incidentes nesse estado, como no protótipo.

## O que as PRs entregaram

- **#5140**: o selo vira pílula, continua redondo com um e dois dígitos, mostra a contagem inteira e cresce
  para fora do pino, sem cobrir a câmera.
- **#5146**: o marcador "Não reconhecido" entra num grupo próprio, à direita das criticidades. O contador
  lê a contagem por status que já vinha na mesma resposta da fila, e o clique alterna o mesmo filtro de
  status do funil, então os dois nunca divergem.

## Estado

As duas mergeadas e as duas issues fechadas em 29/09.
