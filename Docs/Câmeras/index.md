---
tags:
  - doc
  - ms-cameras
  - cameras
aliases:
  - "Câmeras"
  - "ms-cameras"
  - "ms-cameras - visão geral"
  - "Diagramas do ms-cameras"
atualizado: 2026-10-02
servico: ms-cameras
fonte: apps/ms-cameras
---

# Câmeras

Domínio do módulo Câmeras (CCTV). O backend inteiro dele é o `ms-cameras`, microsserviço NestJS **híbrido** (REST + consumidor Kafka + Socket.IO) do monorepo Attlas. Diagrama geral: [[Câmeras - Diagrama.excalidraw|canvas]].

> [!abstract] Domínio
> Centraliza o ciclo de vida das câmeras IP da rede de trânsito: cadastro técnico, monitoramento de conectividade/saúde, controle PTZ, streaming ao vivo + VMS (mosaico, ex Video Wall), e log de eventos/incidentes. A câmera é um **dispositivo de captura e transmissão, não de armazenamento** - gravação é do NVR externo; a analítica de vídeo pertence ao módulo [[Analítico]]. Integra o hardware **diretamente** (ONVIF, RTSP, VAPIX/Axis, ISAPI/Hikvision) - não há connector dedicado: o serviço é ao mesmo tempo serviço de negócio e ponto de integração de hardware.
> Fontes de verdade no repo: `apps/ms-cameras/docs/SPEC.md` (spec técnica) e `docs/modules/cameras.md` (contexto de negócio, RF-*/RNF-*).

Bootstrap: `apps/ms-cameras/src/main.ts` (prefixo global `/api`, `ValidationPipe` + `ClassSerializerInterceptor` + `AllExceptionsFilter`; adapter Redis do Socket.IO ligado antes do WS subir; microserviço Kafka só conecta com `KAFKA_BROKERS` e, se a conexão falhar, o serviço segue só com REST em vez de cair). Wiring: `apps/ms-cameras/src/app.module.ts`, que também liga `CoreAuthModule.forRoot({ enableSystemMembershipCache: true, enablePermissionEvaluation: true })`. São três gateways Socket.IO: `cameras-status`, `cameras-stream` e `cameras-analytics`.

## Mapa de subdomínios

Cada subdomínio é uma pasta em `Docs/Câmeras/`, com o `index.md` e as facetas na ordem da
[[Processo - Convenção de nomes]]: Arquitetura e estratégias, Fluxos, Requisitos e SLA, Runbook e Diagrama.

| Subdomínio | O que faz | Doc | Código |
| --- | --- | --- | --- |
| Cadastro (cadastro e ciclo de vida) | cadastro, listagem, update, replace, soft-delete, 4 estados, fabricantes | [[Câmeras - Cadastro]] | `src/cameras/` |
| Integração com dispositivo | fala com o hardware: ONVIF, RTSP, VAPIX, ISAPI (drivers + estratégias) | [[Câmeras - Integração com dispositivo]] | `src/hardware/` |
| Saúde e monitoramento | healthcheck 24/7 (heartbeat, evaluator, janelas 5 min, rollup 90d, métricas) **+** push de status em tempo real (Socket.IO/Redis) | [[Câmeras - Saúde e monitoramento]] | `src/health/`, `src/cameras/realtime/`, `src/availability/` |
| Streaming (HLS + WebRTC) | mediamtx puxa a câmera sob demanda (INT-027) → WHEP/LL-HLS, codecs, fallbacks, diagnóstico, TTFF | [[Câmeras - Streaming]] | `src/streaming/` |
| PTZ e presets | comandos PTZ, presets nomeados, automações/tours, comando PTZ vindo de plano de resposta | [[Câmeras - PTZ e presets]] | `src/cameras/`, `src/events/consumers/execution-plans-ptz-command/` |
| VMS, ex Video Wall (+ banda) | layouts e cenas, ativação, escopo por org, monitoramento de banda | [[Câmeras - VMS]] | `src/video-wall/`, `src/dashboard/bandwidth/` |
| Videowall externo (NovaStar H9) | alvo de exibição do VMS: processador, espelho de tela, projeção nativa, grupos, brilho e estado do painel | [[Câmeras - Videowall]] | `src/video-wall/targets/`, `src/events/consumers/execution-plans-videowall-command/` |
| Dashboard de câmeras | agregação read-time multi-câmera por período/escopo (KPIs, gauge e distribuição de conectividade, tabelas de intermitência/latência/degradação, donuts, heatmap, mapa, uptime, banda) + push realtime por widget (WS) | [[Câmeras - Dashboard]] | `src/dashboard/` |
| Eventos, incidentes e alarmes | log de eventos, correlação (incidentes), emissão de alarme, observações e reporte manual | [[Câmeras - Eventos, incidentes e alarmes]] | `src/events/` (domínio próprio desde 11/07) |

