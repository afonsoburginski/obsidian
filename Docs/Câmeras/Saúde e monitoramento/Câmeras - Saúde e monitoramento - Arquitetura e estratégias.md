---
tags:
  - doc
  - cameras
  - saude
aliases:
  - "Câmeras - Saúde e monitoramento - Arquitetura e estratégias"
  - "Status em tempo real - Arquitetura e estratégias"
  - "Saúde e monitoramento - Arquitetura e estratégias"
atualizado: 2026-10-07
---

# Câmeras - Saúde e monitoramento - Arquitetura e estratégias

Volta para [[Câmeras - Saúde e monitoramento]].

## Resumo

| Camada | O que faz | Onde |
| --- | --- | --- |
| Monitoramento contínuo | Um coordenador distribui os equipamentos entre as réplicas por lease Redis; o worker abre uma conexão de controle por equipamento, conta as batidas e o evaluator decide o estado; o snapshot guarda o estado corrente | `apps/ms-cameras/src/health/` |
| Histórico | O sampler fecha uma janela de 5 minutos por câmera; o rollup consolida as janelas num resumo diário de 90 dias; a consulta de métricas e a contagem para relatório leem esse resumo | `apps/ms-cameras/src/health/` e `apps/ms-cameras/src/availability/` |
| Entrega ao vivo | O EventBus do processo leva a mudança ao gateway Socket.IO `cameras-status` (com cache Redis) e ao tópico Kafka `attlas.cameras.status-changed` | `apps/ms-cameras/src/cameras/realtime/` |

As regras e os números estão em [[Câmeras - Saúde e monitoramento - Requisitos e SLA]]; o passo a passo, em
[[Câmeras - Saúde e monitoramento - Fluxos]].

## Onde está no código

| Caminho | Papel |
| --- | --- |
| `apps/ms-cameras/src/health/camera-health.module.ts` | Monta o monitoramento e o histórico |
| `apps/ms-cameras/src/health/workers/camera-health-bootstrap.service.ts` | Só chama `coordinator.start()` no boot |
| `apps/ms-cameras/src/health/leases/device-monitor-coordinator.service.ts` | Decide quais equipamentos esta réplica monitora e por qual canal; cadastro novo entra por `attachRegisteredCamera` |
| `apps/ms-cameras/src/health/leases/device-lease.service.ts` | Lease por equipamento: `SET NX EX` e renovação por script Lua que confere o dono |
| `apps/ms-cameras/src/health/leases/device-key.util.ts` | `deviceKeyOf`, a chave que agrupa as linhas `Camera` do mesmo equipamento |
| `apps/ms-cameras/src/health/leases/monitor-lease.constants.ts` | Prefixo, TTL e cadência das leases do monitor e do sampler |
| `apps/ms-cameras/src/health/workers/camera-health.worker.ts` | Uma conexão por equipamento, fan-out para as linhas, ping, reconexão, eventos, incidente de conectividade e âncora `offlineSince` |
| `apps/ms-cameras/src/health/clients/` | Os quatro canais: `axis-ws.client.ts`, `onvif-pullpoint.client.ts`, `hikvision-alert-stream.client.ts` e `hikvision-isapi-heartbeat.client.ts` |
| `apps/ms-cameras/src/health/workers/axis-event-catalog.ts` e `hikvision-event-catalog.ts` | Tópico do equipamento para `translationKey`, `severity` e `causeCode` |
| `apps/ms-cameras/src/health/evaluator/connectivity-health.evaluator.ts` | Função pura: nota Q e histerese |
| `apps/ms-cameras/src/health/camera-health.service.ts` e `snapshot-freshness.constants.ts` | Serve `/cameras/health` e trata o snapshot parado como vencido |
| `apps/ms-cameras/src/health/repositories/camera-health-snapshot.repository.ts` | Upsert do snapshot, `seedFrom` e carimbo e limpeza de `offlineSince` |
| `apps/ms-cameras/src/health/workers/availability-window-sampler.service.ts` | Fecha a janela de 5 minutos com estado, latência e bitrate |
| `apps/ms-cameras/src/health/workers/provisioned-bandwidth-collector.service.ts` | Relê o bitrate configurado no equipamento; em câmera Axis, chama `camera-video-codec.probe.ts`, que atualiza `Camera.supportedVideoCodecs` |
| `apps/ms-cameras/src/health/workers/availability-rollup.service.ts` | 01:00 UTC: resumo do dia anterior e podas |
| `apps/ms-cameras/src/health/availability/` | Funções puras: `availability.aggregator.ts` (mapa de 4 para 3 estados, médias, bitrate plausível), `availability-source.reconciler.ts` (lacunas, vida da câmera) e `health-metrics.composer.ts` (barras) |
| `apps/ms-cameras/src/health/handlers/get-camera-health-metrics/` | Consulta de métricas do período |
| `apps/ms-cameras/src/health/workers/heartbeat-history-cleanup.service.ts` e `bitrate-sample-cleanup.service.ts` | Poda horária das séries finas, sob lock de transação |
| `apps/ms-cameras/src/availability/` | Contagem autorizada do resumo diário (`GET /api/cameras/availability`), projeção da linha e recorte topológico pelo `ms-organization` (`topological-cut/`) |
| `apps/ms-cameras/src/internal-api/availability-export/` | Exportação paginada do resumo diário para o `ms-reports` |
| `apps/ms-cameras/src/internal-api/status/` | Estado de conexão por câmera para o `ms-execution-plans`, com a idade da queda lida de `offlineSince` ([[Câmeras - Cadastro - Arquitetura e estratégias]]) |
| `apps/ms-cameras/src/cameras/realtime/camera-status.module.ts` | Monta a entrega ao vivo |
| `apps/ms-cameras/src/cameras/realtime/camera-status.gateway.ts` | Namespace `cameras-status`, salas e assinaturas |
| `apps/ms-cameras/src/cameras/realtime/camera-status.events-handler.ts` | Mudança de estado para Redis e sala |
| `apps/ms-cameras/src/cameras/realtime/camera-ptz-position.events-handler.ts`, `camera-health-metrics.events-handler.ts`, `camera-analytics-updated.events-handler.ts` e `camera-live-metrics.worker.ts` | As demais emissões da sala da câmera |
| `apps/ms-cameras/src/events/realtime/camera-event-log.events-handler.ts` | Evento novo do log para a sala |
| `apps/ms-cameras/src/cameras/realtime/camera-status-kafka.handler.ts` | Publica a transição em `attlas.cameras.status-changed` |
| `apps/ms-cameras/src/cameras/realtime/camera-status.service.ts` | `buildStatusPayload`, que monta o `ICameraStatusPayload` |
| `apps/ms-cameras/src/cameras/realtime/guards/ws-auth.guard.ts` | `WsAuthGuard`, usado também pelo gateway de streaming |

