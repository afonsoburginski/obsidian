---
id: S33-29
tags:
  - attlas
  - registro
  - sprint-33
  - streaming
  - analitico
frente: Câmeras
commit: f31da74b06
branch: shared/chore/NO-CARD-sprint33-validation
atualizado: 2026-09-16
aliases:
  - "Streaming - a queda para HLS e a tela preta que vinha com ela"
---

# S33-29 - Câmeras - Streaming - A queda para HLS e a tela preta que vinha com ela

Três defeitos encadeados, achados em sequência na EMBEDDED 080. O primeiro derrubava o WebRTC, o
segundo escondia a queda, e o terceiro deixava o HLS preto.

## 1. Um segundo publisher no mesmo path derrubava o WebRTC

O log do mediamtx conta a história inteira em três linhas:

```
21:22:57 [WebRTC] session f15fe6e5 established ... is reading from path '...-secondary'
21:22:58 [path ...-secondary] closing existing publisher
21:22:58 [WebRTC] session f15fe6e5 closed: terminated
```

O relay ffmpeg de 20:36 sobreviveu ao restart do `ms-cameras`. O serviço voltou com o registry
vazio, o player pediu stream, e ele subiu um **segundo** ffmpeg para o mesmo path. O mediamtx aceita
o novo publisher, fecha o anterior e **derruba todos os leitores do path junto** - inclusive a
sessão WebRTC que tinha conectado um segundo antes.

A guarda que já existia (`spawnFfmpeg` mata o processo anterior) só enxerga o relay que **este**
processo iniciou; um órfão de antes do restart é invisível para ela.

Correção: `startPublisher` pergunta ao mediamtx se o path já entrega (`GET /v3/paths/get/<path>`,
`ready: true`) e **adota** em vez de publicar por cima. O `streaming.controller.ts` chamava
`spawnFfmpeg` direto, então a guarda tinha de ficar aí e não no `ensureRunning`.

Provado: matei o `ms-cameras` com SIGKILL deixando o ffmpeg órfão publicando, reiniciei, pedi o
stream. Log: `Adopting the live publisher of ... instead of starting a second one`, publisher
seguiu sendo `5737003c`, e **zero** `closing existing publisher`.

## 2. O player não percebia a queda

Matei uma sessão WebRTC pela API do mediamtx e medi o `<video>`:

```
track.readyState: "ended"    MediaStream.active: false
video.readyState: 4          paused: false           error: null      currentTime: 0 (congelado)
```

Quando é o **servidor** que encerra, o transporte continua de pé - não há nada nele. O
`iceConnectionState` não muda, e um MediaStream que perde as tracks **não levanta `MediaError`**.
Toda a detecção de falha desta classe olhava `iceConnectionState`, então nada disparava: tela parada
no último quadro, sem erro, sem troca de transporte.

Correção: `watchTrackEnd` escuta `ended` na track e `inactive` no stream, e trata como falha do
WHEP - o mesmo caminho que leva ao HLS. Registrado nos dois `ontrack` (conexão inicial e swap).

## 3. E ao cair, o HLS ficava preto

Com o item 2 no lugar a badge passou a virar "HLS", mas a imagem continuava parada. O motivo é uma
linha da spec do HTML: **`srcObject` vence `src`**. O `initHls` anexava o hls.js sem nunca soltar o
MediaStream morto, então o elemento seguia obedecendo um stream sem tracks - o hls.js baixava e
decodificava segmentos para um `<video>` que não olhava para ele.

Correção: `videoEl.srcObject = null` antes de anexar.

Provado na tela: depois do kick, `currentTime` volta a andar em tempo real (1, 3, 5, 7... a cada 2s),
badge "HLS", 30 FPS a 720p, com a região e as caixas desenhadas por cima.

> [!note] O HLS nunca esteve quebrado
> Conferido antes de mexer no player: master 200, variante 200, segmento 200 com 1,37 MB, direto do
> browser. O mediamtx 1.18 responde a playlist com `302 + Set-Cookie: cookieCheck=1` e redireciona
> para `?cookieCheck=1`; o browser segue sozinho. Com `curl` sem cookie o corpo vem vazio, o que
> parece defeito e não é - vale lembrar na próxima vez que alguém sondar HLS pela linha de comando.

> [!warning] O `nx serve web-attlas` pode falhar o rebuild em silêncio
> `✘ [ERROR] The expression evaluated to a falsy value: (compilation) [plugin angular-compiler]` -
> erro interno do compilador incremental. O dev server continua de pé servindo o **bundle antigo**, e
> recarregar a página não adianta. Custou duas rodadas de teste achando que a correção não
> funcionava. Sintoma: mudança no fonte que não aparece no browser depois de um reload limpo.
