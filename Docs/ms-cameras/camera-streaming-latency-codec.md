# Latência e codec do stream ao vivo — diagnóstico e ajustes

Investigação do delay no player da câmera PTZ (AXIS Q6135-LE, 10.1.1.79), tanto em
produção (dev.v2) quanto no dev local. Meta: **altíssima performance / imagem fluida**.

## Pipeline

Câmera RTSP (H264) → `ms-cameras` roda **ffmpeg `-c copy`** (sem transcode) → publica no
**mediamtx** → browser toca via **WHEP (WebRTC, sub-segundo)**; **HLS (LL-HLS ~1-3s) é só fallback**.

## O que estava rodando (visto no processo real, EC2)

- `ffmpeg -c copy` H264 (sem re-encode - correto, latência mínima).
- Reader ativo no mediamtx = **`webRTCSession`** → o WebRTC estava funcionando, **não** era
  fallback pra HLS. Ou seja, o delay **não era transporte**.
- Stream consumido (path `...-secondary`): **H264 profile "High", 1920×1080**.
- URL consumida já tinha `videokeyframeinterval=15` + `videozgopmode=fixed` → o problema
  clássico de GOP longo/Zipstream da Axis (`ZMaxGopLength=300`) **já estava mitigado**.

## Causas reais do delay

1. **H264 High profile** → usa B-frames, que exigem reordenação no decode = latência. A
   PRIMARY forçava `h264profile=baseline` (sem B-frames), mas a SECONDARY não.
2. **1080p em vez de 720p** no tier SECONDARY: o resolver serve a resolução declarada no
   profile quando ela existe; como o SECONDARY estava semeado como 1920×1080, servia 1080p
   (~4 Mbps) em vez de descer pro 720p do tier. Mais dados = mais buffer = mais latência.
3. Menor: `ffmpeg -max_delay 500ms` + `-reorder_queue_size 64` (jitter buffer anti-stutter)
   somam até ~500ms. Trade-off proposital contra travadas.

## Melhor codec possível

- **H264 é a escolha certa** para o player de baixa latência (WebRTC/WHEP): decode universal
  em Chrome/Firefox/Edge, sem reordenação se for baseline.
- **H265/HEVC**: a câmera **entrega** (confirmado: `hevc Main`, 720p ~200 kb/s - bem mais
  eficiente que H264). **MAS não serve** aqui: WebRTC **não suporta HEVC no Chrome/Firefox**;
  só Safari, e via HLS (mais latência). Usar H265 quebraria o player fluido. Veredito: **ficar
  em H264 baseline**. (H265 só valeria se o objetivo fosse economizar banda via HLS no Safari.)
- **MJPEG**: não usamos (todas as câmeras são H264). O caminho de transcode MJPEG→H264 no
  `ffmpeg-session.service` é só uma rede de segurança defensiva.
- Dentro do H264: **baseline** (sem B-frames, sem CABAC) = menor latência. Custa um pouco mais
  de bitrate pra mesma qualidade - troca aceitável pra um videowall ao vivo.

## Ajustes feitos

**No código (PR `cameras/feat/SOFTWARE-2023-F3`):**
- `camera-stream-source.resolver.ts`: força `h264profile=baseline` para todo stream H264 Axis
  (em `appendAxisVapixCodecParams` e no fallback H265→H264). Vale pra todas as câmeras.
- `seed.ts`: SECONDARY da PTZ passou de 1920×1080 → **1280×720** (o dev local nasce em 720p).
- `ffmpeg-session.service.ts`: **jitter buffer de entrada reduzido** — `-max_delay` 500ms→**200ms**
  e `-reorder_queue_size` 64→**16** (env-tunável: `FFMPEG_MAX_DELAY_US` / `FFMPEG_REORDER_QUEUE_SIZE`).
  Sobre TCP os pacotes já chegam em ordem e o baseline não tem B-frames pra reordenar, então
  o buffer grande só somava latência. Corta ~300ms.
- `ffmpeg-session.service.ts`: transporte RTSP de ingest **env-tunável** (`RTSP_TRANSPORT`,
  default `tcp`). Permite testar `udp` por câmera/deployment (a perna ffmpeg→mediamtx é
  localhost e fica sempre tcp).