## Contratos

### Rotas REST

Todas sob o prefixo `/api`.

| Método | Rota | Retorno | Autorização | Spec |
| --- | --- | --- | --- | --- |
| `GET` | `/api/cameras/health` | Snapshots das câmeras do sistema do header `System-Id` | Só JWT; escopo pelo header, sem conferir filiação | |
| `GET` | `/api/cameras/health/:cameraId` | Snapshot de uma câmera; 404 se não houver ou se for de outro sistema | Só JWT; escopo pelo header, sem conferir filiação | |
| `GET` | `/api/cameras/:id/health?period=` ou `?from=&to=` | `ICameraHealthMetrics` do período | Só JWT; câmera do sistema do header (`CameraTenancyService.assertCameraInSystem`), outra dá 404 | UC-026 |
| `GET` | `/api/cameras/:id/status` | `ICameraStatusPayload` corrente, o mesmo do canal ao vivo | `@RequireSystemDuty()` de classe do `CamerasController` | |
| `GET` | `/api/cameras/availability?from=&to=&limit=` | Contagem autorizada do resumo diário: `rows` (amostra de até `limit`, padrão 50, máximo 100) e `total` do conjunto inteiro | `@RequireSystemDuty()` | UC-072 |
| `GET` | `/api/internal/cameras/availability/export` | Página do resumo diário (`limit` até 1000, `rowBudget` até 90.000, `cursor`) | Token interno, chamador declarado em `CAMERAS_AVAILABILITY_EXPORT_CALLERS` e limite por chamador | UC-072 |
| `POST` | `/api/internal/cameras/status` | `connectionStatus` e `statusSince` por câmera | Token interno | CROSS-185 |

`cameras/health` é rota estática e `cameras/:id/health` tem `ParseUUIDPipe` no `:id`, então as duas não
colidem. A rota `cameras/availability` mora no `CamerasController`, declarada antes do `@Get(':id')`, porque
num controller próprio ela cairia no `ParseUUIDPipe` dessa rota e responderia 400.

