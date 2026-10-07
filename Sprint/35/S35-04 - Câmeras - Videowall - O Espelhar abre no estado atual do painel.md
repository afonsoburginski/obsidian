---
id: S35-04
tags:
  - attlas
  - task
  - sprint-35
  - cameras
  - videowall
titulo: "[Front] Diálogo de Espelhar abre no estado atual do painel"
frente: Videowall
pr: "#4994"
status: "Feita. #4994 mergeada em 28/09 às 15h08."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-04 - Câmeras - Videowall - O Espelhar abre no estado atual do painel

## O que estava errado

O diálogo "Espelhar" só enxergava telas que já estavam sendo espelhadas. Com um grupo do VMS em exibição
no painel, ele mostrava "Nada no painel agora". O seletor de layout ficava travado até alguém começar a
espelhar, os quadros só aceitavam clique depois de escolher a tela, e o envio pedia um clique a mais
depois de o navegador liberar a captura.

## O que a PR entregou

- O diálogo abre no estado atual do painel: com um grupo em exibição, aparecem as posições dele com o
  nome de cada câmera; com o painel livre, o último layout usado ou o painel inteiro como uma posição.
- Layout e posição podem ser escolhidos desde a abertura, como rascunho que não mexe no painel.
- "Enviar ao painel" pede a captura e, assim que o navegador libera, manda a tela num clique só. O layout
  escolhido é gravado logo depois do envio.
- Trocar a posição de uma tela já enviada num painel dividido reescreve a divisão numa gravação só.

## Estado

Mergeada em 28/09.

## Relacionado

- [[Câmeras - Videowall - Fluxos]]
