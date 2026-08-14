---
tags:
  - attlas
  - sprint-28
  - task
  - vms
card: SOFTWARE-2431
clickup: https://app.clickup.com/t/86ajycdue
titulo: "[Back] Renome para VMS: fase 0, terminologia (docs-only)"
frente: Renome para VMS
tamanho: 1 pt
status: comprometido da Sprint 28, EM CODE REVIEW: PR [#1438](https://github.com/atmanadmin/attlas-2026/pull/1438) aberta em 10/08, leva a spec CROSS-045 e todo o markdown do renome (as tres fases escrevem markdown numa PR so).
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-10
---

# SOFTWARE-2431 - Renome para VMS - fase 0 terminologia

Resolve a colisão de sigla antes de qualquer código: o mosaico no browser passa a se chamar VMS e o
sistema externo de gravação, que usava a mesma sigla, passa a ser referido como gravador externo (NVR).

## Escopo (1 PR, docs-only)

Trocar "VMS externo" por gravador externo (NVR) em `docs/modules/cameras.md` (9 linhas, incluindo o
glossário, RF-INT-01 e RNF-CAM-11), nos SPEC do `ms-cameras` e do `ms-traffic-model`, no SPEC-GUIDE e
no template de spec de integração. O glossário ganha as duas definições novas: VMS é a tela do mosaico
e videowall é o painel físico externo de Quito. Aviso no MOD do módulo Angular do mosaico, que é do
Lucas. Nenhum código é tocado.

## DoD

Nenhuma ocorrência de "VMS" nas docs significando o gravador; glossário com os três termos estáveis
(VMS, videowall, NVR).

## Dependência

Nenhuma. É o primeiro card da semana e destrava as fases 1 e 2.

## Referências

- [[VMS]], seção "Colisão de sigla: resolvida em 31/07" e a estratégia das 3 fases.
- [[Attlas - Sprint 28]].
