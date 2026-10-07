---
tags:
  - doc
  - cameras
  - arquitetura
aliases:
  - "Câmeras - Arquitetura e estratégias"
atualizado: 2026-10-07
servico: ms-cameras
fonte: apps/ms-cameras
---

# Câmeras - Arquitetura e estratégias

Volta para [[Câmeras]].

## Resumo

O backend inteiro do domínio é o `ms-cameras`, um microsserviço NestJS híbrido: REST sob o prefixo `/api`,
consumidor Kafka e três namespaces Socket.IO. O serviço é ao mesmo tempo regra de negócio e ponto de
integração com o hardware (ONVIF, RTSP, VAPIX da Axis, ISAPI da Hikvision); não existe connector de câmera. O
vídeo ao vivo sai do MediaMTX, que puxa a câmera sob demanda, e o `ms-cameras` só configura o caminho e
devolve onde tocar. A gravação é do NVR externo. O analítico embarcado mora neste serviço, mas é do domínio
[[Analítico]]. Esta nota cobre o que é comum a todos os subdomínios; o detalhe de cada um está na nota de
arquitetura dele.

## Onde está no código

Caminhos relativos a `apps/ms-cameras/src/` quando não começam por `apps/`, `libs/` ou `docs/`.

| Caminho | Papel | Subdomínio |
| --- | --- | --- |
| `main.ts` | Bootstrap do serviço (ordem na seção seguinte) | todos |
| `app.module.ts` | Liga todos os módulos, o `CoreAuthModule.forRoot({ enableSystemMembershipCache: true, enablePermissionEvaluation: true })` e um único `ScheduleModule.forRoot()` | todos |
| `config/env.validation.ts` | Valida as variáveis de ambiente no boot; variável obrigatória ausente ou inválida aborta o boot | todos |
| `cameras/` | Cadastro, ciclo de vida, PTZ, presets, automações, imagem de evidência e status em tempo real (`cameras/realtime/`) | [[Câmeras - Cadastro\|Cadastro]], [[Câmeras - PTZ e presets\|PTZ e presets]], [[Câmeras - Saúde e monitoramento\|Saúde]] |
| `hardware/` | Driver ONVIF (`hardware/drivers/onvif/`) e estratégias de comunicação (`hardware/communication/`) | [[Câmeras - Integração com dispositivo\|Integração com dispositivo]] |
| `health/`, `availability/` | Monitoramento 24 horas, janelas de disponibilidade, rollup diário e contagem autorizada | [[Câmeras - Saúde e monitoramento\|Saúde e monitoramento]] |
| `streaming/` | Configuração do caminho no MediaMTX, diagnóstico e gateway `cameras-stream` | [[Câmeras - Streaming\|Streaming]] |
| `video-wall/` | VMS (layouts e cenas) e, em `video-wall/targets/`, o videowall externo NovaStar H9 | [[Câmeras - VMS\|VMS]], [[Câmeras - Videowall\|Videowall]] |
| `dashboard/` | Agregação dos widgets do dashboard e push ao vivo | [[Câmeras - Dashboard\|Dashboard]] |
| `events/` | Log de eventos, correlação em incidente, emissão de alarme e consumidores dos comandos de plano de execução | [[Câmeras - Eventos, incidentes e alarmes\|Eventos]] |
| `internal-api/` | Rotas internas para outros serviços | Cadastro, Saúde |
| `shared/audit/` | Auditoria (`cameras-audit.publisher.ts`), notificação (`cameras-notification.publisher.ts`) e o decorator `@Audited` | todos |
| `shared/tenancy/camera-tenancy.service.ts` | `assertCameraInSystem`, a guarda de escopo da câmera por sistema | todos |
| `shared/kafka/` | `KafkaOptionsFactory` do consumidor e `CamerasDlqPublisher` da fila-morta | todos |
| `shared/authorization/authorization-surface.spec.ts`, `shared/audit/audit-surface.spec.ts` | Testes que travam a superfície de autorização e de auditoria de cada controller | todos |
| `redis/redis.module.ts` | Cliente Redis do serviço | todos |
| `database/schema/` | Schema Prisma em vários arquivos; client gerado em `database/generated/prisma` | todos |
| `analytic-acom-destination/`, `analytic-device-binding/`, `analytic-incident-media/`, `analytic-instances/`, `analytic-network-discovery/`, `analytics-device/`, `analytics-ingestion/`, `analytics-metrics-export/`, `analytics-realtime/`, `analytics-region-metrics/`, `camera-analytics/`, `camera-view-preferences/`, `incident-criticality/`, `lpr-capability/`, `server-analytics/`, `virtual-loop-binding/` | Analítico embarcado, servidor Neural Labs, leitura de placas e as preferências da tela de Detecção | [[Analítico]] |
| `libs/contracts/src/lib/camera/` | Interfaces, enums, validações e tópicos Kafka do domínio | todos |
| `apps/ms-cameras/.env.example` | Variáveis de ambiente com o valor padrão | todos |
| `apps/ms-cameras/docs/SPEC.md` | Spec técnica do serviço | todos |
| `docs/modules/cameras.md` | Contexto de negócio, requisitos funcionais e não funcionais | todos |

