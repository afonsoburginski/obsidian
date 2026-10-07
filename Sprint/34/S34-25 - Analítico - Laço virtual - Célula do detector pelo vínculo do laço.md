---
id: S34-25
tags:
  - attlas
  - task
  - sprint-34
  - analitico
  - controladores
  - frontend
titulo: "[Front] Controladores - ramificar a célula do detector pelo vínculo do laço"
frente: Vínculo região e detector
tamanho: 2 pts
pr: "#4178"
status: "PR #4178 mergeada em 22/09 às 15h58."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
aliases:
  - "Analítico - célula do detector pelo vínculo do laço"
---

# S34-25 - Analítico - Laço virtual - Célula do detector pelo vínculo do laço

Primeira das três PRs da frente 4, a do vínculo da região do analítico com o detector. É a menor, e
é a única que corrige a tela de detectores ACOM do controlador sem mexer em quem cria o vínculo.

## O que estava errado

Na tabela "Associação dos laços e regiões" da aba ACOM, a célula da coluna "Detector da via"
ramificava pelo **nome** do detector. Um laço que tinha vínculo, mas cujo nome não resolveu, caía no
ramo de "Definir detector na via", enquanto a coluna "Situação" da mesma linha não mostrava o selo
"Sem detector", porque o vínculo existia. A célula e a coluna se contradiziam, e o atalho levava o
operador à folha da Via, onde não havia nada a corrigir.

O nome deixa de resolver em dois casos legítimos da `UC-173`: a via não respondeu, e o provedor não
emite o identificador de medição do detector, que é opcional no contrato dele. A atômica chama isso
de degradação legível, e a célula transformava a degradação em convite para cadastrar o que já
existe.

## O que muda

A célula ramifica pela presença do vínculo (`detectorId`), não pelo nome. Com vínculo e sem nome, ela
mostra o detector atenuado, com o rótulo de detector sem nome nos quatro idiomas, em vez do atalho de
cadastro. A fonte do selo "Sem detector" não mudou: ele continua derivado do vínculo, como a `UC-173`
seção 8.7 define.

## O que tem de valer no fim

Sem vínculo, a célula oferece o atalho para a folha da Via. Com vínculo e com nome, mostra o nome.
Com vínculo e sem nome, mostra o detector degradado e nunca o atalho. Os três casos estão no teste de
unidade do cartão de fiação.

## Relacionado

- [[Plano - o vínculo da região do analítico com o detector]], o diagnóstico da frente.
- [[S34-26 - Analítico - ACOM - A fiação da ACOM cria o vínculo região-detector]] e
  [[S34-27 - Analítico - Detecção - A faixa da via associada na Detecção]], as outras duas PRs da frente.
- [[Attlas - Sprint 34]].
