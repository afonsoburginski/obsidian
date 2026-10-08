---
tags:
  - doc
  - cameras
  - saude
aliases:
  - "Câmeras - Saúde e monitoramento - Requisitos e SLA"
  - "Status em tempo real - Requisitos e SLA"
  - "Saúde da câmera - regras de negócio e contratos"
  - "Saúde da Câmera - regras de negócio e contratos"
  - "Saúde e monitoramento - Requisitos e SLA"
atualizado: 2026-10-07
banner: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200"
---

# Câmeras - Saúde e monitoramento - Requisitos e SLA

Volta para [[Câmeras - Saúde e monitoramento]].

## Resumo

| Pergunta | Resposta |
| --- | --- |
| O que é SLA | Porcentagem do tempo Online no período (`uptimePercent`); Degradada e Offline reduzem |
| Meta | 99,0%, igual para todas as câmeras (`CAMERA_SLA_TARGET_PERCENT`) |
| Unidade de medida | Janela de 5 minutos, classificada como Online, Degradada ou Offline |
| O que é Uptime na tela | Reachability: Online mais Degradada sobre o total, não o SLA |
| Histórico | Janelas por 7 dias e resumo diário por 90 dias |
| Quem é monitorado | Toda câmera cadastrada, em qualquer estado do ciclo de vida; KPIs contam só `OPERATIONAL` e `TESTING` |

Requisitos de origem: `docs/modules/cameras.md`, seções 3.1, 4, 5.1 e 8.1. Implementação:
[[Câmeras - Saúde e monitoramento - Arquitetura e estratégias]].

## Regras

### Regras de negócio

| Regra | Valor | Onde no código |
| --- | --- | --- |
| A telemetria roda em todo estado do ciclo de vida | Toda câmera viva com credencial é monitorada | `apps/ms-cameras/src/health/leases/device-monitor-coordinator.service.ts` (UC-001 BR-CRUD-014) |
| Câmera nova de um equipamento já monitorado nasce com o estado dele | Herda `isOnline`, `connectionStatus`, `snapshotAt` e `activeChannel` | `seedFrom` em `apps/ms-cameras/src/health/repositories/camera-health-snapshot.repository.ts` |
| KPIs de disponibilidade e banda | Só `OPERATIONAL` e `TESTING` | `apps/ms-cameras/src/health/workers/availability-window-sampler.service.ts` |
| Disponibilidade medida em janelas | 5 minutos (`AVAILABILITY_WINDOW_MINUTES`); barras e totais são composições de janelas, nunca valor diário medido à parte | `apps/ms-cameras/src/health/availability/availability.constants.ts` (BR-AVAIL-002) |
| Mapa de 4 para 3 estados | `STABLE` é Online; `PARTIALLY_UNSTABLE` e `UNSTABLE` são Degradada; `OFFLINE` é Offline | `mapConnectionStatus` em `availability.aggregator.ts` (BR-AVAIL-001) |
| Janela vazia ou faltante | Offline: ausência de batida não prova que a câmera esteve online | `aggregateDay` (BR-AVAIL-005) |
| Janela só conta dentro da vida da câmera | O dia do cadastro deve só o trecho depois do cadastro; dia anterior ao cadastro não existe | `expectedWindowsSince` e `clampToLifetime` em `availability-source.reconciler.ts` |
| SLA | Online sobre o total do período. Exemplo: 7 dias com 152,0 h Online dão 90,5%, "SLA descumprido" | `health-metrics.composer.ts` |
| Meta de SLA | 99,0% | `apps/ms-cameras/src/health/handlers/get-camera-health-metrics/health-metrics.constants.ts` |
| Desvio | Online% menos a meta (90,5 - 99,0 = -8,5) | idem |
| Uptime não é SLA | `reachabilityPercent = (Online + Degradada) / total`, campo separado de `uptimePercent` | `health-metrics.composer.ts` |
| Snapshot sem escrita recente | Mais velho que 2 minutos sai `OFFLINE`, com motivo de snapshot vencido | `apps/ms-cameras/src/health/snapshot-freshness.constants.ts` |
| "Offline há N minutos" | Conta a partir da queda (`offlineSince`); sem ela, de `lastConnectionAt` | `apps/ms-cameras/src/internal-api/status/internal-camera-status.service.ts` (CROSS-185) |
| Bitrate provisionado "sem limite" | Valor a partir de 1.000.000 kbps (o 2147483647 das câmeras VBR) é descartado | `plausibleBitrateMbps` em `availability.aggregator.ts` |

