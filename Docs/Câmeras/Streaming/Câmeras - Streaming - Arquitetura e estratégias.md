---
tags:
  - doc
  - ms-cameras
  - cameras
  - streaming
aliases:
  - "Streaming - Arquitetura"
  - "01-Arquitetura-streaming"
  - "Streaming - Estratégias de entrega"
  - "Streaming - Estratégias de entrega (Strategy)"
  - "Streaming - Codecs e fallbacks"
  - "Streaming - WebRTC e WHEP"
  - "03-WebRTC-WHEP"
  - "Streaming - HLS"
  - "02-HLS"
  - "Streaming - Diagnóstico de travamento no WebRTC"
  - "04-Diagnostico-travamento-WebRTC"
  - "Streaming - Diagnóstico de oscilação WHEP-HLS no videowall"
  - "Diagnóstico de oscilação WHEP-HLS no videowall"
  - "Incidentes - Streaming (ms-cameras)"
  - "Incidente - vazamento de sessões de stream (banda das câmeras)"
  - "Incidente - dois publicadores na mesma câmera (reap e adoção se revezando)"
  - "Incidente - câmeras instáveis por perda de pacote RTP no caminho até a EC2"
  - "Pesquisa - codec, protocolo e latência"
  - "camera-streaming-latency-codec"
  - "codec-protocol-adaptive-strategy-research"
  - "Plano - Streaming sem vazamento de publicador"
  - "Registro - implementação do plano de vazamento de publicador em 21 de setembro"
  - "Streaming - Arquitetura e estratégias"
atualizado: 2026-10-02
---

# Câmeras - Streaming - Arquitetura e estratégias

Volta para [[Câmeras - Streaming]]. Fluxos, indicadores e envs em [[Câmeras - Streaming - Fluxos]]; banda em
[[Câmeras - Streaming - Banda e bitrate]]; comandos em [[Câmeras - Streaming - Runbook]].

## O problema e a forma da solução

Câmera IP fala RTSP, que não toca no navegador, e um encoder Axis sustenta de 10 a 20 sessões RTSP no
total. O Attlas põe o MediaMTX no meio: **uma conexão RTSP por path** (câmera, tier e codec), aberta sob
demanda, servida sem transcodificar a N operadores por WebRTC (primário) ou LL-HLS (reserva). Dez
operadores na mesma câmera pesam como uma câmera (RNF-CAM-21, "custo por câmera, não por olho").
Spec: `apps/ms-cameras/docs/atomic/INT-027-mediamtx-on-demand-source.md` (com a emenda no topo do
`MOD-004-hls-streaming-pipeline.md`); decisão de fan-out e de não usar CDN em
`docs/architecture/video-delivery.md` (RNF-CAM-20).

```
Câmera IP (RTSP, TCP 554)
   |  uma conexão RTSP por path aberto
   v
MediaMTX 1.21.1   path "<cameraId>-<tier>[-h265]", source = URL RTSP da câmera, sourceOnDemand
   |  fan-out para N leitores, sem decodificar nem recodificar
   +--> WebRTC (WHEP): sinalização HTTP 8889 (via /live na origem do SPA), mídia UDP 8189
   +--> LL-HLS: HTTP 8888 (via /live-hls na origem do SPA)
   +--> RTSP 8554: só o videowall (videowall-mirror-* e videowall-projection-*)
   ^
   |  control API 9997 (o ms-cameras escreve a config do path)
ms-cameras  <--  GET /api/cameras/:id/hls  (Kong, rota pública)  <--  navegador
```

Os dois caminhos de saída partem da mesma puxada: vídeo que trava num caminho e não no outro aponta para
o caminho que trava, nunca para a câmera nem para a ingestão.

## Portas

| Porta | Protocolo | Para que serve |
| --- | --- | --- |
| 554 | RTSP/TCP | saída do MediaMTX até a câmera (transporte `RTSP_TRANSPORT`, padrão `tcp`) |
| 8554 | RTSP/TCP | só o painel do videowall, em paths próprios |
| 8889 | HTTP | sinalização WHEP; o navegador chega por `/live` na origem do SPA |
| 8189 | UDP | mídia WebRTC de todas as sessões, numa porta só |
| 8888 | HTTP | LL-HLS; o navegador chega por `/live-hls` na origem do SPA |
| 9997 | HTTP | control API, só rede interna (devolve a `source` com a senha das câmeras) |
| 9998 | HTTP | métricas do MediaMTX, sem listener (`metrics: no`) |

