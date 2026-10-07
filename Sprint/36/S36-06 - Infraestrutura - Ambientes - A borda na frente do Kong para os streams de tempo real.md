---
id: S36-06
tags:
  - attlas
  - task
  - sprint-36
  - infraestrutura
  - ambientes
  - tempo-real
titulo: "[Infra] Documenta o que a borda na frente do Kong precisa para os streams de tempo real"
frente: Ambientes
pr: "#5853"
issues: "#5808"
status: "Mergeada em 05/10 às 15h29. A issue #5808 segue aberta."
sprint: "[[Attlas - Sprint 36]]"
atualizado: 2026-10-07
---

# S36-06 - Infraestrutura - Ambientes - A borda na frente do Kong para os streams de tempo real

## O que se pediu

A issue #5808 relata o stream de alarmes em tempo real e a lista de alarmes ativos falhando no ambiente de
Quito.

## O que a medição mostrou

No dev.v2, com token válido, as duas rotas do `ms-alarms` respondem normalmente. Em 02/10, um navegador da
rede de Quito fechou e reabriu todo stream de tempo real e todo WebSocket a cada 60 s, sempre no mesmo
segundo de cada minuto, enquanto os outros clientes mantinham os streams por uma hora. Cada reabertura
baixava o snapshot inteiro (2,46 MB) e fazia o sino reler, então as duas rotas caem juntas. A instância de
Quito e a borda dela não são alcançáveis a partir do dev.v2.

## O que a PR entregou

Só documentação: um documento novo de arquitetura com o que a borda na frente do Kong precisa em qualquer
ambiente (HTTP/2, rotas de stream sem buffer nem compressão, cabeçalho `Connection` vazio, timeouts acima da
vida do token e rede sem corte de sessão longa), uma referência de nginx, como medir com `curl`, a tabela de
assinaturas de falha e o que pedir ao ambiente do cliente.

## Estado

Mergeada em 05/10. A #5808 segue aberta, porque o estado das rotas em Quito precisa vir de lá.

## Relacionado

- [[Infraestrutura - Runbook - Desempenho do dev.v2]]