### Ordem do bootstrap

1. `NestFactory.create` sobe com `bodyParser: false`, e `applyMsCamerasBodyParsers` monta os parsers: o da
   exportação de métricas do analítico aceita corpo maior que o padrão.
2. `setupObservability` e depois `setupI18n`.
3. O adapter Redis do Socket.IO (`RedisIoAdapter`) é ligado antes de qualquer gateway subir; sem Redis, cai
   no adapter em memória, que só atende uma réplica.
4. CORS pela lista de `CORS_ALLOWED_ORIGINS`, shutdown hooks e prefixo `api`, com `health/live`,
   `health/ready` e `metrics` fora dele.
5. `ValidationPipe` global (whitelist, campo desconhecido recusado, conversão implícita),
   `ClassSerializerInterceptor` e `AllExceptionsFilter`.
6. `app.init()` antes de qualquer consumidor Kafka.
7. Com `KAFKA_BROKERS` definido, conecta o microserviço Kafka. Se a conexão ou a assinatura falha, o erro vai
   para o log e o serviço segue só com REST.
8. `listen` na `PORT` (3300 no `.env.example`).

## Contratos

### Autenticação e autorização

| Camada | Mecanismo | Onde |
| --- | --- | --- |
| JWT | Guard global `JwtClaimsGuard` de `@attlas/core-auth`: assinatura, `exp` e emissor verificados no próprio serviço | `app.module.ts` |
| Pertencimento ao sistema | `@RequireSystemDuty()` confere que o requisitante é membro do sistema do header `System-Id`, com cache Redis e fallback no `ms-organization`; o MASTER da plataforma passa | controllers |
| Permissão funcional | `@RequirePermission` avaliado no `ms-organization` (`MS_ORGANIZATION_INTERNAL_URL` e `INTERNAL_SERVICE_TOKEN`), fail-closed; avaliador fora do ar responde 503 `PERMISSION_RESOLVER_UNAVAILABLE` | rotas de escrita |
| Escopo da linha | `@SystemId()` lê o header e responde 400 sem ele; câmera de outro sistema responde 404, sem revelar que existe | `shared/tenancy/camera-tenancy.service.ts` |
| Trilha de auditoria | `@Audited` declara o par de auditoria da rota para o teste de superfície; quem publica é o handler | `shared/audit/audited.decorator.ts` |
| Rotas públicas | `@Public()` sem JWT: `GET /cameras/:id/hls` e `GET /cameras/:id/thumbnail` (um `<img src>` não carrega header) | `streaming/streaming.controller.ts`, `cameras/cameras.controller.ts` |
| Rotas internas | `@Public()` com `InternalServiceTokenGuard`: token de serviço no lugar do JWT | tabela de rotas internas abaixo |
| WebSocket | `WsAuthGuard` valida o JWT nas mensagens de assinatura | `cameras/realtime/guards/ws-auth.guard.ts` |

### Rotas HTTP por grupo

