---
tags:
  - doc
  - ms-cameras
  - cameras
  - streaming
aliases:
  - "01-Arquitetura-streaming"
atualizado: 2026-09-16
---

# Streaming - Arquitetura

Volta para [[Streaming]].

> [!info] Codec por request, não mais fixo pelo perfil (INT-008)
> Esta nota descreve o pipeline em termos de "o codec do perfil"; desde INT-008 (07/2026) o codec é
> **negociado por request** pelo player (H265 só com decode por hardware, senão H264) e o backend
> mantém sessões H264/H265 coexistentes para a mesma câmera. Detalhe completo, com os fixes de 19/08
> (jitter buffer, shaping da telemetria ONVIF) em [[Streaming - Codecs e fallbacks]] e
> [[Pesquisa - codec, protocolo e latência]].

## O problema que o pipeline resolve

Câmeras IP falam RTSP, e RTSP não toca direto no navegador. Além disso, abrir uma conexão
RTSP por operador estouraria a câmera. O Attlas resolve as duas coisas com um único ponto
intermediário: o **mediamtx**. O `ms-cameras` abre **uma** conexão RTSP por câmera (via
ffmpeg), empurra esse vídeo para o mediamtx, e o mediamtx redistribui para quantos
operadores quiserem assistir, em formatos que o navegador entende.

## Fluxo ponta a ponta

Câmera IP (RTSP) → **ffmpeg** (modo copy, sem transcodificar) → **mediamtx** (uma cópia do vídeo, em memória) → dois caminhos de saída para o navegador: **WebRTC/WHEP** (primário, baixa latência, UDP) e **HLS/LL-HLS** (fallback, HTTP sobre TCP). Diagrama no canvas: [[04 - MOD-004 hls-streaming-pipeline.excalidraw]].

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
  do RTSP sem travar a cada pacote reordenado. Essas duas últimas flags saíram do pipeline em
  algum ponto e foram restauradas em `72815a9db5` (19/08) - ver [[Streaming - Codecs e fallbacks]].
- **Não usa `-discardcorrupt`**, de propósito: descartar pacote corrompido quebra o bitstream
  H.264 e congela o decoder até o próximo keyframe. Deixar o decoder esconder o erro recupera
  mais suave.
- Reconexão com backoff exponencial (até 10 tentativas) se o ffmpeg cair e ainda houver
  espectadores. Se o codec primário (ex. H.265) falhar ao subir, troca para H.264 de fallback.
- Como roda em modo copy, o GOP (intervalo entre keyframes) é o que a câmera mandar. Para
  câmeras Axis o resolver força `videokeyframeinterval=15` via VAPIX, mas câmeras genéricas
  podem ter GOP de vários segundos. Isso é central no [[Streaming - Diagnóstico de travamento no WebRTC|diagnóstico do travamento]].

### 2. mediamtx (servidor de mídia)

`docker/mediamtx.yml`. Recebe o RTSP do ffmpeg numa "path" por câmera e qualidade
(ex. `cam123-primary`), e expõe a mesma origem em WebRTC e HLS ao mesmo tempo. Uma origem,
muitos espectadores. Desde a telemetria always-on (PROJ-006, 03/08) o mediamtx também mantém
uma path por device físico com `sourceOnDemand: false` só para medir bitrate 24/7, mesmo sem
espectador - ver [[Bitrate medido 24-7 - telemetria always-on]].

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
  expulsam em loop). Aceita `?codec=` desde INT-008 - ver [[Streaming - Codecs e fallbacks]].
- `stream-session-registry.service.ts`: registro em memória de `cameraId:quality:codec -> estado`,
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
ver [[Streaming - Diagnóstico de travamento no WebRTC]].

## Estado em 16/09/2026: o que mudou desde 24/08, e dois achados

Levantado por leitura de código na branch `shared/chore/NO-CARD-sprint33-validation`. Nada aqui foi
medido em máquina rodando: latência, CPU por relay e comportamento do player na queda de H265
continuam sendo coisa de tela, não de leitura.

### A sessão passou a ser segurada por conjunto de leases, não por contador

A unidade de vida é a tripla `(cameraId, quality, codec)` — `streamVariantKey` em
`streaming/helpers/stream-codec.helper.ts:61`; o path no mediamtx é `<camera>-<quality>` para H264 e
`<camera>-<quality>-h265` para H265. Duas variantes da mesma câmera são duas sessões, dois ffmpeg,
dois ingests no device.

