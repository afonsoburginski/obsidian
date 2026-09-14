---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
card: SOFTWARE-3204
clickup: https://app.clickup.com/t/86akhq109
titulo: "[Front] Detecção - specs dos 15 componentes, utilitários e serviços que entraram sem teste"
frente: Analítico
tamanho: 8 pts
pr: "#3464 (fase 1/3), #3474 (fase 2/3), #3492 (fase 3/3)"
status: "Stack #3475 aberta em 14/09, três fases: UF-057 os seis utilitários puros (#3464), UF-058 serviços e estratégias de cabeça (#3474), UF-059 as cinco peças de superfície (#3492). Escrever as suítes achou quatro defeitos de produção, entre eles o seletor de classes escrevendo o rótulo traduzido no equipamento (em pt-BR o device recebia Carro no lugar de car) e o campo numérico lendo caixa vazia como zero. A dependência do job de teste no CI não se confirmou: o usuário vetou o job em 14/09, e as suítes valem por si. Falta: CI verde e o merge do usuário."
sprint: "[[Attlas - Sprint 33]]"
atualizado: 2026-09-14
---

# Detecção - specs dos componentes, utilitários e serviços novos

Sem spec no módulo `analytics-detection`, conferido arquivo a arquivo em 13/09:

- **Componentes**: `detection-object-boxes` (onde mora o laço de pintura por quadro),
  `detection-toolbar`, `detection-block`, `detection-class-select`, `color-picker`.
- **Utilitários**: `cuboid-path`, `buffered-head`, `detection-control`, `detection-vertices`,
  `active-detection-preset`, `to-detection-preset`.
- **Serviços e estratégias**: `video-locked-head.strategy`, `buffered-head.strategy`,
  `analytics-detection.service`, `network-discovery.http-source`.

Fora dessa lista: o spec do `virtual-loop-overlay` usa laços de três pontos, então nem o chevron de
direção nem o disco do índice são exercitados; `utils/sample-box-at.util.spec.ts` é anterior à predição
e à janela de velocidade; e no back `analytic-instances/utils/push-into.util.ts` entrou sem spec.

## Por que é uma task só

Cada spec isolado vira uma PR de duas linhas e a frente some do radar. O card fecha a lista inteira de
uma vez.

## Dependência

[[CI - job de teste unitário e suíte dos projetos da 3328]] - sem o job, nenhum destes specs reprova
nada.
