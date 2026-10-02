---
tags:
  - doc
  - ms-cameras
  - saude
aliases:
  - "Status em tempo real - Requisitos e SLA"
  - "Saúde da câmera - regras de negócio e contratos"
  - "Saúde da Câmera - regras de negócio e contratos"
  - "Saúde e monitoramento - Requisitos e SLA"
atualizado: 2026-10-01
---

# Câmeras - Saúde e monitoramento - Requisitos e SLA

Índice: [[Câmeras - Saúde e monitoramento]]. Requisitos de origem: `docs/modules/cameras.md` (seções 3.1, 4, 5.1 e
8.1). Implementação: [[Câmeras - Saúde e monitoramento - Arquitetura e estratégias]].

## Regras de negócio da Saúde da Câmera

- **A telemetria roda em todo estado do ciclo de vida.** Câmera cadastrada é sempre monitorada, e o mesmo
  equipamento já monitorado em outro sistema ou organização entrega o estado atual à câmera nova
  (`docs/modules/cameras.md` seção 4). KPIs de disponibilidade e banda contam só `OPERATIONAL` e `TESTING`.
- **Disponibilidade medida em janelas de 5 minutos** (`AVAILABILITY_WINDOW_MINUTES`). Cada janela classifica
  a câmera em Online, Degradada ou Offline; barras e totais do período são composições de janelas, nunca um
  valor diário medido à parte (BR-AVAIL-002).
- **Mapa de 4 para 3 estados** (BR-AVAIL-001): `STABLE` é Online; `PARTIALLY_UNSTABLE` e `UNSTABLE` são
  Degradada; `OFFLINE` é Offline.
- **Janela vazia ou faltante é Offline** (BR-AVAIL-005): ausência de heartbeat não prova que a câmera esteve
  online.
- **SLA é a porcentagem do tempo Online** sobre o período (`uptimePercent`); Degradada e Offline reduzem. Ex.
  7 dias com 152,0 h Online dá 90,5%, "SLA descumprido".
- **Meta de SLA de 99,0%**, igual para todas as câmeras (`CAMERA_SLA_TARGET_PERCENT`); desvio =
  Online% - meta (90,5 - 99,0 = -8,5).
- **Uptime não é SLA**: o card Uptime é a reachability, `reachabilityPercent = (Online + Degradada) / total`.
  Entrou como campo novo, sem renomear `uptimePercent`.

Contratos em `libs/contracts/src/lib/camera/`: `i-camera-health-metrics.ts` (`ICameraHealthMetrics`),
`i-camera-availability-slice.ts`, `i-camera-daily-availability.ts`, `i-camera-bitrate-latency-sample.ts`,
`camera-health-period.type.ts`, `camera-health-bucket-unit.type.ts`, `i-camera-status-payload.ts`,
`i-camera-status-changed-event.ts`, `i-camera-health-update-payload.ts` e `i-camera-live-metrics-payload.ts`.

## Requisitos cobertos

| Req | Critério | Como é atendido |
| --- | --- | --- |
| RF-CAM-03 Heartbeat e conectividade | Monitorar heartbeat, latência, perda e qualidade do stream; registrar falhas, inclusive sobre APIs proprietárias | Canal por fabricante (Axis WS com ping, ONVIF PullPoint, Hikvision ISAPI), evaluator, snapshot, eventos e incidente de conectividade, tópico `attlas.cameras.status-changed` |
| RF-CAM-04 Monitoramento real-time | Estado corrente em tempo real | Snapshot, canal `cameras-status` e `GET /cameras/:id/status`; snapshot sem escrita há mais de 2 min sai `OFFLINE` |
| RNF-CAM-01 Escalabilidade horizontal | Crescer a rede sem interrupção nem redesign | Lease por device com reconciliação de 15 s (câmera nova ou retirada sem restart), uma conexão por device, sampler e rollup com um vencedor, adapter Redis do Socket.IO entregando o push em qualquer réplica |
| RNF-CAM-03 Latência operacional | Streaming e PTZ responsivos em incidente | Latência medida e pontuada (secundária à perda na nota Q); push in-process, sem salto por Kafka |

> [!warning] Qualidade do stream é parcial em RF-CAM-03
> O `connectionStatus` mede só o canal de controle ao device. A qualidade de vídeo vive à parte no
> `streamStatus` (UC-027, [[Câmeras - Streaming]]); bitrate e TTFF históricos saem no UC-026. Nos canais Hikvision não
> há latência medida.

### Atributos de RF-CAM-04

| Atributo | Campo do `ICameraStatusPayload` | Estado |
| --- | --- | --- |
| online/offline | `connectionStatus`, push por `camera:status:update` | Atendido |
| resolução, fps, bitrate | `streamQuality` do perfil `SECONDARY` ativo (`fps` pode ser `null`) | Atendido |
| modo de operação | `operationMode` (= `lifecycleState`) | Atendido |
| posição PTZ | `ptz`, push por `camera:ptz:position` | Atendido |
| estado do IR | `irStatus` | **Não atendido** (sempre `null`) |
| presets carregados | `presets` (id e nome) | Atendido |
| geoposicionamento | `location` (`lat`, `lng`) | Atendido |

