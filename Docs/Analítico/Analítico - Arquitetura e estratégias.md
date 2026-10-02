---
tags:
  - doc
  - analitico
  - arquitetura
aliases:
  - "Analítico - Estudo de caso de captura, inferência e sincronização"
  - "Estudo de caso do analítico servidor"
  - "Arquitetura de captura, inferência e sincronização"
  - "Registro - prova de campo do analítico servidor no EC2 em 11 de setembro"
  - "Prova de campo do analítico no EC2 (11/09)"
  - "Registro - deploy do analítico no EC2"
  - "Registro - os quatro blocos de configuração da Detecção no EC2 em 14 de setembro"
  - "Blocos de configuração da Detecção no EC2 (14/09)"
  - "Registro - habilitar os quatro blocos da Detecção"
  - "Registro - imagem e vídeo do incidente lidos do equipamento em 26 de setembro"
atualizado: 2026-10-01
---

# Analítico - Arquitetura e estratégias

Onde mora cada peça do [[Analítico]] no código da `develop`, os contratos que as ligam e as armadilhas
conhecidas. O que o módulo é está em [[Analítico - Visão do produto]]; a ordem dos passos, em
[[Analítico - Fluxos]].

## Onde mora cada peça

| Serviço | Pasta | Papel |
| --- | --- | --- |
| `ms-cameras` | `src/analytics-realtime/` | Consumidor Kafka dos quadros do equipamento (`device-stream.consumer.ts`), gateway de socket, rotas de região e laço (`camera-regions.controller.ts`), publicador de ocupação e de presença ao vivo, gravação das métricas por minuto (PROJ-028) |
| | `src/analytics-device/` | Porta `AnalyticDevicePort`, um adaptador por build (`atspm-http`, `sdct-http`, `horus-http`, `virtual-loop-tcp`, `absent`), catálogo de builds (`builds/analytic-build-catalog.ts`, CROSS-157) e descritor de capacidade |
| | `src/cameras/analytics/` | Matriz de compatibilidade e identificação da arquitetura ARTPEC |
| | `src/analytic-instances/` | A unidade analítica como registro (`AnalyticInstance`, UC-075), eventos e sincronização |
| | `src/analytic-device-binding/` | O vínculo explícito do equipamento: `source_id`, broker e producer (UC-216) |
| | `src/analytic-network-discovery/` | Descoberta dos apps Atman na rede, por lote, com resultado pelo socket (UC-217) |
| | `src/analytic-acom-destination/` | Lê e grava no app o destino da placa ACOM (UC-221) |
| | `src/analytic-incident-media/` | Imagem e gravação do incidente lidas do equipamento, com cópia de prazo curto (UC-225) |
| | `src/analytics-region-metrics/` | Métricas por região gravadas pelo Attlas (UC-228) e medidas ATSPM lidas do equipamento (UC-229) |
| | `src/analytics-metrics-export/` | Exportação XLS e PDF das tabelas de Métricas |
| | `src/virtual-loop-binding/` | Vínculo região para endereço de detector (`VirtualLoopDetectorBinding`) |
| | `src/analytics-ingestion/` | `GET /internal/virtual-loop/sources`: regiões e vínculos para a tradução de endereço |
| | `src/incident-criticality/` | Criticidade por tipo de incidente, por Sistema (UC-227) |
| | `src/server-analytics/`, `src/lpr-capability/` | Associação da câmera à Neural Labs e capacidade LPR. Ver [[Analítico - Neural Labs - Vínculo de câmeras]] |
| `ms-connector-virtual-loop` | `src/devices/` | Atende na TCP 3091 a discagem do app de laço, publica a ocupação que ele reporta e a presença do equipamento |
| `ms-video-analytics` | `src/detector-translation/` | Traduz a ocupação em `attlas.detectors.raw` pelo vínculo da região; sem vínculo, descarta |
| | `src/acom-link/` | Orquestra o vínculo placa ACOM e analítico (CROSS-168) |
| | `src/neural-lpr/` | Integração Neural Labs. Ver [[Analítico - Neural Labs - Arquitetura e estratégias]] |
| `ms-detector-history` | | Guarda a série do detector, igual ao laço físico, e serve as janelas que a face do Laço Virtual lê |
| `ms-controllers` | `src/acom/` | Placa ACOM, fiação por saída. Ver [[Analítico - Vínculo com a ACOM]] |
| `web-attlas` | `modules/analytics*` | As quatro abas. Ver [[Analítico - Frontend]] |

