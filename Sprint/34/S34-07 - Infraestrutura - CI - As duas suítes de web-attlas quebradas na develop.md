---
id: S34-07
tags:
  - attlas
  - task
  - sprint-34
  - ci
  - frontend
titulo: "[Front] CI - destravar as duas suítes de web-attlas quebradas na develop"
frente: CI
tamanho: 2 pts
pr: "#4085"
status: "Feita. PR #4085 mergeada na develop em 22/09; o CI segue sem job de teste unitário."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
aliases:
  - "CI - as duas suítes de web-attlas quebradas na develop"
---

# S34-07 - Infraestrutura - CI - As duas suítes de web-attlas quebradas na develop

Descoberta fora do plano, durante a frente de streaming: nem o workflow de PR nem o de develop chamam
o alvo de teste unitário. Os dois invocam build, lint, teste de integração e geração do Prisma. Quebra
de spec entra na develop sem derrubar check nenhum, que é exatamente o cenário que o `CLAUDE.md` do
repositório descreve a respeito da PR 315.

> [!warning] Estado em 23/09: o teste de integração também saiu do CI
> Desde a PR #4333, mergeada em 23/09, o job "Integration Test" de `ci-pr.yml` e de `ci-develop.yml` está
> desligado por `if: "false && ..."`, e o Build aceita o resultado `skipped`. Hoje o CI de PR roda Lint,
> validadores e Build, e nenhum teste.

Duas suítes já estavam quebradas por isso:

- a do store do videowall, cuja asserção nomeia três argumentos enquanto a release passa quatro desde
  o UC-079;
- a do detalhe de câmera, que dá NG0303 no `routerLink`, porque o schema de elementos customizados
  libera elemento desconhecido e não propriedade desconhecida num elemento conhecido.

## O que muda

As duas suítes voltam ao verde, corrigindo o lado certo em cada caso: a asserção desatualizada numa,
a declaração do teste na outra. Nenhuma asserção foi enfraquecida.

## O que fica pendente

O job de teste unitário no CI. Foi tentado na Sprint 33 e revertido; enquanto ele não existir, o gate
continua sendo rodar a suíte completa do projeto tocado antes de abrir a PR.

## Relacionado

- [[S33-02 - Infraestrutura - CI - Job de teste unitário e suíte dos projetos da 3328]], a tentativa anterior.
