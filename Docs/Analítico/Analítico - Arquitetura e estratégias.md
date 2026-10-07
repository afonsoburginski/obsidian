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
atualizado: 2026-10-07
---

# Analítico - Arquitetura e estratégias

Volta para [[Analítico]].

## Resumo

| Pergunta | Resposta |
| --- | --- |
| Onde roda a inferência | Na câmera, no app embarcado da Atman, ou no NEURAL SERVER da Neural Labs. Nenhum processo do Attlas infere |
| Quem consome os quadros do app embarcado | O `ms-cameras`, do Kafka do próprio equipamento |
| Quem atende o app de laço por TCP | O `ms-connector-virtual-loop`, na porta 3091 |
| Quem transforma ocupação em leitura de detector | O `ms-video-analytics`, pelo vínculo região-detector |
| Quem guarda a série do detector | O `ms-detector-history`, igual à do laço físico |
| Quem cuida da placa ACOM | O `ms-controllers` (placa e fiação) e o `ms-video-analytics` (vínculo com o analítico) |

O que o módulo é está em [[Analítico - Visão do produto]]; a ordem dos passos, em [[Analítico - Fluxos]]; as
telas, em [[Analítico - Frontend]]. A integração com a Neural Labs tem arquitetura própria em
[[Analítico - Neural Labs - Arquitetura e estratégias]].

## Onde está no código