As duas rotas do resumo diário aceitam o recorte topológico `areaId`, `subareaId`, `nodeId` e `linkId`
(vários valores por eixo). O recorte vira lista de câmeras numa chamada a `GET /internal/devices/ids` do
`ms-organization`; lista truncada pelo dono é recusada com `ExternalServiceException`, para o relatório não
afirmar o recorte sobre parte das câmeras. `from` e `to` são dias civis `YYYY-MM-DD`; dia inexistente dá
`AVAILABILITY_RANGE_NOT_CIVIL_DATE` e fim antes do início dá `AVAILABILITY_RANGE_END_BEFORE_START`. A linha
devolvida é a mesma nas duas rotas (`CameraAvailabilityProjection`): contagens de janelas,
`availabilityPercent` (Online sobre o total), `onlineHours`, latência e bitrate médios e `partial` no dia
ainda aberto.

### Canal ao vivo `cameras-status`

`@WebSocketGateway` com namespace `cameras-status` e path `/api/cameras/status/realtime`, a mesma rota do
Kong (`ms-cameras-allowlist-status-ws`). CORS vem de `CORS_ALLOWED_ORIGINS`, com `credentials: false`. Toda
mensagem do cliente passa pelo `WsAuthGuard`: o token vem do header `Authorization: Bearer` ou de
`handshake.auth.token`, nunca da query-string, e é validado por `JwtSignerService.verify`; token ausente ou
inválido vira `WsException` com código 4001. As claims ficam em `client.data`. `handleConnection` só registra
log, porque a autorização é por mensagem.

| Mensagem do cliente | Sala | Validação além do JWT | Resposta |
| --- | --- | --- | --- |
| `subscribe_camera` e `unsubscribe_camera` `{ cameraId }` | `camera:<cameraId>` | `cameraId` é UUID | `camera:status:snapshot` só ao próprio socket |
| `subscribe_videowall` e `unsubscribe_videowall` `{ systemId }` | `videowall:<systemId>` | Filiação ao sistema | `videowall:occupancy:snapshot` ([[Câmeras - Videowall]]) |
| `subscribe_incidents` e `unsubscribe_incidents` `{ systemId }` | `incidents:<systemId>` | Filiação ao sistema | Passa a receber `camera:incidents:changed` ([[Câmeras - Eventos, incidentes e alarmes]]) |
| `subscribe_dashboard` e `unsubscribe_dashboard` | Assinatura por socket | Filiação ao sistema | Quadros do dashboard ([[Câmeras - Dashboard]]) |

A filiação (`SystemMembershipResolver`) deixa passar o `MASTER` da plataforma, como o
`@RequireSystemDuty()` do REST; sem filiação a resposta é `WsException` com `FORBIDDEN_ACTION`.

| Evento emitido na sala `camera:<id>` | Origem | O que carrega |
| --- | --- | --- |
| `camera:status:update` | `CameraConnectivityHealthChangedEvent`, pelo handler de status | Payload refeito por `GetCameraStatusQuery`; grava o Redis antes de emitir e invalida o dashboard (HEALTH). Câmera apagada no meio do caminho encerra sem erro |
| `camera:ptz:position` | `CameraPtzPositionChangedEvent` | `{ cameraId, pan, tilt, zoom, observedAt }`, sem query nem Redis |
| `camera:event:new` | `CameraEventLogCreatedEvent` | A entrada do log já pronta; invalida o dashboard (EVENTS) |
| `camera:health:update` | `CameraHealthMetricsUpdatedEvent` (`window` do sampler, `ttff` do streaming) | Só o sinal de mudança; o front refaz `GET /api/cameras/:id/health`. Invalida o dashboard (HEALTH e, em `window`, BANDWIDTH) |
| `camera:health:live` | `CameraLiveMetricsWorker`, a cada `CAMERA_LIVE_METRICS_INTERVAL_MS` | `activeSessions` e `currentBitrateMbps`, só para câmeras com assinante nesta réplica; MediaMTX fora emite `null` |
| `camera:analytics:update` | `CameraAnalyticsUpdatedEvent` | Sinal do domínio [[Analítico]] |

Payload `ICameraStatusPayload`: `cameraId`, `connectionStatus` (do snapshot), `streamQuality` (`resolution`,
`fps`, `bitrate`, `bitrateSource` e `bitrateUpdatedAt` do perfil `SECONDARY` ativo), `operationMode` (igual a
`lifecycleState`), `ptz`, `irStatus` (sempre `null`, reservado), `presets`, `location`, `analyticsHealth` e
`updatedAt`.

O gateway de streaming é outro: `apps/ms-cameras/src/streaming/streaming.gateway.ts`, namespace
`cameras-stream`, path `/api/cameras/stream/realtime`, com o mesmo `WsAuthGuard` em `camera.join` e
`camera.leave` ([[Câmeras - Streaming]]).

### Tópico status-changed

| Tópico | Produtor | Consumidor | Payload | Spec |
| --- | --- | --- | --- | --- |
| `attlas.cameras.status-changed` | `CameraStatusKafkaHandler` | `ms-alarms` | `{ cameraId, previousStatus, currentStatus, occurredAt }` e `systemId` quando resolvido; chave `cameraId` | PROJ-024 |

