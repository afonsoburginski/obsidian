---
tags: [doc, cameras, ms-cameras, eventos]
---

# Eventos, incidentes e alarmes — Requisitos e SLA

> Submódulo do [[ms-cameras - visão geral]]. Índice: [[00 - Eventos, incidentes e alarmes]]. Contexto de domínio: `docs/modules/cameras.md`.

Rastreabilidade RF/RNF → critério de domínio → estado real no código. "Domínio" = descrito no edital mas **não implementado**; "Parcial" = parte no código.

## Requisitos funcionais

| ID | Requisito | Critério (domínio) | Estado no código |
| --- | --- | --- | --- |
| RF-EVT-01 | Captura automática | Registra eventos de estado, comunicação, energia e PTZ | **Implementado** — worker de saúde emite `HEALTH_*`/`CONNECTIVITY_CHANGED` com `causeCode` VAPIX (network/power/tampering/PTZ/hardware); ingest externo via `event-ingest` |
| RF-EVT-02 | Classificação e timeline | Tipo, severidade e origem + timeline correlacionando eventos | **Parcial** — `category` derivada `(eventType,causeCode)`, `severity` INFO/WARN/ERROR, timeline no detalhe do incidente (UC-024). Origem é a **câmera**; subárea/área não modeladas no evento |
| RF-EVT-03 | Integração externa | Críticos→Alarmes, analítica→Analítico, tudo→Relatórios | **Parcial** — Alarmes OK (`alarm-raised`, UC-022). Analítico: categoria `ANALYTICS` **sem produtor**. Relatórios: **sem** forwarding dedicado (eventos só no DB local) |
| RF-INC-01 | Criação auto e manual | Incidentes criados de eventos críticos ou manualmente | **Parcial** — auto via correlação (UC-021). **Criação manual não implementada** (sem endpoint) |
| RF-INC-02 | Ciclo de vida + SLA | aberto→em análise→em manutenção→resolvido→fechado, SLA por etapa | **Parcial** — implementados `DETECTED`(aberto)/`RESOLVED` + internos `TENTATIVE`/`DROPPED`. `INVESTIGATING` existe e é visível mas **sem transição de código**. "em manutenção"/"fechado" **não modelados**. **SLA por etapa: Domínio** (não implementado) |
| RF-INC-03 | Vinculação com OS | Incidentes físicos geram OS no Inventário | **Domínio** — coluna `workOrderId` existe (nullable), **sem integração** com Inventário |
| RF-INC-04 | Histórico MTTR/MTBF | MTTR e MTBF por câmera e região, hotspots | **Domínio** — não implementado (`detectedAt`/`resolvedAt` existem, mas sem cálculo/agregação de métricas) |

## Requisito não funcional

| ID | Requisito | Critério (domínio) | Estado no código |
| --- | --- | --- | --- |
| RNF-CAM-06 | Rastreabilidade total | Toda ação registrada com timestamp e identidade do operador | **Parcial** — eventos têm `occurredAt`/`createdAt` (Timestamptz, offset obrigatório) e `operatorId` (nullable). Eventos auto do worker e incidentes auto **não têm operador** (`operatorId`/`reportedBy` nulos, por serem do sistema) |

## Regras de correlação e janelas (`CorrelationConfig`)

Não há SLA tracking por etapa; o que existe são janelas/limiares operacionais fixos (hardcoded neste sprint — promoção a DB-driven é card próprio).

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
| `MAX_TIMELINE_ITEMS` | 200 | Cap da timeline no detalhe (UC-024); excedente marca `timelineTruncated` |

Pares correlacionáveis (`correlation-rules.ts`): `HEALTH_EVENT:VAPIX_POWER_FAILED`, `HEALTH_OFFLINE:{VAPIX_NETWORK_LOST,PROBE_TIMEOUT,PROBE_REFUSED,PROBE_UNREACHABLE}`, `CONNECTIVITY_CHANGED:VAPIX_NETWORK_LOST`. `HEALTH_ONLINE` nunca abre cluster.

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

Fontes: `handlers/correlate-events/correlation-rules.ts`, `handlers/_helpers/incident-mapping.ts`, `handlers/emit-alarm/alarm-mapping.ts`.

## Relacionados

[[00 - Saúde e monitoramento]] · [[00 - PTZ e presets]] · [[Status em tempo real (push)]] · [[00 - Streaming]]
