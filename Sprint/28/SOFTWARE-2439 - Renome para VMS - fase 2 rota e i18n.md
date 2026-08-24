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
status: Fechado. PR [#1440](https://github.com/atmanadmin/attlas-2026/pull/1440) mergeada em 11/08, depois da #1439. **Pendência real, achada em 22/08**: a rota `/cameras/vms` e o front estão em execução, mas `apps/web-attlas/docs/modules/videowall/MOD-001-videowall.md` nunca teve o corpo (1023 linhas) reconciliado com o renome — continua descrevendo `/cameras/videowall`/`videowall.*` como se fossem o estado corrente. O banner do doc foi corrigido em 22/08 para sinalizar isso; a reconciliação do corpo é trabalho à parte, ainda sem card.
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-22
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
