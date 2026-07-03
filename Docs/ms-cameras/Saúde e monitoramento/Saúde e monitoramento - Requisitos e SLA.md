---
tags:
  - doc
  - cameras
  - ms-cameras
  - saude
---

# Saúde e monitoramento — Requisitos e SLA

> Requisitos de negócio cobertos por este submódulo e a definição de SLA. Hub: [[00 - Saúde e monitoramento]]. Regras completas de exibição: [[Saúde da Câmera - regras de negócio e contratos]]. Requisitos: `docs/modules/cameras.md`.

## Requisitos cobertos

| Req | Nome | Critério | Como é atendido |
| --- | --- | --- | --- |
| RF-CAM-03 | Heartbeat e conectividade | Monitorar continuamente heartbeat, latência, perda de pacotes e qualidade do stream; registrar falhas, inclusive sobre APIs proprietárias | Loop de ping (Axis WS / ONVIF PullPoint) → RTT + perda %; evaluator deriva estado; falhas viram log de eventos + incidente |
| RF-CAM-04 | Monitoramento real-time | Estado corrente da câmera em tempo real (online/offline etc.) | `CameraOperationalSnapshot` + push WebSocket a cada mudança de estado ([[Status em tempo real (push)]]) |
| RNF-CAM-01 | Escalabilidade horizontal | Crescer a rede sem interrupção nem redesign | Uma instância de worker por câmera, armada no boot; sampler/rollup iteram a lista dinâmica |
| RNF-CAM-03 | Latência operacional | Streaming/PTZ responsivos em incidente | Latência é medida e pontuada (secundária ao loss no score Q); alimenta o SLA e o estado |

**Parcialmente atendido — "qualidade do stream" (RF-CAM-03):** o `connectionStatus` mede só o canal de controle ao device, **sem sinal de vídeo**. A qualidade de vídeo vive à parte em `streamStatus` (UC-027, ver [[04-Diagnostico-travamento-WebRTC]]); bitrate/TTFF históricos estão **persistidos mas ainda não expostos** pelo handler UC-026 (pendência PROJ-006 — [[SOFTWARE-1923 - Bitrate histórico + TTFF]]).

## Estados

**Device** — `CameraConnectionStatus`: `STABLE` · `PARTIALLY_UNSTABLE` · `UNSTABLE` · `OFFLINE` (do score Q + histerese). Mapeados para 3 estados de tela — `ONLINE` (STABLE) · `DEGRADED` (PARTIALLY + UNSTABLE) · `OFFLINE` (BR-AVAIL-001).

**Vídeo** — `StreamHealthStatus`: `OK` · `DEGRADED` · `DOWN` · `INACTIVE` (desacoplado do device; UC-027).

## SLA e disponibilidade

- **Unidade de medida**: janela de **5 min** (env `AVAILABILITY_WINDOW_MINUTES`). Dia/semana/período são composições de janelas, nunca um valor diário medido à parte (BR-AVAIL-002).
- **SLA = % do tempo Online** sobre o período (`uptimePercent`). Só Online conta; Degradada e Offline reduzem.
- **Meta de SLA = 99.0%** (env `CAMERA_SLA_TARGET_PERCENT`, mesma para todas as câmeras). `slaDeviationPercent = Online% − meta`.
- **Uptime ≠ SLA**: `reachabilityPercent = (Online + Degradada) / total` — o card "Uptime", métrica separada do SLA.
- **Janela vazia/faltante = Offline** (BR-AVAIL-005): ausência de heartbeat não é prova de que a câmera esteve online.

## Retenção

| Dado | Retenção | Onde |
| --- | --- | --- |
| `CameraHeartbeatHistory` (série fina) | ~24h (`HEARTBEAT_HISTORY_RETENTION_HOURS`) | `heartbeat-history-cleanup.service.ts`, `@Cron` horário |
| `CameraAvailabilityWindow` (5 min) | 7d (`AVAILABILITY_WINDOW_RETENTION_DAYS`) | podado pelo `availability-rollup.service.ts` |
| `CameraAvailabilityDailyRollup` (dia) | 90d | horizonte da consulta UC-026 |

Motivo: a série fina não sustenta 90 dias; por isso as janelas + rollup (ver [[Saúde e monitoramento - Arquitetura e estratégias]]).

## Variáveis de ambiente

| Env | Default | Efeito |
| --- | --- | --- |
| `PING_INTERVAL_MS` / `PING_TIMEOUT_MS` / `PING_WINDOW_SIZE` | 5000 / 3000 / 10 | Cadência, timeout e janela deslizante do ping |
| `EVAL_WINDOW_MIN` | 3 | Amostras mínimas para avaliar (senão `null`) |
| `LATENCY_STABLE_MS` / `LATENCY_UNSTABLE_MS` | 100 / 300 | Faixas do `latScore` |
| `LOSS_UNSTABLE_PCT` | 10 | Limite do `lossScore` |
| `Q_STABLE_THRESHOLD` / `Q_PARTIALLY_UNSTABLE_THRESHOLD` | 0.875 / 0.5 | Cortes do score Q |
| `OFFLINE_EXIT_CONSECUTIVE` | 2 | Sucessos seguidos p/ sair de OFFLINE (histerese) |
| `RECONNECT_BASE_MS` / `RECONNECT_MAX_MS` / `RECONNECT_JITTER_FACTOR` | 2000 / 60000 / 0.3 | Backoff de reconexão |
| `AVAILABILITY_WINDOW_MINUTES` / `AVAILABILITY_WINDOW_RETENTION_DAYS` | 5 / 7 | Janela de disponibilidade + retenção fina |
| `HEARTBEAT_HISTORY_RETENTION_HOURS` | 24 | Retenção da série fina |
| `CAMERA_SLA_TARGET_PERCENT` | 99.0 | Meta de SLA |
