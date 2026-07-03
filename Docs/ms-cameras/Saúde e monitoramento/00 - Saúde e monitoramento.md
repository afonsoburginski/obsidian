---
tags:
  - doc
  - cameras
  - ms-cameras
  - saude
---

# Saúde e monitoramento (ms-cameras)

> Domínio de monitoramento do [[ms-cameras - visão geral]] (MOD-003 camera-health). Código: `apps/ms-cameras/src/health/` (motor 24/7) + `apps/ms-cameras/src/cameras/realtime/` (push ao vivo). Visual: [[03 - MOD-003 camera-health.excalidraw|diagrama]].

Como o `ms-cameras` sabe se cada câmera está viva, com que qualidade e quanto tempo ficou disponível — e como entrega esse estado ao vivo para a tela. **Saúde e "status em tempo real" são o mesmo domínio: o healthcheck** — um serviço que roda **24/7 em background** fazendo heartbeat por câmera; o "tempo real" é só a camada que empurra o resultado desse monitoramento para o frontend. Três camadas: (1) **monitoramento contínuo** (worker + evaluator → estado + snapshot atual), (2) **base histórica** (janelas de 5 min → rollup diário de 90 dias) que alimenta a aba "Saúde da Câmera", e (3) **push em tempo real** (WebSocket/Redis) que entrega as mudanças ao operador.

As **regras de negócio** (SLA, uptime vs reachability, mapa 4→3 estados, janela vazia = Offline) estão em [[Saúde da Câmera - regras de negócio e contratos]] — aqui documentamos **a implementação**, não as regras.

## Notas deste domínio

**Motor de saúde (healthcheck 24/7):**
- [[Saúde e monitoramento - Arquitetura e estratégias]] — como funciona: bootstrap, worker, evaluator puro, janelas + rollup, composer.
- [[Saúde e monitoramento - Fluxos]] — use cases e user flow passo a passo.
- [[Saúde e monitoramento - Requisitos e SLA]] — RF/RNF cobertos, SLA, retenção.

**Push em tempo real (entrega WebSocket do estado monitorado):**
- [[Status em tempo real (push)]] — visão geral do push (Socket.IO `cameras-status`, cache Redis).
- [[Status em tempo real - Arquitetura e estratégias]] — gateway JWT, salas, events-handlers, limitação de escala.
- [[Status em tempo real - Fluxos]] — do worker ao cliente inscrito.
- [[Status em tempo real - Requisitos e SLA]] — RF-CAM-04, escala.

## Mapa de código (`apps/ms-cameras/src/health/`)

| Peça | Arquivo | Papel |
| --- | --- | --- |
| Bootstrap | `workers/camera-health-bootstrap.service.ts` | No boot, lista câmeras `OPERATIONAL`/`TESTING` e arma o worker por câmera |
| Worker | `workers/camera-health.worker.ts` | Estado por câmera: conexão, loop de ping/RTT, reconexão backoff, publica mudança de estado |
| Evaluator | `evaluator/connectivity-health.evaluator.ts` | **Puro, sem I/O**: score Q (latência+perda) + histerese → `CameraConnectionStatus` |
| Sampler | `workers/availability-window-sampler.service.ts` | `@Cron` a cada 5 min: consolida heartbeats da janela + bitrate → `CameraAvailabilityWindow` |
| Rollup | `workers/availability-rollup.service.ts` | `@Cron` 01:00 UTC: janelas do dia → rollup diário; poda janelas finas |
| Aggregator | `availability/availability.aggregator.ts` | Funções puras: mapa 4→3, médias, `aggregateDay`, `windowsToSlice` |
| Composer | `availability/health-metrics.composer.ts` | Compõe a fatia de disponibilidade do `ICameraHealthMetrics` (7d por dia; 30d/90d por semana) |
| Handler UC-026 | `handlers/get-camera-health-metrics/` | Query read-only: rollups + janelas do dia → `ICameraHealthMetrics` |
| Controllers | `camera-health.controller.ts`, `camera-health-metrics.controller.ts` | Snapshot atual (device) e métricas do período |
| Clients | `clients/axis-ws.client.ts`, `clients/onvif-pullpoint.client.ts` | Canais de heartbeat: Axis VAPIX WebSocket (primário) e ONVIF PullPoint (fallback) |
| Repositories | `repositories/` | Snapshot, event-log, heartbeat-history, availability (janela + rollup) |
| Cleanup | `workers/heartbeat-history-cleanup.service.ts` | `@Cron` horário: poda a série fina de heartbeats (~24h) |