Prefixo `/api`. O método, a permissão e o erro de cada rota estão na nota de arquitetura do subdomínio.

| Grupo | Rotas | Controller | Detalhe |
| --- | --- | --- | --- |
| Cadastro | `POST /cameras` (lote), `GET /cameras`, `GET/PATCH/DELETE /cameras/:id`, `PATCH /cameras/:id/state`, `POST /cameras/:id/replace`, `PUT /cameras/locations`, `POST /cameras/validate-credentials`, `POST /cameras/validate`, `POST /cameras/batch-get`, `GET /cameras/bulk-template`, `GET /cameras/manufacturers`, `GET /cameras/manufacturers/:id/models`, `GET /cameras/:id/media-profiles`, `GET /cameras/:id/thumbnail`, `GET /cameras/:id/frame` | `CamerasController` | [[Câmeras - Cadastro - Arquitetura e estratégias]] |
| PTZ e presets | `POST /cameras/:id/ptz`, `/ptz/absolute`, `/ptz/continuous`, `/ptz/stop`; `GET/POST /cameras/:id/presets`, `PATCH/DELETE /cameras/:id/presets/:presetId`, `POST .../goto`, `GET/POST .../snapshot`, `GET .../regions`; `GET/POST /cameras/:id/automations`, `PUT/DELETE .../automations/:automationId`, `PATCH .../toggle` | `CamerasController` | [[Câmeras - PTZ e presets]] |
| Saúde | `GET /cameras/:id/status`, `GET /cameras/health`, `GET /cameras/health/:cameraId`, `GET /cameras/:id/health`, `GET /cameras/availability` | `CamerasController`, `CameraHealthController`, `CameraHealthMetricsController` | [[Câmeras - Saúde e monitoramento]] |
| Streaming | `GET /cameras/:id/hls`, `GET /cameras/:id/stream-diagnostics` | `StreamingController`, `StreamDiagnosticsController` | [[Câmeras - Streaming]] |
| Eventos e incidentes | `GET /cameras/:id/events`, `GET /cameras/:id/events/:eventId`, `GET /cameras/events`, `/events/stats`, `/events/export`, `/events/:eventId`, `/events/:eventId/timeline`, `/events/:eventId/recurrence`, `GET/POST /events/:eventId/observations`, `POST /events/:eventId/report`, `PATCH /cameras/events/:eventId/treatment-status`, `PATCH /cameras/events/treatment-status`, `GET /cameras/incidents`, `/incidents/metrics`, `/incidents/:id` | `CamerasController` | [[Câmeras - Eventos, incidentes e alarmes]] |
| VMS | `GET /vms/layouts`, `GET/POST /vms/scenes`, `GET/PATCH/DELETE /vms/scenes/:id`, `POST /vms/scenes/:id/activate`, `POST /vms/scenes/:id/deactivate`, `GET /cameras/vms` | `VideoWallController`, `CamerasController` | [[Câmeras - VMS]] |
| Videowall externo | sob `/vms/videowall`: `POST /processors`, `PATCH /processors/:id`, `GET /processors/current`; `POST/DELETE /mirror`, `PATCH /mirror/shares/:shareId`, `POST /mirror/publishing`, `PUT /mirror/arrangement`; `GET/POST /groups`, `POST /groups/:groupId/apply`, `DELETE /groups/:groupId`; `GET /capabilities`, `GET /state`, `GET /occupancy`, `PATCH /brightness` | `VideowallProcessorController`, `VideowallMirrorController`, `VideowallGroupController`, `VideowallCapabilitiesController`, `VideowallStateController` | [[Câmeras - Videowall]] |
| Dashboard | 16 rotas GET sob `/dashboard` | sete controllers em `dashboard/` | [[Câmeras - Dashboard - Arquitetura e estratégias]] |
| Analítico: regiões e laço virtual | `GET/PUT /cameras/:id/object-detection-regions`, `GET/PUT /cameras/:id/virtual-loops`, `POST/GET /cameras/:cameraId/virtual-loop-bindings`, `DELETE .../virtual-loop-bindings/:id` | `CameraRegionsController`, `VirtualLoopBindingController` | [[Analítico]] |
| Analítico: equipamento | `GET /cameras/:cameraId/analytics/:analyticId/capabilities`, `GET .../acom-link`, `GET/POST /cameras/:cameraId/analytics/device-binding`, `GET /cameras/:id/analytics/device-metrics`, `GET /cameras/:id/analytics/region-metrics` | `AnalyticCapabilitiesController`, `AnalyticAcomLinkController`, `AnalyticDeviceBindingController`, `CameraDeviceMetricsController`, `CameraRegionMetricsController` | [[Analítico]] |
| Analítico: instâncias | `GET/POST /cameras/analytics/instances`, `GET/PATCH/DELETE .../instances/:instanceId`, `GET .../instances/:instanceId/events`, `PUT .../instances/:instanceId/cameras`, `GET /cameras/analytics/instance-cameras`, `POST /cameras/analytics/network-discoveries`, `POST .../network-discoveries/test`, `POST /cameras/analytics/metrics/export`, `GET/PUT /cameras/analytics/incident-criticality` | `AnalyticInstancesController`, `AnalyticNetworkDiscoveryController`, `AnalyticsMetricsExportController`, `IncidentCriticalityController` | [[Analítico]] |
| Analítico: Neural Labs e placas | sob `/cameras/analytics/neural-labs`: `GET /cameras`, `POST /instances`, `PATCH /instances/:instanceId`, `PUT /instances/:instanceId/camera-mappings`, `POST .../camera-mappings/import`, `DELETE .../camera-mappings/:cameraId`; `GET /cameras/:cameraId/lpr-capability`, `PUT/DELETE .../lpr-capability/manual`, `GET /cameras/:cameraId/server-analytics`, `PUT/DELETE .../server-analytics/:type/manual` | `NeuralLabsCameraMappingController`, `CameraLprCapabilityController`, `CameraServerAnalyticsController` | [[Analítico]] |
| Analítico: evidência e mídia | `POST/GET /cameras/:id/evidence-images`, `GET .../evidence-images/:evidenceId`, `GET /cameras/:id/events/:eventId/incident-media`, `GET /cameras/:id/incident-media/screenshots/:sourceId/:fileName`, `GET /cameras/:id/incident-media/recordings/:recordingId` | `CamerasController`, `IncidentMediaController` | [[Analítico]] |
| Preferências da tela de Detecção | `GET/PUT /cameras/:id/view-preferences`, por operador e câmera | `CameraViewPreferencesController` | [[Analítico]] |

