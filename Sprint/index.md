---
tags:
  - attlas
  - index
aliases:
  - "Sprints - índice raiz"
atualizado: 2026-09-27
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
| [[Attlas - Sprint 34\|34]] | 21-27/09 | **ms-cameras** - streaming, issues abertas e o ANPR do cliente | Aberta em 21/09 pela validação das telas de stream, que reproduziu o vazamento de publicador. **Em 23/09: 28 de 30 tasks feitas (106 de 129 pts)**, com as 34 PRs da tabela mergeadas. Segue aberto só o NEURAL SERVER (#4403, projeto sem atômica): as Instâncias do Analítico (#4414) foram mergeadas em 24/09 à tarde. Das 28 issues do rótulo `cameras`, 27 fechadas. No mesmo dia o CI virou um runner scale set de 20 vagas e a integração foi desligada, fora do plano. **Madrugada de 24/09**: #4403/#4414/#4433 pegaram Build vermelho por um import quebrado que já estava na develop (`ms-traffic-model`, nada delas); fix em aberto na [[Sprint/34/index#Atualização - 24/09, madrugada\|#4449]]. **Em 26/09**: #4688 e #4816 mergeadas à tarde; à noite a #4862 (stream de alarmes preso na borda do dev.v2), a #4887 (Neural Labs sem tela própria, placa ACOM no campo Detector, Sincronizar na linha de Instâncias) e a #4891 (cache da topologia e Sincronizar que traz de volta a instância offline), ver [[Sprint/34/index#Atualização - 26/09, noite\|a atualização da noite]]. **Em 27/09 de madrugada**: a #4909 (navegação lenta do dev.v2, WebSockets do `ms-cameras` e deploy só manual) aberta com CI verde, e o host do EC2 ajustado (BBR, sem slow start após ocioso, sessões esquecidas do Redis encerradas), ver [[Sprint/34/index#Atualização - 27/09, madrugada\|a atualização da madrugada]] |

## Histórico

| Sprint | Janela | Frente | Como fechou |
| --- | --- | --- | --- |
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
  task [[CI - runner profissional em Kubernetes com ARC]], que entrou em 23/09.

## Roteiro de reunião

- [[Planning - Sprint 31 e 32]] - fechamento da Sprint 31 e proposta de escopo da 32, escrito em 04/09
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
