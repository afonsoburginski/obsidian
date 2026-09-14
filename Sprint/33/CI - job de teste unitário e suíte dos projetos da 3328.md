---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
  - ci
card: SOFTWARE-3173
clickup: https://app.clickup.com/t/86akhj75b
titulo: "[Infra] CI ganha job de teste unitário, e a suíte dos projetos da #3328 volta ao verde"
frente: Plataforma
tamanho: 5 pts
pr: "#3402 - só a suíte; o job de CI foi revertido a pedido do usuário"
status: "O JOB DE TESTE UNITÁRIO SAIU DO CI a pedido do usuário em 14/09, e a PR da suíte completa na develop (#3429) foi fechada: com a suíte ainda vermelha em módulos fora do alcance da PR e quatro runners servindo fila de dezenas de workflows, um estágio obrigatório a mais em toda PR do time era caro e cedo. Onde e quando o unitário entra no CI volta a ser decisão dele. A #3402 fica com a suíte dos projetos da #3328 verde, incluindo três defeitos de produção que ela guardava: `server-frame.listener` fora da superfície de auditoria e sem `KafkaCausationInterceptor`, a tela de Detecção pintando a câmera errada ao trocar de câmera, e o DTO do lote recusando UUID válido por fixture inválido."
sprint: "[[Attlas - Sprint 33]]"
atualizado: 2026-09-14
---

# CI - job de teste unitário e suíte dos projetos da #3328

Conferido em 13/09: `ci-pr.yml` tem três jobs (Lint, Integration Test, Build) e `ci-develop.yml` tem os
mesmos três mais o push das imagens. Nenhum arquivo em `.github/workflows` chama `nx test` ou
`affected:test`.

Consequência direta: a suíte unitária do `web-attlas` e do `ms-cameras` **não rodou** na #3328, que
trouxe cerca de 1900 linhas de spec novo no frontend, reescreveu o spec do interpolador de caixas e
mudou o stub do `detection-frame`. O `CLAUDE.md` da raiz cobra a suíte completa antes do PR, mas o CI
não tem como reprovar quem não rodar.

## O que o card faz

- Acrescenta o job de teste unitário ao `ci-pr.yml` (afetados) e ao `ci-develop.yml` (suíte inteira).
- Roda a suíte dos dois projetos que a #3328 tocou e conserta o que estiver vermelho, corrigindo o lado
  certo - spec desatualizado ou defeito real -, nunca enfraquecendo, pulando ou apagando asserção.

## Critério de aceite

`nx test web-attlas` e `nx test ms-cameras` verdes, e uma PR com teste quebrado reprovando no CI.

## Onde olhar

`.github/workflows/ci-pr.yml`, `.github/workflows/ci-develop.yml`,
`apps/web-attlas/src/app/modules/analytics-detection/services/detection-box-interpolator.service.spec.ts`,
`apps/web-attlas/src/app/modules/analytics-detection/components/detection-frame/detection-frame.component.spec.ts`.
