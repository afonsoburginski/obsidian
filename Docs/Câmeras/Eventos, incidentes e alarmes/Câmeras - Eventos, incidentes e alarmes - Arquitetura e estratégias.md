---
tags:
  - doc
  - cameras
  - eventos
  - ms-cameras
aliases:
  - "Eventos, incidentes e alarmes - Arquitetura e estratégias"
atualizado: 2026-10-07
banner: "alarm alert notification"
---

# Câmeras - Eventos, incidentes e alarmes - Arquitetura e estratégias

Volta para [[Câmeras - Eventos, incidentes e alarmes]].

## Resumo

Todo evento de câmera entra pelo `RecordCameraEventService`, vindo do worker de saúde, da ingestão externa ou
do gravador de incidentes do analítico. Ele grava em `CameraEventLog`, avisa a tela por WebSocket e publica em
`attlas.cameras.event-logged`, de onde a correlação agrupa eventos repetidos em `CameraIncident` e o emissor
publica alarmes em `attlas.alarms.alarm-raised`. A tela lê pelas rotas do `CamerasController`, e o operador
trata o incidente do analítico em `CameraEventTreatment`. O passo a passo está em
[[Câmeras - Eventos, incidentes e alarmes - Fluxos]].

## Onde está no código

Caminhos relativos a `apps/ms-cameras/src/` quando não começam por `apps/` ou `libs/`.

| Caminho | Papel |
| --- | --- |
| `events/events.module.ts` | Montagem do módulo |
| `events/recording/` | Ponto de escrita `RecordCameraEventService` (porta `ICameraEventRecorder`), `CameraEventIngestListener` e o repositório de `CameraEventLog` |
| `events/publishing/camera-events.publisher.ts` | Publica `event-logged`, `incident-created`, `alarm-raised` e os ecos dos comandos de plano |
| `events/_shared/` | Derivações feitas na leitura: categoria, código, origem, status, prioridade, `triggerCount`, área e subárea, ações disparadas |
| `events/reading/` | Log por câmera, log da rede, KPIs, timeline, recorrência e métricas de incidente; `camera-events-where.builder.ts` monta o filtro comum |
| `events/reading/search/` | Busca livre pela frase exibida no idioma da tela (`CameraEventSearchWhereBuilder`) |
| `events/consumers/correlate-events/` | Correlação e limpeza periódica de incidentes; `correlation-rules.ts` guarda os pares correlacionáveis |
| `events/consumers/emit-alarm/` | Emissor de alarme; `alarm-mapping.ts` decide categoria e severidade |
| `events/consumers/execution-plans-ptz-command/`, `execution-plans-videowall-command/` | Comandos de plano de resposta para PTZ ([[Câmeras - PTZ e presets]]) e videowall ([[Câmeras - VMS]]) |
| `events/incidents/` | Leitura de `CameraIncident`, `incident-mapping.ts` e a exportação XLS e PDF em `incidents/export/` |
| `events/observations/` | Observações e report de ocorrência |
| `events/treatment/` | Tratamento do incidente do analítico, unitário e em lote |
| `events/realtime/` | `camera:event:new`, invalidação do dashboard e a sala `incidents:<systemId>` |
| `events/events.constants.ts` | `CorrelationConfig`, `AlarmEmitConfig`, `CameraEventLogConfig`, `CameraEventPeriodConfig`, `CameraEventTimelineConfig`, `CameraEventRecurrenceConfig` |
| `incident-criticality/` | Criticidade configurável por tipo de incidente do analítico |
| `analytics-realtime/` | `AnalyticsIncidentRecorder`, terceira origem de evento ([[Analítico - Arquitetura e estratégias]]) |
| `analytic-incident-media/` | Imagem e vídeo do incidente do analítico ([[Analítico - Arquitetura e estratégias]]) |
| `shared/kafka/cameras-dlq.publisher.ts` | Fila-morta `attlas.dlq.cameras` do serviço; nem a ingestão nem a correlação a usam |
| `libs/contracts/src/lib/camera/` | Tópicos, payloads, `CameraEventValidation`, `CameraEventReportValidation`, `CAMERA_EVENT_DESCRIPTION_VARIANTS`, `DEFAULT_INCIDENT_CRITICALITY` |
| `apps/web-attlas/src/app/modules/cameras-events/` | Tela de Eventos; `camera-event-treatment.module.ts` é reusado pela fila de incidentes do analítico |

