---
tags:
  - todo
  - attlas
  - sprint-21
sprint: Sprint 21 (22/06 a 28/06/2026)
card: SOFTWARE-1889
status: em andamento
---

# Attlas - Sprint 21 (22/06 a 28/06/2026)

Backend `ms-cameras` (squad 2). Task guarda-chuva: **SOFTWARE-1889** (dividas tecnicas ms-cameras).

Dev backend-only: o frontend da "Saude da Camera" ja esta construido consumindo mock; o trabalho aqui e entregar os endpoints/agregacoes que alimentam essas telas.

**3 frentes:**
1. Eventos de camera
2. Endpoints novos de "Saude da Camera" (Figma)
3. Busca de cameras por topologia (area / subarea) via ms-traffic-model

**Fontes de verdade:**
- Figma "Modulo - Cameras" / aba "Saude da Camera": 7 dias (por hora) node `1218-344565`; 30 dias (por semana) node `1630-391504`
- Planilha "saude de cameras" (anexada no card)
- Contratos em `libs/contracts/src/lib/camera/`

---

## ⚠️ Pendencia de contexto (resolver antes de codar)

A planilha "saude de cameras" ainda nao foi lida. As formulas e limiares abaixo foram derivados do Figma + contratos e precisam ser conferidos contra a planilha:

- [ ] Formula exata de SLA. No Figma aparecem dois numeros: "Uptime 99.6%" e "SLA / Online 90.5%" (o que dispara "SLA descumprido"). Confirmar o que conta: so Online, ou Online + Degradada. Contrato hoje: `uptimePercent = Online / (Online + Degradada + Offline)`.
- [ ] Meta de SLA (Figma: 99.0%): fixo por env ou configuravel por camera/sistema?
- [ ] Limiares "Degradada" vs "Offline" (ja existe evaluator com coeficiente Q; confirmar se batem com a planilha).
- [ ] Taxonomia de eventos da timeline (Stream restaurado, Perda de stream - RTSP timeout, Latencia elevada - 320ms): tipos, severidade, categoria.

---

## Frente 1 - Eventos de camera

Alimenta a aba "Log de Eventos" e o card "Eventos recentes".

**Ja existe (nao refazer):**
- `GET /api/cameras/:id/events` -> `ICameraEventLogPage` (UC-11)
- `GET /api/cameras/:id/events/:eventId` -> `ICameraEventDetail` (UC-18)
- Pipeline: record-camera-event (UC-019), correlate-events (UC-021), emit-alarm (UC-022)
- Worker de saude emite eventos in-process + broadcast WebSocket

**Falta (confirmar com a planilha):**
- [ ] Garantir geracao automatica de eventos a partir das transicoes de saude/stream para o event log persistido (`CameraEventLog`), nao so WS. Esperados: perda/retorno de stream, latencia elevada (com valor), offline/online. Conferir se `camera-health.worker.ts` ja chama `RecordCameraEventService` nessas transicoes.
- [ ] Campo de duracao no evento (Figma: "duracao 7 min"). Calcular duracao do incidente de stream ao restaurar e preencher `payload.durationMinutes`.
- [ ] Reconciliar enum de tipos/severidade/categoria com a planilha (`CameraEventType`, `CameraEventCategory`).

**Consumidor (frontend, fora do escopo backend, e o gatilho):**
- `getCameraEvents` ainda e MOCK em `cameras.service.ts` (~linha 320) -> deve chamar `GET /api/cameras/:id/events`.

---

## Frente 2 - Saude da Camera (endpoints novos) `MAIOR FRENTE`

Entregar o endpoint que alimenta a aba inteira do Figma.

**Contrato (ja existe, nao redesenhar):**
- `i-camera-health-metrics.ts` -> `ICameraHealthMetrics` (payload completo)
- `i-camera-bitrate-latency-sample.ts` (serie do grafico)
- `i-camera-availability-slice.ts` (online/degradada/offline: horas + %)
- `i-camera-daily-availability.ts` (barras empilhadas por dia)
- `camera-health-period.type.ts` (`'7d' | '30d' | '90d'`)

**Endpoint a implementar:**
`GET /api/cameras/:id/health?period=7d|30d|90d` -> `ICameraHealthMetrics`
(caminho exigido pelo frontend; stub em `cameras.service.ts:244` `getHealthMetrics` retorna mock). Atencao a ordem de rotas estaticas vs `:id` (ParseUUIDPipe). Hoje so existe `CameraHealthController` com snapshot atual, que nao serve a tela.

