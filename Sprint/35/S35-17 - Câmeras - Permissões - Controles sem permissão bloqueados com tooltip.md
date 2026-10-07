---
id: S35-17
tags:
  - attlas
  - task
  - sprint-35
  - cameras
  - permissoes
  - issues
  - frontend
titulo: "[Front] Os controles de Câmeras sem permissão ficam bloqueados com tooltip"
frente: Permissões
pr: "#5166"
issues: "#4741"
status: "Feita. #5166 mergeada em 29/09 às 15h07; a issue fechada no mesmo dia."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-17 - Câmeras - Permissões - Controles sem permissão bloqueados com tooltip

## O que estava errado

Em Câmeras, cadastro, edição, exclusão, PTZ, presets, regiões de analítico, automações e videowall eram
oferecidos a qualquer operador que enxergasse o módulo. As rotas do `ms-cameras` já exigiam cada
permissão, mas quem não a tinha só descobria o bloqueio pelo 403 depois de clicar.

## O que a PR entregou

O mesmo padrão já aplicado no PMV (#4769): o controle fica na tela, desabilitado, com cadeado e um tooltip
que nomeia o acesso que falta. Vale para cadastrar e importar, editar, substituir e excluir na lista e no
menu da linha, o cartão lateral e o cabeçalho do detalhe, o controle PTZ, as abas Presets e Automação, o
botão Editar que leva à configuração de regiões, e os controles do videowall. Como os controles PTZ agem
por arraste e não só por clique, eles também se desabilitam no próprio componente. Nenhuma chave de
tradução nova.

## Estado

Mergeada e issue fechada em 29/09.
