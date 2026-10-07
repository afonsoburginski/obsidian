---
id: S35-01
tags:
  - attlas
  - task
  - sprint-35
  - cameras
  - frontend
titulo: "[Front] Cabeçalho de todas as telas no mesmo recuo de 24 px"
frente: Detalhe da câmera
pr: "#4988"
status: "Feita. #4988 mergeada em 28/09 às 10h01."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-01 - Câmeras - Detalhe da câmera - O cabeçalho de todas as telas no recuo de 24 px

## O que estava errado

No detalhe da câmera, a trilha de navegação e o cabeçalho somavam o próprio recuo ao recuo que o layout
já dá à página. O título abria a 40 px do topo e a 48 px da lateral, enquanto as abas e o player logo
abaixo ficavam a 24 px. Outras telas também fugiam do padrão de 24 px (detalhe do controlador, fichas do
Modelo de Tráfego, plano de subárea, Prioridade Seletiva, monitoramento de alarmes, estudo de simulação,
criar e aprovar plano), e o título saltava de altura ao navegar entre elas.

## O que a PR entregou

Todas essas telas abrem com o primeiro elemento a 24 px do topo e das laterais, igual ao resto do
sistema. A mudança é só de CSS, sem alteração de comportamento.

## Estado

Mergeada em 28/09.
