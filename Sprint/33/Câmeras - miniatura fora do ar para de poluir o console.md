---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
  - cameras
card: SOFTWARE-3186
clickup: https://app.clickup.com/t/86akhphg1
titulo: "[Front] Miniatura de câmera fora do ar polui o console de toda tela com lista"
frente: Câmeras
tamanho: 2 pts
pr: "#3451"
status: "PR #3451 aberta: registro compartilhado do que está inalcançável, com expiração de cinco minutos, consultado pelo player compartilhado - então a economia vale para toda tela que o usa, e não só para a que foi corrigida. O código de status não muda."
sprint: "[[Attlas - Sprint 33]]"
atualizado: 2026-09-13
---

# Câmeras - miniatura fora do ar para de poluir o console

`GET /api/cameras/<id>/thumbnail` responde 502 quando o gateway não alcança o equipamento. A resposta é
honesta e o player já cai no estado offline; o efeito colateral é ruído - toda tela que lista câmeras
repete o erro no console a cada montagem.

## O que o card faz

Parar de pedir a mesma miniatura depois da primeira falha enquanto a câmera seguir fora do ar, sem
trocar o código de status.