| Caminho | Papel |
| --- | --- |
| `apps/ms-cameras/src/analytics-realtime/` | Consumidor dos quadros do equipamento (`device-stream.consumer.ts`), gateway do socket do analítico, rotas de região e laço (`camera-regions.controller.ts`), publicadores de ocupação e de presença ao vivo, gravação de incidente (`analytics-incident-recorder.service.ts`), gravação das métricas por minuto (`apps/ms-cameras/src/analytics-realtime/region-metrics/`), reparo do producer e diagnóstico do stream |
| `apps/ms-cameras/src/camera-analytics/` | Repositórios de `CameraAnalytic` e `CameraAnalyticRegion`, veredito de saúde do analítico (`camera-analytics-health.service.ts`), escolha do analítico que uma tela edita (`configured-analytic.resolver.ts`) e desvínculo da fonte embarcada |
| `apps/ms-cameras/src/analytics-device/` (CROSS-157) | Porta `AnalyticDevicePort`, um adaptador por build, catálogo de builds (`apps/ms-cameras/src/analytics-device/builds/analytic-build-catalog.ts`), descritor de capacidade, cliente HTTP com Digest (`apps/ms-cameras/src/analytics-device/transport/`) e leitura e controle dos apps da Axis (`apps/ms-cameras/src/analytics-device/applications/`) |
| `apps/ms-cameras/src/cameras/analytics/` (UC-058) | Matriz de compatibilidade (`analytics-compatibility.matrix.ts`) e identificação da arquitetura ARTPEC |
| `apps/ms-cameras/src/analytic-instances/` (UC-075) | A unidade analítica como registro (`AnalyticInstance`), eventos e histórico de disponibilidade |
| `apps/ms-cameras/src/analytic-device-binding/` (UC-216) | O Vincular: grava no app o `source_id`, o broker e o producer |
| `apps/ms-cameras/src/analytic-network-discovery/` (UC-217) | Descoberta dos apps da Atman na rede, por lote, com o resultado pelo socket |
| `apps/ms-cameras/src/analytic-acom-destination/` (UC-221) | Lê e grava no app o destino da placa ACOM |
| `apps/ms-cameras/src/analytic-incident-media/` (UC-225) | Imagem e gravação do incidente lidas do equipamento, com cópia de prazo curto no object storage |
| `apps/ms-cameras/src/analytics-region-metrics/` (UC-228, UC-229) | Métricas por região gravadas pelo Attlas e medidas ATSPM lidas do equipamento |
| `apps/ms-cameras/src/analytics-metrics-export/` | Exportação XLS e PDF das tabelas de Métricas |
| `apps/ms-cameras/src/virtual-loop-binding/` (MOD-018, CROSS-146) | Vínculo região-detector (`VirtualLoopDetectorBinding`), trava de contagem dupla (`physical-detector.probe.ts`), reendereçamento quando o detector muda de endereço (`apps/ms-cameras/src/virtual-loop-binding/readdress/`) e preenchimento do id do detector do Modelo de Tráfego no boot (`apps/ms-cameras/src/virtual-loop-binding/detector-id-backfill/`) |
| `apps/ms-cameras/src/analytics-ingestion/` | `GET /api/internal/virtual-loop/sources`: regiões e vínculos para a tradução de endereço |
| `apps/ms-cameras/src/incident-criticality/` (UC-227) | Criticidade por tipo de incidente, por Sistema |
| `apps/ms-cameras/src/camera-view-preferences/` (UC-231) | Visão da tela de Detecção guardada por usuário e câmera |
| `apps/ms-cameras/src/server-analytics/`, `apps/ms-cameras/src/lpr-capability/` | Associação da câmera à Neural Labs e capacidade LPR. Ver [[Analítico - Neural Labs - Vínculo de câmeras]] |
| `apps/ms-connector-virtual-loop/src/devices/` (CROSS-120) | Atende na TCP 3091 a discagem do app de laço, publica a ocupação que ele reporta e a presença do equipamento, e expõe `/internal/devices` ao `ms-cameras` |
| `apps/ms-video-analytics/src/detector-translation/`, `apps/ms-video-analytics/src/camera-registry/` | Traduz a ocupação em `attlas.detectors.raw` pelo vínculo da região; o registro relê as fontes do `ms-cameras` num timer |
| `apps/ms-video-analytics/src/acom-link/` (CROSS-168) | Orquestra o vínculo entre a placa ACOM e o analítico. Ver [[Analítico - Vínculo com a ACOM]] |
| `apps/ms-video-analytics/src/internal-api/` | `GET /api/internal/analytic-fleet/status`, resposta fixa de que este deployment não processa câmera |
| `apps/ms-video-analytics/src/neural-lpr/` | Integração Neural Labs. Ver [[Analítico - Neural Labs - Arquitetura e estratégias]] |
| `apps/ms-detector-history/` | Guarda a série do detector e serve as janelas que a face do Laço Virtual lê |
| `apps/ms-controllers/src/acom/` | Placa ACOM e fiação por saída. Ver [[Analítico - Vínculo com a ACOM]] |
| `apps/ms-selective-priority/src/sightings/consumers/region-occupancy.consumer.ts` | Lê a ocupação de região para o avistamento de veículo prioritário |
| `libs/contracts/src/lib/camera-analytic/` | Tipos, famílias e fornecedores (`AnalyticTypeCatalog`), capacidades do build e a lista de medidas do equipamento (`camera-device-metrics.constant.ts`) |
| `libs/contracts/src/lib/virtual-loop/virtual-loop-topics.constant.ts` | Os tópicos Kafka do laço virtual |
| `libs/utils/src/lib/` | Histerese da ocupação (`occupancy-hysteresis.constant.ts`) e trava da presença ao vivo (`live-presence.constant.ts`), as mesmas nos dois produtores |
| `apps/web-attlas/src/app/modules/` (pastas `analytics`, `analytics-detection`, `analytics-instances`, `analytics-incidents` e `analytics-metrics`) | As quatro abas. Ver [[Analítico - Frontend]] |
| `apps/ms-acom/` | Esqueleto de gerador, ainda no `docker-compose.yml` e no `docker/kong.yml`, sem uso |

O `ms-video-analytics` tem banco próprio (`db-video-analytics`, porta 5415) para as frentes Neural Labs e ACOM e não
tem pipeline de inferência; o `SPEC.md` dele está `superseded` para essa parte.

## Contratos

### Builds do app embarcado

Cada geração do app da Atman é declarada uma vez no catálogo de builds, com o que ela sabe fazer. A tela lê o
descritor em `GET /api/cameras/:cameraId/analytics/:analyticId/capabilities`, e o `CameraAnalytic` guarda em
`deviceAdapterId` qual build respondeu.

| Build | App na câmera | Onde a API atende | Tipos | Caixas | Incidentes | Linha do laço | Grava identidade |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `atspm-http` | `atman_traffic_edge_atspm` ou `traffic_edge_detection` | Proxy da Axis, 80 com Digest e 443 com Basic, em `/local/atman_traffic_edge_atspm/api` | ATSPM e laço | Sim | Sim | Sim | Sim |
| `sdct-http` | `atman_traffic_edge_sdct` | Porta própria 2002, sem Digest, em `/horus/traffic-edge-sdct` | Laço | Não | Não | Sim (`loop_offset`) | Sim |
| `horus-http` | app autônomo da geração anterior | Porta 8000, em `/traffic-motion-detection` ou `/horus/traffic-analytics` | ATSPM | Não | Só leitura | Não | Não |
| `virtual-loop-tcp` | `atman_virtual_loop_analytic` | Nenhuma: o app disca para o `ms-connector-virtual-loop` na 3091 | Laço | Não | Não | Não | Não |
| `absent` | nenhum | | | | | | |

