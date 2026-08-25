---
tags:
  - attlas
  - sprint-30
  - moc
  - analitico
aliases:
  - "Attlas - Sprint 30"
  - "Sprint 30 - o que entrega"
sprint: Sprint 30 (24/8/26 - 30/8/26)
status: ABERTA em 24/08, frente única - analítico de vídeo. REESTIMADA em 25/08 com o frontend na conta: 51 pontos em 11 cards (eram 28 em 10, porque o plano antigo não tinha card de frontend nenhum). 11 pontos entregues em 25/08. Todas as 11 PRs abertas em 25/08. O user decidiu fechar a semana incluindo sábado; o que não couber rola para a Sprint 31, que está mapeada. Prazo do módulo: 18/09.
atualizado: 2026-08-25
---

# Sprint 30 - o que entrega

Porta de entrada da semana de **24 a 30/08**. Frente única: **Analítico de vídeo**, camada de gestão do
analítico embarcado. Responde uma coisa só: *o que sai desta semana, em feature e em tela*. O
planejamento, a estimativa e os riscos estão em [[Attlas - Sprint 30]].

> [!note] Plano da semana: 51 pts, sábado incluído, sobra rola para a 31
> 11 pontos entregues em 25/08 (entidade em banco, healthcheck front e back, renumeração). Restam **40
> pontos** para qua, qui, sex e **sábado** - decisão do user de fechar a semana com hora extra.
>
> **Ordem de ataque**, do que mais destrava para o que menos: o bug P0 do writer (sem ele nenhuma
> câmera cadastrada pela tela recebe detecção), depois o backend do dedup, que libera a fila de
> incidentes - a maior tela da semana. Compatibilidade e evidência ficam por último porque as duas
> dependem de coisa externa (device ARTPEC em mão, decisão de produto).
>
> **O que não couber rola para a [[Attlas - Sprint 31]]**, que já está mapeada, e a reorganização é
> feita aqui e no ClickUp no mesmo passe - não fica sobra órfã.
>
> Nota sobre a minha estimativa anterior: eu tinha convertido ponto em dia pela tabela do time, que é
> calibrada para código escrito à mão. Os 11 pontos de hoje saíram em poucas horas, então essa
> conversão não vale para este fluxo - a régua de capacidade aqui é a sua, não a minha.

## Features (o que o sistema passa a fazer)

| Feature                                                                                                                                                | Onde                        | Estado                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | -------------------------------------- |
| Analítico de uma câmera vira **entidade de banco**, com geometria de região persistida e a regra "um embarcado por tipo por câmera" garantida no banco | `ms-cameras`                | ✅ **entregue**                         |
| Operador passa a **distinguir "device caiu" de "não configurado"** na saúde do analítico                                                               | `ms-cameras` + `web-attlas` | ✅ **entregue**                         |
| Duas specs cross-service com o mesmo ID (`CROSS-032`) deixam de colidir                                                                                | `docs/specs`                | ✅ **entregue**                         |
| **Câmera cadastrada pela tela passa a receber detecção ao vivo** (hoje só as do seed recebem)                                                          | `ms-cameras`                | 🔴 bug P0, a fazer                     |
| Arquitetura da câmera (ARTPEC 7 / 8-9 / não-Axis) **detectada automaticamente**, e a matriz de compatibilidade aplicada como regra de negócio          | `ms-cameras`                | ⏳ a fazer                              |
| Incidente de trânsito reportado pela câmera **vira evento contável**, com deduplicação (hoje é lido e descartado)                                      | `ms-cameras`                | ⏳ a fazer                              |
| Região de detecção **vinculada ao preset PTZ**, com captura do enquadramento (hoje mover o preset invalida a geometria em silêncio)                    | `ms-cameras`                | ⏳ a fazer                              |
| **Imagem de evidência** da detecção passa a existir (hoje o dado da câmera é 100% numérico, zero pixel)                                                | `ms-cameras`                | ⏳ a fazer, decisão de produto pendente |

## Telas (o que o operador vê)

