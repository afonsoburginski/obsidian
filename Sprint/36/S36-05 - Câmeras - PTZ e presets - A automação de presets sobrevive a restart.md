---
id: S36-05
tags:
  - attlas
  - task
  - sprint-36
  - cameras
  - ptz
  - backend
titulo: "[Back] Automação de presets PTZ continua rodando depois de deploy, restart ou queda do ms-cameras"
frente: PTZ e presets
pr: "#5757"
status: "Feita. #5757 mergeada em 05/10 às 09h15."
sprint: "[[Attlas - Sprint 36]]"
atualizado: 2026-10-07
---

# S36-05 - Câmeras - PTZ e presets - A automação de presets sobrevive a restart

A PR foi aberta em 02/10, na Sprint 35.

## O que estava errado

Com a automação de presets ativa, a câmera PTZ parava de transitar entre os presets depois de um tempo, e a
tela seguia mostrando a automação como ativa. A ronda vivia só na memória do processo do `ms-cameras`. Em
01/10, no dev.v2, a ronda "Auto1" da Atman PTZ rodou regular das 12:41 às 12:55:36 e morreu no restart do
serviço às 12:55:40. O desligamento ainda gravava todas as automações como inativas, e nada as retomava.

## O que a PR entregou

- O estado ativo passa a ser a intenção do operador: o desligamento só cancela as rondas em andamento. No
  boot e a cada 15 s, cada réplica retoma as rondas ativas que ninguém está conduzindo.
- Cada ronda roda sob um lease no Redis, então só uma réplica move a câmera; se ela morrer, outra assume
  quando o lease expira.
- Um erro passageiro de banco no meio da ronda não desliga mais a automação.

Testada contra a câmera PTZ real da bancada, com reinício gracioso e queda bruta do processo.

## Estado

Mergeada em 05/10.

## Relacionado

- [[Câmeras - PTZ e presets - Arquitetura e estratégias]]
