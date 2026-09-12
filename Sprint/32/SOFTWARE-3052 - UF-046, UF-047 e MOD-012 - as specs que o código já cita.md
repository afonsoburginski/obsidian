---
tags:
  - attlas
  - task
  - sprint-32
  - analitico
card: SOFTWARE-3052
clickup: https://app.clickup.com/t/86akffm9z
titulo: "[Back] UF-046, UF-047 e MOD-012: as specs que o código já cita"
frente: Analítico
tamanho: 2 pts
pr: #3189
status: MERGEADA em 11/09 às 23:37 (#3189), reduzida ao MOD-012 (a UF-046 e a UF-047 saíram: a UF-053 da #3066 virou a unidade de registro da Detecção). Card fecha. Os links de rodapé para a UF-047 removida em quatro specs são consertados pela #3300, aberta.
sprint: "[[Attlas - Sprint 32]]"
atualizado: 2026-09-11
---

# SOFTWARE-3052 - UF-046, UF-047 e MOD-012 - as specs que o código já cita

Hoje entrega só o `MOD-012`. Fecha rastreabilidade quebrada. Três arquivos do `analytics-detection` citavam `UF-046` em docblock sem o arquivo existir, e o ID ficava reservado no ar. A `UF-047` declara o modo edição que as PRs 4 a 6 implementam, e o `MOD-012` declara o ATSPM como módulo de agregação do `ms-detector-history`, não como serviço novo.

## Escopo

Spec-only. Entrega `UF-046-detection-tab-read-mode.md`, `UF-047-detection-edit-mode.md`, `MOD-012-atspm-metrics.md`.

## Estado

PR #3189, aberta em 11/09 e sem review. Ela sobe na cascata que tem a
[[SOFTWARE-3057 - Refinamento de emergência das telas do Analítico|SOFTWARE-3057]] na base, e por
isso não dispara o `ci-pr.yml`, que só roda com base `develop`.

## Ver também

- [[Attlas - Sprint 32]] - a pilha inteira e a ordem de merge

## Por que a UF-046 e a UF-047 saíram (11/09)

A `UF-046` existia **para adotar** as três citações `UF-046` que estavam nos fontes do
`analytics-detection`, e declarava descrever o que estava na `develop` sem propor mudança de
comportamento. A #3066 renomeou essas mesmas citações para `UF-053` e mudou a tela: hoje nenhum
arquivo cita `UF-046`, e o comportamento descrito não é mais o que está na `develop`. A `UF-047`
declarava `planned` para o modo edição, que a #3066 implementou.

A `UF-053` cobre as duas com mais detalhe: leitura na seção 4.1, ciclo de edição na 4.3, desenho na
4.4, formulário na 4.5, salvar na 4.6 e presets na 4.7, além dos critérios de aceitação e dos testes
obrigatórios. Três specs para a mesma tela era o defeito, não a cobertura.

Não foi descuido: a pilha foi aberta antes da UF-053 e as duas frentes correram em paralelo.
