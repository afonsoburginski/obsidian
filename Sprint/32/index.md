---
tags:
  - attlas
  - sprint-32
  - moc
  - analitico
aliases:
  - "Attlas - Sprint 32"
  - "Sprint 32 - o que entrega"
sprint: Sprint 32 (7/9/26 - 13/9/26)
status: "CRIADA em 25/08 pelo user como a terceira semana da frente do analítico, contra o prazo externo de 18/09 (front + backend). REVISADA em 28/08 em sequência à revisão da Sprint 31: comprometido subiu de 4 para 9 pts em 3 cards, com a entrada do SOFTWARE-2686 (4 laços por câmera), que estava no sem prazo e foi desbloqueado pela entrega da Sprint 30. Continua sendo a sprint mais leve das três, e a decisão que falta é o ATSPM. A lista propria no ClickUp EXISTE (901329020073), levantada na API em 09/09, com 7 tasks e nenhuma minha - os meus tres cards seguem nas listas da Sprint 29 (2398 e 2200) e da Sprint 30 (2686), todos em backlog. ESTADO EM 09/09, com três dos sete dias gastos: nenhum dos três cards saiu do backlog e não há PR aberta minha. O card 1 teve o mecanismo adiantado no sábado 05/09 pela #2528, dentro da Sprint 31, e o que falta dele é a medição do teto. Os dois dias de trabalho da semana foram para o front do Analítico, fora do plano: #2910 (destrave da ci-develop) e #2918 (porte de Instâncias e Incidentes). REPLANEJADA em 09/09 contra o inventário do módulo inteiro (edital seção 4.6 confrontado com o código): a semana virou 9 PRs em cascata e cerca de 19 pts, somando aos três cards existentes o modo edição da aba Detecção (o recurso Visão Geral do edital, hoje construído e desabilitado), a base de docs que faltava (docs/modules/analytics.md e a UF-046 que o código cita sem existir) e a troca da face default de Métricas. A pilha ficou em 12 PRs e 35 pts, somando o refinamento de emergência (SOFTWARE-3057, urgente) pedido em 09/09, com repontuação recomendada de dois cards (2686 de 5 para 8, 2200 de 2 para 5) e 15 dos 30 pts sem card. ACOM, Dashboard do Analítico, decisão automatizada, AOG/PCD/TMC/Approach Delay e o snapshot de configuração semafórica ficam declaradamente fora do prazo de 18/09, com motivo por item. FECHAMENTO em 11/09 à noite: a #3066 e as oito PRs de spec (#3188 a #3195) mergearam na develop entre 23:01 e 23:57. A prova de campo do SOFTWARE-2200 foi executada no EC2 dev com duas câmeras em modo servidor. As correções estão abertas nas #3303, #3304, #3305 e #3306, todas com CI verde. As #3297 e #3300 foram mergeadas. As #3303, #3304, #3305 e #3306 seguem abertas, verdes e aguardando review."
atualizado: 2026-09-11
---

# Sprint 32 - o que entrega

Porta de entrada da semana de **07 a 13/09**. É o **último checkpoint de desenvolvimento cheio** antes
do prazo de 18/09, que cai na Sprint 33. O planejamento detalhado é a segunda metade desta nota.

