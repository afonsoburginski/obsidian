---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2313
epico: SOFTWARE-1899
frente: Eventos de câmeras - backend
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: Closed (mergeada 24/07, #1033)
pontos: 2
atualizado: 2026-07-24
---

# SOFTWARE-2313 - Detalhe de evento por câmera - area/subarea e ações disparadas

Correção de backend na rota de detalhe de evento por câmera (`GET /api/cameras/:id/events/:eventId`). Follow-up da [[SOFTWARE-2289 - Eventos câmeras - integração front-back|SOFTWARE-2289]] (#951), que já mergeou.

**Problema**: essa rota divergia da rota cross-camera (`/api/cameras/events/:eventId`). Devolvia `area`/`subarea` em branco (o handler não injetava o client de topologia) e limitava `incidentLinks` a `take: 1`, sub-reportando as ações disparadas.

**Fix**:
- Resolve `area`/`subarea` com a mesma derivação da rota cross-camera (reusa `loadCameraEventTopology`/`resolveTopologyName`).
- Remove o `take: 1`, reportando todas as ações disparadas.
- Tipa `trafficElementId` no resultado e propaga `bearer` na query.
- Sem mudança de schema. As duas rotas de detalhe passam a concordar.

Como o fix ficou órfão (empurrado na branch da #951 depois que ela mergeou), virou card + PR próprios para manter 1 card = 1 PR.

---
**PR** [#1033](https://github.com/atmanadmin/attlas-2026/pull/1033) (base `develop`) · **ClickUp** [SOFTWARE-2313](https://app.clickup.com/t/86ajpnjx5) Sprint 25 / code review
