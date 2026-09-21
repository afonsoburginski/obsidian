---
tags:
  - ms-cameras
  - streaming
  - mediamtx
  - performance
  - task
atualizado: 2026-09-18
---

# Task - Streaming de câmeras sem vazamento de publicador

Plano aprovado em 18/09/2026, **ainda não implementado**. Nada de código foi tocado: a única edição
iniciada no `ffmpeg-session.service.ts` foi revertida. Retomar por aqui.

## O que foi medido (evidência, não hipótese)

- **Dois `ffmpeg` publicando o mesmo path** `00000000-0000-4000-8000-000000000101-secondary`, argv byte
  a byte idêntico: um com 20h de vida, outro com 2h. `ss -tnp` confirma **duas sessões RTSP
  estabelecidas** contra a câmera 10.1.1.80. O equipamento codifica e envia dois streams de ~3 Mbps e
  ainda divide CPU com o analítico embarcado, então entrega menos quadro. É a queda de FPS.
- **O path tem ZERO leitores.** Ninguém assistindo e a câmera continua sendo puxada.
- **PPID dos dois é `systemd --user`**, não 1: o `nx serve` morreu e o subreaper da sessão adotou os filhos.
- **A credencial da câmera está no argv**, legível por qualquer processo do host via `/proc/<pid>/cmdline`.
- MediaMTX saudável: ingestão contínua de 2,9-3,5 Mbps, `inboundFramesInError: 0`.

## O mecanismo, visível no log

```
17:50 StreamSessionReaperService  Reaping orphan session ...:SECONDARY: 0 readers
17:52 FfmpegSessionService        Adopting the live publisher of ...-secondary instead of starting a second one
17:53 StreamSessionReaperService  Reaping orphan session ...:SECONDARY: 0 readers
17:54 FfmpegSessionService        Adopting the live publisher of ...-secondary ...
```

O reaper reapa uma sessão **adotada** (`state.process === null`, porque o processo não é filho dele),
então `stopSession` não mata nada; o próximo GET adota o mesmo órfão. Reap e adoção se revezam para
sempre enquanto a câmera é puxada por um processo que ninguém controla.

O repo já tem reaper (PROJ-007), lease por espectador (UC-079), adoção de publisher vivo (commit
`f31da74b06`) e teto de sessões. Nada falhou por descuido: **tudo reconcilia registry para mediamtx, e
o registry é um `Map` em memória que todo restart zera, enquanto o processo `ffmpeg` sobrevive.** Falta
a direção inversa, a única que enxerga publicador que o processo atual não criou.

## Decisões já tomadas

- Rede de segurança primeiro, estrutural depois.
- URL do player passa a ser relativa, via proxy.
- Convergência de ingest na câmera fica para depois, com medição antes (o analítico embarcado lê o
  sensor dentro da própria câmera, não o nosso pipeline).

## Fase 0 - as duas correções que vão sozinhas (43 linhas)

- [ ] **0.1 O SIGKILL que nunca dispara** - `apps/ms-cameras/src/streaming/services/ffmpeg-session.service.ts:59-65`.
  Em Node, `proc.killed` vira `true` quando o sinal é **enviado**, não quando o processo morre, então o
  `if (!proc.killed)` do SIGKILL é sempre falso e um `ffmpeg` travado em I/O sobrevive ao kill. Teste de
  vida correto: `proc.exitCode === null && proc.signalCode === null`. A função passa a devolver
  `Promise<void>` que resolve no `exit` ou no fim do grace. Linha 165: tirar o `&& !state.process.killed`
  do guard, senão o handle é zerado com o processo vivo. `onApplicationShutdown` (linha 460) vira `async`
  com `Promise.all` e teto `SHUTDOWN_KILL_BUDGET_MS` (default 8000).
