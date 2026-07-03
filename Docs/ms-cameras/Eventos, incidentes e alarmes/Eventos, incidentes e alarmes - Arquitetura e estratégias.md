---
tags: [doc, cameras, ms-cameras, eventos]
---

# Eventos, incidentes e alarmes — Arquitetura e estratégias

> Submódulo do [[ms-cameras - visão geral]]. Índice: [[00 - Eventos, incidentes e alarmes]]. Visual: [[07 - MOD-007 camera-events.excalidraw|diagrama]].

Como o pipeline é construído: o seam de registro, as duas fontes de evento, e as três estratégias de processamento (correlação, alarme) com suas garantias de concorrência e idempotência.

## 1. Seam central — `RecordCameraEventService`

`services/record-camera-event.service.ts` é o **único ponto de registro** de evento vindo do ingest (UC-019). Centraliza cinco responsabilidades numa transação de leitura-escrita:

- **Validação de escopo**: `camera.findUnique({ id, deletedAt: null })`; ausente → `ResourceNotFoundException('Camera', id)`.
- **Timestamp ISO com offset obrigatório**: `parseOccurredAt` exige ISO-8601 com `Z` ou offset explícito (regex `ISO_8601_WITH_OFFSET`); local-time é rejeitado com `InvalidInputException` (`INVALID_TIMEZONE`) para nunca vazar o TZ do servidor na coluna `Timestamptz`. Ausente → default do banco (`now()`).
- **Dedup por `correlationId`**: quando o produtor informa `correlationId`, `repository.findByCorrelationId(cameraId, correlationId)` retorna a linha já gravada (redelivery). Fica uma janela de corrida entre duas primeiras entregas concorrentes — fechá-la exige índice parcial único em `(cameraId, correlationId)` (**follow-up, não implementado**).
- **Classificação**: `deriveCameraEventCategory(eventType, payload)` deriva a `CameraEventCategory` em read-time; `severity` default `INFO`.
- **Broadcast + publish**: `eventBus.publish(CameraEventLogCreatedEvent)` (WebSocket, mesmo canal do worker de saúde) e `void publisher.publishEventLogged(entry)` — publish em `event-logged` é **best-effort e não bloqueia** o registro.

## 2. Auto-geração a partir de transições

Além do ingest, o worker de saúde (`src/health/workers/camera-health.worker.ts`) gera eventos automaticamente a partir de transições de saúde/comunicação/energia/PTZ (RF-EVT-01) — ver [[00 - Saúde e monitoramento]] e [[00 - PTZ e presets]]. Emite `HEALTH_ONLINE`/`HEALTH_OFFLINE`/`HEALTH_EVENT`/`CONNECTIVITY_CHANGED` com `causeCode` VAPIX (`VapixCauseMap`: NetworkLost, PowerFailed, Tampering, PTZError, HardwareFailure) via `safeAppendEvent` → `CameraHealthEventLogRepository.append`.

Esse caminho **persiste + WebSocket, mas não publica em `event-logged`** (não passa pelo seam). Consequência: hoje as transições internas alimentam os endpoints de leitura e a UI ao vivo, mas **não** o pipeline Kafka de correlação/alarme — que é dirigido pelos eventos ingeridos. É uma decisão de wiring a conhecer, não um comportamento documentado como intencional no código.

## 3. Ingest Kafka (UC-019)

`events/camera-event-ingest.listener.ts` consome `attlas.cameras.event-ingest` (dispositivos, no-breaks, outros serviços — **sem produtor no repo**). Defesas anti-crash:

- **Validação mínima**: sem `cameraId`/`eventType` → `warn` + drop.
- **Cap de payload**: `MAX_PAYLOAD_BYTES = 4 KiB` (V9) — evita `payload` JSONB crescer sem limite; acima disso, drop. Payload circular/não-serializável também dropado.
- **Sem poison-pill**: `ResourceNotFoundException` (câmera desconhecida) e `InvalidInputException` → `warn` + drop; qualquer outro erro → `error` + return (**não relança**), então o consumidor nunca entra em loop. DLQ é follow-up.

