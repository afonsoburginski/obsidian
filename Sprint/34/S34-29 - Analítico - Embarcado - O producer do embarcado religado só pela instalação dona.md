---
id: S34-29
tags:
  - attlas
  - task
  - sprint-34
  - analitico
  - ms-cameras
  - backend
titulo: "[Back] Analítico - só a instalação dona do analítico embarcado religa o producer"
frente: Analítico
tamanho: 3 pts
pr: "#4296"
status: "PR #4296 mergeada em 22/09 às 21h56. A env precisa estar declarada no host do dev.v2 para o reparo agir lá, e isso não foi conferido."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
aliases:
  - "Analítico - o producer do embarcado religado só pela instalação dona"
---

# S34-29 - Analítico - Embarcado - O producer do embarcado religado só pela instalação dona

Fora das quatro frentes da semana: nasceu de um defeito visto no dev.v2 em 22/09. A atômica é a
`INT-026` do `ms-cameras`.

## O que estava errado

O app do analítico embarcado desliga o próprio producer depois de reinício ou de escrita de
configuração, e o reparo do `ms-cameras` só tentava religar na transição de status. Em 22/09 a
10.1.1.80 ficou saudável e muda na tela de Detecção do dev.v2 das 13h21 às 15h43, com o broker certo
e o producer desligado. O reparo periódico antigo tinha sido revertido porque várias instalações
escreviam no mesmo equipamento e o mantinham reiniciando em laço.

## O que muda

Cada instalação declara em `ANALYTICS_OWNED_DEVICE_SOURCE_IDS` os equipamentos que governa. Só a dona
religa, a cada ciclo do diagnóstico enquanto a fonte estiver muda e respeitando o intervalo de 120 s,
e ela só liga o producer: nunca escreve `source_id` nem configuração. Quem não declarou não escreve
nada no equipamento, o que fecha as duas causas do laço de reinício. A env é validada no boot e vive
no ambiente do host, com a chave vazia no `.env.example`. As atômicas `UC-055`, `UC-057`, `PROJ-014` e
`INT-023` foram atualizadas para o caminho novo.

## O que tem de valer no fim

Com a env vazia, nenhuma escrita automática sai para equipamento nenhum. Com o `source_id` declarado e
o producer desligado, o producer volta em até 120 s mais um ciclo do diagnóstico, mesmo que o veredito
de saúde não mude. A prova no dev.v2 é o log do `ms-cameras` mostrando o producer voltando sozinho
depois de desligado na 10.1.1.80, e ela depende de a env estar no host com o `source_id`
`1414dde8-b0fa-4a0b-a630-e144ac9f738c`.

## Relacionado

- [[Analítico - Arquitetura e estratégias]], onde o reparo do producer está descrito.
- [[Analítico - Embarcado x Servidor]], com o histórico do producer desligado na 10.1.1.80.
- [[Attlas - Sprint 34]].
