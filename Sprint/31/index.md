---
tags:
  - attlas
  - sprint-31
  - moc
  - analitico
aliases:
  - "Attlas - Sprint 31"
  - "Sprint 31 - o que entrega"
sprint: Sprint 31 (31/8/26 - 6/9/26)
status: "FECHADA em 05/09. Planejada em 24/08 como a segunda das três semanas da frente do analítico. Frente única - analítico servidor (Virtual Loop em container), respecificado do zero depois do fechamento das 14 PRs da Sprint 27. Comprometido 32 pts em 10 cards. Revisada em 28/08 a pedido do user ("precisa fazer sentido"): entrou o card 2b (derivacao de ocupacao compartilhada, SOFTWARE-2798), entrou a tela de metricas do Laco Virtual (SOFTWARE-2797), e a pilha unica de 8 virou um grafo com caminho critico de 18 pts, porque os cards 7 e 9 nunca dependeram da escada. Lista própria criada no ClickUp em 28/08 e os 8 cards (SOFTWARE-2692 a 2699) migrados da lista da Sprint 30 com pontos preservados; em 28/08 todos ainda em backlog. Em 28/08 a Sprint 30 fechou os 11 cards, então esta semana começa sem rolo herdado. Em 31/08 os 10 cards saíram do backlog no mesmo dia e todos têm PR aberta (2365, 2366, 2367, 2368, 2369, 2371, 2372, 2373, 2376, 2380), nenhuma em draft, nenhuma revisada nem mergeada ainda - a semana abriu com as 10 frentes em paralelo, não em cascata. Em 03/09 as nove PRs de backend mergearam e sobrou só o SOFTWARE-2797, que virou duas PRs: a #2380 em changes requested por três valores CSS sem token e a #2517 aprovada e empilhada sobre ela. O resíduo SOFTWARE-2794 que a nota de 28/08 apontava mergeou (PR 2306). Prazo externo do módulo: 18/09. FECHADA em 05/09 com 10 de 10 cards: a tela do Laço Virtual entrou pelas #2380 e #2517, e no sábado 05/09 mergearam mais quatro PRs fora dos 32 pts (#2518, #2528, #2529, #2530)."
atualizado: 2026-09-09
---

# Sprint 31 - o que entrega

Porta de entrada da semana de **31/08 a 06/09**. Frente única: **analítico servidor** - o Virtual Loop
rodando em container nosso, capaz de olhar câmera comum em vez de só Axis com app embarcado. Esta nota
tem duas partes: o que a semana entrega, e o planejamento detalhado logo abaixo.

