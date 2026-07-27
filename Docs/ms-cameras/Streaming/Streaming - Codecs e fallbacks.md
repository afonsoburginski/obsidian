---
tags: [doc, cameras, ms-cameras, streaming]
---

# Streaming - Codecs e fallbacks

Volta para [[00 - Streaming]] · [[ms-cameras - visão geral]]. Irmãs: [[01-Arquitetura-streaming]], [[02-HLS]], [[03-WebRTC-WHEP]], [[Streaming - Estratégias de entrega (Strategy)]], [[Streaming - Fluxos e SLA]].

Como o `ms-cameras` trata cada codec no ingest e as três camadas de fallback que mantêm o
stream de pé: **qualidade** (perfil de stream), **codec** (HEVC→H264) e **reconexão** (ffmpeg
caiu). Requisitos: RNF-CAM-05 (H.264/H.265 configuráveis por stream) e RF-CAM-06 (primário/secundário).
Fonte: `apps/ms-cameras/src/streaming/services/ffmpeg-session.service.ts` e `.../camera-stream-source.resolver.ts`.

> **Negociação de codec por cliente (INT-008, 2026-07).** O codec deixou de ser fixo pelo perfil e
> passou a ser negociado por request: o player (`StreamCodecService`, web-attlas) sonda
> `MediaCapabilities.decodingInfo` + `RTCRtpReceiver.getCapabilities` e pede `?codec=h265` só quando
> o decode é por hardware (`smooth && powerEfficient`); senão H264. O backend chaveia a sessão/relay
> por `(cameraId, quality, codec)` — H264 e H265 coexistem, path mediamtx `<cameraId>-<quality>[-h265]`
> — e o resolver injeta `videocodec` conforme o request (o `requestedCodec` sobrepõe o codec do perfil),
> com fallback H264 no mesmo path. O fallback server-side HEVC→H264 abaixo continua valendo. Detalhe em
> `apps/ms-cameras/docs/atomic/INT-008-codec-negotiation.md` e MOD-004 §13.

## Codec no ingest (ffmpeg)

`spawnFfmpeg()` monta os args do ffmpeg conforme o codec resolvido (`state.codec`, normalizado
uppercase). Não é feito transcode, exceto MJPEG.

| Codec | Modo | Args relevantes | Por quê |
| --- | --- | --- | --- |
| H.264 | copy | `-c copy` | Só reembrulha os pacotes RTSP→RTSP. CPU ~zero. |
| H.265 / HEVC | copy | `-c copy -tag:v hvc1` | Copy também; a tag `hvc1` é obrigatória para o HEVC tocar em HLS/MPEG-TS no Safari/iOS. |
| MJPEG | transcode | `-c:v libx264 -preset ultrafast -tune zerolatency -x264-params keyint=15:min-keyint=15:scenecut=0 -b:v 2000k` | MJPEG não é multiplexável em MPEG-TS, então precisa virar H.264. `ultrafast`/`zerolatency` mantêm o custo de CPU o mais baixo possível; `keyint=15` fixa o GOP curto (útil para a recuperação por keyframe — ver [[04-Diagnostico-travamento-WebRTC]]). |

As flags de baixa latência de entrada (`+nobuffer+flush_packets`, `low_delay`, `-max_delay
500000`, `-reorder_queue_size 64`, e a ausência proposital de `-discardcorrupt`) estão
detalhadas em [[01-Arquitetura-streaming]]. `FFMPEG_LOG_LEVEL` (default `warning`) controla a
verbosidade; subir para `verbose`/`debug` expõe "Non-monotonous DTS" e pacotes corrompidos.

## Parâmetros VAPIX (câmeras Axis)

Só se a URL contém `/axis-media/`. `appendAxisVapixCodecParams()` reescreve a query string do
RTSP para forçar o comportamento que o pipeline precisa:

- `videocodec` = `h265` \| `jpeg` \| `h264` (mapeado do codec do perfil).
- `videokeyframeinterval=15` — GOP curto (keyframe frequente), central para a recuperação
  rápida no WebRTC.
- `videozgopmode=fixed` — GOP de tamanho fixo (a chave é literalmente `videozgopmode` no
  código, `apps/ms-cameras/src/streaming/services/camera-stream-source.resolver.ts:100`).
- `resolution=<W>x<H>` — só quando `resolutionWidth`/`resolutionHeight` vêm no perfil.

Câmeras não-Axis não recebem esses params: o GOP é o que a câmera mandar (ver o diagnóstico
do travamento em [[04-Diagnostico-travamento-WebRTC]]).

## Exemplos ponta a ponta

Quatro casos reais mostrando **perfil → URL resolvida → args do ffmpeg → fallback**. Visual: [[09 - Streaming - estrategia de codec.excalidraw|estratégia de codec (diagrama)]].

**1. Axis H.264 (PRIMARY)** — perfil `codec=H264`, `streamUrl=rtsp://cam/axis-media/media.amp`, 1920×1080.
- Resolver → `rtsp://user:pass@cam/axis-media/media.amp?videocodec=h264&videokeyframeinterval=15&videozgopmode=fixed&resolution=1920x1080`
- `fallbackRtspUrl`: **nenhuma** (já é H264).
- ffmpeg: `-c copy` (remux puro, CPU ~0).

**2. Axis H.265 / HEVC (PRIMARY)** — perfil `codec=H265`.
- Resolver → `...?videocodec=h265&videokeyframeinterval=15&videozgopmode=fixed&resolution=…`
- `fallbackRtspUrl` pré-montada → `...?videocodec=h264&videokeyframeinterval=15&…`
- ffmpeg: `-c copy -tag:v hvc1` (a tag deixa o HEVC tocar em HLS/Safari).
- Se **não virar `ACTIVE` na 1ª tentativa** → troca para a `fallbackRtspUrl`, `codec=H264`, reinicia (1×).

