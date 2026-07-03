---
tags:
  - attlas
  - sprint-22
  - task
  - saude-camera
card: SOFTWARE-1922
titulo: "[Back] Saúde da Câmera: janelas de 5 min de disponibilidade + latência (+ rollup 90d)"
frente: Saúde
tamanho: Grande
pr: 576
pr_url: https://github.com/atmanadmin/attlas-2026/pull/576
branch: cameras/feat/SOFTWARE-1922
status: MERGED
clickup_status: Closed
merged: 2026-07-02
clickup: https://app.clickup.com/t/86aj9aw54
sprint: "[[Attlas - Sprint 22]]"
---

# SOFTWARE-1922 — Janelas de 5 min de disponibilidade + latência (+ rollup 90d)

> Tarefa 4. **PR [#576](https://github.com/atmanadmin/attlas-2026/pull/576) MERGEADA (02/07)**, review do neto-atman resolvido · ClickUp **Closed**. Spec PROJ-005.
> Contexto: [[Saúde da Câmera - regras de negócio e contratos]]. Pré-requisito das Tarefas 5 e 6.

Base de dados histórica para disponibilidade e latência.

## Problema

- Heartbeat history só guarda ~24h (`heartbeat-history-cleanup.service.ts`); 7d/30d/90d não cabem.

## Entregue (#576)

- [x] **`CameraAvailabilityWindow`** (estado por janela de 5 min, mapeado 4→3 pelo evaluator existente) + **`CameraAvailabilityDailyRollup`** (retém 90d). Retenção fina das janelas = 7d (env); 90d vivem no rollup. Índices únicos `[cameraId, windowStart]` e `[cameraId, date]`.
- [x] `avgLatencyMs` + série de latência. Fonte: heartbeat `latencyMs`, média por janela e por rollup.
- [x] Migration Prisma (janelas 5 min + rollup diário), gerada via `prisma migrate diff`, validada em shadow (up/rollback). Bitrate NÃO entra aqui (fica como PROJ-006, ver [[SOFTWARE-1923 - Bitrate histórico + TTFF]]).
- [x] Worker/cron: sampler `@Cron` 5 min (idempotente) + rollup diário + cleanup da retenção fina.
- [x] Testes (suíte completa do ms-cameras verde, runInBand).

## Cascata

- **#576 → #578:** as branches não são empilhadas no git, mas a #578 carregava cópia byte-a-byte desta implementação. Mergear #576 primeiro e rebasear #578 onto develop fez a cópia sumir. Ver [[SOFTWARE-1924 - getHealthMetrics + série + SLA]].