O `ms-video-analytics` tem banco próprio (`db-video-analytics`, porta 5415) para as frentes LPR e ACOM;
o pipeline de inferência dele foi descontinuado e o `SPEC.md` está `superseded` para essa parte. O
`ms-acom` é esqueleto de gerador, ainda no compose e no Kong, sem uso.

## Builds do app embarcado

Cada geração de app é declarada uma vez no catálogo de builds, com o que ela sabe fazer. A tela lê o
descritor em `GET /api/cameras/:cameraId/analytics/:analyticId/capabilities`, e o `CameraAnalytic`
guarda qual adaptador respondeu (`deviceAdapterId`).

| Build | App na câmera | Onde atende | Tipos | Caixas | Incidentes | Linha do laço | Grava identidade |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `atspm-http` | `atman_traffic_edge_atspm` (também `traffic_edge_detection`) | Proxy da Axis, 80 com Digest e 443 com Basic, `/local/atman_traffic_edge_atspm/api` | ATSPM e laço | Sim | Sim | Sim | Sim |
| `sdct-http` | `atman_traffic_edge_sdct` | Porta própria 2002, sem Digest, `/horus/traffic-edge-sdct` | Laço | Não | Não | Sim (`loop_offset`) | Sim |
| `horus-http` | app autônomo antigo | Porta 8000, `/traffic-motion-detection` ou `/horus/traffic-analytics` | ATSPM | Não | Só leitura | Não | Não |
| `virtual-loop-tcp` | `atman_virtual_loop_analytic` | O app disca para o `ms-connector-virtual-loop` na 3091 | Laço | Não | Não | Não | Não |
| `absent` | nenhum | | | | | | |

- Só o `atspm-http` calcula medidas ATSPM (`POST /metrics`) e guarda imagem de incidente
  (`POST /incidents` e `GET /output/...`). As três builds com ACOM guardam o destino da placa.
- O SDCT conta presença pela subida do contador `region_metrics[].volume`, mesmo em quadro que não
  lista a região em `regions[]`.
- A porta 2001 do app ATSPM não existe mais nas versões atuais e saiu da sondagem; o `openapi.json`
  do ATSPM só era servido nela. O do SDCT está em `http://<ip>:2002/openapi.json`, sem autenticação.
- Variáveis: `ATMAN_ANALYTIC_API_ENDPOINTS` e `ATMAN_ANALYTIC_API_PATHS` (lista; lista malformada
  aborta o boot), `ATMAN_HORUS_API_*`, `ATMAN_SDCT_API_*` (`analytic-api-profile.ts`).

## Contratos

### Kafka

| Tópico | Produtor | Consumidor |
| --- | --- | --- |
| `traffic-motion-detection.detections`, no broker do próprio equipamento (`ANALYTICS_STREAM_BROKERS`), fora do catálogo de tópicos | O app embarcado | `ms-cameras` (`DeviceStreamConsumer`) |
| `attlas.virtual-loop.region-occupancy` (`IRegionOccupancyEvent`) | `ms-cameras` e `ms-connector-virtual-loop` | `ms-video-analytics` (tradução), `ms-cameras` (acende a região na tela), `ms-selective-priority` (avistamento) |
| `attlas.virtual-loop.device-presence` | `ms-connector-virtual-loop` | Nenhum |
| `attlas.detectors.raw` | `ms-video-analytics` | `ms-detector-history` |

`IRegionOccupancyEvent` leva `cameraId`, `analyticId`, `presetId`, `regionIndex`, `purpose`, a série
`symbols`/`counters` em RLE de `DETECTOR_SAMPLE_DURATION_MS`, `objectClasses` opcional (CROSS-113),
`sampledAt` e `receivedAt`. Os dois produtores usam a mesma histerese de `@attlas/utils` e publicam só
na transição.