O handler Kafka é o segundo handler do mesmo `CameraConnectivityHealthChangedEvent`. Sem `systemId`
resolvido, publica sem escopo e nunca descarta. A primeira avaliação de uma linha depois do boot
(`previousStatus` nulo) não é transição e não sai. O `ms-alarms` mapeia o estado anormal para
`CAM_PARTIALLY_UNSTABLE`, `CAM_UNSTABLE` ou `CAM_OFFLINE` e trata a volta a `STABLE` como recuperação
(`apps/ms-alarms/src/evaluation/classification/`).

O contador `ms_cameras_status_kafka_published_total` tem o rótulo `outcome` com `published`,
`discarded_no_previous`, `suppressed` e `failed`. Só `failed` indica buraco real na série do tópico.

### Chaves Redis

| Chave | Conteúdo | TTL |
| --- | --- | --- |
| `cameras:monitor:lease:<chave do equipamento>` | Dono do monitoramento do equipamento | `MONITOR_LEASE_TTL_SECONDS` |
| `cameras:cron:availability-sampler` | Réplica que fecha as janelas | `SAMPLER_LEASE_TTL_SECONDS` |
| `camera:status:<cameraId>` | `ICameraStatusPayload` da última mudança | `REDIS_STATUS_CACHE_TTL_SECONDS` (`CameraStatusConfig` em `apps/ms-cameras/src/cameras/cameras.constants.ts`) |
| `cameras:availability-export:rate-limit:<chamador>` | Contador do limite da exportação | `CAMERAS_AVAILABILITY_EXPORT_RATE_WINDOW_S` |

O client Redis (`apps/ms-cameras/src/redis/redis.module.ts`) usa `enableOfflineQueue: false` e
`maxRetriesPerRequest: 2`: com o Redis fora, a leitura falha rápido e o banco responde.

### Tabelas do banco

Schema em `apps/ms-cameras/src/database/schema/`.

| Modelo | Granularidade | Uso |
| --- | --- | --- |
| `CameraOperationalSnapshot` | 1 por câmera | Estado corrente: `isOnline`, `connectionStatus`, `latencyMs`, `packetLossPercent`, PTZ, `activeChannel`, `failureReason`, `snapshotAt` e `offlineSince` (instante da queda) |
| `CameraHeartbeatHistory` | 1 por batida por linha | Série fina que o sampler lê |
| `CameraAvailabilityWindow` | 1 por câmera a cada 5 minutos | `state`, `avgLatencyMs`, `avgBitrateMbps`; único por `(cameraId, windowStart)` |
| `CameraAvailabilityDailyRollup` | 1 por câmera por dia | Contagens de janelas por estado e médias; único por `(cameraId, date)` |
| `CameraTtffSample` | 1 por abertura de stream | Escrito pelo streaming |
| `CameraBitrateSample` | 1 por leitura real de bitrate | Traço de bitrate medido |

### Contratos em `@attlas/contracts`

| Arquivo em `libs/contracts/src/lib/camera/` | Conteúdo |
| --- | --- |
| `i-camera-health-metrics.ts` | `ICameraHealthMetrics`, a resposta da consulta de métricas |
| `i-camera-availability-slice.ts` e `i-camera-daily-availability.ts` | Fatia de horas e porcentagens e barra diária |
| `i-camera-bitrate-latency-sample.ts` | Ponto da série de bitrate e latência |
| `camera-health-period.type.ts` e `camera-health-bucket-unit.type.ts` | `7d`, `30d`, `90d` e a unidade da barra |
| `i-camera-status-payload.ts` | `ICameraStatusPayload` |
| `i-camera-status-changed-event.ts` | Payload do tópico `attlas.cameras.status-changed` |
| `i-camera-health-update-payload.ts` e `i-camera-live-metrics-payload.ts` | `camera:health:update` e `camera:health:live` |
| `camera-availability-count-route.constant.ts` e `camera-availability-export-route.constant.ts` | Rotas da contagem e da exportação |
| `camera-availability-export.constant.ts` | Tetos da exportação |

## Por que é assim

### Coordenação por lease

Sem coordenação, cada réplica abriria conexão com todo equipamento, e o ping, as linhas de histórico e os
broadcasts sairiam multiplicados pelo número de réplicas. O coordenador roda um passe no boot e depois a cada
`MONITOR_LEASE_RECONCILE_INTERVAL_MS`:

