---
tags:
  - doc
  - cameras
  - ms-cameras
  - moc
servico: ms-cameras
fonte: apps/ms-cameras
atualizado: 2026-07-03
---

# ms-cameras — visão geral

Microsserviço NestJS **híbrido** (REST + consumidor Kafka + Socket.IO) do monorepo Attlas. É o **único backend do módulo Câmeras (CCTV)**. Diagrama geral: [[00 - Geral - Modulo Cameras.excalidraw|canvas]].

> [!abstract] Domínio
> Centraliza o ciclo de vida das câmeras IP da rede de trânsito: cadastro técnico, monitoramento de conectividade/saúde, controle PTZ, streaming ao vivo + Video Wall, e log de eventos/incidentes. A câmera é um **dispositivo de captura e transmissão, não de armazenamento** — gravação é do VMS externo; a analítica de vídeo é encaminhada ao módulo de Analytics. Integra o hardware **diretamente** (ONVIF obrigatório, RTSP, VAPIX/Axis) — não há connector dedicado: o serviço é ao mesmo tempo serviço de negócio e ponto de integração de hardware.
> Fontes de verdade no repo: `apps/ms-cameras/docs/SPEC.md` (spec técnica) e `docs/modules/cameras.md` (contexto de negócio, RF-*/RNF-*).

Bootstrap: `apps/ms-cameras/src/main.ts` (prefixo global `/api`, `ValidationPipe` + `ClassSerializerInterceptor` + `AllExceptionsFilter`; microserviço Kafka só conecta com `KAFKA_BROKERS`). Wiring: `apps/ms-cameras/src/app.module.ts`.

## Mapa de domínios

Cada domínio é uma pasta em `Docs/ms-cameras/` com notas ricas (visão geral · arquitetura e estratégias · fluxos · requisitos e SLA), no modelo da pasta Streaming.

| Domínio | O que faz | Doc | Código |
| --- | --- | --- | --- |
| Cameras (cadastro e ciclo de vida) | cadastro, listagem, update, replace, soft-delete, 4 estados, fabricantes | [[00 - Cameras]] | `src/cameras/` |
| Integração com dispositivo | fala com o hardware: ONVIF, RTSP, VAPIX (drivers + estratégias) | [[00 - Integração com dispositivo]] | `src/hardware/` |
| Saúde e monitoramento | healthcheck 24/7 (heartbeat, evaluator, janelas 5 min, rollup 90d, métricas) **+** push de status em tempo real (Socket.IO/Redis) | [[00 - Saúde e monitoramento]] | `src/health/`, `src/cameras/realtime/` |
| Streaming (HLS + WebRTC) | ffmpeg → mediamtx → WHEP/LL-HLS, codecs, fallbacks, diagnóstico, TTFF | [[00 - Streaming]] | `src/streaming/` |
| PTZ e presets | comandos PTZ, presets nomeados, automações/tours | [[00 - PTZ e presets]] | `src/cameras/` |
| Video Wall (+ banda) | layouts e cenas, ativação, escopo por org, monitoramento de banda | [[00 - Video Wall]] | `src/video-wall/`, `src/dashboard/bandwidth/` |
| Eventos, incidentes e alarmes | log de eventos, correlação (incidentes), emissão de alarme | [[00 - Eventos, incidentes e alarmes]] | `src/cameras/` |

