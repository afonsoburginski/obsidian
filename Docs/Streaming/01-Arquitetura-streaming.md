---
tags:
  - doc
  - streaming
  - cameras
---

# 01 - Arquitetura do streaming

Volta para [[00 - Indice]].

## O problema que o pipeline resolve

Câmeras IP falam RTSP, e RTSP não toca direto no navegador. Além disso, abrir uma conexão
RTSP por operador estouraria a câmera. O Attlas resolve as duas coisas com um único ponto
intermediário: o **mediamtx**. O `ms-cameras` abre **uma** conexão RTSP por câmera (via
ffmpeg), empurra esse vídeo para o mediamtx, e o mediamtx redistribui para quantos
operadores quiserem assistir, em formatos que o navegador entende.

## Fluxo ponta a ponta

```
Câmera IP (RTSP)
   |
   |  ffmpeg (modo copy, sem transcodificar)
   v
mediamtx  (uma cópia do vídeo, em memória)
   |
   +--> WebRTC / WHEP   (primário, baixa latência, UDP)   --> navegador
   |
   +--> HLS / LL-HLS    (fallback, HTTP sobre TCP)         --> navegador
```

Ponto-chave para o resto da doc: **os dois caminhos de saída partem da mesma origem.**
Se o vídeo trava em um caminho mas não no outro, o problema está no caminho que trava, e
não na câmera nem no ffmpeg, que são comuns aos dois.

## As peças

### 1. ffmpeg (ingest RTSP)

`ffmpeg-session.service.ts`. Faz o spawn de um processo ffmpeg por sessão de câmera. Roda em
**modo copy** (`-c copy`) para H.264 e H.265, ou seja, não decodifica nem recodifica o vídeo,
só reembrulha os pacotes para publicar via RTSP no mediamtx. Isso deixa o uso de CPU perto de
zero. MJPEG é a exceção: como não dá para multiplexar em RTSP do mesmo jeito, é transcodificado
para H.264 ultrafast.

Detalhes que importam:

- Flags de baixa latência na entrada: `-fflags +nobuffer+flush_packets`, `-flags low_delay`,
  `-max_delay 500000`, `-reorder_queue_size 64`. Toleram a variação normal de chegada (jitter)
  do RTSP sem travar a cada pacote reordenado.
- **Não usa `-discardcorrupt`**, de propósito: descartar pacote corrompido quebra o bitstream
  H.264 e congela o decoder até o próximo keyframe. Deixar o decoder esconder o erro recupera
  mais suave.
- Reconexão com backoff exponencial (até 10 tentativas) se o ffmpeg cair e ainda houver
  espectadores. Se o codec primário (ex. H.265) falhar ao subir, troca para H.264 de fallback.
- Como roda em modo copy, o GOP (intervalo entre keyframes) é o que a câmera mandar. Para
  câmeras Axis o resolver força `videokeyframeinterval=15` via VAPIX, mas câmeras genéricas
  podem ter GOP de vários segundos. Isso é central no [[04-Diagnostico-travamento-WebRTC|diagnóstico do travamento]].

### 2. mediamtx (servidor de mídia)

`docker/mediamtx.yml`. Recebe o RTSP do ffmpeg numa "path" por câmera e qualidade
(ex. `cam123-primary`), e expõe a mesma origem em WebRTC e HLS ao mesmo tempo. Uma origem,
muitos espectadores.

- Versão LL-HLS habilitada, segmentos de 2s, partes de 100ms.
- WebRTC na porta HTTP 8889 (negociação) e UDP 8189 (mídia).
- API REST na 9997 (o `ms-cameras` consulta para saber quando a path ficou pronta).
- Métricas Prometheus na 9998 (adicionadas no PR 566 para o diagnóstico).
- Acesso interno sem autenticação. A autenticação real é no Kong com JWT, na borda.

### 3. ms-cameras (orquestração)

`src/streaming/`. Não toca no vídeo, só gerencia o ciclo de vida das sessões:

- `streaming.controller.ts`: `GET /api/cameras/:id/hls` sobe (ou reaproveita) a sessão e
  devolve `{ url, hlsUrl, status, quality }`. `url` é o WebRTC WHEP, `hlsUrl` é o fallback HLS.
  Há trava de concorrência para não subir dois ffmpeg na mesma path (dois publishers se
  expulsam em loop).
- `stream-session-registry.service.ts`: registro em memória de `cameraId:quality -> estado`,
  com contagem de espectadores e período de graça antes de derrubar a sessão ociosa.
- `streaming.gateway.ts`: WebSocket Socket.IO que avisa o frontend em tempo real
  (`stream.started`, `stream.reconnecting`, `stream.error`, `stream.stopped`).

### 4. Player no frontend

`camera-stream-player.component.ts`. Recebe a `url` (WHEP) e a `hlsUrl` (fallback) e decide:

- Se a URL termina em `/whep`, abre WebRTC. Se a negociação ICE falhar ou cair, **degrada
  uma vez para o HLS** e só então mostra erro.
- Caso contrário, toca HLS direto com `hls.js`.

O player usa só STUN público do Google para o WebRTC, **sem TURN**. Guarda contra
ping-pong: depois de cair para o HLS, uma nova falha é terminal.

## Por que dois caminhos

| | WebRTC (primário) | HLS (fallback) |
| --- | --- | --- |
| Latência | sub-segundo | 2 a 6 segundos |
| Transporte | UDP | HTTP sobre TCP |
| Buffer no player | mínimo | alguns segundos |
| Recuperação de perda | nenhuma (sem retransmissão) | TCP retransmite |
| Quando é usado | sempre que conecta | quando o WebRTC falha |

O WebRTC ganha em latência, que é o que importa para operação ao vivo e PTZ. O HLS é a rede
de segurança quando o WebRTC não consegue conectar. Essa mesma tabela explica o travamento:
ver [[04-Diagnostico-travamento-WebRTC]].