- `media-connection.ts` (frontend): **minimiza o playout buffer do WebRTC** no browser
  (`receiver.playoutDelayHint = 0`) ao chegar a track. É o **maior lever client-side** de
  latência - o browser ainda adapta pra cima se fosse travar, então continua fluido.
- Specs atualizados (baseline no resolver; jitter buffer + RTSP transport no ffmpeg; corrigido
  TERTIARY 640×360 → 720×480, que já estava defasado do código).

## UDP vs TCP no ingest RTSP

- Só importa na perna **câmera → ffmpeg**. UDP corta latência numa LAN limpa (sem retransmissão
  / head-of-line blocking), mas perda de pacote vira artefato até o próximo keyframe. TCP entrega
  garantido; a retransmissão só custa latência quando há perda.
- As câmeras aqui vivem na **tailnet** (overlay WireGuard, ~146ms RTT) → TCP é o default robusto.
  Numa câmera em LAN limpa vale testar `RTSP_TRANSPORT=udp` (subir `FFMPEG_REORDER_QUEUE_SIZE`
  se aparecer reordenação). A perna RTSP é dezenas de ms; não é o gargalo principal.

## SFU e TURN (WebRTC)

- **SFU**: não temos um SFU dedicado e **não precisamos**. O **mediamtx** já é o media server que
  faz o fan-out 1→N: um `ffmpeg` publica, e cada viewer WHEP recebe a track daquele publish único.
  Pra broadcast de câmera (uma via, um-para-muitos) isso É o papel do SFU. Um SFU de conferência
  (Janus/mediasoup/LiveKit) seria overkill e só somaria latência.
- **TURN**: existe a **fundação** (coturn no docker-compose, CROSS-032), mas **não está deployado
  nem ativo** no EC2 (nenhum container TURN; mediamtx sem `webrtcICEServers2`/`webrtcAdditionalHosts`).
- **Como o WebRTC funciona hoje**:
  - **Tailnet**: o browser (nó da tailnet) alcança o mediamtx em UDP 8189 direto → WebRTC ao vivo,
    baixa latência. É por isso que o stream funciona fluido pra quem está na tailnet.
  - **Público (fora da tailnet)**: UDP 8189 bloqueado no SG → sem candidato alcançável → cai pro
    **HLS** (mais latência). É aqui que o TURN entraria (relay sobre TCP/TLS 443, atravessa firewall).
- **Pra baixa latência no público** seria preciso ativar o TURN: deployar coturn + abrir 3478/5349
  no SG + configurar `webrtcICEServers2` no mediamtx + passar os iceServers no front (hoje `[]`).
  Isso é o CROSS-032 e está **travado atrás da auth do stream** (streaming público só p/ logado;
  não abrir SG antes da auth). Decisão de segurança, não um tweak de performance.
- Opção de baixo risco na tailnet: setar `webrtcAdditionalHosts` com o IP tailnet do servidor pra o
  mediamtx anunciar candidato alcançável de forma determinística (hoje funciona por auto-detecção).

**Em produção (EC2, banco, 6 sistemas):** os 6 profiles SECONDARY da PTZ → `1280×720` +
`h264profile=baseline` na streamUrl (efeito imediato, reversível). A sessão só troca quando
reabrir o stream (após o grace da sessão atual).

## Como testar no dev local

O dev local já tem a PTZ no seed e alcança 10.1.1.79 pela tailnet. Pra pegar a versão fluida:

1. Re-seed do banco local: `npx nx run ms-cameras:prisma:seed` (ou re-seed do container).
2. Reiniciar o `ms-cameras` local (pra carregar o resolver novo).
3. Abrir a câmera PTZ; a badge deve mostrar **720p** e a imagem deve vir fluida (WebRTC).

## Alavancas de latência restantes

- Se algum link jittery começar a travar depois do jitter buffer menor, subir
  `FFMPEG_MAX_DELAY_US` / `FFMPEG_REORDER_QUEUE_SIZE` no `.env` do serviço (sem redeploy).
- Garantir que o cliente use **WebRTC** e não caia pro HLS: WebRTC público exige UDP 8189
  aberto no SG **ou** TURN (CROSS-032, hoje inerte). Na tailnet já funciona direto.
- Restante da latência: encode na câmera + jitter buffer do browser (playout delay do WebRTC),
  que são fora do nosso controle direto.
