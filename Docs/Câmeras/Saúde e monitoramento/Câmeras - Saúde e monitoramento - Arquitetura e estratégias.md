---
tags:
  - doc
  - ms-cameras
  - saude
aliases:
  - "Status em tempo real - Arquitetura e estratégias"
  - "Saúde e monitoramento - Arquitetura e estratégias"
atualizado: 2026-10-01
---

# Câmeras - Saúde e monitoramento - Arquitetura e estratégias

Índice: [[Câmeras - Saúde e monitoramento]]. Regras de negócio: [[Câmeras - Saúde e monitoramento - Requisitos e SLA]].
Visual: [[Câmeras - Saúde e monitoramento - Diagrama.excalidraw|diagrama]].

Três camadas:

1. **Monitoramento contínuo**: coordenador (uma lease Redis por device) para worker (canal e heartbeat)
   para evaluator, que gera o snapshot corrente e os eventos de transição.
2. **Histórico**: sampler (janela de 5 min) para rollup diário de 90 dias para composer (leitura UC-026).
3. **Entrega ao vivo**: EventBus in-process para os handlers do gateway `cameras-status` (Socket.IO, cache
   Redis) e para o tópico Kafka `attlas.cameras.status-changed`.

## Mapa de código

| Peça | Arquivo | Papel |
| --- | --- | --- |
| Bootstrap | `health/workers/camera-health-bootstrap.service.ts` | Só chama `coordinator.start()` |
| Coordenador | `health/leases/device-monitor-coordinator.service.ts` | Decide quais devices esta réplica monitora e por qual canal (PROJ-017) |
| Lease | `health/leases/device-lease.service.ts`, `device-key.util.ts` | `SET NX EX` por chave de device, renovação por Lua que confere o dono |
| Worker | `health/workers/camera-health.worker.ts` | Uma conexão por device, fan-out para as linhas `Camera` do device, ping, reconexão, eventos |
| Clients | `health/clients/axis-ws.client.ts`, `onvif-pullpoint.client.ts`, `hikvision-alert-stream.client.ts`, `hikvision-isapi-heartbeat.client.ts` | Os quatro canais de heartbeat |
| Catálogos de marca | `health/workers/axis-event-catalog.ts`, `hikvision-event-catalog.ts` | Tópico do device para `translationKey`, `severity` e `causeCode` |
| Evaluator | `health/evaluator/connectivity-health.evaluator.ts` | Puro: nota Q e histerese para `CameraConnectionStatus` |
| Snapshot | `health/camera-health.service.ts`, `snapshot-freshness.constants.ts` | Serve `/cameras/health` e vence o snapshot parado |
| Sampler | `health/workers/availability-window-sampler.service.ts` | Fecha a janela de 5 min com estado, latência e bitrate |
| Banda provisionada | `health/workers/provisioned-bandwidth-collector.service.ts` | Relê o bitrate configurado no device |
| Rollup | `health/workers/availability-rollup.service.ts` | 01:00 UTC: rollup do dia anterior e podas |
| Aggregator e composer | `health/availability/availability.aggregator.ts`, `health-metrics.composer.ts`, `availability-source.reconciler.ts` | Funções puras do mapa 4 para 3 e da composição das barras |
| UC-026 | `health/handlers/get-camera-health-metrics/` | Query de métricas do período |
| Limpezas | `health/workers/heartbeat-history-cleanup.service.ts`, `bitrate-sample-cleanup.service.ts` | Poda horária das séries finas, sob lock de transação |
| Gateway | `cameras/realtime/camera-status.gateway.ts` | Namespace `cameras-status`, salas e assinaturas |
| Handlers ao vivo | `cameras/realtime/camera-status.events-handler.ts`, `camera-ptz-position.events-handler.ts`, `camera-health-metrics.events-handler.ts`, `camera-live-metrics.worker.ts`, `events/realtime/camera-event-log.events-handler.ts` | EventBus para emissão na sala |
| Kafka | `cameras/realtime/camera-status-kafka.handler.ts` | Publica a transição em `attlas.cameras.status-changed` (PROJ-024) |
| Payload | `cameras/realtime/camera-status.service.ts` | `buildStatusPayload` para `ICameraStatusPayload` |
| Guard | `cameras/realtime/guards/ws-auth.guard.ts` | `WsAuthGuard`, também usado pelo gateway de streaming |

