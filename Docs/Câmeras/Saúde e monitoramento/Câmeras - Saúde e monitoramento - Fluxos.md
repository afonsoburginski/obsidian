---
tags:
  - doc
  - cameras
  - saude
aliases:
  - "Câmeras - Saúde e monitoramento - Fluxos"
  - "Status em tempo real - Fluxos"
  - "Saúde e monitoramento - Fluxos"
atualizado: 2026-10-07
---

# Câmeras - Saúde e monitoramento - Fluxos

Volta para [[Câmeras - Saúde e monitoramento]].

## Resumo

| Fluxo | Gatilho | Resultado |
| --- | --- | --- |
| [[#Reconciliação das leases]] | Boot e a cada 15 s | Cada equipamento monitorado por uma réplica só |
| [[#Batida e avaliação]] | Cada batida do canal de controle | Snapshot atualizado e, se o estado mudou, evento e push |
| [[#Queda da conexão]] | `close` ou `error` do canal | `OFFLINE` na hora e reconexão com backoff |
| [[#Mudança de estado até a tela]] | `CameraConnectivityHealthChangedEvent` | Badge atualizado na tela e transição no Kafka |
| [[#Fechamento da janela de 5 minutos]] | Cron a cada 5 minutos | Uma `CameraAvailabilityWindow` por câmera |
| [[#Resumo diário]] | 01:00 UTC | Uma `CameraAvailabilityDailyRollup` por câmera e podas |
| [[#Consulta de métricas do período]] | `GET /api/cameras/:id/health` | `ICameraHealthMetrics` |
| [[#Leitura do snapshot atual]] | `GET /api/cameras/health` | Snapshot, ou `OFFLINE` quando vencido |
| [[#Assinatura do canal ao vivo]] | `subscribe_camera` | `camera:status:snapshot` e as emissões da sala |
| [[#Contagem e exportação para o relatório]] | Chamada do `ms-reports` | `rows` e `total`, ou páginas do resumo diário |
| [[#Saúde da câmera na tela]] | Operador abre a saúde de uma câmera | SLA, barras, latência e métricas ao vivo |

Mecanismo e motivo de cada peça: [[Câmeras - Saúde e monitoramento - Arquitetura e estratégias]]. Valores:
[[Câmeras - Saúde e monitoramento - Requisitos e SLA]].

## Reconciliação das leases

**Gatilho.** Boot do `ms-cameras` e cada `MONITOR_LEASE_RECONCILE_INTERVAL_MS` (15 s); cadastro novo por REST
chama a mesma lógica para uma câmera (`attachRegisteredCamera`).

**Passos.**

1. O coordenador lê toda câmera viva (`deletedAt = null`), em qualquer estado do ciclo de vida, e as
   credenciais numa leitura só. Câmera sem credencial fica de fora.
2. Escolhe o canal pelo fabricante: Axis usa o VAPIX WebSocket, Hikvision usa o ISAPI alertStream, os demais
   usam ONVIF PullPoint.
3. Agrupa as linhas pela chave do equipamento e disputa `cameras:monitor:lease:<chave>`.
4. Com a lease, liga no worker as linhas novas e desliga as que saíram; sem ela, não monitora o equipamento.
5. Linha que entra num equipamento já monitorado herda o snapshot de outra linha do mesmo equipamento
   (`seedFrom`).

**Resultado.** Cada equipamento tem uma réplica dona e uma conexão; as linhas do mesmo equipamento recebem o
mesmo estado.

**Erros.** Redis fora: o coordenador monitora tudo nesta réplica e registra ERROR, aceitando conexão
duplicada. Falha no passe: registra `Monitor reconcile failed` e tenta no passe seguinte.

## Batida e avaliação

**Gatilho.** Pong do ping (Axis), `PullMessages` bem-sucedido (ONVIF), evento ou keep-alive (Hikvision
alertStream) ou resposta do `GET /ISAPI/System/status` (Hikvision poll).

**Passos.**

1. O worker empilha sucesso ou falha na janela deslizante de 10 amostras do equipamento.
2. Insere uma linha em `CameraHeartbeatHistory` por linha do equipamento e calcula a perda em porcentagem.
3. O evaluator devolve `STABLE`, `PARTIALLY_UNSTABLE`, `UNSTABLE`, `OFFLINE` ou `null` (menos de 3 amostras).
4. Faz upsert do `CameraOperationalSnapshot` de cada linha.
5. Se o estado mudou: abre ou fecha o incidente de conectividade, carimba ou limpa `offlineSince`, grava
   `CONNECTIVITY_CHANGED` pelo seam de eventos e publica `CameraConnectivityHealthChangedEvent` por linha.

**Resultado.** Snapshot corrente gravado; na mudança, o fluxo [[#Mudança de estado até a tela]] começa.

**Erros.** Ping sem pong no `PING_TIMEOUT_MS` conta como falha e grava a causa `PROBE_TIMEOUT`. Falha ao gravar
snapshot, evento ou `offlineSince` é registrada em log e não interrompe o monitoramento.

## Queda da conexão

**Gatilho.** O canal do equipamento dispara `disconnected` ou `error`.

**Passos.**

1. Um flag por conexão absorve o par `error` e `close` da mesma queda.
2. O worker grava o snapshot `OFFLINE` na hora, com `failureReason`, e `offlineSince` quando o estado
   anterior era conhecido e diferente de `OFFLINE`.
3. Grava `HEALTH_OFFLINE` com `PUSH_DISCONNECT`, uma vez por incidente.
4. Publica a mudança para `OFFLINE`.
5. Agenda a reconexão: `min(RECONNECT_BASE_MS * 2^tentativa, RECONNECT_MAX_MS) + jitter`.

**Resultado.** A câmera aparece `OFFLINE` sem esperar o próximo ping, e o worker tenta reconectar até
conseguir.

**Erros.** Toda tentativa que falha agenda a seguinte; não há limite de tentativas.

## Mudança de estado até a tela

**Gatilho.** `CameraConnectivityHealthChangedEvent` no EventBus, uma vez por linha.

**Passos.**

| # | Passo | Onde |
| --- | --- | --- |
| 1 | O worker publica o evento por linha, com o `previousStatus` daquela linha | `apps/ms-cameras/src/health/workers/camera-health.worker.ts` |
| 2 | O handler de status refaz o payload com `GetCameraStatusQuery` | `apps/ms-cameras/src/cameras/realtime/camera-status.events-handler.ts` |
| 3 | Grava `camera:status:<id>` no Redis antes de emitir | idem |
| 4 | Emite `camera:status:update` na sala `camera:<id>` e invalida o dashboard | idem |
| 5 | Em paralelo, o handler Kafka publica em `attlas.cameras.status-changed` se houver estado anterior | `apps/ms-cameras/src/cameras/realtime/camera-status-kafka.handler.ts` |
| 6 | O cliente na sala atualiza o badge | `apps/web-attlas/src/app/modules/cameras/services/camera-live-status.service.ts` |

PTZ (`camera:ptz:position`) e evento novo (`camera:event:new`) seguem o mesmo caminho até a sala, sem query e
sem Redis.

**Resultado.** Toda tela com a câmera aberta, em qualquer réplica, vê o novo estado; o `ms-alarms` recebe a
transição.

**Erros.** Câmera apagada no meio do caminho encerra o handler sem emitir. Primeira avaliação depois do boot
não publica no Kafka (`discarded_no_previous`). Falha de publicação conta `failed` em
`ms_cameras_status_kafka_published_total`.

## Fechamento da janela de 5 minutos

**Gatilho.** `@Cron` a cada 5 minutos, na réplica que segura `cameras:cron:availability-sampler`.

**Passos.**

1. Calcula `[windowStart, windowEnd)` da janela recém-fechada.
2. Lista as câmeras `OPERATIONAL` e `TESTING`.
3. Por linha, consolida as batidas da janela:

   | Situação | Estado da janela |
   | --- | --- |
   | Nenhuma batida | `OFFLINE` |
   | Amostras insuficientes para o evaluator | `ONLINE` se a maioria respondeu, senão `OFFLINE` |
   | Evaluator respondeu | `STABLE` vira `ONLINE`; `PARTIALLY_UNSTABLE` e `UNSTABLE` viram `DEGRADED`; `OFFLINE` segue `OFFLINE` |

4. Por equipamento, numa leitura do MediaMTX para a frota: bitrate real se há espectador, provisionado se não
   há, `null` se todas as linhas do equipamento ficaram `OFFLINE`. Provisionado "sem limite" vira `null`.
5. Grava as leituras reais em `CameraBitrateSample`.
6. Faz `upsertWindow` por linha e publica `CameraHealthMetricsUpdatedEvent` com `window` só para a câmera cuja
   janela mudou (estado, latência ao milissegundo ou bitrate a 0,1 Mbps).

**Resultado.** Uma `CameraAvailabilityWindow` por câmera; telas abertas recebem `camera:health:update` só quando
algo mudou.

**Erros.** Outra réplica com a lease: o passe é pulado. Redis fora: o passe roda assim mesmo. Falha ao listar
câmeras encerra o passe com log; falha numa linha é registrada e as demais seguem.

## Resumo diário

**Gatilho.** `@Cron(EVERY_DAY_AT_1AM, { timeZone: 'UTC' })`, sob `withTransactionLock`.

**Passos.**

1. `rollupPreviousDay`: para cada câmera, calcula as janelas que o dia anterior devia (288, ou só o trecho
   depois do cadastro no dia do cadastro); câmera cadastrada depois do dia não gera linha.
2. Conta as janelas do dia por estado, com `offlineWindows = esperadas - online - degradada`, e faz upsert em
   `CameraAvailabilityDailyRollup`.
3. Poda janelas e amostras de TTFF além de `AVAILABILITY_WINDOW_RETENTION_DAYS`.
4. Poda resumos além de `AVAILABILITY_ROLLUP_RETENTION_DAYS`.

**Resultado.** Um resumo por câmera por dia fechado, e as séries finas dentro da retenção.

**Erros.** Outra réplica com o lock: o passe não roda nesta. Cada limpeza é isolada; a falha de uma é
registrada e não pula as outras.

## Consulta de métricas do período

**Gatilho.** `GET /api/cameras/:id/health?period=7d|30d|90d` ou `?from=&to=`.

**Passos.**

1. O controller confere que a câmera é do sistema do header `System-Id`.
2. O handler responde 404 se a câmera não existe.
3. `resolveHealthRange`: `period` (padrão `7d`) conta N dias de calendário até agora, âncora UTC;
   `from` e `to` montam um intervalo de até 366 dias. Até 14 dias, uma barra por dia; acima,
   `ceil(dias / 6)` dias por barra.
4. Lê os resumos dos dias fechados, agrega as janelas finas para dia fechado ainda sem resumo (faltantes
   contam `OFFLINE`) e soma o dia corrente com as janelas cruas; recorta tudo à vida da câmera.
5. Compõe `ICameraHealthMetrics`: `uptimePercent` (SLA), `reachabilityPercent`, `dailyAvailability`,
   `slaTargetPercent`, `slaDeviationPercent`, `avgBitrateMbps`, `avgLatencyMs`, `ttffMs` e `lastTtffMs`,
   `bitrateLatencyTimeSeries` (um ponto por janela quando o intervalo cabe na retenção fina, um por dia quando
   não cabe), `currentBitrateMbps` (duas leituras do contador de bytes com 400 ms de intervalo, cache de 5 s)
   e `activeSessions` (soma dos `readers` dos paths da câmera no MediaMTX).

**Resultado.** `ICameraHealthMetrics` do período.

**Erros.** Câmera inexistente ou de outro sistema: 404. Intervalo inválido: 400 `InvalidInputException` com
`INCOMPLETE_RANGE` (só um dos dois), `INVALID_RANGE_DATE`, `END_BEFORE_START`, `START_IN_FUTURE` ou
`RANGE_TOO_LARGE` (mais de 366 dias).

## Leitura do snapshot atual

**Gatilho.** `GET /api/cameras/health` ou `GET /api/cameras/health/:cameraId`.

**Passos.**

1. Lê os snapshots das câmeras do sistema do header `System-Id`.
2. Snapshot mais velho que `HEALTH_SNAPSHOT_STALE_AFTER_MS` (2 minutos) sai `OFFLINE`, sem latência nem
   perda, com o motivo de snapshot vencido.
3. Colunas `Decimal` (PTZ, perda) saem como `number`.

**Resultado.** Lista de snapshots, ou um snapshot.

**Erros.** Câmera sem snapshot ou de outro sistema: 404 `ResourceNotFoundException`.

## Assinatura do canal ao vivo

**Gatilho.** O cliente envia `subscribe_camera { cameraId }` no namespace `cameras-status`.

**Passos.**

1. O cliente conecta com path `/api/cameras/status/realtime`, só transporte websocket, com o JWT em
   `handshake.auth.token`, lido de novo a cada reconexão.
2. O `WsAuthGuard` valida o JWT e o gateway valida o UUID.
3. O socket entra na sala `camera:<cameraId>`.
4. O gateway busca o snapshot no Redis e, em miss ou erro, no banco; emite `camera:status:snapshot` só a esse
   socket.
5. A partir daí o socket recebe da sala `camera:status:update`, `camera:ptz:position`, `camera:event:new`,
   `camera:health:update`, `camera:health:live` e `camera:analytics:update`.
6. Para sair, o cliente envia `unsubscribe_camera`.

Não há ack nem replay: quem reconecta assina de novo e recebe novo snapshot. No `web-attlas`, o
`CameraLiveStatusService` abre um socket por câmera, compartilhado por contagem de referência entre todos os
streams daquela câmera (status, PTZ, eventos, saúde, analítico, métricas ao vivo), e fecha quando o último
assinante sai.

**Resultado.** O socket acompanha a câmera ao vivo.

**Erros.** Token ausente ou inválido: `WsException` 4001. `cameraId` inválido: `VALIDATION_FAILED`. Câmera
inexistente: `RESOURCE_NOT_FOUND`. Falha ao montar o snapshot: `INTERNAL_ERROR`.

## Contagem e exportação para o relatório

**Gatilho.** O `ms-reports` gera o relatório de estado das câmeras.

**Passos.**

1. Com o JWT do usuário, chama `GET /api/cameras/availability?from=&to=` (mais os eixos de recorte). O
   `@RequireSystemDuty()` confere que o usuário é membro do sistema.
2. O guarda da janela confere que `from` e `to` são dias civis existentes e em ordem.
3. Com recorte, o `ms-cameras` pede ao `ms-organization` as câmeras dos eixos; recorte que não casa nenhuma
   câmera responde vazio.
4. Responde `rows` (amostra) e `total` do conjunto, com o mesmo predicado que a exportação percorre.
5. Com o token interno e o header de chamador, o `ms-reports` pagina
   `GET /api/internal/cameras/availability/export` com `cursor`, `limit` e `rowBudget`.

**Resultado.** As linhas do resumo diário no formato `ICameraAvailabilityRow`, com `partial` no dia ainda
aberto.

**Erros.** Dia inválido: `AVAILABILITY_RANGE_NOT_CIVIL_DATE`. Fim antes do início:
`AVAILABILITY_RANGE_END_BEFORE_START`. Chamador ausente ou não declarado: `INTERNAL_CALLER_NOT_DECLARED`.
Acima do limite por chamador: 429 `RATE_LIMIT_EXCEEDED`; Redis do limitador fora: `RATE_LIMITER_UNAVAILABLE`. `ms-organization` fora, resposta malformada ou lista
truncada: `ExternalServiceException`.

## Saúde da câmera na tela

**Gatilho.** O operador abre a saúde de uma câmera num destes lugares:

| Lugar | Componente |
| --- | --- |
| Resumo de saúde no painel lateral de presets, montado pelo detalhe da câmera e pelo painel de câmera do painel de operações | `camera-health-summary` dentro de `camera-presets-panel` |
| Painel lateral da lista de câmeras | `cameras-side-detail` |
| Folha lateral aberta pelas abas de conectividade do [[Câmeras - Dashboard]] | `camera-health-panel` |

**Passos.**

1. O operador escolhe `7d`, `30d`, `90d` ou um intervalo.
2. O front chama `GET /api/cameras/:id/health` (`CamerasService.getHealthMetrics`); quando vêm período e
   intervalo, vale o intervalo.
3. Renderiza o SLA (Online% contra a meta, cumprido ou descumprido, desvio), o card Uptime (reachability), as
   barras empilhadas Online, Degradada e Offline e a latência média.
4. `camera:health:update` pede novo `GET`; `camera:health:live` atualiza espectadores e bitrate instantâneo a
   cada 5 segundos.

**Resultado.** A saúde do período e as métricas ao vivo na tela.

**Erros.** Falha da [[#Consulta de métricas do período]] mostra estado de erro só quando ainda não há dado na tela; com dado já desenhado, a tela mantém o último resultado.
