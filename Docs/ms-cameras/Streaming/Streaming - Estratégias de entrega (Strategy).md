---
tags: [doc, cameras, ms-cameras, streaming]
---

# Streaming - Estratégias de entrega (Strategy)

Volta para [[00 - Streaming]] · [[ms-cameras - visão geral]]. Irmãs: [[01-Arquitetura-streaming]], [[02-HLS]], [[03-WebRTC-WHEP]], [[Streaming - Codecs e fallbacks]], [[Streaming - Fluxos e SLA]].

Dois padrões de projeto que mantêm o streaming desacoplado do ambiente e da concorrência:
o **Strategy** de entrega HLS (headers de cache/CDN sem ramificar o controller) e a
**estratégia de concorrência de sessão** (uma sessão viva reaproveitada por N viewers, sem
guerra de publishers). Fonte: `apps/ms-cameras/src/streaming/strategies/`, `.../pipes/`,
`.../streaming.controller.ts`, `.../services/stream-session-registry.service.ts`.

## Strategy de entrega HLS

`strategies/hls-delivery.strategy.ts` define a interface `IHlsDeliveryStrategy` com dois
métodos: `applyPlaylistHeaders(res)` e `applySegmentHeaders(res)`. Duas implementações:

- `direct-hls-delivery.strategy.ts` (`DirectHlsDelivery`) — sem CDN, default local/dev.
- `cloudflare-hls-delivery.strategy.ts` (`CloudflareHlsDelivery`) — adiciona `CDN-Cache-Control`
  para produção atrás do Cloudflare.

**Para quê**: os headers de cache mudam por ambiente. O `hls-files.controller.ts` consome a
estratégia por DI (`@Inject(HLS_DELIVERY_STRATEGY)`) e nunca precisa saber em qual ambiente
está — trocar de política é trocar a implementação injetada, não editar o controller. A escolha
é feita uma vez no `streaming.module.ts` via `useFactory`, lendo `HLS_DELIVERY_PROVIDER`:

```ts
// streaming.module.ts
process.env['HLS_DELIVERY_PROVIDER'] === 'cloudflare'
  ? new CloudflareHlsDelivery()
  : new DirectHlsDelivery()
```

Headers aplicados por implementação:

| | Playlist (`.m3u8`) | Segmento (`.ts`) |
| --- | --- | --- |
| `DirectHlsDelivery` | `Cache-Control: no-cache` | `Cache-Control: public, max-age=30, immutable` |
| `CloudflareHlsDelivery` | `Cache-Control: public, max-age=0, s-maxage=2, stale-while-revalidate=2` + `CDN-Cache-Control: max-age=2` | `Cache-Control: public, max-age=30, s-maxage=30, immutable` + `CDN-Cache-Control: max-age=30, immutable` |

A playlist é sempre curta (janela ao vivo em constante mudança → cache curto/zero); o segmento
é imutável (nunca muda depois de escrito → cache longo). O `s-maxage`/`CDN-Cache-Control`
deixam o Cloudflare servir da borda sem estourar a latência ao vivo.

> `hls-files.controller.ts` serve os arquivos HLS **do disco** (`HLS_OUTPUT_DIR`, default
> `/tmp/hls`), na rota `cameras/:id/hls/:quality/(index.m3u8|seg#####.ts)`, com `ETag` +
> `Last-Modified` + `304`. Valida a qualidade e o padrão do segmento (`^seg\d{5}\.ts$`) e nega
> path traversal. É o caminho HLS servido pelo próprio `ms-cameras`; a `hlsUrl` de fallback
> devolvida ao player aponta para o HLS do mediamtx (ver [[02-HLS]]).

## Pipe de validação da qualidade

`pipes/parse-stream-type.pipe.ts` (`ParseStreamTypePipe`) converte o query param `quality` em
`StreamType`:

- Ausente → default `PRIMARY`.
- Uppercase + valida contra o enum `StreamType`; inválido → `InvalidInputException` com
  `errorCode` `INVALID_INPUT`, `field: 'quality'`.

Usado via `@Query('quality', ParseStreamTypePipe)` tanto no `streaming.controller.ts` quanto no
`stream-diagnostics.controller.ts` — um único ponto de parsing para os dois endpoints não
divergirem.

## Estratégia de concorrência de sessão

O objetivo é: **uma câmera/qualidade = um processo ffmpeg = uma path no mediamtx**, servida
para N operadores. Dois publishers na mesma path se expulsam em loop ("closing existing
publisher" — a "publisher war"). Três mecanismos garantem isso.

### 1. Reuso de sessão viva

`streaming.controller.ts` → `startStream()`. Se já existe sessão em estado **vivo** (`ACTIVE`,
`STARTING` ou `RECONNECTING`, via `isLiveStatus`), o request **anexa** a ela (`attachToExisting`)
em vez de subir ffmpeg novo:

- `STARTING` → incrementa viewers e aguarda `ensureRunning()` ficar pronto.
- `ACTIVE`/`RECONNECTING` → incrementa viewers e responde na hora; o player acompanha a
  recuperação pelos eventos do gateway (`stream.reconnecting` → `stream.started`).

### 2. Mapa `inFlight` (anti-corrida na criação)

Quando não há sessão viva, `startStream` usa um `Map<flightKey, Promise<StreamType>>`
(`flightKey = cameraId:quality`): só **um** request cria a sessão (`beginSession`); os
concorrentes fazem *piggyback* na mesma Promise e, quando ela resolve, só chamam
`incrementViewers`. Sem isso, N requests simultâneos subiriam N ffmpegs na mesma path.

`beginSession` ainda re-checa o registry **pela qualidade resolvida** depois do resolver: um
`SECONDARY` que caiu para `PRIMARY` pode correr com um `PRIMARY` direto; se a path resolvida já
tem dono, ele reaproveita em vez de sobrescrever o registry e orfanar o ffmpeg em execução
(outra origem de publisher war).

### 3. Ref-count de viewers + grace period

`stream-session-registry.service.ts` guarda `cameraId:quality -> IHlsSessionState` em memória,
com `viewerCount`:

- `incrementViewers` — soma 1 e **cancela** qualquer `graceTimer` pendente (chegou viewer, não
  derruba).
- `decrementViewers` — subtrai 1; ao chegar a 0, agenda o `graceTimer` (`HLS_SESSION_GRACE_MS`,
  default 60_000) e só depois dele o `stopSession` mata o ffmpeg. Evita derrubar/subir a
  sessão a cada refresh de página ou troca rápida de câmera.

O `stopSession` mata o processo com `SIGTERM` e `SIGKILL` de fallback após 5s
(`killWithSigkillFallback`), emite `stream.stopped` e remove do registry. Fluxos completos e
eventos em [[Streaming - Fluxos e SLA]].

## Cliente mediamtx (best-effort)

`services/mediamtx.client.ts` (`MediamtxClient`) é o ponto único de leitura da API de controle
do mediamtx (`MEDIAMTX_API_URL`) para diagnóstico e telemetria futura (PROJ-006):

- `getJson<T>(path)` com `AbortSignal.timeout(MEDIAMTX_DIAG_TIMEOUT_MS)` (default 2000ms).
- Retorna `null` em **qualquer** falha (timeout, não-2xx, exceção) → um chamador nunca trava
  nem falha o próprio request quando o mediamtx está lento/indisponível. `fetch` não tem
  timeout default (B13), então o `AbortSignal` é a única proteção contra socket travado.

Consumido pelo `stream-diagnostics.service.ts`. A poll de readiness do ffmpeg
(`waitForStreamReady`) usa fetch próprio com deadline separado — ver [[Streaming - Fluxos e SLA]].

Visual: [[04 - MOD-004 hls-streaming-pipeline.excalidraw|diagrama]].
