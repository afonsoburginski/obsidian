---
tags:
  - doc
  - infra
  - server
aliases:
  - "Server e CI"
atualizado: 2026-08-19
---

# Server e CI

Índice das notas do servidor de gestão e do CI. Cluster, chart e deploy ficam em
[[Kubernetes e infra]].

## Notas deste domínio

- [[Acessos SSH - Infra Attlas]] - runbook dos acessos: sumo, EC2 dev 26, VM do runner, VMs 1 a 7. Tem credenciais, não versionar.
- [[Observabilidade CI - plano (stack completa)]] - plano da stack de observabilidade do CI e as camadas de higiene dos runners.
- [[Consultar câmera Hikvision via ISAPI]] - comandos para interrogar uma câmera Hikvision pelo terminal, e como separar "ONVIF desabilitado no firmware" de credencial errada.
- [[Infraestrutura de CI - trabalho sem card]] - as sete pull requests mergeadas desde 01/07 que não citam card nenhum, cinco delas a mesma frente da fila de integração, com o que cada rodada corrigiu e o que ficou pendente.

## O que ainda não está aqui

Pendente do lote 8 do [[Plano - atualização da documentação do vault]]: registrar o cache remoto
self-hosted (PR #964, MinIO na sumo servido em `10.1.1.115:8388`) e o orçamento de disco (PR #1142, teto
por tamanho, guard graduado, `ci-disk-watch` e a correção do `ci-runner-governor`).

## Relacionados

[[Kubernetes e infra]] · [[ms-cameras]] · [[Plano - atualização da documentação do vault]]
