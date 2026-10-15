---
tags:
  - doc
  - cameras
  - streaming
  - ms-cameras
  - pendencias
aliases:
  - "Câmeras - Streaming - Pendências"
atualizado: 2026-10-07
banner: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200"
---

# Câmeras - Streaming - Pendências

Volta para [[Câmeras - Streaming]].

## Resumo

Sete itens faltam no vídeo ao vivo: o TURN para acesso fora da rede do cliente e três pontos ligados a ele, a medição de latência, a confirmação do gatilho do fallback de codec e duas medições de resiliência. Há também seis divergências entre a documentação do repositório e o código, listadas em "Divergências de documentação". A arquitetura vigente está em [[Câmeras - Streaming - Arquitetura e estratégias]].

## O que falta

| O que falta | Por que importa | Onde |
| --- | --- | --- |
| TURN para acesso fora da rede do cliente, travado atrás da autenticação do stream | sem ele, rede corporativa ou NAT restritivo não recebe a mídia UDP | `docs/specs/cross-service/CROSS-063-public-webrtc-turn.md` (`draft`) |
| O player ler servidores ICE da resposta WHEP | o TURN, quando ligado, não chega ao player sem isso | `media-connection.ts` |
| `docker/turnserver.conf` nega peers 10/8, 172.16/12 e 100.64/10 | o TURN pode não alcançar um candidato privado do MediaMTX | `docker/turnserver.conf` |
| Medição glass-to-glass e a meta de 11 células por 30 min abaixo de 1,5 s | a meta de latência não tem medição na tela | UF-040, INT-024 |
| Confirmar que a Axis devolve 4xx reconhecível quando recusa H.265 ou AV1 | é o gatilho do fallback para H.264 | INT-008, INT-027 |
| Matriz das quatro combinações (analítico ligado e desligado, uma e duas ingestões) | só uma medição está registrada | `apps/ms-cameras/docs/runbooks/stream-ingest-saturation.md`, seção 5 |
| Saber se o MediaMTX retransmite por NACK e se o Safari negocia HEVC por WHEP | decide a resiliência do WebRTC e o alcance do H.265 | sem spec |

## Problemas com muitas câmeras

Encontrados no teste de carga do VMS e nos logs do dev e de Quito. Resultado do teste em [[Streaming - VMS e banda]].

| Problema | Sintoma | Marcas e modelos | Situação |
| --- | --- | --- | --- |
| Entrada das câmeras por Tailscale com relay | entrada trava em ~87 Mbps; subnet router caiu com 50 câmeras | todas | infra: link direto |
| Servidor do mediamtx sem CPU, dividido com todos os serviços e o Kafka | fps cai, frames descartados a partir de 20 câmeras | todas | infra: nó dedicado |
| Deploy completo derruba quem está assistindo | vídeo cai no deploy | todas | infra: nó dedicado |
| MediaMTX esquece os paths ao reiniciar | `no stream is available on path` | todas | correção em revisão |
| Teto de sessões contando path e codec | erro 429 antes do limite real | todas | correção em revisão |
| Fila de escrita pequena no MediaMTX | `reader is too slow`, frames descartados | todas | correção em revisão |
| Player sem reconexão automática | operador precisa clicar em "reconectar" | todas | correção em revisão |
| Readiness do ms-cameras reprova por heap | serviço sai de rotação sob carga, sessões falham com 503 | todas | correção em revisão |
| Status perdido com Kafka fora | transições ONLINE e OFFLINE somem | todas | correção em revisão |
| Timeout do `alertStream` vale para o stream inteiro | ONLINE e OFFLINE a cada ~8 s ([[Câmeras - Saúde e monitoramento - Runbook - Hikvision sem conexão]]) | Hikvision | correção em revisão; Quito com 45000 ms |
| WebSocket de eventos sem detectar conexão morta | câmera fica ONLINE com canal morto, ou pisca | Axis | correção em revisão |
| Tertiary com parâmetros VAPIX em URL ONVIF | RTSP 400, tile nunca abre | Axis com perfil ONVIF (visto na M1135 Mk II) | correção em revisão |
| Câmera entrega H.264 quando o pedido é H.265 | bitrate maior que o esperado | AXIS M1135 Mk II (parte delas) | configuração da câmera |
| Mesmo heap no readiness | igual ao do ms-cameras | ms-selective-priority, ms-connector-virtual-loop, ms-connector-neo, ms-controllers, ms-traffic-model, ms-simulation | sem correção |
| Eventos `event-logged`, `incident-created`, `alarm-raised` perdidos com Kafka fora | eventos de câmera somem | todas | sem correção |

## Divergências de documentação

O código vence. Estes pontos da documentação do repositório discordam dele.

| Onde | O que diz | O que o código faz |
| --- | --- | --- |
| `apps/ms-cameras/docs/ENV.md`, comentário de `live-stream-path.config.ts`, INT-027 | o player espera 10 s pelo WHEP | espera 15 s |
| `apps/ms-cameras/docs/runbooks/stream-ingest-saturation.md`, seção 6 | ler `localhost:9998/metrics` | o MediaMTX está com `metrics: no` |
| comentário do serviço `mediamtx` no `docker-compose.yml` | depurar com `docker compose exec mediamtx wget ...` | a imagem não tem shell nem `wget`, e o comando falha |
| [[Câmeras - Streaming - Diagrama - Pipeline HLS.excalidraw]], [[Câmeras - Streaming - Diagrama - Estratégia de codec.excalidraw]] | relay `ffmpeg`; o de codec sem AV1 | MediaMTX sob demanda, com AV1 |
| métrica `ms_cameras_stream_relays_active` | nome do modelo com relay | mede paths disponíveis |
| `TelemetryPathRegistry` | registro de paths de telemetria | segue no código, sempre vazio e inerte |
