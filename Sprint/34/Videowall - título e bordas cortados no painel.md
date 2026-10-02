---
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - videowall
  - frontend
titulo: "[Front] Videowall - título do painel e bordas dos campos deixam de ser cortados"
frente: Câmeras
tamanho: 2 pts
pr: "#4147"
issues: "#2845, #2826"
status: "Feita. PR #4147 mergeada na develop em 22/09, às 22h26, fechando as issues 2826 e 2845."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
---

# Videowall - título e bordas cortados no painel

Duas correções visuais no cartão do espelho do painel físico, agrupadas por tocarem o mesmo cartão.
Fecha as issues 2845 e 2826.

## O que estava errado

O nome do painel usava altura de linha igual a 1 junto de `overflow: hidden`, então a perna das
letras descendentes caía fora da caixa e era raspada. O corpo de cada aba da coluna lateral é uma
porta de rolagem, e porta de rolagem recorta nos quatro lados na borda do padding: sem padding
lateral, a borda e o anel de foco dos campos eram cortados nas duas laterais. Os botões
"Personalizado" e "Salvar grupo" apareciam com cor de desabilitado estando habilitados.

## O que muda

O título passa à altura de linha do próprio tamanho de texto, o grupo do nome ganha `min-width: 0`
para o `text-overflow` finalmente ser alcançado, e o corpo das abas reserva o token de folga de anel
de foco que o repositório já usa em outras telas, devolvendo a largura por margem negativa para os
campos continuarem alinhados com a barra de abas.

## O que tem de valer no fim

Nome longo trunca com reticências em vez de transbordar, nenhuma letra sai raspada, todo campo da aba
"Configuração" mostra a borda inteira e os dois botões leem como habilitados.

## Relacionado

- [[Câmeras - as issues abertas do módulo]], a frente em que esta task entra.
