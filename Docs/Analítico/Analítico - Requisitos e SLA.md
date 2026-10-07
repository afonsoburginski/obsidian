---
tags:
  - doc
  - analitico
  - requisitos
aliases:
  - "Anotações sobre Analítico de vídeo"
atualizado: 2026-10-07
---

# Analítico - Requisitos e SLA

Volta para [[Analítico]].

## Resumo

A fonte de regra é `docs/modules/analitico.md` (IDs `RF-*` e `RNF-ANL-*`), que segue o edital seção 4.6. As regras
das reuniões de alinhamento que o documento não cobre estão no fim da seção Regras. O trabalho que falta está em
[[Analítico - Pendências]].

| Recurso do edital | Estado no código |
| --- | --- |
| Visão Geral (tela de Detecção) | Atende, menos o histórico e o versionamento da configuração |
| Analíticos (tela de Instâncias) | Atende, menos a decisão automatizada |
| Incidentes | Atende; tempo por etapa e padrões são parciais |
| ATSPM (tela de Métricas) | Parcial: das oito métricas do edital, só AOG tem fonte |
| Dashboard | Falta inteiro |

## Regras

Na coluna Valor, **Atende**, **Parcial** e **Falta** dizem o estado da regra no código da `develop`.

### Limites e valores

| Regra | Valor | Onde no código |
| --- | --- | --- |
| Analíticos ativos por câmera e tipo | 1 | índice `CameraAnalytic_camera_type_active_unique` |
| Janela de dedup do incidente, por câmera, região e tipo | 30 s | `ANALYTICS_INCIDENT_DEDUP_WINDOW_MS` |
| Saúde `HEALTHY` | último quadro com até 60 s | `ANALYTICS_HEALTH_FRESH_WINDOW_SECONDS` |
| Saúde `DEGRADED`; acima vira `OFFLINE` | último quadro com até 300 s | `ANALYTICS_HEALTH_STALE_WINDOW_SECONDS` |
| Câmera sem `CameraAnalytic` | `NOT_CONFIGURED` | `apps/ms-cameras/src/camera-analytics/camera-analytics-health.service.ts` |
| Mapa de vínculo do consumidor refeito | a cada 30 s | `device-stream.consumer.ts` |
| Lista de fontes relida pela tradução de endereço | a cada 30 s | `VIRTUAL_LOOP_REGISTRY_REFRESH_MS` |
| Presença ao vivo apaga depois de | 1,5 vez o maior intervalo recente entre quadros, entre 250 ms e 2 s | `libs/utils/src/lib/live-presence.constant.ts` |
| Classes de objeto por janela de ocupação | até 16 | `REGION_OCCUPANCY_OBJECT_CLASS_LIMITS` |
| Retenção das métricas por minuto (`CameraRegionMinuteMetric`) | 30 dias, com limpeza uma vez por dia | `apps/ms-cameras/src/analytics-realtime/region-metrics/region-metrics.limits.ts` |
| Janela de leitura das métricas por região | até 24 h, largura múltipla de 60 s | `CameraRegionMetricsValidation` |
| Janela de leitura das medidas do equipamento | até 5 dias, largura de 300 s a 86.400 s | `CameraDeviceMetricsValidation` |
| Cache das medidas do equipamento no Redis | 300 s por janela; 30 s para janela recém-fechada; 60 s para resposta indisponível | `apps/ms-cameras/src/analytics-region-metrics/device-metrics/device-metrics.cache.ts` |
| Prazo da leitura das medidas no equipamento | 20 s | `apps/ms-cameras/src/analytics-region-metrics/device-metrics/device-metrics.config.ts` |
| Prazo de uma chamada à API do app | 8 s | `ATMAN_DEVICE_HTTP_TIMEOUT_MS` |
| Cópia da mídia do incidente no object storage | 7 dias | `ANALYTICS_INCIDENT_MEDIA_CACHE_DAYS` |
| Prazo da mídia do incidente | 15 s até o cabeçalho, 120 s de transferência | `ANALYTICS_INCIDENT_MEDIA_*_TIMEOUT_MS` |
| Varredura da descoberta na rede | até 256 endereços, faixa mais larga `/24`, 64 hosts em paralelo, 6 s por host, resultado testável por 10 min | `NetworkDiscoveryValidation`, `network-discovery.limits.ts` |
| Intervalo de disponibilidade da unidade analítica | 60 s por padrão, configurável por unidade | `AnalyticInstance.pollingIntervalSeconds` |
| Endereço de detector por região e agente | 1 | `REGION_AGENT_ALREADY_BOUND` |
| Regiões por endereço de detector | 1 | `DETECTOR_ADDRESS_ALREADY_BOUND` |
| Analíticos que uma placa ACOM agrega | 4 por padrão | `Acom.analyticSlots` |
| Níveis de criticidade de incidente | 4 (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), por tipo e por Sistema | `EnumIncidentCriticality` |
| Visão da Detecção no Redis | 24 h; 5 min para resposta vazia | `camera-view-preferences.cache-policy.ts` |
| Permissão para região, laço e vínculo região-detector | `cameras.analyticsRegion:configure`, por câmera | `camera-regions.controller.ts`, `virtual-loop-binding.controller.ts` |
| Permissão para unidades, Vincular, descoberta e criticidade | `analytics.instances:manage` | `analytic-instances.controller.ts` e vizinhos |
| Permissão para tratar incidente | `analytics.incidents:treat` | `ANALYTICS_PERMISSIONS` |