### Socket do analítico

Namespace `cameras-analytics`, path `/api/cameras/analytics/realtime` (três segmentos, para escapar da
rota por id do Kong), JWT no handshake, sala `camera:<cameraId>`. Eventos: `camera:analytics:detection`,
`camera:analytics:frame` (caixas), `camera:analytics:occupancy`, `camera:analytics:stream` (por que o
overlay está vazio), `camera:analytics:health`, `camera:analytics:binding`,
`camera:analytics:instance-event` e `camera:analytics:metrics` (janela gravada). Quem entra na sala
recebe a saúde e a ocupação atuais. A descoberta na rede usa o mesmo socket, na sala
`network-discovery:<batchId>`, só do dono do lote.

Incidentes ao vivo (UC-226): `camera:incidents:changed` na sala `incidents:<systemId>` do socket de
status das câmeras.

### Rotas REST do `ms-cameras`

| Rota | Para quê |
| --- | --- |
| `GET`/`PUT /api/cameras/:id/object-detection-regions` | Regiões; o `GET` lê o equipamento e cai na cópia do banco quando ele não responde |
| `GET`/`PUT /api/cameras/:id/virtual-loops` | Configuração do laço (`CameraAnalytic.loopConfig`) |
| `GET /api/cameras/:cameraId/analytics/:analyticId/capabilities` | Descritor de capacidade do build |
| `GET`/`POST /api/cameras/:cameraId/analytics/device-binding` | Vínculo do equipamento (Vincular), com `confirmTakeover` para tomar de outra instalação |
| `/api/cameras/analytics/instances` (`GET`, `POST`, `PATCH`, `DELETE`, `PUT .../cameras`, `GET .../events`), `GET .../instance-cameras` | Unidades analíticas |
| `POST /api/cameras/analytics/network-discoveries` e `.../test` | Descoberta na rede |
| `GET /api/cameras/:cameraId/analytics/:analyticId/acom-link` | Estado do vínculo com a placa ACOM |
| `POST`/`GET`/`DELETE /api/cameras/:cameraId/virtual-loop-bindings` | Vínculo região para detector |
| `GET /api/cameras/:id/analytics/region-metrics` | Métricas por região gravadas pelo Attlas (UC-228) |
| `GET /api/cameras/:id/analytics/device-metrics` | Medidas ATSPM calculadas pelo equipamento, em cache no Redis por janela de 300 s (UC-229) |
| `POST /api/cameras/analytics/metrics/export` | Exportação XLS e PDF |
| `GET`/`PUT /api/cameras/analytics/incident-criticality` | Criticidade por tipo |
| `GET /api/cameras/:id/events/:eventId/incident-media`, `.../incident-media/screenshots/...`, `.../recordings/:recordingId` | Mídia do incidente |

## Persistência

- `ms-cameras`: `CameraAnalytic` (tipo, modo, `deviceSourceId`, `instanceId`, `deviceAdapterId`,
  `reportChannel`, `capabilityDescriptor`, `loopConfig`), `CameraAnalyticRegion` (pontos em
  porcentagem, sem conceito de linha, ligada ao preset e ao `deviceRegionId` do equipamento),
  `VirtualLoopDetectorBinding`, `AnalyticInstance` e `AnalyticInstanceAvailability` (uma linha por
  transição de estado), `CameraRegionMinuteMetric`, `AnalyticsIncidentCriticality`,
  `CameraServerAnalytic` e `CameraLprCapability`.
- `ms-video-analytics`: `NeuralInstance`, `ExternalCameraMap`, leituras e trechos LPR, `AcomLinkBoard`
  e `AcomAnalyticLink`.

## Por que assim

- **Sem inferência no Attlas.** Medido no EC2 de desenvolvimento: decodificar custa quase nada (os
  `ffmpeg` somavam 3,5%), inferir custa tudo (o processo Node a 580% num t3a.2xlarge de 8 vCPU,
  burstable), e o analítico afogava o MediaMTX e o `ms-cameras`. Daí a decisão de resolver toda
  câmera pelo embarcado.