### Rotas internas

Todas com `@Public()` e `InternalServiceTokenGuard`, sob o prefixo `/api` como as demais.

| Rota | Quem chama | Para quê | Spec |
| --- | --- | --- | --- |
| `GET /internal/cameras` | `ms-inventory` | Listagem paginada da tela para a carga inicial do inventário; `systemId` obrigatório na query, sem filtro de área | UC-230 |
| `POST /internal/cameras/lookup` | `ms-selective-priority`, `ms-alarms`, `ms-execution-plans`, `ms-video-analytics` | Id, nome e IP por `ids` ou `search` | CROSS-094 |
| `GET /internal/cameras/geo-search` | `ms-execution-plans` | Câmeras num retângulo geográfico | CROSS-064 |
| `GET /internal/cameras/:id/resources` | `ms-execution-plans` | Candidatos para a busca de recursos | CROSS-147 |
| `POST /internal/cameras/condition-state` | `ms-execution-plans` | Estado de até 200 câmeras para as condicionais do plano | CROSS-140 |
| `POST /internal/cameras/status` | `ms-execution-plans` | Estado e falha por candidato | CROSS-185 |
| `GET /internal/cameras/availability/export` | `ms-reports` | Exportação do rollup de disponibilidade | UC-072 |
| `POST /internal/cameras/:cameraId/lpr-observations`, `POST /internal/cameras/lpr-capabilities/lookup`, `GET /internal/cameras/neural-labs/auto-link-candidates` | `ms-video-analytics` | Leitura de placas e vínculo automático da Neural Labs | - |
| `GET/PUT /internal/camera-analytics/:analyticId/acom-destination` | `ms-video-analytics` | Destino ACOM do analítico | - |
| `GET /internal/virtual-loop/sources` | `ms-video-analytics` | Fontes do laço virtual | - |