## Estados

- **Device**, `CameraConnectionStatus`: `STABLE`, `PARTIALLY_UNSTABLE`, `UNSTABLE`, `OFFLINE`.
- **Tela**: `ONLINE`, `DEGRADED`, `OFFLINE` (mapa acima).
- **Vídeo**, `StreamHealthStatus`: `OK`, `DEGRADED`, `DOWN`, `INACTIVE` (desacoplado do device).

## Retenção

| Dado | Retenção | Quem poda |
| --- | --- | --- |
| `CameraHeartbeatHistory` | 24 h (`HEARTBEAT_HISTORY_RETENTION_HOURS`) | `heartbeat-history-cleanup.service.ts`, horário, sob lock |
| `CameraBitrateSample` | 48 h (`CAMERA_BITRATE_SAMPLE_RETENTION_HOURS`) | `bitrate-sample-cleanup.service.ts`, horário, sob lock |
| `CameraAvailabilityWindow` | 7 dias (`AVAILABILITY_WINDOW_RETENTION_DAYS`) | `availability-rollup.service.ts` |
| `CameraTtffSample` | 7 dias (mesma env da janela) | `availability-rollup.service.ts` |
| `CameraAvailabilityDailyRollup` | 90 dias (`AVAILABILITY_ROLLUP_RETENTION_DAYS`) | `availability-rollup.service.ts` |

O intervalo livre do UC-026 aceita até 366 dias, mas com a retenção default do rollup o que passa de 90 dias
sai como lacuna nas barras.

## Variáveis de ambiente

| Env | Default | Efeito |
| --- | --- | --- |
| `PING_INTERVAL_MS` / `PING_TIMEOUT_MS` / `PING_WINDOW_SIZE` | 5000 / 3000 / 10 | Cadência, timeout e janela do ping |
| `EVAL_WINDOW_MIN` | 3 | Amostras mínimas para avaliar |
| `LATENCY_STABLE_MS` / `LATENCY_UNSTABLE_MS` | 100 / 300 | Faixas do `latScore` |
| `LOSS_UNSTABLE_PCT` | 10 | Limite do `lossScore` |
| `Q_STABLE_THRESHOLD` / `Q_PARTIALLY_UNSTABLE_THRESHOLD` | 0.875 / 0.5 | Cortes da nota Q |
| `OFFLINE_EXIT_CONSECUTIVE` | 2 | Histerese de saída de `OFFLINE` |
| `RECONNECT_BASE_MS` / `RECONNECT_MAX_MS` / `RECONNECT_JITTER_FACTOR` | 2000 / 60000 / 0.3 | Backoff de reconexão |
| `MONITOR_LEASE_TTL_SECONDS` / `MONITOR_LEASE_RECONCILE_INTERVAL_MS` | 30 / 15000 | Lease por device e cadência do coordenador |
| `SAMPLER_LEASE_TTL_SECONDS` | 600 | Lease fixa do sampler |
| `HEALTH_SNAPSHOT_STALE_AFTER_MS` | 120000 | Idade em que o snapshot sai `OFFLINE` |
| `AVAILABILITY_WINDOW_MINUTES` / `AVAILABILITY_WINDOW_RETENTION_DAYS` | 5 / 7 | Janela e retenção fina |
| `AVAILABILITY_ROLLUP_RETENTION_DAYS` | 90 | Retenção do rollup |
| `HEARTBEAT_HISTORY_RETENTION_HOURS` | 24 | Retenção da série fina |
| `CAMERA_BITRATE_SAMPLE_RETENTION_HOURS` | 48 | Retenção do `CameraBitrateSample` |
| `CAMERA_BITRATE_REFRESH_HOURS` | 6 | Releitura da banda provisionada |
| `CAMERA_SLA_TARGET_PERCENT` | 99.0 | Meta de SLA |
| `HIKVISION_ISAPI_POLL_INTERVAL_MS` / `HIKVISION_ISAPI_FAILURE_TOLERANCE` | 15000 / 2 | Poll ISAPI e falhas toleradas antes de offline |
| `HIKVISION_ALERT_STREAM_CONNECT_TIMEOUT_MS` / `HIKVISION_ALERT_STREAM_IDLE_TIMEOUT_MS` | 8000 / 30000 | Conexão e silêncio máximo do alertStream |
| `REDIS_STATUS_CACHE_TTL_SECONDS` | 120 | TTL do snapshot `camera:status:<id>` |
| `CAMERA_LIVE_METRICS_INTERVAL_MS` | 5000 | Cadência do `camera:health:live` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:4200` | Origens aceitas pelo gateway |
