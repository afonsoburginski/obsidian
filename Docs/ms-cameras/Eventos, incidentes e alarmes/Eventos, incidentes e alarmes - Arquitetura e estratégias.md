---
tags:
  - doc
  - ms-cameras
  - cameras
  - eventos
atualizado: 2026-08-24
---

# Eventos, incidentes e alarmes - Arquitetura e estratégias

> Submódulo do [[ms-cameras]]. Índice: [[Eventos, incidentes e alarmes]]. Visual: [[07 - MOD-007 camera-events.excalidraw|diagrama]].

Como o pipeline é construído: o seam de registro, as duas fontes de evento, a leitura cross-camera (tela de Eventos), observações + report manual, e as estratégias de processamento (correlação, alarme) com suas garantias de concorrência e idempotência.

> [!warning] Divergência corrigida (24/08) - domínio virou pasta top-level
> Em 11/07 (`5883879f1d`, SOFTWARE-2006) o código saiu de `apps/ms-cameras/src/cameras/` para um domínio próprio em **`apps/ms-cameras/src/events/`**, com subpastas por responsabilidade: `recording/` (seam + ingest), `publishing/`, `reading/` (queries de leitura), `realtime/` (bridge WS), `consumers/` (correlação + alarme), `incidents/` (leitura de incidentes) e `observations/` (UC-044, novo). Todos os caminhos abaixo foram atualizados; a nota anterior (03/07) ainda apontava para `cameras/handlers/*`.

## 1. Seam central - `RecordCameraEventService`

`events/recording/record-camera-event.service.ts` é o **único ponto de registro** de evento (MOD-010/PROJ-010), implementando a porta `ICameraEventRecorder` (`events/recording/camera-event-recorder.interface.ts`). Centraliza cinco responsabilidades numa transação de leitura-escrita:

- **Validação de escopo**: `camera.findUnique({ id, deletedAt: null })`; ausente → `ResourceNotFoundException('Camera', id)`. Só corre para `source: 'ingest'` (ver seção 2).
- **Timestamp ISO com offset obrigatório**: `parseOccurredAt` exige ISO-8601 com `Z` ou offset explícito (regex `ISO_8601_WITH_OFFSET`); local-time é rejeitado com `InvalidInputException` (`INVALID_TIMEZONE`) para nunca vazar o TZ do servidor na coluna `Timestamptz`. Ausente → default do banco (`now()`).
- **Dedup por `correlationId`**: quando o produtor informa `correlationId`, `repository.findByCorrelationId(cameraId, correlationId)` retorna a linha já gravada (redelivery). Fica uma janela de corrida entre duas primeiras entregas concorrentes - fechá-la exige índice parcial único em `(cameraId, correlationId)` (**follow-up, não implementado**). Só corre para `source: 'ingest'`.
- **Classificação**: `deriveCameraEventCategory(eventType, payload)` deriva a `CameraEventCategory` em read-time; `severity` default `INFO`.
- **Broadcast + publish**: `eventBus.publish(CameraEventLogCreatedEvent)` (WebSocket, mesmo canal para as duas fontes) e, só para `source: 'ingest'`, `void publisher.publishEventLogged(entry)` - publish em `event-logged` é **best-effort e não bloqueia** o registro.

## 2. MOD-010 - um único seam para as duas fontes de evento

> [!success] Divergência corrigida (24/08) - health worker não tem mais caminho próprio
> A nota de 03/07 descrevia dois caminhos de código **separados**: o worker de saúde gravando direto via `CameraHealthEventLogRepository.append`/`safeAppendEvent`, e o ingest passando pelo seam. Isso não existe mais. Desde a promoção a domínio (11/07, mesmo commit da seção 1), o worker de saúde (`src/health/workers/camera-health.worker.ts`) injeta o mesmo `ICameraEventRecorderToken` e chama `recorder.record(message, { source: 'health' })`. **O resultado observável é o mesmo** que a nota antiga descrevia (eventos de saúde não alimentam `event-logged`), mas o mecanismo é outro: uma linha (`RecordCameraEventService.record`) com um `if (isIngest)` gating os efeitos que divergem entre as duas origens, não dois métodos/repos diferentes.