### Estados

| Plano | Tipo | Valores |
| --- | --- | --- |
| Equipamento | `CameraConnectionStatus` | `STABLE`, `PARTIALLY_UNSTABLE`, `UNSTABLE`, `OFFLINE` |
| Tela e janela | `CameraAvailabilityState` | `ONLINE`, `DEGRADED`, `OFFLINE` |
| Vídeo, desacoplado do equipamento | `StreamHealthStatus` | `OK`, `DEGRADED`, `DOWN`, `INACTIVE` |

### Avaliação do estado

| Regra | Valor | Onde no código |
| --- | --- | --- |
| Amostras mínimas para avaliar | 3 | `apps/ms-cameras/src/health/evaluator/connectivity-health.evaluator.ts` |
| Janela deslizante de ping | 10 amostras | `apps/ms-cameras/src/health/workers/camera-health.worker.ts` |
| Ping | A cada 5 s, timeout de 3 s | idem |
| Faixas de latência | Abaixo de 100 ms vale 1,0; abaixo de 300 ms vale 0,5; senão 0 | evaluator |
| Faixas de perda | 0% vale 1,0; abaixo de 10% vale 0,5; senão 0 | evaluator |
| Nota Q | `(latScore * 1 + lossScore * 3) / 4` | evaluator |
| Cortes de Q | A partir de 0,875 é `STABLE`; a partir de 0,5 é `PARTIALLY_UNSTABLE`; abaixo é `UNSTABLE` | evaluator |
| Histerese de saída de `OFFLINE` | 2 amostras seguidas respondidas | evaluator |
| Reconexão | `min(2000 * 2^tentativa, 60000) + jitter de 30%` | `apps/ms-cameras/src/health/health.constants.ts` |

### Cadências e limites

| Regra | Valor | Onde no código |
| --- | --- | --- |
| Reconciliação das leases | A cada 15 s; lease do equipamento com TTL de 30 s | `apps/ms-cameras/src/health/leases/monitor-lease.constants.ts` |
| Lease do sampler | 600 s, o dobro da janela | idem |
| Poll Hikvision ISAPI | A cada 15 s, 2 falhas toleradas antes de offline | `apps/ms-cameras/src/health/clients/hikvision-isapi-heartbeat.client.ts` |
| Hikvision alertStream | Conexão em até 8 s; 30 s de silêncio derruba | `apps/ms-cameras/src/health/clients/hikvision-alert-stream.client.ts` |
| Releitura da banda provisionada e dos codecs Axis | A cada 6 h | `apps/ms-cameras/src/health/workers/provisioned-bandwidth-collector.service.ts` |
| Métricas ao vivo (`camera:health:live`) | A cada 5 s | `apps/ms-cameras/src/cameras/realtime/live-metrics.constants.ts` |
| Cache do snapshot `camera:status:<id>` | 120 s | `apps/ms-cameras/src/cameras/cameras.constants.ts` |
| Período da consulta de métricas | `7d` (padrão), `30d` ou `90d`, ou intervalo livre de até 366 dias | `health-metrics.constants.ts` |
| Barras | Até 14 dias, uma por dia; acima, `ceil(dias / 6)` dias por barra (7 em 7d, seis de 5 dias em 30d, seis de 15 dias em 90d) | `apps/ms-cameras/src/health/handlers/get-camera-health-metrics/health-range.ts` |
| Contagem autorizada | Amostra de 50 linhas por padrão, máximo 100 | `libs/contracts/src/lib/camera/camera-availability-count-route.constant.ts` |
| Exportação | Página de até 1000 linhas; até 90.000 linhas por exportação; 60 chamadas por 60 s por chamador | `libs/contracts/src/lib/camera/camera-availability-export.constant.ts` e `apps/ms-cameras/src/internal-api/availability-export/` |

