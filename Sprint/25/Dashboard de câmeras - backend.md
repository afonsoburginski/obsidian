---
tags:
  - attlas
  - sprint-25
  - card
cards: SOFTWARE-2212, 2213, 2214, 2215, 2216, 2217, 2218, 2219
epico: SOFTWARE-1899 (Dashboard - Módulo de Dashboard das câmeras)
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: to do (Sprint 25) - specs escritas UC-033..039, 7 draft PRs abertos (2213-2219, PRs #856-863); implementacao pendente
atualizado: 2026-07-17
---

# Dashboard de câmeras - backend

Backend das agregações que alimentam a tela de **Dashboard de câmeras** (`/cameras/dashboard`). O frontend já existe e roda **100% em mock** (Lucas, épico SOFTWARE-1899, subtasks [Front] em teste); os ~35 contratos estão prontos. Falta o `ms-cameras` responder em `/api/cameras/dashboard/*`. Backend-only, 1 card = 1 PR.

## Cuidado: são três "dashboards" diferentes

1. **Dashboard de câmeras** (esta frente). Dado exclusivamente do `ms-cameras`. Quatro blocos: Conectividade, Operacionais, Incidentes, Rede.
2. **Dashboard Global** (edital 4.18, `ms-reports` esqueleto). Estratégico, cross-módulo. Fora daqui.
3. **Painel Operacional Integrado** (`operations-panel`, RF-OP-19). KPIs no mapa GIS em tempo real, multi-módulo. Fora daqui.

## Estado atual

- Front: `apps/web-attlas/src/app/modules/cameras-dashboard/`; `cameras-dashboard.service.ts` tem 13 métodos, todos mock, com `HttpClient` já injetado. Virar a chave = subtask SOFTWARE-1915 do Lucas (backlog).
- Contratos: `libs/contracts/src/lib/camera/dashboard/` (~35 `i-dashboard-*.ts` + enums). Prontos.
- Backend hoje: só `GET /dashboard/bandwidth` (snapshot escalar), o resto não existe.

## Achado central da investigação (2026-07-15)

**Os dados brutos existem quase todos; o que falta é sistemático: agregação multi-câmera / por-escopo / por-bucket-de-tempo.** Todo o código de agregação atual (`health-metrics.composer.ts`, `GetCameraHealthMetricsHandler`, `computeUptimeByCamera`) opera **por câmera única**; o único agregado de frota (`BandwidthMonitoringService`) é um snapshot escalar. Só "intermitente" e "eventos ANALYTICS" não têm dado de origem pronto.

### Modelos Prisma relevantes (`apps/ms-cameras/src/database/schema/`)

| Model | Papel | Colunas-chave |
| --- | --- | --- |
| `Camera` | cadastro | `physicalCameraKind` (PTZ=0/FIXED=1), `analyticsCapabilities Json` (dai/virtualLoop/ptz), `lifecycleState`, `latitude`/`longitude`/`address`/`intersection`, `trafficElementId` (-> NODE traffic-model), `systemId` |
| `CameraOperationalSnapshot` | estado agora (1/câmera) | `isOnline`, `connectionStatus` (STABLE/PARTIALLY_UNSTABLE/UNSTABLE/OFFLINE), `latencyMs`, `packetLossPercent` |
| `CameraHeartbeatHistory` | heartbeat cru (particionado) | `isOnline`, `latencyMs`, `observedAt` |
| `CameraAvailabilityWindow` | janela 5 min | `state` (ONLINE/DEGRADED/OFFLINE), `avgLatencyMs`, `avgBitrateMbps`, `windowStart` |
| `CameraAvailabilityDailyRollup` | rollup diário | `onlineWindows`/`degradedWindows`/`offlineWindows`, `avgLatencyMs`, `avgBitrateMbps`, `date` |
| `CameraStreamProfile` | banda provisionada | `bitrateKbps` (device-truth), `bitrateSource`, resolution/fps/codec |
| `CameraEventLog` | eventos | `occurredAt`, `eventType`, `severity` (INFO/WARN/ERROR), `payload.causeCode` (categoria derivada) |
| `CameraIncident` | incidentes | `priority` (CRITICAL/HIGH/MEDIUM/LOW), `status`, `detectedAt`, `correlationKey` |

Workers em `apps/ms-cameras/src/health/workers/`: `availability-window-sampler` (5 min, escreve `CameraAvailabilityWindow`, mede bitrate do mediamtx), `availability-rollup` (1h/dia, escreve `CameraAvailabilityDailyRollup`), `provisioned-bandwidth-collector` (6h, atualiza `CameraStreamProfile.bitrateKbps`).

### Escopo (área/subárea/rota/interseção)

Câmera **não tem** coluna de área/subárea. Vínculo = `Camera.trafficElementId` -> NODE do ms-traffic-model. Resolver via `ITopologyNodeIdsClient.resolveNodeIds(polygonId, systemId, bearer)` (`cameras/clients/i-topology-node-ids.client.ts` + `traffic-model-topology.http-client.ts`), depois filtrar `Camera.trafficElementId IN (...)`. Molde: `list-cameras.handler.ts` (UC-025). **"Rota" NÃO existe modelada** em ms-cameras (só área -> subárea -> NODE) - o contrato tem `routes`, decidir o que fazer.

## Cards (1 PR cada) e mapa dado-por-métrica

Filtro global `IDashboardQueryParams { period (HOUR/H24/D7/D30), scope }`.

| Card | Endpoints | Fonte + gap | Pts |
| --- | --- | --- | --- |
| **2212** | fundação | `SPEC-ms-cameras` + resolver período/escopo (generalizar `health-range.ts` + `resolveNodeIds`) | 3 |
| **2213** | `/kpis`, `/connectivity-gauge`, `/connectivity-distribution` | `CameraOperationalSnapshot` (agora) + rollup (trend); **intermitente = derivar de flapping/DEGRADED**; falta `COUNT GROUP BY connectionStatus` | 5 |
| **2214** | `/type-distribution`, `/analytic-capacity`, `/incident-severity` | `Camera.physicalCameraKind`/`analyticsCapabilities` + `CameraIncident.priority`; falta GROUP BY. **Mismatch**: Json tem dai/virtualLoop/ptz, contrato pede dai/atspm | 3 |
| **2215** | `/uptime` | `CameraAvailabilityDailyRollup` (onlineWindows/total) + window; falta somar N câmeras por bucket (composer é por-câmera) | 5 |
| **2216** | `/events-heatmap` | `CameraEventLog` (occurredAt/severity); falta `COUNT GROUP BY cameraId, time_bucket, severity` top-N | 5 |
| **2217** | `/map` | `Camera.lat/lng` + snapshot + `CameraEventLog`; falta endpoint dedicado geo+status+eventos | 3 |
| **2218** | `/bandwidth`, `/bandwidth-by-area`, `/bandwidth-comparison` | consumida = `avgBitrateMbps` (window/rollup), provisionada = `CameraStreamProfile.bitrateKbps`; **reconciliar** `/dashboard/bandwidth` (escalar) -> série por bucket/escopo | 5 |
| **2219** | `/connectivity/{intermittent,latency,degradation}` | latency/degradation do rollup; **intermittent sem dado pronto** (derivar flapping); `PrismaListQueryBuilder` | 5 |
| **Total** | | | **34** |

Follow-up fora da base: real-time de KPIs/gauge por WebSocket (`CameraStatusRealtimeService`), ~3 pts.

## Reuso concreto

- Workers de health (`apps/ms-cameras/src/health/workers/`) + tabelas de rollup: matéria-prima de uptime/connectivity/latency/bandwidth.
- `health-metrics.composer.ts`, `health-range.ts`, `availability.aggregator.ts`, `computeUptimeByCamera` (`cameras.repository.ts:124`): lógica de agregação a **generalizar de por-câmera pra multi-câmera**.
- `PrismaListQueryBuilder` (`@attlas/core-common` list-query). Molde de uso real: `apps/ms-organization/src/api-key/repositories/api-key.repository.ts` (`static LIST_DESCRIPTOR` + `buildWhere`/`buildOrderBy` + `ListPagination.paginate`). NÃO o ms-audit (repo custom).
- `BandwidthMonitoringService` + `IBandwidthMonitoringPayload` (reconciliar shape).
- `ITopologyNodeIdsClient` (escopo), `deriveCameraEventCategory` (`events/_shared/`).

## Validações em aberto

- Dimensão `routes` do contrato sem backing em ms-cameras (só área/subárea/NODE).
- Capacidade: Json dai/virtualLoop/ptz vs contrato dai/atspm.
- `/dashboard/bandwidth` escalar vs contrato de série - reescrever ou endpoint novo.
- "Intermitente" e eventos "ANALYTICS" sem fonte pronta.
- Real-time = TBD (follow-up).

## Notas por card (1 PR cada)

- [[SOFTWARE-2212 - Dashboard câmeras - SPEC ms-cameras + resolver período-escopo]]
- [[SOFTWARE-2213 - Dashboard câmeras - KPIs + gauge + distribuição conectividade]]
- [[SOFTWARE-2214 - Dashboard câmeras - donuts tipo + capacidade + incident-severity]]
- [[SOFTWARE-2215 - Dashboard câmeras - série de uptime]]
- [[SOFTWARE-2216 - Dashboard câmeras - heatmap de eventos]]
- [[SOFTWARE-2217 - Dashboard câmeras - marcadores do mapa]]
- [[SOFTWARE-2218 - Dashboard câmeras - banda]]
- [[SOFTWARE-2219 - Dashboard câmeras - tabelas de conectividade]]

## Referências

- Front: `apps/web-attlas/src/app/modules/cameras-dashboard/`. Contratos: `libs/contracts/src/lib/camera/dashboard/`. Backend: `apps/ms-cameras/src/{dashboard,health}/`.
- Edital: `obsidian/Docs/Attlas nova definicao modulos.docx.md` (4.6 Câmeras > Dashboard, linhas ~749-758). Módulo: `docs/modules/cameras.md` (RF-DSH-01).
- Épico ClickUp: SOFTWARE-1899. Cards: 2212-2219. Frente irmã: [[Eventos de câmeras - backend]].
