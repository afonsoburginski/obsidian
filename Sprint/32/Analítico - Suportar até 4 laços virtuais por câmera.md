---
tags:
  - attlas
  - task
  - backlog
  - sem-prazo
  - analitico
card: SOFTWARE-2686
clickup: https://app.clickup.com/t/86ak5e32x
titulo: "[Back] Suportar até 4 laços virtuais por câmera"
frente: Analítico
tamanho: 5 pts
status: SEM PRAZO desde 24/08. Requisito decidido nas notas de alinhamento, não é decisão em aberto - ficou fora da Sprint 30 e da Sprint 31 por tamanho (redesenho de contrato), as duas já lotadas. Card criado no ClickUp em 24/08, na lista da Sprint 30 (vigente), status backlog.
sprint: "[[00 - Sem prazo (backlog)]]"
atualizado: 2026-08-24
---

# Analítico - Suportar até 4 laços virtuais por câmera

Requisito das notas de alinhamento (`Docs/Analítico/Anotações sobre Analítico de vídeo.md`, seção
"Acom"): *"cada analítico tem um máximo de 4 laços por câmera"*. Não é decisão em aberto - está escrito.
O que falta é o redesenho de contrato que o requisito exige, e por isso o card ficou no sem prazo em vez
de entrar na Sprint 30 ou na Sprint 31: as duas já estavam cheias, e este é trabalho novo de tamanho
considerável, não um ajuste pontual.

## O que contradiz hoje

`IVirtualLoopConfig` (`libs/contracts/src/lib/virtual-loop/i-virtual-loop.ts`) é hoje **uma configuração
única por câmera** - `active`, `classes`, `delaySeconds` - e o docblock é explícito: *"the virtual loop
has no geometry of its own: it shares the object-detection regions and is a single, camera-wide setting
(not per region)"*. Suportar 4 laços exige que o laço deixe de ser único por câmera e passe a ser um
array bounded, cada item com a sua própria configuração e (provavelmente) a sua própria referência de
região - porque "4 laços" só faz sentido distinto se cada um observa uma região diferente.

## O que muda, provavelmente

Não fechado ainda, porque depende da entidade e da persistência de região que a
[[Analítico - Entidade, persistência de região e unicidade]] cria primeiro:

1. **Contrato**: `IVirtualLoopConfig` vira `IVirtualLoopConfig[]` (ou um wrapper com array), com limite
   de 4 validado na classe de validação (`@attlas/contracts`).
2. **Persistência**: se a entidade Analítico e a geometria de região já estão em banco (Sprint 30), o
   laço vira uma linha por região vinculada ao analítico, não mais um campo único.
3. **Backend embarcado**: `camera-regions.controller.ts` (`GET/PUT /cameras/:id/virtual-loops`) passa a
   aceitar/devolver lista, não objeto único.
4. **Frontend**: a aba Analíticos hoje desenha uma configuração de laço por câmera; passa a precisar de
   UI para até 4, cada um associado à sua região.
5. **Analítico servidor**: quando a Sprint 31 entregar o `ms-virtual-loop`, a projeção de ocupação
   (`Analítico servidor - Laço virtual e ocupação da região`) precisa considerar múltiplos laços por
   câmera desde o desenho, não como retrofit.

## Por que não coube nas duas sprints já planejadas

A Sprint 30 (25 pts, 10 cards) e a Sprint 31 (21 pts, 8 cards) já estão no tamanho que a regra de mínimo
de 8 PRs por sprint pede sem inflar demais. Este card depende da entidade da Sprint 30 para fazer sentido
(um laço "pertence" a um analítico, e o analítico só passa a existir como entidade nesta sprint), então
não podia vir antes dela - e é grande o bastante (contrato + persistência + backend + frontend) para
merecer sprint própria em vez de forçado como 11º ou 9º card.

## DoD

`IVirtualLoopConfig` suporta até 4 configurações por câmera, cada uma vinculada a uma região distinta,
com validação de limite no contrato e teste de integração cobrindo o teto. Endpoints de
`virtual-loops` atualizados. Frontend fora do escopo deste card (entra como spec `UF-*` própria).

## Encosta em

- [[Analítico - Entidade, persistência de região e unicidade]], pré-requisito de fato.
- [[Analítico - Embarcado x Servidor]], onde a contradição está documentada.
- [[Analítico servidor - Laço virtual e ocupação da região]], que precisa considerar isso no desenho da
  Sprint 31 mesmo sem implementar aqui.
