---
tags:
  - doc
  - streaming
  - cameras
  - hls
---

# 02 - HLS (LL-HLS)

Volta para [[00 - Streaming]].

HLS é o caminho de **fallback**. O player só cai nele quando o WebRTC não conecta. É mais
lento (2 a 6s de latência) mas muito mais robusto, e é por isso que ele quase nunca trava.

## Como funciona

O mediamtx pega o vídeo que o ffmpeg publicou e o quebra em segmentos curtos servidos por
HTTP, mais uma playlist (`.m3u8`) que lista os segmentos. O player baixa a playlist, baixa os
segmentos em ordem e os toca. Como é HTTP comum, passa por proxy (Kong, nginx) e CDN sem
nenhuma mágica.

Configuração no `docker/mediamtx.yml`:

- `hlsVariant: lowLatency` (LL-HLS), `hlsSegmentDuration: 2s`, `hlsPartDuration: 100ms`,
  `hlsSegmentCount: 3`.

URL de fallback montada pelo backend:

```
http://<mediamtx-hls>/<cameraId>-<quality>/index.m3u8
```

## Player (hls.js)

`camera-stream-player.component.ts`, método `initHls`. Usa `hls.js` quando o navegador suporta
MSE, ou o HLS nativo do Safari como alternativa.

Configuração relevante:

```ts
new Hls({
  lowLatencyMode: true,
  maxBufferLength: 60,            // até 60s de buffer
  liveSyncDurationCount: 3,       // mira 3 segmentos atrás da borda ao vivo
  liveMaxLatencyDurationCount: 6,
});
```

Esse buffer é o detalhe que importa. O player segura vários segundos de vídeo adiantado.

## Por que o HLS quase nunca trava

Duas razões, ambas ausentes no WebRTC:

1. **Roda sobre TCP.** Se um pedaço de um segmento se perde na rede, o TCP retransmite
   automaticamente. O player nunca vê a perda.
2. **Tem buffer.** Mesmo que um segmento atrase, há vários segundos já bufferizados para tocar
   enquanto o próximo chega. A variação de chegada é absorvida.

O custo disso é latência: o buffer e a segmentação adicionam alguns segundos. Para vídeo ao
vivo de operação, esse atraso é grande, e por isso o WebRTC é o primário. Mas para entender o
travamento, o ponto é: a mesma perda de rede que congela o WebRTC é invisível no HLS.

Ver [[04-Diagnostico-travamento-WebRTC]] para o outro lado da moeda.

## Recursos do player no modo HLS

No HLS o player ainda expõe scrubber (barra de progresso) e botão "ir para o ao vivo",
porque há buffer com janela navegável (`seekable`). No WebRTC isso não existe, é sempre
borda ao vivo.

## Estratégias de entrega

`strategies/`. O backend escolhe os headers HTTP dos segmentos conforme o ambiente:

- `direct-hls-delivery.strategy.ts`: sem CDN, default local.
- `cloudflare-hls-delivery.strategy.ts`: headers `CDN-Cache-Control` para produção com
  Cloudflare na frente.
