---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
card: SOFTWARE-3207
titulo: "[Front] Consolidar o overlay do laço e apagar a cópia da ACOM (Fase 7 da UF-706)"
frente: Analítico
tamanho: 5 pts
pr: "#3462 (fase 1/2) + #3478 (fase 2/2), stack #3479"
status: PRs abertas em 14/09. O original da cópia não existe mais (a aba Analíticos saiu com a UF-043), então a consolidação virou alimentar a ACOM do overlay de core/shared e apagar a cópia. UF-706 em implemented.
sprint: "[[Attlas - Sprint 33]]"
atualizado: 2026-09-14
---

# Laço virtual - consolidar o overlay e apagar a cópia da ACOM

O overlay compartilhado nasceu em `apps/web-attlas/src/app/core/shared/components/virtual-loop-overlay`
e a tela de Detecção já consome ele. A cópia em
`modules/controllers/components/controller-acom-loop-overlay` continua de pé, e o docblock dela mesma
diz que a Fase 7 do plano ACOM promove um overlay para `core/shared` e apaga a cópia.

## O que o card faz

- Troca o consumo da ACOM para o componente compartilhado: converte os pontos de 0-100 para 0-1 e mapeia
  os quatro estados de pintura para cor resolvida mais ênfase.
- Apaga a cópia e as declarações que só ela usava.
- Sobe com a regressão de `UF-033` que a própria UF pede.