- [ ] **0.2 O SIGTERM que não chega ao node** - `apps/ms-cameras/Dockerfile:37` é
  `CMD ["sh","-c","npx prisma migrate deploy … && node main.js"]`; PID 1 é o `sh`, que não repassa sinal,
  então `enableShutdownHooks` (`main.ts:49`) nunca é acionado. Mínimo: `… && exec node main.js`. Completo:
  `tini` como entrypoint (`apk add --no-cache ffmpeg tini`, `ENTRYPOINT ["/sbin/tini","-g","--"]`) - o `-g`
  repassa o sinal ao grupo e leva o ffmpeg junto. Conferir antes `docs/architecture/docker.md:142-144`
  (smoke que casa por string com `prisma migrate deploy`).

## Fase A - rede de segurança

- [ ] **A1 Varredura de ffmpeg órfão no boot** - novo
  `apps/ms-cameras/src/streaming/workers/orphan-ffmpeg-sweeper.service.ts` (`OnApplicationBootstrap`).
  Identificação por conjunção de cinco predicados lidos de `/proc`, sem shell e sem `pkill`:
  `comm === 'ffmpeg'`; último argv começando com `${MEDIAMTX_RTSP_URL}/`; o resto casando exatamente com
  a gramática de `streamPathName` (`^<uuid>-(primary|secondary|tertiary)(-h265)?$`); `Uid:` igual ao nosso;
  e o `cameraId` existindo na tabela `Camera`. Com os cinco, falso positivo exigiria um terceiro publicando
  no nosso media server num path nomeado por chave primária do nosso banco - o que é publicador concorrente
  e tem de morrer de qualquer forma. Marcador no argv não serve como condição: os órfãos de hoje nasceram
  antes de qualquer marcador. Raiz injetável por `ORPHAN_FFMPEG_PROC_ROOT` para testar com `/proc` falso.
- [ ] **A2 Sessão adotada que não solta a câmera** - `IHlsSessionState` ganha `adoptedPublisher`;
  `stopSession` mata o processo se houver, senão expulsa o adotado por kick. O mapa de rotas de kick já
  existe em `videowall-mirror-codec-enforcer.service.ts:14-15`; promover para
  `streaming/helpers/mediamtx-kick-route.helper.ts` e fazer o enforcer importar de lá. `stopSession` vira
  `Promise<void>` e os chamadores acompanham. Escrever sem suavizar: o kick libera o media server, não
  mata o processo do SO - quem mata é A1.
- [ ] **A3 `pathIsDelivering` falhando fechado** - usar o `MediamtxClient` que já existe em vez do `fetch`
  cru; critério `ready === true || source != null` (hoje só `ready`, e publicador ainda negociando lê
  `false` - é a janela do spawn duplicado); `null` do client vira retry e depois 503
  `MEDIAMTX_UNAVAILABLE`. Falhar aberto não compra disponibilidade: estamos prestes a publicar dentro do
  mediamtx, e se ele não responde ao GET o publish também não vai. Distinguir 404 de erro de transporte
  com um `getJsonOrStatus` novo.
- [ ] **A4 Single-flight pela qualidade resolvida** - `streaming.controller.ts:113` chaveia pela qualidade
  **pedida**; a resolvida só aparece depois do `resolve()` (linha 238), e em Hikvision TERTIARY e SECONDARY
  colapsam no mesmo path. Subir o `resolve` para antes do single-flight.
- [ ] **A5 Reconciliação mediamtx para registry** - novo `stream-path-reconciler.service.ts` mais
  `parseStreamPathName()` (inverso exato de `streamPathName`, estrito). Não faz chamada própria: o reaper
  já lê `/v3/paths/list` e `/v3/webrtcsessions/list` por tick e passa os arrays. Regras BR-ORPH-001 a 006:
  só nomes que o parser aceita; path com sessão não é assunto; path sem sessão e **com** leitor é adotado
  (sem lease fantasma); path sem sessão, sem leitor e publicando é expulso após `STREAM_ORPHAN_PATH_GRACE_MS`
  (30s); lista nula não decide nada no tick; expulsão sob lease Redis (`DeviceLeaseService`, como o reaper de
  espelho já faz). No boot: varredura de processo **antes** da reconciliação de path, senão o ffmpeg reconecta
  por cima da expulsão. Rollout com `STREAM_ORPHAN_PATH_EVICTION_ENABLED=false` em dry-run por um dia.

