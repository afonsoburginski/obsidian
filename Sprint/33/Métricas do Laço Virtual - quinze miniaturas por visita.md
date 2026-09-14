---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
card: SOFTWARE-3208
clickup: https://app.clickup.com/t/86akhq1cz
titulo: "[Front] Métricas do Laço Virtual paga round-trip demais"
frente: Analítico
tamanho: 3 pts
pr: "#3459"
status: "PR #3459 aberta em 14/09, base develop, PR única (3 pts). Entrega as duas contas do card: a face que sai fica montada e a lateral abre na lista. A UF-045 foi reescrita (seção 4 item 3 e critério 2 mandavam destruir a face). As cinco suítes das telas tocadas passaram de 14 vermelhos de 44 para 49 verdes - os 14 eram pré-existentes na develop e foram corrigidos aqui. Falta: CI verde e o merge do usuário."
sprint: "[[Attlas - Sprint 33]]"
atualizado: 2026-09-14
---

# Métricas do Laço Virtual - quinze miniaturas por visita

A lateral da face é um seletor e mesmo assim monta o cartão completo de cada câmera, com uma miniatura
por câmera - quinze requisições por visita. Além disso o `@switch` da página destrói e recria o painel a
cada troca de aba, então ir e voltar entre ATSPM e Laço Virtual repete a montagem inteira.

## O que o card faz

Um item de lista enxuto na lateral, e a troca de aba preservando o painel já montado.