| Tela | Onde vive | Origem | Estado |
| --- | --- | --- | --- |
| **Saúde do analítico** - linha nova na aba "Informações Gerais" do detalhe da câmera, com estado e há quanto tempo o sinal parou | detalhe da câmera | escrita do zero | ✅ **entregue** |
| **Fila de incidentes** - página nova: tabela, mapa, timeline e página própria do incidente | rota nova no módulo de câmeras | portar do `attlas-design` (~7.900 linhas: 2 páginas + 9 componentes) | ⏳ a fazer (8 pts, a maior) |
| **Galeria de mídia de evidência** - 3 abas (imagem, vídeo, anexo do operador), carrossel, upload | dentro da página do incidente | portar do `attlas-design` (componente pronto, 1.145 linhas) | ⏳ a fazer |
| **Desenho sobre frame congelado** - seletor de preset e desenho da região sobre a imagem parada do enquadramento | aba Analíticos (evolui o que já existe) | portar `detection-frame` do `attlas-design` (963 linhas) | ⏳ a fazer |
| **Cadastro oferta só o compatível** - exibe a arquitetura detectada e desabilita o que aquele modelo não roda | wizard de cadastro de câmera | edição de formulário existente, **dentro do card `[Full]` de backend** | ⏳ a fazer |

De onde o frontend vem, e o que do protótipo **não** serve: [[Analítico - Frontend do attlas-design]].

## Explicitamente NÃO entrega esta semana

Para não haver surpresa na revisão:

- **Métricas ATSPM e do Laço Virtual** - as telas existem prontas no `attlas-design`, mas não há
  backend antes do servidor de VL ([[Attlas - Sprint 31]]).
- **Analítico servidor** (Virtual Loop em container) - é a Sprint 31 inteira.
- **ACOM** (atuação no controlador) e **ATSPM** - seguem sem prazo, em [[00 - Sem prazo (backlog)]].
- **Quatro laços virtuais por câmera** - requisito decidido, mas é redesenho de contrato.
- **OTA do app embarcado** - depende do fornecedor do ACAP.

## Cards da semana

Backend e full-stack (PR aberta): [[Analítico - Renumerar a CROSS-032 duplicada]] ·
[[Analítico - Entidade, persistência de região e unicidade]] ·
[[Analítico - Writer do deviceSourceId e higiene do embarcado]] ·
[[Analítico - Compatibilidade por arquitetura de câmera]] ·
[[Analítico - Healthcheck do analítico]] ·
[[Analítico - Contagem e dedup de incidente DAI]] ·
[[Analítico - Preset PTZ com snapshot de região]] ·
[[Analítico - Fonte da imagem de evidência]]

Frontend (PR aberta): [[Analítico - Fila de incidentes (front)]] ·
[[Analítico - Galeria de mídia de evidência (front)]] ·
[[Analítico - Desenho de região sobre frame congelado (front)]]

## Ver também

[[Attlas - Sprint 30]] (planejamento, estimativa, riscos e a pilha de PRs) · [[Attlas - Sprint 31]] ·
[[Attlas - Sprint 32]] · [[Analítico]] · [[Analítico - Frontend do attlas-design]]

---

# Planejamento detalhado

## O que a reestimativa de 25/08 mudou

Três correções, todas a pedido do user:

1. **Não existe task de documentação.** Os cards `2680` (doc de módulo, 2 pts) e `2685` (spec dos 4
   endpoints, 1 pt) deixaram de existir como cards - o conteúdo foi absorvido pelos cards de
   implementação que os usam (`2677` e `2683`). Docs entram na PR da implementação, é o que o SDD manda.
2. **1 task = 1 PR.** O card `2678` estava partido em 2 PRs (identificação e validação); voltou a ser
   um só. Antes eram 13 PRs para 10 cards.
3. **Frontend virou card.** Onde a tela é trabalho real, existe card `[Front]` irmão do `[Back]`, com
   ponto próprio. Onde front e back saem juntos na mesma PR, o card é `[Full]`.

## Comprometido (51 pts, 11 cards)

Ordem é caminho crítico. `2677` é a pedra angular - `2682`, `2678`, `2681`, `2683`, `2684` leem a
entidade que ela cria.