Canvases por domínio em [[#Diagramas]].

## Superfície HTTP (resumo)

Prefixo `/api`. JWT no Kong, exceto `@Public()` (streaming + thumbnail).

- **Cameras** (`cameras`): `POST /cameras` (batch), `GET /cameras` (filtros topologia/tenant), `GET /cameras/video-wall`, `GET /cameras/incidents[/:id]`, `GET /cameras/bulk-template`, `GET /cameras/manufacturers[/:id/models]`, `GET /cameras/:id/thumbnail` (público), `GET/PATCH/DELETE /cameras/:id`, `GET /cameras/:id/status`, `GET /cameras/:id/events[/:eventId]`, `PATCH /cameras/:id/{safe-mode,state}`, `POST /cameras/:id/replace`, `POST /cameras/{validate-credentials,validate,batch-get}`, PTZ (`/ptz`, `/ptz/absolute`, `/ptz/continuous`, `/ptz/stop`), presets (`/presets…`), automações (`/automations…`).
- **Health**: `GET /cameras/health[/:cameraId]` (snapshot), `GET /cameras/:id/health?period=7d|30d|90d` (métricas, UC-026).
- **Streaming** (público): `GET/DELETE /cameras/:id/hls`, `GET /cameras/:id/hls/:quality/index.m3u8` + `/:segment`, `GET /cameras/:id/stream-diagnostics` (UC-027).
- **Video Wall** (`video-wall`): `GET /video-wall/layouts`, `GET/POST /video-wall/scenes`, `GET/PATCH/DELETE /video-wall/scenes/:id`, `POST /video-wall/scenes/:id/{activate,deactivate}`.
- **Dashboard**: `GET /dashboard/bandwidth?cameraIds=`.

## CQRS

~40 handlers (`*.command.ts`/`*.query.ts` + `*.handler.ts`) sob `src/*/handlers/`. Comandos mutam via repositórios; queries leem. Correlação e emissão de alarme **não** passam por CommandBus — são serviços dirigidos por listeners Kafka (ver [[00 - Eventos, incidentes e alarmes]]).

## Kafka

Constantes: `libs/contracts/src/lib/camera/cameras-topics.constant.ts` (+ `alarm/alarms-topics.constant.ts`).

| Direção | Tópico | Onde |
| --- | --- | --- |
| Consome | `attlas.cameras.event-ingest` | `cameras/events/camera-event-ingest.listener.ts` (UC-019) |
| Consome | `attlas.cameras.event-logged` | fan-out: `correlate-events` **e** `emit-alarm` |
| Consome | `attlas.cameras.incident-created` | `emit-alarm.listener.ts` |
| Consome (planejado) | `attlas.emergencies.ptz-command` | declarado no SPEC; **sem `@EventPattern` ainda** |
| Produz | `attlas.cameras.event-logged` | `RecordCameraEventService` (key=cameraId) |
| Produz | `attlas.cameras.incident-created` | `CorrelateEventsService` |
| Produz | `attlas.alarms.alarm-raised` | `EmitAlarmService` (alarmId UUID v5, replay-safe) |

`attlas.cameras.status-changed` e `.replaced` existem nas constantes/SPEC mas **não têm producer ativo** — status propaga via EventBus in-process + WebSocket, não Kafka.

## Persistência (Prisma)

Schema multi-arquivo em `src/database/schema/`; client gerado em `database/generated/prisma`.

- **Núcleo:** `Camera` (hub), `CameraCredential` (1:1 ONVIF/VAPIX), `CameraManufacturer` (catálogo, `code` único), `CameraStreamProfile` (perfil por papel PRIMARY/SECONDARY/TERTIARY).
- **Saúde:** `CameraOperationalSnapshot` (1:1 snapshot atual), `CameraHeartbeatHistory` (série de pings), `CameraAvailabilityWindow` (janela 5 min, único `(cameraId, windowStart)`), `CameraAvailabilityDailyRollup` (dia, único `(cameraId, date)`, horizonte 90d), `CameraTtffSample` (abertura de stream).
- **Eventos:** `CameraEventLog`, `CameraIncident`, `CameraIncidentEvent` (único `(incidentId, eventLogId)` = idempotência).
- **PTZ:** `CameraPtzPreset`, `CameraPtzTour`, `CameraPtzTourStep`.
- **Video Wall:** `VideoWallLayout`, `VideoWallScene`, `VideoWallSceneCell`.

## Integrações externas

- **ms-traffic-model** (HTTP) — `cameras/clients/traffic-model-topology.http-client.ts`: resolve node ids sob uma topologia para filtrar câmeras por área/subárea (UC-025); fail-closed 502.
- **ms-organization** (HTTP) — `cameras/clients/permissions.client.ts`: `assertAllowed('cameras:ptz')` antes de todo PTZ.
- **Hardware** — ONVIF (`hardware/drivers/onvif/`), VAPIX/Axis (`cameras/utils/vapix-*`, `health/utils/digest-auth`), estratégias RTSP/ONVIF (`hardware/communication/`).
- **mediamtx** — servidor de mídia (`streaming/services/mediamtx.client.ts`, `ffmpeg-session.service.ts`).
- **Redis** — cache de status (`redis/redis.module.ts`, `camera:status:<id>`).

## Diagramas

Canvases Excalidraw em `Diagramas/`:
[[00 - Geral - Modulo Cameras.excalidraw|Geral]] · [[01 - MOD-001 cameras-crud.excalidraw|CRUD]] · [[02 - MOD-002 multi-protocol-adapter.excalidraw|Multi-protocolo]] · [[03 - MOD-003 camera-health.excalidraw|Saúde]] · [[04 - MOD-004 hls-streaming-pipeline.excalidraw|Streaming]] · [[05 - MOD-004 ptz-presets.excalidraw|PTZ]] · [[06 - MOD-006 video-wall.excalidraw|Video Wall]] · [[07 - MOD-007 camera-events.excalidraw|Eventos]] · [[08 - MOD-008 bandwidth-monitoring.excalidraw|Banda]]
