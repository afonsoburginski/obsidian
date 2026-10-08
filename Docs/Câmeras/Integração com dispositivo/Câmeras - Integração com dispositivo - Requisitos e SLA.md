---
tags:
  - doc
  - cameras
  - dispositivo
  - ms-cameras
aliases:
  - "Integração com dispositivo - Requisitos e SLA"
atualizado: 2026-10-07
banner: "surveillance camera technology"
---

# Câmeras - Integração com dispositivo - Requisitos e SLA

Volta para [[Câmeras - Integração com dispositivo]].

## Resumo

Fonte de negócio: `docs/modules/cameras.md`, seção 2. Não há SLO de latência formalizado: os limites abaixo
existem para a falha ser rápida (`CAMERA_UNREACHABLE`), não para medir desempenho.

| Requisito | Estado | Evidência |
| --- | --- | --- |
| RF-INT-05 Integrar câmeras por ONVIF, RTSP e APIs proprietárias sem desenvolvimento por fabricante | **Parcial** | ONVIF genérico, RTSP e a sondagem cobrem o caso sem desenvolvimento. VAPIX e ISAPI existem, chamados direto, fora do par factory e driver; driver `PROPRIETARY` formal não existe. A Hikvision entrou com uma estratégia de stream e dois clientes de saúde, sem mexer em streaming, PTZ e saúde |
| RNF-CAM-02 ONVIF obrigatório; RTSP e proprietárias como alternativa | **Atendido** | `OnvifDriver` é o padrão; RTSP pela estratégia; VAPIX e ISAPI direto; na Hikvision o ONVIF é ligado no cadastro para depender o mínimo do proprietário |
| RF-CAM-03, parte do equipamento: heartbeat, latência, perda e qualidade, inclusive por API proprietária | **Atendido** na camada do equipamento | Quatro canais (WebSocket da Axis, PullPoint do ONVIF, alertStream e consulta de status ISAPI) e `OnvifDriver.executeHeartbeat`; a avaliação é da [[Câmeras - Saúde e monitoramento]] |
| RNF-CAM-01 A rede cresce sem interrupção nem redesenho | **Atendido por desenho** | Estratégias sem estado, nenhum código por fabricante nos consumidores, uma conexão por equipamento físico. Não há teste de carga documentado |
| RNF-CAM-03 Streaming e PTZ responsivos | **Atendido nos mecanismos** | Timeouts curtos dão falha rápida; sessão ONVIF de controle reaproveitada entre comandos; VAPIX absoluto em unidades nativas evita conversão com perda. Não há SLO numérico |

RF-CAM-01 (cadastro), RF-CAM-05 (PTZ), RF-CAM-06 e RF-INT-01 (streams) só usam esta camada e ficam nos
subdomínios respectivos.

## Regras