`CameraEventSource = 'ingest' | 'health'` (`RecordCameraEventOptions.source`, default `ingest`):

| Efeito | `source: 'ingest'` | `source: 'health'` |
| --- | --- | --- |
| Revalida a câmera (`findUnique`) | Sim | Não (worker só monitora câmera que já existe - MOD-010 seção 8 veta I/O extra no hot path) |
| Valida timezone de `occurredAt` | Sim | Não |
| Dedup por `correlationId` | Sim | Não (health nunca envia `correlationId`) |
| Persiste + broadcast WebSocket | Sim | Sim |
| Publica `event-logged` (Kafka) | Sim | **Não** |

O worker de saúde emite `HEALTH_ONLINE`/`HEALTH_OFFLINE`/`HEALTH_EVENT`/`CONNECTIVITY_CHANGED` com `causeCode` VAPIX (`VapixCauseMap`: NetworkLost, PowerFailed, Tampering, PTZError, HardwareFailure) - ver [[Saúde e monitoramento]] e [[PTZ e presets]]. Consequência que persiste desde a nota anterior: transições internas alimentam os endpoints de leitura e a UI ao vivo, mas **não** o pipeline Kafka de correlação/alarme - dirigido hoje pelos eventos ingeridos externamente (`source: 'ingest'`).

## 3. Ingest Kafka (UC-019)

`events/recording/camera-event-ingest.listener.ts` consome `attlas.cameras.event-ingest` (dispositivos, no-breaks, outros serviços - **sem produtor no repo**). Defesas anti-crash:

- **Validação mínima**: sem `cameraId`/`eventType` → `warn` + drop.
- **Cap de payload**: `MAX_PAYLOAD_BYTES = 4 KiB` (V9) - evita `payload` JSONB crescer sem limite; acima disso, drop. Payload circular/não-serializável também dropado.
- **Sem poison-pill**: `ResourceNotFoundException` (câmera desconhecida) e `InvalidInputException` → `warn` + drop; qualquer outro erro → `error` + return (**não relança**), então o consumidor nunca entra em loop. DLQ é follow-up.

> Contraste com os listeners de correlação/alarme (seção 5/seção 6): esses **relançam** erros não-swallowable para o Kafka reentregar. O ingest, não - prioriza não travar a ingestão.

## 4. Leitura cross-camera - tela de Eventos (UC-032/040/041/042)

Camada nova (não existia em 03/07): a tela de Eventos (`/cameras/events`) não lê por câmera, lê a **rede inteira** do tenant. Quatro handlers em `events/reading/`, todos tenant-scoped por `systemId` e compartilhando o mesmo `where` via `buildCameraEventsWhere` (`events/reading/camera-events-where.builder.ts`):

- **`list-camera-events/` (UC-032)** - `GET /cameras/events`. Filtros: `search` (summary/translationKey), `severity`/`category` (CSV), `period` (`7d`/`30d`/`90d`/`all`/`range`), `area`/`subarea` (nome resolvido a `trafficElementId` via topologia do ms-traffic-model, num único walk em lote - nunca por linha), `origin` (`MANUAL` = `operatorId` presente, `SYSTEM` = ausente), `state` (status de conexão da câmera) e `status` (`OPEN` = sem incidente vinculado, ou o status do incidente mais recente). `sortBy` aceita só `detectedAt`/`severity`; outro valor cai no default. Cada item ganha `eventCode` (`deriveCameraEventCode`), `triggerCount` (tamanho do grupo de correlação, uma única query agrupada) e `area`/`subarea`/`origin`/`status` derivados.
- **`get-cross-camera-event-detail/` (UC-032)** - `GET /cameras/events/:eventId`. Resolve só por `eventId` (deep-link/F5), mesmas derivações da lista + `triggeredActions` (ver seção 7) e `linkedIncident {id, status}`.
- **`get-camera-events-stats/` (UC-040)** - `GET /cameras/events/stats`. 4 tiles (total/crítico/aviso/info) agregados por severidade sobre o mesmo universo da lista (`buildCameraEventsWhere` reaproveitado); comparação **fixa** aos últimos `COMPARISON_WINDOW_DAYS` dias contra o período imediatamente anterior, independente do filtro de período escolhido - por isso o filtro pode não influenciar o `trendPct`.
- **`get-camera-event-timeline/` (UC-041)** - `GET /cameras/events/:eventId/timeline`. Ver seção 7.
- **`get-camera-event-recurrence/` (UC-042)** - `GET /cameras/events/:eventId/recurrence`. Ver seção 7.

