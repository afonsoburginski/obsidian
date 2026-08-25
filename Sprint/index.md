---
tags:
  - attlas
  - index
aliases:
  - "Sprints - índice raiz"
atualizado: 2026-08-25
---

# Sprints - índice raiz

Planejamento semanal do squad 2. Cada pasta é uma sprint e tem o seu `index.md` respondendo **o que
aquela semana entrega, em feature e em tela** - a nota `Attlas - Sprint NN` ao lado carrega o
planejamento detalhado (estimativa, fatiamento em PR, riscos, decisões em aberto).

Fonte de verdade: **este vault**. O ClickUp é publicação para o gestor, não o lugar onde se planeja.

## Semana corrente e o que vem

| Sprint | Janela | Frente | Entrega |
| --- | --- | --- | --- |
| [[Attlas - Sprint 30\|30]] | 24-30/08 | **Analítico** - camada de gestão do embarcado | Entidade em banco, saúde do analítico, writer do vínculo, compatibilidade ARTPEC, dedup de incidente, preset com snapshot, evidência. 5 telas |
| [[Attlas - Sprint 31\|31]] | 31/08-06/09 | **Analítico servidor** - Virtual Loop em container | Ingestão de stream, detecção por frame, ocupação, vínculo com detector, publicação do raw |
| [[Attlas - Sprint 32\|32]] | 07-13/09 | **Analítico** - fechamento da cadeia | Escala (câmeras por instância) e prova de campo ponta a ponta |

> [!important] Prazo externo do módulo Analítico: 18/09/2026, front e backend
> A data cai na **Sprint 33**, depois do fim da 32 - as três semanas acima são o desenvolvimento cheio
> antes da entrega. A conta de capacidade **não fecha com um dev** no escopo atual: ver
> [[Attlas - Sprint 30]], seção "O veredito de capacidade".

## Histórico

| Sprint | Janela | Frente | Como fechou |
| --- | --- | --- | --- |
| [[Attlas - Sprint 29\|29]] | 17-23/08 | Rollover da 28 | 34 cards não-Closed movidos da 28, sem planejamento próprio |
| [[Attlas - Sprint 28\|28]] | 10-16/08 | VMS e videowall externo (NovaStar H9) | - |
| [[Attlas - Sprint 27\|27]] | 03-09/08 | Analítico em container (primeira tentativa) | **Sem entrega** - 14 PRs de spec abertas e nunca mergeadas; fechadas no reescopo de 24/08 |
| [[Attlas - Sprint 26\|26]] | 27/07-02/08 | Permissões de câmeras, refino de backlog | - |
| 25, 24, 23, 22 | jun-jul | - | pastas com notas de card da época |

## Fora de sprint

- [[00 - Sem prazo (backlog)]] - cards meus sem data de entrega, e o que aconteceu com cada um dos 14
  cards da frente do analítico depois do reescopo de 24/08.

## Convenção desta pasta

| Papel | Nome do arquivo |
| --- | --- |
| **A sprint** - o que entrega, e o planejamento inteiro | `Sprint/NN/index.md` (alias `Attlas - Sprint NN`) |
| Card | `Sprint/NN/<Frente> - <assunto>.md`, com `(front)` no nome quando for tela |
| Card que deixou de existir | `Sprint/NN/Absorvido - <assunto>.md` - registro do escopo, não é task |

**Um arquivo por sprint.** Havia dois (`index.md` e `Attlas - Sprint NN.md`) até 25/08, o que gerava
dúvida sobre qual era a porta de entrada - consolidados num só, com alias para os wikilinks antigos
continuarem resolvendo.

Frontmatter de card: `card` (ID do ClickUp), `clickup` (URL), `titulo` (com prefixo `[Back]`/`[Front]`/
`[Full]`), `tamanho` em pontos, `status` (uma frase com a data), `sprint` (wikilink) e `atualizado`.

## Ver também

[[Docs - índice raiz]] · [[Analítico]] · [[ms-cameras]]