- relê toda câmera viva (`deletedAt = null`) em qualquer `lifecycleState`, porque a telemetria é o que diz se
  uma câmera cadastrada está online, e as credenciais de todas numa leitura só; câmera sem credencial fica de
  fora;
- escolhe o canal pelo `manufacturer.code`: `AXIS` usa `AXIS_WEBSOCKET`, `HIKVISION` usa
  `HIKVISION_ISAPI_ALERT_STREAM` e qualquer outro usa `ONVIF_PULLPOINT` em
  `http://<host>:<porta>/onvif/event_service`, com host e porta do `ipAddress` e do `communicationPort` do
  perfil;
- agrupa as linhas pela chave do equipamento (canal mais host, ou canal mais a URL do event service no ONVIF)
  e disputa a lease `cameras:monitor:lease:<chave>`; com ela, liga no worker as linhas que entraram e desliga
  as que saíram. Lease perdida é disputada de novo antes de soltar o monitor, para uma lease apenas expirada
  (Redis voltando) não abrir um buraco.

Com o Redis fora, o coordenador entra em "monitorar tudo" e registra ERROR, aceitando conexão duplicada
enquanto durar; a frota não fica cega. No shutdown, solta as leases. O cadastro por REST chama
`attachRegisteredCamera`, que resolve o canal pelo fabricante e tenta a lease na hora; se a réplica já segura
aquele equipamento, a linha nova entra no fan-out sem abrir conexão.

A mesma câmera física é cadastrada uma vez por sistema (seis sistemas hoje), e o fan-out mantém uma conexão
por equipamento. Uma linha que entra num equipamento já monitorado herda `isOnline`, `connectionStatus`,
`snapshotAt` e `activeChannel` de outra linha do mesmo equipamento (`seedFrom`): só cria, nunca sobrescreve a
escrita do worker, e ignora fonte vencida. Assim a câmera recém-cadastrada de um equipamento já monitorado em
outro sistema não nasce offline.

### Worker e canais

O worker mantém um `DeviceMonitor` por chave de equipamento. A primeira linha vira dona da conexão e as
demais entram como espelho; se a dona sai, uma espelho é promovida e a conexão é reaberta. O estado por
equipamento (janela de ping, RTT, timers, último status, incidente aberto, causa) é compartilhado; snapshot,
batida e evento são escritos em leque para cada linha.

| Canal | Client | O que conta como batida | Latência |
| --- | --- | --- | --- |
| Axis VAPIX WebSocket | `axis-ws.client.ts` | Pong do `ws.ping` a cada `PING_INTERVAL_MS`, com timeout `PING_TIMEOUT_MS`; loop auto-agendado, sem pings concorrentes | RTT do pong |
| ONVIF PullPoint | `onvif-pullpoint.client.ts` | Cada `PullMessages` bem-sucedido (long-poll `PT5S`) | Duração do round-trip |
| Hikvision ISAPI alertStream | `hikvision-alert-stream.client.ts` | Cada evento e keep-alive da conexão HTTP aberta | Nenhuma (`null`) |
| Hikvision ISAPI poll | `hikvision-isapi-heartbeat.client.ts` | `GET /ISAPI/System/status` a cada `HIKVISION_ISAPI_POLL_INTERVAL_MS`; o client escolhe este caminho quando o firmware não tem alertStream | Nenhuma (`null`) |

Os eventos do equipamento (Axis e Hikvision) passam pelo catálogo da marca e viram `HEALTH_EVENT`. Tópico com
`causeCode` (rede perdida, energia, tampering, PTZ, hardware) trava essa causa como "última causa conhecida"
até a recuperação, com prioridade sobre a causa do ping. Tópico com estado (Axis a cada reconexão, Hikvision a
cada intervalo de amostragem) só grava linha na transição. O tópico `Move/Channel_1` liga e desliga o loop de
leitura de posição PTZ, que grava no snapshot e publica `CameraPtzPositionChangedEvent`
([[Câmeras - PTZ e presets]]). O que cada evento vira está em
[[Câmeras - Eventos, incidentes e alarmes - Catálogo e criticidade]].

`processPingResult` empilha sucesso ou falha na janela deslizante em memória, insere uma linha em
`CameraHeartbeatHistory` por linha do equipamento, calcula a perda, roda o evaluator, faz upsert do snapshot e
chama `maybePublishStatusChange`. Ping falho grava a causa `PROBE_TIMEOUT` (salvo causa de marca travada),
retirada quando nenhuma falha sobra na janela. A queda da conexão marca `OFFLINE` na hora, sem esperar ping.

