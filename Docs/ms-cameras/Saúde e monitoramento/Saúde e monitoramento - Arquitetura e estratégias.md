---
tags:
  - doc
  - cameras
  - ms-cameras
  - saude
---

# Saúde e monitoramento — Arquitetura e estratégias

> Como o monitoramento funciona por dentro. Hub: [[00 - Saúde e monitoramento]]. Regras de negócio: [[Saúde da Câmera - regras de negócio e contratos]]. Visual: [[03 - MOD-003 camera-health.excalidraw|diagrama]].

Duas camadas independentes:
1. **Tempo real** — bootstrap → worker (canal + heartbeat) → evaluator → snapshot + evento. Estado corrente por câmera.
2. **Histórico** — sampler (janela 5 min) → rollup diário 90d → composer (leitura UC-026). Disponibilidade ao longo do tempo.

## Camada tempo real

### Bootstrap — `workers/camera-health-bootstrap.service.ts`

`OnApplicationBootstrap`: busca câmeras com `lifecycleState ∈ {OPERATIONAL, TESTING}` e `deletedAt = null`, resolve credenciais via `ICameraCredentialProvider` e chama `worker.startMonitoring(cameraId, …)` por câmera. Sem credencial → **pula** com warn (não derruba o boot). Host = `ipAddress:communicationPort` do stream profile ativo (fallback porta HTTP VAPIX). Canal inicial: `AXIS_WEBSOCKET`.

### Worker — `workers/camera-health.worker.ts`

Um cliente por câmera num `Map`, mais estado por câmera (janela de ping, RTT, timers, último status, incidente aberto, causa). Dois canais:

- **Axis VAPIX WebSocket** (primário, `clients/axis-ws.client.ts`) — abre `ws-data-stream` com token de sessão digest, assina tópicos de evento (`SystemReady`, `NetworkLost`, `PTZ*`, `Tampering`, …). Ao conectar, arma o **loop de ping**: `measurePing()` mede o RTT via `ws.ping`/`pong` a cada `PING_INTERVAL_MS` (5s), timeout `PING_TIMEOUT_MS` (3s). Loop **auto-agendado** (próximo tick só no `finally` do anterior — nunca pings concorrentes). Eventos VAPIX também mapeiam `topic → causeCode` (rede perdida, falha de energia, tampering, erro PTZ, falha de HW) com prioridade sobre a causa do ping até a recuperação.
- **ONVIF PullPoint** (fallback, `clients/onvif-pullpoint.client.ts`) — `CreatePullPointSubscription` + loop de `PullMessages` (long-poll `PT5S`). Cada round-trip bem-sucedido **é** o heartbeat, emitindo `heartbeat(latencyMs)`.

**Processamento do heartbeat** (`processPingResult`): empilha sucesso/falha numa janela deslizante em memória (`PING_WINDOW_SIZE` = 10), insere linha em `CameraHeartbeatHistory`, calcula perda %, roda o evaluator, faz upsert do snapshot (`latencyMs`, `packetLossPercent`, `connectionStatus`) e chama `maybePublishStatusChange`.

**Mudança de estado** (`maybePublishStatusChange`) — só age quando o status muda:
- abre/fecha **incidente de conectividade** (BR-EVT-001a): abre na primeira saída de `STABLE`, mantém o início mais antigo através da escalada (degradado → offline = um incidente), fecha ao voltar a `STABLE` anexando `durationMinutes` ao evento de restauração;
- grava linha no log de eventos e publica `CameraConnectivityHealthChangedEvent` no EventBus in-process → handler de realtime escreve no Redis e faz push WebSocket (ver [[Status em tempo real (push)]]).

**Reconexão** — `scheduleReconnect`: backoff exponencial com jitter — `min(base * 2^tentativa, max) + jitter`. Env: `RECONNECT_BASE_MS` (2000), `RECONNECT_MAX_MS` (60000), `RECONNECT_JITTER_FACTOR` (0.3). Guarda contra o `ws` disparar `error`+`close` em sequência (`disconnectedEmitted`). Desconexão marca `OFFLINE` **imediatamente**, sem esperar o próximo ciclo de ping.

### Evaluator — `evaluator/connectivity-health.evaluator.ts` (PURO)

`evaluate(current, history)` sem I/O — só matemática, o que o torna trivial de testar e reutilizável (o sampler também o usa). Retorna `CameraConnectionStatus | null`:

- histórico com menos de `EVAL_WINDOW_MIN` (3) amostras → `null` (câmera nova demais para avaliar);
- `!isOnline` → `OFFLINE`;
- **histerese**: sair de OFFLINE exige `OFFLINE_EXIT_CONSECUTIVE` (2) sucessos seguidos — evita flapping;
- senão, **score Q ponderado** `Q = (latScore·1 + lossScore·3) / 4` (perda pesa 3×, latência é sinal secundário):
  - `latScore`: <100ms → 1.0; <300ms → 0.5; senão 0 (`LATENCY_STABLE_MS`, `LATENCY_UNSTABLE_MS`);
  - `lossScore`: 0% → 1.0; <10% → 0.5; senão 0 (`LOSS_UNSTABLE_PCT`);
  - `Q ≥ 0.875` → `STABLE`; `Q ≥ 0.5` → `PARTIALLY_UNSTABLE`; senão `UNSTABLE` (`Q_STABLE_THRESHOLD`, `Q_PARTIALLY_UNSTABLE_THRESHOLD`).

