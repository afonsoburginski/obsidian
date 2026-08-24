---
tags:
  - attlas
  - sprint-28
  - task
  - vms
card: SOFTWARE-2481
clickup: https://app.clickup.com/t/86ajz08c2
titulo: "[Back] Renome VMS - fase 3, remove o path legado /api/video-wall"
frente: Renome VMS (CROSS-045)
tamanho: a pontuar (diff de poucas linhas)
status: "**Discrepância achada em 22/08**: o ClickUp marca este card como Closed, mas os quatro pontos do escopo abaixo continuam presentes no código na develop (`cameras.controller.ts:170`, `video-wall.controller.ts:38`, `docker/kong.yml:501-519` com o comentário citando esta task, e nenhum PR fechando-o foi encontrado). Ou foi fechado sem o trabalho ter sido feito, ou foi decidido não fazer — nenhum comentário no ClickUp explica qual. Confirmar com o dono antes de reabrir ou de assumir feito."
sprint: "[[Attlas - Sprint 29]]"
atualizado: 2026-08-22
---

# SOFTWARE-2481 - Renome VMS - fase 3, remove o path legado

Card de limpeza que encerra a janela de rota dupla da CROSS-045 (seção 6). Criado em 11/08 porque o
review da [PR #1439](https://github.com/atmanadmin/attlas-2026/pull/1439) apontou, com razão, que nota
de prazo em comentário sem ticket vinculado não tem como ser cobrada: os três comentários da janela
agora citam este card.

## Escopo (1 PR)

Remove a alternativa `video-wall` dos pontos que a fase 1 deixou duplos:

1. `@Controller(['vms', 'video-wall'])` no controller de cenas e layouts do `ms-cameras`.
2. `@Get(['vms', 'video-wall'])` no picker de câmeras do `CamerasController`.
3. `docker/kong.yml`: o path `/api/video-wall` em `ms-cameras-vms-route` e a alternativa no regex de
   `ms-cameras-vms-picker`.
4. No `web-attlas`, o redirect `/cameras/videowall` para `/cameras/vms` (fase 2, PR #1440).

Mais os testes de paridade da rota legada, que passam a ser removidos junto (uc-014, uc-016 e o e2e).

## Critério para iniciar

Deploy do renome em todos os ambientes, como a CROSS-045 seção 6 define. Não entra em sprint antes
disso; está no backlog da lista da 28 só para existir e ser cobrável.
