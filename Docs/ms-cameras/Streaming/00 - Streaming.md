---
tags:
  - doc
  - streaming
  - cameras
---

# Streaming de câmeras (ms-cameras)

> Submódulo do [[ms-cameras - visão geral]] (MOD-004 hls-streaming-pipeline).

Documentação do pipeline de vídeo ao vivo do Attlas, puxada do código do `ms-cameras`.
Cobre como o vídeo sai da câmera e chega no navegador por dois caminhos (HLS e WebRTC),
e o diagnóstico do travamento que só acontece no WebRTC.

## Notas

- [[01-Arquitetura-streaming|01 - Arquitetura do streaming]] - visão geral do pipeline RTSP, ffmpeg, mediamtx e os dois caminhos de saída.
- [[02-HLS|02 - HLS (LL-HLS)]] - caminho de fallback, sobre HTTP/TCP com buffer.
- [[03-WebRTC-WHEP|03 - WebRTC (WHEP)]] - caminho primário, baixa latência sobre UDP.
- [[04-Diagnostico-travamento-WebRTC|04 - Diagnóstico do travamento no WebRTC]] - causa raiz e como medir (PR 566).
- [[04 - MOD-004 hls-streaming-pipeline.excalidraw|Diagrama (Excalidraw)]] - o pipeline e o diagnóstico do travamento em um quadro editável.

## Resumo de uma linha

Uma única conexão RTSP por câmera entra no mediamtx via ffmpeg em modo copy, e o mediamtx
serve o mesmo vídeo para N operadores por WebRTC (primário, baixa latência) ou HLS (fallback).

## Mapa de portas

| Porta | Protocolo | Para que serve |
| --- | --- | --- |
| 8554 | RTSP/TCP | ffmpeg publica o vídeo da câmera no mediamtx |
| 8889 | HTTP | WebRTC WHEP (negociação SDP) |
| 8189 | UDP | WebRTC, mídia ICE (o vídeo de fato trafega aqui) |
| 8888 | HTTP | HLS (LL-HLS, segmentos e playlist) |
| 9997 | HTTP | API REST do mediamtx (readiness e diagnóstico) |
| 9998 | HTTP | Métricas Prometheus do mediamtx (PR 566) |

## Fontes no repo

- `apps/ms-cameras/src/streaming/` - controllers, gateway, services e estratégias.
- `apps/ms-cameras/docs/modules/MOD-004-hls-streaming-pipeline.md` - spec do pipeline HLS.
- `docker/mediamtx.yml` - configuração do servidor de mídia.
- `apps/web-attlas/src/app/core/shared/components/camera-stream-player/` - player no frontend.
