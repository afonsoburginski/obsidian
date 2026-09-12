---
tags:
  - attlas
  - task
  - sprint-32
  - analitico
card: SOFTWARE-3055
clickup: https://app.clickup.com/t/86akffmpw
titulo: "[Front] Detecção: as cinco ferramentas e a paleta"
frente: Analítico
tamanho: 3 pts
pr: #3192
status: ENTREGUE pela #3066 (código, 11/09 às 23:01) e spec MERGEADA em 11/09 às 23:48 (#3192, status implemented). Card fecha. Conferido no EC2 dev em 11/09: a paleta abre sobre o quadro congelado da ATMN – DEMO em modo servidor.
sprint: "[[Attlas - Sprint 32]]"
atualizado: 2026-09-11
---

# SOFTWARE-3055 - Detecção - as cinco ferramentas e a paleta

Depende da 4. As ferramentas de desenho sobre o quadro congelado, com a paleta que escolhe o que se está marcando.

## Escopo

Spec-only. Entrega `UF-050-detection-tools-palette.md`.

## Estado

O comportamento está na `develop`. A [[SOFTWARE-3057 - Refinamento de emergência das telas do Analítico|#3066]] o entregou, e os critérios de aceite desta spec foram conferidos um a um no código. A spec deixou de declarar `planned`: ela é o detalhe do recorte, e a UF-053 seção 4.4 é a unidade de registro da tela.

### Situação da PR

PR #3192, aberta em 11/09 e sem review. Ela sobe na cascata que tem a
[[SOFTWARE-3057 - Refinamento de emergência das telas do Analítico|SOFTWARE-3057]] na base, e por
isso não dispara o `ci-pr.yml`, que só roda com base `develop`.

## Ver também

- [[Attlas - Sprint 32]] - a pilha inteira e a ordem de merge
