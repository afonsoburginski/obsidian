---
tags:
  - doc
  - ms-cameras
  - dispositivo
atualizado: 2026-10-01
---

# Integração com dispositivo - Requisitos e SLA

Parte da [[Integração com dispositivo]]. Fonte de negócio: `docs/modules/cameras.md`.

## Requisitos

| ID | Critério | Estado | Evidência |
| --- | --- | --- | --- |
| RF-INT-05 | Integrar câmeras por ONVIF, RTSP e APIs proprietárias sem desenvolvimento por fabricante | **Parcial** | ONVIF genérico, RTSP e a sondagem cobrem o caso sem desenvolvimento. VAPIX e ISAPI existem, chamados direto, fora do par factory e driver; driver `PROPRIETARY` formal não existe. A Hikvision entrou com uma estratégia de comunicação e dois clientes de saúde, sem mexer em streaming, PTZ e saúde |
| RNF-CAM-02 | ONVIF obrigatório; RTSP e proprietárias como fallback | **Atendido** | `OnvifDriver` é o default; RTSP pela estratégia; VAPIX e ISAPI direto; na Hikvision o ONVIF é ligado no cadastro para depender do proprietário o mínimo possível |
| RF-CAM-03 (parte do equipamento) | Heartbeat, latência, perda e qualidade, inclusive por API proprietária | **Atendido** na camada do equipamento | Quatro canais (WebSocket Axis, PullPoint ONVIF, alertStream e poll ISAPI) e `OnvifDriver.executeHeartbeat`; a avaliação é da [[Saúde e monitoramento]] |
| RNF-CAM-01 | A rede cresce sem interrupção nem redesign | **Atendido por desenho** | Estratégias sem estado, driver por operação, nenhum código por fabricante nos consumidores; uma conexão por equipamento físico. Sem teste de carga documentado |
| RNF-CAM-03 | Streaming e PTZ responsivos | **Atendido nos mecanismos** | Timeouts curtos dão falha rápida (`CAMERA_UNREACHABLE`); VAPIX absoluto em unidades nativas evita conversão com perda. Sem SLO numérico |

RF-CAM-01 (cadastro), RF-CAM-05 (PTZ) e RF-CAM-06 e RF-INT-01 (streams) só usam esta camada; ficam nos
domínios respectivos.

## Fallbacks

1. **Protocolo de integração**: escolha explícita por `communicationProtocol`, sem degradação automática de
   ONVIF para RTSP em tempo de execução. `PROPRIETARY` e `ISAPI` não têm driver; a Hikvision usa o
   `OnvifDriver` depois que o ONVIF é ligado.
2. **Qualidade do stream**: `QUALITY_FALLBACK_CHAIN` desce de TERTIARY a SECONDARY a PRIMARY quando falta o
   perfil pedido; na Axis, `buildAxisFallbackUrl` gera variante H.264.
3. **Canal de saúde**: por fabricante. Axis no WebSocket, Hikvision no alertStream com poll de fallback
   escolhido pelo próprio cliente, os demais no PullPoint.

## Timeouts e cadências

Sem SLO de latência formalizado (RNF-CAM-03 é qualitativo). Os limites implementados garantem falha rápida.

| Operação | Limite | Config (env, default) | Ao estourar |
| --- | --- | --- | --- |
| ONVIF `connect` | 5 s | `ONVIF_CONNECT_TIMEOUT_MS`, 5000 | `CAMERA_UNREACHABLE` |
| ONVIF `movePTZ` e `disconnect` | 4 s | `ONVIF_COMMAND_TIMEOUT_MS`, 4000 | `CAMERA_UNREACHABLE` |
| Digest texto (VAPIX, ISAPI) | 5 s | fixo em `digest-auth.utils.ts` | `CAMERA_UNREACHABLE` |
| Digest buffer (imagem) | 8 s | fixo | erro de digest |
| Sondagem, conexão ONVIF | 10 s | fixo em `camera-credential-probe.service.ts` | `CAMERA_UNREACHABLE` |
| Ping WebSocket Axis | 3 s, a cada 5 s, janela de 10 | `PING_TIMEOUT_MS`, `PING_INTERVAL_MS`, `PING_WINDOW_SIZE` | ping conta como perda |
| Long-poll PullPoint | 5 s, assinatura de 60 s | `PT5S`, `PT60S` | ciclo reinicia; falha vira desconexão |
| Poll ISAPI | 15 s, 2 falhas toleradas | `HIKVISION_ISAPI_POLL_INTERVAL_MS`, `HIKVISION_ISAPI_FAILURE_TOLERANCE` | desconexão |
| alertStream ISAPI, conexão | 8 s | `HIKVISION_ALERT_STREAM_CONNECT_TIMEOUT_MS` | erro, ou sem suporte em 404 |
| alertStream ISAPI, silêncio | 30 s | `HIKVISION_ALERT_STREAM_IDLE_TIMEOUT_MS` | desconexão |
| Porta RTSP | 554 | `RTSP_DEFAULT_PORT` | - |

Token wssession da Axis vale cerca de 15 s. Avaliação, incidentes e rollups em [[Saúde e monitoramento]].