- Só o `atspm-http` calcula medidas ATSPM (`POST <base>/metrics`) e guarda imagem de incidente
  (`POST <base>/incidents` e `GET <base>/output/incidents/screenshots/<sourceId>/<arquivo>`).
- Os builds `atspm-http`, `sdct-http` e `virtual-loop-tcp` guardam o destino da placa ACOM.
- O SDCT conta presença pela subida do contador `region_metrics[].volume`, mesmo em quadro que não lista a região em
  `regions[]`.
- O app ATSPM não tem porta própria: a API dele só responde pelo proxy da Axis. O SDCT publica o `openapi.json` em
  `http://<ip>:2002/openapi.json`, sem autenticação.

### Rotas REST

As rotas do `ms-cameras` ficam sob `/api`; as de `/api/internal` exigem o `INTERNAL_SERVICE_TOKEN`.

| Rota | Para quê | Onde |
| --- | --- | --- |
| `GET`/`PUT /api/cameras/:id/object-detection-regions` | Regiões. O `GET` lê o equipamento e cai na cópia do banco quando ele não responde | `apps/ms-cameras/src/analytics-realtime/` |
| `GET`/`PUT /api/cameras/:id/virtual-loops` | Configuração do laço (`CameraAnalytic.loopConfig`) | `apps/ms-cameras/src/analytics-realtime/` |
| `GET /api/cameras/:cameraId/analytics/:analyticId/capabilities` | Descritor de capacidade do build | `apps/ms-cameras/src/analytics-device/` (UC-080) |
| `GET`/`POST /api/cameras/:cameraId/analytics/device-binding` | Vínculo do equipamento (Vincular), com `confirmTakeover` para tomar de outra instalação | `apps/ms-cameras/src/analytic-device-binding/` (UC-216) |
| `GET`/`POST /api/cameras/analytics/instances`, `GET`/`PATCH`/`DELETE .../instances/:instanceId`, `PUT .../instances/:instanceId/cameras`, `GET .../instances/:instanceId/events`, `GET .../instance-cameras` | Unidades analíticas | `apps/ms-cameras/src/analytic-instances/` (UC-075) |
| `POST /api/cameras/analytics/network-discoveries` e `.../network-discoveries/test` | Descoberta na rede | `apps/ms-cameras/src/analytic-network-discovery/` (UC-217) |
| `GET /api/cameras/:cameraId/analytics/:analyticId/acom-link` | Estado do vínculo com a placa ACOM | `apps/ms-cameras/src/analytic-acom-destination/` (UC-221) |
| `POST`/`GET /api/cameras/:cameraId/virtual-loop-bindings`, `DELETE .../virtual-loop-bindings/:id` | Vínculo região-detector | `apps/ms-cameras/src/virtual-loop-binding/` (MOD-018) |
| `GET /api/cameras/:id/analytics/region-metrics` | Métricas por região gravadas pelo Attlas | `apps/ms-cameras/src/analytics-region-metrics/` (UC-228) |
| `GET /api/cameras/:id/analytics/device-metrics` | Medidas ATSPM calculadas pelo equipamento, em cache no Redis por janela de 300 s | `apps/ms-cameras/src/analytics-region-metrics/` (UC-229) |
| `POST /api/cameras/analytics/metrics/export` | Exportação XLS e PDF | `apps/ms-cameras/src/analytics-metrics-export/` |
| `GET`/`PUT /api/cameras/analytics/incident-criticality` | Criticidade por tipo | `apps/ms-cameras/src/incident-criticality/` (UC-227) |
| `GET /api/cameras/incidents/metrics` | Agregados dos incidentes do Sistema, para a face Incidentes das Métricas | `apps/ms-cameras/src/events/reading/get-incident-metrics/` |
| `GET /api/cameras/:id/events/:eventId/incident-media`, `GET .../:id/incident-media/screenshots/:sourceId/:fileName`, `GET .../:id/incident-media/recordings/:recordingId` | Mídia do incidente | `apps/ms-cameras/src/analytic-incident-media/` (UC-225) |
| `GET`/`PUT /api/cameras/:id/view-preferences` | Visão da Detecção do usuário para a câmera (cards, cores das classes, camadas) | `apps/ms-cameras/src/camera-view-preferences/` (UC-231) |
| `GET /api/internal/virtual-loop/sources` | Regiões e vínculos, lidos pelo `ms-video-analytics` | `apps/ms-cameras/src/analytics-ingestion/` |
| `GET`/`PUT /api/internal/camera-analytics/:analyticId/acom-destination` | Destino ACOM no app, lido e gravado a pedido do `ms-video-analytics` | `apps/ms-cameras/src/analytic-acom-destination/` |

