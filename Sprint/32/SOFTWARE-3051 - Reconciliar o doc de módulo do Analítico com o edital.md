---
tags:
  - attlas
  - task
  - sprint-32
  - analitico
card: SOFTWARE-3051
clickup: https://app.clickup.com/t/86akffm6d
titulo: "[Back] Reconciliar o doc de módulo do Analítico com o edital"
frente: Analítico
tamanho: 3 pts
pr: #3188
status: MERGEADA em 11/09 às 23:30 (#3188), base develop, ci-pr verde. Card fecha. Histórico: aberta em 11/09 na posição 1 da pilha de 12 PRs; a pilha foi achatada para base develop e drenada em sequência na mesma noite.
sprint: "[[Attlas - Sprint 32]]"
atualizado: 2026-09-11
---

# SOFTWARE-3051 - Reconciliar o doc de módulo do Analítico com o edital

Base da pilha. O `docs/modules/analitico.md` tem 482 linhas e se organiza por DAI, laço virtual, ATSPM e ACOM, mas Visão Geral e Dashboard não têm seção nenhuma, e o ATSPM aparece com três definições diferentes no projeto: 8 métricas no edital, um pacote de 4 funcionalidades no doc e 38 métricas no front. Decidir qual vale é pré-requisito de construir o ATSPM, e é por isso que esta abre a cascata.

## Escopo

Spec-only. Entrega `docs/modules/analitico.md`.

## Estado

PR #3188, aberta em 11/09 e sem review. Ela sobe na cascata que tem a
[[SOFTWARE-3057 - Refinamento de emergência das telas do Analítico|SOFTWARE-3057]] na base, e por
isso não dispara o `ci-pr.yml`, que só roda com base `develop`.

## Ver também

- [[Attlas - Sprint 32]] - a pilha inteira e a ordem de merge
