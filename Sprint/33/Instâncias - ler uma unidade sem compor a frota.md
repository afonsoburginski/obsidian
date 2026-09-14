---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
card: SOFTWARE-3203
clickup: https://app.clickup.com/t/86akhpvyx
titulo: "[Back] Ler uma unidade de analítico sem compor a frota inteira"
frente: Analítico
tamanho: 5 pts
pr: "#3460"
status: "PR #3460 aberta, base develop. A branch tinha nascido com o ID SOFTWARE-3190, que é card de outro time (mobile-client/Hellius). Renomeada para analytics/refactor/SOFTWARE-3203 em 14/09; o rename fechou a #3456 e a PR foi reaberta como #3460 com o mesmo commit e o mesmo corpo. O card é o SOFTWARE-3203, que já existia. Falta: CI verde e o merge do usuário."
sprint: "[[Attlas - Sprint 33]]"
atualizado: 2026-09-14
---

# Instâncias - ler uma unidade sem compor a frota

`findById` passou a ler os vínculos uma vez e repassar para `listBySystem`, então a requisição que
pagava `findBySystem` três vezes paga uma. O que fica é o caminho de leitura em si: resolver a unidade
direto pelo id, sem montar a frota, que hoje custa duas consultas, uma leitura Redis por câmera e uma
chamada HTTP de estado da frota. Como `requireById` fecha o `POST` e o `PATCH`, toda escrita de unidade
paga esse custo.

## O que o card faz

Um caminho de leitura por id que devolve a unidade sem compor a frota, mantendo as três chaves que a
`UC-075` seção 4.6 aceita, com medição antes e depois na mesma rota.

## Onde olhar

`apps/ms-cameras/src/analytic-instances/analytic-instances.service.ts`.
