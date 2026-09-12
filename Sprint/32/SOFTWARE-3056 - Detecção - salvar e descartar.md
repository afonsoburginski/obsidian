---
tags:
  - attlas
  - task
  - sprint-32
  - analitico
card: SOFTWARE-3056
clickup: https://app.clickup.com/t/86akffmt8
titulo: "[Front] Detecção: salvar e descartar, e a aba sai de desabilitada"
frente: Analítico
tamanho: 3 pts
pr: #3193
status: ENTREGUE pela #3066 (código, 11/09 às 23:01) e spec MERGEADA em 11/09 às 23:51 (#3193, status implemented). Card fecha. A aba Detecção está ligada na barra do EC2 dev.
sprint: "[[Attlas - Sprint 32]]"
atualizado: 2026-09-11
---

# SOFTWARE-3056 - Detecção - salvar e descartar

É a PR que liga a tela. Depende da 5, e a ordem não é negociável: ligar a aba antes de salvar funcionar ofereceria ao operador uma configuração que não persiste.

## Escopo

Spec-only. Entrega `UF-051-detection-save-discard.md`.

## Estado

O comportamento está na `develop`. A [[SOFTWARE-3057 - Refinamento de emergência das telas do Analítico|#3066]] o entregou, e os critérios de aceite desta spec foram conferidos um a um no código. A spec deixou de declarar `planned`: ela é o detalhe do recorte, e a UF-053 seção 4.6 é a unidade de registro da tela.

### Situação da PR

PR #3193, aberta em 11/09 e sem review. Ela sobe na cascata que tem a
[[SOFTWARE-3057 - Refinamento de emergência das telas do Analítico|SOFTWARE-3057]] na base, e por
isso não dispara o `ci-pr.yml`, que só roda com base `develop`.

## Ver também

- [[Attlas - Sprint 32]] - a pilha inteira e a ordem de merge
