---
tags:
  - doc
  - cameras
  - ms-cameras
  - saude
---

# Saúde e monitoramento — Fluxos

> Passo a passo dos ciclos e consultas. Hub: [[00 - Saúde e monitoramento]]. Como funciona por dentro: [[Saúde e monitoramento - Arquitetura e estratégias]]. Visual: [[03 - MOD-003 camera-health.excalidraw|diagrama]].

## 1. Ciclo de heartbeat e avaliação (por câmera, contínuo)

Roda o tempo todo, uma instância por câmera monitorada.

1. **Boot** — `CameraHealthBootstrapService` lista câmeras `OPERATIONAL`/`TESTING`, resolve credenciais e arma o worker por câmera (sem credencial → pula).
2. **Canal** — worker abre Axis VAPIX WebSocket (ou ONVIF PullPoint no fallback) e, no `connected`, inicia o loop de ping.
3. **Ping** — a cada 5s (`PING_INTERVAL_MS`) mede o RTT (`measurePing`, timeout 3s). ONVIF: cada `PullMessages` bem-sucedido é o heartbeat.
4. **Registro** — empilha sucesso/falha na janela deslizante (tam. 10), insere linha em `CameraHeartbeatHistory`, calcula perda %.
5. **Avaliação** — `ConnectivityHealthEvaluator.evaluate` → `STABLE` / `PARTIALLY_UNSTABLE` / `UNSTABLE` / `OFFLINE` (ou `null` se histórico < 3).
6. **Snapshot** — upsert em `CameraOperationalSnapshot` (`connectionStatus`, `latencyMs`, `packetLossPercent`, `snapshotAt`).
7. **Mudou o estado?** — se sim: abre/fecha incidente (duração no evento de restauração), grava no log de eventos e publica `CameraConnectivityHealthChangedEvent` → Redis + WebSocket ([[Status em tempo real (push)]]). Se não, nada é publicado.
8. **Desconexão** — marca `OFFLINE` na hora e agenda reconexão com backoff+jitter.

## 2. Fechamento da janela de 5 min (`@Cron` a cada 5 min)

`AvailabilityWindowSampler.sampleWindow` fecha a janela **anterior**.

1. Calcula `[windowStart, windowEnd)` da janela recém-fechada.
2. Lista as câmeras de amostragem (mesma seleção do bootstrap).
3. Por câmera: lê os heartbeats do intervalo e `consolidate()`:

| Situação | Estado da janela |
| --- | --- |
| Nenhum heartbeat | `OFFLINE` (BR-AVAIL-005) |
| Amostras insuficientes p/ score | `ONLINE` se maioria online, senão `OFFLINE` |
| Score do evaluator | mapa 4→3: STABLE→`ONLINE`, PARTIALLY/UNSTABLE→`DEGRADED`, OFFLINE→`OFFLINE` |

4. Mede `avgBitrateMbps` (delta de bytes do mediamtx) e faz `upsertWindow` (idempotente por `(cameraId, windowStart)`).

## 3. Rollup diário + poda (`@Cron` 01:00 UTC)

`AvailabilityRollupService.rollupAndCleanup` — nesta ordem:

1. `rollupPreviousDay`: para cada câmera, lê as janelas do dia anterior e `aggregateDay` conta por estado. `offlineWindows = esperadas(288) − online − degradada` (dobra janelas faltantes em OFFLINE). Upsert em `CameraAvailabilityDailyRollup` (idempotente por `(cameraId, date)`).
2. `cleanupFineWindows`: apaga janelas mais velhas que 7d. O rollup mantém os 90d.

## 4. Consulta de métricas — UC-026 (`GET /api/cameras/:id/health?period=`)

`GetCameraHealthMetricsHandler`:

1. `cameraExists(cameraId)` → 404 se não existir (`ResourceNotFoundException`).
2. Calcula `periodStart` (7/30/90 dias atrás, âncora UTC).
3. Lê **rollups** dos dias inteiros (`findRollupsInRange`) + **janelas cruas do dia corrente** (`findWindowsInRange`, sem padding — o dia ainda está em curso).
4. `composeAvailability`: soma janelas por estado → `online`/`degraded`/`offline` (horas + %), `uptimePercent` (=Online%, o SLA), `reachabilityPercent` (=Online+Degradada), `dailyAvailability` (barras: 7d por dia, 30d/90d por semana).
5. Monta `ICameraHealthMetrics`: + `slaTargetPercent` (env), `slaDeviationPercent`, `activeSessions` (registry). **`avgBitrateMbps`/`ttffMs`/`currentBitrateMbps`/`bitrateLatencyTimeSeries` ainda vêm `null`/vazios** (pendência PROJ-006 no read path — ver [[Saúde e monitoramento - Arquitetura e estratégias]]).

## 5. Snapshot atual (device)

- `GET /api/cameras/health` → `CameraHealthController.getAll` → `getAllHealthSnapshots` (todos os `CameraOperationalSnapshot`).
- `GET /api/cameras/health/:cameraId` → snapshot de uma câmera; 404 se não houver. Colunas `Decimal` (PTZ, perda) são convertidas para `number` na resposta.

## User flow — aba/modal "Saúde da Câmera"

Aparece como **aba** na página de detalhe da câmera e como **modal** aberto pela InfoCam no Video Wall (tabs "Informações Gerais" | "Saúde da Câmera") — mesmo backend nos dois.

1. Operador abre a aba/modal e escolhe o **período** (`7d` / `30d` / `90d`).
2. Frontend chama `GET /api/cameras/:id/health?period=…`.
3. Renderiza: **SLA** (Online% × meta 99% → "cumprido/descumprido" + desvio), card **Uptime** (reachability, Online+Degradada), barras de disponibilidade empilhadas (Online/Degradada/Offline por dia ou semana) e latência média.
4. Regras completas de exibição (SLA, uptime vs reachability, janela vazia = Offline): [[Saúde da Câmera - regras de negócio e contratos]].
