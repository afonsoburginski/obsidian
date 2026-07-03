---
tags:
  - todo
  - attlas
  - sprint-22
sprint: Sprint 22 (29/06 a 05/07/2026)
card: SOFTWARE-1889
status: quase fechada (T1-T4 e T6 mergeadas/Closed; T5/#577 e T7/#630 em code review)
---

# Attlas - Sprint 22 (29/06 a 05/07/2026)

Backend `ms-cameras` (squad 2), sob a task guarda-chuva **SOFTWARE-1889** (dividas tecnicas do ms-cameras).


Escopo de dev backend-only: o frontend de "Saude da Camera" ja esta construido consumindo mock. O trabalho da sprint e entregar os endpoints e agregacoes que alimentam essas telas, alem de fechar o diagnostico de travamento do WebRTC.

## Visao geral das tarefas

| # | Tarefa | Frente | Tamanho | ClickUp | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Travamento do WebRTC (sem transcode) | Streaming | Media | SOFTWARE-1889 | PR #566 MERGEADA - fix validado local ponta a ponta (mediamtx remuxando RTP no cap de MTU, WebRTC sem STUN, videowall sem colapso) |
| 2 | Busca de cameras por topologia (area / subarea) | Topologia | Pequena, isolada | SOFTWARE-1920 | PR #574 MERGEADA (01/07); task Closed |
| 3 | Eventos de camera (geracao automatica + duracao) | Eventos | Media | SOFTWARE-1921 | PR #575 MERGEADA (01/07); task Closed |
| 4 | Saude da Camera: janelas de 5 min de disponibilidade + latencia (+ rollup 90d) | Saude | Grande | SOFTWARE-1922 | PR #576 MERGEADA (02/07), review do neto-atman resolvido; task Closed |
| 5 | Saude da Camera: bitrate historico + TTFF | Saude | Media | SOFTWARE-1923 | PR #577 ABERTA, aguardando review/merge (unica task nao fechada da sprint). Carrega tambem o fix "status Estavel com stream travado" (streamStatus na UC-027) |
| 6 | Saude da Camera: endpoint `getHealthMetrics` + serie + SLA | Saude | Media | SOFTWARE-1924 | PR #578 MERGEADA (01/07); task Closed |
| 7 | Streaming publico: mediamtx LL-HLS (3->7 segmentos) + watchdog WHEP->HLS no player | Streaming | Pequena, cross (`shared/`) | SOFTWARE-1990 | PR #630 ABERTA, em code review. Follow-up do diagnostico WebRTC da T1 |

A Tarefa 1 e a **SOFTWARE-1889** ("[Back] Dividas tecnicas ms-cameras: persistencia de conexao e travamentos no WebRTC"), a branch que estamos. Veio da Sprint 21 e segue na Sprint 22, hoje em code review (PR #566). Diagnostico abaixo serve de registro dela.

Ordem sugerida: fechar o WebRTC (Tarefa 1, PR #566 ja aberto), depois a 2 (topologia, menor e isolada), depois a 3 (eventos), e por fim o bloco de Saude (4 -> 5 -> 6, em dependencia).

## Cascateamento e ordem de merge

Estado (02/07): cascata resolvida. #566, #574, #575, #578 e #576 MERGEADAS; so #577 segue aberta, aguardando review/merge. As tasks correspondentes estao Closed no ClickUp (menos SOFTWARE-1923).

Ordem de merge executada: **#566 -> #574/#575 (independentes) -> #578 -> #576**. Falta so rebasear #577 onto develop e mergear quando aprovar.

- **#576 -> #578 (duplicacao a vigiar):** as branches nao sao empilhadas no git, mas a #578 carrega copia byte-a-byte da implementacao do #576 (mesma migration de disponibilidade/rollup, schemas, aggregator, repositories, workers, `.env.example`). Mergear as duas independentes = migration duplicada + conflito. Mergear #576 primeiro e rebasear #578 onto develop faz a copia sumir; revisar a #578 so pelo delta (composer + controller + handler + contrato).
- **#566 -> #577 (dependencia de codigo):** o #577 (bitrate) usa o `MediamtxClient` introduzido no #566. Rebasear #577 onto develop apos #566+#576 mergearem encolhe o diff ao delta proprio.
- Enquanto a #578 nao for rebaseada, qualquer apontamento de review nos arquivos compartilhados do #576 (aggregator, repos, workers, schema, migration, `.env.example`) precisa ser replicado nas duas.

## Fontes de verdade

- **Figma** "Modulo - Cameras", aba "Saude da Camera": 7 dias por hora no node `1218-344565`; 30 dias por semana no node `1630-391504`.
- **Planilha** "saude de cameras no videowall": `backend/sheet saude de cameras no videowall.png` no repo (modal "Saude da Camera"). Ja lida, regras de negocio consolidadas na Tarefa 5.
- **Contratos** em `libs/contracts/src/lib/camera/`.
- **Diagnostico WebRTC** completo: `Docs/Streaming/04-Diagnostico-travamento-WebRTC` no Obsidian.

## Processo (SDD + gate de qualidade)

- SDD: cada item gera spec atomica em `apps/ms-cameras/docs/atomic/` antes do codigo (`UC-*` REST, `PROJ-*` handler Kafka/cron). Default 1 atomica = 1 PR.
- Branch: `cameras/<prefix>/<task-id>` (cross-service usa `shared/`).
- PR sempre com base `develop`, so o commit da task.
- Gate antes do PR: suite completa do projeto tocado (`nx test/lint/build ms-cameras`), nao so affected. 0 erros de lint.
- Nada de `HttpException` ou `Error` crus nos services (usar `DomainException`).

---

## Tarefa 1 - WebRTC: travamento (SOFTWARE-1889)

Tarefa 1 da sprint (SOFTWARE-1889), trazida da Sprint 21. Registro do diagnostico aqui para nao perder o contexto.

PR #566 aberto. Review do Hadson resolvido (timeout, redacao de IP no endpoint publico, dedup, testes); o endpoint de diagnostico virou spec propria `UC-027-get-stream-diagnostics` e a leitura do mediamtx foi isolada num `MediamtxClient` reusado pela Tarefa 5. Diagnostico ja validado no ambiente (SSH na EC2 `aws-attlas-26` + API do mediamtx, camera `...001030`). Travadas frequentes na imagem so no WebRTC; no HLS puro nao acontece.

**Causa real (medida, nao teoria):**
- **Nao ha reprocessamento de video.** ffmpeg roda `-c copy` (remux puro), puxa H264 pronto da Axis (`10.11.7.101/axis-media`), mediamtx repacketiza em RTP sem decodificar. Igual ao HLS. A condicao inegociavel do dono (nada de transcode) esta atendida.
- **Ingest impecavel:** mediamtx recebeu ~10 GB com `inboundFramesInError: 0` em 4h30. Perda zero entre camera e mediamtx.
- **GOP curto:** keyframe a cada ~0.5s (`videokeyframeinterval=15` @ 30fps). Cada travada dura no max ~0.5s, ou seja o sintoma e perda continua no egress UDP, nao GOP longo.
- **A perda esta so no egress WebRTC** (UDP, sem buffer, sem retransmissao), amplificada por dois fatores de ambiente/config:
  1. Box de dev sobrecarregado: load 20 em 8 vCPU (divide com toda a stack). Emissor de tempo real descarta pacote sob CPU starvation; o proprio SSH cai.
  2. mediamtx sem TURN e sem `webrtcAdditionalHosts`/ICE, entao a midia so tem a rota UDP 8189 crua (bloqueada publicamente, vai pelo tunel Tailscale). Sem relay nem fallback TCP.
- HLS nao sofre porque TCP + buffer absorvem os mesmos solucos, ao custo da latencia (que e o unico motivo de usar WebRTC).

**Decisao:** manter o WebRTC. O travamento e de ambiente/config, nao do pipeline nem de reprocessamento. Corrigir SEM transcode.

**Fix entregue no #566 (validado local ponta a ponta; MERGEABLE + APPROVED):**
- [x] mediamtx `udpMaxPayloadSize: 1200` - RTP cabe no MTU 1280 do Tailscale. Validado: mediamtx loga "RTP packets are too big (1460 > 1188), remuxing them into smaller ones".
- [x] Player WHEP sem STUN (`iceServers: []`) + ICE gathering encurtado (3s -> 1s). Acaba o stall por tile que colapsava o videowall (WebRTC sobe "peer connection established" imediato).
- [x] `inboundFramesInError` exposto no endpoint de diagnostico para localizar perda no ingest.
- [x] Sem transcode (condicao do dono atendida: `-c copy`).
- Nao precisou de TURN/coturn nem abrir UDP 8189 no SG: o cap de MTU resolveu a fragmentacao sem relay. GOP mantido (0.5s).
- Follow-up (frontend, fora do escopo): FPS na badge e valor configurado, nao medido; troca automatica de qualidade por banda (RF-VW-06) ainda nao existe.

**Review do danielGuerra resolvido (commit 3ff909d8c, gate verde 624 testes / lint 0 / build):** interfaces e shapes do mediamtx movidos para `streaming/types/`, helper de redacao de IP + readers de env (`requireEnv`/`parseEnvInt`, antes duplicados em 3 arquivos) para `streaming/helpers/`, e o `resolve-stream-type.ts` solto virou `ParseStreamTypePipe` em `streaming/pipes/`, usado nos dois controllers. 3 conversations respondidas e resolvidas; PR segue MERGEABLE + APPROVED.

---

## Tarefa 2 - Busca de cameras por topologia (area / subarea)

Filtrar e buscar cameras por area e subarea, cuja topologia vive no ms-traffic-model.

**Estado atual:**
- ms-traffic-model e dono da topologia. Expoe `GET /api/traffic-model/topology` (raiz) e `GET /api/traffic-model/topology/:type/:id` (area -> subarea -> no -> cameras). A branch NODE ja enriquece cameras chamando ms-cameras (RF-INT-10).
- Associacao no<->camera vive no ms-traffic-model (tabela `NodeCamera`).
- Em ms-cameras a Camera so tem `trafficElementId` (id do no), sem area/subarea. Existe `@@index([trafficElementId])`.
- Nao existe HTTP client ms-cameras -> ms-traffic-model (so o reverso).

**Objetivo:** `GET /api/cameras` filtravel por area/subarea.

Implementado e pushado (#574, UC-025 travada; subareaId prevalece; fail-closed `ExternalServiceException` 502). Inclui escopo systemId + contadores do videowall. MERGEABLE, aguardando review.
- [x] **Opcao A:** filtro `areaId`/`subareaId` em list-cameras. ms-cameras chama ms-traffic-model para resolver os node ids sob a area/subarea e filtra `trafficElementId IN (...)`.
  - [x] novo HTTP client ms-cameras -> ms-traffic-model (espelha o `CamerasHttpClient` inverso)
  - [x] query params `areaId`/`subareaId` no list-cameras (handler / query / dto)
  - [x] `where trafficElementId in (...)` no `cameras.repository`
  - [x] resiliencia definida: fail-closed (502) se o traffic-model cair
- Opcao B descartada (o pedido e busca por area/subarea na listagem).
- [x] Reusados utilitarios de contrato (`IPaginatedResponse`, paginacao/sorting).

---

## Tarefa 3 - Eventos de camera (geracao automatica + duracao)

Alimenta a aba "Log de Eventos" e o card "Eventos recentes".

**Ja existe (nao refazer):**
- `GET /api/cameras/:id/events` -> `ICameraEventLogPage` (UC-11)
- `GET /api/cameras/:id/events/:eventId` -> `ICameraEventDetail` (UC-18)
- Pipeline: record-camera-event (UC-019), correlate-events (UC-021), emit-alarm (UC-022)
- Worker de saude emite eventos in-process + broadcast WebSocket

Implementado e pushado (#575, PROJ-004 travada). Aguardando review.
- [x] Geracao automatica de eventos a partir das transicoes de saude/stream para o `CameraEventLog` persistido (incidente abre na saida de STABLE, fecha no retorno). O worker anexa o evento de recuperacao.
- [x] Campo de duracao no evento: `payload.durationMinutes` calculado do incidente de stream ao restaurar.
- [x] Enum de tipos/severidade/categoria conferido: os enums atuais cobrem os casos da planilha.

**Gatilho (frontend, fora do escopo backend):**
- `getCameraEvents` ainda e MOCK em `cameras.service.ts` (~linha 320), deve chamar `GET /api/cameras/:id/events`.

---

## Saude da Camera (Tarefas 4, 5 e 6)

> Maior frente da sprint. O objetivo final e entregar `GET /api/cameras/:id/health?period=7d|30d|90d` -> `ICameraHealthMetrics`, que alimenta a aba inteira do Figma. As tres tarefas abaixo sao as fatias de entrega; as regras de negocio e os contratos valem para as tres.

### Regras de negocio confirmadas (planilha lida)

A "Saude da Camera" aparece como aba na pagina de detalhe e como modal aberto pela InfoCam no videowall (tabs "Informacoes Gerais" | "Saude da Camera", botoes Cancelar / Salvar camera). Mesmo backend nos dois.

- **Disponibilidade medida em janelas de 5 minutos** ("Proporcao em janelas de 5 min"). Cada janela classifica a camera em 1 de 3 estados: Online, Degradada, Offline. As barras por dia (7d) / semana (30d) e os totais do periodo sao a composicao dessas janelas. A unidade NAO e rollup diario.
- **SLA = % do tempo Online sobre o periodo.** So Online conta; Degradada e Offline reduzem o SLA. Ex 7d: Online 152.0h = 90.5% -> "SLA descumprido 90.50%".
- **Meta de SLA = 99.0%.** Desvio = Online% menos meta (90.5 - 99.0 = -8.5%). "SLA descumprido" quando Online% < meta.
- **Uptime (99.6%) e metrica SEPARADA do SLA** (card com (i), reachability). NAO e o numero do SLA, que e o Online% (90.5%). Resolvido no #578: `uptimePercent` fica sendo o numero do SLA (Online%) e foi adicionado `reachabilityPercent` (opcional) ao `ICameraHealthMetrics` para o card Uptime. Adicao em vez de rename para nao quebrar o build do web-attlas (mock consome `uptimePercent`); o rename `uptimePercent` -> `slaOnlinePercent` fica como follow-up coordenado com o front.

**Pontos resolvidos (#576/#578):**
- [x] Formula do card "Uptime": reachability = (Online + Degradada) / total, exposta em `reachabilityPercent`.
- [x] Meta SLA: env `CAMERA_SLA_TARGET_PERCENT` (default 99.0), mesma meta para todas as cameras; `slaDeviationPercent = uptimePercent - meta`.
- [x] Mapa dos 4 estados -> 3: STABLE -> Online; PARTIALLY_UNSTABLE + UNSTABLE -> Degradada; OFFLINE -> Offline. Janela vazia/faltante conta como Offline.

### Contratos (ja existem, nao redesenhar)

- `i-camera-health-metrics.ts` -> `ICameraHealthMetrics` (payload completo)
- `i-camera-bitrate-latency-sample.ts` (serie do grafico)
- `i-camera-availability-slice.ts` (online/degradada/offline: horas + %)
- `i-camera-daily-availability.ts` (barras empilhadas por dia)
- `camera-health-period.type.ts` (`'7d' | '30d' | '90d'`)

Hoje so existe `CameraHealthController` com snapshot atual, que nao serve a tela. O stub do frontend esta em `cameras.service.ts:244` (`getHealthMetrics` retorna mock). Atencao a ordem de rotas estaticas vs `:id` (ParseUUIDPipe).

---

### Tarefa 4 - Janelas de 5 min de disponibilidade + latencia (+ rollup 90d)

Base de dados historica para disponibilidade e latencia. Pre-requisito das Tarefas 5 e 6.

- [x] online/degraded/offline (horas + %), dailyAvailability (barras por dia no 7d, por semana no 30d) e os 2 numeros do topo (SLA = Online% e o card Uptime). Fonte: estado de conectividade amostrado em janelas de 5 min. Base entregue no #576; a composicao para a tela e a Tarefa 6 (#578).
  - **Gap:** heartbeat history so guarda ~24h (`heartbeat-history-cleanup.service.ts`); 7d/30d/90d nao cabem.
  - **Feito:** `CameraAvailabilityWindow` (estado por janela de 5 min) + `CameraAvailabilityDailyRollup` (retem 90d). Estado da janela vem do evaluator existente, mapeado 4 -> 3. Retencao fina das janelas = 7d (env), 90d vivem no rollup.
- [x] avgLatencyMs + serie de latencia. Fonte: heartbeat `latencyMs`, media por janela e por rollup.
- [x] Migration Prisma das janelas de disponibilidade de 5 min + rollup diario. Gerada via `prisma migrate diff`, validada em shadow (up/rollback). Bitrate (Tarefa 5) NAO entra nesta tabela; fica como PROJ-006.
- [x] Worker/cron: sampler `@Cron` 5 min (idempotente) + rollup diario + cleanup da retencao fina.
- [x] Testes (suite completa do ms-cameras verde, runInBand).

### Tarefa 5 - Bitrate historico + TTFF

Telemetria que ainda nao era coletada ao longo do tempo. Spec PROJ-006 (#577) sob a regra de reuso: bitrate NAO ganha tabela nem cron proprios. Implementado e pushado (empilhado sobre #566+#576); rebase onto develop depois que esses mergearem encolhe o diff ao delta. Aguardando review.

- [x] avgBitrateMbps + currentBitrateMbps + bitrateLatencyTimeSeries.
  - **Feito:** bitrate vive na MESMA janela de 5 min da Tarefa 4 (`avgBitrateMbps` em `CameraAvailabilityWindow` + rollup), pelo mesmo cron. Entrega a serie bitrate x latencia sem join.
  - **Fonte:** taxa real medida pelo delta de bytes do mediamtx (via `MediamtxClient` da UC-027, #566), nao o `bitrateKbps` estatico do perfil.
- [x] ttffMs (time to first frame / "Abertura do stream"): instrumentado em `streaming/ffmpeg-session.service` (`waitForStreamReady`) e persistido por sessao em `CameraTtffSample`.
- [x] Migration Prisma: coluna `avgBitrateMbps` na janela da Tarefa 4 + tabela `CameraTtffSample`.
- [x] Testes (suite completa do projeto verde).

#### Fix de producao: "status Estavel com stream travado" (adicionado ao #577)

Bug investigado em producao (dev.v2, camera SNL 10.11.5.102 / id ...001027): a camera aparecia "Operacional/Estavel" enquanto o stream travava. Causa: o `connectionStatus` (badge da tela) so pontua latencia e perda do ping de conectividade ao device (VAPIX WebSocket / ONVIF), sem nenhum sinal de video. O travamento em si ja tinha sido resolvido no #566 (cap de MTU no mediamtx, deployado e confirmado no box), entao isto e a lacuna de observabilidade, nao o travamento.

Decisao (com o dono): manter `connectionStatus` device-only conforme a separacao intencional da UC-027 e expor um sinal de stream separado, deixando o front decidir como pintar. Escopo backend-only.

- [x] Novo enum `StreamHealthStatus` (`OK` | `DEGRADED` | `DOWN` | `INACTIVE`) em `streaming/types/`, desacoplado de `CameraConnectionStatus`.
- [x] Campo `streamStatus` derivado no `IStreamDiagnostics` (UC-027), computado das tres visoes ja coletadas: path pronto e limpo -> OK; path ausente com sessao rastreada -> DOWN; sem sessao e sem path -> INACTIVE; `framesInError > 0`, sessao reconectando ou viewers sem peer connection -> DEGRADED.
- [x] Spec UC-027 atualizada (BR-DIAG-004, interface, criterios, testes).
- [x] 7 testes unitarios cobrindo os cinco caminhos. Gate verde: 668 testes, lint 0 erros, build ok.
- Pendente: commit + push do afonso (harness nao faz git ops).

#### Fundacao de WebRTC publico via TURN (PR #597, CROSS-032) - retornar depois

Follow-up do #566. Decisao do dono (01/07): o streaming vai ser exposto pra internet publica, mas so consome quem ja esta logado no Attlas (sem stream anonimo). Aberto PR #597 (branch `shared/feat/public-webrtc-turn`, base develop) com a fundacao versionada e INERTE ate deploy:

- servico `coturn` no docker-compose.yml (relay TURN sobre TLS 5349 pra furar firewall corporativo, faixa de relay 49160-49200, nega peers privados).
- `docker/turnserver.conf` + `docker/mediamtx.yml` com `webrtcAdditionalHosts` e `webrtcICEServers2` dirigidos por env do servidor (credenciais nunca versionadas).
- spec `docs/specs/cross-service/CROSS-032-public-webrtc-turn.md` com runbook.

Follow-ups travados no runbook (nao feitos ainda): implementar a auth do stream (URL WHEP assinada e curta validada pelo mediamtx, reusa permissoes), abrir portas no SG da AWS (8189/udp, 3478, 5349, 49160-49200/udp), certificado TLS no coturn, ligar os ICE servers no player (frontend), e deploy. Enquanto a auth nao estiver pronta, NAO abrir as portas no SG.

Contexto do "por que estavel com stream travado": ver tambem o fix de streamStatus adicionado ao #577 acima.

**Streaming publico funcionando (02/07, PR #630, SOFTWARE-1990, em code review):** o WebRTC publico passou a conectar ponta a ponta no dev sem depender do TURN. A causa raiz era de infra no servidor de dev (a cadeia FORWARD do iptables tinha perdido o jump do Docker por causa do Tailscale, mais a UDP 8189 fechada no Security Group), corrigida e persistida no box. No repo entraram dois ajustes: LL-HLS do mediamtx subiu de 3 para 7 segmentos (com 3 o muxer HLS morria na hora e derrubava o fallback pra todos), e um watchdog no player que cai pra HLS em ~8s quando o WebRTC negocia mas a midia nao chega. A fundacao TURN (#597) segue como reserva pra quem esta atras de firewall corporativo que bloqueia UDP.

### Tarefa 6 - Endpoint getHealthMetrics + serie + SLA

Junta tudo no endpoint que o frontend consome.

- [x] `GET /api/cameras/:id/health?period=7d|30d|90d` -> `ICameraHealthMetrics`. Rota de 3 segmentos, sem colisao com `cameras/health`; `period` default 7d, invalido -> 400.
- [x] activeSessions via `StreamSessionRegistry.all().length` (registry exportado do StreamingModule).
- [x] slaTargetPercent via env `CAMERA_SLA_TARGET_PERCENT` (default 99.0); `slaDeviationPercent = uptimePercent - meta`. SLA = Online%; card Uptime = `reachabilityPercent`.
- [x] Query handler CQRS `GetCameraHealthMetricsHandler` + composer puro lendo o rollup do #576 + janelas do dia corrente.
- [x] Rota na controller (`CameraHealthMetricsController`).
- [x] Testes (composer/handler/controller/dto; suite completa do ms-cameras verde).
- bitrate/TTFF ficam `null` ate o PROJ-006 (#577) entrar. Branch do #578 carrega o codigo do #576 para compilar; rebasear onto develop quando o #576 mergear.