### Detecção por objeto e incidentes

| Regra | Valor | Onde no código |
| --- | --- | --- |
| `RF-DAI-01` e `RF-DAI-02`: regiões com tipo, classes e limiar | Atende. Polígono em porcentagem, sem conceito de linha; o backend só valida o formato da geometria | `CameraAnalyticRegion` |
| `RF-DAI-03`: oito tipos de incidente com parâmetros | Parcial. O equipamento aceita os parâmetros e não os devolve; quem avalia a condição (o limiar global do app ou o da região) não está confirmado com o time do embarcado | `EnumAtmanIncidentType` |
| `RF-DAI-04`: região acende ao vivo, caixas pelo canal de tempo real, caixa só de analítico que a entrega, verde só como sinal de detecção | Atende. Nenhuma cor de região é verde, nem na paleta nem na cor personalizada | socket `cameras-analytics` |
| `RF-DAI-05`: criticidade é do tipo, definida pelo órgão gestor, em quatro níveis | Atende | `apps/ms-cameras/src/incident-criticality/` (UC-227) |
| `RF-DAI-06`: não reconhecido, confirmado, em tratamento, resolvido e falso positivo, oferecendo só o que o ciclo permite | Atende no vocabulário e nas transições | `CameraEventTreatment` |
| Edital: tempo por etapa do tratamento para SLA | Parcial. A face Incidentes das Métricas mostra o tempo médio até reconhecer e até concluir, tirado da criação e da última mudança do tratamento; etapas intermediárias não têm registro | `apps/ms-cameras/src/events/reading/get-incident-metrics/` |
| `RF-DAI-07` e `RF-DAI-08`: imagem e vídeo do equipamento, com o objeto destacado | Atende no build ATSPM. O SDCT não tem incidente | `apps/ms-cameras/src/analytic-incident-media/` (UC-225) |
| `RF-DAI-09`: incidentes ao vivo por Sistema | Atende | `camera:incidents:changed` (UC-226) |
| Edital: histórico e padrões de incidente | Parcial. A face Incidentes corta por status, criticidade, analítico, tipo, local, câmera e câmera por hora do dia; recorrência do mesmo incidente no mesmo lugar não existe | face Incidentes (UF-044) |

### Laço virtual