Rotas internas dos outros serviços do caminho:

| Serviço | Rota | Quem chama |
| --- | --- | --- |
| `ms-video-analytics` | `PUT`/`DELETE /api/internal/acom-links/:acomId` | `ms-controllers`, com o retrato da placa |
| `ms-video-analytics` | `GET /api/internal/acom-links` | `ms-cameras`, para o estado do vínculo |
| `ms-video-analytics` | `GET /api/internal/analytic-fleet/status` | `ms-cameras`, para a linha da frota servidor |
| `ms-connector-virtual-loop` | `GET /internal/devices`, `GET .../:deviceId/properties`, `PUT .../:deviceId/config`, `PUT .../:deviceId/acom`, `PUT .../:deviceId/addressing`, `POST .../:deviceId/stream` | `ms-cameras` (adaptador `virtual-loop-tcp`); fora do prefixo `/api` |

### Tópicos Kafka

| Tópico | Produtor | Consumidor |
| --- | --- | --- |
| `traffic-motion-detection.detections`, no broker do equipamento (`ANALYTICS_STREAM_BROKERS`), fora do catálogo de tópicos | O app embarcado | `ms-cameras` (`DeviceStreamConsumer`) |
| `attlas.virtual-loop.region-occupancy` (`IRegionOccupancyEvent`) | `ms-cameras` e `ms-connector-virtual-loop` | `ms-video-analytics` (tradução), `ms-cameras` (acende a região na tela), `ms-selective-priority` (avistamento) |
| `attlas.virtual-loop.device-presence` | `ms-connector-virtual-loop` | Nenhum |
| `attlas.detectors.raw` | `ms-video-analytics`, além do caminho físico do `ms-controllers` | `ms-detector-history` |

`IRegionOccupancyEvent` leva `cameraId`, `analyticId`, `presetId`, `regionIndex`, `purpose`, a série
`symbols`/`counters` em RLE de `DETECTOR_SAMPLE_DURATION_MS`, `objectClasses` opcional (até 16 classes por janela),
`sampledAt` e `receivedAt`. Os dois produtores usam a mesma histerese de `@attlas/utils` e publicam só na transição.

### Socket do analítico

Namespace `cameras-analytics`, path `/api/cameras/analytics/realtime` (três segmentos, para não cair na rota por id
do Kong), JWT no handshake e sala `camera:<cameraId>`. Quem entra na sala recebe a saúde e a ocupação atuais.

| Evento | O que leva |
| --- | --- |
| `camera:analytics:detection` | Detecção numa região, com a classe do objeto |
| `camera:analytics:frame` | As caixas do quadro, só de build que as reporta |
| `camera:analytics:occupancy` | Presença por região |
| `camera:analytics:stream` | Diagnóstico do stream: por que o desenho está vazio |
| `camera:analytics:health` | Saúde do analítico, a cada transição |
| `camera:analytics:binding` | Mudança no vínculo do equipamento |
| `camera:analytics:instance-event` | Evento da unidade analítica |
| `camera:analytics:metrics` | Janela de métricas por minuto gravada |

A descoberta na rede usa o mesmo socket, na sala `network-discovery:<batchId>`, só do dono do lote. No socket de
status das câmeras, a sala do Sistema `incidents:<systemId>` recebe `camera:incidents:changed` (incidentes ao vivo), e
a sala da câmera recebe `camera:analytics:update`, sinal de que regiões ou laço mudaram e a tela deve reler.

### Tabelas do banco

