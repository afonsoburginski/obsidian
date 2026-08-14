---
tags:
  - attlas
  - sprint-28
  - task
  - vms
  - frontend
card: SOFTWARE-2439
clickup: https://app.clickup.com/t/86ajyce57
titulo: "[Front] Renome para VMS: fase 2, rota e i18n"
frente: Renome para VMS
tamanho: 3 pts
status: comprometido da Sprint 28, EM CODE REVIEW: PR [#1440](https://github.com/atmanadmin/attlas-2026/pull/1440) aberta em 10/08. Merge somente depois da #1439, porque /api/vms precisa existir no gateway antes do front apontar para la.
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-10
---

# SOFTWARE-2439 - Renome para VMS - fase 2 rota e i18n

Conclui o renome onde o operador vê: rota, menu, traduções e a última cena salva.

## Escopo (1 PR)

Rota `/cameras/vms` com redirect `prefix` a partir de `/cameras/videowall` (preserva o deep link
`/:viewId`), item de menu com a chave nova, `videowall.json` vira `vms.json` nos 4 locales **mais os
bundles monolíticos que duplicam o namespace** (se dessincronizar, a tela sai metade traduzida e nenhum
teste pega), ícones, e a chave de `localStorage` com migração de leitura única, senão todo operador
perde a última cena por sistema.

**Fica de fora, de propósito**: mover a pasta `modules/videowall/` e renumerar os 25 UF, que é diff
mecânico gigante, conflita com a branch do H9 e a renumeração é decisão do dono da pasta (card futuro
no nome do Lucas, dependente desta fase).

## DoD

Deep links antigos redirecionando, 4 locales completos na tela, última cena preservada após a
migração da chave.

## Dependência

[[SOFTWARE-2438 - Renome para VMS - fase 1 API e contratos|2438]].

## Referências

- [[VMS]], estratégia das 3 fases.
- [[Attlas - Sprint 28]], risco 6 (decisão de quem executa).