### Retenção

| Dado | Retenção | Quem poda |
| --- | --- | --- |
| `CameraHeartbeatHistory` | 24 h | `heartbeat-history-cleanup.service.ts`, a cada hora, sob lock |
| `CameraBitrateSample` | 48 h | `bitrate-sample-cleanup.service.ts`, a cada hora, sob lock |
| `CameraAvailabilityWindow` | 7 dias | `availability-rollup.service.ts` |
| `CameraTtffSample` | 7 dias, a mesma variável da janela | `availability-rollup.service.ts` |
| `CameraAvailabilityDailyRollup` | 90 dias | `availability-rollup.service.ts` |

O intervalo livre aceita até 366 dias, mas com a retenção padrão do resumo o que passa de 90 dias sai como
lacuna nas barras.

### Requisitos do módulo cobertos

| Req | Critério | Como é atendido |
| --- | --- | --- |
| RF-CAM-03 Heartbeat e conectividade | Monitorar batida, latência, perda e qualidade do stream; registrar falhas, inclusive sobre APIs proprietárias | Canal por fabricante, evaluator, snapshot, eventos, incidente de conectividade e tópico `attlas.cameras.status-changed` |
| RF-CAM-04 Monitoramento em tempo real | Estado corrente em tempo real | Snapshot, canal `cameras-status` e `GET /api/cameras/:id/status`; snapshot sem escrita há mais de 2 minutos sai `OFFLINE` |
| RNF-CAM-01 Escalabilidade horizontal | Crescer a rede sem interrupção nem redesenho | Lease por equipamento com reconciliação de 15 s (câmera nova ou retirada sem restart), uma conexão por equipamento, sampler e rollup com um vencedor, adapter Redis do Socket.IO entregando o push em qualquer réplica |
| RNF-CAM-03 Latência operacional | Streaming e PTZ responsivos em incidente | Latência medida e pontuada, secundária à perda na nota Q; push dentro do processo, sem salto por Kafka |

> [!warning] Qualidade do stream é parcial em RF-CAM-03
> O `connectionStatus` mede só o canal de controle até o equipamento. A qualidade de vídeo vive à parte no
> `streamStatus` ([[Câmeras - Streaming]]); bitrate e TTFF históricos saem na consulta de métricas do
> período. Nos canais Hikvision não há latência medida.

### Atributos de RF-CAM-04

| Atributo | Campo do `ICameraStatusPayload` | Estado |
| --- | --- | --- |
| online e offline | `connectionStatus`, com push por `camera:status:update` | Atendido |
| resolução, fps e bitrate | `streamQuality` do perfil `SECONDARY` ativo (`fps` pode ser `null`) | Atendido |
| modo de operação | `operationMode`, igual a `lifecycleState` | Atendido |
| posição PTZ | `ptz`, com push por `camera:ptz:position` | Atendido |
| estado do IR | `irStatus` | Não atendido: sempre `null`, sem fonte |
| presets carregados | `presets` (id e nome) | Atendido |
| geoposicionamento | `location` (`lat`, `lng`) | Atendido |

## Variáveis de ambiente

