---
tags:
  - doc
  - ms-cameras
  - saude
aliases:
  - "Status em tempo real - Fluxos"
atualizado: 2026-10-01
---

# Saúde e monitoramento - Fluxos

Índice: [[Saúde e monitoramento]]. Mecânica e constantes: [[Saúde e monitoramento - Arquitetura e estratégias]].

## 1. Heartbeat e avaliação (contínuo, por device)

1. **Reconciliação**: a cada 15 s o coordenador lê toda câmera viva com credencial, agrupa por device e
   disputa a lease Redis; com ela, liga as linhas no worker.
2. **Canal**: Axis abre o VAPIX WebSocket e arma o ping de 5 s; Hikvision abre o ISAPI alertStream (ou cai
   no poll de 15 s); os demais fabricantes usam ONVIF PullPoint.
3. **Heartbeat**: pong do ping (Axis), `PullMessages` bem-sucedido (ONVIF) ou evento e keep-alive
   (Hikvision, sem latência).
4. **Registro**: janela deslizante de 10, uma linha em `CameraHeartbeatHistory` por linha do device, perda
   em %.
5. **Avaliação**: evaluator devolve `STABLE`, `PARTIALLY_UNSTABLE`, `UNSTABLE`, `OFFLINE` ou `null` (menos de
   3 amostras).
6. **Snapshot**: upsert em `CameraOperationalSnapshot` de cada linha.
7. **Mudou o estado?** Abre ou fecha o incidente de conectividade, grava `CONNECTIVITY_CHANGED` pelo seam de
   eventos e publica `CameraConnectivityHealthChangedEvent` por linha (fluxo 6). Se não mudou, nada sai.
8. **Queda da conexão**: `OFFLINE` na hora, `HEALTH_OFFLINE` com `PUSH_DISCONNECT` e reconexão com backoff.

## 2. Fechamento da janela de 5 min

Na réplica que segura a lease do sampler:

1. Calcula `[windowStart, windowEnd)` da janela recém-fechada.
2. Lista as câmeras `OPERATIONAL`/`TESTING`.
3. Por linha, consolida os heartbeats:

| Situação | Estado da janela |
| --- | --- |
| Nenhum heartbeat | `OFFLINE` (BR-AVAIL-005) |
| Amostras insuficientes para o evaluator | `ONLINE` se a maioria respondeu, senão `OFFLINE` |
| Evaluator respondeu | `STABLE` vira `ONLINE`; `PARTIALLY_UNSTABLE` e `UNSTABLE` viram `DEGRADED`; `OFFLINE` segue `OFFLINE` |

4. Por device, numa leitura do mediamtx para a frota: bitrate real com espectador, provisionado sem ele,
   `null` com o device todo `OFFLINE`.
5. `upsertWindow` e, só para a câmera cuja janela mudou, `CameraHealthMetricsUpdatedEvent('window')`.

## 3. Rollup diário (01:00 UTC)

Sob `withTransactionLock`, nesta ordem:

1. `rollupPreviousDay`: conta as janelas do dia anterior por estado, com
   `offlineWindows = 288 - online - degradada`, e faz upsert em `CameraAvailabilityDailyRollup`.
2. Poda janelas e amostras de TTFF com mais de 7 dias.
3. Poda rollups com mais de 90 dias.

## 4. Consulta de métricas (UC-026)

`GET /api/cameras/:id/health?period=` ou `?from=&to=`:

1. Controller confere que a câmera é do sistema do header `System-Id` (404 se não for).
2. Handler responde 404 se a câmera não existe.
3. `resolveHealthRange`: `period` conta N dias de calendário até agora, âncora UTC; `from`/`to` monta
   intervalo de até 366 dias (400 se inválido). Até 14 dias, barra diária; acima, `ceil(dias / 6)` dias por
   barra.
