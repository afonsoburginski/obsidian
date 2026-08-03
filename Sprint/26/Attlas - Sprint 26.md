---
tags:
  - attlas
  - sprint-26
  - moc
sprint: Sprint 26 (27/7/26 - 2/8/26)
status: sprint encerrada em 02/08. Fechou com 6 cards Closed e 1 em code review (2384, aguardando merge da #1237) — é o único que sobrou na lista. Todo o resto que não era realmente desta semana saiu: 2005 e 2400 (permissões nas rotas de câmeras) e o comparativo pausado 2314/2315/2316 foram movidos para a lista da Sprint 27 no ClickUp em 03/08, porque a 26 encerrou e eles não tinham mais lista ativa. Ver [[Attlas - Sprint 27]].
atualizado: 2026-08-03
---

# Attlas - Sprint 26

Sprint de **teste de funcionalidade + comparação de performance**, não de feature nova. Exercitar de ponta a ponta o que foi construído (câmeras, dashboard, eventos) e comparar o streaming/hardware do Attlas 26 com o 25.

**Atualização 27/07**: o comparativo Attlas 25x26 (streaming/hardware, video wall) foi pausado — volta
depois. Foco desta semana é validação manual de dados (front x banco) na listagem e no cadastro,
porque um QA dedicado entra no time semana que vem e essa validação vira insumo do repasse pra ele.

## Cards (ClickUp, squad 2)

Situação conferida contra o ClickUp em 31/07. A lista da Sprint 26 tem 14 cards, dos quais 10 são
meus: 6 fechados (2356 fechado em 31/07, com a #1175 mergeada), 1 em code review (2384, aberto no fim do dia 31/07) e 3 no
backlog (o comparativo pausado). Os outros 4 são do Ricardo, com a tag `attlas25`.

| Card | Status | Fecha com |
| --- | --- | --- |
| 2317 fluxo E2E de cadastro de câmera | Closed (29/07) | #1137 |
| 2318 dashboard — validação E2E de dados | Closed (29/07) | #1138 |
| 2319 eventos — validação E2E de dados | Closed (29/07) | — (0 bugs de código) |
| 2355 painel de operações — câmera sem geolocalização | Closed (29/07) | #1120 |
| 2357 dashboard sem largura limite em ultra-wide | Closed (29/07) | #1139 |
| 2356 **validação final do frontend — todas as telas** | Closed (31/07) | #1121 + #1175 |
| 2384 interseção na edição, cards de eventos e export do dashboard | code review, review dividido em 31/07 | [#1237](https://github.com/atmanadmin/attlas-2026/pull/1237) |
| ~~2005 permissões nas rotas de câmeras: mapa das 86 rotas e chaves que faltam~~ | movido para a lista da Sprint 27 em 03/08 | [[SOFTWARE-2005 - Permissões nas rotas de câmeras - mapa das 86 rotas]] |
| ~~2400 aplicar o enforcement de permissão nas rotas de câmeras~~ | movido para a lista da Sprint 27 em 03/08 | [[SOFTWARE-2400 - Aplicar enforcement de permissão nas rotas de câmeras]] |
| ~~2314 / 2315 / 2316 comparativo Attlas 25x26~~ | backlog, pausado desde 27/07; movido para a lista da Sprint 27 em 03/08 | [[00 - Sem prazo (backlog)]] |

### Permissões de câmera entram na semana (31/07)

O 2005 deixou de ser "novas regras de permissões" genérico, que colidia com o squad 3
(SOFTWARE-2329 e 2292 do Hadson no `ms-organization`), e virou o recorte que é nosso: **permissão em
tudo de câmeras**. Foi movido da lista da Sprint 23 para a 26.

Estado que justifica a urgência: o `ms-cameras` importa `CoreAuthModule.forRoot()` e valida assinatura de
JWT, mas tem **zero** decorator de autorização nas suas **86 rotas** de 15 controllers, então qualquer
token válido passa em qualquer rota. O catálogo em `@attlas/contracts` tem só **8 chaves de câmera**
(`stream:view`, 3 de PTZ, create, edit, delete, `crowdControl:enable`) e `DASHBOARD_PERMISSIONS` está
vazio, contra 27 chaves do traffic-model e 19 do pmv. Ou seja, o trabalho é mapa mais catálogo antes de
decorator.

Dois cards porque são duas PRs: 2005 entrega a tabela de decisão das 86 rotas mais as chaves novas
(aditivas, coordenadas com o dono do catálogo) e 2400 aplica os decorators com teste do caminho negado.
Risco a vigiar: ligar enforcement em serviço que nunca teve derruba tela que hoje funciona por ausência de
regra, então os fluxos principais vão conferidos no `:4200` com login real antes do merge.

**Atualização 03/08**: os dois ficaram na lista da Sprint 26 por decisão de 31/07 (não furar o foco
único da 27), mas a sprint 26 encerrou em 02/08 sem eles serem tocados. Movidos para a lista da Sprint
27 no ClickUp — ver [[Attlas - Sprint 27]] — sem entrar no track único do analítico desta semana.

### Continuidade da #1175 — cards novos (31/07)

Três pendências de tela apareceram no uso depois do merge da #1175 e viraram um card só,
[[SOFTWARE-2384 - Interseção na edição, cards de eventos e export do dashboard|SOFTWARE-2384]]:
busca de interseção que só funciona no cadastro, barra de variação nos cards de eventos (que a própria
#1175 introduziu) e os botões de download do dashboard que não baixam nada. Escopo 100% frontend —
nenhum dos três precisa de backend. A investigação achou de brinde que o rodapé "Mostrando X de Y" da
tabela de conectividade mente quando há mais de 100 linhas, e que uma spec documenta um endpoint
(`GET /api/traffic-elements`) que não existe.

### Teste e comparação (streaming / hardware) — pausado, movido para sem prazo

Os 3 cards não têm prazo nem previsão de retomada, e as notas passaram para `Sprint/sem prazo/` em
31/07 — ver [[00 - Sem prazo (backlog)]]. Em 03/08, com a Sprint 26 encerrada, os cards em si
(status ClickUp) foram movidos para a lista da Sprint 27, mantidos em `backlog`.

- [[SOFTWARE-2314 - Performance do streaming de vídeo]] - medir banda média por stream, latência (TTFF / glass-to-glass) e média geral sob carga; vira baseline pra comparar com o 25.
- [[SOFTWARE-2315 - Comparativo Attlas 25x26 - video wall]] - funcionalidades, integração, comportamento, regressões.
- [[SOFTWARE-2316 - Comparativo Attlas 25x26 - arquitetura de hardware e streaming]] - protocolos (WebRTC/HLS), codecs, topologia de relays, pipeline de mídia e recursos de máquina.

### QA de funcionalidade (telas) — concluído

- [[SOFTWARE-2317 - Fluxo E2E de cadastro de câmera]] - cadastro, validação de credenciais, assistir (player ao vivo), editar. **Validado 27/07** — achados na própria nota do card (3 bugs corrigidos + 1 doc corrigida no ms-cameras).
- [[SOFTWARE-2318 - Dashboard de câmeras - validação E2E de dados]] - KPIs, gauge, donuts, marcadores do mapa, heatmap, série de uptime, banda, conectividade. **Validado 27/07** — achados na própria nota do card (0 bugs de código, 1 doc corrigida — 6 specs com rota errada). O front já estava ligado ao backend real desde 25/07 ([[SOFTWARE-2326 - Integração do dashboard de câmeras com o backend real|SOFTWARE-2326]], PR #1058, Closed) — falta só o clique-a-clique visual (Kong do dev defasado da develop).
- [[SOFTWARE-2319 - Eventos de câmeras - validação E2E de dados]] - lista, filtros, stats, timeline pela cadeia do incidente, recorrência, observações, reportar; side card/drawer + página de detalhes. **Validado 27/07, card fechado no ClickUp em 29/07** — achados na própria nota do card (0 bugs de código).

### Clique-a-clique (28/07) — cards novos

O clique-a-clique pelas 3 telas (pendência dos 3 cards acima) rodou em 28/07 no EC2 `dev.v2`. Achados
que não cabiam no escopo de 2317/2318/2319 viraram 2 cards novos, mesmo prefixo `[QA]`, mesma lista:

- [QA] Painel de operações — câmeras sem geolocalização somem sem aviso ([SOFTWARE-2355](https://app.clickup.com/t/86ajr3feu), PR [#1120](https://github.com/atmanadmin/attlas-2026/pull/1120), CI verde) — spec (`UF-004`) já previa descartar câmera sem coordenada válida, mas o `console.warn` exigido nunca foi implementado; corrigido + bug de `catchError` que apagava a camada inteira numa falha parcial.
- [QA] Tela de eventos — filtro por dispositivo, período todo e rótulo de comparação ([SOFTWARE-2356](https://app.clickup.com/t/86ajr3ffz), PR [#1121](https://github.com/atmanadmin/attlas-2026/pull/1121), CI verde) — 3 gaps de UI, não bugs de dado (ver [[SOFTWARE-2319 - Eventos de câmeras - validação E2E de dados]]). CI falhou uma vez por flake de infra (testcontainer do `ms-traffic-model` inacessível, nada a ver com o diff) — rerun resolveu. **Este card foi renomeado em 31/07 para "[QA] Validação final do frontend — todas as telas"** e absorveu a segunda rodada de validação; ver a seção da #1175 abaixo. A descrição no ClickUp ainda é a dos 3 gaps de eventos, então título e descrição do card discordam.
- [QA] Dashboard sem largura limite em telas ultra-wide ([SOFTWARE-2357](https://app.clickup.com/t/86ajr4e0z), PR [#1139](https://github.com/atmanadmin/attlas-2026/pull/1139), CI verde) — ver [[SOFTWARE-2318 - Dashboard de câmeras - validação E2E de dados]]. Branch antiga (cortada antes da #1058 mergear a mesma conversão de mock→real do dashboard); mesclada com a develop em 29/07 mantendo a versão já mergeada + removida uma rota Kong duplicada (`/api/dashboard/kpis` definida duas vezes) achada na mesclagem.

### Estado das PRs em 31/07

| Card | PR | Situação em 31/07 |
| --- | --- | --- |
| 2317 | [#1137](https://github.com/atmanadmin/attlas-2026/pull/1137) | **mergeada** 29/07 — 5 bloqueantes + 4 ajustes do review corrigidos |
| 2318 | [#1138](https://github.com/atmanadmin/attlas-2026/pull/1138) | **mergeada** 29/07 — 19 arquivos com a rota antiga, não 5 |
| 2319 | — | fechado, 0 bugs de código |
| 2355 | [#1120](https://github.com/atmanadmin/attlas-2026/pull/1120) | **mergeada** 29/07 |
| 2356 | [#1121](https://github.com/atmanadmin/attlas-2026/pull/1121) + [#1175](https://github.com/atmanadmin/attlas-2026/pull/1175) | as duas **mergeadas**, a #1175 em 31/07 (09:25 BRT) |
| 2357 | [#1139](https://github.com/atmanadmin/attlas-2026/pull/1139) | **mergeada** 29/07 |
| — | [#1142](https://github.com/atmanadmin/attlas-2026/pull/1142) | **mergeada** 29/07 — orçamento de disco do CI |

Todas as branches mergeadas foram deletadas. Cards 2317/2318/2319/2355/2357 fechados. O **2356 é o
único aberto** e está desatualizado no ClickUp: segue em `code review` mesmo com a #1175 na develop —
fechar.

Detalhe dos achados de 2317/2318/2319 ficou direto nas notas de cada card (seções "Achados do
clique-a-clique" e, no 2317, "Review da PR #1137").

**Follow-ups do review do #1137** — os dois que eu tinha listado como abertos entraram antes do
merge: a reativação de câmera soft-deleted agora limpa snapshot e PTZ da encarnação anterior e não
duplica stream profiles, e o autocomplete de interseção ganhou navegação por teclado. **Segue em
aberto**, com acordo no review: extrair o intersection-picker do `camera-creation-settings-step`
(~700 linhas, já tem `TODO(refactor)` no arquivo) — candidato a card.

**Aberto na #1138**: o `ms-cameras` é o único ms que ocupa um segmento de raiz (`/api/dashboard`)
em vez de prefixo próprio como os outros (`/api/pmv/...`). Herança do `bandwidth.controller` de
22/06, não decisão de desenho. Hoje não colide porque é o único que registra `dashboard`, mas um
dashboard global encontraria o nome tomado. Mudar é breaking (7 controllers + Kong + o service do
front + specs) — candidato a card.

### Validação final do frontend (SOFTWARE-2356, PR #1175, mergeada 31/07)

A #1175 tinha entrado nesta nota como "follow-up de comment-guide, sem mudança de comportamento".
Não foi isso: fechou a validação final do frontend de câmeras e, no caminho, o que a validação expôs
no backend. **358 arquivos, 16 commits, mergeada em 31/07 às 09:25 BRT.** O card 2356 foi renomeado
para refletir esse escopo maior.

O que entrou, por spec:

- **CROSS-043** — adapter Redis do Socket.IO em `@attlas/core-messaging/socketio` (entry point
  secundário, pra não arrastar `socket.io` pro `package.json` de quem não tem gateway), Redis
  provisionado pro `ms-cameras` no compose/setup-env, rota Kong do WS de stream e o gauge
  `socketio_redis_adapter_up`. Sem adapter, `server.to(room).emit()` só alcançava os sockets do
  próprio pod. **É a fatia 1 do [[SOFTWARE-2009 - Escalabilidade horizontal do ms-cameras em Kubernetes]]**,
  entregue por fora do épico.
- **PROJ-017** — lease Redis por device (`cameras:monitor:lease:*`): um monitor cluster-wide por
  device, handoff ≤15s no deploy, fallback monitor-tudo com log ERROR quando o Redis cai. Rollup e
  cleanup passam a rodar sob `withTransactionLock`. É o fix definitivo do item 2 da seção abaixo.
- **PROJ-016** — `camera:health:live` empurra sessões ativas e bitrate instantâneo pra quem está com
  a câmera aberta, emissão replica-local. `activeSessions` passa a vir do MediaMTX (`countViewers`),
  e `null` significa desconhecido, nunca zero.
- **UC-040** — comparativo fixo de 30 dias nos KPIs de eventos: `comparison`
  (current/previous/windowDays) aditivo no contrato, `trendPct` passa a ser o delta dessa janela e
  não do filtro. Era o BLOCKER que sobrou da #1121.
- **UF-010 / UF-032 / UF-024** — popup do mapa capado ao card com estado reconciliado contra o
  maplibre, e reconexão WS confiável no front (token relido a cada handshake, `resync` em toda
  reconexão, dedup por `entry.id` no prepend).
- **UF-009 + comment-guide** — os 7 comentários inline do @igor64BR na #1121: comentários em en-US,
  `CAMERA_OPTIONS_PAGE_SIZE` amarrado a `CameraValidation.pageSize.max`, filtro fantasma "Status"
  removido da spec.

Também entraram o período `CUSTOM` (`from`/`to`) nos endpoints de dashboard, com janela validada num
único ponto (máx. 92 dias, normalizada em dias UTC), e o `AvailabilitySourceReader` — era por isso que
os cards de saúde discordavam do gráfico ao lado (duas tabelas de telemetria respondendo a mesma
pergunta). O `ANALYTICS_STREAM_GROUP_ID` fica **vazio** fora do cluster de propósito: o broker do
device é compartilhado entre ambientes e um valor fixo faria dev, homologação e produção dividirem
partições entre si.

**Em andamento local, não commitado**: scaffold de Playwright (`playwright.config.ts`, `tests/`,
workflow `playwright.yml`) e mexidas no seed do `ms-traffic-model` — automação de QA das telas, ainda
sem card.

### Infra de CI — orçamento de disco (PR #1142, **mergeada** 29/07)

Fora da leva de câmeras, sem card. O CI quebrava por disco cheio e a investigação mostrou que a
regra de limpeza **nunca apagava nada**: mandava remover o que tinha mais de 14 dias, mas o cache se
renova em ~5 dias, então rodou 59 vezes removendo zero enquanto o disco ia a 100%.

O modelo que ficou: **o bucket é a cópia durável compartilhada, o disco de cada máquina é cache
quente com teto rígido**. Como o bucket existe, o teto local pode ser agressivo — um miss custa
download de LAN, não rebuild.

Resultado medido: **56 GB liberados** (EC2 57%→41%, VM 63%→45% com job rodando) e três mecanismos
novos: teto por tamanho em vez de idade, guard graduado por risco (a VM com 3 runners quase nunca
fica ociosa, então o teto antes só valia em emergência), e o `ci-disk-watch`, que era o que faltava —
todo o resto era reativo e nada avisava.

Três bugs de disco pegos por teste antes do commit, e a auditoria adversarial achou mais 3, sendo o
pior **de segurança e meu**: a credencial root do MinIO ia no argv do `docker run`, legível em
`/proc` por qualquer usuário do host compartilhado. Corrigido e provado varrendo `/proc`.

Dois achados eram de config morta no `ci-runner-governor` (pré-existente): `MAX_CPU=400` não existia
no script (teto real 500%) e `RESERVE_RAM_GB=14` nunca era lido — o runner recebia 22 GiB de 31,
invadindo a reserva da aplicação no EC2. Corrigido para 400%/17 GiB e confirmado no cgroup.

Detalhes: [`docs/architecture/ci-remote-cache.md`](https://github.com/atmanadmin/attlas-2026/blob/develop/docs/architecture/ci-remote-cache.md).
**Deixado de fora consciente:** isolamento físico (`project quota` do ext4) — não vale o downtime com
as máquinas em 42-45% e alarme em 75%; `image prune -a` no host (liberaria ~23 GB mas removeria
imagem sem container rodando, na máquina da stack legada).

### Carga desnecessária nas câmeras (29/07, entregue na #1175)

Começou fora da leva de QA e sem card, mas **os dois fixes foram parar na #1175, sob o card 2356** —
o item 2 virou a spec `PROJ-017` (lease por device). Investigação do log do device de analítico
(`10.11.20.101`), que mostrava
requisições contínuas reescrevendo o `source_id` dele. Achado duplo, detalhe completo em
[[Carga desnecessária nas câmeras - reconciler do analítico e conexões duplicadas]].

**1. O reconciler do analítico (PROJ-014) mantinha o device reiniciando.** O device de campo é
compartilhado por toda instância do Attlas (dev de cada um, o 25, produção), e o `seed.ts` hardcodava
esse IP com um `deviceSourceId` fixo, então cada stack de dev virava writer automático dele. Com o
`@Cron(EVERY_MINUTE)` no ar, duas instâncias com `deviceSourceId` diferentes entraram num looping:
`PUT /config` de `source_id` reinicia o pipeline, derruba o producer, e o tick da outra instância
encontra a mesma condição e carimba o `source_id` dela. Medido ao vivo: o `source_id` alternava entre
dois UUIDs a cada ~1 min, com o producer caindo por ~20s em cada troca. O worker feito pra manter o
stream ligado era o que mantinha o device reiniciando.

Removido inteiro (worker, spec, métrica, `ensureProducerRunning`) e o device saiu do seed. A provisão
agora só acontece no save explícito do operador. `PROJ-014` foi pra `status: superseded` com o motivo.
**Continua aberto**: o outro writer (25 ou produção) segue carimbando o device, e não tenho acesso SSH
a nenhum dos dois.

**2. Uma conexão VAPIX por tenant no mesmo hardware.** 72 conexões TCP established na porta 80 de 12
devices, exatamente 6 por device (6 = número de sistemas-tenant), cada uma com ping loop de 5s. O
bootstrap de health iterava linhas de `Camera` e o worker chaveava tudo por `cameraId`, nunca por host.
No PTZ era pior: fetch digest a cada 750ms, 2 round-trips por tick, ~16 req/s no mesmo device durante
movimento. Deduplicado por device no worker (uma conexão, escritas em leque pras linhas atreladas), o
que também cobre o caminho de cadastro sem o caller saber de nada. Esperado: 72 conexões viram 12, PTZ
cai pra ~2,7 req/s.

Rastreamento resolvido: o fix entrou na #1175 pelo card 2356, então não precisa de card próprio. O
que **continua sem dono** é o device de analítico em si — o Attlas 25 ou a produção seguem carimbando
o `source_id` e não tenho SSH em nenhum dos dois. Esse é o candidato a card que sobra, listado em
[[00 - Sem prazo (backlog)]].

A captura crua que originou os cards de QA desta sprint está em [[Ideias soltas - captura de testes e achados]].

## Considerações da daily (31/07)

O detalhe de cada ponto está em [[Attlas - Sprint 27]], e a foto do processador de Quito, na nota do
equipamento. Os quatro viraram desenho fechado no mesmo dia, mas o replanejamento do fim do dia cortou
a semana seguinte para **uma frente só, o analítico desacoplado**: renome para VMS e integração do H9
foram escopados para outra sprint, com o desenho preservado nas notas de domínio. Ver
[[Attlas - Sprint 27]].

- **Analítico de vídeo começa na semana de 03/08**, puxando de [[SOFTWARE-2200 - Prova de campo do analítico em container]] e [[SOFTWARE-2134 - Analítico de vídeo ao vivo (detecção + bounding boxes)]].
- **VM com acesso ao dispositivo de videowall a requisitar**: o gestor vai solicitar acesso remoto a uma das máquinas que alcançam o equipamento. Destrava as validações em aberto do [[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)]].
- **Renomeação: o "Video Wall" de hoje passa a ser VMS (Video Monitoring System)** e "videowall" fica reservado ao painel físico externo de Quito. Atinge front, MOD-006, contratos e i18n; candidato a card próprio.
- **Gerenciamento global do videowall externo**, não por sistema/tenant. Requisito novo do 2201, escopo de "global" a definir.
- Foto do equipamento confirma modelo **H9** (chassi "H9 VIDEO WALL SPLICER", acta da EPMMOP/Quito de 2024-07-09); firmware lido como `V1.9.7.1`, a confirmar na máquina. Foto e ficha em [[Videowall externo (NovaStar H9)]].
- Documentação do vault ajustada ao nome novo: `Docs/ms-cameras/Video Wall/` virou `Docs/ms-cameras/VMS/` ([[VMS]], 4 notas em vez de 5) e o equipamento externo ganhou nota própria. As notas de VMS foram atualizadas contra o código (banda device-truth, presets 5x5/6x6 via `customGrid`, locking otimista descartado no front).

## Fora da sprint: cards sem prazo

O que não tem prazo e não é desta semana está consolidado em [[00 - Sem prazo (backlog)]] — cards
meus espalhados pelas listas das Sprints 25, 27 e Quito, porque no ClickUp o card fica na lista onde
foi criado mesmo quando atravessa sprints, **exceto** quando essa lista de origem encerra: em 03/08,
com a Sprint 26 fechada, 2005, 2400 e os 3 do comparativo pausado (2314/2315/2316) foram movidos de
propósito para a lista da Sprint 27, por já não terem mais lista ativa. Inclui também 2201 (videowall
externo) e 2009 (escalabilidade), que seguem na Sprint 25 e 23 respectivamente.

## Notas de planejamento

- Prefixo dos cards ativos: **[QA]** (era **[Teste]**, renomeado em 27/07 junto com o rescopo).
- Pontos por sprint: campo nativo do ClickUp, preencher à mão (MCP não escreve). Estimativas a definir por card.
- Base do que será testado: tela de Eventos + detalhes (2289/2294/2295, mergeados na #951), dashboard backend (2213-2219, **mergeado em 25/07 e Closed**), streaming/WebRTC (fundação CROSS-032/TURN).
- Achado transversal na validação de 2317: Kafka local não sobe nesta máquina (`cp-kafka` possivelmente
  emulado em arm64/Colima) — bloqueia login real via `ms-organization`. Vai provavelmente afetar a
  validação de 2318/2319 também se depender de login real; ver `local_dev_machine_setup` (memória do
  Claude) pro contorno usado (JWT assinado manualmente para testar via API).