> [!success] Fechou em 05/09: 10 de 10 cards, e mais quatro PRs fora do plano
> A tela do Laço Virtual entrou pelas [#2380](https://github.com/atmanadmin/attlas-2026/pull/2380) e
> [#2517](https://github.com/atmanadmin/attlas-2026/pull/2517), em 03 e 04/09, e fechou o
> `SOFTWARE-2797`, o último card aberto. No sábado 05/09 entraram ainda quatro PRs que não estavam nos
> 32 pts:
>
> | PR | O que entrou |
> | --- | --- |
> | [#2518](https://github.com/atmanadmin/attlas-2026/pull/2518) | Provisionamento e verificação do peso do modelo de detecção. Sem ela o `/health/ready` nunca ficava verde: ninguém subia o peso no object storage. Passou a gravar `model-version` e `model-sha256` como metadado, e o loader recusa ready quando discordam |
> | [#2528](https://github.com/atmanadmin/attlas-2026/pull/2528) | `MOD-002`: posse de câmera por lease em Redis no lugar do hash estático, recusa no boot de índice de shard fora da faixa, política de saturação, saúde real da instância SERVER e o funil de período da tela de Métricas |
> | [#2529](https://github.com/atmanadmin/attlas-2026/pull/2529) | Pedestre vira agente de detecção ao lado de veículo, com histerese própria (entrada 500 ms, saída 1500 ms) e endereço de detector por propósito |
> | [#2530](https://github.com/atmanadmin/attlas-2026/pull/2530) | Remoção dos scaffolds `ms-atspm`, `ms-dai` e `ms-connector-virtual-loop`, com toda a infra exclusiva deles (compose, Kong, Prometheus, `setup-env`, `wait-for-infra.sh`) |
>
> Duas consequências que atravessam para a [[Attlas - Sprint 32]]: a #2528 **adianta o mecanismo** do
> card 1 de lá e deixa só a medição do teto, e a #2530 fecha a contagem do monorepo em **25
> microsserviços** (os documentos canônicos diziam 27 e o repo tinha 28).

> [!success] Começa limpa: a Sprint 30 fechou em 28/08
> A fundação de que esta semana depende (entidade Analítico, geometria de região em banco, writer do
> vínculo, compatibilidade por arquitetura, dedup de incidente) está **mergeada na develop**. Os 11
> cards da Sprint 30 fecharam, incluindo os 3 `[Front]` que estavam em review.
>
> **Resíduo resolvido em 31/08**: `SOFTWARE-2794` (controles de tratamento do incidente) mergeou pela
> [#2306](https://github.com/atmanadmin/attlas-2026/pull/2306). A semana não herdou nada.

## Features (o que o sistema passa a fazer)

| Feature | Onde | Estado |
| --- | --- | --- |
| Decisão registrada de **de onde vem o vídeo** do analítico servidor, e o serviço especificado | ADR + SPEC | 🔄 [#2365](https://github.com/atmanadmin/attlas-2026/pull/2365) aberta |
| **Contrato único de ocupação de região** - embarcado e servidor passam a emitir a mesma forma de evento, para o consumidor não precisar saber a origem | `libs/contracts`, domínio `virtual-loop` (já existe, hoje só com `IVirtualLoopConfig`) | 🔄 [#2366](https://github.com/atmanadmin/attlas-2026/pull/2366) aberta |
| **Uma só derivação de presença** - histerese e transição em peça compartilhada, para os dois caminhos não virarem duas máquinas de estado | `@attlas/utils` | 🔄 [#2367](https://github.com/atmanadmin/attlas-2026/pull/2367) aberta |
| Analítico **embarcado** passa a publicar nesse contrato comum | `ms-cameras` | 🔄 [#2368](https://github.com/atmanadmin/attlas-2026/pull/2368) aberta |
| Container de pé **decodificando frame** do relay, sem nunca receber credencial de câmera | `ms-virtual-loop` | 🔄 [#2369](https://github.com/atmanadmin/attlas-2026/pull/2369) aberta |
| **Detecção de veículo por frame**, com o custo por resolução medido (é esse número que define o teto de câmeras por instância) | `ms-virtual-loop` | 🔄 [#2371](https://github.com/atmanadmin/attlas-2026/pull/2371) aberta |
| Caixa detectada **vira ocupação de laço**, com histerese, publicando só na transição | `ms-virtual-loop` | 🔄 [#2372](https://github.com/atmanadmin/attlas-2026/pull/2372) aberta |
| **Vínculo região da câmera para endereço de detector**, com unicidade por endereço | `ms-cameras` | 🔄 [#2373](https://github.com/atmanadmin/attlas-2026/pull/2373) aberta |
| Ocupação **traduzida para evento de detector** e publicada no mesmo tópico do laço físico | `ms-virtual-loop` | 🔄 [#2376](https://github.com/atmanadmin/attlas-2026/pull/2376) aberta |

## Telas

**Uma tela: métricas do Laço Virtual** (`SOFTWARE-2797`, 5 pts). Fluxo, Volume, Ocupação e Tempo de
ocupação, mais a tabela de leitura crua, na aba **Métricas** do módulo `analytics`, que hoje cai num
`SectionPlaceholder` vazio. Detalhe em [[Analítico servidor - Métricas do Laço Virtual (front)]].

> [!success] Ela entra porque NÃO depende desta sprint
> [[Analítico - Frontend do attlas-design]] classificava esta superfície como "esperar Sprint 31, não
> existe backend antes do servidor de VL", e foi por isso que ela ficou fora das três sprints do
> analítico. **Conferido no código em 28/08, está errado.** A tela não lê o analítico, lê o histórico de
> detector: as quatro métricas do catálogo saem inteiras de
> `GET /api/detector-history/detectors/:id/metrics` (`flow`, `vehicleCount`, `occupation`, e o tempo de
> ocupação por `occupation × duration`), o `ms-detector-history` tem 217 arquivos contra 6 do scaffold
> do scaffold que sobraria para o ATSPM, e o `web-attlas` já tem o `DetectorHistoryService` que o `traffic-model` reusa.
>
> Antes do card 8 mergear, a tela mostra os detectores de laço físico e **estado vazio honesto** para a
> tecnologia `VIRTUAL_LOOP` - nunca mock. Quando o card 8 publica em `attlas.detectors.raw`, ela passa a
> mostrar o laço virtual sem uma linha de frontend mudar. É a demonstração do resultado da escada, no
> dia em que a escada fecha.

**As métricas ATSPM continuam fora**, e aí a razão é real: o ATSPM não existe em backend nenhum (e desde 31/08 é capacidade do analítico servidor, não serviço próprio), não há
backend nenhum, e não é esta sprint que constrói.

O resto da semana é backend e contrato: o caminho do dado.

> [!success] Escala: três peças entraram em 31/08, além do escopo original dos cards
> Depois da conversa de arquitetura de 31/08 ([[Analítico - Topologia de serviço do analítico de vídeo]]),
> entraram no `SOFTWARE-2695` e no `SOFTWARE-2696`, dentro do escopo de cada um:
> **inferência sobre o recorte da região** (corta a área inferida em cerca de um décimo),
> **partição por câmera** (`SHARD_INDEX`/`SHARD_COUNT`, para o pool poder ter réplica sem
> decodificar a mesma câmera duas vezes) e **cadência de decode medida em separado** da inferência.
> O que continua na [[Attlas - Sprint 32]] é a partição **dinâmica** e o teto medido (`MOD-002`).

## Explicitamente NÃO entrega

- **Escala** (quantas câmeras por instância) e **prova de campo** ponta a ponta - vão para a
  [[Attlas - Sprint 32]], porque só fazem sentido com esta cadeia de pé.
- **Telas de métricas ATSPM** - sem backend: o ATSPM não existe, nem como serviço nem como capacidade construída. As do Laço Virtual entram, ver acima.
- **ACOM e ATSPM** - seguem sem prazo, em [[00 - Sem prazo (backlog)]].

---

# Planejamento detalhado

## Por que esta sprint reescreve spec em vez de mergear a que existia

As 14 PRs da Sprint 27 foram **fechadas em 24/08** no reescopo. Elas especificavam exatamente esta cadeia,
com cerca de 1.900 linhas internamente consistentes, mas assumiam uma fundação que não existia. Fechar foi
decisão de escopo, não descarte de conhecimento:

- As **branches `cameras/docs/SOFTWARE-*` não foram deletadas** - o texto integral segue recuperável.
- As **decisões estruturais estão preservadas** em [[Analítico - Arquitetura e estratégias]]: relay do
  `ms-cameras` no substream de menor resolução como fonte de vídeo, NestJS com `ffmpeg` em processo filho
  e inferência nativa, `ms-cameras` como dono da geometria, fronteira estreita do serviço, e convergência
  de forma entre embarcado e servidor.

Ou seja: os cards de spec abaixo **transcrevem decisões já tomadas** sobre a fundação nova, não reabrem
debate. É por isso que os dois cards docs-only somam 5 pontos, não os 15 de reescrever do zero.

> [!success] Resolvido ao reler as notas: não existe `ms-connector-virtual-loop`
> `Docs/Analítico/Anotações sobre Analítico de vídeo.md`, seção "Arquitetura de serviços", lista
> exatamente **quatro** serviços: `ms-cameras`, `ms-atspm`, `ms-dai`, `ms-virtual-loop`. O connector não é
> um deles.
>
> A tensão com `docs/modules/detectors.md` (que designa `ms-connector-virtual-loop` produtor do protocolo
> de laço virtual) é real, mas é o doc de domínio que ficou atrás da decisão de produto, não o contrário -
> o mesmo doc já registra uma reversão parecida em 30/07 para o caminho ACP. **A tradução de endereço e a
> publicação em `attlas.detectors.raw` passam a viver dentro do `ms-virtual-loop`.** É o card 8 abaixo,
> que nasce sem condicional nenhuma.
>
> **Atualização de 31/08**: a conta foi de quatro para **um**. O `ms-atspm` e o `ms-dai` também não
> nascem - são capacidades do mesmo analítico servidor, que passa a se chamar `ms-video-analytics`.
> Decisão em [[Analítico - Topologia de serviço do analítico de vídeo]]; no repo, `CROSS-077` e
> `ADR-31`. **Não muda nada do escopo desta sprint**: o serviço que os cards 4 a 8 constroem é
> exatamente esse, e o renome é card próprio, depois de a pilha mergear.

> [!danger] Os 12 cards antigos do ClickUp (Sprint 29) nunca foram fechados - deleção pendente
> Reconfirmado em 28/08: `SOFTWARE-2385` a `2392`, `2394` a `2397` seguem abertos, em `backlog`, na lista
> da Sprint 29, nunca migrados. Fechar as PRs no GitHub não fechou os cards. 11 deles são duplicados
> diretos dos 8 cards novos desta sprint (mapa completo em [[00 - Sem prazo (backlog)]]); o 12º (`2392`,
> ACOM) não tem substituto e segue sem prazo. A deleção dos 11 está bloqueada pelo classificador de
> permissão do Claude Code (tanto via MCP quanto via REST) - pendente de o user liberar ou deletar a mão.

## Comprometido: 32 pts, 10 cards, 10 PRs

**1 card = 1 PR.** A revisão de coerência de 28/08 mudou duas coisas no plano de 24/08: entrou um card
que faltava (o 2b, derivação compartilhada) e **a escada deixou de ser uma pilha única de 8**, porque
metade das dependências que ela declarava não existe no código.

| #   | Card                                                                                                                                                     | Pts | Depende de         | Onde              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------ | ----------------- |
| 1   | [[Analítico servidor - ADR de alimentação e SPEC do ms-virtual-loop\|ADR de alimentação + SPEC do `ms-virtual-loop`]] `[Back]` (`SOFTWARE-2692`)         | 3   | -                  | docs              |
| 2   | [[Analítico servidor - Contrato de ocupação\|Contrato de ocupação da região]] `[Back]` (`SOFTWARE-2693`)                                                 | 2   | 1                  | `libs/contracts`  |
| 2b  | [[Analítico servidor - Derivação de ocupação compartilhada\|Derivação de ocupação compartilhada]] `[Back]` (`SOFTWARE-2798`)                             | 2   | 2                  | `@attlas/utils`   |
| 3   | [[Analítico servidor - Embarcado no contrato de ocupação comum\|Embarcado no contrato de ocupação comum]] `[Back]` (`SOFTWARE-2694`)                     | 2   | 2b                 | `ms-cameras`      |
| 4   | [[Analítico servidor - Serviço, imagem e ingestão do stream\|Serviço, imagem e ingestão do stream]] `[Back]` (`SOFTWARE-2695`)                           | 5   | 1                  | `ms-virtual-loop` |
| 5   | [[Analítico servidor - Detecção de objetos por frame\|Detecção de objetos por frame]] `[Back]` (`SOFTWARE-2696`)                                         | 5   | 4                  | `ms-virtual-loop` |
| 6   | [[Analítico servidor - Laço virtual e ocupação da região\|Laço virtual e ocupação da região]] `[Back]` (`SOFTWARE-2697`)                                 | 2   | 5 e 2b             | `ms-virtual-loop` |
| 7   | [[Analítico servidor - Vínculo região para endereço de detector\|Vínculo região para endereço de detector]] `[Back]` (`SOFTWARE-2698`)                   | 3   | **só a Sprint 30** | `ms-cameras`      |
| 8   | [[Analítico servidor - Tradução de endereço e publicação do detector raw\|Tradução de endereço e publicação do detector raw]] `[Back]` (`SOFTWARE-2699`) | 3   | 6 e 7              | `ms-virtual-loop` |
| 9   | [[Analítico servidor - Métricas do Laço Virtual (front)\|Métricas do Laço Virtual]] `[Front]` (`SOFTWARE-2797`)                                          | 5   | **nada**           | `web-attlas`      |

### Estado em 31/08: as 10 frentes abriram juntas

Os 10 cards saíram do backlog no primeiro dia e **todos já têm PR aberta**, nenhuma em draft. O plano
supunha a escada sendo subida degrau por degrau; na prática a semana abriu com as 10 frentes em paralelo.

| #   | Card             | PR                                                              | Estado             |
| --- | ---------------- | --------------------------------------------------------------- | ------------------ |
| 1   | `SOFTWARE-2692`  | [#2365](https://github.com/atmanadmin/attlas-2026/pull/2365)     | aberta, sem review |
| 2   | `SOFTWARE-2693`  | [#2366](https://github.com/atmanadmin/attlas-2026/pull/2366)     | aberta, sem review |
| 2b  | `SOFTWARE-2798`  | [#2367](https://github.com/atmanadmin/attlas-2026/pull/2367)     | aberta, sem review |
| 3   | `SOFTWARE-2694`  | [#2368](https://github.com/atmanadmin/attlas-2026/pull/2368)     | aberta, sem review |
| 4   | `SOFTWARE-2695`  | [#2369](https://github.com/atmanadmin/attlas-2026/pull/2369)     | aberta, sem review |
| 5   | `SOFTWARE-2696`  | [#2371](https://github.com/atmanadmin/attlas-2026/pull/2371)     | aberta, sem review |
| 6   | `SOFTWARE-2697`  | [#2372](https://github.com/atmanadmin/attlas-2026/pull/2372)     | aberta, sem review |
| 7   | `SOFTWARE-2698`  | [#2373](https://github.com/atmanadmin/attlas-2026/pull/2373)     | aberta, sem review |
| 8   | `SOFTWARE-2699`  | [#2376](https://github.com/atmanadmin/attlas-2026/pull/2376)     | aberta, sem review |
| 9   | `SOFTWARE-2797`  | [#2380](https://github.com/atmanadmin/attlas-2026/pull/2380)     | changes requested  |
| 9   | `SOFTWARE-2797`  | [#2517](https://github.com/atmanadmin/attlas-2026/pull/2517)     | aprovada, empilhada|

> [!info] Estado em 03/09: a semana fechou o backend e sobrou a tela
> As nove PRs de backend (2365, 2366, 2367, 2368, 2369, 2371, 2372, 2373, 2376) **mergearam**, a última
> em 03/09 às 13:30. O único card ainda aberto é o `SOFTWARE-2797`, e ele tem duas PRs: a #2380 em
> changes requested com três threads não resolvidas, todas de valor CSS literal sem token, e a #2517
> (mapa de câmeras e escopo por interseção) aprovada por dois revisores, esperando a de baixo entrar.
> A #2517 não aparecia nesta tabela até 03/09.
>
> Nenhuma das duas jamais recebeu CI: os três jobs do `ci-pr.yml` exigem base `develop`, e a base da
> #2380 só foi retargetada para `develop` em 03/09 às 13:30, no mesmo segundo do merge da #2376. Antes
> de mergear é preciso disparar `gh workflow run ci-pr.yml --ref cameras/feat/SOFTWARE-2797`.

> [!warning] PR aberta não é entrega
> O texto abaixo é o registro de 31/08, quando nenhuma das 10 tinha mergeado nem recebido review. A coluna Estado marca 🔄 de propósito, não ✅. O gargalo desta semana deixou de ser escrever o
> código e passou a ser vazão de review: são 10 PRs contra uma fila que ontem já consumiu 12 revisões de
> colegas (ver [[2026-08-31]]).
>
> O caminho crítico do grafo (1 → 4 → 5 → 6 → 8, 18 pts) continua valendo para o **merge**, mesmo com as
> PRs abertas fora de ordem: a 2376 (card 8) não pode entrar antes da 2372 (card 6) e da 2373 (card 7).

### Trabalho da semana fora dos 32 pts

| PR | O que é | Por que não estava no plano |
| --- | --- | --- |
| [#2363](https://github.com/atmanadmin/attlas-2026/pull/2363) (`SOFTWARE-2687`) | Backoff na troca automática de qualidade do streaming, para parar a oscilação de perfil que derrubava a relay | Achado ao medir performance do VMS no EC2 em 31/08: 34 aberturas e fechamentos de stream em 90 s, com fps caindo de 30 para 1. Diagnóstico e correção não estavam orçados |

Não consome ponto da frente do analítico, mas consome dia. Registrado aqui para a semana não fechar
parecendo que 32 pts foi a carga real.

### O que a revisão de 28/08 corrigiu

**1. Faltava a derivação compartilhada (card 2b, novo).** O `DeviceStreamConsumer` do `ms-cameras` já
calcula ocupação por região por frame (`const occupied = (msg.labels?.[i]?.length ?? 0) > 0`), e o
caminho servidor chega no mesmo ponto pela caixa da inferência. Daí para frente os dois fazem o mesmo:
histerese, transição, publicar só na virada. O plano antigo punha isso dentro do card 3 **e** dentro do
card 6, em serviços diferentes - o contrato comum acabaria cumprido por duas máquinas de estado
distintas, que é o que ele existe para impedir. Detalhe em
[[Analítico servidor - Derivação de ocupação compartilhada]].

**2. O card 3 é mais trabalho do que a nota supunha.** O embarcado **não publica em Kafka nenhum** hoje:
o consumer lê o broker do device e emite só por WebSocket, para destaque visual no frontend. "Trocar o
formato" não descreve o card; ele ganha um produtor.

**3. O card 7 nunca dependeu da escada.** Mora no `ms-cameras` e senta sobre a `CameraAnalyticRegion`
que a Sprint 30 entregou (a tabela existe, com `index`, `deviceRegionId` e `presetId`). Não toca o
`ms-virtual-loop`. Empilhá-lo sobre a PR 6 era serialização inventada, e era ela que fazia o risco de
cascata parecer maior do que é.

**4. O domínio do contrato não é greenfield.** A nota mandava criar `libs/contracts/src/lib/analytics/`.
Já existem três domínios irmãos de analítico: `camera-analytic/` (enums e saúde), `object-detection/`
(região, evento de detecção, incidente) e `virtual-loop/` (hoje só `IVirtualLoopConfig`). Um quarto
irmão é espalhamento, e piora os `inputs` de CROSS-066. **O evento de ocupação vai em `virtual-loop/`**,
que é de onde ele é, e o card 1 registra a decisão.

### Caminho crítico: 18 pts, não 32

```
1 (ADR/SPEC) ─┬─> 4 ─> 5 ─> 6 ─┬─> 8
              │                │
              └─> 2 ─> 2b ─┬───┘
                           └─> 3
7 (ms-cameras, só a Sprint 30) ─────> 8
9 (tela) ── independente
```

**1 → 4 → 5 → 6 → 8 = 18 pts** é o que precisa sair em série. Os outros 14 pts (cards 2, 2b, 3, 7 e 9)
correm em paralelo, e três deles (7, 9 e o par 2/2b) podem começar na segunda sem esperar nada da
inferência.

Só o card 8 tem duas entradas, e é ele que continua sendo **quem cede** se a semana apertar - com a
mesma consequência de antes, que é entrega útil mesmo assim: o embarcado já estará no contrato comum, e
o `ms-detector-history` não precisa de mudança nenhuma para receber quando a PR 8 mergear depois.

**32 pts é folgado contra o histórico.** A Sprint 30 entregou 51 pts em 11 cards na semana, e a própria
nota dela registra que a conversão de ponto em dia da tabela do time não vale para este fluxo. Era essa
folga que justificava procurar uma tela em vez de fechar a semana só com backend.

> [!note] Repontuação de 25/08, contra o Guia Geral de Boas Práticas (seção 3.1)
> Mesma tabela oficial usada na [[Attlas - Sprint 30]] (1 pt <2h, 2 pt 2-4h, 3 pt 4-8h, 5 pt 1-2 dias, 8
> pt 2-3 dias, 13 pt 4-5 dias). Dois cards subiram de 3 para 5 em 25/08: o card 4 (serviço, imagem e
> ingestão) e o card 5 (detecção por frame), os dois por acumularem pipeline mais gate de readiness mais
> medição. Os cards 2b (2 pts) e 9 (5 pts) entraram em 28/08 já contra a mesma tabela.

## O que já está pronto e não entra na conta

**O sumidouro.** `ms-detector-history` é o serviço mais maduro da cadeia (10 módulos, 5 relatórios de
teste de campo executados) e `detection.service.ts` já chama `deriveDetectorId({controllerId, index})` -
aceita o evento do laço virtual **sem nenhuma mudança**. Os contratos de detector também existem inteiros:
`IDetectorRawEvent`, `DetectorTechnology.VIRTUAL_LOOP`, `DETECTOR_SAMPLE_DURATION_MS` de 100 ms e
`deriveDetectorId`.

**A infraestrutura do `ms-virtual-loop`.** Imagem Docker, entrada no `docker-compose.yml`, rota no
`docker/kong.yml` (porta 3302) e banco provisionado. O que falta é 100% do domínio: hoje é scaffold NX,
com o `app.service.ts` devolvendo `Hello API` (conferido no repo em 28/08). O `ms-connector-virtual-loop`
segue existindo como scaffold no repo e no compose (porta 3303), mas fica fora do escopo desta frente -
descontinuar ou não é decisão de infraestrutura à parte, e não bloqueia nada aqui.

## Fica para depois desta semana

Vai para [[Attlas - Sprint 32]], porque só faz sentido com a cadeia acima de pé (2 cards, 4 pts):

| Card | Pts | Espera o quê |
| --- | --- | --- |
| Escala do analítico: câmeras por instância e distribuição (`SOFTWARE-2398`) | 2 | O card 5, para medir com o analítico real em vez de estimar |
| Prova de campo ponta a ponta até a timeline do detector (`SOFTWARE-2200`) | 2 | Toda a cadeia. É o elo que cede primeiro se a semana apertar |

## Riscos

1. **Inferência é custo desconhecido.** Sem o número do card 5 por resolução, o teto de câmeras por
   instância é chute - e é por isso que a escala saiu da semana em vez de entrar com número inventado.
2. **Caminho crítico de quatro cards de código** (4 → 5 → 6 → 8, 15 dos 18 pts em série). Menor do que
   o plano de 24/08 supunha, porque os cards 7 e 9 saíram da pilha: eles nunca dependeram dela. Se
   escorregar, quem cede continua sendo o card 8, e a semana fecha com ocupação sendo publicada sem
   chegar ao detector - com a tela (card 9) e o vínculo (card 7) entregues de qualquer jeito.
3. **O card 3 ganhou um produtor Kafka que ninguém tinha orçado.** O embarcado só emite por WebSocket
   hoje. Os 2 pts foram estimados quando se achava que era troca de formato; com a derivação saindo
   para o card 2b sobra o produtor e a fiação, o que ainda cabe em 2 pts - mas é a estimativa mais
   frágil da semana, e a primeira a revisar se a segunda-feira desmentir.

4. **Runtime fora do trilho comum.** A decisão preservada é NestJS com inferência nativa embutida no
   processo Node, com Python registrado como alternativa rejeitada e cláusula de reabertura se a medição
   do card 5 provar a via inviável. Se reabrir, o serviço sai do gate de lint, test e build do monorepo, e
   isso precisa de decisão registrada, não de descoberta no CI.
5. **A conferência entre squads sobre a forma do evento continua pendente.** A spec fechada mandava
   conferir o contrato de ocupação contra o trabalho de outro squad sobre ocupação de faixa e identidade
   de detector no `ms-traffic-model`. Fechar a PR não resolveu isso: o card 2 herda a pendência, e é
   bloqueio de coordenação, não técnico.
6. **Contagem dupla ACP x vídeo.** A derivação do `ms-controllers` mapeia `MDE + Vehicle` e o módulo
   `VirtualLoop` do Neo+ para a mesma tecnologia `VIRTUAL_LOOP` que esta cadeia vai publicar. A regra que
   impedia a soma dobrada existia nas specs fechadas e precisa renascer no card 8.
7. **O device de campo é compartilhado.** Vale para comparar o nosso analítico com o embarcado: o
   `10.11.20.101` continua sem dono explícito e outro writer segue carimbando o `source_id`. Validar ao
   vivo pode consumir meio dia esperando.
8. **Métricas ATSPM sem sprint que as implemente.** O Laço Virtual saiu deste risco em 28/08 e virou o
   card 9. O ATSPM não sai: são 38 métricas em 7 grupos contra um `ms-atspm` que é scaffold de 6
   arquivos, e nenhuma das três sprints do analítico constrói esse backend. A Sprint 32 é a última
   semana em que a tela caberia antes de 18/09, e ela hoje **não caberia mesmo assim**, porque o que
   falta não é o porte, é o serviço - ver [[Attlas - Sprint 32]].

9. **O veredito de portabilidade do vault não estava conferido contra o código.** O card 9 só apareceu
   porque o user perguntou se alguma tela cabia. A linha "esperar Sprint 31" em
   [[Analítico - Frontend do attlas-design]] tinha sido deduzida de "métrica de laço virtual precisa do
   laço virtual", que confunde quem produz o dado com quem serve a leitura, e nunca foi checada contra
   o `ms-detector-history`. A nota foi corrigida em 28/08. Vale conferir as outras linhas do mesmo
   quadro antes de tratá-las como bloqueio.

## Cards da semana

[[Analítico servidor - ADR de alimentação e SPEC do ms-virtual-loop]] ·
[[Analítico servidor - Contrato de ocupação]] ·
[[Analítico servidor - Derivação de ocupação compartilhada]] ·
[[Analítico servidor - Embarcado no contrato de ocupação comum]] ·
[[Analítico servidor - Serviço, imagem e ingestão do stream]] ·
[[Analítico servidor - Detecção de objetos por frame]] ·
[[Analítico servidor - Laço virtual e ocupação da região]] ·
[[Analítico servidor - Vínculo região para endereço de detector]] ·
[[Analítico servidor - Tradução de endereço e publicação do detector raw]] ·
[[Analítico servidor - Métricas do Laço Virtual (front)]]

## Ver também

[[Attlas - Sprint 30]] · [[Attlas - Sprint 32]] · [[00 - Sem prazo (backlog)]] · [[Analítico]] ·
[[Analítico - Embarcado x Servidor]] · [[Analítico - Arquitetura e estratégias]] · [[Analítico - Fluxos]] ·
[[Analítico - Frontend do attlas-design]]