Wiring: `health/camera-health.module.ts` e `cameras/realtime/camera-status.module.ts`.

## Monitoramento contínuo

### Coordenação por lease

O coordenador roda um passe no boot e depois a cada `MONITOR_LEASE_RECONCILE_INTERVAL_MS` (15 s). A cada
passe:

- relê **toda câmera viva** (`deletedAt = null`), em qualquer `lifecycleState` (UC-001 BR-CRUD-014: a
  telemetria é o que diz se uma câmera cadastrada está online), e as credenciais de todas numa leitura só;
  câmera sem credencial fica de fora;
- escolhe o canal pelo `manufacturer.code`: `AXIS` usa `AXIS_WEBSOCKET`, `HIKVISION` usa
  `HIKVISION_ISAPI_ALERT_STREAM`, qualquer outro usa `ONVIF_PULLPOINT` em
  `http://<host>:<porta>/onvif/event_service`; host e porta vêm do `ipAddress` e do `communicationPort` do
  perfil;
- agrupa as linhas pela chave do device (`deviceKeyOf`: canal mais `host`, ou canal mais a URL do event
  service no ONVIF) e disputa a lease `cameras:monitor:lease:<chave>` (TTL `MONITOR_LEASE_TTL_SECONDS` =
  30 s); com ela, liga no worker as linhas que entraram e desliga as que saíram. Lease perdida é
  redisputada antes de soltar o monitor, para uma lease só expirada (Redis voltando) não abrir um buraco.

Redis fora não cega a frota: o coordenador entra em "monitorar tudo" e loga em ERROR, aceitando conexão
duplicada enquanto durar. No shutdown solta as leases. O cadastro por REST usa `attachRegisteredCamera`,
que resolve o canal pelo fabricante e tenta a lease na hora (INT-020); se a réplica já segura aquele device,
a linha nova entra no fan-out sem abrir conexão. Uma linha que entra num device já monitorado herda, de
outra linha do mesmo device, `isOnline`, `connectionStatus`, `snapshotAt` e `activeChannel` do snapshot
(`seedFrom`: só cria, nunca sobrescreve a escrita do worker, e ignora fonte vencida), para câmera recém-cadastrada de um equipamento já
monitorado em outro sistema não nascer offline.

### Worker e canais

O worker mantém um `DeviceMonitor` por chave de device: a primeira linha vira dona da conexão, as demais
entram como espelho, e se a dona sai uma espelho é promovida e a conexão é reaberta. Estado por device
(janela de ping, RTT, timers, último status, incidente aberto, causa) é compartilhado pelas linhas; snapshot,
heartbeat e evento são escritos em leque para cada linha. A mesma câmera física é cadastrada uma vez por
tenant (seis sistemas hoje), e o fan-out é o que mantém uma conexão por equipamento.

| Canal | Client | Heartbeat | Latência |
| --- | --- | --- | --- |
| Axis VAPIX WebSocket | `axis-ws.client.ts` | `ws.ping` a cada `PING_INTERVAL_MS` (5 s), timeout `PING_TIMEOUT_MS` (3 s), loop auto-agendado (sem pings concorrentes) | RTT do pong |
| ONVIF PullPoint | `onvif-pullpoint.client.ts` | Cada `PullMessages` (long-poll `PT5S`) bem-sucedido | Duração do round-trip |
| Hikvision ISAPI alertStream (INT-019) | `hikvision-alert-stream.client.ts` | Cada evento e keep-alive da conexão HTTP aberta | Nenhuma (`null`) |
| Hikvision ISAPI poll (INT-018) | `hikvision-isapi-heartbeat.client.ts` | `GET /ISAPI/System/status` a cada 15 s; fallback que o client escolhe quando a firmware não tem alertStream | Nenhuma (`null`) |