| # | Card | Tipo | Pts | Estado | PR |
| --- | --- | --- | --- | --- | --- |
| 1 | [[Analítico - Renumerar a CROSS-032 duplicada\|Renumerar a `CROSS-032` duplicada]] | `[Back]` | 1 | **entregue** | [#1999](https://github.com/atmanadmin/attlas-2026/pull/1999) |
| 2 | [[Analítico - Entidade, persistência de região e unicidade\|Entidade Analítico + região em banco + unicidade]] | `[Back]` | 5 | **entregue** | [#2000](https://github.com/atmanadmin/attlas-2026/pull/2000) |
| 3 | [[Analítico - Writer do deviceSourceId e higiene do embarcado\|Writer do `deviceSourceId`]] `bug P0` | `[Back]` | 3 | a fazer | [#2001](https://github.com/atmanadmin/attlas-2026/pull/2001) |
| 4 | [[Analítico - Compatibilidade por arquitetura de câmera\|Compatibilidade por arquitetura de câmera]] | `[Full]` | 8 | a fazer | [#2002](https://github.com/atmanadmin/attlas-2026/pull/2002) |
| 5 | [[Analítico - Healthcheck do analítico\|Healthcheck do analítico]] | `[Full]` | 5 | **entregue** | [#2003](https://github.com/atmanadmin/attlas-2026/pull/2003) |
| 6 | [[Analítico - Contagem e dedup de incidente DAI\|Contagem e dedup de incidente DAI]] | `[Back]` | 5 | a fazer | [#2004](https://github.com/atmanadmin/attlas-2026/pull/2004) |
| 7 | [[Analítico - Preset PTZ com snapshot de região\|Preset PTZ com snapshot de região]] | `[Back]` | 5 | a fazer | [#2005](https://github.com/atmanadmin/attlas-2026/pull/2005) |
| 8 | [[Analítico - Fonte da imagem de evidência\|Fonte da imagem de evidência]] | `[Back]` | 5 | a fazer | [#2006](https://github.com/atmanadmin/attlas-2026/pull/2006) |
| 9 | [[Analítico - Fila de incidentes (front)\|Fila de incidentes]] | `[Front]` | 8 | a fazer | [#2022](https://github.com/atmanadmin/attlas-2026/pull/2022) |
| 10 | [[Analítico - Galeria de mídia de evidência (front)\|Galeria de mídia de evidência]] | `[Front]` | 3 | a fazer | [#2023](https://github.com/atmanadmin/attlas-2026/pull/2023) |
| 11 | [[Analítico - Desenho de região sobre frame congelado (front)\|Desenho sobre frame congelado]] | `[Front]` | 3 | a fazer | [#2024](https://github.com/atmanadmin/attlas-2026/pull/2024) |

**Entregue: 11 pts.** Restante: 40 pts.

### O que mudou de ponto, e por quê

| Card | Antes | Agora | Motivo |
| --- | --- | --- | --- |
| `2678` compatibilidade | 5 (`[Back]`) | 8 (`[Full]`) | A detecção de arquitetura é lógica de backend (decisão do user, 25/08). O front dela é campo a mais e regra de habilitação no wizard que já existe - não é tela, então não é card. Vai junto, no mesmo card |
| `2681` healthcheck | 3 (`[Back]`) | 5 (`[Full]`) | Entregue com front junto (linha na aba Informações Gerais, i18n em 3 locales). 3 pts era só o backend |
| `2683` dedup de incidente | 3 (`[Back]`) | 5 `[Back]` + 8 `[Front]` | A fila de incidentes é 6 componentes mais 2 páginas, com mapa MapLibre e timeline. Portar não é copiar: serviço, i18n, permissão e teste são reescritos |
| `2684` preset PTZ | 3 (`[Back]`) | 5 `[Back]` + 3 `[Front]` | Backend cresceu (vínculo + snapshot por preset + storage); o front porta `detection-frame`, que já resolve frame congelado e seletor de preset |
| `2676` imagem de evidência | 2 (`[Back]`) | 5 `[Back]` + 3 `[Front]` | 2 pts era o custo da decisão, não da implementação. O front porta um componente pronto, é o mais barato do lote |
| `2680` doc de módulo | 2 | **absorvido** | Não existe task de doc - o conteúdo está na PR do card `2677` |
| `2685` spec dos endpoints | 1 | **absorvido** | Idem, na PR do card `2683` |
| `2732` cadastro ARTPEC (front) | 3 (`[Front]`) | **absorvido** | Criado por erro meu na reestimativa. ARTPEC é lógica de backend, e o que sobra na tela não é tela nova - foi para dentro do `2678` |

## Já entregue (11 pts, com código e teste)

**`2677` - Entidade Analítico** ([#2000](https://github.com/atmanadmin/attlas-2026/pull/2000)):
`CameraAnalytic` e `CameraAnalyticRegion` em banco, índice único parcial garantindo "um analítico
embarcado por tipo por câmera" (com exceção para execução servidor), repositórios com upsert
idempotente e soft-delete, migration com ciclo `[DBM]` validado em shadow, entrada no `DBM-DRIFT.md`,
14 testes. Fecha a lacuna que travava a PR #1352, fechada em 24/08 por falta desta fundação.

**`2681` - Healthcheck** ([#2003](https://github.com/atmanadmin/attlas-2026/pull/2003)): back e front.
O operador passa a distinguir "device caiu" de "ninguém configurou" - hoje os dois casos devolvem
região vazia. 4 estados derivados da entidade mais o frescor do último quadro em Redis (escrita
throttled pelo consumer), servidos pelos 3 canais que já existem, sem endpoint novo. Linha nova na aba
Informações Gerais, i18n nos 3 locales, 12 testes.

**`2679` - Renumerar `CROSS-032`** ([#1999](https://github.com/atmanadmin/attlas-2026/pull/1999)):
duas specs cross-service com o mesmo ID; a de TURN virou `CROSS-062`, 3 backlinks e o índice mestre
corrigidos.

## Fatiamento: 1 task = 1 PR, pilha mergeando em cascata

Regra da casa: **mínimo 8 PRs por sprint** e **1 task = 1 PR**. São **11 cards e 11 PRs**, todas
abertas em 25/08, todas atribuídas ao afonsoburginski. As 4 que ainda estão só com spec ficam em
**draft** - draft é a marca da fase só-spec, e sai no mesmo dia em que o código entra.

A PR abre com a spec e **evolui para a implementação na mesma PR** - é o que o SDD manda. Título e
descrição são da feature desde o primeiro commit, nunca "spec de X": a PR é o card inteiro, não um
artefato de doc que vai ser descartado.

As 11 PRs saem empilhadas, cada uma baseada na anterior, mergeando em cascata de baixo para cima:

```
develop
 └─ #1999  2679  fix   Renumerar CROSS-032
     └─ #2000  2677  feat  Entidade Analítico          ← pedra angular
         └─ #2001  2682  fix   Writer do deviceSourceId (bug P0)
             └─ #2002  2678  feat  Compatibilidade por arquitetura
                 └─ #2003  2681  feat  Healthcheck (front + back)
                     └─ #2004  2683  feat  Dedup de incidente
                         └─ #2005  2684  feat  Preset PTZ + snapshot
                             └─ #2006  2676  feat  Imagem de evidência
                                 └─ #2022  2734  feat  Fila de incidentes         [front]
                                     └─ #2023  2731  feat  Galeria de evidência   [front]
                                         └─ #2024  2733  feat  Frame congelado    [front]
```

Os 3 cards `[Front]` ficam no topo por dependência real: cada um consome o endpoint que a PR de
backend abaixo dele cria. Empilhados assim, herdam o backend por construção - e nenhum deles precisa
de dado falso para existir, que é o que a regra "nunca mock" exige.

> [!warning] Force-push é negado por regra local, e isso muda a mecânica da pilha
> `gh stack sync`/`rebase` fazem rebase da pilha inteira e force-push - bloqueados. A propagação de
> commit novo pela pilha é feita por **merge em cascata** (de baixo para cima), que não reescreve
> história. Branch que precisar de reescrita sai com nome novo e a PR antiga vira draft apontando a
> substituta, sem fechar, para não perder thread de review.

> [!info] A pilha de 13 PRs de 24/08 foi fechada e reconstruída em 25/08
> As PRs `#1975`-`#1987` foram substituídas pelas `#1999`-`#2006`. Motivo: 5 delas eram PR só de
> documentação (que não deveria existir) e uma task estava partida em duas PRs. Conteúdo integral
> preservado - verificado byte a byte antes de fechar - e branches não deletadas.

## O CI não cobre PR empilhada

`ci-pr.yml` só dispara em PR cuja base é `develop`, o que na pilha é só a `#1999`. Para as outras 10 o
gate é manual: `gh workflow run ci-pr.yml --ref <branch>`.

## Não entra nesta semana

| Frente | Onde foi | Por quê |
| --- | --- | --- |
| Cadeia do servidor de VL (spec, ingestão, detecção, ocupação, vínculo, tradução de endereço) | [[Attlas - Sprint 31]], 25 pts | Depende da entidade e da geometria em banco que esta semana cria |
| Métricas ATSPM e do Laço Virtual (telas prontas no `attlas-design`) | Sprint 31+ | Não existe backend antes do servidor de VL. Ver [[Analítico - Frontend do attlas-design]] |
| Escala e prova de campo | [[Attlas - Sprint 32]], 4 pts | Dependem da Sprint 31 inteira |
| Quatro laços por câmera | [[00 - Sem prazo (backlog)]], 5 pts | Requisito decidido, mas é redesenho do contrato de `IVirtualLoopConfig` |
| ACOM (1:1 com controlador, vínculo com analítico, caller da atuação, tela) | [[00 - Sem prazo (backlog)]], 18 pts | Vive no `ms-controllers`, depende de outro squad, migration com backfill. **Fora do prazo de 18/09 salvo confirmação do user** |
| ATSPM (unicidade de grupo, snapshot de config, SPEC do `ms-atspm`, decisão do `ms-dai`) | [[00 - Sem prazo (backlog)]], 10 pts | `ms-atspm` é scaffold sem uma linha de spec. Mesma ressalva do ACOM |
| OTA do app embarcado | sem card | Depende do fornecedor do ACAP expor caminho de atualização |

## Riscos

1. **Volume alto para a janela.** 40 pontos restantes para 4 dias (sábado incluído). O plano é atacar
   por ordem de destrave e rolar a sobra para a [[Attlas - Sprint 31]] - ver o callout no topo.
2. **A entidade do card 2 era a pedra angular** - risco fechado: entregue em 25/08, com teste.
3. **`2678` depende de hardware que não temos em mão.** O parâmetro VAPIX que devolve a geração ARTPEC
   precisa ser confirmado contra uma ARTPEC 7 e uma ARTPEC 8/9 reais. Sem isso o parser não fecha, e
   isso trava o card `[Front]` irmão também. **Destravar acesso ao device é ação para agora, não para a
   véspera.**
4. **`2676` depende de decisão de produto** (de onde vem o pixel da evidência). O card `[Front]` pode ser
   portado contra o contrato proposto, mas não fecha antes da decisão.
5. **Contagem dupla ACP x vídeo, declarada e não mitigada.** A derivação do `ms-controllers` mapeia
   `MDE + Vehicle` e o módulo `VirtualLoop` do Neo+ para a mesma tecnologia `VIRTUAL_LOOP` que o vídeo
   vai publicar. Se o laço virtual atuar por ACOM, o histórico soma o mesmo veículo duas vezes **sem
   erro visível**. A regra existia nas specs fechadas em 24/08 e precisa renascer na Sprint 31.
6. **Conferência entre squads sobre a forma do evento de ocupação continua pendente** - herdada para o
   card 2 da Sprint 31, e é bloqueio de coordenação, não técnico.
7. **3 testes de frontend já estão quebrados na `develop`** (`cameras-column-visibility` 2,
   `media-profiles.service` 1), confirmado com o trabalho da sprint fora do caminho. É o acúmulo
   silencioso que o `CLAUDE.md` avisa: o CI só roda afetados, então quebra fora do diff não derruba
   check. Não é dívida desta sprint, mas está no caminho dela.

## Dívida colateral

- **`CROSS-043` é referência fantasma.** Três atômicas em `develop` (`PROJ-012`, `PROJ-016`,
  `PROJ-017`) citam o ID; o arquivo nunca existiu. A faixa em `develop` salta de `CROSS-042` para
  `CROSS-045`. Fechar a #1342 em 24/08 resolveu a colisão que existia, mas a ausência do arquivo fica.
- `docs/architecture/services.md` ainda anuncia `ms-acom` como serviço vivo na porta 3305 e o
  `docker-compose.yml` ainda sobe o container - os dois contradizem a DD-20, que portou ACOM para o
  `ms-controllers`. O Kong roteia `/api/acoms` (plural, real) para o `ms-controllers` e `/api/acom`
  (singular, vazio) para o esqueleto, que nunca recebe tráfego.
- `attlas.detectors.fault` tem produtor real e **nenhum consumidor**, apesar de
  `docs/modules/detectors.md` designar o `ms-alarms`. Falha de detector de laço virtual, quando
  existir, cai no vazio.
- `docs/modules/controllers.md`, com mais de mil linhas, não menciona ACOM, ATSPM, DAI nem laço virtual
  uma única vez.
- O Postgres local de `ms-cameras` estava com histórico de migration divergente em 25/08 (uma migration
  aplicada que não existe no repo, duas modificadas depois de aplicadas). Resolvido recriando só aquele
  volume de dev - **sem** `migrate reset`, que o `backend-standards` proíbe.

## Decisões em aberto

### Escopo do prazo de 18/09 inclui ATSPM e ACOM?

Não respondido. Se 18/09 for só a cadeia de Virtual Loop (embarcado + servidor + gestão), o escopo é o
das Sprints 30-32. Se incluir ATSPM e ACOM, são 28 pontos a mais sem sprint nenhuma.

### Existe sobrescrita manual da arquitetura?

Card `2678`: se o lookup do `hardwareId` falhar e a sonda VAPIX não responder, o cadastro trava até a
tabela ser atualizada, ou o operador sobrescreve como último recurso? Afeta o card `[Front]` irmão, que
precisa saber o que exibir nesse estado.

### De onde vem o pixel da imagem de evidência?

Card `2676`. Recomendação registrada na spec: reusar o `CameraThumbnailService` (hoje preview de
320x240 sem persistência) em resolução cheia com armazenamento, contra capturar quadro do relay ou
pedir a imagem ao fornecedor do ACAP.

## Processo

- **11 cards no ClickUp**: os 8 de `[Back]`/`[Full]` existem desde 24/08 (`SOFTWARE-2676` a `2685`,
  menos os 2 absorvidos); os 3 de `[Front]` foram criados em 25/08 na reestimativa. Todos na lista pela
  data, tag `squad 2`, pontos no campo nativo. O quarto card `[Front]` que eu tinha criado (`2732`,
  cadastro ARTPEC) foi fechado no mesmo dia - ver a tabela de reestimativa.
- **Prefixo do card diz onde o trabalho está**: `[Back]`, `[Front]` ou `[Full]` quando front e back
  saem na mesma PR.
- **Título de PR é o nome da task, com o tipo do CommitLint** (`feat:`/`fix:`) - nunca "spec de X",
  mesmo quando o commit atual só tem doc. A PR amadurece; o título nasce certo. Mesma regra para a
  descrição: ela tem de se sustentar sozinha para um humano, sem abrir spec nenhuma. O `Spec: <ID>` é
  rastreabilidade, não explicação.
- **A PR abre com a spec, em draft, e evolui para a implementação na mesma PR.** Não existe PR de doc,
  nem par PR-de-spec + PR-de-código. Draft é a marca da fase só-spec e sai quando o código entra.
- **Antes de criar card ou PR de frontend, conferir o `attlas-design`.** Eu criei o `2732` sem
  conferir, e ARTPEC não existe no protótipo; e escrevi na nota do `2733` que não havia nada a portar,
  quando `detection-frame` resolvia o caso inteiro. As duas coisas custaram retrabalho no mesmo dia.

## Ver também

[[Attlas - Sprint 31]] · [[Attlas - Sprint 32]] · [[00 - Sem prazo (backlog)]] · [[Analítico]] ·
[[Analítico - Embarcado x Servidor]] · [[Analítico - Frontend do attlas-design]] ·
[[Analítico - Requisitos e SLA]] · [[Analítico - Arquitetura e estratégias]] · [[Analítico - Fluxos]] ·
[[Attlas - Sprint 29]] · [[Attlas - Sprint 27]] (o planejamento que este reescopo substitui)