## Contratos

### Rotas

Prefixo `/api`. Todas ficam no `CamerasController` (`cameras/cameras.controller.ts`), com `@RequireSystemDuty()`
na classe e escopo pelo `System-Id`, exceto a criticidade, que tem controller próprio.

| Método | Rota | Retorno | Permissão | Spec |
| --- | --- | --- | --- | --- |
| `GET` | `/cameras/:id/events` | Página de eventos da câmera, com filtros e busca | pertencimento | UC-017 |
| `GET` | `/cameras/:id/events/:eventId` | Detalhe por câmera, com `connectionStatus` | pertencimento | UC-018 |
| `GET` | `/cameras/events` | Página da rede; com `category=ANALYTICS`, também os agregados da fila | pertencimento | UC-032, UC-063 |
| `GET` | `/cameras/events/stats` | Quatro tiles por severidade e comparação fixa de 30 dias | pertencimento | UC-040 |
| `GET` | `/cameras/events/export?format=xls\|pdf` | Arquivo da fila com os filtros da lista | pertencimento | UC-080 |
| `GET` | `/cameras/events/:eventId` | Detalhe da rede, usado no link direto | pertencimento | UC-032 |
| `GET` | `/cameras/events/:eventId/observations` | Thread de observações | pertencimento | UC-044 |
| `POST` | `/cameras/events/:eventId/observations` | Cria observação ou resposta | `analytics.incidents:treat` | UC-044 |
| `POST` | `/cameras/events/:eventId/report` | Abre incidente manual | `analytics.incidents:treat` | UC-044 |
| `PATCH` | `/cameras/events/:eventId/treatment-status` | Transição de tratamento | `analytics.incidents:treat` | UC-062 |
| `PATCH` | `/cameras/events/treatment-status` | Transição em lote, até 100 eventos | `analytics.incidents:treat` | UC-074 |
| `GET` | `/cameras/events/:eventId/recurrence` | Série de recorrência por intervalos | pertencimento | UC-042 |
| `GET` | `/cameras/events/:eventId/timeline` | Cadeia do incidente ou contexto da câmera | pertencimento | UC-041 |
| `GET` | `/cameras/incidents` | Página de incidentes, sem tela consumidora | pertencimento | UC-023 |
| `GET` | `/cameras/incidents/metrics` | Agregado da fila do analítico | pertencimento | UC-063 |
| `GET` | `/cameras/incidents/:id` | Detalhe e timeline do incidente, sem tela consumidora | pertencimento | UC-024 |
| `GET` | `/cameras/analytics/incident-criticality` | Tabela de criticidade do sistema | pertencimento | UC-227 |
| `PUT` | `/cameras/analytics/incident-criticality` | Substitui a tabela inteira | `analytics.instances:manage` | UC-227 |

Os segmentos literais (`incidents`, `events`, `bulk-template`, `manufacturers`) são declarados antes de
`@Get(':id')`. Dentro de cada grupo, `events/stats`, `events/export` e `events/treatment-status` vêm antes de
`events/:eventId`, e `incidents/metrics` vem antes de `incidents/:id`. Fora dessa ordem, o `ParseUUIDPipe` da
rota com parâmetro captura o literal e responde 400.

### Tópicos Kafka

Constantes em `libs/contracts/src/lib/camera/cameras-topics.constant.ts`,
`libs/contracts/src/lib/alarm/alarms-topics.constant.ts` e
`libs/contracts/src/lib/execution-plans/execution-plans-topics.constant.ts`.

