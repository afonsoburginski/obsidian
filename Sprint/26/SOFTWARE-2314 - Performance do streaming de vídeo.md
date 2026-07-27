---
tags:
  - attlas
  - sprint-26
  - task
  - cameras
  - streaming
  - comparativo
  - backlog
card: SOFTWARE-2314
clickup: https://app.clickup.com/t/86ajpntf3
titulo: "[Teste] Performance do streaming de vídeo: banda, latência e média"
frente: Streaming / Comparativo
tamanho: a estimar
status: backlog (pausado em 27/07 — baseline do comparativo Attlas 25x26, que foi adiado)
sprint: "[[Attlas - Sprint 26]]"
atualizado: 2026-07-27
---

# Performance do streaming de vídeo

> Medir e documentar a performance do streaming de vídeo do Attlas 26: banda média consumida por
> stream, latência (TTFF e glass-to-glass) e média geral sob carga. Vira baseline pra comparação
> com o Attlas 25.

## Objetivo

Produzir os números de baseline (banda/latência/média) que servem de base pro comparativo
[[SOFTWARE-2315 - Comparativo Attlas 25x26 - video wall]] e
[[SOFTWARE-2316 - Comparativo Attlas 25x26 - arquitetura de hardware e streaming]].

## Status

Pausado em 27/07 junto com o resto do comparativo Attlas 25x26 — o foco da semana virou validação de
dados (listagem/cadastro, ver [[SOFTWARE-2317 - Fluxo E2E de cadastro de câmera]]) porque um QA
dedicado entra no time em ~03/08 e essa validação vira insumo do repasse. Retomar depois.

## Referência prévia

Já existe uma leva de validação de escalabilidade/banda no `ms-cameras` (SOFTWARE-2003, Fase 3,
07/07): reaper de sessão órfã, reuso de relay, telemetria device-truth. Ver
[[SOFTWARE-2003 - Ciclo de vida de sessões de streaming e telemetria de banda por câmera]] e
[[SOFTWARE-2023-F3 - Streaming adaptativo (resolucao_codec) e correcoes F1-F4]] pros achados F1-F4
já registrados antes desta task.