**3. MJPEG** — perfil `codec=MJPEG` (Axis).
- Resolver → `...?videocodec=jpeg&…`; `fallbackRtspUrl` → `...?videocodec=h264&…`.
- ffmpeg: `-c:v libx264 -preset ultrafast -tune zerolatency -x264-params keyint=15:min-keyint=15:scenecut=0 -b:v 2000k` (MJPEG não muxa em MPEG-TS → vira H.264).
- Mesmo fallback de codec para H.264 se não iniciar.

**4. RTSP genérico (não-Axis)** — perfil `codec=H265`, `streamUrl=rtsp://cam:554/stream1` (sem `/axis-media/`).
- Resolver → URL **sem** params VAPIX (a câmera decide GOP/keyframe); `fallbackRtspUrl`: **nenhuma** (`buildAxisFallbackUrl` só age em Axis).
- ffmpeg: `-c copy -tag:v hvc1`.
- Sem fallback de codec: se o H.265 não subir, cai direto no ciclo de reconexão (Fallback 3). GOP longo da câmera pode causar travadas no WebRTC — ver [[04-Diagnostico-travamento-WebRTC]].

## Fallback 1 — cadeia de qualidade (perfil de stream)

`camera-stream-source.resolver.ts`, constante `QUALITY_FALLBACK_CHAIN`. Se o perfil pedido não
existir/estiver inativo, o resolver desce para o próximo em ordem de preferência decrescente e
o primeiro perfil `isActive` vence. O `resolvedQuality` retornado **pode diferir** do pedido.

| Qualidade pedida | Tenta nesta ordem |
| --- | --- |
| `PRIMARY` | PRIMARY |
| `SECONDARY` | SECONDARY → PRIMARY |
| `TERTIARY` | TERTIARY → SECONDARY → PRIMARY |

`lookupProfile()` busca `cameraStreamProfile` (role = qualidade, `isActive: true`) + `camera` +
`cameraCredential` em paralelo; injeta as credenciais no RTSP (`injectRtspCredentials`) e resolve
o codec como `profile.codec ?? camera.videoCodec ?? 'H264'`. Se nenhum elo da cadeia tem perfil
ativo → `BusinessRuleViolationException` com `errorCode` `STREAM_PROFILE_NOT_CONFIGURED`.
Isso implementa o primário/secundário do RF-CAM-06 com degradação graciosa de qualidade.

## Fallback 2 — codec (HEVC/outro → H264, uma vez)

Para Axis, `buildAxisFallbackUrl()` pré-monta uma `fallbackRtspUrl` forçando `videocodec=h264`
**sempre que o codec não é H264** (HEVC ou MJPEG). Essa URL fica guardada no `IHlsSessionState`.

A troca acontece em `scheduleReconnect()`: se o stream **falhou antes de virar `ACTIVE`**
(`reconnectAttempts === 0 && status !== ACTIVE`) e existe `fallbackRtspUrl`, o serviço troca
`rtspUrl` pela de fallback, zera `fallbackRtspUrl` (só dá para cair uma vez) e seta `codec =
'H264'`. Ou seja: se a câmera anuncia H.265 mas não sobe, o pipeline degrada para H.264 numa
única tentativa antes de entrar no ciclo normal de reconexão. Isso é a rede de segurança do
RNF-CAM-05 (ambos os codecs suportados, mas H.264 como piso confiável).

## Fallback 3 — reconexão com backoff exponencial

`scheduleReconnect()` só roda quando o ffmpeg sai **e ainda há espectadores**
(`viewerCount > 0`); sessão sem viewers morre em silêncio.

- Delay: `min(baseDelayMs * 2^(attempt-1), 30_000)` — teto de 30s.
  `baseDelayMs` = `FFMPEG_RECONNECT_BASE_DELAY_MS` (default 1000).
- Teto de tentativas: `FFMPEG_RECONNECT_MAX_RETRIES` (default 10). Ao estourar → `status =
  ERROR`, remove do registry e emite `errorCode` `FFMPEG_MAX_RETRIES_EXCEEDED`.
- Cada retry emite `RECONNECTING` (com `attempt`/`delayMs`) → o gateway repassa como
  `stream.reconnecting` (ver [[Streaming - Fluxos e SLA]]).
- Guarda contra timer obsoleto: o `attempt` é capturado no closure; se o stream se recupera
  antes (`onStreamReady` zera `reconnectAttempts`), o timer agendado é descartado.

Enquanto reconecta, o `attachToExisting` do controller não sobe um segundo ffmpeg — os viewers
seguem anexados à mesma sessão e acompanham a recuperação pelos eventos WebSocket.

## Env vars

| Var | Default | Efeito |
| --- | --- | --- |
| `FFMPEG_LOG_LEVEL` | `warning` | Verbosidade do ffmpeg no log. |
| `FFMPEG_RECONNECT_MAX_RETRIES` | `10` | Tentativas antes de dar o stream como `ERROR`. |
| `FFMPEG_RECONNECT_BASE_DELAY_MS` | `1000` | Base do backoff exponencial (teto 30s). |

## Fallback no player (WebRTC → HLS)

Independente dos fallbacks de servidor acima, o player faz sua própria degradação: tenta
**WebRTC/WHEP** primeiro e, se a conexão ICE falhar ou travar, cai **uma vez** para **HLS**.
Isso é do lado do frontend e está descrito em [[03-WebRTC-WHEP]] e [[02-HLS]].

Visual: [[09 - Streaming - estrategia de codec.excalidraw|estratégia de codec]] · pipeline completo em [[04 - MOD-004 hls-streaming-pipeline.excalidraw|diagrama]].