## Fase B - a URL do player para de depender de IP

- [ ] As duas vars de navegador (`MEDIAMTX_WEBRTC_BASE_URL`, `MEDIAMTX_HLS_BASE_URL`) passam a aceitar base
  relativa (`/live`, `/live-hls`), default de dev. As de servidor não mudam.
- [ ] Rota no `apps/web-attlas/proxy.conf.mjs` e no `docker/nginx-web-local.conf`, no molde do
  `/mirror-playback` que já existe.
- [ ] O player não muda: `media-connection.ts` decide transporte por `url.endsWith('/whep')` e o `fetch`
  resolve relativo contra a origem do SPA.
- [ ] Limite a deixar escrito: pelo proxy passa só a **sinalização**. A mídia WebRTC continua indo por UDP
  8189 direto ao endereço que o MediaMTX anuncia como candidato. Em dev isso é o IP da bridge Docker, que
  não muda ao trocar wifi por cabo - é daí que vem a imunidade. Em produção depende de
  `MTX_WEBRTCADDITIONALHOSTS` apontar para endereço estável.
- [ ] Produção: o proxy vive fora do repo. Entregar o bloco pronto (nginx e Kong) e o pedido, com fallback
  de manter absoluto por env. Ganho lateral: sinalização na mesma origem abre caminho para exigir
  autenticação no vídeo (CROSS-063) sem porta nova.
- [ ] Reescrever o aviso de `.env.example:159-171`, que descreve o desenho antigo.

## Fase C - estrutural: o MediaMTX puxa, nós só configuramos

- [ ] Substituição do publicador em modo `provisioned` (default), sem mudar contrato: `spawnFfmpeg` vira
  `POST /v3/config/paths/add/<path>`, `kill` vira `DELETE /v3/config/paths/delete/<path>`, processo vivo
  vira config existente. `waitForStreamReady`, TTFF, lease, grace, reaper e teto continuam idênticos.
- [ ] `sourceOnDemand: true` fica opt-in (`STREAM_PATH_MODE=onDemand`) por um motivo que precisa estar
  escrito: com ele o MediaMTX só puxa quando aparece um **leitor**; nosso `waitForStreamReady` consulta o
  control API, que não é leitor; o leitor é o navegador, que só aparece depois que o GET responde. O GET
  esperaria `ready`, `ready` esperaria leitor, leitor esperaria o GET - trava em 100% das aberturas.
- [ ] Corpo do `add`: durações são **string com unidade**; `source` é a URL que o
  `CameraStreamSourceResolver` já devolve; `rtspTransport` mapeado de `RTSP_TRANSPORT` (`http` não existe no
  MediaMTX e cai para `tcp` com warn). **`useAbsoluteTimestamp` não entra** - o `docker/mediamtx.yml`
  restringe o campo aos paths `analytic-*` e o mediamtx#5355 faz o path nunca ficar `ready` quando o RTCP
  da fonte não é decodificável; trocaria FPS baixo por tela preta. `add` com 400 vira read-before-write.
- [ ] Estrutura: porta `IStreamPublisher` com `MediamtxPullPublisher` (novo) e `FfmpegTranscodePublisher`
  (o serviço atual encolhido para **só MJPEG**, único caso que ainda transcodifica). Orquestrador sai para
  `StreamSessionService`. O rename toca 19 arquivos e deve ser o primeiro commit isolado da PR.
- [ ] Consequências a declarar: o fallback H265 para H264 muda de gatilho; `-max_delay` e
  `-reorder_queue_size` somem do caminho `-c copy` (inócuo em TCP, que é o deploy atual); `-tag:v hvc1`
  deixa de existir e Safari com H265 vira validação manual com rollback declarado.
