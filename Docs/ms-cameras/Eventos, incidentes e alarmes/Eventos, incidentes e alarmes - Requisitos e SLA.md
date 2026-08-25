---
tags:
  - doc
  - ms-cameras
  - cameras
  - eventos
atualizado: 2026-08-24
---

# Eventos, incidentes e alarmes - Requisitos e SLA

> Submódulo do [[ms-cameras]]. Índice: [[Eventos, incidentes e alarmes]]. Contexto de domínio: `docs/modules/cameras.md` seção 3.3/3.4/8.3/8.4.

Rastreabilidade RF/RNF → critério de domínio → estado real no código. "Domínio" = descrito no edital mas **não implementado**; "Parcial" = parte no código.

> [!success] Divergência corrigida (24/08) - RF-INC-01 estava documentado como "manual não implementada"; não é mais verdade
> A revisão de 03/07 marcava a criação manual de incidente como "sem endpoint". Desde 20/07 (`dd77f4654d`, SOFTWARE-2224) existe `POST /cameras/events/:eventId/report` (UC-044) - ver detalhe na linha RF-INC-01 abaixo.

## Requisitos funcionais

| ID | Requisito | Critério (domínio) | Estado no código |
| --- | --- | --- | --- |
| RF-EVT-01 | Captura automática | Registra eventos de estado, comunicação, energia e PTZ | **Implementado** - worker de saúde emite `HEALTH_*`/`CONNECTIVITY_CHANGED` com `causeCode` VAPIX (network/power/tampering/PTZ/hardware), agora via o mesmo seam do ingest (`source: 'health'`, MOD-010); ingest externo via `event-ingest` |
| RF-EVT-02 | Classificação e timeline | Tipo, severidade e origem + timeline correlacionando eventos | **Parcial** - `category` derivada `(eventType,causeCode)`, `severity` INFO/WARN/ERROR. Origem por câmera; `area`/`subarea` agora **resolvidas** (não persistidas) para o log cross-camera via topologia do ms-traffic-model (UC-032/040, novo desde 14/07). Duas timelines coexistem: a do incidente (UC-024, cadeia completa) e a do evento (UC-041, mesma cadeia + fallback de contexto quando isolado, novo desde 20/07) |
| RF-EVT-03 | Integração externa | Críticos→Alarmes, analítica→Analítico, tudo→Relatórios | **Parcial** - Alarmes OK (`alarm-raised`, UC-022; incidente manual de UC-044 não gera alarme automático). Analítico: categoria `ANALYTICS` **sem produtor**. Relatórios: **sem** forwarding dedicado (eventos só no DB local) |
| RF-INC-01 | Criação auto e manual | Incidentes criados de eventos críticos ou manualmente | **Implementado** (24/08 - antes "Parcial") - auto via correlação (UC-021, `TENTATIVE`→`DETECTED`) **e** manual via `POST /cameras/events/:eventId/report` (UC-044, `status='DETECTED'` direto, `reportedBy` = ator JWT). Ver achado abaixo sobre ausência de guarda contra report duplicado |
| RF-INC-02 | Ciclo de vida + SLA | aberto→em análise→em manutenção→resolvido→fechado, SLA por etapa | **Parcial** - implementados `DETECTED`(aberto)/`RESOLVED`, agora alcançáveis por **duas** vias (promoção por correlação ou report manual UC-044). `INVESTIGATING` existe e é visível mas **sem transição de código** (segue igual a 03/07). "em manutenção"/"fechado" **não modelados**. **SLA por etapa: Domínio** (não implementado) |
| RF-INC-03 | Vinculação com OS | Incidentes físicos geram OS no Inventário | **Domínio** - coluna `workOrderId` existe (nullable), **sem integração** com Inventário |
| RF-INC-04 | Histórico MTTR/MTBF | MTTR e MTBF por câmera e região, hotspots | **Domínio** - não implementado (`detectedAt`/`resolvedAt` existem, mas sem cálculo/agregação de métricas) |

