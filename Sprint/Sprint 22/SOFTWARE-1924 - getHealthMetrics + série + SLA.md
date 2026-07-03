---
tags:
  - attlas
  - sprint-22
  - task
  - saude-camera
card: SOFTWARE-1924
titulo: "[Back] Saúde da Câmera: endpoint getHealthMetrics + série + SLA"
frente: Saúde
tamanho: Média
pr: 578
pr_url: https://github.com/atmanadmin/attlas-2026/pull/578
branch: cameras/feat/SOFTWARE-1924
status: MERGED
clickup_status: Closed
merged: 2026-07-01
clickup: https://app.clickup.com/t/86aj9aw7a
sprint: "[[Attlas - Sprint 22]]"
---

# SOFTWARE-1924 — Endpoint getHealthMetrics + série + SLA

> Tarefa 6. **PR [#578](https://github.com/atmanadmin/attlas-2026/pull/578) MERGEADA (01/07)** · ClickUp **Closed**.
> Contexto: [[Saúde da Câmera - regras de negócio e contratos]]. Junta tudo no endpoint que o frontend consome.

## Entregue (#578)

- [x] `GET /api/cameras/:id/health?period=7d|30d|90d` → `ICameraHealthMetrics`. Rota de 3 segmentos, sem colisão com `cameras/health`; `period` default 7d, inválido → 400.
- [x] `activeSessions` via `StreamSessionRegistry.all().length` (registry exportado do StreamingModule).
- [x] `slaTargetPercent` via env `CAMERA_SLA_TARGET_PERCENT` (default 99.0); `slaDeviationPercent = uptimePercent − meta`. **SLA = Online%**; card **Uptime = `reachabilityPercent`** (adicionado, não rename, pra não quebrar o mock do web-attlas).
- [x] Query handler CQRS `GetCameraHealthMetricsHandler` + composer puro lendo o rollup do #576 + janelas do dia corrente.
- [x] Rota na `CameraHealthMetricsController`.
- [x] Testes (composer/handler/controller/dto; suíte completa do ms-cameras verde).

## Cascata

- bitrate/TTFF ficam `null` até o PROJ-006 (#577) entrar — ver [[SOFTWARE-1923 - Bitrate histórico + TTFF]].
- Branch do #578 carregava o código do #576 para compilar; rebaseada onto develop quando o #576 mergeou (cópia sumiu).
