---
tags: [doc, cameras, ms-cameras, hardware]
---

# Integração com dispositivo — Requisitos e SLA

> Rastreabilidade RF/RNF do adaptador multi-protocolo. Índice: [[00 - Integração com dispositivo]]. Fonte de negócio: `docs/modules/cameras.md`.

## Requisitos cobertos por este domínio

| ID | Critério (domínio) | Estado | Evidência no código |
| --- | --- | --- | --- |
| RF-INT-05 | Integrar câmeras via ONVIF, RTSP e APIs proprietárias **sem dev específico por fabricante** | Parcial | ONVIF genérico (`onvif.driver.ts`) + RTSP (`rtsp-camera-communication.strategy.ts`) + probe autodescoberta (`camera-credential-probe.service.ts`) cobrem o caso sem-dev. VAPIX/Axis existe mas é acoplado; **driver PROPRIETARY formal não implementado** (`camera-driver.factory.ts` lança) |
| RNF-CAM-02 | ONVIF obrigatório; RTSP e proprietárias de fallback | Atendido | `OnvifDriver` é o default/preferido (Factory + `i-camera-driver.interface.ts`); RTSP via estratégia; VAPIX proprietário direto |
| RF-CAM-03 (parte device) | Canais RTSP/ONVIF ativos; heartbeat, latência, perda de pacotes, inclusive sobre APIs proprietárias | Atendido (camada device) | `AxisWsClient` (WS + RTT `measurePing`) e `OnvifPullPointClient` (PullMessages=heartbeat); `OnvifDriver.executeHeartbeat` mede latência. Avaliação/estado é de [[00 - Saúde e monitoramento\|Saúde]] |
| RNF-CAM-01 | Rede cresce sem interrupção nem redesign | Atendido por design | Estratégias stateless + driver por operação (sem estado global por câmera na camada de comando); sem código por fabricante nos consumidores. Sem teste de carga documentado aqui |
| RNF-CAM-03 | Streaming/PTZ responsivos; latência de PTZ baixa p/ uso operacional | Atendido (mecanismos) | Timeouts curtos por I/O (connect 5 s, comando 4 s) → falha rápida `CAMERA_UNREACHABLE`; VAPIX absoluto em unidades nativas evita conversão lossy. Sem SLO numérico de latência fim-a-fim definido |

Requisitos **não** deste domínio (só tangenciados): RF-CAM-01 (cadastro — usa o probe), RF-CAM-05 (PTZ — usa driver/VAPIX), RF-CAM-06/RF-INT-01 (streams/VMS — usa o descritor). Ficam nos domínios respectivos.

## Estratégia de fallback de protocolo

Duas dimensões distintas de fallback:

1. **Protocolo de integração** (RNF-CAM-02): ONVIF é o preferido; RTSP e proprietário (VAPIX) são alternativas. A seleção é **explícita** por `communicationProtocol` da câmera — não há degradação automática ONVIF→RTSP em runtime. `PROPRIETARY` como driver ainda lança (`PROPRIETARY_PROTOCOL_NOT_SUPPORTED`).
2. **Qualidade de stream** (streaming): `QUALITY_FALLBACK_CHAIN` desce TERTIARY→SECONDARY→PRIMARY quando o perfil pedido não existe (`camera-stream-source.resolver.ts`). Além disso, `buildAxisFallbackUrl` gera variante H.264 quando o codec configurado não é H.264.
3. **Canal de saúde**: `AXIS_WEBSOCKET` (Axis) com `ONVIF_PULLPOINT` como fallback para câmeras sem WebSocket Axis — porém o bootstrap atual fixa `AXIS_WEBSOCKET` (seleção por fabricante pendente).

## SLA de latência e timeout

Sem SLO numérico de latência operacional formalizado (RNF-CAM-03 é qualitativo). Os limites duros implementados são os timeouts que garantem **falha rápida** em vez de travamento:

| Operação | Timeout | Config (env → default) | Ao estourar |
| --- | --- | --- | --- |
| ONVIF `connect` | 5 s | `ONVIF_CONNECT_TIMEOUT_MS` → 5000 | `CAMERA_UNREACHABLE` |
| ONVIF `movePTZ`/`disconnect` | 4 s | `ONVIF_COMMAND_TIMEOUT_MS` → 4000 | `CAMERA_UNREACHABLE` |
| VAPIX digest (texto) | 5 s | fixo (`digest-auth.utils.ts`) | `CAMERA_UNREACHABLE` |
| VAPIX digest (buffer/imagem) | 8 s | fixo | erro de digest |
| Probe de credenciais | 10 s | fixo (`camera-credential-probe.service.ts`) | `CAMERA_UNREACHABLE` |
| WS ping (RTT) | 3 s | `PING_TIMEOUT_MS` → 3000 | ping conta como perda (janela) |
| PullPoint long-poll | 5 s | `PULL_TIMEOUT_ISO` = `PT5S` | ciclo reinicia; falha → disconnected |

Cadência de saúde: ping a cada `PING_INTERVAL_MS`→5 s, janela `PING_WINDOW_SIZE`→10; token wssession válido ~15 s; subscription PullPoint TTL `PT60S`. Detalhe de avaliação, incidentes e rollups em [[00 - Saúde e monitoramento\|Saúde e monitoramento]].
</content>
