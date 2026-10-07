---
id: S35-03
tags:
  - attlas
  - task
  - sprint-35
  - infraestrutura
  - ci
titulo: "[Infra] Review do @claude no runner próprio e build de produção do web-attlas com 8 GiB de heap"
frente: CI
pr: "#4991, #5419"
status: "Feita. #4991 mergeada em 28/09 às 14h59 e #5419 em 30/09 às 15h17."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-03 - Infraestrutura - CI - O review automático no runner próprio e o build do web-attlas com 8 GiB

Dois jobs do CI de PR que pararam de rodar na mesma semana, por motivos diferentes.

## O que estava errado

- **Review do @claude**: o GitHub recusava o job no runner hospedado com "recent account payments have
  failed or your spending limit needs to be increased".
- **Build**: o build de produção do `web-attlas` quebrava com `JS heap out of memory` no compilador do
  Angular (visto na PR #5407). O workflow fixava 4 GiB de heap para todo processo Node, e o frontend passou
  desse teto.

## O que as PRs entregaram

- **#4991**: o job do review sai do `ubuntu-latest` e vai para o pool self-hosted `heavy`, o mesmo scale
  set `sumo-ci-runner` do resto do CI. Fora do repositório, a VM `ci-runner` recebeu `gh` e `unzip`, que o
  job usa.
- **#5419**: 8 GiB de heap só no passo Build do `ci-pr.yml`, e de 6 para 8 GiB no Build do
  `ci-develop.yml`. O `nx-parallel.sh` já divide a RAM do runner pelo heap, então o paralelismo se ajusta
  sozinho.

## Estado

As duas mergeadas. PR que ficou vermelha pelo heap precisa de "Update branch" ou de um push novo, porque o
rerun reaproveita o workflow antigo.

## Relacionado

- [[Infraestrutura - CI e runners]]
