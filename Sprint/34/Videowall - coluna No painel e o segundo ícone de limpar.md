---
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - videowall
  - frontend
titulo: "[Front] Videowall - coluna No painel alinhada à esquerda e um único ícone de limpar na busca"
frente: Câmeras
tamanho: 2 pts
pr: "#4143"
issues: "#3009, #3010"
status: "Feita. PR #4143 mergeada na develop em 22/09, fechando as issues 3009 e 3010."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
---

# Videowall - coluna No painel e o segundo ícone de limpar

Dois ajustes na tela do painel físico do Videowall, na barra de curadoria e na tabela logo abaixo
dela. Fecha as issues 3009 e 3010.

## O que estava errado

A coluna "No painel" era a única alinhada à direita da tabela de transmissões, cabeçalho e selo, num
sistema em que toda grade alinha à esquerda. E o campo de busca, compartilhado pelas abas
"Transmissões" e "Grupos salvos", é um `input type="search"`, então o navegador desenhava o próprio
"x" ao lado do botão de limpar que o `z-input-group` já entrega.

## O que muda

O `align: 'end'` sai da coluna `visible` do `videowall-streams-table`, e a folha da página do painel
passa a neutralizar os widgets nativos de busca do WebKit e do Edge no escopo daquele campo, do mesmo
jeito que as abas "Câmeras" e "Visualizações" do menu lateral já fazem.

## O que tem de valer no fim

O cabeçalho e o selo da coluna leem do mesmo lado que "Tela" e "Posição", e digitar na busca mostra um
único "x", o do componente.

## Relacionado

- [[Câmeras - as issues abertas do módulo]], a frente em que esta task entra.
