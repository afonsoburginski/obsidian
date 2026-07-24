---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2321
frente: Infra / CI
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: Closed (mergeada 24/07 na #1038)
atualizado: 2026-07-24
pr: https://github.com/atmanadmin/attlas-2026/pull/1038
---

# SOFTWARE-2321 - Integração enfileira no runner em vez de cancelar na fila

O concurrency group da integração (criado no [[SOFTWARE-2312 - Cache-correctness do NX no CI + serialização da integração|2312]] pra serializar) tinha um efeito colateral da plataforma: o GitHub só mantém 1 job rodando + 1 esperando por grupo, e um pendente novo cancela o pendente antigo. Resultado: jobs de PRs diferentes se cancelando "do nada" na fila.

## O que foi feito

- O job de integração perdeu o concurrency group próprio: a fila passou a ser no nível dos 3 runners heavy (fila de runner é FIFO de verdade, sem cancelamento cross-PR).
- Cancelamento continua existindo só onde faz sentido: push novo na MESMA PR substitui a run anterior dela (grupo `ci-pr-<ref>` do workflow).
- Como a integração voltou a rodar concorrente (até 3 na VM), a limpeza de testcontainers do workflow e do hook ficou restrita a container parado; rodando, só ao fim de integração com um único worker vivo (ver [[SOFTWARE-2322 - Higiene automática dos runners de CI|2322]]).

Validado no dia com o teste de estresse real: 8 PRs do dashboard disparando CI juntas, integrações enfileirando sem nenhum cancelamento. Runs criadas antes do merge carregam o grupo antigo pra sempre (snapshot), então o efeito fantasma entre runs velhas morreu sozinho conforme elas terminaram.