A reconexão usa backoff exponencial com jitter, `min(base * 2^tentativa, max) + jitter`. Cada conexão agenda a
própria reconexão uma vez: um flag por conexão absorve o par `error` e `close` que o `ws` dispara para a mesma
queda, e o guarda por incidente só deduplica o registro de `OFFLINE`. Assim toda tentativa que falha agenda a
seguinte.

### Evaluator

`evaluate(current, history)`, sem I/O, devolve `CameraConnectionStatus` ou `null`:

1. histórico com menos de `EVAL_WINDOW_MIN` amostras: `null`, sem estado;
2. amostra corrente sem resposta: `OFFLINE`;
3. histerese: se qualquer uma das últimas `OFFLINE_EXIT_CONSECUTIVE` amostras falhou, `OFFLINE`;
4. senão, nota `Q = (latScore * 1 + lossScore * 3) / 4`, em que a perda pesa três vezes a latência:
   - `latScore`: abaixo de `LATENCY_STABLE_MS` vale 1,0; abaixo de `LATENCY_UNSTABLE_MS` vale 0,5; senão 0;
     latência nula vale 1,0;
   - `lossScore`: 0% vale 1,0; abaixo de `LOSS_UNSTABLE_PCT` vale 0,5; senão 0;
   - `Q` a partir de `Q_STABLE_THRESHOLD` é `STABLE`, a partir de `Q_PARTIALLY_UNSTABLE_THRESHOLD` é
     `PARTIALLY_UNSTABLE`, abaixo disso é `UNSTABLE`.

A latência é da amostra corrente; a perda é a do histórico inteiro. Os valores padrão estão em
[[Câmeras - Saúde e monitoramento - Requisitos e SLA]].

### Mudança de estado, incidente e âncora da queda

`maybePublishStatusChange` só age quando o status muda:

- abre ou fecha o incidente de conectividade interno: abre na primeira saída de `STABLE`, mantém o início
  mais antigo na escalada e fecha ao voltar a `STABLE`, anexando `durationMinutes` ao evento de restauração;
- carimba ou limpa `offlineSince` no snapshot de todas as linhas do equipamento: a entrada em `OFFLINE`
  carimba o instante da queda, a saída de `OFFLINE` limpa. Depois de reiniciar o worker (`previousStatus`
  nulo) a entrada em `OFFLINE` só carimba se a coluna estiver vazia e qualquer outro estado limpa, porque o
  worker não sabe o que aconteceu no intervalo. A queda por push grava `offlineSince` só quando o estado
  anterior era conhecido e diferente de `OFFLINE`;
- grava `CONNECTIVITY_CHANGED` (`previousStatus`, `currentStatus`, `causeCode`, latência, perda) pelo seam
  de eventos com `source: 'health'`
  ([[Câmeras - Eventos, incidentes e alarmes - Arquitetura e estratégias]]);
- publica `CameraConnectivityHealthChangedEvent` no EventBus uma vez por linha, com o `previousStatus` que
  aquela linha viveu; linha sem histórico recebe `null`.

`offlineSince` existe para que "offline há N minutos" conte a partir da queda. A rota interna de estado lê
essa coluna como `statusSince` quando a câmera está `OFFLINE`; sem ela, cai para `lastConnectionAt` e depois
para `updatedAt`.

### Snapshot vencido

O `CameraOperationalSnapshot` é "última escrita vence", não série: uma câmera que deixou de ser monitorada
responderia `STABLE` para sempre, porque nada contradiz a última escrita boa. O `CameraHealthService` trata
como vencido o snapshot mais velho que `HEALTH_SNAPSHOT_STALE_AFTER_MS` e devolve `isOnline: false`,
`OFFLINE`, sem `errorCode`, latência nem perda, com o `failureReason` fixo de snapshot vencido. Esse motivo
separa "o worker parou de escrever" de falha relatada pelo equipamento. O prazo é folgado de propósito contra o
canal mais lento, o poll ISAPI de 15 segundos.

### Janela de 5 minutos e resumo diário

A série fina de batidas retém cerca de 24 horas e não sustenta uma consulta de 90 dias. Por isso ela é
reamostrada em janelas de 5 minutos, que viram um resumo diário. A janela é a unidade de medida: dia, barra e
período são composições dela, e um número diário medido à parte divergiria da soma das janelas.