## Camada histórica

### Por que janelas + rollup

A série fina (`CameraHeartbeatHistory`) só retém **~24h** (`heartbeat-history-cleanup.service.ts`, `@Cron` horário, `HEARTBEAT_HISTORY_RETENTION_HOURS` = 24). Ela não sustenta uma consulta de 90 dias. A solução é reamostrar em **janelas de 5 min** (retenção fina 7d) e consolidar num **rollup diário** (90d) — a janela é a unidade de medida (BR-AVAIL-002); dia/semana/período são composições dela, nunca um valor diário medido à parte.

### Sampler — `workers/availability-window-sampler.service.ts`

`@Cron('0 */5 * * * *')` — fecha a janela **anterior** (idempotente por `(cameraId, windowStart)`, então re-rodar atualiza e nunca duplica). Por câmera: lê heartbeats do intervalo, `consolidate()` → estado + latência média, `sampleBitrate()` (delta do contador de bytes do mediamtx / tempo → Mbps), `upsertWindow`.

`consolidate()`: janela **vazia** = `OFFLINE` (BR-AVAIL-005 — ausência de heartbeat não é prova de que esteve online). Senão, maioria online + evaluator pontuam a tendência central e o mapa 4→3 (`mapConnectionStatus`) reduz a `ONLINE`/`DEGRADED`/`OFFLINE`.

### Rollup + poda — `workers/availability-rollup.service.ts`

`@Cron(EVERY_DAY_AT_1AM, { timeZone: 'UTC' })` — **fixado em UTC** para não rolar o dia errado em host não-UTC. Ordem importa: primeiro `rollupPreviousDay` (enquanto as janelas ainda existem), depois `cleanupFineWindows`. `aggregateDay` conta janelas por estado; `offlineWindows = esperadas − online − degradada`, absorvendo tanto janelas OFFLINE observadas quanto lacunas de downtime do serviço (BR-AVAIL-005). Upsert idempotente por `(cameraId, date)`. Poda janelas mais velhas que `AVAILABILITY_WINDOW_RETENTION_DAYS` (7) — o rollup preserva os 90d.

### Aggregator — `availability/availability.aggregator.ts` (funções puras)

`mapConnectionStatus` (4→3), `averageLatency`, `averageBitrate`, `aggregateDay`, `windowsToSlice` (contagem de janelas → horas + %). Contagens de janelas são a fonte única; horas e % são sempre derivadas, então o rollup nunca guarda um número diário que possa divergir.

### Composer — `availability/health-metrics.composer.ts` (puro)

`composeAvailability(period, periodStart, days)` monta a fatia de disponibilidade do `ICameraHealthMetrics`:
- **granularidade das barras**: 7d → por **dia** (`bucketSize` 1); 30d/90d → por **semana** (`bucketSize` 7) (BR-AVAIL-004);
- bucketização por **offset de calendário** a partir de `periodStart` (não por posição no array) — dias sem rollup (câmera criada no meio, downtime) viram lacunas sem desalinhar as barras;
- `uptimePercent` = **Online%** = o número do SLA; `reachabilityPercent` = (Online + Degradada) / total = o card "Uptime". Adição em vez de rename para não quebrar o mock do web-attlas.

### Handler UC-026 — `handlers/get-camera-health-metrics/`

Query read-only. Valida existência da câmera (`cameraExists` → 404 `ResourceNotFoundException`), lê rollups dos dias inteiros + as janelas cruas do **dia parcial corrente** (sem padding a dia cheio) e passa ao composer. `slaTargetPercent` vem do env (`CAMERA_SLA_TARGET_PERCENT`, default 99.0); `slaDeviationPercent = uptime − meta`. `activeSessions` = contagem instantânea do `StreamSessionRegistry`.

## Pendência — PROJ-006 no read path

A **escrita** de bitrate e TTFF já existe: o sampler persiste `avgBitrateMbps` em `CameraAvailabilityWindow`/rollup, e o streaming grava `CameraTtffSample` (`streaming/services/camera-ttff.repository.ts` via `ffmpeg-session.service`). Mas o **handler UC-026 ainda retorna `null`** para esses campos:

```
avgBitrateMbps: null, ttffMs: null, currentBitrateMbps: null, bitrateLatencyTimeSeries: []
```

Ou seja, o dado está persistido mas o read path não o compõe. Fechamento na [[SOFTWARE-1923 - Bitrate histórico + TTFF]] (PR #577, em review).
