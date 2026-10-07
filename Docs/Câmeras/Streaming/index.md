---
tags:
  - doc
  - ms-cameras
  - cameras
  - streaming
aliases:
  - "Câmeras - Streaming"
  - "Streaming"
  - "00 - Streaming"
atualizado: 2026-10-05
---

# Câmeras - Streaming

Vídeo ao vivo das câmeras no Attlas, submódulo do [[Câmeras]] (MOD-004 e INT-027). O MediaMTX puxa
cada câmera sob demanda, uma conexão RTSP por path (câmera, tier e codec), abre com o primeiro espectador,
fecha 30 s depois do último e serve o mesmo vídeo, sem transcodificar, a N operadores por WebRTC
(primário) ou LL-HLS (reserva). O `ms-cameras` só garante a config do path e devolve onde tocar; o player do
`web-attlas` cuida da recuperação, da reserva e da volta ao WebRTC. Banda e bitrate de câmera também moram
aqui.

## Notas deste domínio

- [[Câmeras - Streaming - Arquitetura e estratégias]] - pipeline, portas, MediaMTX, config do path, teto, codecs e fallbacks, player WHEP e LL-HLS, por que assim, armadilhas e pendências.
- [[Câmeras - Streaming - Fluxos]] - `GET /hls` passo a passo, fluxo do player, WebSocket e diagnóstico.
- [[Câmeras - Streaming - Requisitos e SLA]] - latência, TTFF, métricas e variáveis de ambiente.
- [[Câmeras - Streaming - Banda e bitrate]] - banda provisionada e bitrate medido, o snapshot de banda do VMS e o consumo do dashboard.
- [[Câmeras - Streaming - Codecs]] - H.264, H.265, AV1, VP9 e MJPEG no mesmo modelo: banda, bits por pixel, suporte por
  câmera, navegador e GPU, parâmetros VAPIX e ISAPI, e as decisões com o mapeamento para as specs.
- [[Câmeras - Streaming - Qualidade de imagem na câmera]] - ajustes nativos Axis e Hikvision que melhoram a imagem
  na origem: o que a P1475-LE suporta, o que o Attlas aplica sozinho por URL, stream profile e ONVIF, reflexo e
  brilho medidos, os riscos para o analítico e a recomendação priorizada.
- [[Câmeras - Streaming - Realce de imagem no cliente]] - realce só na estação: como a estação é classificada, as
  tecnologias de cada tipo de hardware, as técnicas de imagem, o desenho decidido, o desempenho, como ligar a
  aceleração por hardware no Linux, a recomendação priorizada e a documentação oficial. O código vive só na PR em draft.
- [[Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas]] - cada tecnologia de fabricante e
  cada técnica de imagem e de quadros, no mesmo modelo, com a situação de cada uma.
- [[Câmeras - Streaming - Runbook]] - comandos de diagnóstico no host e no navegador.
- [[Câmeras - Streaming - Diagrama - Pipeline HLS.excalidraw]] - desenho, apoio visual; vale o código, depois a nota.
- [[Câmeras - Streaming - Diagrama - Estratégia de codec.excalidraw]] - desenho, apoio visual; vale o código, depois a nota.
- [[Câmeras - Streaming - Diagrama - Banda e bitrate.excalidraw]] - desenho, apoio visual; vale o código, depois a nota.

Documento executivo para gestão e time: [[Câmeras - Streaming - Vídeo ao vivo, WebRTC, SFU, TURN e codecs.pdf]].
