---
tags:
  - doc
  - ms-cameras
  - eventos
atualizado: 2026-10-01
aliases:
  - "Eventos, incidentes e alarmes - Fluxos"
---

# Câmeras - Eventos, incidentes e alarmes - Fluxos

Índice: [[Câmeras - Eventos, incidentes e alarmes]]. Regras, constantes e contratos:
[[Câmeras - Eventos, incidentes e alarmes - Arquitetura e estratégias]].

## 1. Evento de saúde até o alarme

1. O worker de saúde detecta transição ou recebe evento do device ([[Câmeras - Saúde e monitoramento - Fluxos]]) e
   chama `recorder.record(message, { source: 'health' })`, uma vez por linha `Camera` do device.
2. O seam valida o fuso, persiste e publica `CameraEventLogCreatedEvent`: `camera:event:new` na sala
   `camera:<id>` e invalidação do dashboard (EVENTS).
3. Par `(eventType, causeCode)` fora de `CORRELATABLE`: **fim**. Dentro: publica em
   `attlas.cameras.event-logged` (chave `cameraId`).
4. O tópico faz fan-out para a correlação (fluxo 3) e para o ramo B do alarme (fluxo 4).

## 2. Evento externo (`ingest`)

1. Um produtor publica `ICameraEventIngestMessage` em `attlas.cameras.event-ingest`.
2. O listener descarta o que vier sem `cameraId`/`eventType` ou com payload acima de 4 KiB.
3. O seam confere que a câmera existe (senão descarta com `warn`), valida o fuso (senão descarta), devolve a
   linha existente se o `correlationId` já foi gravado, persiste, emite `camera:event:new` e publica
   `event-logged`.

## 3. Correlação (UC-021)

1. `isCorrelatable` falso ou evento já ligado: fim.
2. Monta `correlationKey` e as janelas de 60 e 120 s; procura incidente aberto da chave.
3. **Achou**: cria a ligação (idempotente), recomputa eventos e câmeras; se `TENTATIVE` chegou a 2 câmeras
   ou 3 eventos, promove para `DETECTED` por `updateMany` condicional; quem promoveu publica
   `attlas.cameras.incident-created` e invalida o dashboard (INCIDENTS).
4. **Não achou**: cria `TENTATIVE` com o evento, sem publicar.

Housekeeping a cada minuto, numa réplica:

| Operação | Condição | Efeito |
| --- | --- | --- |
| `autoCloseExpiredDetected` | `DETECTED` sem evento novo há 30 min | `RESOLVED` |
| `dropExpiredTentative` | `TENTATIVE` sem atividade há 120 s | `DROPPED` |
| `autoResolveByRecovery` | `DETECTED` com 80% das câmeras em `HEALTH_ONLINE` depois de `detectedAt` | `RESOLVED` |

## 4. Emissão de alarme (UC-022)

**Ramo A (`incident-created`)**: descarta sem câmeras; `mapToAlarm` com `fromCluster: true` (`null`, não
emite); `alarmId = deriveAlarmId('INCIDENT', incidentId)`; câmera primária primeiro; publica
`attlas.alarms.alarm-raised` com chave `incidentId`.

**Ramo B (`event-logged`)**:

1. `ANALYTICS_INCIDENT` com tipo mapeado (`CONGESTION`, `WRONG_WAY`, `STOPPED_FLOW`): publica no domínio
   `analytics` com a severidade do catálogo. Sem mapa: fim.
2. Demais: `isAlarmableEvent` falso, fim; evento já ligado a incidente, fim; `mapToAlarm` com
   `fromCluster: false`; `alarmId = deriveAlarmId('EVENT', eventLogId)`; publica com chave na câmera.

O `ms-alarms` consome `alarm-raised`, deduplica pelo `alarmId` e classifica pelo `causeCode` no catálogo do
módulo do domínio.

## 5. Leitura na tela de Eventos

- **Lista e KPIs**: `GET /cameras/events` e `GET /cameras/events/stats` com os mesmos filtros; a topologia é
  carregada uma vez por request.
- **Detalhe**: `GET /cameras/events/:eventId` (rede) ou `GET /cameras/:id/events/:eventId` (câmera).
- **Timeline**: `GET /cameras/events/:eventId/timeline`. Com incidente ligado, todos os eventos dos
  incidentes, em ordem ascendente, possivelmente de várias câmeras; sem incidente, a mesma câmera em 30 min
  para cada lado, até 50. É diferente da timeline do UC-024, que parte de um `incidentId`.
- **Recorrência**: `GET /cameras/events/:eventId/recurrence?period=1h|24h|7d|30d`, só a câmera de origem,
  terminando no `occurredAt` do evento.

## 6. Observação, report e tratamento

- **Observação**: `POST /cameras/events/:eventId/observations` com `{ text, parentObservationId? }`; autor
  do JWT; reply de reply é 400. Publica auditoria e `camera:incidents:changed`.
- **Report**: `POST /cameras/events/:eventId/report` com `{ name, description }`; abre `CameraIncident`
  `DETECTED` ligado ao evento, prioridade pela severidade; não passa pela correlação nem pelo alarme.
- **Tratamento**: `PATCH /cameras/events/:eventId/treatment-status` (ou o lote em
  `/cameras/events/treatment-status`); primeira transição cria a linha e fixa o dono, as seguintes são
  compare-and-set; publica auditoria, notificação `cameras.incident.treatmentChanged` e
  `camera:incidents:changed`.

## 7. Leitura de incidentes (UC-023/024)

- **Lista** (`GET /cameras/incidents`): sem `from`/`to`, últimos 7 dias; esconde `TENTATIVE` e `DROPPED`;
  `type` vira sufixo de `correlationKey`; `affectedCameraIds` e `eventCount` agregados à parte.
- **Detalhe** (`GET /cameras/incidents/:id`): status interno é 404; timeline ascendente até 200, com
  `timelineTruncated`; traz `reportedBy`, `assignedTo` e `workOrderId`.

Nenhuma tela do `web-attlas` consome essas duas rotas hoje.

## User flow (`apps/web-attlas/src/app/modules/cameras-events/`)

Rotas do módulo: `''` (lista) e `':id'` (página interna do evento), montadas em `/cameras/events`.

| UF | Tela ou componente | Endpoint |
| --- | --- | --- |
| UF-002/003 | Página da lista com KPIs | Lista e KPIs |
| UF-004 | Atalho de severidade nos cards | KPIs (filtro compartilhado com a tabela) |
| UF-005/006/007 | Tabela da rede e "Ocultar colunas" | Lista |
| UF-008 | Busca da toolbar | Lista, `search` |
| UF-009 | Painel de filtros | Lista |
| UF-010 | Cache stale-while-revalidate (`TtlLruCache` no `CameraEventsService`) | Sem endpoint próprio |
| UF-011/012 | Drawer de detalhe (Geral e Histórico) | Detalhe e timeline |
| UF-013 | Página interna do evento | Detalhe |
| UF-014 | Card "Histórico do Evento" | Timeline |
| UF-016 | Card "Recorrência do Evento" | Recorrência |
| UF-017 | Card "Últimos eventos do dispositivo" | Log por câmera |
| UF-018 | Card "Observações do evento" | Observações |
| UF-019 | Modal "Reportar ocorrência" | Report |

A lista e os KPIs não têm push: revalidam por ação do operador (filtro, paginação, retry), sem polling. O
`camera:event:new` alimenta o log por câmera em tempo real. Observações e histórico ficam num módulo
separado (`camera-event-treatment.module.ts`) porque a fila de incidentes do analítico os reusa sem importar
as rotas deste módulo.