## MediaMTX (`docker/mediamtx.yml`)

- Imagem `bluenviron/mediamtx:1.21.1`, instância única; réplica fica fora de escopo.
- É o papel de SFU para broadcast de câmera, sem simulcast nem SVC: cada qualidade é um path. Não há SFU
  de conferência (Janus, mediasoup, LiveKit) e não faz falta.
- LL-HLS: `hlsVariant: lowLatency`, 7 segmentos de 2 s, partes de 100 ms, `hlsAllowOrigins: ['*']`.
- WebRTC: `webrtcLocalUDPAddress: :8189`, `udpMaxPayloadSize: 1200` (cabe no MTU 1280 da Tailscale).
  `webrtcAdditionalHosts` e `webrtcICEServers2` vazios no arquivo versionado, preenchidos por env
  (`MTX_WEBRTCADDITIONALHOSTS`, `MTX_WEBRTCICESERVERS2_*`).
- RTMP, SRT e MoQ desligados. Sem `pathDefaults` e sem `useAbsoluteTimestamp`, de propósito
  (mediamtx#5355): os carimbos que chegam ao navegador são do relógio do MediaMTX.
- `authInternalUsers`: o anônimo publica em qualquer path e só lê paths de câmera (`<uuid>-...`) e
  `videowall-projection-`; o espelho (`videowall-mirror-`) exige usuário e senha próprios; a API é uma
  entrada anônima restrita a loopback e RFC1918, apertada por ambiente em `MEDIAMTX_API_ALLOWED_IPS`.
  O compose não publica a 9997; o override de dev a publica só em `127.0.0.1`.
- Métricas: `metrics: no` até existir credencial de scrape equivalente à do CROSS-062, nunca por faixa
  de IP.
- A config escrita pela API vive só na memória: restart do MediaMTX perde os paths, e o próximo
  `GET /hls` de cada câmera os recria.

## ms-cameras: garantir o path, não tocar no vídeo

Código em `apps/ms-cameras/src/streaming/`. Não guarda sessão nem processo. O endpoint
`GET /api/cameras/:id/hls` (`streaming.controller.ts`) negocia o codec, aplica o teto, resolve a fonte,
garante a config do path e devolve as URLs; o passo a passo e os erros estão em
[[Câmeras - Streaming - Fluxos]]. A imagem do serviço não tem `ffmpeg`; o `tini` é o PID 1.

### Fonte do tier (`services/camera-stream-source.resolver.ts`)

- **Cadeia de qualidade** (`QUALITY_FALLBACK_CHAIN`): `PRIMARY` tenta só PRIMARY; `SECONDARY` tenta
  SECONDARY e PRIMARY; `TERTIARY` tenta TERTIARY, SECONDARY e PRIMARY. Vence o primeiro perfil
  `isActive`; nenhum dá 409 `STREAM_PROFILE_NOT_CONFIGURED`. A credencial entra no userinfo da URL
  (`injectRtspCredentials`) e fica só na config do path no MediaMTX.
- **Qualidade servida nomeia o path** (`resolveServedQuality`): Axis devolve o tier pedido (a resolução
  vai na query VAPIX); Hikvision colapsa TERTIARY em SECONDARY (mesmo canal sub); fabricante genérico
  devolve o tier do perfil casado. Tiers por fabricante em `helpers/stream-tier-capability.helper.ts`.
- **Axis** (só URL com `/axis-media/`, `appendAxisVapixCodecParams`): `videocodec` = codec negociado;
  `videokeyframeinterval = max(1, round(fps x 300 / 1000))` (25 fps quando o perfil não declara;
  `CAMERA_KEYFRAME_INTERVAL_MS` troca o orçamento, `CAMERA_KEYFRAME_INTERVAL` fixa quadros);
  `videozgopmode=fixed`; `h264profile=baseline` em H264; `resolution` do perfil ou da escada
  `QUALITY_RESOLUTION_LADDER` (SECONDARY 1280x720, TERTIARY 720x480).
- **Hikvision**: sem parâmetro por request; o tier escolhe o canal (`<cam>01` principal, `<cam>02` sub,
  `helpers/hikvision-channel.helper.ts`), e codec e GOP vêm do canal no equipamento.
- **Outros fabricantes**: URL do perfil sem mudança; codec e GOP são os da câmera.

### Config do path (`services/mediamtx-path-config.service.ts`, `services/live-stream-path.service.ts`)

O path recebe `source`, `sourceOnDemand: true`, `sourceOnDemandStartTimeout` (8 s),
`sourceOnDemandCloseAfter` (30 s) e `rtspTransport`. O MediaMTX abre a câmera com o primeiro leitor,
segura o POST do WHEP desse leitor enquanto a fonte abre e fecha a fonte 30 s depois do último leitor.

`MediamtxPathConfigService.ensure(path, desired, acceptedSources)`, a cada `GET /hls`:

1. Lê a config (`GET /v3/config/paths/get/<path>`); 404 vira escrita (`CREATED`).
2. Config igual não é escrita (`UNCHANGED`). Compara só as chaves que o serviço define, com durações por
   valor (`MediamtxDuration`, o MediaMTX devolve `8000ms` como `8s`); `source` igual a uma das
   `acceptedSources` (a URL H264 de reserva de um path H265) conta como igual.
3. Config divergente com leitor fica adiada (`DEFERRED`); sem leitor, reescreve (`UPDATED`). No fallback
   H264 a reescrita mantém o `source` aceito.
4. A única escrita é `POST /v3/config/paths/replace/<path>`, um upsert: duas réplicas que criam o mesmo
   path convergem sem conflito.

Chamadas simultâneas para o mesmo path e o mesmo pedido compartilham uma ida e volta (mapa em voo por
path); pedido diferente para o mesmo path encadeia atrás e faz o próprio ciclo. Cada desfecho conta em
`ms_cameras_stream_path_config_writes_total{outcome}`. O mesmo serviço garante os paths de projeção do
videowall.

### Teto (`services/live-stream-fleet.service.ts`)

`MAX_CONCURRENT_STREAM_SESSIONS` (40) conta **paths de câmera disponíveis no MediaMTX**, para o fleet
inteiro e não por réplica, mais os admitidos desde a última leitura do watcher (guardados de forma
síncrona, contra rajada entre ticks). Espectador do mesmo path nunca conta de novo. Admitido que não abre
libera a vaga depois de `STREAM_SOURCE_START_TIMEOUT_MS` mais dois ticks (18 s). Acima do teto, 429 com
detalhe `STREAM_SESSION_CAP_REACHED`; a recusa acontece antes do resolve, sem ler o banco, quando a câmera
não tem path disponível nem admitido (`refuseWhenFull`), porque a rota é pública.

### Watcher (`workers/live-stream-path-watcher.service.ts`, a cada 5 s)

Uma leitura de `/v3/paths/list` alimenta o teto, grava o TTFF, aplica o fallback H265 e publica as
métricas. Não fecha nada: fechar é do MediaMTX. Disponibilidade é `available` (e `ready` em servidor
anterior à 1.21), em `helpers/mediamtx-path-availability.helper.ts`.

### Cliente da control API (`services/mediamtx.client.ts`)

Ponto único de leitura e escrita, com `AbortSignal.timeout(MEDIAMTX_DIAG_TIMEOUT_MS)` (2 s) porque
`fetch` não tem timeout. `getJsonOrStatus` separa "não respondeu" de "respondeu 404"; `listAll` lê todas
as páginas e devolve `null` se qualquer página falhar, nunca lista parcial; `send` escreve e devolve
`false` em falha. Consumido pelo path config, pelo watcher, pelo diagnóstico, pelo `LivePublisherProbe`
(bitrate, [[Câmeras - Streaming - Banda e bitrate]]) e pelos serviços do videowall.

### Quem remove config

Só a troca de endereço da câmera (`CameraOriginChangedEvent`) e o soft-delete (`CameraDeletedEvent`), que
apagam todos os paths da câmera pelo prefixo do `cameraId` (`handlers/`). Na troca de endereço o player
reconecta no lugar e o `GET` refeito configura o endereço novo; no soft-delete quem assistia cai com erro
terminal.

## Codecs

Ninguém transcodifica: o WHEP reempacota o codec da câmera em RTP e o LL-HLS o muxa em fMP4. O custo de
cada câmera é banda, não CPU. Requisitos RNF-CAM-05 e RF-CAM-06; spec `INT-008-codec-negotiation.md`.

| Codec da câmera | O que acontece |
| --- | --- |
| H.264 | Repassado; nas Axis em baseline, sem B-frames. Base universal e obrigatório em WebRTC (RFC 7742). |
| H.265 | Repassado só para quem pediu `codec=h265`. WebRTC só no Chrome 136+ com decode por hardware; HLS no Safari nativo e Chrome/Edge com hardware. Safari com H.265 sem validação no Attlas. |
| MJPEG | Não é convertido. Numa Axis o codec negociado vence o do perfil e a câmera entrega H264. Câmera de outro fabricante que só entrega MJPEG não tem caminho até o navegador (WHEP e HLS do MediaMTX não transportam o formato). |

Negociação:

- **Navegador** (`apps/web-attlas/src/app/core/shared/services/stream-codec.service.ts`): sonda uma vez
  por carga do app. `RTCRtpReceiver.getCapabilities('video')` precisa anunciar `video/H265`, e
  `MediaCapabilities.decodingInfo` para WebRTC (`video/H265`) ou MSE (`hvc1.1.6.L93.B0`), em 1280x720,
  30 fps e 3 Mbps, precisa dizer `supported && smooth && powerEfficient`. Só então manda `&codec=h265`.
- **Quem negocia**: videowall do VMS, detalhe de câmera, painel lateral, Detecção e diálogo do ATSPM. Os
  popups do Painel de Operações, Prioridade Seletiva, Modelo de Tráfego e a aba ACOM de Controladores
  recebem H264.
- **Backend**: valor que não é HEVC vira H264 (`normalizeStreamCodec`); câmera com analítico embarcado
  ativo (`dai` ou `virtualLoop`) recebe H264 mesmo pedindo H265, porque o encoder não sustenta os dois
  (`negotiateEffectiveCodec`, `helpers/embedded-analytics.helper.ts`).
- **Convergência**: pedido H265 sem path H265 disponível e com o H264 da mesma câmera e tier no ar entra
  no H264 e a resposta diz `codec: 'H264'` (`joinsOnlineH264`). O inverso não acontece, para não entregar
  HEVC a quem talvez não decodifique.

**Fallback H265 para H264 (só Axis)**: o resolver monta também a URL H264 de reserva
(`buildAxisFallbackUrl`), passada como `acceptedSources`. O watcher lê
`GET /v3/paths/static-sources/get/<path>` dos paths H265 ainda não disponíveis; só uma recusa RTSP 4xx da
câmera, menos 401 e 407, reaponta o path para a URL H264. Timeout, DNS e conexão recusada não decidem
nada. O nome do path segue `-h265` e a resposta segue `codec: 'H265'`; o fallback vive só na config do
path, então sobrevive a restart do `ms-cameras` e a outra réplica, e se perde num restart do MediaMTX,
de propósito.

Não há reconexão no backend: com leitor presente, o MediaMTX refaz a puxada sozinho.

## Player no navegador

`apps/web-attlas/src/app/core/shared/components/camera-stream-player/`, máquina de estados em
`media-connection.ts` (`MediaConnection`), constantes em `constants/media-connection.constants.ts`.
Política de continuidade e qualidade: `apps/web-attlas/docs/shared/atomics/UF-047-stream-picture-continuity-and-quality-policy.md`.

### WebRTC (WHEP), o primário

1. `RTCPeerConnection` com `iceServers: []`, sem STUN e sem TURN: a mídia chega ao MediaMTX por
   candidato host (`webrtcAdditionalHosts`). Um transceiver de vídeo `recvonly`, sem áudio.
2. O MediaMTX não aceita Trickle ICE: o player espera a coleta terminar, com teto de 1 s
   (`ICE_GATHERING_CAP_MS`).
3. POST `application/sdp` para `<base>/<path>/whep`, abortado em 15 s (`WHEP_NEGOTIATION_TIMEOUT_MS`), que
   cobre os 8 s de abertura sob demanda. 404 é "ainda sem fonte": repete com recuo de 1 s a 5 s por até
   60 s antes de virar falha.
4. 8 s para a mídia chegar (`WHEP_MEDIA_ARRIVAL_TIMEOUT_MS`) e 6 s para o primeiro quadro decodificado
   (`FIRST_FRAME_TIMEOUT_MS`), o caso do Chrome que recebe HEVC sem hardware e mostra preto sem erro.

Perda do peer: ICE `failed` ou `closed`, `disconnected` por 3 s (`ICE_DISCONNECT_GRACE_MS`), faixa
`ended` ou stream `inactive`. Não há `DELETE` da sessão WHEP: o player fecha o peer e o MediaMTX encerra a
leitura.

### LL-HLS, a reserva

hls.js com `lowLatencyMode: true`, `maxBufferLength: 60`, `backBufferLength` de 14 s
(`HLS_BACK_BUFFER_LENGTH_SECONDS`, a janela da playlist) e `maxLiveSyncPlaybackRate: 1.1`, sem
`liveSyncDuration*` (mira o `PART-HOLD-BACK` da playlist). HLS nativo só sem MSE (Safari). Antes de anexar
o HLS, o player zera o `srcObject` do `<video>`. Sem scrubber nem DVR: o player fica na borda ao vivo.
Falha no LL-HLS é terminal: erro fatal do hls.js ou 12 s sem quadro (`HLS_FIRST_FRAME_TIMEOUT_MS`) mostram
o card de erro com botão de reconectar. O selo `HLS` identifica a célula nesse caminho.

### Recuperação e troca

- **Já mostrou imagem e perdeu o peer**: o `FrameHold` (`frame-hold.ts`) segura o último quadro, o player
  renegocia o WHEP no lugar com o mesmo recuo e orçamento de 60 s (repetindo também o 400 "has timed out"
  e falhas de transporte) e avisa o host uma vez por episódio (`sourceLost`); o host faz um único
  `GET /hls`, que recria a config depois de um restart do MediaMTX ou de troca de endereço. O peer novo só
  é promovido quando decodifica um quadro; o LL-HLS só entra quando o orçamento acaba.
- **Nunca mostrou imagem**: cai para o LL-HLS uma vez.
- **Memória de falha** (`utils/whep-failure-tracker.util.ts`): falha WHEP fica marcada por 60 s por
  origem, câmera e codec, sem o tier (`whepSourceKey`); a próxima abertura vai direto ao LL-HLS. Peer
  promovido limpa a marca.
- **Volta ao WebRTC**: parado no LL-HLS, tenta em segundo plano em 30 s, dobrando até 300 s, e só desmonta
  o HLS quando a perna nova mostra quadro. Tile pausado não é acordado.
- **Troca de tier**: make-before-break, o peer novo negocia numa sonda fora da tela e o `FrameHold`
  congela o último quadro. No LL-HLS a troca segue no LL-HLS.
- **Compartilhamento**: `LiveMediaRegistry` (`apps/web-attlas/src/app/core/shared/services/`) faz uma
  negociação e uma decodificação por chave e espelha em N `<video>`; a conexão sobrevive 8 s sem dono.
- **H.265 que não decodifica**: só o videowall do VMS troca o codec, rebaixando o app inteiro para H264 e
  reabrindo os tiles H265, porque o decodificador é da máquina. As outras telas vão ao LL-HLS ou ao erro.
- **Debandada de rebaixamento**: a escada adaptativa só age com perda de pacote no WebRTC ou relógio
  parado no LL-HLS; com 3 rebaixamentos em 8 s na tela, os seguintes esperam
  (`ADAPTIVE_STAMPEDE_THRESHOLD`, `ADAPTIVE_STAMPEDE_WINDOW_MS` em
  `core/shared/constants/stream-quality-ladder.constants.ts`), porque o problema é CPU ou GPU local.
- **Buffer de jitter**: o player não ajusta `playoutDelayHint` nem `jitterBufferTarget`; cada navegador
  usa o buffer adaptativo padrão.

### Proxy da origem do SPA

As bases de navegador são relativas (`MEDIAMTX_WEBRTC_BASE_URL=/live`, `MEDIAMTX_HLS_BASE_URL=/live-hls`),
e o proxy do front encaminha `/live` para a 8889 e `/live-hls` para a 8888 (`apps/web-attlas/proxy.conf.mjs`
no `nx serve`, `docker/nginx-web-local.conf` no container local). Base absoluta continua aceita. A mídia
WebRTC não passa por proxy: vai por UDP 8189 direto ao candidato anunciado. O Kong só vê a chamada REST.

> [!warning] A imagem de produção do front não tem `/live` nem `/live-hls`
> `apps/web-attlas/nginx.conf` só tem `/`, `/index.html` e os estáticos. As rotas existem no conf local,
> montado pelo `docker-compose.override.yml`. Fora do dev local, a base relativa exige proxy fora do repo
> (o nginx do host) ou base absoluta.

## Por que assim

- **WebRTC primário, LL-HLS reserva.** O WebRTC dá sub-segundo (cerca de 500 ms na referência externa para
  RTSP, MediaMTX e WHEP), que operação ao vivo e PTZ exigem (RNF-CAM-03); o LL-HLS roda sobre TCP e com
  buffer, então aguenta a perda que congela o WebRTC, ao custo de segundos.
- **H.264 base, H.265 oportunístico, detectar e nunca assumir.** H.265 depende de hardware em todo
  navegador, inclusive no WebRTC. HEVC em WASM não sustenta mosaico em tempo real, e AV1 não existe em
  WebRTC.
- **ABR por substream nativo da câmera**, nunca transcode no servidor: transcode por stream mata a escala.
- **Baseline nas Axis**: High usa B-frames, e a reordenação no decode custa latência.
- **GOP curto por orçamento de tempo** (INT-024): o MediaMTX só alimenta um leitor WHEP novo no próximo
  keyframe, então o intervalo de keyframe é a latência de entrada e de recuperação de cada tile.
- **TCP na puxada**: as câmeras vivem na VPN e na tailnet (cerca de 146 ms de RTT); em LAN limpa
  `RTSP_TRANSPORT=udp` pode cortar latência.
- **Sob demanda no MediaMTX**, sem relay próprio: relay com lease, reaper, varredura de `/proc` e adoção
  de publicador vazava puxadas órfãs (câmera puxada sem ninguém assistindo) e não escalava.
- **Sem STUN**: esperar o candidato do STUN público travava a coleta de ICE em todo tile e derrubava o
  videowall quando muitos abriam juntos.

## Armadilhas conhecidas

- **`online` do MediaMTX mente em path sob demanda**: sem leitor responde `online: true` com `onlineTime`
  no ano 1. Use `available`.
- **Path listado não é path puxando.** Path disponível com `readers: []` além de 30 s é config errada no
  MediaMTX, não processo órfão.
- **Mudar a config de um path derruba os leitores dele.** Daí o "igual não escreve" e o `DEFERRED`;
  `DEFERRED` acumulando é drift represado (credencial rotacionada num path nunca ocioso), e só limpa
  quando o path esvazia. Nunca force derrubando leitores. Mudar campo global do MediaMTX em runtime
  derruba todas as sessões.
- **Restart do MediaMTX apaga os paths** e a memória do fallback H265; o player recupera sozinho.
- **O que multiplica puxadas na câmera** é tier, codec, linha de tenant e projeção do videowall. No
  dev.v2 cada câmera física é replicada por sistema-tenant com UUID próprio: seis tenants assistindo são
  até seis puxadas da mesma câmera.
- **Câmera com analítico embarcado não sustenta dois encodes**: com duas ingestões, a 10.1.1.80 mostrou
  fome de quadro (parte do HLS de 134 ms para 7,1 s). Por isso o H265 é recusado a ela.
- **WebRTC trava e volta de uma vez** quando há perda no UDP de saída: sem retransmissão útil nem buffer,
  o quadro de referência corrompido congela a imagem até o próximo keyframe da câmera. Confirma-se com
  `ingest.bytesReceived` liso no diagnóstico enquanto `packetsLost`, `freezeCount` e `pliCount` sobem no
  `getStats()`. Amplificadores: host de dev sobrecarregado e mídia só pela rota UDP da Tailscale.
- **Portas do dev.v2 para o WebRTC**: o Security Group libera de entrada a **UDP 8189** (mídia) e o 443,
  por onde passa a sinalização WHEP (`/live` no nginx). 8888 e 8889 ficam fechadas para fora. O
  MediaMTX anuncia só o IP público (`MTX_WEBRTCADDITIONALHOSTS=3.15.199.101`), nunca o da Tailscale. As
  portas do coturn (3478, 5349 e o relay 49160-49200/udp) estão fechadas e não são usadas: o player
  conecta sem ICE server. Mídia pública também quebrou quando a Tailscale removeu o salto `DOCKER` da
  cadeia `FORWARD` (correção no host, ver [[Câmeras - Streaming - Runbook]]).
- **Saturação de egress do host degrada a saúde de todas as câmeras juntas**: vídeo e pings de
  healthcheck dividem a mesma interface, então um pico de visualização concorrente põe toda a rede em
  `DEGRADED` ao mesmo tempo (latência de ping de cerca de 145 ms para 800 a 1300 ms). Na EC2 de dev
  (`t3a`, família burstable) o padrão degrada, cai e volta sozinho em minutos.
- **Menos de 7 segmentos de LL-HLS quebra o muxer**, e todo pedido HLS responde 500.
- **`jitterBufferTarget = 0` faz o decoder descartar quadros** em todas as câmeras; fica o padrão.
- **URL Axis com `/onvif-media/`** não recebe os parâmetros VAPIX: sem baseline e com o GOP da câmera.
  Câmera genérica com GOP longo trava mais no WebRTC; Zipstream com GOP ou FPS dinâmico reintroduz o
  problema.
- **Câmera genérica que manda H.265 no path sem sufixo** entrega HEVC a quem não pediu: Chrome sem
  hardware mostra preto e não há fallback no backend.
- **`ms-cameras` responde 502 por 4 a 5 minutos depois de um deploy** (janela de boot): não reiniciar.
- **Matar só o node do `nx serve`** deixa a cadeia `npm exec nx serve` segurando o lock do NX, e o serviço
  novo fica esperando "in another nx process": mate a cadeia inteira.
- **`/health/ready` do `ms-cameras` não checa dependência nenhuma** (controller padrão do
  `core-common`, sem indicador de Postgres, Kafka, Redis ou MediaMTX).

## Pendências

- TURN para acesso fora da rede do cliente: CROSS-063 (`docs/specs/cross-service/CROSS-063-public-webrtc-turn.md`)
  em `draft`, travada atrás da autenticação do stream. O player também não lê servidores ICE da resposta
  WHEP, e o `docker/turnserver.conf` nega peers 10/8, 172.16/12 e 100.64/10, o que pode impedir o TURN de
  alcançar um candidato privado do MediaMTX.
- Medição glass-to-glass e a meta de 11 células por 30 min abaixo de 1,5 s (UF-040, INT-024).
- Confirmar que a Axis devolve 4xx reconhecível quando recusa H265 (o gatilho do fallback).
- Matriz das quatro combinações (analítico embarcado ligado e desligado, uma e duas ingestões) no runbook
  `apps/ms-cameras/docs/runbooks/stream-ingest-saturation.md`, seção 5, com uma medição só registrada.
- Saber se o MediaMTX retransmite por NACK e se Safari negocia HEVC por WHEP.

> [!warning] Divergências atuais de doc no repositório
> - `.env.example`, o comentário de `live-stream-path.config.ts` e a seção 5 do INT-027 dizem que o player
>   espera 10 s pelo WHEP; o código espera 15 s.
> - O runbook `stream-ingest-saturation.md`, seção 6, manda ler `localhost:9998/metrics`, que não responde.
> - Os diagramas [[Câmeras - Streaming - Diagrama - Pipeline HLS.excalidraw]] e
>   [[Câmeras - Streaming - Diagrama - Estratégia de codec.excalidraw]] ainda desenham o relay `ffmpeg`.
> - O nome `ms_cameras_stream_relays_active` ficou do modelo com relay; mede paths disponíveis.
> - `TelemetryPathRegistry` segue no código, sempre vazio e inerte.
