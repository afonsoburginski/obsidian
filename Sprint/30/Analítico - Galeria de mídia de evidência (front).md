---
tags:
  - attlas
  - task
  - sprint-30
  - analitico
  - frontend
card: SOFTWARE-2731
titulo: "[Front] Galeria de mídia de evidência"
clickup: https://app.clickup.com/t/86ak5veqn
frente: Analítico
tamanho: 3 pts
status: card criado na reestimativa de 25/08, quando o frontend entrou na conta da sprint. Irmão de [[Analítico - Fonte da imagem de evidência]] (o backend). Spec UF-035 escrita em 25/08, [PR #2023](https://github.com/atmanadmin/attlas-2026/pull/2023) aberta em draft (fase só-spec).
sprint: "[[Attlas - Sprint 30]]"
atualizado: 2026-08-25
---

# Analítico - Galeria de mídia de evidência (front)

Porta a galeria de mídia de evidência do `attlas-design` para o `web-attlas`. É o componente mais
pronto de todo o protótipo, e por isso o mais barato de trazer.

## O que vem do protótipo

De `modulo-analitico/entrega-frontend/src/app/modules/analytics/components/`, conforme
[[Analítico - Frontend do attlas-design]]:

- `incident-media/` - galeria em 3 abas (imagem, vídeo, anexos do operador)
- `incident-media-viewer/` - carrossel com navegação, upload via `URL.createObjectURL`, confirmação
  de remoção

O protótipo reaproveita uma única amostra (`public/analytics-sample-frame.jpg` e `.mp4`) nos 216
incidentes mockados. Aqui a fonte é a evidência real que o card irmão persiste.

## O que precisa ser reescrito

1. **Camada de serviço** - trocar a factory de mock (`incident-media.factory.ts`) pelo endpoint real
   de evidência, e o upload local (`URL.createObjectURL`) pelo upload de verdade contra o object
   storage que o backend define.
2. **i18n** nos 3 locales.
3. **Testes** de componente.

## Depende de uma decisão que não é desta tela

O card irmão ([[Analítico - Fonte da imagem de evidência]]) carrega uma decisão de produto em aberto:
de onde vem o pixel. Enquanto ela não fecha, esta tela pode ser portada contra o contrato proposto,
mas não pode ser considerada pronta - se a decisão mudar a origem da imagem, muda o shape do que a
galeria lista.

## DoD

Galeria no `web-attlas` exibindo evidência real vinda do backend, com as 3 abas, carrossel, upload e
remoção funcionando contra a API, i18n nos 3 locales e teste de componente.

## Encosta em

- [[Analítico - Fonte da imagem de evidência]] - o backend e a decisão de origem do pixel.
- [[Analítico - Frontend do attlas-design]] · [[Attlas - Sprint 30]].