O sampler (`@Cron` a cada 5 minutos) fecha a janela anterior, idempotente por `(cameraId, windowStart)`. Só
roda a réplica que segura a lease fixa `cameras:cron:availability-sampler`, renovada a cada passe, porque a
base do delta de bytes do bitrate vive na memória do processo; um vencedor sorteado a cada passe mediria
bitrate nulo quase sempre. Com o Redis fora, o passe roda assim mesmo. O bitrate é lido uma vez por
equipamento físico (`groupByDeviceStream`, linhas agrupadas pelo `streamUrl`) numa leitura só do
`/v3/paths/list` do MediaMTX para a frota, e repassado às linhas: é o real quando já há espectador com a relay
aberta e o provisionado do perfil quando não há. O provisionado "sem limite" das câmeras VBR (2147483647 kbps)
não é taxa e é descartado por `plausibleBitrateMbps` em toda leitura. `CameraHealthMetricsUpdatedEvent` com
`window` só sai quando a janela mudou em relação à anterior, para o canal ao vivo não virar um poll de 5
minutos. Detalhe da banda em [[Câmeras - Streaming - Banda e bitrate]].

O coletor de banda provisionada relê, no boot e a cada `CAMERA_BITRATE_REFRESH_HOURS`, o bitrate configurado
de cada câmera `OPERATIONAL` ou `TESTING` (ONVIF, com enriquecimento VAPIX ou ISAPI) e grava no
`CameraStreamProfile`. Só fala com o equipamento a réplica que segura a lease dele
(`coordinator.holdsCamera`), em série; equipamento mudo preserva o valor anterior. No mesmo passe, câmera
Axis tem os codecs do encoder relidos por VAPIX e gravados em `Camera.supportedVideoCodecs` só quando a lista
muda ([[Câmeras - Streaming - Codecs]]). Leitura do equipamento em
[[Câmeras - Integração com dispositivo - Arquitetura e estratégias]].

O rollup roda com `@Cron(EVERY_DAY_AT_1AM, { timeZone: 'UTC' })` dentro de
`withTransactionLock('ms-cameras:availability-rollup')`, com um vencedor no cluster. A ordem é
`rollupPreviousDay` (enquanto as janelas existem), depois `cleanupFineWindows`, `cleanupTtffSamples` e
`cleanupDailyRollups`, cada limpeza isolada para a falha de uma não pular a outra. `aggregateDay` conta janelas
por estado e faz `offlineWindows = esperadas - online - degradada`, absorvendo janela `OFFLINE` observada e
lacuna de downtime do serviço. As janelas esperadas contam só a vida da câmera (`expectedWindowsSince`): o dia
inteiro deve 288, o dia do cadastro deve só o trecho depois do cadastro e o dia que terminou antes do cadastro
não gera linha. O upsert é idempotente por `(cameraId, date)`.

Contagens de janelas são a fonte única; horas e porcentagens são sempre derivadas (`windowsToSlice`), então o
resumo nunca guarda número diário que possa divergir. A leitura aplica `clampToLifetime`, para uma linha antiga
gravada com o dia inteiro de padding ler igual a uma escrita hoje. A granularidade das barras vem de
`resolveHealthRange` e a bucketização é por offset de calendário a partir de `periodStart`, então dia sem
resumo vira lacuna sem desalinhar as barras.

### Entrega ao vivo

- **EventBus no processo para o ao vivo, Kafka só para quem é de fora.** Worker e gateway vivem no mesmo
  serviço e o push não precisa de durabilidade. O tópico existe para o `ms-alarms`.
- **Cache antes do broadcast.** O handler de status grava `camera:status:<id>` e só então emite, para o
  assinante que chega atrasado ler o mesmo estado que os demais acabaram de receber. Só esse handler escreve
  o cache. O `subscribe_camera` lê o Redis e, em miss, parse inválido ou Redis fora, cai para
  `GetCameraStatusQuery`. O `analyticsHealth` é sempre recalculado, porque o cache vive mais que a janela de
  frescor do analítico. PTZ e evento não tocam o Redis porque já carregam o payload.
- **Autorização por mensagem.** Mantém o handshake barato e o token fora da URL, onde vazaria para log.
- **Escala horizontal.** `main.ts` monta o `RedisIoAdapter` (`@attlas/core-messaging/socketio`) antes de
  `useWebSocketAdapter`, então `server.to(sala).emit()` alcança sockets de qualquer réplica. Sem `REDIS_HOST`
  cai no adapter em memória; com o Redis configurado e inalcançável, registra ERROR e segue sem broadcast
  entre réplicas. A exceção deliberada é `camera:health:live`, que usa `emitToCameraLocal`
  (`server.local`): assinantes e bases do contador de bytes são por processo, e um emit no cluster entregaria
  N leituras divergentes do mesmo tick.
- **Leitura sob demanda.** `GET /api/cameras/:id/status` usa o mesmo `buildStatusPayload`, para a carga
  inicial de tela e para quem não precisa de push.

### `connectionStatus` e `streamStatus`

São dois sinais desacoplados, e a câmera pode estar `STABLE` com o vídeo travado.

