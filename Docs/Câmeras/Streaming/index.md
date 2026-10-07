---
tags:
  - doc
  - cameras
  - streaming
  - ms-cameras
aliases:
  - "Câmeras - Streaming"
  - "Streaming"
  - "00 - Streaming"
atualizado: 2026-10-07
---

# Câmeras - Streaming

## Resumo

Vídeo ao vivo das câmeras no Attlas, subdomínio de [[Câmeras]]. O MediaMTX puxa cada câmera sob demanda, uma
conexão RTSP por path (câmera, tier e codec), e entrega o mesmo vídeo, sem transcodificar, a quantos operadores
houver, por WebRTC (primário) ou LL-HLS (reserva). O `ms-cameras` só garante a config do path e devolve onde tocar;
o player do `web-attlas` cuida da recuperação, da reserva e da volta ao WebRTC. Banda, bitrate, codecs e qualidade
de imagem das câmeras também moram aqui.

## Notas

| Nota | Abra quando |
| --- | --- |
| [[Câmeras - Streaming - Arquitetura e estratégias]] | precisa saber onde mora cada peça (MediaMTX, `ms-cameras`, player), as portas, as rotas de vídeo, por que é assim e as armadilhas |
| [[Câmeras - Streaming - Fluxos]] | precisa do passo a passo do `GET /hls`, do player, do fallback de codec, da remoção de paths ou do diagnóstico |
| [[Câmeras - Streaming - Requisitos e SLA]] | precisa de meta de latência, tempo limite, teto, métrica ou variável de ambiente |
| [[Câmeras - Streaming - Runbook]] | vai diagnosticar vídeo ao vivo no host ou no navegador |
| [[Câmeras - Streaming - Banda e bitrate]] | precisa saber de onde vem cada número de banda, provisionada ou medida, e quem o consome |
| [[Câmeras - Streaming - Codecs]] | precisa comparar H.264, H.265, AV1, VP9 e MJPEG: banda, bits por pixel, suporte por câmera, navegador e GPU, e as decisões |
| [[Câmeras - Streaming - Qualidade de imagem na câmera]] | quer melhorar a imagem na origem, com os ajustes nativos das câmeras Axis e Hikvision |
| [[Câmeras - Streaming - Realce de imagem no cliente]] | quer entender o realce de imagem feito na estação do operador |
| [[Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas]] | procura uma tecnologia de fabricante ou técnica de imagem específica do realce |
| [[Câmeras - Streaming - Vídeo ao vivo, WebRTC, SFU, TURN e codecs.pdf]] | precisa de um documento para gestão ou time, sem detalhe de código |

## Explicações para usuário

| Explicação | Abra quando |
| --- | --- |
| [[Câmeras - Streaming - Explicação - Como liberar o WebRTC num servidor novo]] | vai preparar um servidor novo para o vídeo ao vivo: firewall, MediaMTX, nginx e `ms-cameras` |

## Diagramas

Desenhos de apoio visual. Quando discordam do código ou das notas, vale o código, depois a nota.

| Diagrama | O que desenha |
| --- | --- |
| [[Câmeras - Streaming - Diagrama - Pipeline HLS.excalidraw]] | o caminho do vídeo da câmera ao navegador |
| [[Câmeras - Streaming - Diagrama - Estratégia de codec.excalidraw]] | a escolha de codec |
| [[Câmeras - Streaming - Diagrama - Banda e bitrate.excalidraw]] | banda provisionada e bitrate medido |

> [!warning] Os diagramas de pipeline e de codec estão defasados
> Os dois ainda desenham um relay `ffmpeg` que o código não tem, e o de codec não tem AV1. O caminho do vídeo está
> em [[Câmeras - Streaming - Arquitetura e estratégias]].
