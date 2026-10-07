---
id: S35-26
tags:
  - attlas
  - task
  - sprint-35
  - cameras
  - streaming
  - backend
titulo: "[Back] Perfis SECONDARY e TERTIARY derivados das câmeras Axis pedem 30 fps"
frente: Streaming
pr: "#5495"
status: "Feita. #5495 mergeada em 30/09 às 23h08."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-26 - Câmeras - Streaming - Perfis derivados da Axis a 30 fps

## O que estava errado

Os perfis SECONDARY e TERTIARY que o Attlas deriva pela URL VAPIX, quando o equipamento não publica um
perfil menor, saíam cravados em 15 quadros por segundo. É o caso das câmeras Axis do DMQ no dev. O
PRIMARY já saía a 30.

## O que a PR entregou

Os dois perfis derivados passam a pedir 30 quadros por segundo, sem mudar resolução nem teto de bitrate.
Câmera já cadastrada recebe o novo alvo na próxima redescoberta. Os 16 perfis derivados das câmeras do
DMQ foram ajustados direto no banco do dev, para valer sem esperar a redescoberta.

## Estado

Mergeada em 30/09.

## Relacionado

- [[Câmeras - Streaming - Banda e bitrate]]
