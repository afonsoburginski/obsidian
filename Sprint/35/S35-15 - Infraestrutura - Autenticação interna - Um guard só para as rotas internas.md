---
id: S35-15
tags:
  - attlas
  - task
  - sprint-35
  - infraestrutura
  - autenticacao
  - backend
titulo: "[Back] Auth S2S dos serviços restantes passa a usar @attlas/core-auth"
frente: Autenticação interna
pr: "#5157"
issues: "#3375"
status: "Feita. #5157 mergeada em 29/09 às 14h30; a issue fechada no mesmo dia."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-15 - Infraestrutura - Autenticação interna - Um guard só para as rotas internas

## O que se pediu

Cada serviço com rota interna, chamada de serviço para serviço fora do Kong, carregava a própria cópia
do guard que confere o token `x-internal-service-token`. A issue pedia que todos usassem o guard único de
`@attlas/core-auth`, para a próxima rota interna nascer copiando da lib e não do vizinho.

## O que a PR entregou

As cópias saem de `ms-cameras`, `ms-connector-virtual-loop`, `ms-controllers`, `ms-pmv`,
`ms-video-analytics` e `ms-organization`, e o cliente HTTP do `ms-execution-plans` deixa de repetir o nome
do header. Todos importam guard, módulo, configuração e header da lib. As cópias eram iguais à lib em
comportamento (mesma env, mesmo header, mesma comparação em tempo constante, mesmo erro); só o texto livre
da mensagem de recusa no boot muda.

## Estado

Mergeada e issue fechada em 29/09.