- [ ] Credencial sai do argv de N processos e passa a viver só no config do media server (porta 9997 já não
  é publicada). Puxa junto endurecer `action: api` no `docker/mediamtx.yml`, hoje concedido ao usuário
  `any` - **PR pequena que vale sozinha, antes desta** - e teste de regressão provando que
  `MediamtxClient.send` nunca loga o body.

## Fase D - carga na câmera: medir antes de mexer

- [ ] Instrumentar, sem convergir ingest ainda: `ss -tn state established '( dport = :554 )'` (aceite da
  fase C: **1 sessão** por câmera assistida); `ps -eo pid,ppid,etime,args | grep [f]fmpeg` (aceite: **0**
  fora de MJPEG); delta de `inboundBytes` e `inboundFramesInError` em `/v3/paths/list`; FPS sem decodificar
  com `ffprobe -show_entries packet=pts_time -read_intervals %+10`; VAPIX `Image.I0.RateControl` e
  `Image.I0.Stream` pelo `AxisDigestClient` que já existe - a diferença entre configurado e medido é a
  saturação do encoder.
- [ ] Medir nas quatro combinações: analítico embarcado ligado/desligado vezes 1 ingest/2 ingests. Vira
  `apps/ms-cameras/docs/runbooks/stream-ingest-saturation.md`.
- [ ] Corrigir de passagem o `MOD-004:64-66`, que ainda fala de duas sessões RTSP por device citando os
  paths `telemetry-*`, removidos no redesenho de 27/08.

## SDD

Conferir id livre com `node scripts/spec-id.mjs next --service ms-cameras --prefix <PROJ|INT>` (o script vê
PRs abertas; a árvore local não basta). Máximos atuais: UC-081, PROJ-023, INT-025.

- Novas: **PROJ-024** (reconciliação inversa, BR-ORPH-001 a 006), **PROJ-025** (varredura de `/proc`, cinco
  predicados como regras numeradas), **INT-026** (ciclo de vida do path puxado, contrato campo a campo, os
  dois modos e o deadlock por extenso), **UF nova** (URL relativa do player).
- Emendas: PROJ-007 (direção inversa, envs novas, DoD reaberta), UC-079 (seção 4.6 ganha "o processo que
  segurava a sessão morreu"; a seção 7, sem heartbeat, continua válida e a reconciliação inversa é o
  substituto do lado certo), UC-011 (503 `MEDIAMTX_UNAVAILABLE`), MOD-004 (publicador deixou de ser nosso;
  corrigir a nota dos paths de telemetria e a tabela de envs, que diverge do código), INT-008, INT-024, e
  `docs/architecture/video-delivery.md`, cuja primeira frase passa a ser falsa: não é mais "um ffmpeg por
  câmera, qualidade e codec", e sim "um path de pull configurado".

## Ordem de merge

| # | PR | Tamanho | Risco |
| --- | --- | --- | --- |
| 1 | 0.1 SIGKILL, guard e shutdown assíncrono | ~40 linhas | muito baixo, corrige código morto |
| 2 | 0.2 Dockerfile `exec` e `tini` | 3 linhas | muito baixo, independe do TS |
| 3 | A1 varredura de `/proc` | ~150 linhas | baixo, cercado por cinco predicados |
| 4 | A2 e A3 handle da adotada, fail-closed, critério `source` | ~80 linhas | baixo-médio, passa a devolver 503 onde antes publicava |
| 5 | A4 single-flight resolvido | ~60 linhas | baixo, medir p95 do GET antes e depois |
| 6 | A5 reconciliação inversa e PROJ-024 | ~250 linhas | médio, entra em dry-run |
| 7 | Endurecer `action: api` do mediamtx | pequena | baixo, vale sozinha |
| 8 | Fase B URL relativa | média | baixo em dev, produção depende de proxy externo |
| 9 | Fase C publisher port, pull e rename | grande | alto, mitigado por `STREAM_PATH_MODE` e pelo ffmpeg vivo para MJPEG |