Quem segura é um `Set` de leases (`streaming/services/stream-session-registry.service.ts:19`), não um
número. Cada viewer recebe um `leaseId` no `GET /api/cameras/:id/hls` e devolve o mesmo no `DELETE`.
Sendo conjunto, abrir duas vezes com o mesmo id segura uma lease só e liberar duas vezes é no-op —
as duas falhas que o contador produzia (tile preto com gente assistindo, viewer fantasma prendendo a
relay) deixam de existir. Cliente sem `leaseId` válido recebe lease anônima `anon:`
(`helpers/stream-lease-id.helper.ts:11`), e `DELETE` sem id derruba uma anônima qualquer, nunca uma
identificada.

Saindo a última lease, a sessão não morre na hora: arma-se `HLS_SESSION_GRACE_MS` (10s) e só no fim
dele o ffmpeg morre. Lease nova dentro da janela cancela o timer. É o que cobre refresh de aba,
troca de tile e renegociação de codec sem reabrir o ingest na câmera.

### O reaper é a rede contra o `DELETE` que nunca chega

Aba fechada, queda de rede e crash de browser não mandam `DELETE` — foi o incidente da relay órfã no
EC2. O `stream-session-reaper.service.ts` reconcilia de 5 em 5s contra o mediamtx, e as regras estão
todas no arquivo: a fonte de verdade é o mediamtx e não a memória; lê `/v3/paths/list` **e**
`/v3/webrtcsessions/list` (sessão WHEP conta como leitor antes de aparecer em `readers`, que só
acontece depois do ICE fechar); se qualquer uma das listas falhar o tick inteiro aborta sem encerrar
nada, porque ausência de informação não é ausência de espectador; path que sumiu conta como 0
readers; e só encerra sessão `ACTIVE`, com mais de 15s de idade e 0 readers contínuos por 60s.

O invariante que segura o desenho: **60s do reaper > 10s do grace**. Invertido, o sintoma é tile
preto em reconexão normal.

> [!success] Provado na tela em 16/09: a sessão compartilhada aguenta o espectador que sai
> Mesma câmera (`ATMN - EMBEDDED 080`) aberta em duas abas: **um** path no mediamtx, **um** processo
> `ffmpeg`, **dois** leitores WHEP. Fechada a primeira aba, o path continua `ready`, o relay continua
> um e o vídeo da segunda segue andando. O leitor que saiu só some da lista do mediamtx cerca de 20 s
> depois - é a renegociação do media server, não a lease. Sessão em aba nova exige login próprio: a
> sessão do Attlas não atravessa aba.

> [!bug] Corrigido em 16/09: relay que morre dentro do grace deixava a sessão ACTIVE com o processo morto
> O handler de `exit`/`error` do `ffmpeg-session.service.ts` só reconectava **se ainda houvesse
> lease**. Com o conjunto vazio (janela de grace correndo), nada acontecia: `process` virava `null`,
> o status continuava `ACTIVE` e a entrada seguia no registry. O `GET` seguinte anexava nela,
> cancelava o grace e recebia a URL WHEP **sem respawn** - tile preto até o reaper agir 60 s depois.
> Agora o fim do relay sem espectador **encerra a sessão**, e o próximo viewer abre uma nova.
>
> Na mesma superfície, duas linhas de endurecimento: `registry.create` desarma o `graceTimer` da
> entrada que substitui (o callback do grace resolve a sessão **pela chave**, então derrubaria a
> sessão nova que acabou de nascer no mesmo lugar), e o callback do grace zera `state.graceTimer`,
> senão um `release` seguinte nunca agenda o próprio. Commit `8a7a13568c`.

### O relay não transcodifica — exceto MJPEG

O caminho normal é `-c copy` (`services/ffmpeg-session.service.ts:168`): lê RTSP da câmera e
republica RTSP no mediamtx sem decodificar. H265 leva só `-tag:v hvc1`, exigência de Safari/iOS.
Então **a relay não paga encode**; o que cresce com espectador é banda de saída, e nem isso enquanto
os espectadores dividem a mesma variante, porque o ingest da câmera é um só.

Duas exceções: **MJPEG**, que não é muxável em MPEG-TS e vai para `libx264 -preset ultrafast -tune
zerolatency` (essa sim queima CPU por câmera); e **H265 e H264 vivos ao mesmo tempo**, que são dois
paths, dois processos e dois ingests.

Sutileza que confunde na leitura: a sessão guarda dois codecs. `variantCodec` é a identidade do path
e é imutável; `codec` é o que o ffmpeg relaya de fato e é mutável. Se a relay H265 falha de cara e há
URL de fallback, o `codec` degrada para H264 mas o path continua sendo o `-h265` — de propósito, para
não mover o viewer de path no meio.