Os eventos do device (Axis e Hikvision) passam pelo catálogo de marca e viram `HEALTH_EVENT`; tópico com
`causeCode` (rede perdida, energia, tampering, PTZ, hardware) trava essa causa como "última causa conhecida"
até a recuperação, com prioridade sobre a causa do ping. Tópico com estado (Axis a cada reconexão, Hikvision
a cada intervalo de amostragem) só grava linha na transição de estado. PTZ: o tópico `Move/Channel_1` liga e
desliga o loop de leitura de posição, que grava no snapshot e publica `CameraPtzPositionChangedEvent`
(detalhe em [[Câmeras - PTZ e presets]]). Os catálogos e o que cada evento vira estão em
[[Câmeras - Eventos, incidentes e alarmes - Catálogo e criticidade]].

### Processamento do heartbeat e mudança de estado

`processPingResult` empilha sucesso ou falha na janela deslizante em memória (`PING_WINDOW_SIZE` = 10),
insere uma linha em `CameraHeartbeatHistory` por linha do device, calcula a perda, roda o evaluator, faz
upsert do snapshot e chama `maybePublishStatusChange`. Ping falho grava a causa `PROBE_TIMEOUT` (salvo causa
de marca travada), retirada quando nenhuma falha sobra na janela.

`maybePublishStatusChange` só age quando o status muda:

- abre ou fecha o **incidente de conectividade** interno (BR-EVT-001a): abre na primeira saída de `STABLE`,
  mantém o início mais antigo na escalada e fecha ao voltar a `STABLE`, anexando `durationMinutes` ao evento
  de restauração;
- grava `CONNECTIVITY_CHANGED` (`previousStatus`, `currentStatus`, `causeCode`, latência, perda) pelo seam
  de eventos com `source: 'health'` (ver [[Câmeras - Eventos, incidentes e alarmes - Arquitetura e estratégias]]);
- publica `CameraConnectivityHealthChangedEvent` no EventBus uma vez por linha, com o `previousStatus` que
  **aquela** linha viveu (linha sem histórico recebe `null`).

A queda da conexão marca `OFFLINE` na hora (sem esperar ping), grava `HEALTH_OFFLINE` com
`PUSH_DISCONNECT` uma vez por incidente e agenda a reconexão.

### Reconexão

Backoff exponencial com jitter, `min(base * 2^tentativa, max) + jitter`: `RECONNECT_BASE_MS` (2000),
`RECONNECT_MAX_MS` (60000), `RECONNECT_JITTER_FACTOR` (0.3). Cada conexão agenda a própria reconexão uma vez
(um flag por conexão absorve o par `error` e `close` que o `ws` dispara para a mesma queda), e o guarda por
incidente só deduplica o registro de `OFFLINE`. Assim toda tentativa que falha agenda a seguinte.

### Evaluator

`evaluate(current, history)`, sem I/O, devolve `CameraConnectionStatus | null`:

- histórico com menos de `EVAL_WINDOW_MIN` (3) amostras: `null`;
- `!isOnline`: `OFFLINE`;
- histerese: se qualquer uma das últimas `OFFLINE_EXIT_CONSECUTIVE` (2) amostras falhou, `OFFLINE`;
- senão, nota `Q = (latScore * 1 + lossScore * 3) / 4`:
  - `latScore`: abaixo de 100 ms vale 1,0; abaixo de 300 ms vale 0,5; senão 0 (latência nula vale 1,0);
  - `lossScore`: 0% vale 1,0; abaixo de 10% vale 0,5; senão 0;
  - `Q >= 0,875` é `STABLE`, `Q >= 0,5` é `PARTIALLY_UNSTABLE`, abaixo é `UNSTABLE`.

### Snapshot vencido

O `CameraOperationalSnapshot` é "última escrita vence", não série: uma câmera que deixou de ser monitorada
responderia `STABLE` para sempre. O `CameraHealthService` trata como vencido o snapshot mais velho que
`HEALTH_SNAPSHOT_STALE_AFTER_MS` (120000, folgado contra o poll ISAPI de 15 s): devolve `isOnline: false`,
`OFFLINE`, sem `errorCode`, latência nem perda, e com o `failureReason` fixo de snapshot vencido, que separa
"o worker parou de escrever" de falha relatada pelo device.

## Histórico de disponibilidade

A série fina de heartbeat retém cerca de 24 h e não sustenta uma consulta de 90 dias. Por isso ela é
reamostrada em janelas de 5 minutos (retenção de 7 dias) consolidadas num rollup diário (90 dias). A janela
é a unidade de medida (BR-AVAIL-002); dia, barra e período são composições dela.

