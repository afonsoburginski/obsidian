---
id: SP-02
tags:
  - attlas
  - task
  - cameras
  - streaming
  - comparativo
  - backlog
  - sem-prazo
card: SOFTWARE-2314
clickup: https://app.clickup.com/t/86ajpntf3
titulo: "[Teste] Performance do streaming de vídeo: banda, latência e média"
frente: Streaming / Comparativo
tamanho: a estimar
status: backlog, sem prazo (pausado em 27/07 - baseline do comparativo Attlas 25x26, que foi adiado; segue pausado em 31/07)
lista_clickup: Sprint 27 (3/8/26 - 9/8/26)
sprint: "[[Sem prazo (backlog)]]"
atualizado: 2026-09-23
aliases:
  - "SOFTWARE-2314 - Performance do streaming de vídeo"
---

# SP-02 - Câmeras - Streaming - Performance do streaming de vídeo

> Medir e documentar a performance do streaming de vídeo do Attlas 26: banda média consumida por
> stream, latência (TTFF e glass-to-glass) e média geral sob carga. Vira baseline pra comparação
> com o Attlas 25.

## Objetivo

Produzir os números de baseline (banda/latência/média) que servem de base pro comparativo
[[SP-03 - Câmeras - Videowall - Comparativo Attlas 25x26 do video wall]] e
[[SP-04 - Câmeras - Streaming - Comparativo Attlas 25x26 de arquitetura de hardware e streaming]].

## Status

Pausado em 27/07 junto com o resto do comparativo Attlas 25x26 - o foco da semana virou validação de
dados (listagem/cadastro, ver [[S26-02 - Câmeras - Cadastro - Fluxo E2E de cadastro de câmera]]) porque um QA
dedicado entra no time em ~03/08 e essa validação vira insumo do repasse. Retomar depois.

**03/08**: movido da lista da Sprint 26 (encerrada) para a lista da Sprint 27 no ClickUp, mantido em
`backlog` - não é trabalho desta semana, só precisava de lista ativa.

## Referência prévia

Já existe uma leva de validação de escalabilidade/banda no `ms-cameras` (SOFTWARE-2003, Fase 3,
07/07): reaper de sessão órfã, reuso de relay, telemetria device-truth. Ver
[[S23-01 - Câmeras - Streaming - Ciclo de vida de sessões e telemetria de banda por câmera]] e
[[S23-06 - Câmeras - Streaming - Streaming adaptativo (resolucao_codec) e correções F1-F4]] pros achados F1-F4
já registrados antes desta task.

> [!info] Estado em 23/09: o procedimento de medição do ingest já existe
> O escopo desta task não mudou, mas parte do "como medir" saiu pronta na Sprint 34. O runbook
> `apps/ms-cameras/docs/runbooks/stream-ingest-saturation.md` (#4121, mergeada em 22/09) registra
> como contar as sessões RTSP por câmera, ler o que o media server acha que está acontecendo, medir
> FPS e GOP sem decodificar e comparar o configurado na câmera com o medido, mais a matriz das quatro
> combinações de analítico embarcado e número de ingests. A latência glass-to-glass continua sem
> procedimento, em aberto na spec de orçamento de latência do VMS. A seção 6 do runbook, que lê as
> métricas do media server, está defasada desde a #4073, que desligou aquele listener. Contexto em
> [[Plano - Streaming sem vazamento de publicador]].
