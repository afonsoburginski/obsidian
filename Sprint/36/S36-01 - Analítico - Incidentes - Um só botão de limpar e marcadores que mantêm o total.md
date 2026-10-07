---
id: S36-01
tags:
  - attlas
  - task
  - sprint-36
  - analitico
  - incidentes
  - issues
  - frontend
titulo: "[Front] Busca do Analítico com um único botão de limpar, e marcadores de criticidade que mantêm o total"
frente: Incidentes
pr: "#5740, #5742"
issues: "#5255, #5257"
status: "Feita. #5740 mergeada em 05/10 às 09h10 e #5742 às 09h12; as duas issues fechadas no mesmo dia."
sprint: "[[Attlas - Sprint 36]]"
atualizado: 2026-10-07
---

# S36-01 - Analítico - Incidentes - Um só botão de limpar e marcadores que mantêm o total

As duas PRs foram abertas em 02/10, na Sprint 35, e mergeadas na abertura desta semana.

## O que estava errado

- **#5255**: a busca da fila de Incidentes e a do painel de vínculo de câmera, no detalhe da instância,
  mostravam dois botões de limpar, o do navegador e o do sistema. Na fila, o campo também aparecia com a
  borda esquerda aberta ao receber o foco.
- **#5257**: escolhendo um marcador de criticidade, "Todas" e os outros níveis passavam a contar o
  resultado já filtrado, e escolhendo um nível sem incidentes todos mostravam 0.

## O que as PRs entregaram

- **#5740**: os dois campos usam a supressão compartilhada do "x" nativo, e a coluna da fila ganha o recuo
  de anel de foco do design system, então o campo aparece inteiro com foco.
- **#5742**: com uma criticidade escolhida, a faixa lê o mesmo conjunto da fila sem esse corte, com a
  mesma chave de cache da fila sem filtro. "Todas" mantém o total e cada nível a sua contagem, e a janela
  de criticidade por tipo recebe as mesmas contagens. Backend e contrato não mudam.

## Estado

As duas mergeadas e as duas issues fechadas em 05/10.
