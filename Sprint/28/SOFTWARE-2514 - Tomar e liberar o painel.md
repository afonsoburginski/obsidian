---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
card: SOFTWARE-2514
clickup: https://app.clickup.com/t/86ak0tem7
titulo: "[Back] Videowall externo: tomar e liberar o painel"
frente: Videowall externo (NovaStar H9)
tamanho: 3 pts
status: criado em 14/08 na lista da Sprint 28, em backlog, depois da citação da cláusula 16.13 do contrato de Quito.
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-14
---

# SOFTWARE-2514 - Tomar e liberar o painel

É o gesto de posse do painel, e o que faz dele um recurso em vez de uma ação é ter dono e ter duração: tomar cria, liberar apaga.

## Escopo (1 PR)

Tomar o painel para espelhar a tela da consola e liberá-lo quando termina. Um ocupante de cada vez, e a
garantia é unicidade no banco, não checagem no handler, porque duas tomadas concorrentes passariam as duas
pela checagem antes de qualquer uma escrever.

Inclui a tomada administrativa, com registro de quem tomou e de quem, e o fluxo em que uma projeção de plano
de resposta desloca o ocupante, avisando o deslocado. O modelo persistido é **ocupação com tipo**, decidido
em 14/08: espelho e projeção disputam a mesma parede, e dois modelos significariam dois donos e nenhuma
resposta para o que a parede está mostrando.

## Atenção

A migration desta entrega precisa ser gerada pelo CLI do Prisma, com o banco de pé. O arquivo de model já
está ajustado no checkout, mas o SQL que estava junto ficou defasado quando a sessão de espelho virou
ocupação com tipo.

## Relacionados

[[Attlas - Sprint 28]] · [[Videowall externo (NovaStar H9)]] · [[Cláusula 16.13 do contrato de Quito]]
