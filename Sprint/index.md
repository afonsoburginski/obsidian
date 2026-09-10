---
tags:
  - attlas
  - index
aliases:
  - "Sprints - índice raiz"
atualizado: 2026-09-09
---

# Sprints - índice raiz

Planejamento semanal do squad 2. Cada pasta é uma sprint, e **um arquivo só** responde por ela:
`Sprint/NN/index.md`, com o que aquela semana entrega em feature e em tela na primeira metade, e o
planejamento detalhado (estimativa, fatiamento em PR, riscos, decisões em aberto) na segunda. O alias
`Attlas - Sprint NN` aponta para esse mesmo arquivo - não existe nota separada ao lado.

Fonte de verdade: **este vault**. O ClickUp é publicação para o gestor, não o lugar onde se planeja.

## Semana corrente e o que vem

| Sprint | Janela | Frente | Entrega |
| --- | --- | --- | --- |
| [[Attlas - Sprint 30\|30]] | 24-30/08 | **Analítico** - camada de gestão do embarcado | **Fechada em 28/08**: 11 de 11 cards, 51 pts. Entidade em banco, saúde do analítico, writer do vínculo, compatibilidade ARTPEC, dedup de incidente, preset com snapshot, evidência. 5 telas. Resíduo só o `SOFTWARE-2794`, em code review |
| [[Attlas - Sprint 31\|31]] | 31/08-06/09 | **Analítico servidor** - Virtual Loop em container | **Fechada em 05/09**: 10 de 10 cards, 32 pts. Ingestão de stream, detecção por frame, ocupação, vínculo com detector, publicação do raw, mais a tela de métricas do Laço Virtual. No sábado entraram 4 PRs fora do plano: peso do modelo, `MOD-002` de escala, pedestre como segundo agente e a remoção dos três scaffolds |
| [[Attlas - Sprint 32\|32]] | 07-13/09 | **Analítico** - fechamento da cadeia | **Replanejada em 09/09** contra o inventário do módulo ([[Analítico - O que falta para fechar o módulo]]): 12 PRs (11 em cascata + o refinamento de emergência), 35 pts nos cinco dias restantes. Entram o modo edição da aba Detecção (recurso Visão Geral do edital, construído e desligado), a base de docs que faltava e a face default de Métricas, além dos 3 cards. ACOM, Dashboard e decisão automatizada ficam fora do prazo, declarados |

| [[Attlas - Sprint 33\|33]] | 14-20/09 | **Analítico** - a semana do prazo | **Criada em 09/09.** O prazo externo de 18/09 cai na quinta desta janela, então não é semana de desenvolvimento cheio: carrega 15 pts em 4 tasks (ATSPM Split Monitor e Yellow/Red, a face lendo os dois grupos novos, e o histórico de configuração se sobrar) mais a entrega. Sem lista no ClickUp por ora, porque três das quatro dependem do que a 32 fechar |

> [!important] Prazo externo do módulo Analítico: 18/09/2026, front e backend
> A data cai na **[[Attlas - Sprint 33|Sprint 33]]**, que agora tem nota própria - as sprints 30, 31 e 32
> são o desenvolvimento cheio antes da entrega. A conta de capacidade **não fecha com um dev** no escopo atual: ver
> [[Attlas - Sprint 30]], seção "O veredito de capacidade".

## Histórico

| Sprint | Janela | Frente | Como fechou |
| --- | --- | --- | --- |
| [[Attlas - Sprint 29\|29]] | 17-23/08 | Rollover da 28 | 34 cards não-Closed movidos da 28, sem planejamento próprio |
| [[Attlas - Sprint 28\|28]] | 10-16/08 | VMS e videowall externo (NovaStar H9) | - |
| [[Attlas - Sprint 27\|27]] | 03-09/08 | Analítico em container (primeira tentativa) | **Sem entrega** - 14 PRs de spec abertas e nunca mergeadas; fechadas no reescopo de 24/08 |
| [[Attlas - Sprint 26\|26]] | 27/07-02/08 | Permissões de câmeras, refino de backlog | - |
| 25, 24, 23, 22 | jun-jul | - | pastas com notas de card da época |

## Roteiro de reunião

- [[Planning - Sprint 31 e 32]] - fechamento da Sprint 31 e proposta de escopo da 32, com a conta do
  ATSPM por grupo de métrica. Escrito em 04/09 para a reunião de planejamento.

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
continuarem resolvendo. Como os dois aliases (`Attlas - Sprint NN` e `Sprint NN - o que entrega`)
resolvem para o mesmo arquivo, **dentro** da nota de uma sprint não se linka para ela mesma: o
planejamento detalhado é uma seção logo abaixo, não outra nota.

Frontmatter de card: `card` (ID do ClickUp), `clickup` (URL), `titulo` (com prefixo `[Back]`/`[Front]`/
`[Full]`), `tamanho` em pontos, `status` (uma frase com a data), `sprint` (wikilink) e `atualizado`.

## Ver também

[[Docs - índice raiz]] · [[Analítico]] · [[ms-cameras]]