### WebSocket

| Namespace | Path | Gateway | Uso |
| --- | --- | --- | --- |
| `cameras-status` | `/api/cameras/status/realtime` | `CameraStatusGateway` (`cameras/realtime/camera-status.gateway.ts`) | Status de câmera, videowall, incidentes e o push do dashboard |
| `cameras-stream` | `/api/cameras/stream/realtime` | `StreamingGateway` (`streaming/streaming.gateway.ts`) | Estado do stream por câmera (`camera.join`, `camera.leave`, `status.changed`) |
| `cameras-analytics` | `/api/cameras/analytics/realtime` | `CameraAnalyticsGateway` e `NetworkDiscoveryGateway` | Detecções ao vivo e progresso da varredura de rede do analítico |

O namespace e o path próprios existem para o Kong ter uma rota por gateway; o path padrão `/socket.io` não é
roteável por serviço no gateway.

### Tópicos Kafka consumidos

Constantes em `libs/contracts/src/lib/camera/cameras-topics.constant.ts` e nos arquivos de tópico dos domínios
produtores.

| Tópico | Consumidor | Subdomínio |
| --- | --- | --- |
| `attlas.cameras.event-ingest` | `events/recording/camera-event-ingest.listener.ts` | Eventos |
| `attlas.cameras.event-logged` | `events/consumers/correlate-events/` e `events/consumers/emit-alarm/`, os dois sobre o mesmo tópico | Eventos |
| `attlas.cameras.incident-created` | `events/consumers/emit-alarm/emit-alarm.listener.ts` | Eventos |
| `attlas.execution-plans.ptz-command` | `events/consumers/execution-plans-ptz-command/` | PTZ e presets |
| `attlas.execution-plans.videowall-command` | `events/consumers/execution-plans-videowall-command/` | Videowall |
| `attlas.node-devices.associated`, `attlas.node-devices.dissociated` | `cameras/consumers/node-camera-association/` | Cadastro |
| `attlas.links.updated`, `attlas.links.deleted` | `virtual-loop-binding/readdress/link-detector-address-changes.listener.ts` | Analítico |
| `attlas.virtual-loop.region-occupancy` | `analytics-realtime/region-occupancy.listener.ts` | Analítico |
| `traffic-motion-detection.detections` | `analytics-realtime/device-stream.consumer.ts`, no broker do equipamento (`ANALYTICS_STREAM_BROKERS`), fora do Kafka da plataforma | Analítico |

### Tópicos Kafka produzidos

| Tópico | Produtor | Quando |
| --- | --- | --- |
| `attlas.cameras.event-logged` | `events/publishing/camera-events.publisher.ts`, chamado por `RecordCameraEventService` | Evento gravado vindo de ingestão externa, do analítico ou de saúde com causa correlacionável; chave `cameraId` |
| `attlas.cameras.incident-created` | `CorrelateEventsService` | Incidente aberto pela correlação |
| `attlas.alarms.alarm-raised` | `EmitAlarmService` | Alarme; o `alarmId` é UUID v5 determinístico, então o replay do Kafka gera o mesmo id |
| `attlas.cameras.status-changed` | `cameras/realtime/camera-status-kafka.handler.ts` | Só transição de conectividade; a primeira avaliação depois do boot não publica |
| `attlas.cameras.lifecycle` | `cameras/events/camera-lifecycle.publisher.ts` | Cadastro, edição e remoção; falha vai para uma fila Redis drenada por `cameras/events/camera-lifecycle-buffer-drain.job.ts` |
| `attlas.cameras.ptz-command-executed`, `attlas.cameras.ptz-command-rejected` | `events/publishing/camera-events.publisher.ts` | Resposta ao comando PTZ do `ms-execution-plans` |
| `attlas.cameras.videowall-command-executed`, `attlas.cameras.videowall-command-rejected` | `events/publishing/camera-events.publisher.ts` | Resposta ao comando de videowall do `ms-execution-plans` |
| `attlas.virtual-loop.region-occupancy` | `analytics-realtime/region-occupancy.publisher.ts` | Ocupação de região lida do analítico embarcado |
| `attlas.audit.cameras` | `shared/audit/cameras-audit.publisher.ts`, sobre `@attlas/audit-events` | Todo gesto auditado |
| `attlas.notifications.event-occurred` | `shared/audit/cameras-notification.publisher.ts`, sobre `@attlas/notifiable-events` | Evento notificável |
| `attlas.dlq.cameras` | `shared/kafka/cameras-dlq.publisher.ts` | Mensagem que o serviço não sabe ler, com o tópico de origem no envelope |

