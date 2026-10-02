---
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - videowall
  - frontend
titulo: "[Front] Videowall - preset, geometria e grade de projeção do painel"
frente: Câmeras
tamanho: 5 pts
pr: "#4171"
issues: "#2787, #3023, #3076"
status: "Feita. PR #4171 mergeada na develop em 23/09, fechando as issues 2787, 3023 e 3076."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
---

# Videowall - preset, geometria e grade de projeção

Três defeitos da mesma área da tela do painel: o seletor de grade no topo do cartão, as colunas
Posição e Tamanho da tabela de telas e a grade de projeção do cartão. O escopo já tratava a 3023 e a
2787 como a mesma máquina de estado vista de dois ângulos, e a 3076 como dependente dela. Fecha as três.

## O que estava errado

O seletor lia a ocupação da parede, e nada atualizava a ocupação quando o arranjo respondia: o esquema
se movia, o campo continuava dizendo a divisão anterior, e a tela mostrava as duas coisas ao mesmo
tempo. A tabela imprimia os retângulos crus da parede, que são gravados numa grade fixa de 16 trilhas,
então a tela de baixo à esquerda de uma parede 2x2 aparecia como coluna 1, linha 9, 8 por 8, ao lado de
um seletor dizendo 2x2. E uma cena arranjada à mão é serializada em 720 trilhas: o cartão pedia essas
720 trilhas com espaçamento dentro de poucas centenas de pixels, e os tiles cresciam até pintar por
cima da busca e da tabela.

## O que muda

O seletor passa a ler a divisão da store da mesa, que responde à escolha do operador na hora; a
divisão que a parede reporta continua sendo o que a mesa reconcilia. A ocupação devolvida pelo arranjo
vira a ocupação da tela inteira, e um arranjo recusado recarrega a ocupação real em vez de manter o
preset recusado. A tabela lê cada retângulo nas células do preset em vigor pela mesma projeção com que
ele foi escrito, porque 16 não divide por 3 e a parede 3x3 tem trilhas de 5, 6 e 5. Em grade
personalizada, as colunas dizem em que grade estão contando, "de 16". A grade de projeção monta
trilhas só nas fronteiras que as próprias células declaram, com peso proporcional, e o painel passa a
recortar o que pinta dentro dele.

## O que tem de valer no fim

Trocar o preset atualiza o campo e o esquema juntos, Posição e Tamanho falam a língua do preset
escolhido, e enviar uma cena do Monitoramento de Vídeo ao painel não transborda o cartão.

## Relacionado

- [[Câmeras - as issues abertas do módulo]], a frente em que esta task entra.
- [[Videowall externo (NovaStar H9)]], a nota de domínio da tela.
