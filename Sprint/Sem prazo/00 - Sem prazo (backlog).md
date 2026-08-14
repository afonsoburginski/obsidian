---
tags:
  - attlas
  - moc
  - sem-prazo
  - backlog
aliases:
  - "Sem prazo (backlog)"
  - "Sem prazo"
tipo: índice
escopo: cards meus (squad 2) sem data de entrega, espalhados por várias listas do ClickUp
atualizado: 2026-08-03
---

# Sem prazo (backlog)

Cards atribuídos a mim que **não têm data de entrega** e não estão comprometidos com a semana
corrente. No ClickUp eles aparecem na coluna **backlog** da lista da sprint em que foram criados, e
é isso que confunde: card criado na Sprint 23 que nunca foi feito continua morando na lista da
Sprint 23, não migra sozinho para a lista da semana atual.

**Prática desde 03/08**: quando a sprint de origem de um card `backlog` encerra (a lista fica sem
janela de datas ativa), o card é movido a mão para a lista da sprint corrente, mantido em `backlog`.
Não é reabrir prazo, é só não deixar card sem lista ativa. Foi feito com 2005/2400 (que na verdade
saíram do sem-prazo, ver decisão abaixo) e com 2314/2315/2316 ao virar Sprint 27.

Semântica do board (para não reinterpretar): **backlog** = não é dessa semana, **to do** = é dessa
semana, **in progress** = pegando agora.

## Situação em 31/07