> [!warning] Tópicos declarados sem implementação
> `attlas.cameras.replaced` está nas constantes e no SPEC, mas não tem produtor (TODO em
> `cameras/handlers/replace-camera/replace-camera.handler.ts`). `attlas.emergencies.ptz-command` está nas
> constantes e não tem consumidor. `attlas.cameras.areaChanged` está em
> `libs/contracts/src/lib/devices/device-kafka-topics.constant.ts` e o `ms-cameras` não o produz.

### Banco

Schema em `database/schema/`, uma pasta por grupo.

| Grupo | Models | Pasta |
| --- | --- | --- |
| Núcleo | `Camera`, `CameraCredential`, `CameraManufacturer` | `camera/` |
| Perfis | `CameraStreamProfile` (o que o player consome), `CameraMediaProfile` (inventário descoberto no equipamento) | `stream/` |
| Saúde | `CameraOperationalSnapshot` | `operational_snapshot/` |
| Saúde | `CameraHeartbeatHistory` | `heartbeat/` |
| Saúde | `CameraAvailabilityWindow`, `CameraAvailabilityDailyRollup`, `CameraTtffSample`, `CameraBitrateSample` | `availability/` |
| Eventos | `CameraEventLog`, `CameraEventObservation`, `CameraEventTreatment` | `audit/` |
| Eventos | `CameraIncident`, `CameraIncidentEvent`, `AnalyticsIncidentCriticality` | `incident/` |
| PTZ | `CameraPtzPreset`, `CameraPtzTour`, `CameraPtzTourStep` | `ptz/` |
| VMS | `VideoWallLayout`, `VideoWallScene`, `VideoWallSceneCell` | `video_wall/` |
| Videowall externo | `VideowallProcessor`, `VideowallProjectionSource` | `videowall_processor/` |
| Videowall externo | `VideowallSession`, `VideowallOccupancyClosure`, `VideowallMirrorShare` | `videowall_mirror/` |
| Videowall externo | `VideowallGroup`, `VideowallGroupTile` | `videowall_group/` |
| Analítico | `CameraAnalytic`, `CameraAnalyticRegion`, `VirtualLoopDetectorBinding` | `camera_analytic/` |
| Analítico | `AnalyticInstance`, `AnalyticInstanceAvailability` | `analytic_instance/` |
| Analítico | `CameraRegionMinuteMetric` | `analytics_metric/` |
| Analítico | `CameraEvidenceImage`, `CameraLprCapability`, `CameraServerAnalytic`, `CameraViewPreference` | `camera/` |

### Integrações externas

