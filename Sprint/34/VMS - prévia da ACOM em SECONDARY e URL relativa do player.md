---
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - vms
  - frontend
titulo: "[Full] VMS - prévia da aba ACOM em SECONDARY e sinalização de vídeo na mesma origem do SPA"
frente: Streaming
tamanho: 2 pts
pr: "#4082, #4084"
status: "Feita. As PRs #4082 e #4084 foram mergeadas na develop em 22/09."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
---

# VMS - prévia da ACOM em SECONDARY e URL relativa do player

Dois ajustes que saíram junto da frente de streaming porque aparecem na mesma medição.

## A prévia da aba ACOM

Era a única prévia do sistema a abrir num perfil diferente das demais, o que significa um segundo
eixo de ingest contra a mesma câmera só por causa da aba em que o operador está. Passa a abrir em
SECONDARY, como todas as outras (#4082).

## A URL do player

A sinalização de vídeo apontava para endereço absoluto, o que amarra o player ao IP em que o
ambiente subiu e quebra quando ele muda. Passa a ser URL relativa, resolvida contra a origem do
próprio SPA (#4084).

## O que tem de valer no fim

Abrir a aba ACOM não cria eixo de ingest novo, e o player funciona em qualquer ambiente sem ninguém
acertar endereço.

## Relacionado

- [[Registro - implementação do plano de vazamento de publicador em 21 de setembro]].
