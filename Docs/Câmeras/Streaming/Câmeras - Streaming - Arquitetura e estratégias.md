---
tags:
  - doc
  - cameras
  - streaming
  - ms-cameras
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
atualizado: 2026-10-07
---

# Câmeras - Streaming - Arquitetura e estratégias

Volta para [[Câmeras - Streaming]].

## Resumo

Câmera IP fala RTSP, que o navegador não toca, e um encoder Axis sustenta de 10 a 20 sessões RTSP no total.
O MediaMTX fica no meio: abre **uma conexão RTSP por path** (câmera, tier e codec) quando chega o primeiro
espectador, fecha 30 s depois do último e entrega o mesmo vídeo, sem transcodificar, a quantos operadores houver,
por WebRTC (primário) ou LL-HLS (reserva). O `ms-cameras` só escreve a config do path e devolve onde tocar; o
player do `web-attlas` cuida da recuperação, da reserva e da volta ao WebRTC. Dez operadores na mesma câmera
custam o mesmo que um.

Passo a passo em [[Câmeras - Streaming - Fluxos]], metas e variáveis em [[Câmeras - Streaming - Requisitos e SLA]],
banda em [[Câmeras - Streaming - Banda e bitrate]], codecs em [[Câmeras - Streaming - Codecs]] e comandos em
[[Câmeras - Streaming - Runbook]]. O módulo Câmeras inteiro está em [[Câmeras - Arquitetura e estratégias]].

## Onde está no código

```
Câmera IP (RTSP, TCP 554)
   |  uma conexão RTSP por path aberto
   v
MediaMTX 1.21.1   path "<cameraId>-<tier>[-h265|-av1]", source = URL RTSP da câmera, sourceOnDemand
   |  fan-out para N leitores, sem decodificar nem recodificar
   +--> WebRTC (WHEP): sinalização HTTP 8889 (pela rota de vídeo na origem do SPA), mídia UDP 8189
   +--> LL-HLS: HTTP 8888 (pela rota de vídeo na origem do SPA)
   +--> RTSP 8554: só o videowall (videowall-mirror-* e videowall-projection-*)
   ^
   |  control API 9997 (o ms-cameras escreve a config do path)
ms-cameras  <--  GET /api/cameras/:id/hls  (Kong, rota pública)  <--  navegador
```

Os dois caminhos de saída partem da mesma puxada: vídeo que trava num caminho e não no outro aponta para o
caminho que trava, nunca para a câmera nem para a ingestão.

| Caminho | Papel |
| --- | --- |
| `docker/mediamtx.yml` | config do MediaMTX: portas, LL-HLS, WebRTC, usuários e control API |
| `docker-compose.yml`, serviço `mediamtx` | imagem `bluenviron/mediamtx:1.21.1`, portas publicadas, credencial do espelho e faixa da API por env |
| `apps/ms-cameras/src/streaming/streaming.controller.ts` | `GET /api/cameras/:id/hls` |
| `apps/ms-cameras/src/streaming/services/camera-stream-source.resolver.ts` | escolhe perfil, codec e URL da câmera |
| `apps/ms-cameras/src/streaming/services/live-stream-path.service.ts` | nome do path, URLs de navegador e URL H.264 de reserva |
| `apps/ms-cameras/src/streaming/services/mediamtx-path-config.service.ts` | lê e escreve a config do path, sem escrever o que já está igual |
| `apps/ms-cameras/src/streaming/services/live-stream-fleet.service.ts` | teto de paths no ar |
| `apps/ms-cameras/src/streaming/workers/live-stream-path-watcher.service.ts` | leitura a cada 5 s: teto, TTFF, fallback de codec e métricas |
| `apps/ms-cameras/src/streaming/services/mediamtx.client.ts` | único cliente da control API |
| `apps/ms-cameras/src/streaming/handlers/` | remove os paths da câmera na troca de endereço e no soft-delete |
| `apps/ms-cameras/src/streaming/helpers/stream-codec.helper.ts` | nome do path e leitura da preferência de codec |
| `apps/ms-cameras/src/streaming/helpers/rtsp-credentials.helper.ts` | credencial na URL, validação da URL e máscara da senha em log |
| `apps/ms-cameras/src/health/camera-video-codec.probe.ts` | grava os codecs que a câmera declara |
| `apps/web-attlas/src/app/core/shared/components/camera-stream-player/` | player; máquina de estados em `media-connection.ts` |
| `apps/web-attlas/src/app/core/shared/services/stream-codec.service.ts` | sonda de codec do navegador |
| `apps/web-attlas/src/app/core/shared/services/live-media-registry.service.ts` | uma conexão por chave, espelhada em N `<video>` |
| `apps/web-attlas/proxy.conf.mjs`, `docker/nginx-web-local.conf` | rotas de vídeo na origem do SPA no dev local |
| `apps/web-attlas/docs/shared/atomics/UF-047-stream-picture-continuity-and-quality-policy.md` | spec da política de continuidade e qualidade da imagem no player |

