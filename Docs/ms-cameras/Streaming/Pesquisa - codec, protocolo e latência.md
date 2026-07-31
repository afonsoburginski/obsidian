---
tags:
  - doc
  - ms-cameras
  - cameras
  - pesquisa
  - streaming
aliases:
  - "camera-streaming-latency-codec"
  - "codec-protocol-adaptive-strategy-research"
atualizado: 2026-07-31
---

# Pesquisa - codec, protocolo e latência

> Registro das duas investigações de julho/2026 que definiram a estratégia de codec e a latência do
> player: o **diagnóstico do delay** na câmera PTZ (06/07) e a **pesquisa de estratégia adaptativa** de
> codec/protocolo/qualidade (07/07). O comportamento em produção hoje está em
> [[Streaming - Codecs e fallbacks]]; esta nota é o porquê, com o que foi medido e o que foi refutado.

## Veredito consolidado

**WebRTC/WHEP primeiro, H.264 como base universal de passthrough, H.265/HEVC oportunístico por
cliente.** H.265 e AV1 não substituem o H.264 no player: complementam onde o cliente decoda por
hardware. Regra de ouro: **detectar, nunca assumir, sempre com fallback H.264**.

A peça que faltava (negociação automática em runtime) foi implementada em **07/07 como INT-008**
(PR #656). As 3 tiers vêm de **substreams nativos da câmera**, não de transcode no servidor.

## Parte 1 - diagnóstico de latência (06/07)

Investigação do delay no player da PTZ AXIS Q6135-LE (10.1.1.79), em produção (`dev.v2`) e no dev
local. Meta: imagem fluida, latência mínima.

### Pipeline

Câmera RTSP (H264) → `ms-cameras` roda **ffmpeg `-c copy`** (sem transcode) → publica no **mediamtx** →
browser toca via **WHEP (WebRTC, sub-segundo)**; **HLS (LL-HLS 1 a 3s) é só fallback**.

### O que estava rodando (processo real no EC2)

- `ffmpeg -c copy` H264, sem re-encode, correto.
- Reader ativo no mediamtx era **`webRTCSession`**: o WebRTC estava funcionando, não era fallback para HLS. Logo, o delay **não era transporte**.
- Stream consumido (path `...-secondary`): **H264 profile High, 1920x1080**.
- A URL já tinha `videokeyframeinterval=15` + `videozgopmode=fixed`, então o problema clássico de GOP longo do Zipstream da Axis (`ZMaxGopLength=300`) **já estava mitigado**.

### Causas reais do delay

1. **H264 High profile** usa B-frames, que exigem reordenação no decode e custam latência. A PRIMARY forçava `h264profile=baseline`; a SECONDARY não.
2. **1080p em vez de 720p** no tier SECONDARY: o resolver serve a resolução declarada no profile quando ela existe, e o SECONDARY estava semeado como 1920x1080, servindo ~4 Mbps em vez do 720p do tier. Mais dados, mais buffer, mais latência.
3. Menor: `ffmpeg -max_delay 500ms` + `-reorder_queue_size 64` (jitter buffer anti-stutter) somavam até ~500ms, trade-off proposital contra travadas.

### Ajustes feitos (PR `cameras/feat/SOFTWARE-2023-F3`)

- `camera-stream-source.resolver.ts`: força `h264profile=baseline` para todo stream H264 Axis (em `appendAxisVapixCodecParams` e no fallback H265 para H264). Vale para todas as câmeras.
- `seed.ts`: SECONDARY da PTZ de 1920x1080 para **1280x720**.
- `ffmpeg-session.service.ts`: jitter buffer de entrada reduzido, `-max_delay` de 500ms para **200ms** e `-reorder_queue_size` de 64 para **16**, ambos env-tunáveis (`FFMPEG_MAX_DELAY_US`, `FFMPEG_REORDER_QUEUE_SIZE`). Sobre TCP os pacotes já chegam em ordem e o baseline não tem B-frames para reordenar, então o buffer grande só somava latência. Corta ~300ms.
- `ffmpeg-session.service.ts`: transporte RTSP de ingest env-tunável (`RTSP_TRANSPORT`, default `tcp`).
- `media-connection.ts` (frontend): minimiza o playout buffer do WebRTC no browser (`receiver.playoutDelayHint = 0`) ao chegar a track. É o **maior lever client-side** de latência; o browser ainda adapta para cima se fosse travar.
- Specs atualizadas, incluindo a correção do TERTIARY de 640x360 para 720x480, que estava defasado do código.
- Em produção: os 6 profiles SECONDARY da PTZ (um por sistema-tenant) para `1280x720` + `h264profile=baseline` na `streamUrl`. Efeito imediato e reversível; a sessão só troca ao reabrir o stream.

### Melhor codec para o player de baixa latência

- **H264 é a escolha certa**: decode universal em Chrome/Firefox/Edge e sem reordenação quando baseline.
- **H265/HEVC**: a câmera entrega (confirmado, `hevc Main`, 720p ~200 kb/s, bem mais eficiente), mas o caminho WebRTC exige decode por hardware; usar H265 como padrão quebraria o player fluido.
- **MJPEG**: não usamos, todas as câmeras são H264. O transcode MJPEG para H264 no `ffmpeg-session.service` é rede de segurança defensiva.
- Dentro do H264, **baseline** (sem B-frames, sem CABAC) tem a menor latência, custando algum bitrate a mais para a mesma qualidade. Troca aceitável num mosaico ao vivo.

### UDP x TCP no ingest RTSP

Só importa na perna câmera para ffmpeg. UDP corta latência numa LAN limpa (sem retransmissão nem
head-of-line blocking), mas perda de pacote vira artefato até o próximo keyframe. As câmeras aqui vivem
na **tailnet** (overlay WireGuard, ~146ms RTT), então TCP é o default robusto. Em câmera de LAN limpa
vale testar `RTSP_TRANSPORT=udp`, subindo `FFMPEG_REORDER_QUEUE_SIZE` se aparecer reordenação. A perna
RTSP é de dezenas de ms, não é o gargalo principal.

### SFU e TURN

- **SFU**: não temos e não precisamos. O **mediamtx** já faz o fan-out 1 para N: um `ffmpeg` publica e cada viewer WHEP recebe a track daquele publish único. Para broadcast de câmera é exatamente o papel do SFU; um SFU de conferência (Janus, mediasoup, LiveKit) seria overkill e somaria latência.
- **TURN**: existe a fundação (coturn no docker-compose, CROSS-032), mas **não está deployado nem ativo** no EC2, e o mediamtx está sem `webrtcICEServers2`/`webrtcAdditionalHosts`.
- **Como funciona hoje**: na tailnet o browser alcança o mediamtx em UDP 8189 direto, então WebRTC ao vivo com baixa latência; fora da tailnet a UDP 8189 está bloqueada no SG, não há candidato alcançável e cai para HLS.
- Baixa latência no acesso público exige ativar o TURN (deploy do coturn, 3478/5349 no SG, `webrtcICEServers2` no mediamtx, iceServers no front). É o CROSS-032 e está travado atrás da **auth do stream**: streaming público só para usuário logado, e não se abre o SG antes da auth. Decisão de segurança, não tweak de performance.
- Opção de baixo risco na tailnet: `webrtcAdditionalHosts` com o IP tailnet do servidor, para o mediamtx anunciar candidato alcançável de forma determinística em vez de depender de auto-detecção.

### Como reproduzir no dev local

O dev local já tem a PTZ no seed e alcança 10.1.1.79 pela tailnet: re-seed
(`npx nx run ms-cameras:prisma:seed`), reiniciar o `ms-cameras` para carregar o resolver novo, abrir a
câmera. A badge deve mostrar **720p** e a imagem vir fluida por WebRTC.

### Alavancas de latência restantes

Se um link com jitter começar a travar depois do buffer menor, subir `FFMPEG_MAX_DELAY_US` e
`FFMPEG_REORDER_QUEUE_SIZE` no `.env` do serviço, sem redeploy. Garantir que o cliente use WebRTC e não
caia para HLS (público exige UDP 8189 aberta ou TURN). O que sobra é encode na câmera mais playout
buffer do browser, fora do nosso controle direto.

## Parte 2 - estratégia adaptativa (07/07)

Pesquisa com verificação adversarial (22 fontes, 25 afirmações checadas: 20 confirmadas, 5 refutadas)
sobre servir o melhor codec/protocolo/qualidade automaticamente num player web de mosaico ao vivo,
estilo YouTube, para o stack Attlas (mediamtx + relay ffmpeg + player Angular).

### Matriz de decode nos browsers (verificado)

- **H.264**: único universal (~99,9%), obrigatório em WebRTC pela RFC 7742. É a base, sempre.
- **H.265/HEVC**: **hardware-gated em todo lugar, sem fallback de software.** Novidade que refuta o senso comum: HEVC **negocia em WebRTC** desde o Chrome 136 (2025) em desktop/Android/WebView, mas só com decode por hardware. Em HLS/fMP4: Safari nativo, Chrome/Edge com hardware (Edge e Firefox no Windows exigem a extensão HEVC da Microsoft).
- **AV1**: decode quase universal em desktop Chrome/Edge/Firefox (software dav1d, ~91% das sessões), Safari só com hardware (M3+, iPhone 15 Pro+). **AV1 não existe em WebRTC** (WHIP/WHEP do Cloudflare fala VP9/VP8/H264), então é caminho de VOD/HLS, não de ao vivo.

### Detecção automática

- **`MediaCapabilities.decodingInfo({ type })`** com `type` igual a `'webrtc'`, `'media-source'` ou `'file'`, sondando o caminho WebRTC **separadamente** do HLS/MSE, que é exatamente onde está a divergência crítica. Retorna `{ supported, smooth, powerEfficient }`, o que permite rejeitar config que dropa frame ou drena bateria.
- **`RTCRtpReceiver.getCapabilities('video')`** para saber os codecs recebíveis antes da negociação SDP.
- Padrão: iterar do mais preferido ao menos preferido (H265 1080p até H264), parando no primeiro `smooth && powerEfficient`. As duas APIs reportam suporte **provável**, não garantia, então o fallback H.264 é obrigatório. Para o caminho HLS, `hls.js` é MSE, então `'media-source'` é o proxy correto.

### Restrição dura: o mediamtx não transcoda

O mediamtx é proxy e conversor de protocolo, não transcoder (passthrough `-c copy`). Ele não gera as 3
renditions nem converte H265 para H264. As opções são **ffmpeg/GStreamer por stream** (custo de CPU que
briga com a escala de muitas tiles) ou **substreams nativos da câmera** (Axis VAPIX `resolution=`,
canais 101/102 da Hikvision), que é o ABR mais barato e o que o resolver do Attlas **já faz**.

### O que foi descartado

- **HEVC em WASM**: não sustenta tempo real num mosaico multi-tile (um stream 1080p roda ~2,5x realtime no Apple Silicon e congela em CPU fraca). Hardware ou H.264, nunca WASM.
- **AV1 no caminho ao vivo**: não existe em WebRTC e não traz ganho de latência.
- **Transcode no servidor para ABR**: mata a escala.

### Protocolo: WebRTC x LL-HLS

WebRTC/WHEP ganha para sub-segundo (~500ms medidos num estudo de 2026 sobre exatamente o stack RTSP →
mediamtx → WHEP; HLS puro 6 a 18s, LL-HLS 2 a 5s). WebRTC primário e **LL-HLS como fallback**, já
implementado. Seleção por cliente: WebRTC se conecta e decoda, senão LL-HLS.

### Calibragem: o que YouTube e Twitch fazem

Não usam H265 na entrega web (royalties e suporte). Twitch Enhanced Broadcasting é H.264 + HEVC no
ingest, **não AV1**, por consciência de compatibilidade de device. YouTube usa VP9/AV1 no VOD. Ou seja:
**H.265 é ganho de eficiência oportunístico, não o codec único do player.**

### O que foi implementado como INT-008 (07/07, PR #656)

- **Cliente** (`StreamCodecService`, web-attlas): sonda `MediaCapabilities.decodingInfo` (webrtc e media-source) mais `RTCRtpReceiver.getCapabilities`, e só pede H265 quando `supported && smooth && powerEfficient`. Cache por carga. Os 3 hosts (mosaico, detalhe da câmera, side detail) abrem a sessão com o codec negociado.
- **Backend** (`ms-cameras`): sessão e relay chaveados por `(cameraId, quality, codec)`, então H264 e H265 coexistem; path mediamtx `<cameraId>-<quality>[-h265]`; o resolver injeta `videocodec` por request com fallback H264 no mesmo path.
- Specs: `apps/ms-cameras/docs/atomic/INT-008-codec-negotiation.md` e `MOD-004`, seção 13.
- As 3 tiers por substream nativo já existiam desde a fase F3.

### Perguntas em aberto

1. O Safari negocia e decoda HEVC **em WebRTC**, não só em HLS? Confirmado no Chrome 136+; Safari com WHEP segue em aberto.
2. Custo real de CPU de um transcode H265 para H264 por stream no host do `ms-cameras`, se algum dia for necessário: é o número que dimensiona quantas tiles um nó aguenta.
3. Axis e Hikvision emitem múltiplos substreams nativos para as 3 tiers em todos os modelos do parque?
4. O mediamtx suporta simulcast/SVC numa sessão WHEP, ou a troca de rendition é sempre client-driven entre paths?

### Refutado (não confiar)

"AV1 mais HEVC cobre 99,73%", "HEVC só no Safari", "HEVC incompatível com WebRTC", "AV1 com encode
inviável, 30min para 2s", "HEVC em WASM a 60fps em tempo real". A landscape muda rápido: revalidar a
matriz a cada implementação.

### Fontes principais

MDN (Video_codecs, `decodingInfo`, `getCapabilities`), chromestatus 5153479456456704 (HEVC em WebRTC no
Chrome 136), W3C Media Capabilities, README do mediamtx, MDPI Computers 15(1):62 (2026, stack RTSP →
mediamtx → WHEP com ~500ms), blog do Cloudflare Stream sobre AV1, privaloops/hevc.js, RFC 7742.

## Relacionados

[[Streaming]] · [[Streaming - Codecs e fallbacks]] · [[Streaming - WebRTC e WHEP]] · [[Streaming - HLS]] · [[SOFTWARE-2023-F3 - Streaming adaptativo (resolucao_codec) e correcoes F1-F4]] · [[VMS]]