| Direção | Tópico | Quem | Payload |
| --- | --- | --- | --- |
| Consome | `attlas.cameras.event-ingest` | `CameraEventIngestListener`; não há produtor no repositório | `ICameraEventIngestMessage` |
| Consome | `attlas.cameras.event-logged` | Correlação e emissor de alarme | `ICameraEventLogEntry` |
| Consome | `attlas.cameras.incident-created` | Emissor de alarme, ramo do incidente | `ICameraIncidentCreatedEvent` |
| Consome | `attlas.execution-plans.ptz-command` | Comando de PTZ de plano | `IPtzCommandEvent` |
| Consome | `attlas.execution-plans.videowall-command` | Comando de videowall de plano | `IVideowallCommandEvent` |
| Produz | `attlas.cameras.event-logged` | Ponto de escrita, chave `cameraId` | `ICameraEventLogEntry` |
| Produz | `attlas.cameras.incident-created` | Correlação, só na promoção para `DETECTED` | `ICameraIncidentCreatedEvent` |
| Produz | `attlas.alarms.alarm-raised` | Emissor de alarme | `IAlarmRaisedEvent` |
| Produz | `attlas.cameras.ptz-command-executed`, `attlas.cameras.ptz-command-rejected` | Eco do comando de PTZ, chave `commandId` | `IPtzCommandExecutedEvent`, `IPtzCommandRejectedEvent` |
| Produz | `attlas.cameras.videowall-command-executed`, `attlas.cameras.videowall-command-rejected` | Eco do comando de videowall, chave `commandId` | `IVideowallCommandExecutedEvent`, `IVideowallCommandRejectedEvent` |
| Produz | `attlas.audit.cameras` | Observação e tratamento, pelo `CamerasAuditPublisher` | Envelope de `@attlas/audit-events` |

A transição de conexão da câmera sai em `attlas.cameras.status-changed`, por outro caminho, descrito em
[[Câmeras - Saúde e monitoramento - Arquitetura e estratégias]].

### Canais WebSocket

| Evento | Onde | Quando sai |
| --- | --- | --- |
| `camera:event:new` | Sala `camera:<id>` | A cada evento gravado, de qualquer origem |
| `subscribe_incidents { systemId }` | Namespace `cameras-status` | O cliente entra na sala `incidents:<systemId>`, depois de conferida a filiação ao sistema |
| `camera:incidents:changed` | Sala `incidents:<systemId>` | Incidente gravado, tratamento unitário ou em lote e observação nova (`realtime/incident-changes.publisher.ts`) |

### Tabelas do banco

Schema em `apps/ms-cameras/src/database/schema/`.

| Modelo | Arquivo | Papel |
| --- | --- | --- |
| `CameraEventLog` | `audit/camera_event_log.prisma` | O evento: `eventType`, `subType`, `severity`, `payload` (JSON), `correlationId`, `operatorId`, `occurredAt` (`Timestamptz`, sem default no banco). Não tem coluna de categoria |
| `CameraEventObservation` | `audit/camera_event_observation.prisma` | Observação ou resposta: `text` `VarChar(280)`, `parentObservationId` |
| `CameraEventTreatment` | `audit/camera_event_treatment.prisma` | Tratamento do incidente do analítico: `eventLogId` como chave primária, `status`, `assignedTo`, `updatedBy` |
| `CameraIncident` | `incident/camera_incident.prisma` | Incidente correlacionado ou manual: `status`, `priority`, `correlationKey` (`VarChar(64)`, nulo no manual), `detectedAt`, `resolvedAt`, `reportedBy`; `assignedTo` e `workOrderId` existem sem fluxo que os preencha |
| `CameraIncidentEvent` | `incident/camera_incident_event.prisma` | Ligação N:N entre incidente e evento, com `@@unique([incidentId, eventLogId])` |
| `AnalyticsIncidentCriticality` | `incident/analytics_incident_criticality.prisma` | Criticidade por tipo de incidente e por sistema |

## Por que é assim

### Um ponto de escrita para três origens

