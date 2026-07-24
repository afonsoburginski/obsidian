---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2289
epico: SOFTWARE-2047
frente: Eventos de câmeras - backend
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: Closed (entregue na #951, mergeada 24/07)
pontos: 2
atualizado: 2026-07-23
spec: MOD-001-cameras-events
pr: https://github.com/atmanadmin/attlas-2026/pull/951
---

# SOFTWARE-2289 - Eventos câmeras: integração front ↔ back

Card `[Front]` que fechou a lacuna: o backend dos Eventos foi entregue (2220-2224) mas a tela ainda consumia mock. Este liga a tela de Eventos (`cameras-events`) aos endpoints reais do `ms-cameras`. 1 PR.

## O que fez

- `camera-events.service.ts`: removeu o `useMock` e os ramos de mock de **stats, timeline, recurrence, observations, report** - o serviço virou HTTP puro.
- Removeu o overlay de mock de `triggeredActions` no detalhe (agora vem real do 2222).
- Removeu o mock órfão `mocks/camera-events.mock.ts` (ninguém mais importava). Diff: +9 / -596.

Os paths do front já batiam 1:1 com o controller do `ms-cameras`, então foi só tirar os mocks - nenhuma mudança de assinatura ou de componente.

## Dependência

Precisa que **2222 (#896, timeline)** e **2223 (#897, recurrence)** entrem na develop antes de mergear - as rotas `/events/:id/timeline` e `/events/:id/recurrence` só existem depois. Stats (2221), observações e reportar (2224) e a base (2220) já estão na develop.

## Correções do 2º review (23/7, commit 0a4f5bc71)

- Bloqueante 1: handler de stats migrado pro `buildCameraEventsWhere` - KPIs agora honram origin/status/state/area/subarea (topologia resolvida como na lista); janela `occurredAt` injetada por override; UC-040 atualizada pra refletir o código.
- Bloqueante 2: CROSS-039 movida pra in-review (reviewers Felipe + Hadson) e sincronizada com a realidade - criar/responder persistem via POST, excluir segue client-side (sem endpoint). UF-018 e MOD-001 idem.
- Bloqueante 3: `CreateCameraEventObservationDto` agora `implements ICreateCameraEventObservationRequest` (interface renomeada pro padrão `ICreate<Entidade>Request` em arquivo próprio).
- Ajustes: aria-label + cdkTrapFocus + foco devolvido ao trigger no date picker; `effect()` do filter panel trocado por `linkedSignal`/`computed`; testes de falha de POST (rascunho preservado), double-submit e erros HTTP no service.
- 10 threads respondidas e resolvidas; re-review solicitado.

## Fechamento (23/7) - mergeada

- Cache TTL+LRU no `CameraEventsService` (sobrevive à navegação entre telas) + estado `revalidating`: reaplicação de filtro/busca/paginação não desmonta mais a tabela/KPIs pro skeleton quando já há dado na tela. Fade de transição próprio (sem `@angular/animations`) que toca por completo independente da velocidade da resposta.
- Mapa do drawer de detalhe passou a ficar sempre visível (antes desaparecia sem lat/lng); corrigido de passagem um warning do maplibre sobre sprite ausente no basemap vetorial.
- Corrigida a linha da timeline de histórico que não alcançava o próximo marcador (bug de flexbox no componente compartilhado com o side card de câmeras).
- Removido o filtro de Status do painel (estava com o rótulo duplicado do filtro de Severidade - bloqueante do review); ficou só Severidade.
- Resolvido o conflito de merge com a develop e mais 2 apontamentos de review (label duplicado, box-shadow hardcoded).
- Corrigidos 2 testes de integração que quebraram por causa da correlação de tampering (SOFTWARE-2294, entrou hoje mais cedo): assumiam que `VAPIX_TAMPERING` não era correlacionável, e passou a ser.

## Plano pós-aprovação (divisão em 3 fases)

Quando o review passar, dividir a entrega em 3 cards: tela principal (este, 2289), side card/drawer (novo card 86ajny8x2, criado 23/7) e página de detalhes (2294).

## Fora de escopo

Evidências multipart do reportar e alvos ALARM/OS - follow-up do backend. Delete de observação sem endpoint (client-side) - follow-up.

Frente: [[Eventos de câmeras - backend]]. Épico SOFTWARE-2047.
