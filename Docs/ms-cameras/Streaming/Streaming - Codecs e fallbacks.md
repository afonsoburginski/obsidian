---
tags:
  - doc
  - ms-cameras
  - cameras
  - streaming
atualizado: 2026-08-24
---

# Streaming - Codecs e fallbacks

Volta para [[Streaming]] · [[ms-cameras]]. Irmãs: [[Streaming - Arquitetura]], [[Streaming - HLS]], [[Streaming - WebRTC e WHEP]], [[Streaming - Estratégias de entrega]], [[Streaming - Fluxos e SLA]].

Como o `ms-cameras` trata cada codec no ingest e as três camadas de fallback que mantêm o
stream de pé: **qualidade** (perfil de stream), **codec** (HEVC→H264) e **reconexão** (ffmpeg
caiu). Requisitos: RNF-CAM-05 (H.264/H.265 configuráveis por stream) e RF-CAM-06 (primário/secundário).
Fonte: `apps/ms-cameras/src/streaming/services/ffmpeg-session.service.ts` e `.../camera-stream-source.resolver.ts`.

> **Negociação de codec por cliente (INT-008, 2026-07).** O codec deixou de ser fixo pelo perfil e
> passou a ser negociado por request: o player (`StreamCodecService`, web-attlas) sonda
> `MediaCapabilities.decodingInfo` + `RTCRtpReceiver.getCapabilities` e pede `?codec=h265` só quando
> o decode é por hardware (`smooth && powerEfficient`); senão H264. O backend chaveia a sessão/relay
> por `(cameraId, quality, codec)` - H264 e H265 coexistem, path mediamtx `<cameraId>-<quality>[-h265]`
> - e o resolver injeta `videocodec` conforme o request (o `requestedCodec` sobrepõe o codec do perfil),
> com fallback H264 no mesmo path. O fallback server-side HEVC→H264 abaixo continua valendo. Detalhe em
> `apps/ms-cameras/docs/atomic/INT-008-codec-negotiation.md` e MOD-004 seção 13.
>
> **Câmera com analítico embarcado ativo força H264 (achado em 24/08, não datado no código).** Se o
> cliente pede `h265` mas a câmera tem analítico embarcado ativo
> (`resolver.isEmbeddedAnalyticsActive`), `negotiateEffectiveCodec()` força `H264` mesmo assim - o
> encoder da câmera não sustenta H265 e detecção simultâneos. Ver [[Analítico - Arquitetura e estratégias]].

## Codec no ingest (ffmpeg)

`spawnFfmpeg()` monta os args do ffmpeg conforme o codec resolvido (`state.codec`, normalizado
uppercase). Não é feito transcode, exceto MJPEG.

| Codec | Modo | Args relevantes | Por quê |
| --- | --- | --- | --- |
| H.264 | copy | `-c copy` | Só reembrulha os pacotes RTSP→RTSP. CPU ~zero. |
| H.265 / HEVC | copy | `-c copy -tag:v hvc1` | Copy também; a tag `hvc1` é obrigatória para o HEVC tocar em HLS/MPEG-TS no Safari/iOS. |
| MJPEG | transcode | `-c:v libx264 -preset ultrafast -tune zerolatency -x264-params keyint=15:min-keyint=15:scenecut=0 -b:v 2000k` | MJPEG não é multiplexável em MPEG-TS, então precisa virar H.264. `ultrafast`/`zerolatency` mantêm o custo de CPU o mais baixo possível; `keyint=15` fixa o GOP curto (útil para a recuperação por keyframe - ver [[Streaming - Diagnóstico de travamento no WebRTC]]). |

As flags de baixa latência de entrada (`+nobuffer+flush_packets`, `low_delay`, `-max_delay
500000`, `-reorder_queue_size 64`, e a ausência proposital de `-discardcorrupt`) estão
detalhadas em [[Streaming - Arquitetura]]. `FFMPEG_LOG_LEVEL` (default `warning`) controla a
verbosidade; subir para `verbose`/`debug` expõe "Non-monotonous DTS" e pacotes corrompidos.

