---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
card: SOFTWARE-2519
clickup: https://app.clickup.com/t/86ak0tepc
titulo: "[Back] Videowall externo: consumidor do comando de plano e echo idempotente"
frente: Videowall externo (NovaStar H9)
tamanho: 2 pts
status: Fechado. PR [#1761](https://github.com/atmanadmin/attlas-2026/pull/1761) mergeada em 21/08. Saiu intacta do refactor de contrato: o listener é do `ms-cameras`, importa só de `@attlas/contracts` e espelha o listener de PTZ, então zero linha de adaptação. Oito arquivos.
pr: "[#1761](https://github.com/atmanadmin/attlas-2026/pull/1761)"
sprint: "[[Attlas - Sprint 29]]"
atualizado: 2026-08-22
---

# SOFTWARE-2519 - Consumidor do comando de plano e echo

O lado de câmeras do trilho de plano, e é a entrega que fecha verde antes de existir acesso ao equipamento.

## Escopo (1 PR)

Recebe o comando de videowall do motor de planos, valida o escopo de tenant nos dois eixos, aplica o portão
de capacidade **antes de qualquer escrita** e ecoa execução ou recusa com identificador derivado do comando,
para que uma reentrega colapse no registro do motor em vez de duplicar objeto na parede.

Sem capacidade confirmada, responde recusa com código estável, e o teste prova que nada foi escrito no
equipamento nem no banco. É por isso que este card não depende do acesso à VM que alcança o H9, que segue
pendente desde 31/07.

## Relacionados

[[Attlas - Sprint 28]] · [[Videowall externo (NovaStar H9)]]