> [!warning] Divergência corrigida (24/08) - o detalhe por câmera (UC-018) foi retrofitado com a mesma riqueza
> `GetCameraEventDetailHandler` (`GET /cameras/:id/events/:eventId`, UC-018) não é mais o payload simples que a nota de 03/07 descrevia. Desde 23-24/07 (`c244624428`, `3df2b66cb2`, SOFTWARE-2007) ele reusa os mesmos helpers `_shared` do detalhe cross-camera (`deriveCameraEventCode`, `resolveTopologyName`, `buildTriggeredActions`, `deriveCameraEventStatus`/`Origin`) e devolve `area`/`subarea`, `eventCode`, `connectionStatus`, `origin`, `status`, `durationSeconds` e `triggeredActions` além de `linkedIncident`. As duas rotas de detalhe (por câmera e cross-camera) concordam no formato hoje.

> [!warning] Comentário do código está errado - divergência a corrigir no repo, não na nota
> `list-camera-events.dto.ts` traz o comentário "Accepted for forward-compat with the UF-009 filter panel; not yet enforced (UC-032 §6)" sobre `area`. É **falso hoje**: `list-camera-events.handler.ts` resolve `topologyNodeIds` via `topologyNodeIdsForFilter` sempre que `area`/`subarea` vem preenchido, e `buildCameraEventsWhere` aplica esse filtro no `camera.is.trafficElementId`. O filtro está implementado e testado (`list-camera-events.handler.spec.ts` cobre `topology outage`); só o comentário ficou parado de um commit anterior. Achado de leitura de código - não é uma correção que esta sessão fez no repo (fora de escopo aqui).

## 5. Correlação em incidentes (UC-021)

`events/consumers/correlate-events/`. Consome `event-logged`; para cada evento válido chama `CorrelateEventsService.correlate`.

- **Elegibilidade** (`correlation-rules.ts`): só pares `(eventType, causeCode)` na lista `CORRELATABLE` são correlacionáveis - `HEALTH_EVENT:{VAPIX_POWER_FAILED,VAPIX_TAMPERING}`, `HEALTH_OFFLINE:{VAPIX_NETWORK_LOST,PROBE_TIMEOUT,PROBE_REFUSED,PROBE_UNREACHABLE,PUSH_DISCONNECT}`, `CONNECTIVITY_CHANGED:{VAPIX_NETWORK_LOST,VAPIX_TAMPERING,PUSH_DISCONNECT}`. `HEALTH_ONLINE` **nunca** abre cluster - recuperação é tratada pelo housekeeping. (Correção 24/08: a lista cresceu desde 03/07 - a nota antiga só citava 4 pares; hoje são 10, incluindo tampering e push-disconnect em `CONNECTIVITY_CHANGED` e `HEALTH_EVENT`, do commit `a4a0f32696` de 22/07.)
- **Chave**: `correlationKey = eventType:causeCode` (`__NULL__` sentinel quando sem causa).
- **Janelas** (`CorrelationConfig` em `events/events.constants.ts`): `WINDOW_SECONDS = 60` (ativa) e `EXTENSION_WINDOW_SECONDS = 120`. `findOpenIncidentByKey` casa incidente não-resolvido `TENTATIVE`/`DETECTED` com `detectedAt ≥ windowStart` **OU** `updatedAt ≥ extensionWindowStart`.
- **Anexar vs criar**:
  - Incidente aberto encontrado → `attachEvent` (transação: cria ligação idempotente → recomputa contagens → promove).
  - Nenhum aberto → cria `TENTATIVE` **sem publicar** (anti-ruído, UC-021 seção 6).
