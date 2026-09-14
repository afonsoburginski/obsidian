---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
card: SOFTWARE-3201
clickup: https://app.clickup.com/t/86akhpm31
titulo: "[Front] Vocabulário de classes de objeto diverge do catálogo de tradução"
frente: Analítico
tamanho: 3 pts
pr: "#3452"
status: "PR #3452 aberta. Eram três listas, não duas: a lista de Animal tinha o mesmo defeito, com outros cinco códigos. O vocabulário vai para `@attlas/contracts`, ao lado do catálogo de tradução, e as listas por incidente passam a ser o grupo correspondente da árvore. O guarda novo cobre os quatro idiomas e reprova rótulo órfão."
sprint: "[[Attlas - Sprint 33]]"
atualizado: 2026-09-13
---

# Detecção - uma lista só de classes de objeto nos quatro idiomas

`ANOMALY_CLASS_CODES` (`modules/cameras/analytics/analytics.constants.ts`) fala `stones`, `boughs`,
`refrigerator`, `tire`, `garbage` e `traffic_light`. O catálogo `analytics.detection.classes.label`
fala `rock`, `branch`, `fridge`, `tyre`, `litter` e `trafficLight`. Nenhum dos seis códigos da primeira
lista existe no catálogo, então a lista de classes do incidente de Anomalia mostra o código cru para o
operador.

`FALLBACK_OBJECT_CLASS_CODES` está correto - os seis códigos existem no catálogo -, então o defeito é
só o da anomalia. É o mesmo assunto que a `UF-043` registrou como "unificar o vocabulário de classes de
objeto", agora com sintoma na tela.

## O que o card faz

Uma lista só de códigos, a do contrato, com o catálogo cobrindo os quatro idiomas. Quem decide de fato
a lista é o equipamento, e essa reconciliação fica anotada como pergunta aberta, não entra aqui.