| Serviço | Tabela | O que guarda |
| --- | --- | --- |
| `ms-cameras` | `CameraAnalytic` | O analítico da câmera: tipo, modo (`EMBEDDED` ou `SERVER`), `deviceSourceId`, `instanceId`, `deviceAdapterId`, `reportChannel`, `capabilityDescriptor`, `loopConfig` |
| `ms-cameras` | `CameraAnalyticRegion` | Região: pontos em porcentagem, sem conceito de linha, tipo e classes, ligada ao preset e ao `deviceRegionId` do equipamento |
| `ms-cameras` | `VirtualLoopDetectorBinding` | Região para endereço de detector (`controllerId`, `detectorIndex`, `purpose`, `trafficModelDetectorId`) |
| `ms-cameras` | `AnalyticInstance`, `AnalyticInstanceAvailability` | A unidade analítica e uma linha por transição de estado |
| `ms-cameras` | `CameraRegionMinuteMetric` | Contagens por câmera, região, classe e minuto |
| `ms-cameras` | `AnalyticsIncidentCriticality` | Criticidade por Sistema e tipo de incidente |
| `ms-cameras` | `CameraViewPreference` | Visão da Detecção por câmera e usuário |
| `ms-cameras` | `CameraEventLog`, `CameraEventTreatment` | O incidente (categoria `ANALYTICS`) e o tratamento dele. Ver [[Câmeras - Eventos, incidentes e alarmes]] |
| `ms-cameras` | `CameraServerAnalytic`, `CameraLprCapability` | Associação à Neural Labs e capacidade LPR |
| `ms-video-analytics` | `AcomLinkBoard`, `AcomAnalyticLink` | Retrato de cada placa e estado do vínculo com cada analítico |
| `ms-video-analytics` | `NeuralInstance`, `ExternalCameraMap`, `UnmappedExternalCamera`, `PlateRead`, `LprSegment`, `SegmentWindow`, `TravelTimePair` | Frente Neural Labs |

## Por que é assim

| Decisão | Por quê |
| --- | --- |
| Nenhuma inferência no Attlas | Medido no EC2 de desenvolvimento: decodificar custa quase nada (os `ffmpeg` somavam 3,5%) e inferir custa tudo (o processo Node a 580% num t3a.2xlarge de 8 vCPU). O analítico afogava o MediaMTX e o `ms-cameras`, e a decisão de produto passou a ser resolver toda câmera pelo embarcado |
| O analítico é entidade de banco (`CameraAnalytic`), não flag no JSON da câmera | Flag não tem tipo, unicidade nem região |
| Um analítico ativo por câmera e tipo (índice `CameraAnalytic_camera_type_active_unique`) | Dois do mesmo tipo publicariam a mesma detecção duas vezes |
| A tela diz qual analítico edita (`analyticType`); sem o parâmetro vale ATSPM e depois laço | A câmera pode ter os dois, e escolher em silêncio deixava o segundo sem região |
| A geometria pertence a um preset | Mover o preset faria a geometria apontar para outro trecho da via sem aviso |
| O índice da região vem da ordem estável do `/regions` do equipamento | O array do quadro omite região vazia e reordena |
| "Equipamento caiu" (`OFFLINE`) e "ninguém configurou" (`NOT_CONFIGURED`) são estados diferentes | São duas ações diferentes para o operador |
| A fila de incidentes é o log de eventos filtrado (`CameraEventLog`, categoria `ANALYTICS`) | Duas implementações do mesmo assunto divergiriam |
| Incidente é evento contável, com janela de dedup por câmera, região e tipo | O incidente fica de pé por muitos quadros; sem janela, a contagem não significa nada |
| A tela de Detecção é o único lugar que escreve região, laço e configuração do equipamento | Duas superfícies de escrita divergem; o detalhe da câmera só lê |
| Escrita no equipamento só por ação explícita do operador | O equipamento é compartilhado entre ambientes e toda regravação reinicia o pipeline dele |
| A ocupação tem um contrato só, publicado na transição, com histerese | O consumidor não precisa saber de que build veio, e o controlador lê como laço físico |
| As medidas ATSPM do build `atspm-http` são lidas do equipamento | Decisão do PO: não recalcular no Attlas o que a câmera já calcula |
| O vínculo usa o `source_id` do valor da mensagem, nunca a chave | A chave é o `analytic_id` do app, que muda a cada reinstalação. Um `source_id` acende todas as câmeras que compartilham o equipamento (o mesmo aparelho cadastrado em mais de um Sistema) |
| Grupo de consumidor estável por deployment (`ANALYTICS_STREAM_GROUP_ID`); sem a variável, um UUID por processo | Um grupo fixo compartilhado fazia ambientes diferentes disputarem a partição do mesmo broker do equipamento |
| Reparo do producer só pela instalação dona (`ANALYTICS_OWNED_DEVICE_SOURCE_IDS`), e só liga o producer | Dois escritores automáticos de identidade deixaram o equipamento reiniciando em laço |
| Broker de publicação separado do de consumo (`ANALYTICS_DEVICE_PUBLISH_BROKER`) | O equipamento publica no endereço que ele alcança, que não é o que o serviço usa por dentro |
| O vínculo região-detector é a fonte da entrada de detector da fiação ACOM | A fiação lê o vínculo e deriva `slot` e `channel`; digitar de novo abria duas verdades para o mesmo laço |
| Endereço já publicado como laço físico pelo caminho ACP recusa o vínculo | As duas fontes publicam tecnologia `VIRTUAL_LOOP`, e o histórico somaria o mesmo veículo duas vezes sem erro visível |
| Na Neural Labs, é o dado que associa a câmera | A câmera passa a ser da Neural Labs quando a primeira leitura dela gera o vínculo |