**Dados x fonte x gap:**
- [ ] uptime/online/degraded/offline (horas + %) e dailyAvailability (baldes por dia/semana). Fonte: historico de conectividade. **Gap:** heartbeat history so guarda ~24h (`heartbeat-history-cleanup.service.ts`). 7d/30d/90d nao cabem. **Decisao:** tabela de rollup de disponibilidade (`CameraAvailabilityRollup`: por camera, por dia, segundos online/degradada/offline) via cron diario, mantendo heartbeat cru de curto prazo.
- [ ] avgLatencyMs + serie de latencia. Fonte: heartbeat `latencyMs`. Mesmo problema de retencao -> rollup.
- [ ] avgBitrateMbps + currentBitrateMbps + bitrateLatencyTimeSeries. Fonte hoje: bandwidth-monitoring agrega bitrate atual. **Gap:** sem bitrate historico. Amostrar/persistir bitrate ao longo do tempo (por sessao ou periodico go2rtc/ffmpeg).
- [ ] ttffMs (time to first frame / "Abertura do stream"). **Gap:** nao e medido. Instrumentar `streaming/ffmpeg-session.service` (tempo da requisicao ate o 1o segmento HLS) e persistir por sessao.
- [ ] activeSessions. Fonte: `StreamSessionRegistry.all()` (contagem atual ja em memoria). KPI instantanea basta o registry.
- [ ] slaTargetPercent / slaDeviationPercent (`slaDeviation = uptime - slaTarget`; ver pendencia da planilha).

**Provaveis entregas (subdividir em atomicas):**
- [ ] Migration(s) Prisma: rollup de disponibilidade + persistencia de bitrate/ttff.
- [ ] Worker/cron de agregacao (rollup diario; amostragem de bitrate).
- [ ] Instrumentacao de TTFF no pipeline de streaming.
- [ ] Query handler CQRS `getHealthMetrics(cameraId, period)` + repository de leitura agregada.
- [ ] Rota na controller + service.
- [ ] Testes (suite completa do projeto).

---

## Frente 3 - Busca de cameras por topologia (area / subarea)

Filtrar/buscar cameras por area e subarea, cuja topologia vem do ms-traffic-model.

**Estado atual:**
- ms-traffic-model e dono da topologia. Expoe `GET /api/traffic-model/topology` (raiz) e `GET /api/traffic-model/topology/:type/:id` (area -> subarea -> no -> cameras). Branch NODE ja enriquece cameras chamando ms-cameras (RF-INT-10).
- Associacao no<->camera vive no ms-traffic-model (tabela `NodeCamera`).
- Em ms-cameras a Camera so tem `trafficElementId` (id do no), sem area/subarea. Existe `@@index([trafficElementId])`.
- Nao existe HTTP client ms-cameras -> ms-traffic-model (so o reverso).

**Objetivo:** `GET /api/cameras` filtravel por area/subarea.
- [ ] **Opcao A (recomendada):** filtro `areaId/subareaId` em list-cameras. ms-cameras chama ms-traffic-model para resolver os node ids sob a area/subarea e filtra `trafficElementId IN (...)`.
    - [ ] novo HTTP client ms-cameras -> ms-traffic-model (espelhar o `CamerasHttpClient` inverso)
    - [ ] query params areaId/subareaId no list-cameras (handler/query/dto)
    - [ ] `where trafficElementId in (...)` no `cameras.repository`
    - [ ] definir resiliencia (fail-open vs fail-closed se o traffic-model cair)
- [ ] Opcao B: usar o drill-down de topologia existente (ja devolve cameras por no) sem mexer no ms-cameras. Descartar se o pedido e busca por area/subarea na listagem de cameras.
- [ ] Reusar utilitarios de contrato (`IPaginatedResponse`, paginacao/sorting) em vez de criar campos novos.

---

## Ordem sugerida / dependencias

1. [ ] Conferir a planilha "saude de cameras" e fechar formulas/taxonomia (destrava Frentes 1 e 2).
2. [ ] Frente 3 (busca por topologia) - menor e isolada.
3. [ ] Frente 1 (eventos) - geracao automatica + duracao.
4. [ ] Frente 2 (saude) - maior; depende de rollup/telemetria. Quebrar em:
    - [ ] 4a. retencao/rollup de disponibilidade + latencia
    - [ ] 4b. bitrate historico + TTFF
    - [ ] 4c. endpoint getHealthMetrics + serie + SLA

---

## Processo (SDD + gate de qualidade)

- SDD: cada item gera spec atomica em `apps/ms-cameras/docs/atomic/` antes do codigo (UC-* REST, PROJ-* handler Kafka/cron). Default 1 atomica = 1 PR.
- Branch: `cameras/<prefix>/<task-id>` (cross-service usa `shared/`).
- PR sempre com base `develop`, so o commit da task.
- Gate antes do PR: suite completa do projeto tocado (`nx test/lint/build ms-cameras`), nao so affected. 0 erros de lint.
- Nada de HttpException/Error crus nos services (usar DomainException).
