---
id: S35-28
tags:
  - attlas
  - task
  - sprint-35
  - analitico
  - deteccao
  - frontend
titulo: "[Front] Badges da Detecção sobem com a barra de controles no pausado e dizem que o estado é do analítico"
frente: Detecção
pr: "#5531"
status: "Feita. #5531 mergeada em 01/10 às 10h09."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-28 - Analítico - Detecção - Badges da Detecção com o vídeo pausado

## O que estava errado

Na Detecção, com o vídeo pausado, a barra de controles do player aparecia no hover, mas as badges do
rodapé (estado, analítico, hospedagem) ficavam atrás dela. Elas também desciam e subiam ao passar o
ponteiro por Editar, pelas abas ou pelo PTZ, que ficam sobre o vídeo mas fora do player, e saltavam sem
transição ao pausar ou retomar. A badge dizia só "Offline", sem dizer que era o analítico.

## O que a PR entregou

As regras passam a seguir a presença da barra de controles, que existe tocando ou pausado. O player ganha
um alvo de hover opcional, e a Detecção passa o quadro inteiro, então cruzar do vídeo para a barra ou para
o PTZ mantém o estado. A transição sai da condição, e a badge nomeia o analítico.

## Estado

Mergeada em 01/10.