- **Vínculo pelo `source_id` no valor da mensagem, nunca pela chave.** A chave é o `analytic_id` do
  app, que muda a cada reinstalação. Um `source_id` acende todas as câmeras que compartilham aquele
  equipamento (o mesmo aparelho cadastrado em mais de um Sistema).
- **Grupo de consumidor estável por deployment** (`ANALYTICS_STREAM_GROUP_ID`); sem a variável, um
  UUID por processo. Grupo fixo compartilhado fazia ambientes diferentes disputarem a partição do mesmo
  broker do equipamento.
- **O índice da região vem da ordem estável do `/regions` do equipamento**, nunca da posição no array
  do quadro, que omite região vazia e reordena.
- **Reparo do producer só pela instalação dona** (`ANALYTICS_OWNED_DEVICE_SOURCE_IDS`, INT-026), e só
  liga o producer: dois escritores automáticos de identidade deixaram o equipamento reiniciando em laço.
- **Broker de publicação separado do de consumo** (`ANALYTICS_DEVICE_PUBLISH_BROKER`): o equipamento
  publica no endereço que ele alcança, que não é o que o serviço usa por dentro.

## Armadilhas conhecidas

- **`kind` do evento de detecção não é o tipo do analítico.** Sai `OBJECT_DETECTION` quando o quadro
  traz incidente e `VIRTUAL_LOOP` no resto (`device-stream.consumer.ts`). Nenhuma tela o exibe e
  nenhum teste trava a semântica; não usar para decidir tipo.
- **O ATSPM 0.10.2 manda o incidente por objeto**, em `obj_incidents[i][j]`, e deixa
  `region_incidents` vazio. O consumidor lê os dois.
- **O equipamento não devolve os parâmetros de incidente.** Aceita na escrita e nunca reporta na
  leitura; a tela completa com a cópia do banco (`withStoredPresentation`) e deixa o equipamento
  mandar no que ele reporta.
- **O `source_id` do equipamento manda.** Quando a Detecção lê o `/config` e o aparelho reporta outro
  `source_id`, o banco se realinha (`reconcileDeviceSourceId`). Salvar região ou laço nunca reescreve o
  `source_id`; retomar a câmera é só pelo Vincular.
- **O mapa de vínculo do consumidor se refaz a cada 30 s**, sem depender de quadro novo. Câmera
  vinculada aparece no ao vivo em até 30 s.
- **O laço é configuração da câmera, mas a tela o mostra em cada região.** No ATSPM ele é um bloco só
  no `/config` (`vloop_enabled`, `vloop_classes`, `vloop_exit_grace_ms`): mexer nele numa região muda
  todas.
- **Seed local**: o `nx serve ms-cameras` roda o seed, que só apaga ids do próprio espaço
  (`00000000-0000-4000-8000-*`) e avisa quando `SEED_ATMAN_EMBEDDED_SOURCE_ID` está vazia.
- **Atualizar o app reseta o equipamento.** Ver [[Analítico - Runbook - Embarcado]].

> [!warning] Divergências atuais entre spec e código
> - O código do `ms-cameras` e o `SPEC.md` do `ms-connector-virtual-loop` citam `CROSS-119` para o
>   descritor de capacidade, mas o único `CROSS-119` na `develop` é
>   `CROSS-119-camera-controller-capacity-gate.md`, de outro assunto.
> - IDs duplicados em `docs/specs/cross-service/`: dois `CROSS-120` (transporte TCP do laço e eco de
>   comando de subárea), dois `CROSS-149` (medição LPR e exercício de validação da Neural Labs) e dois
>   `CROSS-157` (registro de builds e estado de condição de plano).
> - A `CROSS-168` seção 11 dá como pendente gravar o `analytic_id` do app na lógica de saída da placa,
>   mas o `acomLogicToDevice` do `ms-controllers` já traduz o id.
