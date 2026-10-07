---
id: S36-16
tags:
  - attlas
  - task
  - sprint-36
  - analitico
  - backend
titulo: "[Back] ms-video-analytics com o módulo raiz na raiz do src e sem as sobras do pipeline removido"
frente: Separação de serviços
pr: "#6147"
status: "Aberta. #6147 aberta em 07/10 às 09h20, sem review."
sprint: "[[Attlas - Sprint 36]]"
atualizado: 2026-10-07
---

# S36-16 - Analítico - Separação de serviços - O ms-video-analytics sem as sobras do pipeline removido

## O que se pediu

É o primeiro passo da separação do analítico entre `ms-cameras` e `ms-video-analytics`: o serviço que vai
receber o analítico precisa estar sem código morto e com o próprio alias de import antes de as pastas
mudarem de lugar.

## O que a PR entrega

- O módulo raiz sai de `src/app/` e vai para a raiz do `src`, no layout do `ms-cameras`.
- Saem as sobras do pipeline de inferência removido em 16/09: o shard estático do registro de câmeras, as
  14 métricas que nenhum código usa e o `ffmpeg` do Dockerfile.
- O alias `@ms-video-analytics/*` passa a existir.

O comportamento não muda: a tradução de ocupação, a leitura de placas e o vínculo com a ACOM ficam
intocados.

## Estado

Aberta, sem review.