> [!success] Estado em 24/08: fix de 19/08 no jitter buffer e no shaping da telemetria 24/7
> `72815a9db5` (19/08) fez duas correções na mesma leva:
> 1. **Restaurou o jitter buffer do ffmpeg** - `-max_delay 500000`/`-reorder_queue_size 64` tinham saído
>    de algum ponto do pipeline e voltaram, para tolerar a variação normal de chegada do RTSP sem
>    travar a cada pacote reordenado (ver a seção de flags de baixa latência acima e em
>    [[Streaming - Arquitetura]]).
> 2. **Corrigiu o shaping do pull de telemetria 24/7** para câmeras provisionadas via ONVIF
>    (`/onvif-media/`): a lista de paths "downscalable" do `TelemetryPathReconciler` não reconhecia esse
>    padrão de URL e rodava a telemetria na resolução nativa em vez de 320x180@5fps - dobrando a carga
>    real de RTSP no device só para manter o path always-on de bitrate vivo. Ver
>    [[Bitrate medido 24-7 - telemetria always-on]].

## Parâmetros VAPIX (câmeras Axis)

Só se a URL contém `/axis-media/`. `appendAxisVapixCodecParams()` reescreve a query string do
RTSP para forçar o comportamento que o pipeline precisa:

- `videocodec` = `h265` \| `jpeg` \| `h264` (mapeado do codec do perfil).
- `videokeyframeinterval=15` - GOP curto (keyframe frequente), central para a recuperação
  rápida no WebRTC.
- `videozgopmode=fixed` - GOP de tamanho fixo (a chave é literalmente `videozgopmode` no
  código, `apps/ms-cameras/src/streaming/services/camera-stream-source.resolver.ts:100`).
- `resolution=<W>x<H>` - só quando `resolutionWidth`/`resolutionHeight` vêm no perfil.

Câmeras não-Axis não recebem esses params: o GOP é o que a câmera mandar (ver o diagnóstico
do travamento em [[Streaming - Diagnóstico de travamento no WebRTC]]).

## Exemplos ponta a ponta

Quatro casos reais mostrando **perfil → URL resolvida → args do ffmpeg → fallback**. Visual: [[09 - Streaming - estratégia de codec.excalidraw|estratégia de codec (diagrama)]].

**1. Axis H.264 (PRIMARY)** - perfil `codec=H264`, `streamUrl=rtsp://cam/axis-media/media.amp`, 1920×1080.
- Resolver → `rtsp://user:pass@cam/axis-media/media.amp?videocodec=h264&videokeyframeinterval=15&videozgopmode=fixed&resolution=1920x1080`
- `fallbackRtspUrl`: **nenhuma** (já é H264).
- ffmpeg: `-c copy` (remux puro, CPU ~0).

**2. Axis H.265 / HEVC (PRIMARY)** - perfil `codec=H265`.
- Resolver → `...?videocodec=h265&videokeyframeinterval=15&videozgopmode=fixed&resolution=…`
- `fallbackRtspUrl` pré-montada → `...?videocodec=h264&videokeyframeinterval=15&…`
- ffmpeg: `-c copy -tag:v hvc1` (a tag deixa o HEVC tocar em HLS/Safari).
- Se **não virar `ACTIVE` na 1ª tentativa** → troca para a `fallbackRtspUrl`, `codec=H264`, reinicia (1×).

**3. MJPEG** - perfil `codec=MJPEG` (Axis).
- Resolver → `...?videocodec=jpeg&…`; `fallbackRtspUrl` → `...?videocodec=h264&…`.
- ffmpeg: `-c:v libx264 -preset ultrafast -tune zerolatency -x264-params keyint=15:min-keyint=15:scenecut=0 -b:v 2000k` (MJPEG não muxa em MPEG-TS → vira H.264).
- Mesmo fallback de codec para H.264 se não iniciar.

**4. RTSP genérico (não-Axis)** - perfil `codec=H265`, `streamUrl=rtsp://cam:554/stream1` (sem `/axis-media/`).
- Resolver → URL **sem** params VAPIX (a câmera decide GOP/keyframe); `fallbackRtspUrl`: **nenhuma** (`buildAxisFallbackUrl` só age em Axis).
- ffmpeg: `-c copy -tag:v hvc1`.
- Sem fallback de codec: se o H.265 não subir, cai direto no ciclo de reconexão (Fallback 3). GOP longo da câmera pode causar travadas no WebRTC - ver [[Streaming - Diagnóstico de travamento no WebRTC]].

## Fallback 1 - cadeia de qualidade (perfil de stream)

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

