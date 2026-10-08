---
tags:
  - doc
  - cameras
  - eventos
  - ms-cameras
aliases:
  - "Eventos, incidentes e alarmes - Requisitos e SLA"
atualizado: 2026-10-07
banner: "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=1200"
---

# Câmeras - Eventos, incidentes e alarmes - Requisitos e SLA

Volta para [[Câmeras - Eventos, incidentes e alarmes]].

## Resumo

Requisitos de origem em `docs/modules/cameras.md`, seções 3.3, 3.4, 8.3 e 8.4. "Não atendido" é requisito do
edital sem implementação.

| Requisito | Estado | O que o código faz e o que falta |
| --- | --- | --- |
| RF-EVT-01 Captura automática de estado, comunicação, energia e PTZ | **Atendido** | O worker de saúde grava `HEALTH_*` e `CONNECTIVITY_CHANGED` com causa de marca, de sondagem ou de queda da conexão de eventos; a ingestão externa por `event-ingest` existe, sem produtor |
| RF-EVT-02 Classificação e timeline | **Atendido** | Categoria derivada, severidade `INFO`, `WARN` ou `ERROR`, origem, área e subárea pela topologia; timeline do incidente e do evento |
| RF-EVT-03 Integração externa | **Parcial** | Alarmes por `alarm-raised` e por `status-changed`; o analítico tem produtor e fila própria; Relatórios não recebe encaminhamento dedicado |
| RF-INC-01 Criação automática e manual | **Atendido** | Correlação (`TENTATIVE` para `DETECTED`) e report manual (`DETECTED` direto, `reportedBy` do JWT) |
| RF-INC-02 Ciclo de vida com SLA por etapa | **Parcial** | Só `DETECTED` e `RESOLVED` têm transição; `INVESTIGATING` aparece sem transição; "em manutenção" e "fechado" não existem; não há SLA por etapa. O ciclo do tratamento do analítico é outra entidade e não cobre este requisito |
| RF-INC-03 Vinculação com ordem de serviço no Inventário | **Não atendido** | Só a coluna `workOrderId` |
| RF-INC-04 MTTR e MTBF por câmera e região | **Não atendido** | `detectedAt` e `resolvedAt` existem, sem cálculo |
| RNF-CAM-06 Rastreabilidade | **Parcial** | Eventos com `occurredAt` e `createdAt` (`Timestamptz`, offset obrigatório) e `operatorId`; evento automático e incidente de correlação sem operador, por serem do sistema; incidente manual com `reportedBy`; observação com `authorId` e `authorName`; observação e tratamento em `attlas.audit.cameras`; o report fica fora da trilha de auditoria |

## Regras

| Regra | Valor | Onde no código |
| --- | --- | --- |
| Janela ativa para abrir ou estender incidente | 60 s | `CorrelationConfig.WINDOW_SECONDS`, `events/events.constants.ts` |
| Extensão pelo último evento ligado | 120 s | `CorrelationConfig.EXTENSION_WINDOW_SECONDS` |
| Câmeras distintas para promover a `DETECTED` | 2 | `CorrelationConfig.CLUSTER_CAMERAS_THRESHOLD` |
| Eventos para promover a `DETECTED` | 3 | `CorrelationConfig.CLUSTER_EVENTS_THRESHOLD` |
| `DETECTED` sem evento novo vira `RESOLVED` | 1800 s (30 min) | `CorrelationConfig.AUTO_CLOSE_WINDOW_SECONDS` |
| `TENTATIVE` sem atividade vira `DROPPED` | 120 s | `CorrelationConfig.DROP_TENTATIVE_WINDOW_SECONDS` |
| Fração de câmeras em `HEALTH_ONLINE` que resolve o incidente | 0,8 | `CorrelationConfig.RECOVERY_RESOLVE_THRESHOLD` |
| Intervalo da limpeza periódica | 60 000 ms | `CorrelationConfig.HOUSEKEEPING_CRON_INTERVAL_MS` |
| Janela padrão da lista de incidentes | 7 dias | `CorrelationConfig.DEFAULT_LIST_WINDOW_DAYS` |
| Teto da timeline do detalhe de incidente | 200 eventos | `CorrelationConfig.MAX_TIMELINE_ITEMS` |
| Presets de período da lista da rede | `24h`, `7d`, `30d`, `90d`; `all` sem filtro; `range` com `from` e `to` | `CameraEventPeriodConfig.PRESET_DAYS` |
| Período padrão da lista da rede | `30d` | `CameraEventPeriodConfig.DEFAULT_PRESET` |
| Comparação fixa dos KPIs | 30 dias contra os 30 anteriores | `COMPARISON_WINDOW_DAYS`, `reading/get-camera-events-stats/camera-events-stats.constants.ts` |
| Paginação dos logs | padrão 20, máximo 100, página máxima 10 000 | `CameraEventLogConfig` |
| Termo de busca | até 120 caracteres | `CameraEventValidation.search`, `libs/contracts/src/lib/camera/camera-event.validation.ts` |
| Contexto da timeline sem incidente | 30 min para cada lado, até 50 linhas | `CameraEventTimelineConfig` |
| Intervalos da recorrência | `1h` em 60 de 1 min, `24h` em 24 de 1 h, `7d` em 7 de 1 dia, `30d` em 30 de 1 dia; padrão `24h` | `CameraEventRecurrenceConfig.PRESETS` |
| Texto da observação | até 280 caracteres, igual ao `VarChar(280)` | `CameraEventObservationConfig.TEXT_MAX_LENGTH` |
| Report manual | `name` de 1 a 200, `description` de 1 a 2000 caracteres, lidos pelo DTO e pelo modal | `CameraEventReportValidation`, `libs/contracts/src/lib/camera/camera-event-report.validation.ts` |
| Prioridade do incidente manual | `ERROR` vira `HIGH`, `WARN` vira `MEDIUM`, `INFO` vira `LOW`; outro valor vira `MEDIUM` com `warn` no log | `events/_shared/derive-incident-priority.ts` |
| Lote de tratamento | até 100 eventos | `PATCH /cameras/events/treatment-status` |
| Teto e lote da exportação | 20 000 linhas, lotes de 500 | `INCIDENTS_EXPORT_MAX_ROWS`, `INCIDENTS_EXPORT_BATCH_SIZE`, `incidents/export/handlers/incidents-export.constants.ts` |
| Payload da ingestão externa | até 4 KiB | `CameraEventIngestListener.MAX_PAYLOAD_BYTES` |
| Prazo do eco de comando de plano | 20 s | `PUBLISH_DEADLINE_MS`, `events/publishing/camera-events.publisher.ts` |

## Variáveis de ambiente

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `ANALYTICS_INCIDENT_DEDUP_WINDOW_MS` | 30000 | Janela em que o incidente do analítico da mesma câmera, região e tipo é colapsado numa linha |
| `KAFKA_BROKERS` | `localhost:9092` no `.env.example` | Sem ela, `event-logged`, `incident-created` e `alarm-raised` são suprimidos em silêncio e os ecos de comando de plano falham |
