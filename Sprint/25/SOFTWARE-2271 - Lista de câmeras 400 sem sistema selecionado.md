---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2271
frente: Câmeras - front
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: Closed (mergeada 20/07)
atualizado: 2026-07-24
pr: https://github.com/atmanadmin/attlas-2026/pull/885
---

# SOFTWARE-2271 - Lista de câmeras 400 (system-id ausente) sem sistema selecionado

Depois do deploy, a lista de câmeras quebrava com 400 "system-id ausente". Não era Kong: o SOFTWARE-1920 tornou o `GET /api/cameras` fail-closed no header `System-Id`, e o front omitia o header quando nenhum sistema estava selecionado. O paliativo tinha sido um request-transformer injetando um System-Id default na rota do ms-cameras; o fix correto (este card) é no front, que passou a garantir o header em toda chamada da lista.

Frente: Câmeras (front). Prioridade alta na semana por quebrar a tela principal em dev.
