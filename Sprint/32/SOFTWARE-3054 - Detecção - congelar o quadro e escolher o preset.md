---
tags:
  - attlas
  - task
  - sprint-32
  - analitico
card: SOFTWARE-3054
clickup: https://app.clickup.com/t/86akffmkh
titulo: "[Front] Detecção: congelar o frame e escolher o preset"
frente: Analítico
tamanho: 3 pts
pr: #3191
status: ENTREGUE pela #3066 (código, 11/09 às 23:01) e spec MERGEADA em 11/09 às 23:45 (#3191, status implemented, UF-053 seção 4.7 como unidade de registro). Card fecha.
sprint: "[[Attlas - Sprint 32]]"
atualizado: 2026-09-11
---

# SOFTWARE-3054 - Detecção - congelar o quadro e escolher o preset

Primeira metade do modo edição, front puro e sem dependência externa. Desenhar sobre vídeo que anda não funciona: o quadro congela e vira a superfície de desenho.

## Escopo

Spec-only. Entrega `UF-049-detection-edit-frame-preset.md`.

## Estado

O comportamento está na `develop`. A [[SOFTWARE-3057 - Refinamento de emergência das telas do Analítico|#3066]] o entregou, e os critérios de aceite desta spec foram conferidos um a um no código. A spec deixou de declarar `planned`: ela é o detalhe do recorte, e a UF-053 seção 4.7 é a unidade de registro da tela.

### Situação da PR

PR #3191, aberta em 11/09 e sem review. Ela sobe na cascata que tem a
[[SOFTWARE-3057 - Refinamento de emergência das telas do Analítico|SOFTWARE-3057]] na base, e por
isso não dispara o `ci-pr.yml`, que só roda com base `develop`.

## Ver também

- [[Attlas - Sprint 32]] - a pilha inteira e a ordem de merge