## Armadilhas conhecidas

- **`kind` do evento de detecção não é o tipo do analítico.** Sai `OBJECT_DETECTION` quando o quadro traz incidente
  e `VIRTUAL_LOOP` no resto (`device-stream.consumer.ts`). Nenhuma tela o exibe e nenhum teste trava a semântica;
  não serve para decidir tipo.
- **O ATSPM 0.10.2 manda o incidente por objeto**, em `obj_incidents[i][j]`, e deixa `region_incidents` vazio. O
  consumidor lê os dois.
- **O equipamento não devolve os parâmetros de incidente.** Aceita na escrita e nunca reporta na leitura; a tela
  completa com a cópia do banco (`withStoredPresentation`) e deixa o equipamento mandar no que ele reporta.
- **O `source_id` do equipamento manda.** Quando a Detecção lê o `/config` e o aparelho reporta outro `source_id`, o
  banco se realinha (`reconcileDeviceSourceId`). Salvar região ou laço nunca reescreve o `source_id`; retomar a
  câmera é só pelo Vincular.
- **O mapa de vínculo do consumidor se refaz a cada 30 s**, sem depender de quadro novo. Câmera vinculada aparece no
  ao vivo em até 30 s.
- **Broker errado não gera erro.** O consumidor conecta e assina, a Detecção fica muda, e o único relato é o
  diagnóstico do stream (`camera:analytics:stream`), no log e na tela.
- **Sem `ANALYTICS_STREAM_GROUP_ID` não há métricas por região.** Sem grupo estável cada processo recebe todos os
  quadros, e a gravação por minuto se desliga para não multiplicar a contagem pelo número de réplicas.
- **O laço é configuração da câmera, mas a tela o mostra em cada região.** No ATSPM ele é um bloco só no `/config`
  (`vloop_enabled`, `vloop_classes`, `vloop_exit_grace_ms`): mexer nele numa região muda todas.
- **A frota servidor responde "nenhuma câmera".** O `GET /api/internal/analytic-fleet/status` do `ms-video-analytics`
  devolve lista vazia, e a linha servidor das Instâncias aparece como `NOT_CONFIGURED`.
- **Seed local.** O `nx serve ms-cameras` roda o seed, que só apaga ids do próprio espaço
  (`00000000-0000-4000-8000-*`) e avisa quando `SEED_ATMAN_EMBEDDED_SOURCE_ID` está vazia.
- **Atualizar o app reseta o equipamento.** Ver [[Analítico - Runbook - Embarcado]].

## Glossário

| Termo | O que é |
| --- | --- |
| ACAP | Formato de app instalável na câmera Axis; o app embarcado da Atman é um ACAP |
| ARTPEC | Família de processadores da Axis; a geração decide quais apps rodam na câmera |
| Build | Uma geração do app da Atman, com transporte e capacidades próprios |
| `source_id` | Identidade que o app grava em cada quadro e que o Attlas usa para achar a câmera |
| Producer | O publicador Kafka dentro do app; desligado, nenhum quadro sai |
| Histerese | Atraso proposital para ligar e desligar a ocupação, que evita piscar em quadro isolado |
| RLE | Codificação da série de amostras por repetição, usada no evento de ocupação |
| DAI | Detecção automática de incidentes |
| ATSPM | Métricas automatizadas de desempenho semafórico |
| Digest | Autenticação HTTP por desafio que a Axis exige na porta 80 |
| Caminho ACP | A leitura de detector físico que o `ms-controllers` faz no controlador |