> [!success] Atualização em 10/09: base documental da pilha publicada
> As oito PRs de especificação foram abertas em cascata sobre a
> [#3066](https://github.com/atmanadmin/attlas-2026/pull/3066), mantendo uma task por PR. A sequência é:
> [#3188](https://github.com/atmanadmin/attlas-2026/pull/3188) (`SOFTWARE-3051`, contexto do módulo),
> [#3189](https://github.com/atmanadmin/attlas-2026/pull/3189) (`SOFTWARE-3052`, `UF-046`, `UF-047` e
> `MOD-012`), [#3190](https://github.com/atmanadmin/attlas-2026/pull/3190) (`SOFTWARE-3053`, face
> inicial de Métricas), [#3191](https://github.com/atmanadmin/attlas-2026/pull/3191) (`SOFTWARE-3054`,
> quadro e preset), [#3192](https://github.com/atmanadmin/attlas-2026/pull/3192) (`SOFTWARE-3055`,
> ferramentas e paleta), [#3193](https://github.com/atmanadmin/attlas-2026/pull/3193)
> (`SOFTWARE-3056`, salvar e descartar), [#3194](https://github.com/atmanadmin/attlas-2026/pull/3194)
> (`SOFTWARE-2686`, contrato backend) e [#3195](https://github.com/atmanadmin/attlas-2026/pull/3195)
> (`SOFTWARE-2686`, escolha por região no frontend). A implementação continua pendente das aprovações e
> merges dessa base; os registros abaixo de 09/09 permanecem como fotografia histórica.

> [!success] Estado em 11/09 no fechamento
> A prova de campo gerou quatro PRs independentes contra `develop`, abertas na ordem prevista. A #3303
> corrige a reconciliação, o transporte e o filtro de caixas pela região; a #3304 sincroniza o overlay
> com o vídeo; a #3305 corrige o deploy e as URLs internas; a #3306 aplica os defaults do ms-simulation.
> Todas estão com CI verde e sem comentários pendentes. A ordem de merge permanece #3303, #3304, #3305
> e #3306.
>
> O modo embarcado da câmera compartilhada `10.11.20.101` foi configurado: o device publica com
> `source_id=E827251A4173`, possui uma região de aproximação e o consumer do `ms-cameras` consome
> o tópico replicado pelo broker externo. O cadastro, a geometria e o broker do device foram mantidos
> compatíveis com o uso compartilhado pelo Attlas 25.

> [!warning] Estado em 09/09: três dias gastos, nenhum dos três cards começado
> Os três seguem em `backlog` no ClickUp e nenhum está na lista da própria sprint: `SOFTWARE-2398` e
> `SOFTWARE-2200` continuam na lista da Sprint 29, `SOFTWARE-2686` na da Sprint 30, e a lista "Sprint
> 32" nunca foi criada. Não há PR minha aberta.
>
> Os dois dias de trabalho da semana foram para o **front** do Analítico, fora do plano desta sprint:
> [#2910](https://github.com/atmanadmin/attlas-2026/pull/2910) destravou a `ci-develop` devolvendo
> `IInferenceResult` nos doubles de inferência, e
> [#2918](https://github.com/atmanadmin/attlas-2026/pull/2918) trouxe o porte de **Instâncias e
> Incidentes** para a develop e fechou os furos dele. Não é desvio gratuito: o prazo de 18/09 é front
> **e** backend, e essas duas telas eram a maior superfície do módulo que só existia no protótipo. Mas
> consome os dois dias que os cards de backend tinham.
>
> **O card 1 encolheu sozinho.** A [#2528](https://github.com/atmanadmin/attlas-2026/pull/2528), de
> sábado, entregou o `MOD-002` inteiro: posse de câmera por lease em Redis, recusa de índice de shard
> fora da faixa no boot, e a política de saturação. O que sobrou dele é **só a medição**: o teto é
> `VIRTUAL_LOOP_MAX_CAMERAS_PER_INSTANCE`, **sem default e comentada** no `.env.example` de propósito, e
> enquanto não for configurada a política fica inerte e declarada (`SPEC-ms-video-analytics` seção 9.2 e
> DD-6). O número sai da cadência de decode por resolução e do tempo de inferência sobre o recorte, e
> entra por configuração, sem tocar código.
>
> **O card 2 está com a descrição defasada.** O plano de teste dele ainda manda o
> `ms-connector-virtual-loop` traduzir o endereço, e esse serviço foi **removido** em 05/09 pela #2530.
> A tradução mora dentro do `ms-video-analytics` desde a #2376 (`PROJ-002`). Reescrever a descrição é
> parte de pegar o card, não item à parte.
>
> **O card 3 não tem nada pronto do lado do contrato.** `IVirtualLoopConfig` segue documentado como
> "a single, camera-wide setting (not per region)". O banco é que já ajuda: `CameraAnalyticRegion` tem
> `index`, e `VirtualLoopDetectorBinding` pendura na região, com unicidade por endereço e por
> `(regionId, purpose)`. A cardinalidade que falta é a do contrato, não a da tabela.

> [!important] Replanejada em 09/09, contra o inventário do módulo inteiro
> A semana foi redesenhada depois de confrontar o **edital seção 4.6** com o código da `develop`, item
> por item: [[Analítico - O que falta para fechar o módulo]]. O que a leitura mudou no plano:
>
> - **O card 1 encolheu** (o mecanismo de escala entrou em 05/09) e **o card 2 tem a descrição
>   defasada** (manda um serviço removido traduzir endereço).
> - **A aba Detecção está construída e desligada.** Falta o modo edição, e é o recurso "Visão Geral" do
>   edital - o mais visível dos que faltam. Entra nesta semana, com card ou sem.
> - **A face ATSPM está pronta e sem dado**: 4 das 38 métricas têm produtor. Mas o ATSPM **não é serviço
>   novo** - `detection_record` e `controller_cycle` já vivem no `ms-detector-history`, e o que falta é
>   módulo de agregação lá. Isso derruba a estimativa antiga de 10 pts para "serviço novo".
> - **Fechar o módulo inteiro até 18/09 com um dev não é possível**, e o inventário mostra por quê. Esta
>   semana entrega a cadeia demonstrável; ACOM, Dashboard e decisão automatizada ficam para depois do
>   prazo, declarados.

## Features (o que o sistema passa a fazer)

| Feature | Onde | Estado |
| --- | --- | --- |
| **Configurar a detecção pela tela**: congelar o frame, desenhar com as cinco ferramentas, descartar ou salvar, e a aba **Detecção** deixa de ser anunciada e desabilitada | `web-attlas`, `analytics-detection` | ✅ entregue pela #3066 em 11/09; specs #3191 a #3193 mergeadas |
| **Até 4 laços virtuais por câmera**, com o laço deixando de ser configuração única por câmera | `libs/contracts` (`virtual-loop`) + `ms-cameras` | ⏳ specs mergeadas em 11/09 (#3194 e #3195); implementação a fazer (`SOFTWARE-2686`) |
| **Teto medido** de câmeras por instância, com o número entrando por configuração | `ms-video-analytics` | ⏳ a fazer (`SOFTWARE-2398`) - o mecanismo já entrou em 05/09 |
| **Prova de campo ponta a ponta**: câmera comum, detecção em container, ocupação publicada, evento de detector na timeline com contadores coerentes | cadeia inteira | executada em 11/09 no EC2 dev; correções abertas nas #3303 e #3304 (`SOFTWARE-2200`), mais #3305 e #3306 sem card |
| **Métricas abre numa face que tem dado**, em vez de 34 cartões vazios | `web-attlas`, `analytics-metrics` | ✅ mergeada em 11/09 (#3190) |

## Telas

**Uma tela, e ela é a que o edital chama de Visão Geral**: a aba **Detecção** em modo edição. Hoje ela
existe em modo leitura só (53 arquivos), está **desabilitada na barra** e a costura para o modo edição já
está no código (`canEdit` e a saída `edit`). É o recurso que o edital descreve como o coração do módulo -
"o módulo Câmeras fornece o stream, o Analítico define o que fazer com ele" - e sem ele o operador não
configura nada pela plataforma.

As outras três abas ficam como estão: `instances` e `incidents` entraram em 07/09, e `metrics` só troca a
face default.

## Explicitamente NÃO entrega, e o motivo de cada uma

| O que fica fora | Por quê |
| --- | --- |
| **ACOM**: o caller que fecha o contato seco | Precisa de placa na bancada. Hoje o `AcomModule` não tem consumer Kafka nenhum: a transição de ocupação não fecha contato em lugar nenhum. Card existente é docs-only (`SOFTWARE-2392`) |
| **ACOM**: cardinalidade 1:1, mapeamento de canal e a tela de Periféricos | **Não é escopo deste módulo.** `docs/modules/analitico.md` `RF-ACOM-02` põe cadastro, conectividade e ciclo de vida da placa no módulo **Controladores**, e a fronteira do Analítico termina em "um cruzamento pode ser entregue como contato seco". O edital põe em Analíticos: a divergência precisa de decisão, e ela muda quem faz |
| **Dashboard do Analítico** (5º recurso do edital) | Superfície inteira, não existe rota nem aba. Parte dos indicadores se reusa do `cameras-dashboard` |
| **AOG, PCD, Approach Delay e TMC** | Dependem do mapa estágio para grupo de movimento (vive no Modelo de Tráfego, hoje ordinal sem FK) e de classe de objeto no evento de detector, que é mudança de contrato |
| **Snapshot da configuração semafórica por ciclo** | Precondição de correção do ATSPM, e o produtor é o `ms-controllers`, de outra squad |
| **Decisão automatizada alimentando as Estratégias** | Cross-módulo com o Modelo de Tráfego |
| **Histórico e versionamento da configuração analítica** | Requisito do edital, sem card. Primeiro candidato a entrar se algo da semana cair |
| **OTA do app embarcado** | Requisito de nota de alinhamento, não do edital 4.6 |

---

# Planejamento detalhado

## A pilha da semana: 12 PRs, 35 pts

> [!success] A #3066 mergeou em 11/09, e a pilha encolheu
> A `#3066` (`SOFTWARE-3057`) está na `develop`. Com ela entraram, além do refinamento das telas, **o
> modo edição inteiro da Detecção** e a spec `UF-053`, que é a unidade de registro da tela.
>
> **Três cards fecham sem PR de código**: `SOFTWARE-3054`, `SOFTWARE-3055` e `SOFTWARE-3056` (9 pts).
> As specs deles descreviam congelar o quadro e o preset, as cinco ferramentas, e salvar e descartar -
> tudo entregue pela #3066. Conferi critério por critério no código: o seletor de preset bloqueado na
> edição, os exatamente quatro vértices, o salvar e o descartar travados durante a escrita, e a aba já
> sem `disabled`. As três specs passaram para `implemented` e apontam a UF-053 como unidade de registro.
>
> **O `SOFTWARE-3052` encolheu para o `MOD-012`**. A `UF-046` e a `UF-047` saíram da PR: foram escritas
> em 10/09, antes da UF-053, e a #3066 invalidou a premissa das duas. A UF-046 existia para adotar as
> citações `UF-046` dos fontes, e a #3066 renomeou essas citações para `UF-053`.
>
> **Sobram quatro PRs de spec com trabalho real**: `#3188` (doc de módulo), `#3190` (face default de
> Métricas, que ainda abre na ATSPM vazia), `#3194` e `#3195` (quatro laços por câmera). A `#3188`
> passou a ter base `develop` e por isso voltou a receber CI.
>
> Triagem completa, PR por PR e com a evidência no código:
> [claude.ai/code/artifact/b2e4749b](https://claude.ai/code/artifact/b2e4749b-3cf6-4a8b-a825-40239a6e12a7)

> [!success] Fechamento em 11/09 à noite: a pilha inteira está na develop e a prova de campo aconteceu
> As oito PRs de spec (`#3188` a `#3195`) deixaram de ser cascata: cada uma recebeu `merge origin/develop`,
> base retargetada para `develop`, `ci-pr` verde e merge em sequência, entre 23:30 e 23:57, logo depois da
> `#3066` (23:01). A `UF-053` está `approved` na develop. Duas PRs pequenas nasceram do rabicho e seguem
> mergeadas após aprovação: [#3297](https://github.com/atmanadmin/attlas-2026/pull/3297) (runbook da MinIO
> fora do Docker Hub, pedido do Will) e [#3300](https://github.com/atmanadmin/attlas-2026/pull/3300)
> (links para a `UF-047` removida). O deploy seguinte terminou com sucesso no run `34665519410`.
>
> **A linha 10 saiu do papel sem esperar câmera nova**: o deploy do merge foi feito no EC2 dev e as duas
> câmeras ATMN do tenant atman passaram a detectar no `ms-video-analytics`, com ocupação chegando ao
> `ms-detector-history` (detectores 22 e 23 do controlador Quito 2) e bounding box na tela pública. O que
> travava, em ordem: env nova do ms-simulation, modelo fora do MinIO, frota sem região, mediamtx com
> configuração de agosto, paths do analítico apagados pelo restart do mediamtx, vínculo região-detector
> inexistente, PTZ duplicada num tenant morto e a URL do analítico ausente no ms-cameras. Cada item, o que
> é bug de código e a PR de destino estão em
> [[Registro - prova de campo do analítico servidor no EC2 em 11 de setembro]]. **A linha 11 vira a PR
> `[Back] Correções da prova de campo`** (`SOFTWARE-2200`, reconciliador dos paths do analítico), mais
> duas sem card (deploy e ms-simulation).

> [!info] Estado em 11/09 mais cedo: as nove PRs da pilha estão abertas
> As oito de spec (1 a 8) e a urgente (12) saíram do papel. As três que faltam (9, 10 e 11) seguem
> sem PR porque dependem de máquina e de campo, como o plano já previa.
>
> **A ordem de merge inverteu em relação ao plano.** A 12 (`#3066`) não ficou independente: ela virou
> a base da cascata, e as oito de spec sobem a partir dela. A consequência prática é que **só a
> `#3066` recebe CI** - o `ci-pr.yml` só dispara com base `develop`, então as oito empilhadas são
> revisadas sem check nenhum para se apoiar.
>
> **Onde cada uma está:**
>
> | Fase | PRs | Estado |
> | --- | --- | --- |
> | Mergeada | `#3066` | Duas rodadas de review atendidas (Will, Daniel, Sarah, Igor e o `claude[bot]`), 36 das 37 threads resolvidas, Lint e os três `validate` verdes, Integration Test rodando. Merge assim que fechar verde |
> | Specs, empilhadas | `#3188` a `#3195` | Abertas, sem review ainda. Review pedida em 11/09 a Will, Sarah, Igor, Daniel, Otávio e Hadson. O `@claude` foi disparado nas três primeiras |
> | Sem PR | cards 9, 10 e 11 | Dependem de máquina (`SOFTWARE-2398`) e de campo (`SOFTWARE-2200`) |
>
> **Um conflito de spec a resolver antes de mergear a `#3189`.** A `UF-053`, que entra pela `#3066`,
> abre justificando o próprio ID com "a `UF-046` deste módulo nunca existiu" e renomeia para `UF-053`
> as cinco citações dos fontes. A `#3189` faz o oposto: **cria** a `UF-046` do analytics justamente
> para adotar aquelas citações. Mergeadas em sequência, a segunda entra com a premissa já falsa e o
> módulo fica com três specs para a mesma tela de Detecção (`UF-046` leitura, `UF-047` edição e
> `UF-053` as duas mais o ciclo). A decisão de qual decomposição vale é do user.


Restam **cinco dias** (09 a 13/09). Onze PRs em cascata mais uma independente (a 12, urgente). A pilha segue as regras duras: docs-only na base, uma PR por card,
migration gerada por CLI não se parte, e **o que pode travar vai no topo** - aqui são as duas que
dependem de máquina e de campo.

Nomenclatura na convenção do ClickUp (`[Back]`/`[Front]` no nome). Estimativa pela tabela do time
(1 = menos de 2h, 2 = 2-4h, 3 = 4-8h, 5 = 1-2d, 8 = 2-3d, 13 = 4-5d).

| # | Task (nome no ClickUp) | ID | PR | Pts | Por que nesta posição |
| --- | --- | --- | --- | --- | --- |
| 1 | `[Back] Reconciliar o doc de módulo do Analítico com o edital` | [SOFTWARE-3051](https://app.clickup.com/t/86akffm6d) | [#3188](https://github.com/atmanadmin/attlas-2026/pull/3188) **mergeada 11/09** | 3 | Base da pilha: docs-only, merge rápido, zero conflito, e fixa o vocabulário das de cima. `docs/modules/analitico.md` existe (482 linhas) mas se organiza por DAI, VL, ATSPM e ACOM: **Visão Geral e Dashboard não têm seção nenhuma**, e o ATSPM tem três definições diferentes no projeto (8 métricas no edital, pacote de 4 funcionalidades no doc, 38 métricas no front). Decidir qual vale é pré-requisito de construir o ATSPM |
| 2 | `[Back] MOD-012: o ATSPM como módulo de agregação` (era UF-046 + UF-047 + MOD-012) | [SOFTWARE-3052](https://app.clickup.com/t/86akffm9z) | [#3189](https://github.com/atmanadmin/attlas-2026/pull/3189) **mergeada 11/09** | 2 | Docs-only, e **reduzida em 11/09** ao `MOD-012`, que declara o ATSPM como módulo de agregação do `ms-detector-history` e não como serviço novo (o plano dizia `MOD-003`). A `UF-046` e a `UF-047` saíram: escritas em 10/09 antes da `UF-053`, tiveram a premissa invalidada pela #3066, que renomeou para `UF-053` as citações que a UF-046 existia para adotar |
| 3 | `[Front] Métricas abre na face que tem dado` | [SOFTWARE-3053](https://app.clickup.com/t/86akffme4) | [#3190](https://github.com/atmanadmin/attlas-2026/pull/3190) **mergeada 11/09** | 1 | Independente de tudo, e é o conserto mais barato da pior aparência do módulo: hoje a aba default é a ATSPM, com 34 dos 38 cartões vazios |
| 4 | ~~`[Front] Detecção: congelar o frame e escolher o preset`~~ **ENTREGUE pela #3066** | [SOFTWARE-3054](https://app.clickup.com/t/86akffmkh) | [#3191](https://github.com/atmanadmin/attlas-2026/pull/3191) **mergeada 11/09** | 3 | Front puro, sem dependência externa. Primeira metade do modo edição |
| 5 | ~~`[Front] Detecção: as cinco ferramentas e a paleta`~~ **ENTREGUE pela #3066** | [SOFTWARE-3055](https://app.clickup.com/t/86akffmpw) | [#3192](https://github.com/atmanadmin/attlas-2026/pull/3192) **mergeada 11/09** | 3 | Depende da 4 |
| 6 | ~~`[Front] Detecção: salvar e descartar, e a aba sai de desabilitada`~~ **ENTREGUE pela #3066** | [SOFTWARE-3056](https://app.clickup.com/t/86akffmt8) | [#3193](https://github.com/atmanadmin/attlas-2026/pull/3193) **mergeada 11/09** | 3 | Depende da 5. É a PR que **liga a tela**: ligar antes de salvar funcionar ofereceria configuração que não persiste |
| 7 | `[Back] Suportar até 4 laços virtuais por câmera` (contrato e migration) | [SOFTWARE-2686](https://app.clickup.com/t/86ak5e32x) | [#3194](https://github.com/atmanadmin/attlas-2026/pull/3194) **mergeada 11/09** | 5 | Migration não se parte, então a escrita inteira mora aqui. Acima do front porque mexe em contrato publicado e consumido por dois serviços |
| 8 | `[Front] 4 laços: escolher o laço por região na Detecção` | [SOFTWARE-2686](https://app.clickup.com/t/86ak5e32x) | [#3195](https://github.com/atmanadmin/attlas-2026/pull/3195) **mergeada 11/09** | 3 | Depende da 7 e da 6 |
| 9 | `[Back] Escala do analítico: câmeras por instância e distribuição` | [SOFTWARE-2398](https://app.clickup.com/t/86aju7cjb) | sem PR | 2 | **Precisa de máquina para medir.** Vai alto: se a medição atrasar, não trava as de baixo. O mecanismo já entrou em 05/09, sobrou o número |
| 10 | `[Back] Prova de campo do analítico em container até a timeline do detector` | [SOFTWARE-2200](https://app.clickup.com/t/86ajj1xv4) | executada em 11/09 no EC2 dev (registro no vault) | 3 | **Precisa de câmera em campo.** É o elo que cede primeiro, então fica no topo |
| 11 | `[Back] Correções da prova de campo` | [SOFTWARE-2200](https://app.clickup.com/t/86ajj1xv4) | [#3303](https://github.com/atmanadmin/attlas-2026/pull/3303), CI verde; a metade front está na [#3304](https://github.com/atmanadmin/attlas-2026/pull/3304), CI verde | 2 | Nasce do resultado da 10, então não existe antes dela |
| **12** | `[Front] Refinamento de emergência das telas do Analítico` | [SOFTWARE-3057](https://app.clickup.com/t/86akfgfvq) | [#3066](https://github.com/atmanadmin/attlas-2026/pull/3066) **mergeada 11/09** | 5 | **Urgente, pedida em 09/09.** O plano dizia que ela não empilharia; na execução ela virou **a base de todas as outras**: a 1 tem base nela e as demais sobem em cascata a partir daí. Só ela tem base `develop`, e por isso é a única das nove que recebe CI |

**35 pts em cinco dias.** Está acima dos 13-20 que a tabela do time põe numa semana, e abaixo do que as
duas sprints anteriores fecharam de fato (51 na Sprint 30, 32 na Sprint 31). É agressivo, não é ficção.

### O ClickUp desta sprint, arrumado em 09/09

A lista `Sprint 32 (7/9/26 - 13/9/26)` (`901329020073`) passou a ter **10 cards do squad 2**, todos em
`to do` e assinados para mim, somando os 35 pts da pilha acima. O que foi feito:

- **Movidos para a lista da 32**: `SOFTWARE-2398` e `SOFTWARE-2200`, que estavam na lista da Sprint 29, e
  `SOFTWARE-2686`, que estava na da Sprint 30. Os três estavam em `backlog` e viraram `to do`, que é o
  que significa "é da semana".
- **Criado o `SOFTWARE-3057`**, prioridade **urgente**, para o refinamento de emergência pedido em 09/09:
  sai o botão Atualizar de Incidentes, entram filtros de data **e hora**, os painéis laterais ganham
  animação de entrada e saída, e o cartão inteiro do painel lateral das Métricas fica clicável. Os
  outros refinamentos verificados entraram na mesma descrição, não em card novo.
- **Criados seis cards** (`SOFTWARE-3051` a `SOFTWARE-3056`) para as PRs 1 a 6, que não tinham card.
  Acomodá-las nos três existentes seria errado: são requisitos diferentes do edital, e a regra de uma
  task por PR exige que o board bata com o GitHub.
- **`SOFTWARE-2200` teve a descrição reescrita.** A anterior mandava o `ms-connector-virtual-loop`
  traduzir endereço e chamava `ms-virtual-loop`, `ms-dai` e `ms-acom` de scaffolds de "Hello API": os
  três primeiros foram removidos do repo em 05/09 e a tradução mora no `ms-video-analytics` desde a
  #2376. O plano de teste virou seis passos, com pedestre incluído.
- **`SOFTWARE-2398` teve a descrição reduzida ao que sobrou**: o mecanismo de distribuição e a política de
  saturação entraram pela #2528, então o card é a medição do teto.
- **`SOFTWARE-2686` estava com a descrição vazia** e ganhou o escopo em duas PRs, com a compatibilidade
  aditiva de B12 declarada como requisito.

**Os pontos ainda não foram gravados.** O campo de story points é nativo do ClickUp e o MCP não escreve
nele - só `PUT /task/<id>` com `points`, e o token da API não está acessível nesta sessão. Os dez valores
estão na tabela da pilha acima: 3, 2, 1, 3, 3, 3, 8, 2, 5 e 5.

### O que o arrumo achou nas sprints anteriores

O board estava mais fora de sincronia do que a nota dizia, e isso foi corrigido no mesmo passe:

- **Os 10 cards da [[Attlas - Sprint 31]] estavam todos em `backlog`**, com as 10 PRs mergeadas desde 03 a
  05/09. Fechados: `SOFTWARE-2692` a `2699`, `2797` e `2798`.
- **`SOFTWARE-2794`, da Sprint 30, estava em `code review`** com a PR #2306 mergeada em 29/08, e sem
  assignee. Fechado e assinado.
- **`SOFTWARE-2687`** (saturação de banda da EC2) segue em `backlog` na lista da Sprint 30, e não é da
  frente do analítico - fica onde está.

## O que vai para a semana do prazo (14 a 18/09)

A [[Attlas - Sprint 33]] é a semana da entrega, não uma semana de desenvolvimento cheio, e desde 09/09 tem
nota própria. O que ela carrega, na ordem:

| # | Task | Pts | O que exige |
| --- | --- | --- | --- |
| 1 | `[Back] ATSPM: Split Monitor sobre o ciclo do controlador` | 5 | Só `controller_cycle`: `stageTimes` medido contra o alocado. Não sai do `ms-detector-history` e não precisa de join externo - é a métrica ATSPM mais barata que existe |
| 2 | `[Back] ATSPM: Yellow e Red Actuations` | 3 | Chegada (`detection_record`) dentro da janela de amarelo e vermelho do estágio, derivada do início do ciclo mais o acumulado de `stageTimes` |
| 3 | `[Front] A face ATSPM lê os dois grupos novos` | 2 | `ATSPM_DETECTOR_READERS` sai de 4 para 6 leituras, e os cartões correspondentes saem do vazio |
| 4 | `[Back] Histórico e versionamento da configuração analítica` | 5 | Requisito do edital ("versionamento, autor, data, motivo, reverter"). Só se sobrar semana |

São 15 pts numa semana que também tem a entrega em si.

Se a prova de campo escorregar da Sprint 32, ela ocupa esta semana e o ATSPM inteiro sai do prazo - a
prova é o que demonstra o módulo, a métrica é o que o enfeita.

## A decisão que continua sendo do user

**ACOM entra no prazo de 18/09?** Se sim, esta semana muda de forma: a atuação é o que faz o laço virtual
valer algo para o controlador legado, e são no mínimo quatro PRs (cardinalidade 1:1, remoção da feature de
associações, o consumer que fecha o contato, e a tela de Periféricos), com placa na bancada. Se não, o
módulo entrega no prazo **sem atuação** - detecta, publica, mede, e não fecha contato.

A pergunta do ATSPM mudou de natureza e não é mais bloqueio de orçamento: ele não é serviço novo, é
agregação sobre duas séries que já existem no mesmo banco. O que continua fora do alcance de 18/09 é a
metade das métricas que exige o mapa estágio-grupo de movimento e classe no evento de detector.


## Histórico do planejamento

### Por que o card 3 entrou aqui em 28/08

Estava em [[00 - Sem prazo (backlog)]] desde 24/08, e a razão registrada era dupla: "as Sprints 30 e 31
já estão cheias" e "depende da entidade e da persistência de região". **As duas caducaram.**

- A dependência **acabou**: a Sprint 30 entregou `CameraAnalytic` e `CameraAnalyticRegion`, com `index`,
  `deviceRegionId` e `presetId` no banco. O card está desbloqueado desde 28/08.
- E o momento é agora, não depois: o card redesenha `IVirtualLoopConfig`, em
  `libs/contracts/src/lib/virtual-loop/` - **o mesmo domínio que o card 2 da Sprint 31 abre** para o
  evento de ocupação. Fazer os dois em semanas seguidas mexe no domínio uma vez e o fecha. Empurrar
  para depois significa alterar um contrato que já estará publicado e consumido por dois serviços.

O requisito não é decisão em aberto: está escrito nas notas de alinhamento (*"cada analítico tem um
máximo de 4 laços por câmera"*). O que faltava era momento, e o momento é esta semana.

> [!note] O bloqueio do ATSPM é mais fino do que a nota dizia, conferido em 28/08
> A leitura anterior era "ATSPM está bloqueado, não há backend". Metade disso se sustenta, metade não, e
> a diferença muda a conta:
>
> - As 38 métricas se organizam em **7 grupos**: `flow`, `fundamental-diagrams`, `delay-reliability`,
>   `signal-progression`, `road-capacity`, `operational-quality` e `safety`.
> - O grupo **`flow` já tem de onde sair hoje**: é a mesma família de leitura que a tela do Laço Virtual
>   consome do `ms-detector-history` (`flow`, `vehicleCount`, `occupation`), e o serviço ainda tem
>   `cycle-history` por controlador e controlador virtual.
> - `fundamental-diagrams` está **explicitamente fora**, e documentado: o contrato
>   `IGetDetectorMetricsResponse` carrega `prediction: null` com a justificativa de que o ajuste de
>   curva dependia de um serviço `math-models` sem contraparte em 2026.
> - Os outros cinco grupos são ATSPM clássico (ciclo mais fase mais detector correlacionados) e é isso
>   que o ATSPM teria de computar, e nada disso existe ainda.
>
> **O que isso muda na decisão**: "ATSPM no prazo" não é uma coisa só de 10 pts. Vale dimensionar por
> grupo antes de responder sim ou não - o `flow` provavelmente é barato pelo mesmo caminho da tela do
> Laço Virtual, e o resto é serviço novo. Ninguém fez essa conta ainda, e ela é pré-requisito da
> resposta, não consequência dela.


## Riscos

1. **Cinco dias para doze PRs e 35 pts.** É a cadência que a Sprint 31 entregou (10 PRs e 32 pts numa
   semana), então é crível, mas não tem folga: qualquer review longo empurra o topo da pilha para a
   semana do prazo.
2. **As duas PRs do topo dependem de coisa que não está na minha mão** - máquina para medir o teto e
   câmera em campo para a prova. É por isso que estão no topo, e não no meio.
3. **A PR 5 mexe em contrato publicado.** `IVirtualLoopConfig` vira coleção uma semana depois de o domínio
   `virtual-loop` publicar o evento de ocupação, consumido por dois serviços. A compatibilidade aditiva é
   requisito do card, não detalhe de review.
4. **A face ATSPM vai para a entrega com 32 de 38 cartões vazios**, no melhor caso. Vazio honesto é melhor
   que número inventado, mas é o que o cliente vai ver na aba de métricas.
5. **O módulo entrega sem atuação** se o ACOM não entrar. Detecta e publica, e nenhum controlador legado
   recebe presença. É a decisão da seção acima, e ela tem prazo.

## Ver também

[[Analítico - O que falta para fechar o módulo]] · [[Planning - Sprint 31 e 32]] · [[Attlas - Sprint 30]] ·
[[Attlas - Sprint 31]] · [[00 - Sem prazo (backlog)]] · [[Analítico]] ·
[[Analítico - Embarcado x Servidor]] · [[Analítico - Frontend do attlas-design]]