- **Promoção `TENTATIVE` → `DETECTED`**: ao cruzar `CLUSTER_CAMERAS_THRESHOLD = 2` distintas **ou** `CLUSTER_EVENTS_THRESHOLD = 3` eventos. A promoção usa `updateMany({ where: { id, status: 'TENTATIVE' } })` condicional - só a transação vencedora vê `count === 1`, fechando a corrida entre dois attaches. Só na promoção publica `incident-created` **e** invalida o dashboard (`DashboardInvalidationPublisher.invalidateForCamera(..., INCIDENTS)` - novo desde 25/07, SOFTWARE-2326).
- **Housekeeping** (`@Cron` a cada minuto): roda sob `pg_try_advisory_xact_lock(hashtext('camera-incident-housekeeping'))` numa transação, então **apenas uma réplica** varre por tick (o lock libera no COMMIT/ROLLBACK). Três operações: `autoCloseExpiredDetected` (`DETECTED` sem novos eventos por 30 min → `RESOLVED`), `dropExpiredTentative` (`TENTATIVE` órfão por 120 s → `DROPPED`), `autoResolveByRecovery` (BR-CAM-CORR-005: ≥ 80% das câmeras afetadas reportando `HEALTH_ONLINE` após `detectedAt` → `RESOLVED`).
- **`DROP_TENTATIVE_WINDOW_SECONDS = 120 ≥ EXTENSION_WINDOW_SECONDS`**: garante que o housekeeping não descarte um `TENTATIVE` enquanto a janela de extensão ainda aceita novos attaches.

### Estados do incidente (internos)

`TENTATIVE` → `DETECTED` → `RESOLVED`; `DROPPED` para tentativos expirados. `INVESTIGATING` existe no enum e é status **visível** (aparece em `VISIBLE_STATUSES`/`STATUS_VALUES` dos handlers de leitura), mas **nenhum caminho de código transiciona para ele** ainda - segue igual à nota de 03/07. Desde UC-044 (seção 7), incidentes manuais também nascem `DETECTED` (não `TENTATIVE`), então o total de vias para `DETECTED` cresceu: promoção por correlação **ou** report manual. Ver mapeamento ao ciclo do edital em [[Eventos, incidentes e alarmes - Requisitos e SLA]].

## 6. Emissão de alarme (UC-022)

`events/consumers/emit-alarm/`. Dois `@EventPattern` no mesmo listener:

- **Branch A - `incident-created` → `emitFromIncident`**: cluster correlacionado. Guarda contra `affectedCameraIds` vazio. `mapToAlarm({ causeCode, fromCluster: true })`. Divergência entre severidade do mapping e a do incidente gera `warn` mas o **mapping vence** (fonte canônica).
- **Branch B - `event-logged` → `emitFromEvent`**: evento crítico isolado. `isAlarmableEvent(causeCode, severity)`: `severity === 'ERROR'` sempre emite; `VAPIX_TAMPERING` sempre; senão não. **Dedup**: se o evento já está ligado a um incidente (`findIncidentByEventLogId`), pula - o alarme do cluster (Branch A) cobre. `mapToAlarm({ ..., fromCluster: false })`.
- **Mapa causa → alarme** (`alarm-mapping.ts`): `POWER_FAILED`/`HW_FAILURE` → `SYSTEM_FUNCTIONING`/`CRITICAL`; `TAMPERING` → `ROAD_SAFETY`/`HIGH`; `PTZ_ERROR` → `SYSTEM_FUNCTIONING`/`MEDIUM`; `NETWORK_LOST`/`PROBE_*` → `SYSTEM_FUNCTIONING`, `MEDIUM` isolado ou `HIGH` em cluster; `PUSH_DISCONNECT`/`UNKNOWN` → `null` (não-alarmável).
- **`alarmId` replay-safe**: `deriveAlarmId(sourceType, sourceId)` (`@attlas/core-common`) - UUID v5 com namespace fixo. `EVENT:<eventLogId>` e `INCIDENT:<incidentId>` produzem sempre o mesmo id; replays Kafka e retries geram o mesmo `alarmId`, e o futuro `ms-alarms` dedupa por PK (`INSERT ... ON CONFLICT DO NOTHING`). Reconciliação cross-branch (mesmo cluster visto como EVENT e INCIDENT) é responsabilidade do consumidor.
- **Particionamento** (`publishAlarmRaised`): key = `sourceId` para `INCIDENT` (ordena por incidente) ou `affectedEntities[0].entityId` (câmera) para `EVENT`.
- Report manual (UC-044, seção 7) **não** passa por aqui: `createReportedIncident` não publica `incident-created`, então um incidente reportado manualmente nunca emite alarme automático hoje.