| Regra | Valor | Onde no código |
| --- | --- | --- |
| Escolha do protocolo | Explícita por `communicationProtocol`; não há troca automática de ONVIF para RTSP em execução | `hardware/communication/camera-communication-strategy.selector.ts` |
| Cadeia de qualidade do stream | TERTIARY, depois SECONDARY, depois PRIMARY, quando falta o perfil pedido | `QUALITY_FALLBACK_CHAIN`, `streaming/services/camera-stream-source.resolver.ts` |
| Resolução da escada | SECONDARY 1280x720, TERTIARY 640x360 | `QUALITY_RESOLUTION_LADDER`, `streaming/helpers/stream-tier-capability.helper.ts` |
| URL reserva na Axis | H.264 baseline quando o codec pedido não é H.264 | `buildAxisFallbackUrl`, `camera-stream-source.resolver.ts` |
| Canal de saúde | Axis no WebSocket, Hikvision no alertStream com consulta de status como reserva, demais no PullPoint | `resolveMonitoringOptions`, `health/workers/camera-health.worker.ts` |
| Sessão ONVIF, conexão | 5 s | `ptz.service.ts`, `ONVIF_CONNECT_TIMEOUT_MS` |
| Comando ONVIF de PTZ | 4 s | `ptz.service.ts`, `ONVIF_COMMAND_TIMEOUT_MS` |
| Sessão de controle PTZ ociosa | descartada após 120 s sem comando | `PTZ_DRIVER_IDLE_TTL_MS`, `cameras/constants/ptz-driver-pool.constant.ts` |
| Leitura do encoder ONVIF | 10 s, falha vira `null` | `ENCODER_CONFIG_TIMEOUT_MS`, `hardware/drivers/onvif/onvif.driver.ts` |
| Sentinela do VBR | bitrate a partir de 1 000 000 kbps é estimado pela resolução | `MAX_SANE_BITRATE_KBPS`, `hardware/drivers/onvif/estimate-bitrate.util.ts` |
| Digest de texto (VAPIX, ISAPI) | 5 s | `DIGEST_TEXT_TIMEOUT_MS`, `health/utils/digest-auth.utils.ts` |
| Digest de imagem | 8 s | `DIGEST_BUFFER_TIMEOUT_MS`, `health/utils/digest-auth.utils.ts` |
| Sondagem, conexão ONVIF | 10 s | `PROBE_TIMEOUT_MS`, `cameras/services/camera-credential-probe.service.ts` |
| Ping do WebSocket da Axis | timeout de 3 s, a cada 5 s, janela de 10 amostras | `PingConfig`, `health/workers/camera-health.worker.ts` |
| Token de sessão do WebSocket da Axis | cerca de 15 s | `AxisDigestClient.fetchWsSessionToken` |
| Espera do PullPoint | até 5 s por ciclo, assinatura de 60 s, até 10 mensagens | `PULL_TIMEOUT_ISO`, `SUBSCRIPTION_TTL_ISO`, `MESSAGE_LIMIT`, `health/clients/onvif-pullpoint.client.ts` |
| Consulta de status ISAPI | a cada 15 s, 2 falhas toleradas | `health/clients/hikvision-isapi-heartbeat.client.ts` |
| alertStream ISAPI | 8 s para conectar, 30 s de silêncio é desconexão | `health/clients/hikvision-alert-stream.client.ts` |
| Reparo automático do producer do analítico | no máximo uma vez a cada 120 s por câmera, só nos equipamentos listados | `analytics-realtime/analytics-producer-repair.service.ts` |

## Variáveis de ambiente

Todas no `apps/ms-cameras/.env.example`.

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `ONVIF_CONNECT_TIMEOUT_MS` | 5000 | Prazo para abrir a sessão ONVIF de controle; estouro é `CAMERA_UNREACHABLE` |
| `ONVIF_COMMAND_TIMEOUT_MS` | 4000 | Prazo de cada comando PTZ ONVIF; estouro é `CAMERA_UNREACHABLE` |
| `RTSP_DEFAULT_PORT` | 554 | Porta RTSP usada nas opções de conexão; o ONVIF usa a porta do perfil |
| `PING_TIMEOUT_MS` | 3000 | Prazo do ping do WebSocket da Axis; estouro conta como perda |
| `PING_INTERVAL_MS` | 5000 | Intervalo entre pings |
| `PING_WINDOW_SIZE` | 10 | Amostras na janela de perda e latência |
| `HIKVISION_ISAPI_POLL_INTERVAL_MS` | 15000 | Intervalo da consulta `GET /ISAPI/System/status` |
| `HIKVISION_ISAPI_FAILURE_TOLERANCE` | 2 | Falhas seguidas antes de declarar desconexão |
| `HIKVISION_ALERT_STREAM_CONNECT_TIMEOUT_MS` | 8000 | Prazo para abrir o alertStream |
| `HIKVISION_ALERT_STREAM_IDLE_TIMEOUT_MS` | 30000 | Silêncio no alertStream que vira desconexão |
| `STREAM_AV1_ENABLED` | `false` | Libera AV1 nativo da Axis no vídeo ao vivo |
| `ANALYTICS_OWNED_DEVICE_SOURCE_IDS` | vazio | Equipamentos cujo producer do analítico esta instalação pode religar sozinha; vazio desliga toda escrita automática em equipamento |
| `SEED_CAMERA_USER` | `root` | Usuário das câmeras de bancada gravado pelo seed |
| `SEED_CAMERA_PASSWORD` | vazio | Senha das câmeras de bancada; sem ela, o seed grava as câmeras sem credencial e o RTSP responde 401 |
| `SEED_ATMAN_EMBEDDED_SOURCE_ID` | vazio | `source_id` do analítico embarcado da `10.1.1.80` gravado pelo seed; vazio semeia o analítico sem `source_id`, e os quadros do equipamento ficam sem vínculo |

O intervalo do keyframe pedido à Axis (`CAMERA_KEYFRAME_INTERVAL_MS`, `CAMERA_KEYFRAME_INTERVAL`) pertence ao
vídeo e está em [[Câmeras - Streaming - Requisitos e SLA]].