### Portas

| Porta | Protocolo | Para que serve |
| --- | --- | --- |
| 554 | RTSP/TCP | saída do MediaMTX até a câmera (transporte `RTSP_TRANSPORT`, padrão `tcp`) |
| 8554 | RTSP/TCP | só o videowall, em paths próprios |
| 8889 | HTTP | sinalização WHEP e WHIP; o navegador chega pela rota de vídeo na origem do SPA |
| 8189 | UDP | mídia WebRTC de todas as sessões, numa porta só |
| 8888 | HTTP | LL-HLS; o navegador chega pela rota de vídeo na origem do SPA |
| 9997 | HTTP | control API, só rede interna (devolve a `source` com a senha das câmeras) |
| 9998 | HTTP | métricas do MediaMTX, sem listener (`metrics: no`) |

O compose publica no host 8888, 8889, 8189/udp e 8554. A 9997 não é publicada; o `docker-compose.override.yml`
do dev local a publica só em `127.0.0.1`, para o `ms-cameras` em `nx serve`.

### MediaMTX

- Imagem `bluenviron/mediamtx:1.21.1`, instância única; réplica fica fora de escopo. A imagem não tem shell nem
  utilitários: `docker compose exec mediamtx <comando>` falha sempre.
- É o papel de SFU para broadcast de câmera, sem simulcast nem SVC: cada qualidade é um path. Não há SFU de
  conferência (Janus, mediasoup, LiveKit) e não faz falta.
- LL-HLS: `hlsVariant: lowLatency`, 7 segmentos de 2 s, partes de 100 ms, `hlsAllowOrigins: ['*']`.
- WebRTC: `webrtcLocalUDPAddress: :8189`, `udpMaxPayloadSize: 1200` (cabe no MTU 1280 da Tailscale).
  `webrtcAdditionalHosts` e `webrtcICEServers2` ficam vazios no arquivo versionado e são preenchidos por env
  (`MTX_WEBRTCADDITIONALHOSTS`, `MTX_WEBRTCICESERVERS2_*`).
