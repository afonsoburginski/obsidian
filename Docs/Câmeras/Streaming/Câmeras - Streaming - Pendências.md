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
banner: "video streaming network"
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
