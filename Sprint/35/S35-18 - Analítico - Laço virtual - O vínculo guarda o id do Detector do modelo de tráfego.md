---
id: S35-18
tags:
  - attlas
  - task
  - sprint-35
  - analitico
  - laco-virtual
  - issues
titulo: "[Full] Vínculo de laço virtual guarda o id do Detector do modelo de tráfego"
frente: Laço virtual
pr: "#5167"
issues: "#4350"
status: "Feita. #5167 mergeada em 29/09 às 15h07; a issue fechada no mesmo dia."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-18 - Analítico - Laço virtual - O vínculo guarda o id do Detector do modelo de tráfego

## O que estava errado

O vínculo entre a região de laço virtual de uma câmera e o detector guardava só o endereço do detector,
controlador e índice. Quando o operador troca slot ou canal na tela de Via, o endereço muda e o vínculo
não tem como saber qual Detector era o dele. A issue pedia guardar o id do Detector, que não muda entre
salvamentos, e preencher os vínculos existentes.

## O que a PR entregou

- Coluna `trafficModelDetectorId`, opcional e com índice, no vínculo do `ms-cameras`, com migration e
  rollback. O contrato ganha o campo de forma aditiva.
- A tela de Detecção envia o id do Detector que já lia para montar o select.
- O re-endereçamento por evento de link leva o id para a linha nova.
- Uma rotina de boot preenche os vínculos existentes quando há exatamente um Detector vivo naquele
  endereço; endereço ambíguo fica sem id.

## Estado

Mergeada e issue fechada em 29/09.