## Verificação

Nada abaixo decodifica vídeo em browser, usa Playwright ou roda `nx test/lint/build` na máquina.

Depois das PRs 1 e 2: registrar os órfãos com `ps`, matar o ms-cameras com SIGKILL (o pior caso) e subir de
novo. Hoje os órfãos sobrevivem; depois da PR 3, a subida tem de deixar `pgrep -c ffmpeg` em 0 e o log com a
contagem de mortos.

Depois da PR 6, com o serviço no ar e ninguém assistindo: `/v3/paths/list` não pode listar nenhum path
`<uuid>-<quality>`; `ss` tem de voltar vazio; abrir uma câmera e conferir 1 path, 1 sessão RTSP e
`readers >= 1`; fechar a aba e cronometrar o sumiço do path em até grace mais um tick.

Testes a escrever (rodar no CI, não local): sweeper com `/proc` falso, incluindo os casos `telemetry-`,
`analytic-` e `videowall-*` que **não** podem ser mortos; `killWithSigkillFallback` com `killed: true` e
`exitCode: null`, que é o teste que o bug de hoje passaria; `stopSession` de sessão adotada chamando o kick;
`pathIsDelivering` com `ready:false` e `source` preenchido; duas requisições concorrentes de tiers que
resolvem para o mesmo path criando **uma** sessão; e o integração que hoje não existe,
`proj-024-orphan-path-reconciliation`, que sobe o mediamtx real, publica por um publicador externo ao
processo de teste, sobe o app com registry vazio e prova que o boot adota (com leitor) ou apaga (sem leitor).

A fase C exige ainda o integração contra o MediaMTX 1.18.2 real provando que o corpo do `add` é aceito pela
versão que vai a produção, e o teste de auth provando que o regex de `authInternalUsers` ainda concede
`read` num path **puxado** - antes ele era publicado, e a regra é de nome, não de origem, mas isso se prova.

## Arquivos críticos

- `apps/ms-cameras/src/streaming/services/ffmpeg-session.service.ts`
- `apps/ms-cameras/src/streaming/workers/stream-session-reaper.service.ts`
- `apps/ms-cameras/src/streaming/streaming.controller.ts`
- `apps/ms-cameras/src/streaming/helpers/stream-codec.helper.ts`
- `apps/ms-cameras/src/video-wall/targets/projection/services/videowall-projection-source-grid.service.ts`
- `apps/ms-cameras/Dockerfile`

## O que foi feito em 18/09 (paliativo local, não é a correção)

Nenhuma das fases acima entrou em código. O que foi feito na máquina de dev, para destravar o trabalho:

- Matei os dois `ffmpeg` órfãos e a cadeia `nx serve` antiga, que segurava o lock do NX e deixava o
  serviço novo em "Waiting for ms-cameras:serve:development in another nx process".
- Reiniciei o `ms-cameras`, que subiu carregando o `.env` corrigido: `MEDIAMTX_HLS_BASE_URL` e
  `MEDIAMTX_WEBRTC_BASE_URL` apontando para `localhost`, e não mais para o IP do wifi anterior.
- Liguei o produtor Kafka do device (`POST /api/producer?enable=true`), que estava desligado e por isso
  nenhuma detecção chegava.
- Preenchi `SEED_ATMAN_EMBEDDED_SOURCE_ID` no `apps/ms-cameras/.env` e repus o `deviceSourceId` no banco,
  porque o seed do `nx serve` apaga o vínculo a cada boot.
- Estado ao final: um path no MediaMTX, um `ffmpeg`, uma sessão RTSP na câmera, e o log confirmando
  "analítico ao vivo recebendo quadros".

O commit `ec5fe568a4` (timer de 30s do mapa de binding, mais log do descarte) está na branch
`analytics/feat/NO-CARD-telas-mapa-e-paginacao`, não na develop.

