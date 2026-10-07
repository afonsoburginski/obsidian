---
id: S35-21
tags:
  - attlas
  - task
  - sprint-35
  - analitico
  - metricas
titulo: "[Full] Métricas do Analítico abrem leves, sem gráfico vazio, e mostram o que a câmera embarcada mede"
frente: Métricas
pr: "#5273, #5331"
status: "Feita. #5273 mergeada em 29/09 às 21h52 e #5331 em 30/09 às 15h11."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-21 - Analítico - Métricas - As Métricas abrem leves e mostram o que a câmera mede

## O que estava errado

A tela Analítico, Métricas travava ao abrir, carregava devagar e mostrava muitos gráficos vazios. Dos 38
cartões ATSPM só 4 tinham fonte, porque a câmera com analítico embarcado manda quadro a quadro a
velocidade, a classe, o tempo parado e o percurso de cada veículo, e o Attlas só usava isso no vídeo ao
vivo. As datas eram lidas em UTC, deslocando a janela em 3 horas.

## O que as PRs entregaram

- **#5273**: a aba escondida para de ler e de redesenhar; miniaturas e players só montam ao entrar na tela;
  a grade mostra só os cartões com fonte e nomeia os outros uma vez; sai a curva inventada que enchia os
  cartões no ambiente de desenvolvimento; datas no fuso local; o Laço Virtual com período de um dia carrega
  as últimas 10 horas em vez de abrir em erro.
- **#5331**: o `ms-cameras` acompanha cada veículo em cada região e grava por minuto, região e classe o
  volume, a velocidade média, as paradas, o tempo parado e o tempo de percurso, com retenção de 30 dias e
  uma rota de leitura nova. A face ATSPM ganha velocidade média, densidade, paradas e tempo parado por
  veículo, tempo de percurso e os diagramas fundamentais. Só a face visível segue câmeras pelo
  WebSocket, a foto do card fica 10 s em cache, e o botão de tela cheia abre o vídeo ao vivo.

## Estado

As duas mergeadas. O carregamento da face ATSPM ainda levava de 7 a 10 s, o que a
[[S35-25 - Analítico - Métricas - ATSPM instantâneo, telemetria de toda câmera e embarcado vinculado no cadastro|S35-25]]
resolveu no mesmo dia.
