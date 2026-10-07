---
id: S35-05
tags:
  - attlas
  - task
  - sprint-35
  - analitico
  - deteccao
titulo: "[Full] Linha do laço da DEMO, caixa no vídeo do incidente e as duas mãos da via na Detecção"
frente: Detecção
pr: "#4990, #5109"
status: "Feita. #4990 mergeada em 28/09 às 17h04 e #5109, com os ajustes do review, em 29/09 às 08h35."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-05 - Analítico - Detecção - A linha do laço da DEMO, a caixa no vídeo do incidente e as duas mãos da via

## O que estava errado

Três relatos do teste do Analítico no dev.v2:

1. **A configuração do Laço Virtual da DEMO sumiu.** A câmera "Atman Externa" (app SDCT 0.13.0) mostrava
   só "Métricas de desempenho". O app tem um único ajuste de laço, a posição da linha ativadora, e o
   Attlas registrou o app quando ele ainda não tinha essa linha.
2. **O vídeo do incidente não mostrava a caixa do objeto.** O vídeo abria parado 1,5 s antes dela, ela
   aparecia por cerca de 1 s e ficava para trás na tela cheia.
3. **A Detecção pegava a via errada.** Na câmera "Atman Teste", a tela mostrava a mão da via sem detector.
   O Modelo de Tráfego guarda uma via por braço da interseção, e a Detecção lia só essa.

## O que as PRs entregaram

- **#4990**: o bloco "Ativação de laço" volta com a "Posição da linha ativadora", gravada no equipamento
  sem apagar os incidentes que o app guarda; o vídeo do incidente abre na primeira caixa e o botão de tela
  cheia leva a caixa junto; a Detecção lê as duas mãos da via e oferece os detectores da mão de
  aproximação.
- **#5109**: os ajustes do review da #4990, que tinha sido mergeada antes deles. A linha do laço não some
  quando o equipamento para de responder, a falha da mão contrária não descarta a via coberta, o limite da
  posição da linha mora num lugar só, e sair da tela cheia trata a recusa do navegador.

## Estado

As duas mergeadas.