### Sampler

`@Cron` a cada 5 min, fecha a janela **anterior**, idempotente por `(cameraId, windowStart)`. Só roda a
réplica que segura a lease fixa `cameras:cron:availability-sampler` (`SAMPLER_LEASE_TTL_SECONDS` = 600,
renovada a cada passe), porque a base do delta de bytes vive na memória do processo; com o Redis fora o
passe roda assim mesmo. Amostra só câmeras `OPERATIONAL` e `TESTING`.

1. Por linha: heartbeats da janela e `consolidate()`. Janela vazia é `OFFLINE` (BR-AVAIL-005); com amostras
   insuficientes para o evaluator, `ONLINE` se a maioria respondeu; senão o evaluator e o mapa 4 para 3.
2. Por device físico (`groupByDeviceStream`, linhas agrupadas pelo `streamUrl`): uma leitura do
   `/v3/paths/list` do mediamtx para a frota inteira e um bitrate por device, repassado às linhas. É o
   **real** quando já há espectador com a relay aberta (delta do contador de bytes) e o **provisionado** do
   perfil quando não há; device com todas as linhas `OFFLINE` fica `null`. `CameraBitrateSample` recebe só as
   leituras reais. Detalhe da banda em [[Câmeras - Streaming - Banda e bitrate]].

`CameraHealthMetricsUpdatedEvent(cameraId, 'window')` só sai quando a janela mudou em relação à anterior
(estado, latência ao milissegundo ou bitrate a 0,1 Mbps), para o canal ao vivo não virar um poll de 5 min.

### Banda provisionada

Um passe no boot e outro a cada `CAMERA_BITRATE_REFRESH_HOURS` (6 h) relê o bitrate configurado de cada
câmera `OPERATIONAL`/`TESTING` (ONVIF, com enriquecimento VAPIX ou ISAPI) e grava no `CameraStreamProfile`.
Só fala com o device a réplica que segura a lease dele (`coordinator.holdsCamera`), em série; device mudo
preserva o valor anterior. Leitura em [[Câmeras - Integração com dispositivo - Arquitetura e estratégias]].

### Rollup e poda

`@Cron(EVERY_DAY_AT_1AM, { timeZone: 'UTC' })`, fixado em UTC, dentro de
`withTransactionLock('ms-cameras:availability-rollup')` (um vencedor no cluster). Ordem: `rollupPreviousDay`
(enquanto as janelas existem), depois `cleanupFineWindows`, `cleanupTtffSamples` e `cleanupDailyRollups`,
cada limpeza isolada. `aggregateDay` conta janelas por estado e faz `offlineWindows = esperadas (288) -
online - degradada`, absorvendo janela `OFFLINE` observada e lacuna de downtime do serviço. Upsert
idempotente por `(cameraId, date)`.

### Aggregator e composer

Contagens de janelas são a fonte única; horas e porcentagens são sempre derivadas
(`windowsToSlice`), então o rollup nunca guarda número diário que possa divergir. A granularidade das barras
vem de `resolveHealthRange`: até 14 dias, uma barra por dia; acima, `ceil(dias / 6)` dias por barra (7
barras em 7d, seis de 5 dias em 30d, seis de 15 dias em 90d). A bucketização é por offset de calendário a
partir de `periodStart`, então dia sem rollup vira lacuna sem desalinhar as barras.

### UC-026, métricas do período

`GET /api/cameras/:id/health` com `period=7d|30d|90d` (default `7d`) ou intervalo livre `from`/`to` de até
366 dias. O controller confere que a câmera é do sistema do chamador
(`CameraTenancyService.assertCameraInSystem`); o handler responde 404 se a câmera não existe, lê os rollups
dos dias fechados, agrega as janelas finas retidas para o dia fechado que o rollup ainda não escreveu (as
faltantes contam `OFFLINE`, `fillRollupGaps`) e soma o dia corrente com as janelas cruas, sem padding.