Todas do `ms-cameras` (`apps/ms-cameras/.env.example`).

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `PING_INTERVAL_MS` | 5000 | Cadência do ping Axis |
| `PING_TIMEOUT_MS` | 3000 | Prazo do pong |
| `PING_WINDOW_SIZE` | 10 | Tamanho da janela deslizante de ping |
| `EVAL_WINDOW_MIN` | 3 | Amostras mínimas para avaliar |
| `LATENCY_STABLE_MS` | 100 | Abaixo disso, `latScore` 1,0 |
| `LATENCY_UNSTABLE_MS` | 300 | Abaixo disso, `latScore` 0,5 |
| `LOSS_UNSTABLE_PCT` | 10 | Abaixo disso, `lossScore` 0,5 |
| `Q_STABLE_THRESHOLD` | 0.875 | Corte de `STABLE` |
| `Q_PARTIALLY_UNSTABLE_THRESHOLD` | 0.5 | Corte de `PARTIALLY_UNSTABLE` |
| `OFFLINE_EXIT_CONSECUTIVE` | 2 | Histerese de saída de `OFFLINE` |
| `RECONNECT_BASE_MS` | 2000 | Base do backoff de reconexão |
| `RECONNECT_MAX_MS` | 60000 | Teto do backoff |
| `RECONNECT_JITTER_FACTOR` | 0.3 | Jitter do backoff |
| `MONITOR_LEASE_TTL_SECONDS` | 30 | TTL da lease por equipamento |
| `MONITOR_LEASE_RECONCILE_INTERVAL_MS` | 15000 | Cadência do coordenador |
| `SAMPLER_LEASE_TTL_SECONDS` | 600 | TTL da lease fixa do sampler |
| `HEALTH_SNAPSHOT_STALE_AFTER_MS` | 120000 | Idade em que o snapshot sai `OFFLINE` |
| `AVAILABILITY_WINDOW_MINUTES` | 5 | Tamanho da janela |
| `AVAILABILITY_WINDOW_RETENTION_DAYS` | 7 | Retenção das janelas e do TTFF |
| `AVAILABILITY_ROLLUP_RETENTION_DAYS` | 90 | Retenção do resumo diário |
| `HEARTBEAT_HISTORY_RETENTION_HOURS` | 24 | Retenção da série fina de batidas |
| `CAMERA_BITRATE_SAMPLE_RETENTION_HOURS` | 48 | Retenção do `CameraBitrateSample` |
| `CAMERA_BITRATE_REFRESH_HOURS` | 6 | Releitura da banda provisionada e dos codecs Axis |
| `CAMERA_SLA_TARGET_PERCENT` | 99.0 | Meta de SLA |
| `HIKVISION_ISAPI_POLL_INTERVAL_MS` | 15000 | Cadência do poll ISAPI |
| `HIKVISION_ISAPI_FAILURE_TOLERANCE` | 2 | Falhas toleradas antes de offline |
| `HIKVISION_ALERT_STREAM_CONNECT_TIMEOUT_MS` | 8000 | Prazo de conexão do alertStream |
| `HIKVISION_ALERT_STREAM_IDLE_TIMEOUT_MS` | 30000 | Silêncio máximo do alertStream |
| `PTZ_TRACK_INTERVAL_MS` | 750 | Cadência da leitura de posição PTZ durante o movimento |
| `REDIS_STATUS_CACHE_TTL_SECONDS` | 120 | TTL de `camera:status:<id>` |
| `CAMERA_LIVE_METRICS_INTERVAL_MS` | 5000 | Cadência de `camera:health:live` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:4200` | Origens aceitas pelo gateway |
| `MS_ORGANIZATION_INTERNAL_URL` | sem padrão no código | Base do `ms-organization` para o recorte topológico |
| `MS_ORGANIZATION_TIMEOUT_MS` | 1500 | Prazo da chamada de recorte |
| `CAMERAS_AVAILABILITY_EXPORT_CALLERS` | `ms-reports` no `.env.example` | Chamadores aceitos pela exportação, separados por vírgula |
| `CAMERAS_AVAILABILITY_EXPORT_RATE_LIMIT` | 60 | Chamadas por janela e por chamador |
| `CAMERAS_AVAILABILITY_EXPORT_RATE_WINDOW_S` | 60 | Janela do limite, em segundos |