| Regra | Valor | Onde no código |
| --- | --- | --- |
| `RF-VL-01`: sem geometria própria, configuração única por câmera | Atende no dado; a tela mostra o bloco do laço em cada região | `CameraAnalytic.loopConfig` |
| `RF-VL-02` e `RF-VL-04`: cruzamento vira leitura de detector `VIRTUAL_LOOP`, `VEHICLE` ou `PEDESTRIAN` | Atende pelos builds HTTP. O app de laço por TCP não fecha sem endereçamento manual ([[Analítico - Fluxos#Ocupação até o detector]]) | `apps/ms-video-analytics/src/detector-translation/` |
| `RF-VL-03`: embarcado ou servidor | Parcial. Só o embarcado existe; o servidor Atman descrito na regra não tem implementação | |
| `RF-VL-05` e `RF-ACOM-04`: contato seco pela ACOM; o analítico sabe para qual placa sinaliza | Atende. Ver [[Analítico - Vínculo com a ACOM]] | `apps/ms-video-analytics/src/acom-link/` (CROSS-168) |
| O vínculo da região segue o detector quando ele muda de endereço | Atende | `apps/ms-cameras/src/virtual-loop-binding/readdress/` (CROSS-146) |

### ATSPM

| Regra | Valor | Onde no código |
| --- | --- | --- |
| `RF-ATSPM-03` AOG | Atende pela medida do equipamento (`arrivals_on_green`), só no build ATSPM | `device-metrics` (UC-229) |
| `RF-ATSPM-01` Split Monitor, `02` Yellow e Red, `04` PCD, `05` Approach Delay, `06` TMC, `07` Preemption, `08` Priority | Falta. Nenhuma das sete tem fonte | |
| `RF-ATSPM-09`: legível para exportação | Atende para o que a tela mostra (XLS e PDF) | `apps/ms-cameras/src/analytics-metrics-export/` |
| `RF-ATSPM-10`: o cálculo não roda na câmera | Substituída para o build `atspm-http` por decisão do PO: o Attlas lê o que o app calcula | (UC-229) |
| `RNF-ANL-06`: snapshot da configuração semafórica por ciclo | Falta. O ciclo guarda o id do plano; o snapshot do `ms-controllers` é backup do operador, não por ciclo | |
| `RNF-ANL-07`: métrica sem produtor não mostra número | Atende. Cartão sem fonte aparece vazio | face ATSPM |

A face ATSPM tem 38 métricas em sete grupos. O app ATSPM calcula a maior parte delas (volume, velocidade, atrasos,
índices de confiabilidade, AOG, AOR, ciclo, fila, nível de serviço), e as métricas por região e os leitores de
detector cobrem volume, fluxo, velocidade e ocupação. Nenhuma delas é uma das sete métricas do edital que faltam.

### Visão Geral e unidades analíticas

| Regra | Valor | Onde no código |
| --- | --- | --- |
| `RF-VG-01` a `RF-VG-05` e `RF-VG-07`: uma tela, imagem congelada na edição, salvar e descartar o conjunto, validação ao vivo | Atende na tela de Detecção | `DetectionPage` |
| `RF-VG-06`: histórico e versionamento da configuração, com reverter | Falta. Cada gravação vira evento de auditoria (`CAMERA_DETECTION_REGIONS_SET`, `CAMERA_VIRTUAL_LOOPS_SET`), sem versão, motivo nem reverter | `camera-regions.audit.ts` |
| `RF-INST-01` a `RF-INST-03`: cadastro, estado e histórico de disponibilidade com intervalo configurável | Atende | `AnalyticInstance`, `AnalyticInstanceAvailability` |
| `RF-INST-04` e `RNF-ANL-01`: uma unidade por câmera e capacidade | Atende | `CameraAnalytic_camera_type_active_unique` |
| `RF-INST-05`: leitura alimenta decisão automatizada | Falta | |
| `RF-INST-06` a `RF-INST-08`: descoberta só lê, vínculo explícito e auditado, tomada exige confirmação | Atende | `apps/ms-cameras/src/analytic-network-discovery/` (UC-217), `apps/ms-cameras/src/analytic-device-binding/` (UC-216) |
| `RNF-ANL-03`: escrita no equipamento só por ação explícita | Atende | |

### Dashboard

| Regra | Valor | Onde no código |
| --- | --- | --- |
| `RF-DASH-01` a `RF-DASH-06` | Falta. O módulo não tem aba nem rota de dashboard | `analytics-nav.constant.ts` |

### Tempo medido por placa

As regras do `docs/modules/analitico.md` seções 3.8 e 3.9 e o estado delas estão em
[[Analítico - Neural Labs - Tempo de viagem]] e [[Analítico - Neural Labs - Vínculo de câmeras]].

### Regras das reuniões de alinhamento

Pedidas nas reuniões de alinhamento do módulo e não escritas no `docs/modules/analitico.md`.

| Regra | Valor | Onde no código |
| --- | --- | --- |
| Associação grupo de movimento e grupo semafórico 1 para 1 | Parcial. O campo é ordinal, sem FK e sem unicidade, então dois grupos podem apontar para o mesmo | `MovementGroup.trafficSignalGroupId` |
| Um movimento pertence a um grupo de movimento só | Atende | `Movement.movementGroupId` (FK escalar) |
| Até 4 laços por câmera | Falta. A configuração do laço é uma por câmera; a spec está `planned` | `IVirtualLoopConfig` (UC-073) |
| Uma ACOM agrega até 4 analíticos | Atende como padrão da placa | `Acom.analyticSlots` |
| Várias ACOMs por analítico servidor | Não se aplica: o embarcado guarda um destino só, e não há analítico servidor que sinalize placa | |
| Configuração da placa chamada "Periféricos ACOM", com a lógica de saída como configuração avançada | Parcial. A placa é a sub-aba ACOMs do controlador, com a lógica num diálogo próprio | |
| Atualização remota do app embarcado | Falta. O Vincular inicia e reinicia o app pela API de aplicações da Axis (`/axis-cgi/applications/control.cgi`), mas nada instala nem atualiza | `apps/ms-cameras/src/analytics-device/applications/` |
| Contar detecções repetidas do mesmo incidente | Atende pela janela de dedup | `ANALYTICS_INCIDENT_DEDUP_WINDOW_MS` |
| Qualidade da imagem de evidência | Atende: a imagem vem do app, em 640x360, e o vídeo da gravação da câmera, em 1080p | `apps/ms-cameras/src/analytic-incident-media/` |

## Variáveis de ambiente

### `ms-cameras`

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `ANALYTICS_STREAM_BROKERS` | vazio | Broker Kafka em que o equipamento publica, em lista. Vazio desliga o analítico ao vivo; o `DeviceStreamConsumer` não inicia e avisa o motivo |
| `ANALYTICS_STREAM_GROUP_ID` | vazio | Grupo de consumidor estável por deployment. Vazio vira um UUID por processo e desliga a gravação das métricas por região |
| `ANALYTICS_STREAM_CONNECTION_TIMEOUT_MS` | `10000` | Prazo de conexão do cliente Kafka do stream |
| `ANALYTICS_STREAM_REQUEST_TIMEOUT_MS` | `25000` | Prazo de requisição do cliente Kafka do stream |
| `ANALYTICS_STREAM_HEARTBEAT_INTERVAL_MS` | `10000` | Heartbeat do grupo do consumidor |
| `ANALYTICS_STREAM_DIAGNOSTIC_GRACE_MS` | `20000` | Quanto tempo sem quadro ainda conta como ao vivo no diagnóstico do stream |
| `ANALYTICS_STREAM_DIAGNOSTIC_INTERVAL_MS` | `5000` | Cadência do diagnóstico do stream e da reclassificação da saúde empurrada pelo socket |
| `ANALYTICS_STREAM_MAX_BYTES_PER_PARTITION` | `65536` | Tamanho máximo da busca por partição |
| `ANALYTICS_STREAM_MAX_OFFSET_LAG` | `200` | Atraso, em mensagens, acima do qual o consumidor salta para o fim do log |
| `ANALYTICS_STREAM_SOURCE_PEEK_BYTES` | `128` | Quanto do início do quadro é lido para achar o `source_id` |
| `ANALYTICS_OWNED_DEVICE_SOURCE_IDS` | vazio | `source_id` dos equipamentos que esta instalação governa; só o dono religa o producer |
| `ANALYTICS_DEVICE_PUBLISH_BROKER` | vazio | Broker que o equipamento alcança, gravado nele pelo Vincular. Vazio usa o primeiro de `ANALYTICS_STREAM_BROKERS` |
| `ANALYTICS_INCIDENT_DEDUP_WINDOW_MS` | `30000` | Janela de dedup do incidente |
| `ANALYTICS_INCIDENT_MEDIA_HEADER_TIMEOUT_MS` | `15000` | Prazo até o equipamento começar a responder a mídia do incidente |
| `ANALYTICS_INCIDENT_MEDIA_BODY_TIMEOUT_MS` | `120000` | Prazo da transferência inteira da mídia |
| `ANALYTICS_INCIDENT_MEDIA_CACHE_DAYS` | `7` | Dias da cópia da mídia no object storage, prefixo `incident-media` |
| `ATMAN_ANALYTIC_API_PATHS` | `/local/atman_traffic_edge_atspm/api` | Caminhos da API do app ATSPM, tentados em ordem. `ATMAN_ANALYTIC_API_PATH` (singular) ainda vale quando a lista está vazia |
| `ATMAN_ANALYTIC_API_ENDPOINTS` | lista do código (`http:80`, `https:443`) | Transportes da API do app ATSPM; valor malformado aborta o boot |
| `ATMAN_HORUS_API_PATHS` | `/traffic-motion-detection,/horus/traffic-analytics` | Prefixos do build `horus-http` |
| `ATMAN_HORUS_API_ENDPOINTS` | lista do código (`http:8000`) | Transportes do build `horus-http` |
| `ATMAN_SDCT_API_ENDPOINTS` | lista do código (`http:2002`) | Transportes do build SDCT |
| `ATMAN_SDCT_API_PATHS` | lista do código (`/horus/traffic-edge-sdct`) | Prefixo do build SDCT |
| `ATMAN_DEVICE_HTTP_TIMEOUT_MS` | `8000` | Prazo de uma chamada à API do app |
| `ANALYTICS_HEALTH_FRESH_WINDOW_SECONDS` | `60` | Idade do último quadro ainda `HEALTHY` |
| `ANALYTICS_HEALTH_STALE_WINDOW_SECONDS` | `300` | Teto do `DEGRADED` |
| `ANALYTICS_HEALTH_WRITE_THROTTLE_MS` | `5000` | Teto de escrita da saúde no Redis por câmera |
| `ANALYTICS_LAST_FRAME_KEY_TTL_SECONDS` | `86400` | TTL da chave do último quadro, para a tela dizer "parou há X" |
| `VIRTUAL_LOOP_CONNECTOR_URL` | `http://localhost:3092` | Base do `ms-connector-virtual-loop`. Sem ela, câmera de laço por TCP cai no build `absent` |
| `VIRTUAL_LOOP_CONNECTOR_TIMEOUT_MS` | `5000` | Prazo de cada chamada ao conector |
| `MS_VIDEO_ANALYTICS_INTERNAL_URL` | `http://localhost:3302` | Linha da frota servidor e estado do vínculo ACOM. Sem ela, a linha aparece `NOT_CONFIGURED` e o vínculo ACOM responde `available: false` |
| `MS_DETECTOR_HISTORY_INTERNAL_URL` | `http://localhost:3016` | Trava de contagem dupla do vínculo. Sem ela, o vínculo é aceito com aviso no log |
| `MS_TRAFFIC_MODEL_URL` | `http://localhost:3010` | Preenchimento do id do detector do Modelo de Tráfego nos vínculos, no boot |
| `SEED_ATMAN_EMBEDDED_SOURCE_ID` | vazio | Só o seed: `source_id` gravado no app da câmera embarcada de bancada |
| `SEED_BINDING_CONTROLLER_ID` | vazio | Só o seed: controlador para o qual os vínculos laço-detector apontam; vazio não semeia vínculo |

### `ms-connector-virtual-loop`

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `DEVICE_TCP_PORT` | `3091` | Porta em que o app de laço disca. Trocar quebra a frota, que tem o endereço gravado no equipamento |
| `COMMAND_TIMEOUT_MS` | `20000` | Prazo de um comando ao equipamento |
| `HANDSHAKE_TIMEOUT_MS` | `10000` | Prazo do handshake; quem não completa é derrubado |
| `KEEPALIVE_INTERVAL_S` | `5` | Silêncio até a sonda de vivacidade |
| `KEEPALIVE_TIMEOUT_S` | `120` | Silêncio até declarar o equipamento offline e destruir a sessão |
| `DEVICE_ALLOWLIST` | vazio | IPs ou prefixos aceitos; vazio aceita qualquer origem, porque o equipamento não se autentica |

### `ms-video-analytics`

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `MS_CAMERAS_INTERNAL_URL` | `http://localhost:3300` | De onde o registro relê as fontes e por onde o destino ACOM é lido e gravado |
| `VIRTUAL_LOOP_REGISTRY_REFRESH_MS` | `30000` | Intervalo de releitura das fontes do `ms-cameras` |
| `VIRTUAL_LOOP_SHARD_INDEX`, `VIRTUAL_LOOP_SHARD_COUNT` | `0`, `1` | Como o registro reparte a frota entre réplicas |
| `ACOM_ANALYTIC_LINK_ENABLED` | `true` | Liga o orquestrador do vínculo ACOM, as rotas `/api/internal/acom-links` e o varredor de repetição |
| `ACOM_LINK_RETRY_BASE_MS` | `30000` | Primeira espera de um vínculo `FAILED`; dobra a cada falha |
| `ACOM_LINK_RETRY_MAX_MS` | `1800000` | Teto da espera entre repetições |
| `ACOM_LINK_RETRY_MAX_ATTEMPTS` | `10` | Tentativas por revisão da placa; esgotadas, o vínculo fica `FAILED` até o próximo retrato |
| `ACOM_LINK_LEASE_MS` | `180000` | Reserva de um vínculo pelo varredor e prazo do `PENDING` recém-aceito |
| `ACOM_LINK_SWEEP_INTERVAL_MS` | `15000` | Intervalo do varredor |
| `ACOM_LINK_SWEEP_BATCH_SIZE` | `20` | Vínculos por passada do varredor |
| `ACOM_LINK_INTERNAL_HTTP_TIMEOUT_MS` | `30000` | Prazo de cada chamada ao `ms-cameras` |

As variáveis da frente Neural Labs estão em [[Analítico - Neural Labs - Arquitetura e estratégias]].

## Glossário

| Termo | O que é |
| --- | --- |
| AOG | Chegadas no verde: fração dos veículos que chegam ao semáforo com o verde aceso |
| Split Monitor | Tempo de verde efetivamente usado por fase em cada ciclo |
| PCD | Diagrama de coordenação de pelotões: chegadas ao longo do ciclo |
| TMC | Contagem por movimento de conversão |
| Dedup | Janela em que o mesmo incidente da mesma região não gera segunda linha |
| Agente | Quem a região conta: veículo ou pedestre |
| Snapshot por ciclo | Cópia da configuração semafórica vigente em cada ciclo, base das métricas semafóricas |
