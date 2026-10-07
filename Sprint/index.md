---
tags:
  - attlas
  - index
aliases:
  - "Sprints - índice raiz"
atualizado: 2026-10-07
---

# Sprints - índice raiz

Planejamento semanal do squad 2. Cada pasta é uma sprint, e **um arquivo só** responde por ela:
`Sprint/NN/index.md`, com o que aquela semana entrega na primeira metade e o planejamento detalhado
(estimativa, fatiamento em PR, riscos, decisões em aberto) na segunda. O alias `Attlas - Sprint NN`
aponta para esse mesmo arquivo.

Fonte de verdade: **este vault**. O ClickUp é publicação para o gestor, não o lugar onde se planeja.

## Semana corrente

| Sprint | Janela | Frente | Situação |
| --- | --- | --- | --- |
| [[Attlas - Sprint 36\|36]] | 05-11/10 | **Câmeras e Analítico** - telas de Eventos, realce e AV1 no player, Neural Labs pela tela | Aberta em 05/10. Em 07/10 de manhã, 21 PRs mergeadas em 16 tasks, 14 delas com todas as PRs mergeadas; abertas a #6146 (fim dos backups `.bak` do `setup:env`) e a #6147 (limpeza do `ms-video-analytics`). Seis issues fechadas; a 5469 foi reaberta pelo QA em 06/10, e a 5808 e a 5977 seguem abertas, atendidas em parte. Nenhum card no ClickUp |

## Histórico

| Sprint | Janela | Frente | Como fechou |
| --- | --- | --- | --- |
| [[Attlas - Sprint 35\|35]] | 28/09-04/10 | **Câmeras e Analítico** - issues abertas, Neural Labs, Métricas e caixa da Detecção | Fechada com 48 PRs mergeadas em 31 tasks e as 19 issues que elas atacavam fechadas em 29/09. O novo desenho da caixa sobre o vídeo foi revertido no dia seguinte, o plano da pipeline de CI e CD (#5666) segue em rascunho com pedido de mudança, e sete PRs abertas na semana foram mergeadas na 36. Nenhum card no ClickUp |
| [[Attlas - Sprint 34\|34]] | 21-27/09 | **ms-cameras** - streaming, issues abertas e o ANPR do cliente | Fechada com as 32 tasks da tabela entregues e 58 PRs mergeadas: streaming sem vazamento de publicador, 27 das 28 issues do rótulo `cameras` (a 1875 fechou em 05/10) e a integração com o NEURAL SERVER |
| [[Attlas - Sprint 33\|33]] | 14-20/09 | **Analítico** - entrega e validação | Fechada com as 34 PRs integradas. Era a semana do prazo externo do módulo Analítico, 18/09, front e backend |
| [[Attlas - Sprint 32\|32]] | 07-13/09 | **Analítico** - fechamento da cadeia | Replanejada em 09/09 contra o inventário do módulo ([[Analítico - Pendências|Analítico - O que falta para fechar o módulo]]): 12 PRs e 35 pts. Entraram o modo edição da aba Detecção, a base de docs que faltava e a face default de Métricas; ACOM, Dashboard e decisão automatizada ficaram fora, declarados |
| [[Attlas - Sprint 31\|31]] | 31/08-06/09 | **Analítico servidor** - Virtual Loop em container | Fechada em 05/09 com 10 de 10 cards e 32 pts: ingestão de stream, detecção por frame, ocupação, vínculo com detector, publicação do raw e a tela de métricas do Laço Virtual |
| [[Attlas - Sprint 30\|30]] | 24-30/08 | **Analítico** - camada de gestão do embarcado | Fechada em 28/08 com 11 de 11 cards e 51 pts, em 5 telas |
| [[Attlas - Sprint 29\|29]] | 17-23/08 | Rollover da 28 | 34 cards não fechados vindos da 28, sem planejamento próprio |
| [[Attlas - Sprint 28\|28]] | 10-16/08 | VMS e videowall externo (NovaStar H9) | Renome para VMS entregue; os cards não fechados foram para a 29 |
| [[Attlas - Sprint 27\|27]] | 03-09/08 | Analítico em container (primeira tentativa) | Sem entrega: 14 PRs de spec abertas e nunca mergeadas, fechadas no reescopo de 24/08 |
| [[Attlas - Sprint 26\|26]] | 27/07-02/08 | Permissões de câmeras e refino de backlog | 6 cards fechados e 1 em code review |
| [[Attlas - Sprint 25\|25]] | 20-26/07 | Dashboard e eventos de câmeras | Os 26 cards da lista fechados; sobraram o analítico desacoplado e o videowall externo |
| [[Attlas - Sprint 24\|24]] | 13-19/07 | Analítico de vídeo ao vivo e provisionamento no cadastro | Fechada com os dois cards mergeados |
| [[Attlas - Sprint 23\|23]] | 06-12/07 | Sessões de streaming, telemetria e perfis de mídia | 4 de 8 mergeadas; o resto foi para a 24 |
| [[Attlas - Sprint 22\|22]] | 29/06-05/07 | WebRTC público, eventos e saúde de câmeras | Fechada com as 7 tasks e a CROSS-032 mergeadas |

## Fora de sprint

- [[Sem prazo (backlog)]] - cards sem data de entrega e o reescopo datado de cada um, incluindo a
  task [[SP-01 - Infraestrutura - CI - Runner profissional em Kubernetes com ARC]], que entrou em 23/09.

## Roteiro de reunião

- [[S32-11 - Processo - Planejamento - Sprints 31 e 32]] - fechamento da Sprint 31 e proposta de escopo da 32, escrito em 04/09
  para a reunião de planejamento.

## Convenção desta pasta

| Papel | Nome do arquivo |
| --- | --- |
| **A sprint** - o que entrega, e o planejamento inteiro | `Sprint/NN/index.md`, com alias `Attlas - Sprint NN` |
| Task | `Sprint/NN/S<NN>-<seq> - <Domínio> - <Frente> - <Assunto>.md`, ex.: `S34-07 - Câmeras - Streaming - Um ingest por câmera` |
| Task sem data de entrega | `Sprint/Sem prazo/SP-<seq> - <Domínio> - <Frente> - <Assunto>.md`, listada em [[Sem prazo (backlog)]] |

A regra completa, com o que é ID, domínio e frente, está em [[Processo - Convenção de nomes#Tasks de sprint]].

As sprints 22 a 29 tinham o arquivo principal como `Attlas - Sprint NN.md` e passaram a `index.md` em
23/09, com o nome antigo como alias, para toda sprint seguir o mesmo formato. Dentro da nota de uma
sprint não se linka para ela mesma: o planejamento detalhado é uma seção logo abaixo, não outra nota.

Frontmatter de card: `card` (ID do ClickUp), `clickup` (URL), `titulo` (com prefixo `[Back]`/`[Front]`/
`[Full]`), `tamanho` em pontos, `status` (uma frase com a data), `sprint` (wikilink) e `atualizado`.

## Ver também

[[Docs - índice raiz]] · [[Analítico]] · [[ms-cameras]] · [[Reports diários]]