O `RecordCameraEventService` (`recording/record-camera-event.service.ts`) é o único lugar que grava evento.
Ele valida, persiste, classifica, avisa a tela e publica; as diferenças entre origens são opções da chamada,
não caminhos paralelos. Os passos rodam em sequência e sem transação. `occurredAt` precisa ser ISO-8601 com
`Z` ou offset, senão a gravação falha com `INVALID_TIMEZONE`; sem `occurredAt`, vale a hora do processo.
`severity` ausente vira `INFO`.

| Efeito | `ingest` | `health` | `analytics` |
| --- | --- | --- | --- |
| Confere que a câmera existe | Sim | Não, o worker só monitora câmera existente | Não, o vínculo do analítico já filtrou |
| Valida o fuso de `occurredAt` | Sim | Sim | Sim |
| Deduplica por `correlationId` | Sim | Não, o worker não envia | Não, o gravador do analítico já deduplica |
| Persiste e emite `camera:event:new` | Sim | Sim | Sim |
| Publica `event-logged` | Sim | Só se o par `(eventType, causeCode)` está em `CORRELATABLE` | Sim |

- **`health`**: o worker de [[Câmeras - Saúde e monitoramento]] grava `HEALTH_ONLINE`, `HEALTH_OFFLINE`,
  `HEALTH_EVENT` e `CONNECTIVITY_CHANGED`, com `causeCode` do catálogo da marca, `PROBE_TIMEOUT` ou
  `PUSH_DISCONNECT`. O critério de publicação reaproveita a lista da correlação em vez de manter outra. Evento
  de saúde sem causa, ou com par fora da lista, fica fora do tópico: é o ruído da sondagem.
- **`ingest`**: o `CameraEventIngestListener` descarta com `warn` o que chega sem `cameraId` ou `eventType`,
  com payload acima de 4 KiB ou não serializável, de câmera desconhecida ou com `InvalidInputException`.
  Qualquer outro erro é logado como `error` e o handler retorna sem relançar, para o consumidor nunca entrar em
  laço.
- **`analytics`**: o `AnalyticsIncidentRecorder` grava `ANALYTICS_INCIDENT` com `severity` `WARN`, sem
  `causeCode` e com o tipo em `payload.incidentType`, deduplicado por câmera, região e tipo numa janela de 30 s
  (`ANALYTICS_INCIDENT_DEDUP_WINDOW_MS`). O conteúdo do quadro está em [[Analítico - Arquitetura e estratégias]].

### Derivação na leitura, não na escrita

- **Categoria**: `deriveCameraEventCategory` mapeia `(eventType, causeCode)` na hora da leitura, e o filtro por
  categoria vira predicado Prisma. A cláusula `OPERATIONAL` trata `causeCode` nulo de forma explícita, porque
  `NOT(OR(...))` descartaria a linha sem causa, e exclui `ANALYTICS_INCIDENT`.
- **Status**: `deriveCameraEventStatus` prefere o tratamento do operador, depois o incidente ligado, e por fim
  `OPEN`.
- **Área e subárea**: a topologia do tenant vem do `ms-traffic-model`, com o bearer repassado, uma vez por
  request. Se o `ms-traffic-model` cai, os rótulos ficam vazios e a rota responde normalmente.
- **Ações disparadas**: `triggeredActions` só traz `{ type: 'INCIDENT', code }`; o alarme não é persistido, e
  ordem de serviço não tem módulo.
- **Tipo e severidade do incidente**: saem de `correlationKey`. O filtro por `type` vira
  `endsWith(':<causeCode>')`, e o incidente manual aparece como `UNKNOWN` no detalhe.
- **Título do incidente**: o texto em pt-BR é gravado como reserva para consumidor sem tradução; a tela usa a
  `translationKey`.

### Busca pela frase que a tela mostra

A coluna Descrição é montada no cliente a partir da `translationKey` e do payload, então a frase nunca está no
banco. O `CameraEventSearchWhereBuilder` resolve o termo contra o catálogo de tradução do idioma da requisição
e envia ao banco um `OR` de: `summary` contendo o termo; a própria `translationKey` (só quando o termo não é
parte do prefixo que toda chave compartilha); as chaves cuja frase contém o termo, restritas às linhas que de
fato mostram aquela variante (`CAMERA_EVENT_DESCRIPTION_VARIANTS`); e os campos do payload que a frase
interpola. O tópico VAPIX é casado trecho a trecho, separado por `/`, como a tela o mostra. O termo tem até
120 caracteres (`CameraEventValidation.search`), limite lido pelos três DTOs e pelos campos da tela. A lista
da rede usa a mesma regra.

