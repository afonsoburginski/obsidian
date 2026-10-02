---
tags:
  - doc
  - ms-cameras
  - eventos
atualizado: 2026-10-01
aliases:
  - "Eventos, incidentes e alarmes - Requisitos e SLA"
---

# Câmeras - Eventos, incidentes e alarmes - Requisitos e SLA

Índice: [[Câmeras - Eventos, incidentes e alarmes]]. Requisitos de origem: `docs/modules/cameras.md` (seções 3.3, 3.4,
8.3 e 8.4). "Não atendido" é requisito do edital sem implementação.

## Requisitos funcionais

| ID | Requisito | Estado no código |
| --- | --- | --- |
| RF-EVT-01 Captura automática | Estado, comunicação, energia e PTZ | **Atendido** - worker de saúde grava `HEALTH_*` e `CONNECTIVITY_CHANGED` com causa de marca, de ping ou de queda de conexão; ingest externo por `event-ingest` (sem produtor hoje) |
| RF-EVT-02 Classificação e timeline | Tipo, severidade, origem e timeline correlacionada | **Atendido** - categoria derivada, severidade `INFO`/`WARN`/`ERROR`, origem por câmera e `area`/`subarea` pela topologia; timeline do incidente (UC-024) e do evento (UC-041) |
| RF-EVT-03 Integração externa | Críticos para Alarmes, analítica para Analítico, todos para Relatórios | **Parcial** - Alarmes por `alarm-raised` (consumido pelo `ms-alarms`) e por `status-changed`; analítico com produtor (`ANALYTICS_INCIDENT`) e fila própria; Relatórios **sem** encaminhamento dedicado |
| RF-INC-01 Criação automática e manual | De eventos críticos ou pelo operador | **Atendido** - correlação (`TENTATIVE` para `DETECTED`) e report manual (`DETECTED` direto, `reportedBy` do JWT) |
| RF-INC-02 Ciclo de vida com SLA | Aberto, em análise, em manutenção, resolvido, fechado, tempo por etapa | **Parcial** - `DETECTED` e `RESOLVED`; `INVESTIGATING` visível mas sem transição; "em manutenção" e "fechado" não modelados; SLA por etapa não atendido |
| RF-INC-03 Vinculação com OS | Incidente físico gera OS no Inventário | **Não atendido** - só a coluna `workOrderId` |
| RF-INC-04 MTTR e MTBF | Por câmera e região, hotspots | **Não atendido** - `detectedAt`/`resolvedAt` existem, sem cálculo |

O ciclo de tratamento do incidente de analítico (`DETECTED`, `ACKNOWLEDGED`, `INVESTIGATING`, `RESOLVED`,
`DROPPED`) é outra entidade e não cobre o RF-INC-02 do incidente de câmera.

## Requisito não funcional

| ID | Estado |
| --- | --- |
| RNF-CAM-06 Rastreabilidade | **Parcial** - eventos com `occurredAt`/`createdAt` (Timestamptz, offset obrigatório) e `operatorId`; evento automático e incidente de correlação sem operador por serem do sistema; incidente manual com `reportedBy`; observação com `authorId`/`authorName`; observação e tratamento na trilha `attlas.audit.cameras`; report fora da trilha de auditoria |

## Prioridade do incidente manual

Derivada da `severity` do evento gatilho (`_shared/derive-incident-priority.ts`, BR-CAM-EVT-044-03), não
do body:

| `severity` | Prioridade |
| --- | --- |
| `ERROR` | `HIGH` |
| `WARN` | `MEDIUM` |
| `INFO` | `LOW` |
| Outro valor | `MEDIUM`, com `warn` no log |

## Parâmetros de correlação (`CorrelationConfig`, `events/events.constants.ts`)

Constantes no código; levar para configuração em banco é pendência.

| Parâmetro | Valor | Papel |
| --- | --- | --- |
| `WINDOW_SECONDS` | 60 s | Janela ativa para abrir ou estender cluster |
| `EXTENSION_WINDOW_SECONDS` | 120 s | Extensão pelo último evento ligado |
| `CLUSTER_CAMERAS_THRESHOLD` | 2 | Câmeras distintas para promover |
| `CLUSTER_EVENTS_THRESHOLD` | 3 | Eventos para promover |
| `AUTO_CLOSE_WINDOW_SECONDS` | 1800 s | `DETECTED` sem evento novo vira `RESOLVED` |
| `DROP_TENTATIVE_WINDOW_SECONDS` | 120 s | `TENTATIVE` órfão vira `DROPPED` |
| `RECOVERY_RESOLVE_THRESHOLD` | 0,8 | Fração de câmeras em `HEALTH_ONLINE` para resolver |
| `HOUSEKEEPING_CRON_INTERVAL_MS` | 60 000 ms | Cron do housekeeping |
| `DEFAULT_LIST_WINDOW_DAYS` | 7 | Janela default da lista de incidentes |
| `MAX_TIMELINE_ITEMS` | 200 | Teto da timeline do detalhe de incidente |

## Parâmetros da tela de Eventos

| Parâmetro | Valor | Papel |
| --- | --- | --- |
| `CameraEventPeriodConfig.PRESET_DAYS` | `24h`, `7d`, `30d`, `90d` | Presets da lista; `all` remove o filtro, `range` usa `from`/`to` |
| `CameraEventPeriodConfig.DEFAULT_PRESET` | `30d` | Período default |
| `COMPARISON_WINDOW_DAYS` (`camera-events-stats.constants.ts`) | 30 | Comparação fixa dos KPIs |
| `CameraEventLogConfig` | limite default 20, máximo 100 | Paginação |
| `CameraEventTimelineConfig` | 30 min para cada lado, até 50 | Fallback de contexto da timeline |
| `CameraEventRecurrenceConfig.PRESETS` | `1h` 60 x 1 min, `24h` 24 x 1 h, `7d` 7 x 1 dia, `30d` 30 x 1 dia; default `24h` | Buckets da recorrência |
| `CameraEventObservationConfig.TEXT_MAX_LENGTH` | 280 | Observação, igual ao `VarChar(280)` |
| `CameraEventReportValidation` (`@attlas/contracts`) | `name` 1 a 200, `description` 1 a 2000 | Report manual, lido pelo DTO e pelo modal |
| `INCIDENTS_EXPORT_MAX_ROWS` / `INCIDENTS_EXPORT_BATCH_SIZE` | 20 000 / 500 | Teto e lote da exportação |
| `ANALYTICS_INCIDENT_DEDUP_WINDOW_MS` | 30 s | Dedup do incidente do analítico por câmera, região e tipo |