## Requisito não funcional

| ID | Requisito | Critério (domínio) | Estado no código |
| --- | --- | --- | --- |
| RNF-CAM-06 | Rastreabilidade total | Toda ação registrada com timestamp e identidade do operador | **Parcial** - eventos têm `occurredAt`/`createdAt` (Timestamptz, offset obrigatório) e `operatorId` (nullable). Eventos auto do worker e incidentes de correlação **não têm operador** (`operatorId`/`reportedBy` nulos, por serem do sistema); incidentes **manuais** (UC-044, novo) carregam `reportedBy` real do ator JWT, e observações (UC-044) capturam `authorId`/`authorName` na escrita |

## Achado de leitura de código - sem guarda contra report duplicado (RF-INC-01)

`ReportCameraEventOccurrenceHandler` → `createReportedIncident` sempre `INSERT`a um `CameraIncident` novo; não há checagem prévia de "este evento já tem incidente vinculado". O botão "Reportar ocorrência" no frontend (`camera-event-detail.page.html`) também não é condicionado a `linkedIncident` - fica sempre clicável. Dois cliques no mesmo evento abrem dois incidentes distintos ligados ao mesmo `eventLogId`. Requisito está implementado; a lacuna é de idempotência, não de cobertura funcional - registrada aqui e na nota de arquitetura para quem tocar UC-044 a seguir.

## Regras de correlação e janelas (`CorrelationConfig`, em `events/events.constants.ts`)

Não há SLA tracking por etapa; o que existe são janelas/limiares operacionais fixos (hardcoded neste sprint - promoção a DB-driven é card próprio).

| Parâmetro | Valor | Papel |
| --- | --- | --- |
| `WINDOW_SECONDS` | 60 s | Janela ativa para abrir/estender cluster |
| `EXTENSION_WINDOW_SECONDS` | 120 s | Fronteira de extensão (último evento ligado) |
| `CLUSTER_CAMERAS_THRESHOLD` | 2 | ≥ N câmeras distintas → `TENTATIVE`→`DETECTED` |
| `CLUSTER_EVENTS_THRESHOLD` | 3 | ≥ N eventos na mesma câmera → `TENTATIVE`→`DETECTED` |
| `AUTO_CLOSE_WINDOW_SECONDS` | 1800 s (30 min) | `DETECTED` sem novos eventos → `RESOLVED` |
| `DROP_TENTATIVE_WINDOW_SECONDS` | 120 s | `TENTATIVE` órfão → `DROPPED` (≥ extensão, evita perder continuidade) |
| `RECOVERY_RESOLVE_THRESHOLD` | 0.8 | ≥ 80% das câmeras com `HEALTH_ONLINE` após `detectedAt` → `RESOLVED` (BR-CAM-CORR-005) |
| `HOUSEKEEPING_CRON_INTERVAL_MS` | 60 000 ms | Cron do housekeeping (uma réplica via advisory lock) |
| `DEFAULT_LIST_WINDOW_DAYS` | 7 | Janela default da lista de incidentes (UC-023) sem `from`/`to` |
| `MAX_TIMELINE_ITEMS` | 200 | Cap da timeline no detalhe de incidente (UC-024); excedente marca `timelineTruncated` |

> [!warning] Divergência corrigida (24/08) - a lista de pares correlacionáveis cresceu
> A nota de 03/07 listava só 6 pares. Hoje (`correlation-rules.ts`, desde `a4a0f32696` de 22/07, SOFTWARE-2294) são **10**: `HEALTH_EVENT:{VAPIX_POWER_FAILED,VAPIX_TAMPERING}`, `HEALTH_OFFLINE:{VAPIX_NETWORK_LOST,PROBE_TIMEOUT,PROBE_REFUSED,PROBE_UNREACHABLE,PUSH_DISCONNECT}`, `CONNECTIVITY_CHANGED:{VAPIX_NETWORK_LOST,VAPIX_TAMPERING,PUSH_DISCONNECT}`. `HEALTH_ONLINE` nunca abre cluster.