- RTMP, SRT e MoQ desligados. Sem `pathDefaults` e sem `useAbsoluteTimestamp`, de propósito (mediamtx#5355): os
  carimbos que chegam ao navegador são do relógio do MediaMTX.
- `authInternalUsers`: o anônimo publica em qualquer path e só lê paths de câmera (`<uuid>-...`) e
  `videowall-projection-`; o espelho (`videowall-mirror-`) exige o usuário e a senha de
  `VIDEOWALL_MIRROR_READER_USERNAME` e `VIDEOWALL_MIRROR_READER_PASSWORD`; a API é uma entrada anônima restrita a
  loopback e RFC1918, apertada por ambiente em `MEDIAMTX_API_ALLOWED_IPS`.
- Métricas: `metrics: no` até existir credencial de scrape equivalente à do `/metrics` dos serviços, nunca por
  faixa de IP.
- A config escrita pela API vive só na memória: restart do MediaMTX perde os paths, e o próximo `GET /hls` de
  cada câmera os recria.

### ms-cameras: garantir o path, não tocar no vídeo

O serviço não guarda sessão nem processo. O endpoint `GET /api/cameras/:id/hls` lê a preferência de codec,
aplica o teto, resolve a fonte, garante a config do path e devolve as URLs; o passo a passo e os erros estão em
[[Câmeras - Streaming - Fluxos]]. A imagem do serviço não tem `ffmpeg`; o `tini` é o PID 1.

#### Fonte do tier

- **Cadeia de qualidade** (`QUALITY_FALLBACK_CHAIN`): `PRIMARY` tenta só PRIMARY; `SECONDARY` tenta SECONDARY e
  PRIMARY; `TERTIARY` tenta TERTIARY, SECONDARY e PRIMARY. Vence o primeiro perfil `isActive`; nenhum dá 409
  `STREAM_PROFILE_NOT_CONFIGURED`.
- **Credencial**: `withRtspCredentials` põe uma única credencial na URL, codificada por porcentagem, para que
  `#`, `?`, `/` ou `@` na senha não quebrem a URL. Credencial já presente na URL do perfil vence a cadastrada. A
  URL que o MediaMTX não aceitaria como `source` (`isValidStreamSource`) vira 409 `STREAM_SOURCE_URL_INVALID`.
  A credencial fica só na config do path no MediaMTX, e todo texto de erro passa por `redactUserinfo`.
- **Codec servido** (`firstServableCodec`): o primeiro codec da preferência do cliente que a câmera aceita,
  H.264 sempre por último. AV1 exige `STREAM_AV1_ENABLED=true`, a câmera declarar AV1
  (`Camera.supportedVideoCodecs`) e perfil em `/axis-media/`. H.265 é recusado a câmera com analítico embarcado
  ativo (`dai` ou `virtualLoop` em `analyticsCapabilities`); AV1 não. Chamador sem preferência (a projeção do
  videowall) recebe o codec do perfil, nunca AV1.
- **Qualidade servida nomeia o path** (`resolveServedQuality`): Axis devolve o tier pedido (a resolução vai na
  query VAPIX); Hikvision colapsa TERTIARY em SECONDARY (mesmo canal sub); fabricante genérico devolve o tier do
  perfil casado. Tiers oferecidos por fabricante em `helpers/stream-tier-capability.helper.ts`.
- **Axis** (só URL com `/axis-media/`): `videocodec` = codec servido; `videokeyframeinterval =
  max(1, round(fps x 300 / 1000))` (25 fps quando o perfil não declara; `CAMERA_KEYFRAME_INTERVAL_MS` troca o
  orçamento, `CAMERA_KEYFRAME_INTERVAL` fixa quadros); `videozgopmode=fixed`; `h264profile=baseline` em H.264;
  `resolution` do perfil ou da escada `QUALITY_RESOLUTION_LADDER` (SECONDARY 1280x720, TERTIARY 640x360). No AV1
  a URL sai sem `videobitrate` e com o `fps` do perfil, no controle de taxa da própria câmera.
- **Hikvision**: sem parâmetro por request; o tier escolhe o canal (`<cam>01` principal, `<cam>02` sub,
  `helpers/hikvision-channel.helper.ts`), também na URL montada pelo IP quando o perfil não tem URL. Codec e GOP
  vêm do canal no equipamento.
- **Outros fabricantes**: URL do perfil sem mudança; codec e GOP são os da câmera.

#### Config do path

O path recebe `source`, `sourceOnDemand: true`, `sourceOnDemandStartTimeout` (8 s), `sourceOnDemandCloseAfter`
(30 s) e `rtspTransport`. O MediaMTX abre a câmera com o primeiro leitor, segura o POST do WHEP desse leitor
enquanto a fonte abre e fecha a fonte 30 s depois do último leitor.

`MediamtxPathConfigService.ensure(path, desired, acceptedSources)`, a cada `GET /hls`:

1. Lê a config (`GET /v3/config/paths/get/<path>`); 404 vira escrita (`CREATED`).
2. Config igual não é escrita (`UNCHANGED`). Compara só as chaves que o serviço define, com durações por valor
   (`MediamtxDuration`; o MediaMTX devolve `8000ms` como `8s`); `source` igual a uma das `acceptedSources` (a URL
   H.264 de reserva de um path H.265 ou AV1) conta como igual.
3. Config divergente com leitor fica adiada (`DEFERRED`); sem leitor, reescreve (`UPDATED`). No fallback H.264 a
   reescrita mantém o `source` aceito.
4. A única escrita é `POST /v3/config/paths/replace/<path>`, um upsert: duas réplicas que criam o mesmo path
   convergem sem conflito.

Chamadas simultâneas para o mesmo path e o mesmo pedido compartilham uma ida e volta; pedido diferente para o
mesmo path encadeia atrás e faz o próprio ciclo. Falha de leitura ou escrita vira `MediamtxPathConfigException`
com o motivo (`MEDIAMTX_UNREACHABLE`, `MEDIAMTX_API_FORBIDDEN`, `MEDIAMTX_CONFIG_REJECTED` ou
`MEDIAMTX_API_ERROR`), que o controller põe como segundo item de `errors` no 502. Cada desfecho conta em
`ms_cameras_stream_path_config_writes_total{outcome}`. O mesmo serviço garante os paths de projeção do videowall.

#### Teto

`MAX_CONCURRENT_STREAM_SESSIONS` (40) conta **paths de câmera disponíveis no MediaMTX**, para o fleet inteiro e
não por réplica, mais os admitidos desde a última leitura do watcher (guardados de forma síncrona, contra rajada
entre leituras). Espectador do mesmo path nunca conta de novo. Admitido que não abre libera a vaga depois de
`STREAM_SOURCE_START_TIMEOUT_MS` mais duas leituras (18 s). Acima do teto, 429 com detalhe
`STREAM_SESSION_CAP_REACHED`; a recusa acontece antes do resolve, sem ler o banco, quando a câmera não tem path
disponível nem admitido (`refuseWhenFull`), porque a rota é pública.

#### Watcher

Uma leitura de `/v3/paths/list` a cada 5 s alimenta o teto, grava o TTFF, aplica o fallback de codec e publica as
métricas. Não fecha nada: fechar é do MediaMTX. Disponibilidade é `available` (e `ready` em servidor anterior à
1.21), em `helpers/mediamtx-path-availability.helper.ts`.

#### Cliente da control API

`MediamtxClient` é o ponto único de leitura e escrita, com `AbortSignal.timeout(MEDIAMTX_DIAG_TIMEOUT_MS)` (2 s)
porque `fetch` não tem timeout. `getJsonOrStatus` separa "não respondeu" de "respondeu 404"; `listAll` lê todas as
páginas e devolve `null` se qualquer página falhar, nunca lista parcial; `send` escreve e devolve `false` em
falha; `sendOrFailure` devolve também o status e o texto de erro do MediaMTX, com a senha mascarada. Consumido
pela config do path, pelo watcher, pelo diagnóstico, pelo `LivePublisherProbe` (bitrate,
[[Câmeras - Streaming - Banda e bitrate]]) e pelos serviços do videowall.

#### Quem remove config

Só a troca de endereço da câmera (`CameraOriginChangedEvent`) e o soft-delete (`CameraDeletedEvent`), que apagam
todos os paths da câmera pelo prefixo do `cameraId`. Na troca de endereço o player reconecta no lugar e o `GET`
refeito configura o endereço novo; no soft-delete quem assistia cai com erro terminal.

### Codecs

Ninguém transcodifica: o WHEP reempacota o codec da câmera em RTP e o LL-HLS o muxa em fMP4. O custo de cada
câmera é banda, não CPU. O que cada codec é, banda, bits por pixel e suporte por câmera, navegador e GPU estão em
[[Câmeras - Streaming - Codecs]]; aqui fica só o mecanismo.

- **Preferência do cliente**: `?codec=` leva um codec (`h265`) ou uma lista em ordem de preferência
  (`av1,h265`), separada por vírgula (`NEGOTIABLE_CODEC_LIST_SEPARATOR`). H.264 é o piso de toda lista; consulta
  ausente ou ilegível vale `H264` (`parseStreamCodecPreference`).
- **Navegador** (`stream-codec.service.ts`): sonda uma vez por carga do app. H.265 exige que
  `RTCRtpReceiver.getCapabilities('video')` anuncie `video/H265` e que `MediaCapabilities.decodingInfo` para
  WebRTC (`video/H265`) ou MSE (`hvc1.1.6.L93.B0`), em 1280x720, 30 fps e 3 Mbps, diga
  `supported && smooth && powerEfficient`. AV1 exige `video/AV1` anunciado e `supported && smooth` nos dois
  caminhos (WebRTC `video/AV1` e MSE `av01.0.08M.08`, em 1920x1080, 30 fps e 4 Mbps); sem `powerEfficient` é
  decode em software, e só 4 sessões por aba recebem AV1 (`MAX_SOFTWARE_AV1_SESSIONS`).
- **Quem negocia**: só o videowall do VMS pede AV1 (`codecFor`, por tile). O detalhe de câmera, o painel lateral,
  a Detecção e o diálogo do ATSPM negociam H.265 ou H.264. Os popups do Painel de Operações, Prioridade Seletiva,
  Modelo de Tráfego e a aba ACOM de Controladores recebem H.264.
- **Backend**: o resolver escolhe o codec servido (ver "Fonte do tier"); a resposta diz o codec em `codec`.
- **Convergência**: pedido H.265 sem path H.265 disponível e com o H.264 da mesma câmera e tier no ar entra no
  H.264 e a resposta diz `codec: 'H264'` (`joinsOnlineH264`). AV1 nunca entra no H.264, e o H.264 nunca entra num
  path H.265 ou AV1, para não entregar a quem não decodifica.

**Fallback de H.265 ou AV1 para H.264 (só Axis)**: o resolver monta também a URL H.264 de reserva
(`buildAxisFallbackUrl`), passada como `acceptedSources`. O watcher lê `GET /v3/paths/static-sources/get/<path>`
dos paths H.265 e AV1 ainda não disponíveis; só uma recusa RTSP 4xx da câmera, menos 401 e 407, reaponta o path
para a URL H.264. Timeout, DNS e conexão recusada não decidem nada. O nome do path segue `-h265` ou `-av1`, e só a
origem muda; o fallback vive na config do path, então sobrevive a restart do `ms-cameras` e a outra réplica, e se
perde num restart do MediaMTX, de propósito.

Não há reconexão no backend: com leitor presente, o MediaMTX refaz a puxada sozinho.

### Player no navegador

`apps/web-attlas/src/app/core/shared/components/camera-stream-player/`, máquina de estados em
`media-connection.ts` (`MediaConnection`), com os tempos de negociação nesse arquivo e os de ICE e LL-HLS em
`constants/media-connection.constants.ts`. A política de continuidade e qualidade da imagem tem spec própria, listada
na tabela de "Onde está no código".

#### WebRTC (WHEP), o primário

1. `RTCPeerConnection` com `iceServers: []`, sem STUN e sem TURN: a mídia chega ao MediaMTX por candidato host
   (`webrtcAdditionalHosts`). Um transceiver de vídeo `recvonly`, sem áudio.
2. O MediaMTX não aceita Trickle ICE: o player espera a coleta terminar, com teto de 1 s (`ICE_GATHERING_CAP_MS`).
3. POST `application/sdp` para a `url` da resposta (`<base>/<path>/whep`), abortado em 15 s
   (`WHEP_NEGOTIATION_TIMEOUT_MS`), que cobre os 8 s de abertura sob demanda. 404 é "ainda sem fonte": repete com
   recuo de 1 s a 5 s por até 60 s antes de virar falha.
4. 8 s para a mídia chegar (`WHEP_MEDIA_ARRIVAL_TIMEOUT_MS`) e 6 s para o primeiro quadro decodificado
   (`FIRST_FRAME_TIMEOUT_MS`), o caso do Chrome que recebe HEVC sem hardware e mostra preto sem erro.

Perda do peer: ICE `failed` ou `closed`, `disconnected` por 3 s (`ICE_DISCONNECT_GRACE_MS`), faixa `ended` ou
stream `inactive`. Não há `DELETE` da sessão WHEP: o player fecha o peer e o MediaMTX encerra a leitura.

#### LL-HLS, a reserva

hls.js com `lowLatencyMode: true`, `maxBufferLength: 60`, `backBufferLength` de 14 s
(`HLS_BACK_BUFFER_LENGTH_SECONDS`, a janela da playlist) e `maxLiveSyncPlaybackRate: 1.1`, sem `liveSyncDuration*`
(mira o `PART-HOLD-BACK` da playlist). HLS nativo só sem MSE (Safari). Antes de anexar o HLS, o player zera o
`srcObject` do `<video>`. Sem scrubber nem DVR: o player fica na borda ao vivo. Falha no LL-HLS é terminal: erro
fatal do hls.js ou 12 s sem quadro (`HLS_FIRST_FRAME_TIMEOUT_MS`) mostram o card de erro com botão de reconectar.
O selo `HLS` identifica a célula nesse caminho.

#### Recuperação e troca

- **Já mostrou imagem e perdeu o peer**: o `FrameHold` (`frame-hold.ts`) segura o último quadro, o player
  renegocia o WHEP no lugar com o mesmo recuo e orçamento de 60 s (repetindo também o 400 "has timed out" e
  falhas de transporte) e avisa o host uma vez por episódio (`sourceLost`); o host faz um único `GET /hls`, que
  recria a config depois de um restart do MediaMTX ou de troca de endereço. O peer novo só é promovido quando
  decodifica um quadro; o LL-HLS só entra quando o orçamento acaba.
- **Nunca mostrou imagem**: cai para o LL-HLS uma vez.
- **Memória de falha** (`utils/whep-failure-tracker.util.ts`): falha WHEP fica marcada por 60 s por origem,
  câmera e codec, sem o tier (`whepSourceKey`); a próxima abertura vai direto ao LL-HLS. Peer promovido limpa a
  marca. URL fora do formato de câmera (o espelho do videowall) usa a URL inteira como chave.
- **Volta ao WebRTC**: parado no LL-HLS, tenta em segundo plano em 30 s, dobrando até 300 s, e só desmonta o HLS
  quando a perna nova mostra quadro. Tile pausado não é acordado.
- **Troca de tier**: make-before-break, o peer novo negocia numa sonda fora da tela e o `FrameHold` congela o
  último quadro. No LL-HLS a troca segue no LL-HLS.
- **Compartilhamento**: `LiveMediaRegistry` faz uma negociação e uma decodificação por chave e espelha em N
  `<video>`; a conexão sobrevive 8 s sem dono.
- **Codec que não decodifica**: só o videowall do VMS troca o codec. Tile H.265 sem quadro rebaixa o app inteiro
  para H.264, porque o decodificador é da máquina; tile AV1 sem quadro desliga o AV1 para o app e mantém a decisão
  H.265 ou H.264. Nos dois casos o videowall reabre os tiles afetados em H.264. As outras telas vão ao LL-HLS ou ao
  erro.
- **Debandada de rebaixamento**: a escada adaptativa só age com perda de pacote no WebRTC ou relógio parado no
  LL-HLS; com 3 rebaixamentos em 8 s na tela, os seguintes esperam (`ADAPTIVE_STAMPEDE_THRESHOLD`,
  `ADAPTIVE_STAMPEDE_WINDOW_MS` em `core/shared/constants/stream-quality-ladder.constants.ts`), porque o problema
  é CPU ou GPU local.
- **Buffer de jitter**: o player não ajusta `playoutDelayHint` nem `jitterBufferTarget`; cada navegador usa o
  buffer adaptativo padrão.

### Rotas de vídeo na origem do SPA

O `ms-cameras` monta `url` e `hlsUrl` concatenando a base da env com o path: `<MEDIAMTX_WEBRTC_BASE_URL>/<path>/whep`
e `<MEDIAMTX_HLS_BASE_URL>/<path>/index.m3u8` (`LiveStreamPathService.urls`). Qualquer base serve, relativa ou
absoluta; o que importa é existir, na frente do SPA, uma rota com o mesmo prefixo que leve à 8889 e à 8888. A mesma
base WebRTC monta a URL WHIP em que o console publica a tela no espelho do videowall
(`<base>/videowall-mirror-<uuid>/whip`).

| Ambiente | Base no `ms-cameras` | Quem atende a rota |
| --- | --- | --- |
| Padrão do repositório (`.env.example`) | `/live` e `/live-hls`, relativas | proxy na frente do SPA |
| `nx serve` do `web-attlas` | `/live` e `/live-hls` | `apps/web-attlas/proxy.conf.mjs` |
| Container `web-attlas` local | `/live` e `/live-hls` | `docker/nginx-web-local.conf`, montado pelo `docker-compose.override.yml` |
| Servidor (dev.v2 e cliente) | a que o servidor escolher | nginx do host, configurado à mão e fora do repositório |
| dev.v2 hoje | `https://dev.v2.attlas.atmansystems.com/whep` e `.../mtx-hls`, absolutas | nginx do host: `/whep/` para a 8889 e `/mtx-hls/` para a 8888 |

O espelho do videowall é lido pelo painel em `/mirror-playback/<path>/whep`, um caminho fixo no front: o proxy
injeta o `Authorization` do usuário leitor do espelho, e o navegador nunca recebe essa credencial. Existe em
`proxy.conf.mjs`, em `docker/nginx-web-local.conf` e no nginx do host do dev.v2.

A mídia WebRTC não passa por proxy: vai por UDP 8189 direto ao candidato anunciado. O Kong só vê a chamada REST.
O roteiro para um servidor novo está em
[[Câmeras - Streaming - Explicação - Como liberar o WebRTC num servidor novo]].

> [!warning] A imagem de produção do front não tem rota de vídeo
> `apps/web-attlas/nginx.conf` só tem `/`, `/index.html` e os estáticos. Num servidor, a rota de vídeo precisa
> estar no nginx do host; base relativa sem essa rota cai no fallback do SPA e o WHEP nunca negocia.

## Contratos

### Rotas

| Rota | Quem chama | O que faz |
| --- | --- | --- |
| `GET /api/cameras/:id/hls?quality=&codec=` | player | garante o path e devolve `{ url, hlsUrl, status, quality, codec }`; `@Public()`, rota Kong `ms-cameras-allowlist-hls-session` sem plugin `jwt` |
| `GET /api/cameras/:id/stream-diagnostics?quality=&codec=` | operador, runbook | visão do servidor de um stream; autenticada e escopada pelo `System-Id` |
| WebSocket `cameras-stream`, `/api/cameras/stream/realtime` | nenhum cliente do `web-attlas` | emite `status.changed` na mudança de conectividade do device |
| `POST <base WebRTC>/<path>/whep` | player | negociação WHEP no MediaMTX (8889) |
| `GET <base HLS>/<path>/index.m3u8` | player | playlist LL-HLS no MediaMTX (8888) |
| `POST <base WebRTC>/videowall-mirror-<uuid>/whip` | console do videowall | publica a tela no espelho |
| `POST /mirror-playback/<path>/whep` | painel do videowall | lê o espelho com a credencial injetada pelo proxy |

### Control API do MediaMTX

| Rota | Quem usa |
| --- | --- |
| `GET /v3/config/paths/get/<path>` | config do path, antes de escrever; diagnóstico |
| `POST /v3/config/paths/replace/<path>` | config do path, a única escrita de câmera |
| `GET /v3/config/paths/list` e `DELETE /v3/config/paths/delete/<path>` | remoção dos paths da câmera |
| `GET /v3/paths/get/<path>` | config do path (tem leitor?), diagnóstico e espelho do videowall |
| `GET /v3/paths/list` | watcher e bitrate medido |
| `GET /v3/paths/static-sources/get/<path>` | watcher, fallback de codec (`lastError`); diagnóstico |
| `GET /v3/webrtc/sessions/list` | TTFF e diagnóstico |
| `GET /v3/hls/sessions/list` | TTFF |
| `POST /v3/config/paths/add/<path>` | espelho do videowall |

### Nomes de path

| Nome | Quem cria | Quem lê |
| --- | --- | --- |
| `<cameraId>-<tier>` | `ms-cameras`, H.264 | anônimo |
| `<cameraId>-<tier>-h265` e `<cameraId>-<tier>-av1` | `ms-cameras`, H.265 e AV1 | anônimo |
| `videowall-projection-...` | videowall, projeção | anônimo |
| `videowall-mirror-<uuid>` | videowall, espelho do console | só o usuário leitor do espelho |

O tier vai em minúsculas (`primary`, `secondary`, `tertiary`). `parseStreamPathName` só reconhece esse formato
exato, com UUID válido.

### Eventos

Nenhum tópico Kafka. A remoção de paths reage a dois eventos internos do CQRS do `ms-cameras`:
`CameraOriginChangedEvent` e `CameraDeletedEvent`.

### Tabelas do banco

| Tabela ou coluna | O que o streaming lê ou grava |
| --- | --- |
| `CameraStreamProfile` | perfil por tier: `streamUrl`, `codec`, `resolutionWidth`, `resolutionHeight`, `frameRate`, `isActive` |
| `CameraCredential` | usuário e senha RTSP da câmera |
| `Camera.supportedVideoCodecs` | codecs que o encoder declara (`AV1`, `H265`, `H264`); vazio é câmera nunca sondada |
| `Camera.analyticsCapabilities` | `dai` e `virtualLoop` decidem a recusa do H.265 |
| `CameraTtffSample` | uma linha por abertura de path, retenção de 7 dias |

## Por que é assim

- **WebRTC primário, LL-HLS reserva.** O WebRTC dá sub-segundo (cerca de 500 ms na referência externa para RTSP,
  MediaMTX e WHEP), que operação ao vivo e PTZ exigem; o LL-HLS roda sobre TCP e com buffer, então aguenta a perda
  que congela o WebRTC, ao custo de segundos.
- **H.264 base, H.265 e AV1 oportunísticos, detectar e nunca assumir.** H.265 depende de hardware em todo
  navegador, inclusive no WebRTC, e HEVC em WASM não sustenta mosaico em tempo real. AV1 existe no WebRTC do Chrome
  e do Firefox, e a câmera ARTPEC-9 o codifica de forma nativa.
- **AV1 sem teto de banda.** Com `videobitratemode=mbr` na URL a Axis leva cerca de 12 s para responder o RTSP,
  acima dos 8 s de abertura do MediaMTX; por isso o AV1 sai no controle de taxa da câmera e fica desligado por
  padrão.
- **ABR por substream nativo da câmera**, nunca transcode no servidor: transcode por stream mata a escala.
- **Baseline nas Axis**: High usa B-frames, e a reordenação no decode custa latência.
- **GOP curto por orçamento de tempo**: o MediaMTX só alimenta um leitor WHEP novo no próximo keyframe, então o
  intervalo de keyframe é a latência de entrada e de recuperação de cada tile.
- **TCP na puxada**: as câmeras vivem na VPN e na tailnet (cerca de 146 ms de RTT); em LAN limpa
  `RTSP_TRANSPORT=udp` pode cortar latência.
- **Sob demanda no MediaMTX**, sem relay próprio: relay com lease, reaper, varredura de `/proc` e adoção de
  publicador vazava puxadas órfãs (câmera puxada sem ninguém assistindo) e não escalava.
- **Sem STUN**: esperar o candidato do STUN público travava a coleta de ICE em todo tile e derrubava o videowall
  quando muitos abriam juntos.
- **Base de navegador relativa**: um endereço absoluto é sempre o de uma máquina; com `localhost`, um front servido
  de outro computador pediria o vídeo a si mesmo.

## Armadilhas conhecidas

- **`online` do MediaMTX mente em path sob demanda**: sem leitor responde `online: true` com `onlineTime` no ano 1.
  Use `available`.
- **Path listado não é path puxando.** Path disponível com `readers: []` além de 30 s é config errada no MediaMTX,
  não processo órfão.
- **Mudar a config de um path derruba os leitores dele.** Daí o "igual não escreve" e o `DEFERRED`; `DEFERRED`
  acumulando é drift represado (credencial rotacionada num path nunca ocioso), e só limpa quando o path esvazia.
  Nunca force derrubando leitores. Mudar campo global do MediaMTX em runtime derruba todas as sessões.
- **Restart do MediaMTX apaga os paths** e a memória do fallback de codec; o player recupera sozinho. O deploy
  (`.github/workflows/deploy.yml`) recria o MediaMTX e reinicia o `ms-cameras` só quando muda o hash de
  `docker/mediamtx.yml` mais a tag da imagem.
- **O que multiplica puxadas na câmera** é tier, codec, linha de tenant e projeção do videowall. No dev.v2 cada
  câmera física é replicada por sistema-tenant com UUID próprio: seis tenants assistindo são até seis puxadas da
  mesma câmera.
- **Câmera com analítico embarcado não sustenta dois encodes H.264 e H.265**: com duas ingestões, a 10.1.1.80
  mostrou fome de quadro (parte do HLS de 134 ms para 7,1 s). Por isso o H.265 é recusado a ela.
- **WebRTC trava e volta de uma vez** quando há perda no UDP de saída: sem retransmissão útil nem buffer, o quadro
  de referência corrompido congela a imagem até o próximo keyframe da câmera. Confirma-se com
  `ingest.bytesReceived` liso no diagnóstico enquanto `packetsLost`, `freezeCount` e `pliCount` sobem no
  `getStats()`. Amplificadores: host de dev sobrecarregado e mídia só pela rota UDP da Tailscale.
- **Portas do dev.v2 para o WebRTC**: o Security Group libera de entrada a **UDP 8189** (mídia) e o 443, por onde
  passa a sinalização (`/whep/` e `/mtx-hls/` no nginx do host). 8888 e 8889 ficam fechadas para fora. O MediaMTX
  anuncia só o IP público (`MTX_WEBRTCADDITIONALHOSTS=3.15.199.101`, no `docker-compose.override.yml` do host),
  nunca o da Tailscale. As portas do coturn (3478, 5349 e o relay 49160-49200/udp) estão fechadas e não são usadas:
  o player conecta sem ICE server. Mídia pública também quebra quando a Tailscale remove o salto `DOCKER` da cadeia
  `FORWARD` (correção no host, ver [[Câmeras - Streaming - Runbook]]).
- **Saturação de egress do host degrada a saúde de todas as câmeras juntas**: vídeo e pings de healthcheck dividem
  a mesma interface, então um pico de visualização concorrente põe toda a rede em `DEGRADED` ao mesmo tempo
  (latência de ping de cerca de 145 ms para 800 a 1300 ms). Na EC2 de dev (`t3a`, família burstable) o padrão
  degrada, cai e volta sozinho em minutos.
- **Menos de 7 segmentos de LL-HLS quebra o muxer**, e todo pedido HLS responde 500.
- **`jitterBufferTarget = 0` faz o decoder descartar quadros** em todas as câmeras; fica o padrão.
- **URL Axis com `/onvif-media/`** não recebe os parâmetros VAPIX: sem baseline, com o GOP da câmera e sem AV1.
  Câmera genérica com GOP longo trava mais no WebRTC; Zipstream com GOP ou FPS dinâmico reintroduz o problema.
- **Resolução fora da lista da câmera dá 502**: a Q6135-LE não tem 854x480 e a P1475-LE não tem 720x480 (a lista
  16:9 dela termina em 640x360). A escada pede só resoluções que existem.
- **Câmera genérica que manda H.265 no path sem sufixo** entrega HEVC a quem não pediu: Chrome sem hardware mostra
  preto e não há fallback no backend.
- **`ms-cameras` responde 502 por 4 a 5 minutos depois de um deploy** (janela de boot): não reiniciar.
- **Matar só o node do `nx serve`** deixa a cadeia `npm exec nx serve` segurando o lock do NX, e o serviço novo
  fica esperando "in another nx process": mate a cadeia inteira.
- **`/health/ready` do `ms-cameras` não checa dependência nenhuma** (controller padrão do `core-common`, sem
  indicador de Postgres, Kafka, Redis ou MediaMTX).

## Pendências

O que falta e as divergências de documentação do repositório estão em [[Câmeras - Streaming - Pendências]].

## Glossário

| Termo | O que é |
| --- | --- |
| Path | Entrada do MediaMTX com um nome e uma fonte; cada câmera, tier e codec é um path |
| Tier | Qualidade pedida: `PRIMARY`, `SECONDARY` ou `TERTIARY` |
| Sob demanda | O MediaMTX só abre a câmera quando há leitor e fecha quando não há |
| WHEP | Protocolo HTTP para o navegador receber WebRTC: um POST com a oferta SDP, a resposta com a SDP do servidor |
| WHIP | O mesmo protocolo no sentido de publicar |
| LL-HLS | HLS de baixa latência, em partes de 100 ms sobre HTTP |
| SFU | Servidor que repassa mídia a vários receptores sem decodificar |
| Candidato host | Endereço IP e porta que o servidor anuncia para a mídia WebRTC chegar direto |
| TTFF | Tempo até o primeiro quadro de uma abertura de path |
| Keyframe | Quadro completo, que decodifica sozinho; é onde um espectador novo começa |