> [!warning] Estado em 16/09: o `/health/ready` do ms-cameras não checa dependência nenhuma
> O serviço usa o controller do `core-common` sem estender: `live` roda `check([])` e `ready` roda
> uma checagem só, heap abaixo de 250MB. O próprio comentário do controller diz que serviço com
> Prisma/Kafka/Redis deve estender, e o `CLAUDE.md` do repo diz que serviço com consumer não pode se
> contentar com probe de broker. O `ms-cameras` tem Postgres, Kafka, Redis e mediamtx e não estendeu
> — e falha de Kafka no boot é capturada de propósito, seguindo REST-only (`main.ts:51-61`). Somadas,
> as duas coisas deixam o pod verde com backlog crescendo. É dívida do serviço, não de uma PR.

> [!warning] Estado em 16/09: o `HlsFilesController` serve um diretório que ninguém escreve
> `streaming/hls-files.controller.ts:20` lê `HLS_OUTPUT_DIR` (padrão `/tmp/hls`) e serve playlist e
> segmentos. Nenhum código do serviço escreve nesse diretório: o ffmpeg publica RTSP no mediamtx, e o
> `hlsUrl` que o front consome vem de `buildHlsFallbackUrl`, apontando para `MEDIAMTX_HLS_BASE_URL`.
> Quem apontar um player para a rota do controller recebe `HLS_PLAYLIST_NOT_READY` para sempre. As
> envs `HLS_SEGMENT_DURATION`, `HLS_INIT_SEGMENT_DURATION` e `HLS_LIST_SIZE` também não são lidas por
> código nenhum. Sobrou da fase anterior do pipeline.

### Armadilhas que custam tempo

- **Env numérica em 0 ou negativa cai no default sem avisar.** `parseEnvInt`
  (`streaming/helpers/env.helper.ts:14`) só aceita finito e maior que zero, então
  `HLS_SESSION_GRACE_MS=0` continua valendo 10s. Quem quer zero de verdade precisa de
  `parseEnvNonNegativeInt`, que só os buffers de ffmpeg usam.
- **O cron do reaper é lido em tempo de decoração**, não por `ConfigService`. Mudar
  `STREAM_REAPER_INTERVAL_CRON` exige restart.
- **O teto de sessões é por réplica.** `MAX_CONCURRENT_STREAM_SESSIONS` (40) conta contra memória do
  processo, então com N réplicas o teto real é 40 x N. Só sessão nova conta; anexar a uma viva nunca
  conta, então o teto não limita quantas pessoas assistem à mesma câmera.
- **Todo o estado de sessão é memória de um processo.** Restart limpa tudo e mata os ffmpeg filhos
  pelo `onApplicationShutdown`. Duas réplicas não compartilham lease — é o mesmo buraco de escala
  horizontal já anotado para o WebSocket.
- **Duas coisas publicando no mesmo path do mediamtx entram em laço** ("closing existing publisher").
  Quando aparecer, procure quem chamou `registry.create` por cima de sessão viva; não reinicie o
  mediamtx.
- **Falha de start tem de chamar `stopSession`, não `registry.delete`** — deletar só do registry
  deixa o ffmpeg publicando, fora do registry e fora do alcance do reaper: órfã permanente.
- **`TelemetryPathRegistry` está permanentemente vazio** desde o redesenho do PROJ-006 em 27/08. Está
  inerte, não quebrado; não gaste tempo procurando por que não popula.

### Achado aberto: ffmpeg que morre dentro da janela de grace

Em `ffmpeg-session.service.ts:200` o handler de `exit` só agenda reconexão se ainda houver lease. Com
o conjunto vazio (dentro dos 10s de grace) nada acontece: o status não vira `STOPPED`/`ERROR` e a
entrada não sai do registry, ficando `ACTIVE` com `process = null`. O `GET` seguinte, ainda dentro do
grace, lê `ACTIVE`, anexa, concede a lease (cancelando o grace) e devolve a URL WHEP **sem respawn**.
Resultado: leases cheias, grace cancelado e nenhum ffmpeg publicando — tile preto até o reaper agir,
60s depois. Não dá para estimar frequência por leitura; o caminho de código existe.

Na mesma superfície, duas linhas de endurecimento: `registry.create` sobrescreve a entrada sem limpar
o `graceTimer` da anterior, e o callback do grace resolve a sessão pela chave no instante em que
dispara, não pelo estado que o armou — hoje fecha só porque toda transição para status não-vivo passa
por `registry.delete`, ou seja, a corretude depende de invariante mantida em outro arquivo.