4. Lê rollups dos dias fechados, agrega janelas finas para dia fechado ainda sem rollup (faltantes contam
   `OFFLINE`) e soma o dia corrente com as janelas cruas.
5. `composeAvailability` e o restante de `ICameraHealthMetrics` (SLA, desvio, bitrate, latência, TTFF,
   série, bitrate instantâneo e sessões ativas).

## 5. Snapshot atual

- `GET /api/cameras/health`: snapshots das câmeras do sistema do header.
- `GET /api/cameras/health/:cameraId`: uma câmera do sistema; 404 se não houver ou for de outro sistema.
  Colunas `Decimal` (PTZ, perda) saem como `number`.
- Snapshot com mais de 2 min sai `OFFLINE`, sem latência nem perda, com o motivo de snapshot vencido.

## 6. Mudança de estado até a tela

| # | Passo | Onde |
| --- | --- | --- |
| 1 | Worker publica `CameraConnectivityHealthChangedEvent` por linha | `health/workers/camera-health.worker.ts` |
| 2 | Handler de status refaz o payload (`GetCameraStatusQuery`) | `cameras/realtime/camera-status.events-handler.ts` |
| 3 | Grava `camera:status:<id>` no Redis antes de emitir | idem |
| 4 | Emite `camera:status:update` na sala `camera:<id>` e invalida o dashboard | idem |
| 5 | Em paralelo, o handler Kafka publica `attlas.cameras.status-changed` (se houver estado anterior) | `cameras/realtime/camera-status-kafka.handler.ts` |
| 6 | Cliente na sala atualiza o badge | `web-attlas`, `CameraLiveStatusService` |

PTZ (`camera:ptz:position`) e evento novo (`camera:event:new`) seguem o mesmo caminho sem query e sem Redis.

## 7. Assinatura do canal ao vivo

1. Cliente conecta em `/cameras-status` com path `/api/cameras/status/realtime`, transporte só websocket e
   o JWT em `handshake.auth.token` (lido de novo a cada reconexão).
2. Envia `subscribe_camera { cameraId }`; o guard valida o JWT, o gateway valida o UUID e entra na sala.
3. Busca o snapshot no Redis e, em miss ou erro, no banco; emite `camera:status:snapshot` só a esse socket.
4. A partir daí recebe da sala `camera:status:update`, `camera:ptz:position`, `camera:event:new`,
   `camera:health:update`, `camera:health:live` e `camera:analytics:update`.
5. Sair: `unsubscribe_camera`.

Não há ack nem replay: quem reconecta reassina e recebe novo snapshot. No `web-attlas`, o
`CameraLiveStatusService` (`modules/cameras/services/camera-live-status.service.ts`) abre **um socket por
câmera**, compartilhado por contagem de referência entre todos os streams daquela câmera (status, PTZ,
eventos, saúde, analítico, métricas ao vivo), e fecha quando o último assinante sai.

## 8. Onde a saúde aparece na tela

- **Resumo de saúde** (`camera-health-summary`): dentro do painel lateral de presets
  (`camera-presets-panel`), que o detalhe da câmera e o painel de câmera do painel de operações montam.
- **Painel lateral da lista de câmeras** (`cameras-side-detail`).
- **Painel de saúde** (`camera-health-panel`): folha lateral aberta pelas abas de conectividade do
  [[Dashboard de câmeras]].

Em todos: o operador escolhe `7d`, `30d`, `90d` ou um intervalo; o front chama
`GET /api/cameras/:id/health` (`CamerasService.getHealthMetrics`; o intervalo vence quando os dois vêm) e
renderiza SLA (Online% contra a meta, cumprido ou descumprido, desvio), card Uptime (reachability), barras
empilhadas Online, Degradada e Offline, e latência média. `camera:health:update` pede refetch;
`camera:health:live` atualiza espectadores e bitrate instantâneo a cada 5 s. Regras de exibição em
[[Saúde e monitoramento - Requisitos e SLA]].
