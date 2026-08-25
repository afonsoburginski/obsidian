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
atualizado: 2026-08-25
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
| ~~[SOFTWARE-2200](https://app.clickup.com/t/86ajj1xv4)~~ | Saiu do sem prazo em 25/08: comprometido na [[Attlas - Sprint 32]] (nota movida para a pasta 32), pontos (2) setados no ClickUp | backlog | Sprint 29 (confirmado por leitura direta em 25/08 - nunca chegou a mudar de lista) | [[SOFTWARE-2200 - Prova de campo do analítico em container]] |
| [SOFTWARE-2134](https://app.clickup.com/t/86ajh9v5j) | Analítico de vídeo ao vivo (detecção + bounding boxes) | Closed em 31/07 (entregue em 15/07; resíduo no SOFTWARE-2391) | Sprint 23 | [[SOFTWARE-2134 - Analítico de vídeo ao vivo (detecção + bounding boxes)]] (fica na pasta 24) |
| [SOFTWARE-2009](https://app.clickup.com/t/86ajc71x6) | ms-cameras: escalabilidade horizontal em Kubernetes | backlog | Sprint 28 (home movida da Sprint 23 em 10/08; sobra na lista da 27 removida) | [[SOFTWARE-2009 - Escalabilidade horizontal do ms-cameras em Kubernetes]] |
| ~~[SOFTWARE-2005](https://app.clickup.com/t/86ajc6uzx)~~ | Saiu do sem prazo: rescopado em 31/07 para permissões nas rotas de câmeras (não transferido para o squad 3, ver decisão abaixo), movido para a lista da 27 em 03/08 | to do | Sprint 27 | [[SOFTWARE-2005 - Permissões nas rotas de câmeras - mapa das 86 rotas]] |
| [SOFTWARE-1263](https://app.clickup.com/t/86ah842t3) | Unificar pastas do Prisma e Database | backlog, prioridade baixa | Quito | sem nota |
| [SOFTWARE-1363](https://app.clickup.com/t/86aha9whm) | Plano de escalabilidade de streaming em HLS + Cloudflare | em teste (data de 11/05, vencida) | Quito | sem nota |
| [SOFTWARE-2687](https://app.clickup.com/t/86ak5e33b) | Saturação de banda de saída da EC2 sob carga concorrente de streaming (mediamtx) | backlog | criado em 24/08 na lista da Sprint 30 (vigente); achado em 24/08, investigação de instabilidade de câmeras relatada pelo usuário (causa raiz + oscilação WHEP↔HLS no videowall como achado relacionado) | [[Streaming - Saturação de banda de saída sob carga concorrente]] |
| [SOFTWARE-2686](https://app.clickup.com/t/86ak5e32x) | Suportar até 4 laços virtuais por câmera | backlog | criado em 24/08 na lista da Sprint 30 (vigente); requisito decidido nas notas de alinhamento, fora da Sprint 30/31 por tamanho. Pontos (5) setados em 25/08 | [[Analítico - Suportar até 4 laços virtuais por câmera]] |

## Frente do analítico em container: reescopada em 24/08, ClickUp reconciliado em 25/08

> [!success] Deixou de ser sem-prazo: virou a frente do Analítico nas Sprints 30, 31 e 32
> Esta seção registrava desde 10/08 que os 14 cards da frente tinham voltado ao sem prazo, depois de a
> Sprint 27 fechar em 09/08 **sem nenhuma entrega** (semana de folga) e a Sprint 28 ir para o renome do
> VMS e o videowall externo. Em **24/08** isso mudou: uma auditoria de código do domínio (embarcado,
> servidor, ACOM/ATSPM) reorganizou o escopo, e a frente virou a frente do Analítico nas
> [[Attlas - Sprint 30]], [[Attlas - Sprint 31]] e [[Attlas - Sprint 32]]. No mesmo dia, as spec das 14
> PRs foram declaradas **fechadas no vault** no reescopo - o que era verdade para as PRs no GitHub
> (fechadas de fato), mas **não** para os cards de ClickUp que sustentavam elas.

> [!danger] Correção de 25/08: os 12 cards de ClickUp NUNCA saíram da Sprint 29, e precisam ser deletados
> Checagem direta contra a API do ClickUp em 25/08 achou os 12 cards (`SOFTWARE-2385` a `2392`, `2394` a
> `2397`) ainda abertos, em `backlog`, todos na lista da **Sprint 29** (17/8-23/8) - nunca migrados pra
> lista nenhuma, muito menos fechados. A nota anterior desta seção presumia que "fechar a PR" também
> fechava o card do ClickUp; não fechava. **11 desses 12 são duplicados do trabalho que já foi recriado
> como cards novos** nas Sprints 31/32 (mapa abaixo) e precisam ser deletados do ClickUp - ficaram
> pendentes de permissão (classificador do Claude Code bloqueou `delete_task` em 25/08, tanto via MCP
> quanto via REST). O 12º (`2392`, recorte da atuação via ACOM) **não tem substituto** e continua sem
> prazo, não deve ser deletado.

O que aconteceu com cada card, e o card novo que o substitui:

| Card antigo (Sprint 29, ainda aberto) | Substituto criado em 25/08 | Ação |
| --- | --- | --- |
| **2385** (como o vídeo chega no analítico) | [[Analítico servidor - ADR de alimentação e SPEC do ms-virtual-loop]] (`SOFTWARE-2692`) | deletar |
| **2386** (spec do analítico em container) | `SOFTWARE-2692` (mesma spec, ADR + SPEC juntos) | deletar |
| **2387** (spec do connector de laço virtual) | resolvido sem substituto - não existe mais serviço connector separado (ver [[Attlas - Sprint 31]]) | deletar |
| **2388** (embarcado no contrato comum) | [[Analítico servidor - Embarcado no contrato de ocupação comum]] (`SOFTWARE-2694`) | deletar |
| **2389** (vínculo região-detector) | [[Analítico servidor - Vínculo região para endereço de detector]] (`SOFTWARE-2698`), rescopado sobre a entidade da Sprint 30 | deletar |
| **2390** (connector: ocupação vira evento) | [[Analítico servidor - Tradução de endereço e publicação do detector raw]] (`SOFTWARE-2699`) | deletar |
| **2391** (pendências do embarcado) | absorvido pelo [[Analítico - Writer do deviceSourceId e higiene do embarcado]] (`SOFTWARE-2682`, Sprint 30) | deletar |
| **2392** (recorte da atuação via ACOM) | sem substituto - segue sem prazo, vive no `ms-controllers` | **manter** |
| **2394** (serviço, imagem, ingestão) | [[Analítico servidor - Serviço, imagem e ingestão do stream]] (`SOFTWARE-2695`) | deletar |
| **2395** (detecção por frame) | [[Analítico servidor - Detecção de objetos por frame]] (`SOFTWARE-2696`) | deletar |
| **2396** (laço virtual e ocupação) | [[Analítico servidor - Laço virtual e ocupação da região]] (`SOFTWARE-2697`) | deletar |
| **2397** (publicar ocupação no Kafka) | [[Analítico servidor - Contrato de ocupação]] (`SOFTWARE-2693`) | deletar |
| 2398 (escala) | mantido com o mesmo ID, comprometido na [[Attlas - Sprint 32]], pontos (2) setados | manter, sem ação |
| 2200 (prova de campo) | mantido com o mesmo ID, comprometido na [[Attlas - Sprint 32]], pontos (2) setados | manter, sem ação |

Os 10 cards comprometidos da Sprint 30 (`2676` a `2685`) e os 8 cards novos da Sprint 31 (`2692` a
`2699`) já existem no ClickUp, todos na lista da **Sprint 30** (única lista vigente em 25/08 - Sprint 31 e
32 ainda não têm lista própria, por decisão do user), tag `squad 2`, com pontos setados. Ver
[[Attlas - Sprint 30]], [[Attlas - Sprint 31]] e [[Attlas - Sprint 32]] para o detalhe de cada um.

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
`CROSS-043` fantasma (citada como dependência em specs sem nunca ter existido - **estado em 24/08**: não
é só fantasma, é colisão de ID, porque a PR #1342 em draft cria um `CROSS-043` para outra decisão; a
resolução está registrada em [[Status em tempo real - Arquitetura e estratégias]] e virou card na
[[Attlas - Sprint 30]]):

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

### 2200: virou a frente única da Sprint 27, hoje comprometido na Sprint 32

Atualizado no replanejamento do fim do dia 31/07. O 2200 não entrou como spec na fila: o analítico
desacoplado virou **a** frente da semana, com 6 cards comprometidos (2385 a 2390) cobrindo alimentação de
vídeo, motor fora da câmera, spec do connector, ocupação normalizada, vínculo de detector e publicação do
evento raw. O card 2200 foi movido para a lista da 27 e reescopado como a prova ponta a ponta, com a
atuação no controlador saindo para o 2392. Ver [[Attlas - Sprint 27]]. Em 25/08, virou card comprometido
da [[Attlas - Sprint 32]] - ver a seção "Frente do analítico em container" acima.

### 2201: saiu do sem prazo em 10/08, comprometido na Sprint 28

A integração do videowall externo H9 estava comprometida no plano da manhã de 31/07 e foi escopada para
outra sprint no replanejamento. A sprint dele chegou: a [[Attlas - Sprint 28]] fez do videowall externo
uma das duas frentes da semana, com o 2201 comprometido como o card da especificação do módulo e o resto
da frente fatiado em cards novos (cadastro, catálogo de capacidades, fontes IPC, layout/preset, brilho e
tela). O desenho estava preservado em [[Videowall externo (NovaStar H9)]], então foi planejamento e não
retrabalho, como previsto.

### 2134: card defasado no ClickUp

Entregue e validado ao vivo em 15/07 (PR #790), mas o card segue em `to do` com prioridade alta. O que
sobra é higiene de doc e dois defeitos pequenos, e virou o SOFTWARE-2391, na fila da Sprint 27 (2391
segue aberto na Sprint 29 e é um dos 11 candidatos a deleção - ver seção acima).

## Candidatos a card (trabalho sem card hoje)

- ~~**Renomear "Video Wall" para VMS**~~: saiu dos candidatos em 10/08, virou as três fases comprometidas da [[Attlas - Sprint 28]] (cards a criar no ClickUp). Alcance arquivo por arquivo em [[VMS]].
- **Gerenciamento global do videowall externo**: absorvido pelo RF-7 do 2201.
- **Dono explícito do device de analítico**: o Attlas 25 ou a produção seguem carimbando o `source_id` e não tenho SSH em nenhum dos dois. Detalhe em [[Carga desnecessária nas câmeras - reconciler do analítico e conexões duplicadas]].
- **Extrair o intersection-picker do `camera-creation-settings-step`** (cerca de 700 linhas, já tem `TODO(refactor)`), acordado no review da #1137.
- **Prefixo de rota do ms-cameras**: é o único serviço que ocupa um segmento de raiz (`/api/dashboard`) em vez de prefixo próprio. Mudar é breaking em 7 controllers mais Kong, service do front e specs.
- **Autorização no `ms-detector-history`**: não importa o módulo de auth. Ainda sem card — a parte do `ms-cameras` já tem card próprio (2005 + 2400, ver acima).
- **Consolidar os dois sockets do analítico ao vivo** no front (um por stream, mesmo namespace e sala).
