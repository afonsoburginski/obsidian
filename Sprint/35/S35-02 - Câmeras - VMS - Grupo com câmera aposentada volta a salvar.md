---
id: S35-02
tags:
  - attlas
  - task
  - sprint-35
  - cameras
  - vms
titulo: "[Full] Grupo do VMS com câmera aposentada volta a salvar"
frente: VMS
pr: "#4989"
status: "Feita. #4989 mergeada em 28/09 às 10h01."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-02 - Câmeras - VMS - Grupo com câmera aposentada volta a salvar

## O que estava errado

Um grupo do VMS com uma câmera que depois foi excluída ou mandada para o estoque deixava de aceitar
qualquer edição. O servidor conferia de novo todas as câmeras do grupo a cada salvamento e recusava com
409 ("câmera não elegível"). A tela lia todo 409 como "Visualização alterada por outro operador" e
oferecia recarregar, o que trazia de volta o mesmo grupo recusado. No dev.v2 isso aconteceu com câmeras
antigas do seed.

## O que a PR entregou

Na edição, só as câmeras que a edição coloca no grupo precisam estar disponíveis; as que já estavam nele
mantêm a posição. Criar grupo continua exigindo câmeras disponíveis em todas as posições. O diálogo de
conflito só abre com `VIDEOWALL_CONFLICT` ou 412, e as outras recusas mostram o motivo num aviso sem
tirar a edição da tela.

## Estado

Mergeada em 28/09.

## Relacionado

- [[Câmeras - VMS - Fluxos]]