| Sinal | Valores | O que mede | Onde mora |
| --- | --- | --- | --- |
| `connectionStatus` | `STABLE`, `PARTIALLY_UNSTABLE`, `UNSTABLE`, `OFFLINE` | Só o canal de controle até o equipamento | Este domínio |
| `streamStatus` | `OK`, `DEGRADED`, `DOWN`, `INACTIVE` | O path da câmera no MediaMTX, no `IStreamDiagnostics` | [[Câmeras - Streaming]] |

## Armadilhas conhecidas

- **ONVIF mede o long-poll como latência.** O `PullMessages` com `Timeout PT5S` é cronometrado inteiro;
  câmera sem evento responde perto de 5000 ms, cai em `PARTIALLY_UNSTABLE` e deixa janelas Degradadas. Afeta
  todo fabricante fora de Axis e Hikvision.
- **Hikvision e ONVIF nunca chegam a `UNSTABLE`.** Só o ping da Axis empurra falha na janela; os outros canais
  só emitem sucesso. Hikvision, sem latência, só alterna entre `STABLE` e `OFFLINE`.
- **A faixa de perda baixa (0,5) é inalcançável** com `PING_WINDOW_SIZE` igual a 10: um ping perdido já é
  10%, que não é menor que 10.
- **Ping perdido entra no histórico como `isOnline: true`.** O worker grava a falha como `errorCode`, não como
  offline; a janela de 5 minutos só fica Degradada por latência, e a tabela de Conexão Intermitente do
  dashboard (`dropsPerDayFromHeartbeats`, que conta a passagem de `true` para `false`) tende a zero.
- **Um ping perdido gera três eventos** (offline, instável, recuperada), porque a histerese marca `OFFLINE`
  enquanto o ping falho estiver entre os dois últimos.
- **Duas réguas de latência.** O estado usa 100 e 300 ms; a tabela de latência do dashboard usa 80, 130 e
  180 ms (`apps/ms-cameras/src/dashboard/connectivity-tables/latency/latency-severity.ts`).
- **O cartão "Degradação de Stream" do dashboard conta conexão**, não vídeo.
- **`subscribe_camera` não confere filiação ao sistema**, só o JWT: qualquer usuário autenticado entra na sala
  de qualquer câmera. As salas de videowall, incidentes e dashboard conferem.
- **Socket sem token fica ligado ao namespace**, porque o guard só valida mensagens.
- **As rotas de `/api/cameras/health` e a de métricas do período não conferem filiação ao sistema.** Elas
  escopam pelo header `System-Id` com `@SystemId()`, que só lê o header; quem confere filiação é o
  `@RequireSystemDuty()`, ausente nos dois controllers de `apps/ms-cameras/src/health/`.

As quatro primeiras pedem decisão do comportamento desejado antes de corrigir o código ou as réguas.

> [!warning] Texto da tela diverge do sampler
> `cameras.health.metrics.bitrate_sampling_note` diz que o bitrate é medido de forma contínua mesmo sem
> ninguém assistindo; o sampler só mede com espectador e, sem ele, grava o bitrate configurado.

> [!warning] Comentário defasado no worker
> O docblock de `safeAppendEvent` em `camera-health.worker.ts` diz que `source: 'health'` fica fora do
> `event-logged`. Quem decide é o seam, que publica o evento de saúde com par correlacionável.

## Glossário

| Termo | O que é |
| --- | --- |
| Lease | Chave Redis com dono e TTL; quem a segura é a única réplica que faz aquele trabalho |
| Fan-out | Uma conexão por equipamento físico escrevendo o mesmo resultado em cada linha `Camera` desse equipamento |
| Linha | Um registro `Camera`; o mesmo equipamento tem uma linha por sistema que o cadastrou |
| Batida | Prova de vida do canal de controle: pong, `PullMessages` bem-sucedido ou evento e keep-alive |
| Nota Q | Média ponderada da latência (peso 1) e da perda (peso 3) que decide o estado |
| Histerese | Regra que só tira a câmera de `OFFLINE` depois de duas amostras seguidas respondidas |
| Snapshot | A linha `CameraOperationalSnapshot`, estado corrente de uma câmera |
| Janela | Intervalo de 5 minutos classificado como Online, Degradada ou Offline |
| Resumo diário | `CameraAvailabilityDailyRollup`, contagem das janelas de um dia |
| Reachability | Fração de janelas Online ou Degradadas; é o card Uptime da tela |
| Long-poll | Pedido que o servidor segura aberto até ter evento ou estourar o prazo |
| TTFF | Tempo até o primeiro quadro de vídeo ao abrir o stream |
| EventBus | Barramento de eventos do CQRS do NestJS, dentro do processo |
