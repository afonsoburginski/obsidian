---
id: S35-06
tags:
  - attlas
  - task
  - sprint-35
  - analitico
  - deteccao
  - frontend
titulo: "[Front] Quadro da Detecção pedido junto da configuração, barra de rolagem visível e botão flutuante só por clique"
frente: Detecção
pr: "#5099, #5127"
status: "Feita. #5099 mergeada em 29/09 às 08h35 e #5127 às 13h39."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-06 - Analítico - Detecção - O quadro pedido junto da configuração e o botão flutuante só por clique

## O que estava errado

- Na Detecção, a imagem da câmera só era pedida depois de a configuração inteira chegar, e a
  configuração exige duas rodadas de leitura no app analítico (perto de 2 s). Como o quadro custa ao
  equipamento outro tanto (cerca de 2,2 s na câmera 101 do dev.v2), a espera era a soma dos dois.
- A coluna da imagem e da configuração rolava com a barra escondida, e o operador não percebia que havia
  configuração abaixo da imagem.
- O botão flutuante (lançador do chat e do Videowall) abria o menu em arco sempre que o ponteiro passava
  por ele, e soltar um arraste também abria o menu.

## O que as PRs entregaram

- **#5099**: a imagem de abertura é pedida no mesmo instante que a configuração, porque quem decide qual
  imagem abrir são só os presets, que respondem do banco. A espera passa a ser o maior dos dois tempos, e
  o equipamento continua recebendo um pedido só por imagem.
- **#5127**: a barra de rolagem volta a aparecer, com o espaço reservado para a imagem não pular. O botão
  flutuante abre só por clique, e o clique que o navegador dispara ao fim do arraste é barrado.

## Estado

As duas mergeadas.
