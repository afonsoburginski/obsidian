---
tags:
  - attlas
  - task
  - backlog
  - sem-prazo
  - analitico
card: SOFTWARE-2397
clickup: https://app.clickup.com/t/86aju7cg8
titulo: "[Back] Analítico em container: publicar a ocupação no Kafka"
frente: Analítico em container
tamanho: 2 pts
status: SEM PRAZO desde 10/08 (frente do analítico despriorizada; a Sprint 27 fechou sem entrega e a 28 foi para VMS e videowall externo). PR em draft segue aberta. Histórico: comprometido (sexta). Validado contra a develop em 03/08. PR aberta em draft: [#1350](https://github.com/atmanadmin/attlas-2026/pull/1350). ClickUp movido para `in progress`.
sprint: "[[00 - Sem prazo (backlog)]]"
atualizado: 2026-08-10
---

# SOFTWARE-2397 - Analítico em container - publicar ocupação no Kafka

A ocupação sai do container e entra no Attlas: contrato do evento mais o producer. É a fronteira
entre o analítico e o resto da plataforma.

## Escopo (1 PR)

Tópico e interface de evento em contratos compartilhados, com guard de validação, e a lista de
tópicos regenerada pelo gerador do repositório, nunca editada à mão. Producer no analítico,
publicando por câmera e região, com o relógio de âncora declarado e quantização na mesma unidade
que o domínio de detecção usa. Uma publicação por câmera e região, não uma por sistema-tenant.
Métricas de publicação e de falha de publicação.

## Validação 03/08

Card conferido contra a develop: não existe hoje nenhum contrato, tópico ou código de ocupação
normalizada em lugar nenhum do repositório, então este card é genuinamente greenfield.

A forma do evento espelha deliberadamente a forma do evento canônico de detector, endereçado por
câmera e região em vez de controlador e índice, para a tradução no connector ficar fina. O tópico
nasce num domínio próprio de analítico, e não dentro do domínio de câmeras, porque o teste que trava
a lista de tópicos de câmeras contra a documentação do módulo obrigaria a mexer nessa spec sem
necessidade. Não é preciso uma especificação cruzada entre serviços para este tópico: um produtor
único com a especificação registrada basta.

A posse da agregação de ocupação por ciclo continua do lado do histórico de detecção, que já
calcula essa métrica a partir da série que persiste. Este card só publica o evento por região, e a
especificação do domínio de detectores ganha uma seção declarando essa divisão para não conflitar
com o que já está documentado.

Antes de congelar a forma do evento, vale conferir contra o trabalho em andamento de outro squad
sobre ocupação de faixa e identidade de detector, para o contrato não nascer surdo ao que o
consumidor já está construindo.

## DoD

Evento no tópico, com câmera real, validado pelo guard. Forma do evento compatível com o que o
analítico embarcado emite, para os dois caminhos convergirem sem contrato duplicado.

## Dependência

[[SOFTWARE-2396 - Analítico em container - laço virtual e ocupação|2396]].

## Referências

- [[SOFTWARE-2387 - Especificação do connector de laço virtual|2387]], que consome este contrato.
- [[SOFTWARE-2388 - Analítico embarcado no mesmo contrato de ocupação|2388]], convergência com o embarcado.
- [[Attlas - Sprint 27]].
