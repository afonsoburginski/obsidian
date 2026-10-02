---
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - streaming
titulo: "[Back] Streaming - o pedido de H265 entra na relay H264 viva em vez de abrir um segundo ingest"
frente: Streaming
tamanho: 5 pts
pr: "#4076, #4079"
status: "Feita. #4076 mergeada em 22/09, #4079 mergeada em 23/09."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
---

# Streaming - um ingest por câmera, com a qualidade resolvida

## O que estava errado

O single-flight que evita duas aberturas simultâneas era chaveado pela qualidade pedida, não pela que
a relay realmente serve. Duas telas pedindo a mesma câmera em codecs diferentes abriam dois ingests
contra o mesmo equipamento, o que dobra a carga na câmera e é justamente o que o resolver evita ao
declinar H265 na câmera que roda analítico embarcado, porque o encoder dela não sustenta dois
encodes.

## O que muda

O single-flight passa a ser chaveado pela qualidade resolvida (#4076), e um pedido de H265 passa a
entrar na relay H264 viva em vez de abrir o segundo ingest (#4079).

## O que tem de valer no fim

Uma câmera, um ingest, independentemente de quantas telas a estejam pedindo e em que codec.

## Como entrou

A convergência é assimétrica, de propósito. Pedido H265 com a H264 viva na mesma câmera e qualidade
entra nela e recebe `codec: 'H264'` na resposta; pedido H264 com a H265 viva ainda abre a segunda
relay, porque o contrário entregaria HEVC a um cliente que talvez não decodifique. Então o objetivo
acima vale para a ordem comum, H264 primeiro, e não para toda ordem: o caso H265 primeiro e H264
depois fica para a fase estrutural do plano.

Com a convergência, o `codec` da resposta passou a mandar no ciclo do cliente. O detalhe de câmera, o
painel lateral da lista e o videowall guardam o valor servido e o ecoam no `DELETE`, senão a lease é
procurada na variante errada e fica presa até o reaper. O videowall só rebaixa a parede para H264
quando o tile que travou estava de fato recebendo H265.

## Relacionado

- [[Registro - implementação do plano de vazamento de publicador em 21 de setembro]].
- [[Plano - Streaming sem vazamento de publicador]], onde a convergência de eixos de ingest é a fase estrutural.