Wiring do módulo: `apps/ms-cameras/src/health/camera-health.module.ts`.

## Endpoints (prefixo `/api`)

| Método | Rota | O que retorna | Origem |
| --- | --- | --- | --- |
| `GET` | `/cameras/health` | Snapshot operacional de **todas** as câmeras (device) | `CameraHealthController.getAll` |
| `GET` | `/cameras/health/:cameraId` | Snapshot atual de uma câmera; 404 se não houver | `CameraHealthController.getOne` |
| `GET` | `/cameras/:id/health?period=7d\|30d\|90d` | `ICameraHealthMetrics` do período (UC-026) | `CameraHealthMetricsController` |

As duas rotas não colidem: `cameras/health` é estática (2 segmentos) e `cameras/:id/health` tem 3 segmentos com `ParseUUIDPipe` no `:id` (rejeita o literal `health`). `period` default = `7d`.

## Persistência (`apps/ms-cameras/src/database/schema/`)

| Modelo | Granularidade | Uso |
| --- | --- | --- |
| `CameraOperationalSnapshot` | 1:1 por câmera (estado corrente) | Snapshot em tempo real: `isOnline`, `connectionStatus`, `latencyMs`, `packetLossPercent`, PTZ, `activeChannel`, `failureReason` |
| `CameraHeartbeatHistory` | 1 linha por ping | Série fina para o evaluator e o sampler; retenção ~24h |
| `CameraAvailabilityWindow` | 1 por câmera por janela de 5 min | `state` (ONLINE/DEGRADED/OFFLINE), `avgLatencyMs`, `avgBitrateMbps`; único `(cameraId, windowStart)`; retenção fina 7d |
| `CameraAvailabilityDailyRollup` | 1 por câmera por dia | Contagens por estado + médias; único `(cameraId, date)`; horizonte 90d |
| `CameraTtffSample` | 1 por abertura de stream | `ttffMs` ("abertura do stream"); escrito pelo streaming, não pelo health |

## `connectionStatus` (device) vs `streamStatus` (vídeo)

São dois sinais **desacoplados** — uma câmera pode estar `connectionStatus = STABLE` com o vídeo travado:

- **`connectionStatus`** (`CameraConnectionStatus`: `STABLE` / `PARTIALLY_UNSTABLE` / `UNSTABLE` / `OFFLINE`) — mede só o **ping ao dispositivo** (VAPIX WS ou ONVIF). Latência e perda de pacotes do canal de controle; **nenhum sinal de vídeo**. É o que este submódulo produz.
- **`streamStatus`** (`StreamHealthStatus`: `OK` / `DEGRADED` / `DOWN` / `INACTIVE`) — derivado no `IStreamDiagnostics` do streaming (UC-027), a partir do estado do path no mediamtx (frames em erro, reconexão, viewers sem peer). Ver [[04-Diagnostico-travamento-WebRTC]].

O `streamStatus` nasceu de um fix de produção anexado à [[SOFTWARE-1923 - Bitrate histórico + TTFF]]: câmera "Estável" com stream travado era lacuna de observabilidade, resolvida expondo o sinal de vídeo à parte em vez de contaminar o `connectionStatus` device-only.

## Relacionados

[[00 - Integração com dispositivo]] · [[00 - Streaming]] · [[00 - Eventos, incidentes e alarmes]] · [[Status em tempo real (push)]]