## 7. Observações e report de ocorrência (UC-044) - novo desde 20/07

Não existia na nota de 03/07. Modelo novo `CameraEventObservation` (migration `20260720164304_add_camera_event_observation`) + dois casos de uso em `events/observations/`.

- **Modelo**: `id`, `eventLogId` (FK `CameraEventLog`, cascade), `parentObservationId` (nullable, self-relation `CameraEventObservationReplies`), `authorId`/`authorName` (JWT, capturados na escrita para não depender de lookup cross-service), `text` (`VarChar(280)`), `createdAt`. Índices `(eventLogId, createdAt asc)` e `(parentObservationId)`.
- **Thread com no máximo 2 níveis**: `CreateCameraEventObservationHandler` rejeita reply-de-reply (`parent.parentObservationId !== null` → `InvalidInputException PARENT_IS_REPLY`) porque a leitura (`ListCameraEventObservationsHandler`) só busca top-level + `replies` de 1 nível; um 3º nível persistiria mas nunca voltaria na leitura. `GET /cameras/events/:eventId/observations` retorna cada observação top-level com `replies[]` em ordem cronológica; `author` é `authorName ?? authorId ?? ''`.
- **`POST /cameras/events/:eventId/report` ("Reportar ocorrência", UF-019) - condicional na prioridade, não no botão**: abre incidente manual via `createReportedIncident` (`status: 'DETECTED'` desde o início - humano confirmou, não é a `TENTATIVE` da correlação -, `correlationKey: null`, vinculado ao evento gatilho). A prioridade **não** vem do body: é derivada da `severity` do evento (`deriveIncidentPriority`, `_shared/derive-incident-priority.ts`) - `ERROR→HIGH`, `WARN→MEDIUM`, `INFO→LOW`, qualquer outro valor cai em `MEDIUM` com `warn` (é a condicional de BR-CAM-EVT-044-03). `name`/`description` do body (`ReportCameraEventOccurrenceDto`, máx 200/2000 chars) tornam-se `title`/`description` do incidente.

> [!warning] Achado de leitura de código - sem guarda contra report duplicado
> `createReportedIncident` sempre faz `INSERT`; não há checagem de "este evento já tem incidente vinculado" antes de criar outro. O botão "Reportar ocorrência" no frontend (`camera-event-detail.page.html`) também não é condicionado a `linkedIncident` - fica sempre visível e clicável. Dois cliques (ou um F5 seguido de novo clique) no mesmo evento abrem **dois** `CameraIncident` distintos ligados ao mesmo `eventLogId`. Não é um bug corrigido nesta sessão (fora de escopo - só leitura); registrado para quem tocar UC-044 a seguir.