| Destino | Transporte | Código | Para quê |
| --- | --- | --- | --- |
| `ms-traffic-model` | HTTP, `MS_TRAFFIC_MODEL_URL` | `cameras/clients/traffic-model-topology.http-client.ts`, `cameras/clients/traffic-model-node-lookup.http-client.ts`, `cameras/clients/cached-topology-node-ids.client.ts`, `virtual-loop-binding/clients/traffic-model-detectors.client.ts` | Nós sob área e subárea para filtro e dashboard, nome da interseção na listagem, detectores do vínculo do laço virtual; queda no filtro por topologia responde 502 |
| `ms-organization` | HTTP, `MS_ORGANIZATION_INTERNAL_URL` e `INTERNAL_SERVICE_TOKEN` | `CoreAuthModule`, `availability/topological-cut/organization-camera-device-ids.http-client.ts`, `shared/audit/audit-metadata-client.module.ts` | Permissão e pertencimento, ids de dispositivo do recorte topológico da disponibilidade, identidade do ator na auditoria |
| `ms-video-analytics` | HTTP, `MS_VIDEO_ANALYTICS_INTERNAL_URL` | `analytic-instances/analytic-fleet-status.client.ts`, `server-analytics/clients/video-analytics-neural.client.ts`, `analytic-acom-destination/clients/video-analytics-acom-link.client.ts` | Estado da frota de instâncias, servidor Neural Labs e vínculo com a ACOM |
| `ms-detector-history` | HTTP, `MS_DETECTOR_HISTORY_INTERNAL_URL` | `virtual-loop-binding/physical-detector.probe.ts` | Guarda contra contagem dupla no vínculo do laço virtual com detector físico |
| `ms-connector-virtual-loop` | HTTP, `VIRTUAL_LOOP_CONNECTOR_URL` | `analytics-device/adapters/virtual-loop-tcp/virtual-loop-connector.client.ts` | Comandos ao equipamento do laço virtual legado |
| MediaMTX | HTTP na API de controle, `MEDIAMTX_API_URL` | `streaming/services/mediamtx.client.ts`, `streaming/services/mediamtx-path-config.service.ts`, `streaming/services/live-stream-path.service.ts` | Configuração do caminho de cada câmera; o MediaMTX puxa o RTSP sob demanda |
| Câmeras | ONVIF, VAPIX, ISAPI, RTSP | `hardware/drivers/onvif/`, `hardware/communication/`, `cameras/utils/vapix-ptz.utils.ts`, `cameras/utils/vapix-zoom.utils.ts`, `cameras/services/hikvision-isapi-probe.util.ts`, `health/clients/` | Sondagem, PTZ, perfis, monitoramento e eventos do equipamento |
| Equipamento do analítico embarcado | HTTP e TCP | `analytics-device/adapters/` (`atspm-http`, `horus-http`, `sdct-http`, `virtual-loop-tcp` e `absent` como objeto nulo), escolhido por `AnalyticDeviceSelector` | Configuração e leitura do analítico na câmera |
| NovaStar H9 | HTTP OpenAPI | `video-wall/targets/novastar-h9/client/novastar-open-api.client.ts` | Processador do videowall externo |
| Object storage (MinIO ou S3) | `@attlas/core-storage`, `OBJECT_STORAGE_*` | `cameras/handlers/capture-evidence-image/`, `cameras/handlers/capture-preset-snapshot/`, `analytic-incident-media/cache/` | Imagem de evidência, imagem de preset e cache da mídia de incidente |
| Redis | `REDIS_HOST`, `REDIS_PORT` | `redis/redis.module.ts`, `main.ts` | Cache de status `camera:status:<id>`, adapter do Socket.IO, fila do ciclo de vida, coalescência e canal do dashboard, cache de topologia |
| Redis de metadados de auditoria | `AUDIT_METADATA_REDIS_URL` | `shared/audit/audit-metadata-client.module.ts` | Nome e cargo do ator, com fallback no `ms-organization` |

## Por que é assim

**Kafka opcional e degradável.** O consumidor só conecta quando `KAFKA_BROKERS` existe, e uma falha de conexão
ou de assinatura (tópico ausente no broker, broker fora do ar) não derruba o servidor HTTP: o serviço segue só
com REST. A decisão está no comentário de `main.ts` (DD-6 do SPEC).

**`app.init()` antes do consumidor.** O `CqrsModule` registra os handlers em `onApplicationBootstrap`; um
consumidor que atendesse uma partição antes disso não teria para quem rotear a mensagem.

**Permissão avaliada no `ms-organization`.** Sem `enablePermissionEvaluation`, o `@RequirePermission` seria só
anotação, e a rota de tratamento de incidente ficaria protegida apenas pelo template Angular. Com a opção, a
chave vira guarda fail-closed resolvida no `ms-organization`.