O módulo [[Analítico]] (Virtual Loop, ATSPM) **não é domínio deste serviço**: é módulo próprio, dependente
de Câmeras. O caminho embarcado dele mora dentro deste serviço, espalhado por sete pastas:
`src/analytics-realtime/`, `src/analytics-device/`, `src/camera-analytics/`, `src/analytic-instances/`,
`src/analytics-ingestion/`, `src/analytics-metrics-export/` e `src/virtual-loop-binding/`. O modo
servidor foi removido em `71d57f274b` (16/09), e o `ms-video-analytics` ficou como esqueleto em espera,
como diz o comentário de `apps/ms-video-analytics/src/app/app.module.ts`. Plano da frente a partir de
[[Attlas - Sprint 30]].

Canvases por domínio em [[#Diagramas]].

## Superfície HTTP (resumo)

Prefixo `/api`. O JWT é verificado no próprio serviço pelo guard global `JwtClaimsGuard` de
`@attlas/core-auth` (assinatura, `exp` e `iss`), e a maior parte dos controllers exige pertencimento ao
sistema do header `System-Id` com `@RequireSystemDuty()`. A maior parte das rotas de escrita soma
`@RequirePermission`, avaliado no `ms-organization`, e `@Audited`
(`apps/ms-cameras/src/shared/audit/audited.decorator.ts`), que emite a trilha de auditoria. Ficam fora do JWT só as rotas `@Public()`: `GET/DELETE /cameras/:id/hls`,
`GET /cameras/:id/thumbnail` e as `internal/*`, que trocam o JWT por `InternalServiceTokenGuard`. Os três
gateways WebSocket validam o JWT com `WsAuthGuard` nas mensagens de assinatura.

- **Cameras** (`cameras`): `POST /cameras` (batch), `GET /cameras` (filtros topologia/tenant), `GET /cameras/vms`, `GET /cameras/bulk-template`, `GET /cameras/manufacturers[/:id/models]`, `GET /cameras/availability` (contagem autorizada do rollup de disponibilidade, UC-072), `GET /cameras/:id/thumbnail` (público) e `GET /cameras/:id/frame` (quadro em resolução nativa, autenticado), `GET/PATCH/DELETE /cameras/:id`, `GET /cameras/:id/status`, `PATCH /cameras/:id/state`, `POST /cameras/:id/replace`, `PUT /cameras/locations` (lote), `POST /cameras/{validate-credentials,validate,batch-get}`, `GET /cameras/:id/media-profiles` (UC-031).
- **PTZ** (ver [[Câmeras - PTZ e presets]]): `POST /cameras/:id/ptz`, `/ptz/absolute`, `/ptz/continuous` e `/ptz/stop`; presets (`GET/POST /cameras/:id/presets`, `PATCH/DELETE /presets/:presetId`, `POST /presets/:presetId/goto`, `GET/POST /presets/:presetId/snapshot`, `GET /presets/:presetId/regions`); automações (`GET/POST /cameras/:id/automations`, `PUT/DELETE /automations/:automationId`, `PATCH /automations/:automationId/toggle`).
- **Eventos e incidentes** (ver [[Câmeras - Eventos, incidentes e alarmes]]): leitura por câmera (`GET /cameras/:id/events[/:eventId]`), a superfície cross-câmera (`GET /cameras/events`, `/events/stats`, `/events/export` em XLS ou PDF, `/events/:eventId`, `/events/:eventId/{timeline,recurrence,observations}`, `POST /events/:eventId/observations`, `POST /events/:eventId/report`), o tratamento do incidente do analítico (`PATCH /cameras/events/:eventId/treatment-status` e o lote `PATCH /cameras/events/treatment-status`) e `GET /cameras/incidents[/:id]` mais `GET /cameras/incidents/metrics`.
- **Health**: `GET /cameras/health[/:cameraId]` (snapshot), `GET /cameras/:id/health?period=7d|30d|90d` (métricas, UC-026).
- **Streaming** (ver [[Câmeras - Streaming]]): `GET/DELETE /cameras/:id/hls` (público; abre ou junta a sessão e devolve a URL WHEP e a de LL-HLS do mediamtx) e `GET /cameras/:id/stream-diagnostics` (UC-027, autenticado).
- **VMS** (`vms`, o path legado `video-wall` saiu em `c9766ab960`, 18/08): `GET /vms/layouts`, `GET/POST /vms/scenes`, `GET/PATCH/DELETE /vms/scenes/:id`, `POST /vms/scenes/:id/{activate,deactivate}`.
- **Videowall externo** (`vms/videowall`, ver [[Câmeras - Videowall]]): processador (`POST /processors`, `PATCH /processors/:id`, `GET /processors/current`), espelho (`POST/DELETE /mirror`, `PATCH /mirror/shares/:shareId`, `POST /mirror/publishing`, `PUT /mirror/arrangement`), grupos (`GET/POST /groups`, `POST /groups/:groupId/apply`, `DELETE /groups/:groupId`), `GET /capabilities`, `GET /state`, `GET /occupancy` e `PATCH /brightness`.
- **Dashboard** (16 rotas GET + 1 canal WS, ver [[Câmeras - Dashboard]]): `GET /dashboard/bandwidth?cameraIds=` e os widgets de conectividade, distribuição, heatmap, mapa, uptime e banda.
- **Analítico embarcado** (módulo [[Analítico]], hospedado aqui): `GET/PUT /cameras/:id/object-detection-regions` e `GET/PUT /cameras/:id/virtual-loops` (UC-054 a UC-057), `GET /cameras/:cameraId/analytics/:analyticId/capabilities`, instâncias em `cameras/analytics/instances*` e `GET /cameras/analytics/instance-cameras`, `POST /cameras/analytics/metrics/export`, o vínculo com detector físico em `cameras/:cameraId/virtual-loop-bindings` a imagem de evidência em `cameras/:id/evidence-images[/:evidenceId]` e, desde a #4889 (26/09), a imagem e o vídeo do incidente lidos do equipamento em `cameras/:id/events/:eventId/incident-media` e `cameras/:id/incident-media/{screenshots,recordings}/*` (UC-225).
- **Internas** (`@Public()` com `InternalServiceTokenGuard`, para outros serviços): `POST /internal/cameras/lookup`, `POST /internal/cameras/condition-state` (estado de até 200 câmeras para as condicionais do Plano de Execução, desde a #4298 de 23/09), `GET /internal/cameras/geo-search`, `GET /internal/cameras/availability/export` e `GET /internal/virtual-loop/sources`.

## CQRS

Cerca de 130 handlers (arquivos com `@CommandHandler`/`@QueryHandler`), a maioria sob `src/cameras/handlers/`, `src/video-wall/`, `src/dashboard/` e `src/events/`. Comandos mutam via repositórios; queries leem. Correlação e emissão de alarme **não** passam por CommandBus - são serviços dirigidos por listeners Kafka (ver [[Câmeras - Eventos, incidentes e alarmes]]).

## Kafka

Constantes: `libs/contracts/src/lib/camera/cameras-topics.constant.ts`, mais `alarm/alarms-topics.constant.ts`, `execution-plans/execution-plans-topics.constant.ts`, `devices/device-kafka-topics.constant.ts` e `virtual-loop/virtual-loop-topics.constant.ts`.

| Direção | Tópico | Onde |
| --- | --- | --- |
| Consome | `attlas.cameras.event-ingest` | `events/recording/` (UC-019) |
| Consome | `attlas.cameras.event-logged` | fan-out: `correlate-events` **e** `emit-alarm` |
| Consome | `attlas.cameras.incident-created` | `emit-alarm.listener.ts` |
| Consome | `attlas.execution-plans.ptz-command` | `events/consumers/execution-plans-ptz-command/` (comando PTZ vindo de plano de resposta) |
| Consome | `attlas.execution-plans.videowall-command` | `events/consumers/execution-plans-videowall-command/` |
| Consome | `attlas.virtual-loop.region-occupancy` | `analytics-realtime/region-occupancy.listener.ts` |
| Consome | `traffic-motion-detection.detections` | `analytics-realtime/device-stream.consumer.ts`, **broker do device**, fora do Kafka da plataforma (ver [[Analítico]]) |
| Consome (planejado) | `attlas.emergencies.ptz-command` | declarado nas constantes e no SPEC; **sem `@EventPattern`** e sem nenhuma referência em `apps/ms-cameras/src/` |
| Produz | `attlas.cameras.event-logged` | `RecordCameraEventService` (key=cameraId), para `ingest`, `analytics` e evento de saúde com causa correlacionável |
| Produz | `attlas.cameras.incident-created` | `CorrelateEventsService` |
| Produz | `attlas.alarms.alarm-raised` | `EmitAlarmService` (alarmId UUID v5, replay-safe) |
| Produz | `attlas.cameras.status-changed` | `cameras/realtime/camera-status-kafka.handler.ts`, só transição (a primeira avaliação depois do boot não publica) |
| Produz | `attlas.cameras.lifecycle` | `cameras/events/camera-lifecycle.publisher.ts`, chamado pelos handlers de CRUD, com buffer Redis de re-drenagem (`camera-lifecycle-buffer-drain.job.ts`) |
| Produz | `attlas.cameras.ptz-command-executed`/`-rejected` e `attlas.cameras.videowall-command-executed`/`-rejected` | `events/publishing/camera-events.publisher.ts`, eco ao `ms-execution-plans` |
| Produz | `attlas.virtual-loop.region-occupancy` | `analytics-realtime/region-occupancy.publisher.ts` |
| Produz | `attlas.audit.cameras` | `shared/audit/cameras-audit.publisher.ts` |
| Produz | `attlas.notifications.event-occurred` | `shared/audit/cameras-notification.publisher.ts`, via `@attlas/notifiable-events` |

`attlas.cameras.replaced` existe nas constantes e no SPEC mas continua sem producer (TODO em `cameras/handlers/replace-camera/replace-camera.handler.ts`, PROJ-002). `attlas.cameras.areaChanged` existe no contrato de devices e também não tem producer no `ms-cameras`.

## Persistência (Prisma)

Schema multi-arquivo em `src/database/schema/`; client gerado em `database/generated/prisma`.

- **Núcleo:** `Camera` (hub), `CameraCredential` (1:1 ONVIF/VAPIX), `CameraManufacturer` (catálogo, `code` único), `CameraStreamProfile` (perfil por papel PRIMARY/SECONDARY/TERTIARY), `CameraMediaProfile` (inventário descoberto no device, UC-031), `CameraEvidenceImage` (imagem de evidência de detecção, `camera/camera_evidence_image.prisma`). A coluna
  `Camera.safeMode` ficou sem código que a leia ou escreva desde que a rota de modo seguro saiu.
- **Saúde:** `CameraOperationalSnapshot` (1:1 snapshot atual), `CameraHeartbeatHistory` (série de pings), `CameraAvailabilityWindow` (janela 5 min, único `(cameraId, windowStart)`), `CameraAvailabilityDailyRollup` (dia, único `(cameraId, date)`, horizonte 90d), `CameraTtffSample` (abertura de stream), `CameraBitrateSample` (PROJ-006; desde `09d156bf5a`, 27/08, uma linha por câmera a cada janela de 5 min e só com medição real, isto é, quando algum espectador já tinha o relay aberto, retenção de 48 h; ver `persistBitrateSamples` em `health/workers/availability-window-sampler.service.ts`, porque o comentário do model ainda descreve a telemetria always-on que saiu).
- **Eventos:** `CameraEventLog`, `CameraEventObservation` (thread de dois níveis), `CameraEventTreatment` (tratamento do incidente do analítico, `audit/camera_event_treatment.prisma`), `CameraIncident`, `CameraIncidentEvent` (único `(incidentId, eventLogId)` = idempotência).
- **PTZ:** `CameraPtzPreset`, `CameraPtzTour`, `CameraPtzTourStep`.
- **VMS (ex Video Wall):** `VideoWallLayout`, `VideoWallScene`, `VideoWallSceneCell`.
- **Videowall externo:** `VideowallProcessor` e `VideowallProjectionSource` (`videowall_processor/`), `VideowallSession`, `VideowallOccupancyClosure` e `VideowallMirrorShare` (`videowall_mirror/`), `VideowallGroup` e `VideowallGroupTile` (`videowall_group/`).
- **Analítico:** `CameraAnalytic` e `CameraAnalyticRegion` (`camera_analytic/camera_analytic.prisma`, MOD-017, desde 25/08), `VirtualLoopDetectorBinding` (`camera_analytic/virtual_loop_detector_binding.prisma`), `AnalyticInstance` e `AnalyticInstanceAvailability` (`analytic_instance/`).

## Integrações externas

- **ms-traffic-model** (HTTP) - `cameras/clients/traffic-model-topology.http-client.ts`: resolve node ids sob uma topologia para filtrar câmeras por área/subárea (UC-025); fail-closed 502.
- **ms-organization** (HTTP) - por dois caminhos. O `CoreAuthModule` avalia todo `@RequirePermission` contra o `ms-organization` (`MS_ORGANIZATION_INTERNAL_URL` + `INTERNAL_SERVICE_TOKEN`, comentário em `app.module.ts`), e o `cameras/clients/permissions.client.ts` continua fazendo `assertAllowed('cameras:ptz')` no `PtzService` e no toggle de automação quando há operador.
- **Hardware** - ONVIF (`hardware/drivers/onvif/`), VAPIX/Axis (`cameras/utils/vapix-*`, `health/utils/digest-auth.utils.ts`), ISAPI/Hikvision (INT-018/019/020), estratégias RTSP/ONVIF (`hardware/communication/`).
- **mediamtx** - servidor de mídia (`streaming/services/mediamtx.client.ts`, `mediamtx-path-config.service.ts`, `live-stream-path.service.ts`). Desde o INT-027 (25/09) não há ffmpeg no ms-cameras: o mediamtx puxa o RTSP sob demanda.
- **Equipamento do analítico embarcado** - porta `AnalyticDevicePort` (MOD-020) com um adaptador por transporte em `analytics-device/adapters/` (`atspm-http`, `horus-http`, `virtual-loop-tcp` e o `absent` como objeto nulo), escolhido por `AnalyticDeviceSelector`, ver [[Analítico]].
- **Serviços do Analítico** (HTTP interno) - `ms-video-analytics` para o estado da frota de instâncias (`analytic-instances/analytic-fleet-status.client.ts`) e `ms-detector-history` para a guarda contra contagem dupla do vínculo com detector físico (`virtual-loop-binding/physical-detector.probe.ts`).
- **Redis** - cache de status (`redis/redis.module.ts`, `camera:status:<id>`) + adapter do Socket.IO para escala horizontal (`main.ts`).

## Diagramas

Cada desenho mora na pasta do subdomínio que ele descreve, com o nome `<subdomínio> - Diagrama`. O código
vale mais que o desenho, e o desenho vale menos que a nota.

> [!warning] Desenhos que descrevem caminho que não existe mais
> O de pipeline HLS mostra o HLS gerado e servido do disco pelo `ms-cameras`, que saiu: o MediaMTX puxa a
> câmera sob demanda e serve WebRTC e LL-HLS (ver [[Câmeras - Streaming]]). O de estratégia de codec e o
> geral ainda põem o ffmpeg entre a câmera e o MediaMTX, o que também não existe mais. O Dashboard não tem
> desenho.

[[Câmeras - Diagrama.excalidraw|Geral]] · [[Câmeras - Cadastro - Diagrama.excalidraw|CRUD]] · [[Câmeras - Integração com dispositivo - Diagrama.excalidraw|Multi-protocolo]] · [[Câmeras - Saúde e monitoramento - Diagrama.excalidraw|Saúde]] · [[Câmeras - Streaming - Diagrama - Pipeline HLS.excalidraw|Streaming]] · [[Câmeras - PTZ e presets - Diagrama.excalidraw|PTZ]] · [[Câmeras - VMS - Diagrama.excalidraw|Video Wall]] · [[Câmeras - Eventos, incidentes e alarmes - Diagrama.excalidraw|Eventos]] · [[Câmeras - Streaming - Diagrama - Banda e bitrate.excalidraw|Banda]] · [[Câmeras - Streaming - Diagrama - Estratégia de codec.excalidraw|Codec]]
