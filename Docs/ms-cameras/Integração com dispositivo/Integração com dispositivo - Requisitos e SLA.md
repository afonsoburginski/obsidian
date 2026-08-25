---
tags:
  - doc
  - ms-cameras
  - cameras
  - dispositivo
  - hardware
atualizado: 2026-08-24
---

# Integração com dispositivo - Requisitos e SLA

> Rastreabilidade RF/RNF do adaptador multi-protocolo. Índice: [[Integração com dispositivo]]. Fonte de negócio: `docs/modules/cameras.md`.

## Requisitos cobertos por este domínio

| ID | Critério (domínio) | Estado | Evidência no código |
| --- | --- | --- | --- |
| RF-INT-05 | Integrar câmeras via ONVIF, RTSP e APIs proprietárias **sem dev específico por fabricante** | Parcial | ONVIF genérico (`onvif.driver.ts`) + RTSP (`rtsp-camera-communication.strategy.ts`) + probe autodescoberta (`camera-credential-probe.service.ts`) cobrem o caso sem-dev. VAPIX/Axis e ISAPI/Hikvision existem mas são acoplados (chamados direto, fora da factory/driver); **driver PROPRIETARY formal não implementado** (`camera-driver.factory.ts` lança). A chegada da Hikvision (agosto, INT-018/019/020) reforça o padrão: um fabricante novo entrou implementando uma `ICameraCommunicationStrategy` + 2 health clients, sem tocar nos consumidores de streaming/PTZ/saúde |
| RNF-CAM-02 | ONVIF obrigatório; RTSP e proprietárias de fallback | Atendido | `OnvifDriver` é o default/preferido (Factory + `i-camera-driver.interface.ts`); RTSP via estratégia; VAPIX e ISAPI proprietários direto. Hikvision além disso tem o ONVIF **ativado automaticamente** no cadastro (INT-020) para não depender do proprietário mais do que o necessário |
| RF-CAM-03 (parte device) | Canais RTSP/ONVIF ativos; heartbeat, latência, perda de pacotes, inclusive sobre APIs proprietárias | Atendido (camada device) | `AxisWsClient` (WS + RTT `measurePing`), `OnvifPullPointClient` (PullMessages=heartbeat) e, desde agosto, `HikvisionAlertStreamClient`/`HikvisionIsapiHeartbeatClient` (ISAPI); `OnvifDriver.executeHeartbeat` mede latência. Avaliação/estado é de [[Saúde e monitoramento\|Saúde]] |
| RNF-CAM-01 | Rede cresce sem interrupção nem redesign | Atendido por design | Estratégias stateless + driver por operação (sem estado global por câmera na camada de comando); sem código por fabricante nos consumidores - confirmado de novo com a chegada da Hikvision, que não exigiu mudança em `streaming/`, `ptz.service.ts` nem nos consumidores de saúde. Sem teste de carga documentado aqui |
| RNF-CAM-03 | Streaming/PTZ responsivos; latência de PTZ baixa p/ uso operacional | Atendido (mecanismos) | Timeouts curtos por I/O (connect 5 s, comando 4 s) → falha rápida `CAMERA_UNREACHABLE`; VAPIX absoluto em unidades nativas evita conversão lossy. Sem SLO numérico de latência fim-a-fim definido |

Requisitos **não** deste domínio (só tangenciados): RF-CAM-01 (cadastro - usa o probe), RF-CAM-05 (PTZ - usa driver/VAPIX), RF-CAM-06/RF-INT-01 (streams/VMS - usa o descritor). Ficam nos domínios respectivos.

## Estratégia de fallback de protocolo

Três dimensões distintas de fallback:

1. **Protocolo de integração** (RNF-CAM-02): ONVIF é o preferido; RTSP e proprietário (VAPIX ou ISAPI) são alternativas. A seleção é **explícita** por `communicationProtocol` da câmera - não há degradação automática ONVIF→RTSP em runtime. `PROPRIETARY` como driver ainda lança (`PROPRIETARY_PROTOCOL_NOT_SUPPORTED`); `ISAPI` como driver também não existe (cai no genérico `UNSUPPORTED_CAMERA_PROTOCOL`), mas isso nunca é exercitado porque Hikvision usa o `OnvifDriver` para PTZ depois do INT-020.
2. **Qualidade de stream** (streaming): `QUALITY_FALLBACK_CHAIN` desce TERTIARY→SECONDARY→PRIMARY quando o perfil pedido não existe (`camera-stream-source.resolver.ts`). Além disso, `buildAxisFallbackUrl` gera variante H.264 quando o codec configurado não é H.264 (só se aplica à Axis; a estratégia ISAPI não anexa parâmetros de codec na URL).
3. **Canal de saúde**: a seleção hoje é **dinâmica por fabricante**, não mais fixa - `AXIS`→`AXIS_WEBSOCKET`, `HIKVISION`→`HIKVISION_ISAPI_ALERT_STREAM` (com `HIKVISION_ISAPI_POLL` como fallback que o próprio client escolhe quando a firmware não expõe `alertStream`), qualquer outro fabricante→`ONVIF_PULLPOINT`. Ver [[Integração com dispositivo - Fluxos]] fluxo 5 - a versão anterior desta nota descrevia isso como pendente, o que não é mais o caso.

## SLA de latência e timeout

Sem SLO numérico de latência operacional formalizado (RNF-CAM-03 é qualitativo). Os limites duros implementados são os timeouts que garantem **falha rápida** em vez de travamento:

| Operação | Timeout | Config (env → default) | Ao estourar |
| --- | --- | --- | --- |
| ONVIF `connect` | 5 s | `ONVIF_CONNECT_TIMEOUT_MS` → 5000 | `CAMERA_UNREACHABLE` |
| ONVIF `movePTZ`/`disconnect` | 4 s | `ONVIF_COMMAND_TIMEOUT_MS` → 4000 | `CAMERA_UNREACHABLE` |
| VAPIX/ISAPI digest (texto) | 5 s | fixo (`digest-auth.utils.ts`) | `CAMERA_UNREACHABLE` |
| VAPIX digest (buffer/imagem) | 8 s | fixo | erro de digest |
| Probe de credenciais | 10 s | fixo (`camera-credential-probe.service.ts`) | `CAMERA_UNREACHABLE` |
| WS ping (RTT, Axis) | 3 s | `PING_TIMEOUT_MS` → 3000 | ping conta como perda (janela) |
| PullPoint long-poll (ONVIF) | 5 s | `PULL_TIMEOUT_ISO` = `PT5S` | ciclo reinicia; falha → disconnected |
| Poll ISAPI (Hikvision) | 15 s por ciclo | `HIKVISION_ISAPI_POLL_INTERVAL_MS` → 15000 | tolera `HIKVISION_ISAPI_FAILURE_TOLERANCE` (→2) falhas consecutivas antes de `disconnected` |
| AlertStream ISAPI conexão | 8 s | `HIKVISION_ALERT_STREAM_CONNECT_TIMEOUT_MS` → 8000 | erro/`unsupported` (404 = firmware sem o endpoint) |
| AlertStream ISAPI inatividade | 30 s | `HIKVISION_ALERT_STREAM_IDLE_TIMEOUT_MS` → 30000 | `disconnected` (conexão viva mas silenciosa) |

Cadência de saúde: ping Axis a cada `PING_INTERVAL_MS`→5 s, janela `PING_WINDOW_SIZE`→10; token wssession válido ~15 s; subscription PullPoint TTL `PT60S`. Detalhe de avaliação, incidentes e rollups em [[Saúde e monitoramento\|Saúde e monitoramento]].