Composição de `ICameraHealthMetrics`: `uptimePercent` (Online%, o SLA), `reachabilityPercent`
(Online + Degradada), `dailyAvailability`, `slaTargetPercent` (env), `slaDeviationPercent`,
`avgBitrateMbps` e `avgLatencyMs` dos mesmos baldes, `ttffMs` (média de `CameraTtffSample`) e `lastTtffMs`,
`bitrateLatencyTimeSeries` (um ponto por janela quando o intervalo cabe na retenção fina, um por dia quando
não cabe), `currentBitrateMbps` (duas leituras do contador de bytes com 400 ms de intervalo, cache de 5 s)
e `activeSessions` (soma dos `readers` dos paths da câmera no mediamtx).

## Entrega ao vivo - gateway `cameras-status`

`@WebSocketGateway({ namespace: 'cameras-status', path: '/api/cameras/status/realtime' })`, a mesma rota do
Kong (`ms-cameras-allowlist-status-ws`). CORS de `CORS_ALLOWED_ORIGINS`, `credentials: false`. Toda
mensagem do cliente passa pelo `WsAuthGuard`: token no header `Authorization: Bearer` ou em
`handshake.auth.token` (query-string omitida de propósito, token em URL vaza para log), validado por
`JwtSignerService.verify`; inválido ou ausente vira `WsException` 4001. As claims ficam em `client.data`.
`handleConnection` só loga: a autorização é por mensagem.

| Mensagem do cliente | Sala | Gate além do JWT | Resposta |
| --- | --- | --- | --- |
| `subscribe_camera` / `unsubscribe_camera` `{ cameraId }` | `camera:<cameraId>` | `isUUID` | `camera:status:snapshot` só ao próprio socket |
| `subscribe_videowall` / `unsubscribe_videowall` `{ systemId }` | `videowall:<systemId>` | Filiação ao sistema | Snapshot de ocupação ([[Câmeras - VMS]]) |
| `subscribe_incidents` / `unsubscribe_incidents` `{ systemId }` | `incidents:<systemId>` | Filiação ao sistema | Recebe `camera:incidents:changed` ([[Câmeras - Eventos, incidentes e alarmes]]) |
| `subscribe_dashboard` / `unsubscribe_dashboard` | Assinatura por socket | Filiação ao sistema | Quadros do dashboard ([[Câmeras - Dashboard]]) |

A filiação (`SystemMembershipResolver`) deixa passar o `MASTER` da plataforma, como o `@RequireSystemDuty()`
do REST.

Emissões na sala `camera:<id>`:

| Evento | Origem | Notas |
| --- | --- | --- |
| `camera:status:update` | `CameraConnectivityHealthChangedEvent`, handler de status | Refaz o payload por `GetCameraStatusQuery`, grava o Redis **antes** de emitir e invalida o dashboard (HEALTH). Câmera apagada no meio é `return` silencioso |
| `camera:ptz:position` | `CameraPtzPositionChangedEvent` | `{ cameraId, pan, tilt, zoom, observedAt }`, sem query nem Redis |
| `camera:event:new` | `CameraEventLogCreatedEvent` (seam de eventos) | Entrada já vem no evento; invalida o dashboard (EVENTS) |
| `camera:health:update` | `CameraHealthMetricsUpdatedEvent` (`window` do sampler, `ttff` do streaming) | Só sinal de mudança; o front refaz `GET /cameras/:id/health`. Invalida o dashboard (HEALTH e, em `window`, BANDWIDTH) |
| `camera:health:live` | `CameraLiveMetricsWorker`, a cada `CAMERA_LIVE_METRICS_INTERVAL_MS` (5 s) | `activeSessions` e `currentBitrateMbps` só para câmeras com assinante nesta réplica; mediamtx fora emite `null`s |
| `camera:analytics:update` | `CameraAnalyticsUpdatedEvent` | Sinal do domínio [[Analítico]] |

**Cache do snapshot**: chave `camera:status:<id>` com o `ICameraStatusPayload`, `SETEX` com TTL
`REDIS_STATUS_CACHE_TTL_SECONDS` (120 s, `CameraStatusConfig` em `cameras/cameras.constants.ts`). Só o
handler de status escreve. O `subscribe_camera` lê o Redis e, em miss, parse inválido ou Redis fora, cai
para `GetCameraStatusQuery`; o `analyticsHealth` é sempre recalculado, porque o cache vive mais que a janela
de frescor do analítico. O client Redis (`redis/redis.module.ts`) usa `enableOfflineQueue: false` e
`maxRetriesPerRequest: 2`: Redis fora rejeita rápido e o banco responde.