## Parâmetros da tela de Eventos (UC-032/040/041/042, novos desde 14-20/07)

Hardcoded como os de correlação; mesma ressalva.

| Parâmetro | Valor | Papel |
| --- | --- | --- |
| `CameraEventPeriodConfig.PRESET_DAYS` | `7d`/`30d`/`90d` | Presets de janela do log/KPIs cross-camera (UC-032/040); `all` remove o filtro, `range` honra `from`/`to` |
| `CameraEventPeriodConfig.DEFAULT_PRESET` | `30d` | Janela default quando `period` não vem |
| `CameraEventTimelineConfig.CONTEXT_WINDOW_MS` | ±30 min | Janela do fallback de contexto da timeline do evento (UC-041) quando não há incidente ligado |
| `CameraEventTimelineConfig.CONTEXT_MAX_EVENTS` | 50 | Cap de linhas do fallback de contexto |
| `CameraEventRecurrenceConfig.PRESETS` | `1h`=60×1min, `24h`=24×1h, `7d`=7×1d, `30d`=30×1d | Buckets da recorrência do evento (UC-042) |
| `CameraEventRecurrenceConfig.DEFAULT_PERIOD` | `24h` | Período default da recorrência |
| `CameraEventObservationConfig.TEXT_MAX_LENGTH` | 280 | Tamanho máx. de observação/reply (UC-044); sincronizado com `@db.VarChar(280)` |
| `CameraEventObservationConfig.REPORT_NAME_MAX_LENGTH` | 200 | Tamanho máx. do título do report manual |
| `CameraEventObservationConfig.REPORT_DESCRIPTION_MAX_LENGTH` | 2000 | Tamanho máx. da descrição do report manual |

## Mapa causa → severidade/tipo/alarme

| `causeCode` | Severidade incidente | Tipo incidente | Alarme (categoria / severidade isolado→cluster) |
| --- | --- | --- | --- |
| `VAPIX_POWER_FAILED` | CRITICAL | POWER | SYSTEM_FUNCTIONING / CRITICAL |
| `VAPIX_HW_FAILURE` | CRITICAL | HARDWARE | SYSTEM_FUNCTIONING / CRITICAL |
| `VAPIX_TAMPERING` | HIGH | VANDALISM | ROAD_SAFETY / HIGH |
| `VAPIX_NETWORK_LOST` | HIGH | COMMUNICATION | SYSTEM_FUNCTIONING / MEDIUM→HIGH |
| `PROBE_TIMEOUT`/`PROBE_REFUSED`/`PROBE_UNREACHABLE` | HIGH | COMMUNICATION | SYSTEM_FUNCTIONING / MEDIUM→HIGH |
| `VAPIX_PTZ_ERROR` | MEDIUM | OPERATIONAL | SYSTEM_FUNCTIONING / MEDIUM |
| `PUSH_DISCONNECT` / `UNKNOWN` | (MEDIUM default) | OPERATIONAL | **não-alarmável** (`null`) |

Fontes: `events/consumers/correlate-events/correlation-rules.ts`, `events/incidents/incident-mapping.ts`, `events/consumers/emit-alarm/alarm-mapping.ts`.

## Prioridade de incidente manual (UC-044, `deriveIncidentPriority`)

Tabela distinta da anterior - aplica só ao report manual (`POST /cameras/events/:eventId/report`), derivando a prioridade da `severity` do evento gatilho (BR-CAM-EVT-044-03), não do `causeCode`:

| `severity` do evento | Prioridade do incidente manual |
| --- | --- |
| `ERROR` | HIGH |
| `WARN` | MEDIUM |
| `INFO` | LOW |
| Qualquer outro valor | MEDIUM (fallback, com `warn` no log) |

## Relacionados

[[Saúde e monitoramento]] · [[PTZ e presets]] · [[Status em tempo real]] · [[Streaming]]