| Card | Título | Status ClickUp | Lista de origem | Nota |
| --- | --- | --- | --- | --- |
| [SOFTWARE-2314](https://app.clickup.com/t/86ajpntf3) | Performance do streaming de vídeo (banda, latência, média) | backlog | Sprint 27 (movido de Sprint 26 em 03/08) | [[SOFTWARE-2314 - Performance do streaming de vídeo]] |
| [SOFTWARE-2315](https://app.clickup.com/t/86ajpntp1) | Comparativo Attlas 25x26: video wall | backlog | Sprint 27 (movido de Sprint 26 em 03/08) | [[SOFTWARE-2315 - Comparativo Attlas 25x26 - video wall]] |
| [SOFTWARE-2316](https://app.clickup.com/t/86ajpntuq) | Comparativo Attlas 25x26: hardware e streaming | backlog | Sprint 27 (movido de Sprint 26 em 03/08) | [[SOFTWARE-2316 - Comparativo Attlas 25x26 - arquitetura de hardware e streaming]] |
| ~~[SOFTWARE-2201](https://app.clickup.com/t/86ajj1zdg)~~ | Saiu do sem prazo em 10/08: virou o card da especificação do alvo videowall, submódulo do VMS, comprometido na Sprint 28 (nota movida para a pasta 28) | to do | Sprint 28 | [[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)]] |
| [SOFTWARE-2200](https://app.clickup.com/t/86ajj1xv4) | Prova de campo do analítico em container até a timeline do detector | backlog | Sprint 28 (voltou ao sem prazo em 10/08 com a frente do analítico) | [[SOFTWARE-2200 - Prova de campo do analítico em container]] |
| [SOFTWARE-2134](https://app.clickup.com/t/86ajh9v5j) | Analítico de vídeo ao vivo (detecção + bounding boxes) | Closed em 31/07 (entregue em 15/07; resíduo no SOFTWARE-2391) | Sprint 23 | [[SOFTWARE-2134 - Analítico de vídeo ao vivo (detecção + bounding boxes)]] (fica na pasta 24) |
| [SOFTWARE-2009](https://app.clickup.com/t/86ajc71x6) | ms-cameras: escalabilidade horizontal em Kubernetes | backlog | Sprint 28 (home movida da Sprint 23 em 10/08; sobra na lista da 27 removida) | [[SOFTWARE-2009 - Escalabilidade horizontal do ms-cameras em Kubernetes]] |
| ~~[SOFTWARE-2005](https://app.clickup.com/t/86ajc6uzx)~~ | Saiu do sem prazo: rescopado em 31/07 para permissões nas rotas de câmeras (não transferido para o squad 3, ver decisão abaixo), movido para a lista da 27 em 03/08 | to do | Sprint 27 | [[SOFTWARE-2005 - Permissões nas rotas de câmeras - mapa das 86 rotas]] |
| [SOFTWARE-1263](https://app.clickup.com/t/86ah842t3) | Unificar pastas do Prisma e Database | backlog, prioridade baixa | Quito | sem nota |
| [SOFTWARE-1363](https://app.clickup.com/t/86aha9whm) | Plano de escalabilidade de streaming em HLS + Cloudflare | em teste (data de 11/05, vencida) | Quito | sem nota |

## Frente do analítico em container: sem prazo desde 10/08

Os 14 cards da frente voltaram ao sem prazo. A Sprint 27 tinha feito dela a frente única da semana,
mas fechou em 09/08 **sem nenhuma entrega** porque a semana foi de folga, e a Sprint 28 foi para o
renome do VMS e o videowall externo. As 14 PRs seguem abertas em draft, as specs continuam válidas, e
retomar é replanejamento e não retrabalho. Status ClickUp de todos: `backlog` na lista da Sprint 28.

| Card | Título | PR em draft | Nota |
| --- | --- | --- | --- |
| [SOFTWARE-2385](https://app.clickup.com/t/86aju62ta) | Como o vídeo chega no analítico em container | [#1342](https://github.com/atmanadmin/attlas-2026/pull/1342) | [[SOFTWARE-2385 - Alimentação de vídeo do analítico em container]] |
| [SOFTWARE-2386](https://app.clickup.com/t/86aju62w6) | Especificação do analítico de vídeo em container | [#1343](https://github.com/atmanadmin/attlas-2026/pull/1343) | [[SOFTWARE-2386 - Especificação do analítico de vídeo em container]] |
| [SOFTWARE-2387](https://app.clickup.com/t/86aju62yc) | Especificação do connector de laço virtual | [#1345](https://github.com/atmanadmin/attlas-2026/pull/1345) | [[SOFTWARE-2387 - Especificação do connector de laço virtual]] |
| [SOFTWARE-2394](https://app.clickup.com/t/86aju7bxa) | Serviço, imagem e ingestão do stream | [#1346](https://github.com/atmanadmin/attlas-2026/pull/1346) | [[SOFTWARE-2394 - Analítico em container - serviço, imagem e ingestão]] |
| [SOFTWARE-2395](https://app.clickup.com/t/86aju7c1v) | Detecção de objetos por frame | [#1347](https://github.com/atmanadmin/attlas-2026/pull/1347) | [[SOFTWARE-2395 - Analítico em container - detecção por frame]] |
| [SOFTWARE-2396](https://app.clickup.com/t/86aju7c6y) | Laço virtual e ocupação da região | [#1349](https://github.com/atmanadmin/attlas-2026/pull/1349) | [[SOFTWARE-2396 - Analítico em container - laço virtual e ocupação]] |
| [SOFTWARE-2397](https://app.clickup.com/t/86aju7cg8) | Publicar a ocupação no Kafka | [#1350](https://github.com/atmanadmin/attlas-2026/pull/1350) | [[SOFTWARE-2397 - Analítico em container - publicar ocupação no Kafka]] |
| [SOFTWARE-2398](https://app.clickup.com/t/86aju7cjb) | Escala: câmeras por instância e distribuição | [#1351](https://github.com/atmanadmin/attlas-2026/pull/1351) | [[SOFTWARE-2398 - Escala do analítico - câmeras por instância]] |
| [SOFTWARE-2389](https://app.clickup.com/t/86aju633j) | Vínculo região da câmera para endereço de detector | [#1352](https://github.com/atmanadmin/attlas-2026/pull/1352) | [[SOFTWARE-2389 - Vínculo região da câmera para endereço de detector]] |
| [SOFTWARE-2390](https://app.clickup.com/t/86aju635n) | Connector: ocupação vira evento de detector | [#1353](https://github.com/atmanadmin/attlas-2026/pull/1353) | [[SOFTWARE-2390 - Connector de laço virtual - ocupação vira evento de detector]] |
| [SOFTWARE-2388](https://app.clickup.com/t/86aju631k) | Analítico embarcado no mesmo contrato de ocupação | [#1354](https://github.com/atmanadmin/attlas-2026/pull/1354) | [[SOFTWARE-2388 - Analítico embarcado no mesmo contrato de ocupação]] |
| [SOFTWARE-2391](https://app.clickup.com/t/86aju63bv) | Pendências do analítico embarcado | [#1355](https://github.com/atmanadmin/attlas-2026/pull/1355) | [[SOFTWARE-2391 - Pendências do analítico embarcado]] |
| [SOFTWARE-2392](https://app.clickup.com/t/86aju63t9) | Recorte da atuação via ACOM | [#1356](https://github.com/atmanadmin/attlas-2026/pull/1356) | [[SOFTWARE-2392 - Recorte da atuação via ACOM (docs-only)]] |
| [SOFTWARE-2200](https://app.clickup.com/t/86ajj1xv4) | Prova de campo até a timeline do detector | [#1357](https://github.com/atmanadmin/attlas-2026/pull/1357) | [[SOFTWARE-2200 - Prova de campo do analítico em container]] |

Passo barato quando a frente voltar: tirar de draft as três PRs de especificação na ordem 2385, 2386 e
2387, porque review não consome dia de implementação. Contexto completo do planejamento em
[[Attlas - Sprint 27]].

## Decisão por card (refino de 31/07)

Levantamento feito contra o código da develop, não contra a descrição do card. Contexto em
[[Attlas - Sprint 27]].

### 2009 escalabilidade: FECHAR, residual em 3 cards

A fatia 1 do épico saiu por fora, dentro da PR #1175 (card 2356), em 31/07: adapter Redis do Socket.IO
virou lib em `@attlas/core-messaging/socketio` com gauge próprio, `redis-cameras` provisionado, e
single-writer por device via lease Redis (PROJ-017). Dois jobs que eu listava como dívida já tinham
coordenação: `correlate-events` usa advisory lock do Postgres e o sampler de disponibilidade usa lease
sticky de propósito (o baseline de bytes é por processo).

Fechar o card com essa evidência e abrir o residual, porque guarda-chuva aberto é o que gerou a
`CROSS-043` fantasma (citada como dependência em dois specs sem nunca ter existido):

1. **Unificar o adapter e cobrir quem ficou fora**: `ms-controllers` e `ms-execution-plans` mantêm cópias locais divergentes (a do controllers nem expõe o gauge), e `ms-pmv` e `ms-communication-channels` não usam adapter nenhum. No communication-channels isso é notificação de usuário sumindo em silêncio, o pior modo de falha da lista.
2. **Lease do worker de métricas ao vivo**: é o único defeito *criado* por ligar o adapter. O worker roda por intervalo com baseline em memória e docblock que assume salas locais ao processo; com o adapter ligado, N réplicas empurram N deltas conflitantes para o mesmo cliente.
3. **Reescrever o UC-029 de sessão HLS**: o draft atual propõe lease em memória, que não resolve N réplicas. O problema real é o registry de sessão por processo (viewerCount, timer de graça e handle do ffmpeg), o dedup de criação por processo e o reaper que varre o registry local mas mata path do MediaMTX que é compartilhado. Sprint própria, e resolver a colisão de ID `UC-029` ao reescrever.

Fica fora: os dois crons diários/horários rodando em N réplicas (desperdício, não corrupção, porque
são idempotentes) e a unificação dos dois mecanismos de lock que já divergiram entre ms-cameras e
ms-controllers.

### 2005 permissões: SUPERSEDIDO — não foi transferido, foi rescopado

Levantamento inicial do dia propunha transferir o 2005 para o squad 3, porque as 6 MOD e cerca de 30
atômicas de permissão vivem em `apps/ms-organization/docs/` sob o Hadson, com runtime de autorização e
perfis de acesso já `completed` (trabalho restante já tem card dele: SOFTWARE-2329 e SOFTWARE-2292).

Decisão final do dia, registrada em [[Attlas - Sprint 26]], foi diferente: em vez de transferir, o 2005
foi **rescopado** para o recorte que é nosso — o mapa das 86 rotas do `ms-cameras` (que não tem nenhum
decorator de autorização) mais as chaves que faltam no catálogo. O achado colateral (aplicar o
enforcement) virou card próprio, o [[SOFTWARE-2400 - Aplicar enforcement de permissão nas rotas de câmeras|2400]].
Os dois saíram do sem-prazo: moraram na lista da Sprint 27 de 03/08 a 09/08 e, com a 27 encerrada sem
os cards serem tocados, foram movidos para a lista da Sprint 28 em 10/08, onde seguem (ver
[[Attlas - Sprint 28]]).

### 1263 unificar Prisma: REESCOPAR e sair do squad 2

São 4 layouts entre 10 serviços, 3 layouts de módulo de acesso, 2 nomes de símbolo, 2 destinos de
client gerado e 2 extensões de `prisma.config`. Pior: **três docs de arquitetura se contradizem** sobre
qual é a pasta correta, e a que o `monorepo-structure` manda ninguém segue. Enquanto isso não é
decidido, implementar é renomear 10 serviços para um alvo indefinido.

Vira: um card de ADR docs-only (escolher `src/database/`, que 4 de 10 já usam e a tooling de migration
assume, e corrigir os três docs na mesma PR) mais um card de migração por serviço atribuído ao squad
dono. Squad 2 pega só `ms-cameras` (já conforme) e `ms-detector-history`. O 1263 vira guarda-chuva sem
assignee meu.

### 1363 HLS e Cloudflare: MANTER no backlog, reescopado

A entrega já existe atrás do token de estratégia de entrega (`cloudflare-hls-delivery.strategy.ts` com
headers de CDN e a variante direta). O que falta não é código, é dado de decisão. Três pedaços:

1. **Higiene de ID, cabe de carona no card 1 da Sprint 27**: existem duas `CROSS-032` (TURN e visibilidade operacional). Renumerar a de TURN.
2. **Instrumentação**: o Prometheus de streaming tem 2 métricas, nenhuma por câmera e nenhum histograma. Sem histograma de TTFF por estratégia não existe comparativo. O banco já dá o resto (amostra de TTFF por abertura, janela de 5 min com latência e bitrate médios, rollup de 90 dias, bitrate device-truth).
3. **Medição comparativa** direto x Cloudflare, que depende de tráfego público real.

Documentar na spec de TURN o teto de cerca de 40 sessões públicas simultâneas, que hoje só existe no
`turnserver.conf` e é limite de produto, não detalhe de infra.

### 2314 / 2315 / 2316 comparativo: sem ação

Seguem pausados desde 27/07. Quando voltarem, dependem da instrumentação do item 2 do 1363: hoje não
existe métrica por câmera para sustentar um comparativo honesto. **03/08**: a lista da Sprint 26
encerrou, então os três foram movidos para a lista da Sprint 27 no ClickUp, mantidos em `backlog` —
não entram no foco único do analítico desta semana.

### 2200: virou a frente única da Sprint 27

Atualizado no replanejamento do fim do dia 31/07. O 2200 não entrou como spec na fila: o analítico
desacoplado virou **a** frente da semana, com 6 cards comprometidos (2385 a 2390) cobrindo alimentação de
vídeo, motor fora da câmera, spec do connector, ocupação normalizada, vínculo de detector e publicação do
evento raw. O card 2200 foi movido para a lista da 27 e reescopado como a prova ponta a ponta, com a
atuação no controlador saindo para o 2392. Ver [[Attlas - Sprint 27]].

### 2201: saiu do sem prazo em 10/08, comprometido na Sprint 28

A integração do videowall externo H9 estava comprometida no plano da manhã de 31/07 e foi escopada para
outra sprint no replanejamento. A sprint dele chegou: a [[Attlas - Sprint 28]] fez do videowall externo
uma das duas frentes da semana, com o 2201 comprometido como o card da especificação do módulo e o resto
da frente fatiado em cards novos (cadastro, catálogo de capacidades, fontes IPC, layout/preset, brilho e
tela). O desenho estava preservado em [[Videowall externo (NovaStar H9)]], então foi planejamento e não
retrabalho, como previsto.

### 2134: card defasado no ClickUp

Entregue e validado ao vivo em 15/07 (PR #790), mas o card segue em `to do` com prioridade alta. O que
sobra é higiene de doc e dois defeitos pequenos, e virou o SOFTWARE-2391, na fila da Sprint 27.

## Candidatos a card (trabalho sem card hoje)

- ~~**Renomear "Video Wall" para VMS**~~: saiu dos candidatos em 10/08, virou as três fases comprometidas da [[Attlas - Sprint 28]] (cards a criar no ClickUp). Alcance arquivo por arquivo em [[VMS]].
- **Gerenciamento global do videowall externo**: absorvido pelo RF-7 do 2201.
- **Dono explícito do device de analítico**: o Attlas 25 ou a produção seguem carimbando o `source_id` e não tenho SSH em nenhum dos dois. Detalhe em [[Carga desnecessária nas câmeras - reconciler do analítico e conexões duplicadas]].
- **Extrair o intersection-picker do `camera-creation-settings-step`** (cerca de 700 linhas, já tem `TODO(refactor)`), acordado no review da #1137.
- **Prefixo de rota do ms-cameras**: é o único serviço que ocupa um segmento de raiz (`/api/dashboard`) em vez de prefixo próprio. Mudar é breaking em 7 controllers mais Kong, service do front e specs.
- **Autorização no `ms-detector-history`**: não importa o módulo de auth. Ainda sem card — a parte do `ms-cameras` já tem card próprio (2005 + 2400, ver acima).
- **Consolidar os dois sockets do analítico ao vivo** no front (um por stream, mesmo namespace e sala).
