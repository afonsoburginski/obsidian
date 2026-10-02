---
tags:
  - doc
  - ms-cameras
  - cameras
  - streaming
aliases:
  - "Streaming"
  - "00 - Streaming"
atualizado: 2026-10-01
---

# Streaming

Vídeo ao vivo das câmeras no Attlas, submódulo do [[ms-cameras]] (MOD-004 e INT-027). O MediaMTX puxa
cada câmera sob demanda, uma conexão RTSP por path (câmera, tier e codec), abre com o primeiro espectador,
fecha 30 s depois do último e serve o mesmo vídeo, sem transcodificar, a N operadores por WebRTC
(primário) ou LL-HLS (reserva). O `ms-cameras` só garante a config do path e devolve onde tocar; o player do
`web-attlas` cuida da recuperação, da reserva e da volta ao WebRTC. Banda e bitrate de câmera também moram
aqui.

## Notas deste domínio

- [[Streaming - Arquitetura e estratégias]] - pipeline, portas, MediaMTX, config do path, teto, codecs e fallbacks, player WHEP e LL-HLS, por que assim, armadilhas e pendências.
- [[Streaming - Fluxos e SLA]] - `GET /hls` passo a passo, fluxo do player, WebSocket, latência, TTFF, métricas, diagnóstico e envs.
- [[Streaming - Banda e bitrate]] - banda provisionada e bitrate medido, o snapshot de banda do VMS e o consumo do dashboard.
- [[Streaming - Realce de imagem no cliente]] - regra de realce só na estação e o desenho que vive na PR em draft.
- [[Runbook - Streaming]] - comandos de diagnóstico no host e no navegador.

Documento executivo para gestão e time: [[Streaming - Vídeo ao vivo, WebRTC, SFU, TURN e codecs.pdf]].