> Contraste com os listeners de correlação/alarme (§4/§5): esses **relançam** erros não-swallowable para o Kafka reentregar. O ingest, não — prioriza não travar a ingestão.

## 4. Correlação em incidentes (UC-021)

`handlers/correlate-events/`. Consome `event-logged`; para cada evento válido chama `CorrelateEventsService.correlate`.

- **Elegibilidade** (`correlation-rules.ts`): só pares `(eventType, causeCode)` na lista `CORRELATABLE` são correlacionáveis (ex: `HEALTH_OFFLINE:VAPIX_NETWORK_LOST`, `HEALTH_OFFLINE:PROBE_TIMEOUT`, `HEALTH_EVENT:VAPIX_POWER_FAILED`, `CONNECTIVITY_CHANGED:VAPIX_NETWORK_LOST`). `HEALTH_ONLINE` **nunca** abre cluster — recuperação é tratada pelo housekeeping.
- **Chave**: `correlationKey = eventType:causeCode` (`__NULL__` sentinel quando sem causa).
- **Janelas** (`CorrelationConfig`): `WINDOW_SECONDS = 60` (ativa) e `EXTENSION_WINDOW_SECONDS = 120`. `findOpenIncidentByKey` casa incidente não-resolvido `TENTATIVE`/`DETECTED` com `detectedAt ≥ windowStart` **OU** `updatedAt ≥ extensionWindowStart`.
- **Anexar vs criar**:
  - Incidente aberto encontrado → `attachEvent` (transação: cria ligação idempotente → recomputa contagens → promove).
  - Nenhum aberto → cria `TENTATIVE` **sem publicar** (anti-ruído, UC-021 §6).
- **Promoção `TENTATIVE` → `DETECTED`**: ao cruzar `CLUSTER_CAMERAS_THRESHOLD = 2` distintas **ou** `CLUSTER_EVENTS_THRESHOLD = 3` eventos. A promoção usa `updateMany({ where: { id, status: 'TENTATIVE' } })` condicional — só a transação vencedora vê `count === 1`, fechando a corrida entre dois attaches. Só na promoção publica `incident-created`.
- **Housekeeping** (`@Cron` a cada minuto): roda sob `pg_try_advisory_xact_lock(hashtext('camera-incident-housekeeping'))` numa transação, então **apenas uma réplica** varre por tick (o lock libera no COMMIT/ROLLBACK). Três operações: `autoCloseExpiredDetected` (`DETECTED` sem novos eventos por 30 min → `RESOLVED`), `dropExpiredTentative` (`TENTATIVE` órfão por 120 s → `DROPPED`), `autoResolveByRecovery` (BR-CAM-CORR-005: ≥ 80% das câmeras afetadas reportando `HEALTH_ONLINE` após `detectedAt` → `RESOLVED`).
- **`DROP_TENTATIVE_WINDOW_SECONDS = 120 ≥ EXTENSION_WINDOW_SECONDS`**: garante que o housekeeping não descarte um `TENTATIVE` enquanto a janela de extensão ainda aceita novos attaches.

### Estados do incidente (internos)

`TENTATIVE` → `DETECTED` → `RESOLVED`; `DROPPED` para tentativos expirados. `INVESTIGATING` existe no enum e é status **visível**, mas **nenhum caminho de código transiciona para ele** (não há endpoint de mudança de status/atribuição). Ver mapeamento ao ciclo do edital em [[Eventos, incidentes e alarmes - Requisitos e SLA]].

## 5. Emissão de alarme (UC-022)

`handlers/emit-alarm/`. Dois `@EventPattern` no mesmo listener:

- **Branch A — `incident-created` → `emitFromIncident`**: cluster correlacionado. Guarda contra `affectedCameraIds` vazio. `mapToAlarm({ causeCode, fromCluster: true })`. Divergência entre severidade do mapping e a do incidente gera `warn` mas o **mapping vence** (fonte canônica).
- **Branch B — `event-logged` → `emitFromEvent`**: evento crítico isolado. `isAlarmableEvent(causeCode, severity)`: `severity === 'ERROR'` sempre emite; `VAPIX_TAMPERING` sempre; senão não. **Dedup**: se o evento já está ligado a um incidente (`findIncidentByEventLogId`), pula — o alarme do cluster (Branch A) cobre. `mapToAlarm({ ..., fromCluster: false })`.
- **Mapa causa → alarme** (`alarm-mapping.ts`): `POWER_FAILED`/`HW_FAILURE` → `SYSTEM_FUNCTIONING`/`CRITICAL`; `TAMPERING` → `ROAD_SAFETY`/`HIGH`; `PTZ_ERROR` → `SYSTEM_FUNCTIONING`/`MEDIUM`; `NETWORK_LOST`/`PROBE_*` → `SYSTEM_FUNCTIONING`, `MEDIUM` isolado ou `HIGH` em cluster; `PUSH_DISCONNECT`/`UNKNOWN` → `null` (não-alarmável).
- **`alarmId` replay-safe**: `deriveAlarmId(sourceType, sourceId)` (`libs/core-common/src/lib/uuid/alarm-id.ts`) — UUID v5 com namespace fixo. `EVENT:<eventLogId>` e `INCIDENT:<incidentId>` produzem sempre o mesmo id; replays Kafka e retries geram o mesmo `alarmId`, e o futuro `ms-alarms` dedupa por PK (`INSERT ... ON CONFLICT DO NOTHING`). Reconciliação cross-branch (mesmo cluster visto como EVENT e INCIDENT) é responsabilidade do consumidor.
- **Particionamento** (`publishAlarmRaised`): key = `sourceId` para `INCIDENT` (ordena por incidente) ou `affectedEntities[0].entityId` (câmera) para `EVENT`.

## 6. Idempotência — camadas

| Camada | Mecanismo | Garantia |
| --- | --- | --- |
| Registro | `findByCorrelationId(cameraId, correlationId)` | Best-effort; corrida na 1ª entrega concorrente aberta (índice parcial `(cameraId, correlationId)` é follow-up) |
| Correlação | fail-fast `eventAlreadyLinked` + `@@unique([incidentId, eventLogId])` | Forte no anexo; corrida de **criação** de 2 incidentes na mesma `correlationKey` aberta (partial UNIQUE `WHERE resolvedAt IS NULL` é follow-up) |
| Alarme | `deriveAlarmId` determinístico + dedup por PK no `ms-alarms` | Forte ponta-a-ponta |

## 7. Decisões e trade-offs

- **Categoria derivada, não persistida**: `CameraEventLog` não tem coluna `category`; `deriveCameraEventCategory` mapeia `(eventType, causeCode)` em read-time. Filtrar por categoria vira predicado Prisma (`buildCategoryWhere`). O clause `OPERATIONAL` é NULL-safe: não usa `NOT(OR(positivos))` porque `payload->'causeCode'` ausente é SQL `NULL` e descartaria a linha; trata o caso "sem causeCode" explicitamente.
- **`ANALYTICS` sem produtor**: categoria existe no enum mas nenhum evento a produz ainda (analítica de vídeo é tarefa futura, RF-EVT-03 parcial).
- **Fallback pt-BR persistido**: `title`/`description` de incidente e chaves i18n (`buildIncidentTitleFallback`) são texto estável para consumidores sem i18n; o frontend prefere `translationKey`.
- **`type`/severidade derivados de `correlationKey`**: não há coluna dedicada; o filtro por `type` (UC-023) vira `endsWith(':<causeCode>')` sobre `correlationKey` (`incident-mapping.ts`).
- **Publishes best-effort**: falha de broker nunca quebra o caller — registro/correlação já persistiram.
