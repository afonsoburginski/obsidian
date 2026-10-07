---
id: S36-04
tags:
  - attlas
  - task
  - sprint-36
  - analitico
  - deteccao
  - frontend
titulo: "[Front] Escala da caixa da Detecção estável sobre o Kalman, com a banda medida até a estimativa"
frente: Detecção
pr: "#5662, #5664"
status: "Feita. #5662 mergeada em 05/10 às 09h13 e #5664 em 06/10 às 08h48."
sprint: "[[Attlas - Sprint 36]]"
atualizado: 2026-10-07
---

# S36-04 - Analítico - Detecção - Escala da caixa estável sobre o Kalman

As duas PRs foram abertas em 01/10, na Sprint 35, antes de a develop adotar o filtro de Kalman da
[[S35-30 - Analítico - Detecção - Caixa estável com Kalman, cards de métricas e visão salva por câmera|S35-30]],
e foram atualizadas para ele.

## O que estava errado

- A #5662 corrigia a caixa montada com a largura de um relatório e a altura de outro, defeito que deixou de
  existir no Kalman, porque largura e altura passaram a ser filtradas juntas.
- Sobre o Kalman, a banda de 2% que segura cada lado contra o próprio sentido era comparada ao passo de um
  quadro rumo à estimativa, cerca de um décimo da distância a 60 Hz. Na prática a banda virava uns 19%, e o
  lado ficava preso no tamanho que tinha alcançado.

## O que as PRs entregaram

- **#5662**: ficou só com três asserções a mais no teste da caixa parada, que continuam valendo no motor
  novo.
- **#5664**: a banda passa a ser medida da caixa desenhada até a estimativa do Kalman. Contra o sentido, o
  lado só vira depois de a estimativa ficar 320 ms seguidos fora da banda; a favor, segue na hora. Veículo
  parado usa a mesma banda nos dois sentidos. Acoplar área e proporção, a ideia original, mediu pior e
  ficou de fora.

## Estado

As duas mergeadas. O report de 05/10 registra, na validação ao vivo, erro mediano de 2,8% do tamanho
desenhado contra a estimativa.