**Adapter Redis no Socket.IO.** O broadcast de sala precisa chegar a todas as réplicas. Sem Redis, o adapter em
memória mantém o desenvolvimento local de uma réplica funcionando.

**Correlação e alarme fora do CommandBus.** O serviço tem 134 arquivos de handler CQRS (`@CommandHandler` e
`@QueryHandler`): comandos mutam pelos repositórios, queries leem. A correlação de eventos em incidente e a
emissão de alarme não passam por comando: são serviços dirigidos pelos listeners Kafka de `events/consumers/`.

**Integração direta com o hardware.** Câmera fala protocolo padronizado de rede, e o `ms-cameras` carrega os
drivers e as estratégias de comunicação no próprio processo, sem connector separado. O vídeo é a exceção: o
MediaMTX abre o RTSP da câmera, e nenhum processo de vídeo roda dentro do `ms-cameras`.

## Armadilhas conhecidas

- **Um `ScheduleModule.forRoot()` só.** Registrado em mais de um módulo, cada `@Cron` dispara uma vez por
  scheduler: o sampler de disponibilidade já rodou duas vezes por tick e a segunda passada gravou o bitrate da
  janela como nulo.
- **Rota estática antes de `@Get(':id')`.** No `CamerasController`, `vms`, `incidents`, `events`,
  `bulk-template`, `manufacturers` e `availability` são declaradas antes de `@Get(':id')`; declaradas depois, o
  `ParseUUIDPipe` do `:id` captura o segmento e responde 400. É por isso que `GET /cameras/availability` mora no
  `CamerasController` e não num controller próprio.
- **`KafkaOptionsFactory` lê `process.env` direto.** O serviço ainda não migrou para o
  `buildKafkaConsumerOptions` de `@attlas/core-messaging`, que é o padrão do monorepo; o próprio arquivo
  declara a migração pendente.
- **A mesma câmera física existe uma vez por sistema.** Em produção cada equipamento é cadastrado em cada
  sistema-tenant (seis hoje). Mecanismo que trata o equipamento (saúde, telemetria, analítico) deduplica por
  endereço, não por linha (`health/utils/device-stream-group.util.ts`).
- **Coluna `Camera.safeMode` órfã.** A coluna existe no schema e nenhum código lê ou escreve nela.
- **Comentário do model `CameraBitrateSample` defasado.** O comentário descreve telemetria sempre ligada a
  cada tick; o código grava uma linha por câmera a cada janela de 5 min, só com medição real (algum espectador
  já tinha o vídeo aberto), com retenção de 48 h (`persistBitrateSamples` em
  `health/workers/availability-window-sampler.service.ts`).
- **A tabela `Camera` não tem dono único de acesso.** O cadastro passa pelo `ICamerasRepository`, mas saúde,
  dashboard, streaming, VMS, eventos, analítico e as rotas internas leem `prisma.camera` direto, e o
  provisionamento, o `CameraRegionsController` e os handlers de vínculo com interseção também escrevem nela.

## Glossário

| Termo | O que é |
| --- | --- |
| Sistema | O tenant do Attlas; chega no header `System-Id` e escopa toda leitura e escrita |
| MASTER | Perfil de plataforma que passa pela guarda de pertencimento de qualquer sistema |
| MediaMTX | Servidor de mídia que abre o RTSP da câmera e entrega WebRTC (WHEP) e LL-HLS ao navegador |
| WHEP | Protocolo HTTP de negociação de WebRTC para reprodução |
| LL-HLS | HLS de baixa latência, a reserva do player quando o WebRTC falha |
| ONVIF | Padrão de rede para câmeras IP: perfis, PTZ e eventos |
| VAPIX | API HTTP das câmeras Axis |
| ISAPI | API HTTP das câmeras Hikvision |
| PTZ | Movimento de pan, tilt e zoom da câmera |
| Fila-morta | Tópico `attlas.dlq.cameras`, para onde vai a mensagem que o serviço não consegue ler |
| Rollup | Resumo diário de disponibilidade por câmera, gerado das janelas de 5 min |
