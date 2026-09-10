---
tags:
  - attlas
  - task
  - sprint-30
  - analitico
card: SOFTWARE-2682
titulo: "[Back] Writer do deviceSourceId e higiene do embarcado"
clickup: https://app.clickup.com/t/86ak5dx7x
frente: Analítico
tamanho: 3 pts
status: "MERGEADA na develop em 27/08 pela PR #2001. Era o bug P0 da semana: câmera cadastrada pela tela não recebia detecção ao vivo, só as do seed. Comprometido na Sprint 30."
sprint: "[[Attlas - Sprint 30]]"
atualizado: 2026-08-28
---

# Analítico - Writer do deviceSourceId e higiene do embarcado

Bug P0, e é o defeito que sozinho justifica a semana. **`deviceSourceId` não tem nenhum writer no banco.**

## O defeito

`deviceSourceId` é a chave que liga o frame publicado pelo device à câmera cadastrada. Ela é lida em dois
lugares: `apps/ms-cameras/src/analytics-realtime/device-stream.consumer.ts`, onde chaveia o mapa de
`bindings` e descarta a câmera com um `if (!caps.deviceSourceId) continue`, e
`apps/ms-cameras/src/analytics-realtime/camera-regions.controller.ts`.

Nenhum código escreve essa chave no banco. As duas únicas origens hoje são
`apps/ms-cameras/src/database/seed.ts`, que grava só `{ptz, dai, virtualLoop}` e não inclui
`deviceSourceId`, e edição manual da linha.

Consequência verificável: **câmera cadastrada pela interface nunca entra no binding do consumer, logo nunca
recebe detecção ao vivo**. O analítico embarcado está entregue desde 15/07 e funciona apenas para as
câmeras que o seed criou.

O único writer que existe é `apps/ms-cameras/src/analytics-realtime/atman-device-provisioner.service.ts`,
e ele escreve no **device** (`PUT /config { source_id }`), não no banco. Falta a contraparte: gravar a
mesma chave do lado do Attlas, no cadastro.

## Higiene que vem junto: reescrever o que a PR #1355 tinha

A PR **#1355** era do card [[SOFTWARE-2391 - Pendências do analítico embarcado]], era toda markdown e foi
**fechada em 24/08 no reescopo**, junto com as outras 13. A branch `cameras/docs/SOFTWARE-2391` ficou, então
o texto é recuperável e serve de ponto de partida. O conteúdo entra neste card:

- Corrige a terminologia morta `deviceAnalyticId` em 4 docs da develop (`INT-010`, `PROJ-011`, `PROJ-013`,
  `MOD-014`). O campo real é `deviceSourceId`.
- Reconcilia o status de `INT-009`, `INT-010`, `PROJ-011`, `PROJ-012` e `PROJ-013`, que estão `in-review`
  e já estão na develop, para `completed`.
- Reescreve a `UF-033` do `web-attlas`, hoje em `draft` afirmando "persistência em localStorage" e "o
  backend ainda não existe". As duas afirmações são falsas desde 14/07.

## O bug de `kind` entra neste card, e não é impacto zero

`device-stream.consumer.ts` deriva o `kind` do evento de detecção invertido em relação ao que os nomes
sugerem, encontrado em 03/08, código intocado desde 14/07. Uma leitura anterior desta nota - e da nota de
arquitetura do domínio, corrigida em 24/08 - dizia que o impacto funcional era zero, porque o overlay de
desenho (`camera-analytics-store.service.ts`) nunca lê `event.kind`. Isso é verdade, mas incompleto:
**`camera-analytics-panel.component.html:234` renderiza `{{ entry.kind }}` cru no log de detecção ao vivo
da aba Analíticos**, com `[attr.data-kind]` colorindo `VIRTUAL_LOOP` diferente - hoje o operador lê o
rótulo trocado (ver [[Analítico - Arquitetura e estratégias]], seção do bug de `kind`).

Como não existe spec fixando a semântica nem `device-stream.consumer.spec.ts` no repo, o flip do ternário
entra **junto** com o teste que trava o significado - não como correção às cegas de um campo sem dono.

## DoD

Cadastro de câmera pela interface grava `deviceSourceId` e a câmera passa a aparecer no binding do
consumer sem edição manual de banco, com teste de integração cobrindo o caminho. PR #1355 mergeada junto,
com `deviceAnalyticId` zerado da develop e a `UF-033` reescrita. Flip do `kind` corrigido, com
`device-stream.consumer.spec.ts` novo travando a semântica correta.

## Encosta em

- [[Analítico - Requisitos e SLA]], seção "Ciclo de vida do analítico", onde a regra está registrada.
- [[Analítico - Entidade, persistência de região e unicidade]], que promove essa chave a entidade. Este
  card conserta o sangramento; o outro tira a chave do `Json`.
- [[SOFTWARE-2391 - Pendências do analítico embarcado]] e [[Attlas - Sprint 30]].