**Escala horizontal**: `main.ts` monta o `RedisIoAdapter` (`@attlas/core-messaging/socketio`) antes de
`useWebSocketAdapter`, então `server.to(sala).emit()` alcança sockets de qualquer réplica. Sem `REDIS_HOST`
cai no adapter em memória; com o Redis configurado e inalcançável loga ERROR e segue sem broadcast entre
réplicas. Exceção deliberada: `camera:health:live` usa `emitToCameraLocal` (`server.local`), porque
assinantes e bases do contador de bytes são por processo e um emit no cluster entregaria N leituras
divergentes do mesmo tick.

**Leitura sob demanda**: `GET /api/cameras/:id/status` (`cameras/cameras.controller.ts`, `getStatus`) usa o
mesmo `buildStatusPayload`, para carga inicial de tela e para quem não precisa de push.

**Payload** `ICameraStatusPayload`: `cameraId`, `connectionStatus` (do snapshot), `streamQuality`
(`resolution`, `fps`, `bitrate`, `bitrateSource`, `bitrateUpdatedAt` do perfil `SECONDARY` ativo),
`operationMode` (= `lifecycleState`), `ptz`, `irStatus` (sempre `null`, reservado), `presets`, `location`,
`analyticsHealth` e `updatedAt`.

**Gateway de streaming é outro**: `streaming/streaming.gateway.ts`, namespace `cameras-stream`, path
`/api/cameras/stream/realtime`, mesmo `WsAuthGuard` em `camera.join`/`camera.leave`, alimentado pelo
EventEmitter do ciclo de vida de mídia. Ver [[Câmeras - Streaming]].

### Tópico status-changed

O `CameraStatusKafkaHandler` (PROJ-024) é o segundo handler do mesmo `CameraConnectivityHealthChangedEvent`:
publica `{ cameraId, previousStatus, currentStatus, occurredAt }` com chave `cameraId` e o `systemId` quando
resolvido (sem ele, publica sem escopo, nunca descarta). A primeira avaliação de uma linha depois do boot
(`previousStatus` nulo) não é transição e não sai. O consumidor é o `ms-alarms`, que mapeia o estado anormal
para `CAM_PARTIALLY_UNSTABLE`, `CAM_UNSTABLE` ou `CAM_OFFLINE` e trata a volta a `STABLE` como recuperação
(`apps/ms-alarms/src/evaluation/classification/`). Contador `ms_cameras_status_kafka_published_total` por
`outcome` (`published`, `discarded_no_previous`, `suppressed`, `failed`); só `failed` denuncia buraco real
na série do tópico.

## `connectionStatus` x `streamStatus`

Dois sinais desacoplados; a câmera pode estar `STABLE` com o vídeo travado.

- **`connectionStatus`** (`STABLE`, `PARTIALLY_UNSTABLE`, `UNSTABLE`, `OFFLINE`): só o canal de controle ao
  device. É o que este domínio produz.
- **`streamStatus`** (`OK`, `DEGRADED`, `DOWN`, `INACTIVE`): derivado no `IStreamDiagnostics` (UC-027) a
  partir do path no mediamtx. Ver [[Câmeras - Streaming]].

## Endpoints (prefixo `/api`)

| Método | Rota | Retorno | Origem |
| --- | --- | --- | --- |
| `GET` | `/cameras/health` | Snapshots das câmeras do sistema do header `System-Id` | `CameraHealthController.getAll` |
| `GET` | `/cameras/health/:cameraId` | Snapshot de uma câmera do sistema; 404 se não houver ou for de outro sistema | `CameraHealthController.getOne` |
| `GET` | `/cameras/:id/health` | `ICameraHealthMetrics` do período (UC-026) | `CameraHealthMetricsController` |
| `GET` | `/cameras/:id/status` | `ICameraStatusPayload` corrente | `CamerasController.getStatus` |

`cameras/health` é estática e `cameras/:id/health` tem `ParseUUIDPipe` no `:id`, então não colidem.

## Persistência (`apps/ms-cameras/src/database/schema/`)