## Fallback 2 - codec (HEVC/outro → H264, uma vez)

Para Axis, `buildAxisFallbackUrl()` pré-monta uma `fallbackRtspUrl` forçando `videocodec=h264`
**sempre que o codec não é H264** (HEVC ou MJPEG). Essa URL fica guardada no `IHlsSessionState`.

A troca acontece em `scheduleReconnect()`: se o stream **falhou antes de virar `ACTIVE`**
(`reconnectAttempts === 0 && status !== ACTIVE`) e existe `fallbackRtspUrl`, o serviço troca
`rtspUrl` pela de fallback, zera `fallbackRtspUrl` (só dá para cair uma vez) e seta `codec =
'H264'`. Ou seja: se a câmera anuncia H.265 mas não sobe, o pipeline degrada para H.264 numa
única tentativa antes de entrar no ciclo normal de reconexão. Isso é a rede de segurança do
RNF-CAM-05 (ambos os codecs suportados, mas H.264 como piso confiável).

## Fallback 3 - reconexão com backoff exponencial

`scheduleReconnect()` só roda quando o ffmpeg sai **e ainda há espectadores**
(`viewerCount > 0`); sessão sem viewers morre em silêncio.

- Delay: `min(baseDelayMs * 2^(attempt-1), 30_000)` - teto de 30s.
  `baseDelayMs` = `FFMPEG_RECONNECT_BASE_DELAY_MS` (default 1000).
- Teto de tentativas: `FFMPEG_RECONNECT_MAX_RETRIES` (default 10). Ao estourar → `status =
  ERROR`, remove do registry e emite `errorCode` `FFMPEG_MAX_RETRIES_EXCEEDED`.
- Cada retry emite `RECONNECTING` (com `attempt`/`delayMs`) → o gateway repassa como
  `stream.reconnecting` (ver [[Streaming - Fluxos e SLA]]).
- Guarda contra timer obsoleto: o `attempt` é capturado no closure; se o stream se recupera
  antes (`onStreamReady` zera `reconnectAttempts`), o timer agendado é descartado.

Enquanto reconecta, o `attachToExisting` do controller não sobe um segundo ffmpeg - os viewers
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
Isso é do lado do frontend e está descrito em [[Streaming - WebRTC e WHEP]] e [[Streaming - HLS]].

## Guarda contra stampede de downgrade adaptativo (front, 19/08)

> [!success] `947da10900` (19/08) - contenção de CPU/GPU confundida com degradação de rede
> O mosaico do VMS decide qualidade por tile via `ITileQualityState`/`videowall-stream-session.store.ts`
> (ver [[VMS - Arquitetura e estratégias]]): cada tile tem downgrade/upgrade adaptativo com cooldown
> próprio (`adaptiveCooldownUntil`). Quando o browser fica sem CPU/GPU para decodificar N streams
> simultâneos, os players reportam estol de forma parecida com perda de rede, e todos os tiles
> disparavam downgrade adaptativo **ao mesmo tempo** - uma queda em massa de qualidade sem relação com
> a rede real. O fix introduz um limite **global** (`ADAPTIVE_STAMPEDE_THRESHOLD`/`WINDOW_MS`, em
> `stream-quality-ladder.constants.ts`) que trava novos downgrades adaptativos quando muitos tiles
> pedem ao mesmo tempo dentro da janela - sinal de que o problema é local (browser), não de rede.

## Pesquisa e medições

O porquê das escolhas acima está em [[Pesquisa - codec, protocolo e latência]], que consolida as duas
investigações de julho/2026: o diagnóstico do delay na PTZ (06/07) e a pesquisa de estratégia adaptativa
que virou o INT-008 (07/07). Em três linhas:

- **H.264 é a base universal** e no player de baixa latência vale `h264profile=baseline`, porque High usa B-frames e reordenação no decode custa latência.
- **H.265 é oportunístico e hardware-gated** em todo browser, inclusive no caminho WebRTC (Chrome 136+ negocia, mas só com decode por hardware). Detectar, nunca assumir.
- **ABR vem de substream nativo da câmera**, nunca de transcode no servidor: o mediamtx é passthrough e não transcoda.

Visual: [[09 - Streaming - estratégia de codec.excalidraw|estratégia de codec]] · pipeline completo em [[04 - MOD-004 hls-streaming-pipeline.excalidraw|diagrama]].
