---
id: S35-19
tags:
  - attlas
  - task
  - sprint-35
  - analitico
  - deteccao
titulo: "[Full] Caixa em sólido com classe, id e velocidade e regiões desenhadas como faixas no vídeo ao vivo"
frente: Detecção
pr: "#5187, #5306, #5307"
status: "Revertida. #5187 mergeada em 29/09 às 15h07 e desfeita pela #5306 em 30/09 às 08h18; a continuação em rascunho, #5307, fechada sem merge em 05/10."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-19 - Analítico - Detecção - Caixa em sólido e regiões em faixa, revertidas por serem esboço

## O que se pediu

A caixa do objeto sobre o vídeo ao vivo era um retângulo azul com o nome da classe, e a região um
polígono colorido com um número no meio. O vídeo de referência do Analítico mostra o veículo como um
sólido na faixa, com etiqueta de id e velocidade, vermelho quando parado, e as faixas com marcas de metro
e o nome.

## O que as PRs entregaram

- **#5187**: sólido em arame com a profundidade apontando para o fundo da faixa, etiqueta com classe, fim
  do id e velocidade, caixa vermelha com os segundos parados (o `ms-cameras` passou a repassar esse campo
  do equipamento) e regiões desenhadas como faixas com marca a cada 5 m.
- **#5306**: desfez o merge da #5187 inteiro, porque o desenho ainda era esboço e toda branch que trazia a
  develop passava a mostrá-lo.
- **#5307**: trouxe o desenho de volta em rascunho, para ser melhorado fora da develop.

## Estado

Fora da develop. A #5307 foi fechada em 05/10 porque a develop já entregava o sólido no ponto de fuga, a
etiqueta com classe, id e velocidade e os segundos parados, pela
[[S35-30 - Analítico - Detecção - Caixa estável com Kalman, cards de métricas e visão salva por câmera|S35-30]],
e o que ela acrescentava trocaria o número da região pelo nome, poderia virar o sólido para o lado errado
e duplicaria a borda da frente na edição.