| Modelo | Granularidade | Uso |
| --- | --- | --- |
| `CameraOperationalSnapshot` | 1 por câmera | Estado corrente: `isOnline`, `connectionStatus`, `latencyMs`, `packetLossPercent`, PTZ, `activeChannel`, `failureReason`, `snapshotAt` |
| `CameraHeartbeatHistory` | 1 por heartbeat por linha | Série fina do sampler; cerca de 24 h |
| `CameraAvailabilityWindow` | 1 por câmera por 5 min | `state`, `avgLatencyMs`, `avgBitrateMbps`; único `(cameraId, windowStart)`; 7 dias |
| `CameraAvailabilityDailyRollup` | 1 por câmera por dia | Contagens por estado e médias; único `(cameraId, date)`; 90 dias |
| `CameraTtffSample` | 1 por abertura de stream | Escrito pelo streaming; 7 dias |
| `CameraBitrateSample` | 1 por leitura real | 48 h |

## Por que assim

- **Uma lease por device**: sem ela cada réplica abria conexão com todo device (N vezes o ping, as linhas de
  heartbeat e os broadcasts). Fan-out por device pelo mesmo motivo do lado do cadastro multi-tenant.
- **EventBus in-process para o ao vivo, Kafka só para quem é de fora**: worker e gateway vivem no mesmo
  serviço; o push não precisa de durabilidade. O tópico existe para o `ms-alarms`.
- **Cache antes do broadcast**: o assinante que chega atrasado lê o mesmo estado que os demais acabaram de
  receber. PTZ e evento não tocam o Redis porque já carregam o payload.
- **Autorização por mensagem**: mantém o handshake barato e o token fora da URL.
- **Janela de 5 min como unidade**: um número diário medido à parte divergiria da soma das janelas.

## Armadilhas conhecidas

- **ONVIF mede o long-poll como latência.** O `PullMessages` com `Timeout PT5S` é cronometrado inteiro;
  câmera sem evento responde perto de 5000 ms, cai em `PARTIALLY_UNSTABLE` e deixa janelas Degradadas. Afeta
  todo fabricante fora de Axis e Hikvision.
- **Hikvision e ONVIF nunca chegam a `UNSTABLE`.** Só o ping da Axis empurra falha na janela; os outros
  canais só emitem sucesso. Hikvision, sem latência, só alterna `STABLE` e `OFFLINE`.
- **A faixa de perda baixa (0,5) é inalcançável** com `PING_WINDOW_SIZE` = 10: um ping perdido já é 10%,
  que não é menor que 10.
- **Ping perdido entra no histórico como `isOnline: true`.** O worker grava a falha como `errorCode`, não
  como offline; a janela de 5 min só fica Degradada por latência, e a tabela de Conexão Intermitente do
  dashboard (`dropsPerDayFromHeartbeats`, que conta `true` para `false`) tende a zero.
- **Um ping perdido gera três eventos** (offline, instável, recuperada), porque a histerese marca `OFFLINE`
  enquanto o ping falho estiver entre os dois últimos.
- **Duas réguas de latência**: estado em 100 e 300 ms, tabela de latência do dashboard em 80, 130 e 180 ms
  (`dashboard/connectivity-tables/latency/latency-severity.ts`).
- **O cartão "Degradação de Stream" do dashboard conta conexão**, não vídeo.
- **`subscribe_camera` não confere filiação ao sistema**, só o JWT: qualquer usuário autenticado entra na
  sala de qualquer câmera. As salas de videowall, incidentes e dashboard conferem.
- **Socket sem token fica ligado ao namespace**, porque o guard só valida mensagens.

> [!warning] Texto da tela diverge do sampler
> `cameras.health.metrics.bitrate_sampling_note` diz que o bitrate é medido continuamente mesmo sem ninguém
> assistindo; o sampler só mede com espectador e, sem ele, grava o bitrate configurado.

> [!warning] Comentário defasado no worker
> O docblock de `safeAppendEvent` em `camera-health.worker.ts` diz que `source: 'health'` fica fora do
> `event-logged`. Quem decide é o seam, que publica o evento de saúde com par correlacionável.

## Pendências

- Corrigir no código ou nas réguas as armadilhas acima (latência do ONVIF, falha de ping como offline no
  histórico, faixa de perda inalcançável), decidindo antes qual é o comportamento desejado.
- `irStatus` do RF-CAM-04 segue sem fonte.