### Correlação antes do alarme

A correlação (`consumers/correlate-events/`) junta eventos da mesma causa para que uma queda que atinge várias
câmeras vire um incidente, e não dezenas de alarmes.

- **Elegibilidade**: só os 10 pares de `CORRELATABLE`, listados em
  [[Câmeras - Eventos, incidentes e alarmes - Catálogo e criticidade#Mapa de causa para incidente e alarme|Catálogo e criticidade]].
  `HEALTH_ONLINE` nunca abre incidente.
- **Chave**: `correlationKey = eventType:causeCode`, com `__NULL__` quando não há causa.
- **Janelas**: um incidente aberto casa se está `TENTATIVE` ou `DETECTED`, sem `resolvedAt`, e tem
  `detectedAt` dentro da janela ativa de 60 s ou `updatedAt` dentro da extensão de 120 s.
- **Anexar ou criar**: achou, liga o evento numa transação (ligação idempotente, recontagem e promoção); não
  achou, cria `TENTATIVE` sem publicar nada, para que evento isolado não gere ruído.
- **Promoção para `DETECTED`**: ao chegar a 2 câmeras distintas ou 3 eventos. O `updateMany` é condicional em
  `status: 'TENTATIVE'`, e só a transação que obteve `count === 1` publica `incident-created` e invalida o
  dashboard.
- **Limpeza periódica**: um `@Cron` por minuto, sob `pg_try_advisory_xact_lock`, roda numa réplica por vez.
  Ele resolve `DETECTED` sem evento novo há 30 min, descarta `TENTATIVE` sem atividade há 120 s e resolve
  incidente com 80% das câmeras em `HEALTH_ONLINE` depois de `detectedAt`. O descarte de 120 s não é menor que
  a extensão, para não descartar um `TENTATIVE` que ainda aceita anexo.

Estados de `CameraIncident`: `TENTATIVE`, `DETECTED`, `RESOLVED` e `DROPPED`. `INVESTIGATING` existe no enum e
aparece na leitura, mas nenhum caminho leva um `CameraIncident` até ele; o `INVESTIGATING` que o operador
alcança é o do tratamento do analítico. Incidente manual nasce `DETECTED`.

### Alarme com identificador determinístico

O emissor (`consumers/emit-alarm/`) tem dois `@EventPattern` no mesmo listener. Erro que não é
`DomainException` nem erro Prisma de dado é relançado, para o Kafka reentregar.

- **Incidente promovido** (`incident-created`): descarta incidente sem `affectedCameraIds`, chama `mapToAlarm`
  com `fromCluster: true` e põe a câmera primária primeiro em `affectedEntities`. Se a severidade do mapeamento
  diverge da do incidente, loga `warn` e vale a do mapeamento.
- **Evento isolado** (`event-logged`): `isAlarmableEvent` aceita `severity` `ERROR` sempre,
  `VAPIX_TAMPERING` em qualquer severidade e `VAPIX_PTZ_ERROR` a partir de `WARN`. Evento já ligado a
  incidente é pulado, porque o alarme do incidente o cobre.
- **Incidente do analítico**: `ANALYTICS_INCIDENT` cujo tipo está em
  `AlarmEmitConfig.ANALYTICS_INCIDENT_CAUSE_CODES` (`CONGESTION`, `WRONG_WAY`, `STOPPED_FLOW`) sai no domínio
  `analytics`, categoria `ROAD_SAFETY` e a severidade padrão do tipo no catálogo de alarmes.
- **`alarmId`**: `deriveAlarmId(sourceType, sourceId)` de `@attlas/core-common` gera um UUID v5 de
  `EVENT:<eventLogId>` ou `INCIDENT:<incidentId>`. A reentrega gera o mesmo id, e o `ms-alarms` deduplica por
  ele (`IngestionIdempotencyService`).
- **Escopo e partição**: o `systemId` é o da câmera primária, e sem resolução o alarme sai sem escopo. A chave
  de partição é o `sourceId` no incidente e a câmera no evento.
- **No `ms-alarms`**: o `AlarmRaisedConsumer` classifica pelo `causeCode` dentro do módulo do domínio
  (`cameras` ou `analytics`); código sem entrada no catálogo é descartado como não mapeado.

O report manual não publica `incident-created`, então incidente reportado nunca gera alarme automático.

### Tratamento separado do incidente de hardware

O operador trata o incidente do analítico em `CameraEventTreatment`, com zero ou uma linha por evento; sem
linha, vale `DETECTED`. O ciclo (`treatment/camera-event-treatment.constants.ts`) é `DETECTED`,
`ACKNOWLEDGED`, `INVESTIGATING` e `RESOLVED`, mais `DROPPED` (falso positivo) a partir de qualquer estado não
final. Só vale para evento `ANALYTICS` e nunca altera `CameraIncident`. A primeira transição grava
`assignedTo` com o ator, que fica dono até o fim, e as seguintes comparam o status esperado antes de gravar.
Assim, dois operadores agindo juntos dão um vencedor e um 409. O status exibido na lista prefere o
tratamento.

### Publicação sem bloqueio, ecos com prazo

Falha de broker não desfaz registro, correlação nem alarme, que já estão no banco: `event-logged`,
`incident-created` e `alarm-raised` são publicados sem esperar confirmação, e sem `KAFKA_BROKERS` são
suprimidos em silêncio. Os ecos dos comandos de plano são a exceção: o plano precisa do eco para fechar, então
eles esperam até 20 s e, se falham, derrubam o handler para o Kafka reentregar.

### Idempotência por camada

| Camada | Mecanismo | Garantia |
| --- | --- | --- |
| Gravação `ingest` | `findByCorrelationId(cameraId, correlationId)` | Parcial: duas entregas simultâneas da mesma mensagem podem gravar duas linhas |
| Gravação `analytics` | Mapa em memória por câmera, região e tipo, 30 s | Por processo: um restart pode gravar uma linha a mais |
| Correlação | `eventAlreadyLinked` e `@@unique([incidentId, eventLogId])` | Forte no anexo; dois `TENTATIVE` da mesma chave podem nascer juntos |
| Alarme | `deriveAlarmId` e a idempotência de ingestão do `ms-alarms` | Forte |
| Tratamento | Chave primária `eventLogId` e comparação do status esperado | Forte, um vencedor e um 409 |
| Observação | Pai precisa ser de primeiro nível | Forte |
| Report manual | Nenhum | Ausente |

## Armadilhas conhecidas

- **Parâmetros de correlação são constantes.** Mudar janela ou limiar de `CorrelationConfig` exige deploy.

O que falta corrigir (exportação cortada em 100 linhas, report duplicado, índices que fecham as corridas, fila-morta
da ingestão e da correlação, comentários que contradizem o código) está em
[[Câmeras - Eventos, incidentes e alarmes - Pendências]].

## Glossário

| Termo | O que é |
| --- | --- |
| Ponto de escrita | O `RecordCameraEventService`, único código que insere em `CameraEventLog` |
| Par correlacionável | Combinação `(eventType, causeCode)` listada em `CORRELATABLE`; só ela abre ou alimenta incidente |
| `TENTATIVE` | Incidente que ainda não atingiu 2 câmeras ou 3 eventos; não publica nem alarma |
| Comparação do status esperado | Gravação condicional (`WHERE status = <esperado>`) que deixa só uma de duas escritas simultâneas vencer |
| UUID v5 | Identificador derivado de um texto por hash; o mesmo texto sempre dá o mesmo id |
| Fila-morta | Tópico que guarda a mensagem que o consumidor não consegue processar, para análise posterior |