- **`triggeredActions`** ("Ações disparadas", BR-CAM-EVT-041-04, exposto no detalhe cross-camera e na timeline): só emite `{ type: 'INCIDENT', code }` por link em `CameraIncidentEvent` - `ALARM` não é persistido e `SERVICE_ORDER` não tem módulo ainda (só a coluna `workOrderId`), os dois ficam para depois (`build-triggered-actions.ts`).
- **Timeline do evento (UC-041, `GET /cameras/events/:eventId/timeline`)**: é a **cadeia do incidente**, não um histórico genérico - busca todo `CameraEventLog` ligado ao(s) incidente(s) do evento-âncora via `CameraIncidentEvent` (o mesmo vínculo que a correlação popula), possivelmente cross-camera (RF-EVT-02: falha de energia → N câmeras caindo). Evento sem incidente cai no **fallback de contexto**: mesma câmera, janela de ±30 min (`CONTEXT_WINDOW_MS`), cap de 50 linhas (`CONTEXT_MAX_EVENTS`) - sem isso, um evento de rotina sempre renderizaria uma timeline de 1 item. `correlationId` (o de dedup do ingest) nunca é chave da cadeia.
- **Recorrência (UC-042, `GET /cameras/events/:eventId/recurrence`)**: série bucketizada de 2 contagens (`total` e `categoryCount`, mesma categoria do evento-âncora) sobre a **câmera de origem apenas** (não cross-camera), numa janela que termina no `occurredAt` do âncora - não em "agora". Presets fixos: `1h` (60 buckets/minuto), `24h` (24/hora), `7d`/`30d` (dias); default `24h`.

## 8. Idempotência - camadas

| Camada | Mecanismo | Garantia |
| --- | --- | --- |
| Registro (ingest) | `findByCorrelationId(cameraId, correlationId)` | Best-effort; corrida na 1ª entrega concorrente aberta (índice parcial `(cameraId, correlationId)` é follow-up) |
| Correlação | fail-fast `eventAlreadyLinked` + `@@unique([incidentId, eventLogId])` | Forte no anexo; corrida de **criação** de 2 incidentes na mesma `correlationKey` aberta (partial UNIQUE `WHERE resolvedAt IS NULL` é follow-up) |
| Alarme | `deriveAlarmId` determinístico + dedup por PK no `ms-alarms` | Forte ponta-a-ponta |
| Observação (reply) | `parentObservationId` deve apontar pra top-level (`InvalidInputException` senão) | Forte - impede thread de 3 níveis |
| Report manual (UC-044) | **nenhum** | Ausente - ver callout na seção 7 |

## 9. Decisões e trade-offs

- **Categoria derivada, não persistida**: `CameraEventLog` não tem coluna `category`; `deriveCameraEventCategory` mapeia `(eventType, causeCode)` em read-time. Filtrar por categoria vira predicado Prisma (`buildCategoryWhere`). O clause `OPERATIONAL` é NULL-safe: não usa `NOT(OR(positivos))` porque `payload->'causeCode'` ausente é SQL `NULL` e descartaria a linha; trata o caso "sem causeCode" explicitamente.
- **`ANALYTICS` sem produtor**: categoria existe no enum mas nenhum evento a produz ainda (analítica de vídeo é tarefa futura, RF-EVT-03 parcial). `positiveCategoryClause(ANALYTICS)` retorna `eventType: { in: [] }` (nunca casa).
- **Fallback pt-BR persistido**: `title`/`description` de incidente e chaves i18n (`buildIncidentTitleFallback`) são texto estável para consumidores sem i18n; o frontend prefere `translationKey`.
- **`type`/severidade derivados de `correlationKey`**: não há coluna dedicada; o filtro por `type` (UC-023) vira `endsWith(':<causeCode>')` sobre `correlationKey` (`incidents/incident-mapping.ts`). Incidentes manuais (UC-044) têm `correlationKey: null`, então não carregam `type` derivado dessa via - a UI de detalhe recebe `causeCode: null` e cai no fallback `UNKNOWN`.
- **`area`/`subarea` resolvidos por topologia, não persistidos no evento**: a leitura cross-camera (seção 4) busca a topologia do tenant (ms-traffic-model, via bearer forwarded) uma vez por request e resolve `trafficElementId → {area, subarea}` em memória; uma indisponibilidade do ms-traffic-model degrada os rótulos para string vazia sem falhar a rota.
- **Publishes best-effort**: falha de broker nunca quebra o caller - registro/correlação já persistiram.

## Relacionados

[[Saúde e monitoramento]] · [[PTZ e presets]] · [[Status em tempo real]] · [[Streaming]]
