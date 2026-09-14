---
tags:
  - doc
  - analitico
aliases:
  - "Analítico"
  - "Analítico de vídeo"
  - "VL e ATSPM"
servico: ms-video-analytics (o analitico servidor, real desde 03/09; renome do ms-virtual-loop feito em 02/09). ms-atspm, ms-dai e ms-connector-virtual-loop foram REMOVIDOS do repo em 05/09 (PR 2530) - CROSS-077
fonte: auditoria de código de 24/08 (embarcado, servidor, ACOM/ATSPM) + Anotações sobre Analítico de vídeo (notas do user) + attlas-vl-atspm.pdf (squad de Visão Computacional, 10/08) + decisões preservadas das 14 PRs fechadas da Sprint 27 + prazo externo fechado em 25/08
atualizado: 2026-09-14
---

# Analítico (Virtual Loop, ATSPM, DAI, ACOM)

> Módulo próprio do edital (`docs/architecture/modules.md`), **não é submódulo de** [[ms-cameras]]. A
> relação com Câmeras é de dependência, não de posse. Duas capacidades de produto - **Virtual Loop** e
> **ATSPM** - e cada uma pode rodar de duas formas: **embarcada** na câmera ou em **servidor** analítico.
> A diferença entre as duas formas é o assunto de [[Analítico - Embarcado x Servidor]], que é a nota
> central deste domínio.

> [!important] Prazo externo: 18/09/2026, front e backend
> Fechado pelo user em 25/08: a entrega do Analítico de vídeo, **front e backend**, tem prazo de
> **18 de setembro de 2026**. A data cai na Sprint 33, depois do fim da [[Attlas - Sprint 32]] - as três
> sprints do analítico (30, 31, 32) são o desenvolvimento cheio antes da semana de entrega. A Sprint 30
> já tem 3 cards `[Front]` reais, com PR aberta (fila de incidentes, galeria de mídia de evidência,
> desenho sobre frame congelado) - o risco não é "zero frontend planejado". O risco genuíno é mais
> específico: a tela de **Métricas ATSPM**, já pronta no `attlas-design`, não tem card em nenhuma das três
> sprints (30, 31, 32) e não tem backend - ver [[Attlas - Sprint 32]], seção "Proposto, sem pontos
> fechados". A tela do **Laço Virtual** saiu desse risco em 28/08 e está em code review na Sprint 31
> (`SOFTWARE-2797`), mas entregou uma fatia, não a tela: a casca de três sub-abas, o funil de filtros e o
> Exportar seguem sem card, e o levantamento de 03/09 contou 33 discrepâncias visuais contra a
> referência - ver [[Analítico - Tela de Métricas no web-attlas]].

> [!important] Topologia fechada em 31/08: **um** analítico servidor, `ms-video-analytics`
> O analítico de vídeo tem **um único deployable novo**: o analítico servidor, que roda a capacidade
> configurada. É o `ms-virtual-loop` da [[Attlas - Sprint 31]], que **renomeia para
> `ms-video-analytics`**. ATSPM e DAI entram nele como capacidades; `ms-atspm`, `ms-dai` e
> `ms-connector-virtual-loop` **não nascem**, e `ms-acom` fica descontinuado (o ACOM real são os 78
> arquivos de `ms-controllers/src/acom/`).
>
> A regra que decide é a de [[Analítico - Embarcado x Servidor]]: o que muda por tipo de câmera é
> **onde** a capacidade roda, nunca a capacidade em si. Detalhe, alternativas rejeitadas e o custo
> concreto de separar em [[Analítico - Arquitetura e estratégias]]; no repo, `CROSS-077` e `ADR-31`.

> [!success] Estado em 09/09: a cadeia do Laço Virtual está de pé, e o front do módulo saiu do placeholder
> O quadro de 24/08 abaixo ("só o caminho embarcado existe") **caducou**. Entre 01 e 07/09 mergearam as
> dez PRs da [[Attlas - Sprint 31]] mais quatro de sábado e duas de segunda:
>
> - **Analítico servidor real.** `ms-virtual-loop` foi renomeado para `ms-video-analytics` em 02/09 e
>   hoje ingere stream, detecta objeto por frame, projeta ocupação de região com histerese, traduz para
>   endereço de detector e publica em `attlas.detectors.raw`. A tradução mora dentro dele, não num
>   connector.
> - **Pedestre é o segundo agente**, com histerese própria e endereço de detector por propósito
>   (`VirtualLoopDetectorBinding.purpose`), sem misturar contagem com a de veículo.
> - **Os três scaffolds sumiram do repo** em 05/09: `ms-atspm`, `ms-dai` e `ms-connector-virtual-loop`,
>   com toda a infra exclusiva deles. O monorepo passou a ter **25 microsserviços**, número corrigido nos
>   documentos canônicos. `ms-acom` fica, a decisão sobre ele segue em aberto.
> - **Escala tem mecanismo, não tem número.** Posse de câmera por lease em Redis e política de saturação
>   entraram; o teto `VIRTUAL_LOOP_MAX_CAMERAS_PER_INSTANCE` fica sem default até alguém medir.
> - **O front do módulo virou quatro abas**: `detection` (desenhada, mas **desabilitada** na barra),
>   `instances`, `incidents` e `metrics`. Instâncias e Incidentes foram portados do `attlas-design` e
>   mergearam em 07/09 pela #2918.
>
> O furo de `deviceSourceId` sem writer, descrito abaixo, foi fechado na Sprint 30. O que continua
> valendo do quadro antigo é o ATSPM: não existe em backend nenhum.

> [!success] Estado em 11/09 à noite: pilha da Sprint 32 na develop e prova de campo executada no EC2 dev
> A #3066 (`SOFTWARE-3057`, painel de câmeras, modo edição da Detecção e a `UF-053`) e as oito PRs de
> spec empilhadas (#3188 a #3195) mergearam em sequência entre 23:01 e 23:57. A aba **Detecção deixou de
> ser desabilitada**: congela o quadro, desenha com as cinco ferramentas, salva e descarta, em modo
> embarcado e em modo servidor. No mesmo dia a cadeia do analítico servidor rodou **no EC2 dev, com
> câmera real e bounding box na tela pública**: `ATMN – DEMO` (Laço Virtual) e `ATM-PTZ` (ATSPM), as duas
> em `SERVER`, com ocupação chegando ao `ms-detector-history` nos detectores 22 e 23 do controlador
> Quito 2. Os achados e os bugs que saíram disso, com o destino de cada um, estão em
> [[Registro - prova de campo do analítico servidor no EC2 em 11 de setembro]].

> [!success] Estado em 12/09: o console do Analítico consolidou, e a aba Analíticos da câmera foi aposentada
> **Tudo nesta entrada está na PR [#3328](https://github.com/atmanadmin/attlas-2026/pull/3328), com CI
> inteiramente verde e ainda NÃO mergeada** - nada disto está na `develop` hoje. A tela de **Detecção**
> passou a ser o **único** lugar onde região de detecção, laço virtual e configuração do analítico
> embarcado são lidos e escritos:
>
> - **A aba Analíticos do detalhe da câmera saiu.** 23 arquivos de
>   `apps/web-attlas/src/app/modules/cameras/`: os componentes `camera-analytics-panel`,
>   `camera-analytics-overlay`, `camera-analytics-frozen-frame` e `camera-analytics-incidents-dialog`,
>   mais o `camera-analytics-store.service`. As specs `UF-033` e `UF-036` passaram a `superseded`
>   apontando para a `UF-053`, com os corpos preservados como registro histórico. O
>   `CameraAnalyticsService` sobreviveu e hoje é consumido pela Detecção.
> - **A remoção entrou depois de fechar seis lacunas de paridade** (`UF-043`), nunca antes - remover com
>   lacuna aberta tiraria capacidade do operador em silêncio. As duas graves eram silenciosas: a Detecção
>   lia as regiões do **equipamento inteiro** em vez das do **preset ativo** (numa PTZ isso misturava
>   geometria entre enquadramentos, que é exatamente o que a `UF-036` existia para evitar) e não aplicava
>   a **invariante do laço** que o contrato exige - podar classe órfã, forçar inativo sem região. As
>   outras quatro: classes de evento restritas por tipo de incidente, tipo de região reaplicando o
>   preset, renomear região, e o log ao vivo das últimas detecções.
> - **Detecção não dá mais autoplay** (`UF-055`). Entrar na tela não abre sessão de vídeo: o operador
>   começa a reprodução e até lá vê o thumbnail. O gate mora **na página**, não no player compartilhado,
>   então `camera-detail`, videowall e o painel ATSPM seguem abrindo sozinhos.
> - **Instância de analítico deixou de ser leitura derivada e virou registro próprio** (`UC-075`,
>   RF-INST-01 e RF-INST-03): tabela `AnalyticInstance` com endereço, porta, capacidade de câmeras e
>   `pollingIntervalSeconds`, mais `AnalyticInstanceAvailability` guardando **uma linha por transição de
>   estado**, não por amostra. A tela de detalhe ganhou edição de verdade (`UF-056`), com permissão nova.
>   A migration aperta o índice - `CameraAnalytic_camera_type_embedded_unique` vira
>   `CameraAnalytic_camera_type_active_unique` (RF-INST-04), porque uma câmera com uma linha `EMBEDDED` e
>   uma `SERVER` do mesmo tipo era decodificada duas vezes; há guarda que **aborta o deploy** com
>   mensagem explícita se algum ambiente já tiver dado nessa forma.
> - **Fila de incidentes com seleção múltipla, chips de filtro multivalor e ação em massa**, sobre
>   endpoint de lote novo no `ms-cameras` (`UC-074`), com envelope de resultado **por item** em vez de
>   tudo-ou-nada. Sem agrupamento por padrão na lista, por decisão do user: os badges do topo já fazem a
>   agregação. Junto saiu um defeito: a fila mandava `DETECTED` no fio e o backend só entende `OPEN`, e
>   aquele filtro voltava vazio.
> - **Métricas do Laço Virtual**: Dados Brutos com rodapé de paginação e unidade de medida no cabeçalho
>   de cada coluna, e **o mapa de volta** - ver [[Analítico - Tela de Métricas no web-attlas]].
>
> Fora da #3328, três PRs de correção abertas e com CI verde, também **não mergeadas**: **#3303** (o teto
> de 64 caixas do overlay passou a valer **depois** do recorte por região, não antes), **#3304** (a fila
> de lotes do overlay ao vivo ganhou limite; antes crescia sem teto se o relógio da câmera estivesse
> adiantado) e **#3305** (o deploy comparava o `mediamtx.yml` rodando `md5sum` **dentro** do container,
> mas a imagem oficial é `scratch` - três arquivos, sem shell -, então o restart nunca acontecia; agora
> compara contra sentinela de hash no host).

## As duas capacidades e a placa

- **Virtual Loop (VL)** - detecção de cruzamento por laço virtual desenhado sobre o vídeo. Não tem
  geometria própria: reaproveita as regiões de detecção de objeto (DAI).
- **ATSPM** - pacote de quatro funcionalidades (Tracker, DAI, TPM e o VL embutido). Onde há ATSPM, o app
  de VL separado não é necessário. Cada funcionalidade é um sub-produto endereçável.
- **ACOM** - **não é capacidade**, é transporte: a placa que converte o laço virtual em contato seco para
  o controlador legado ler como laço físico. Vive em `ms-controllers/src/acom/` (DD-20), não no
  `ms-acom`, que é esqueleto morto.

## Estado real em 24/08 (auditado contra o código)

> [!important] Só o caminho embarcado existe, e ele tem um furo que impede o uso real
> O pipeline embarcado (`ms-cameras/src/analytics-realtime/`) é o único analítico que roda de fato. Mas
> **`deviceSourceId` não tem nenhum writer no banco**: só o seed e edição manual gravam essa chave, e é
> ela que liga o frame do device à câmera. Consequência verificável: **câmera cadastrada pela UI nunca
> recebe detecção ao vivo**. É o defeito mais grave do domínio hoje, maior que o bug de `kind` que a
> Sprint 27 registrou.

| Frente | Estado | Onde |
| --- | --- | --- |
| Analítico embarcado (pipeline ao vivo) | **Real**, com o furo acima | `apps/ms-cameras/src/analytics-realtime/` |
| Desenho de região e laço no frontend (overlay ao vivo) | **Real**, e desde 12/09 (#3328) num lugar só | `apps/web-attlas/src/app/modules/analytics-detection/` - a tela de **Detecção**, dentro do módulo próprio `analytics` com as abas `detection`, `instances`, `incidents` e `metrics`. A aba Analíticos do detalhe da câmera foi **removida** |
| Contratos de região, laço, detecção e frame | **Real** | `libs/contracts/src/lib/{object-detection,virtual-loop}/` |
| Analítico servidor (`ms-video-analytics`) | **Real desde 03/09.** Ingestão de stream, detecção por frame, ocupação de região, tradução de endereço e publicação do raw. Renomeado em 02/09 | `apps/ms-video-analytics/` |
| Tradutor de endereço | **Não é serviço.** Vive dentro do analítico servidor (`PROJ-002`), entregue em 03/09 | `apps/ms-video-analytics/` |
| `ms-atspm` e `ms-dai` | **Removidos do repo em 05/09** (PR 2530), com banco, rota Kong e scrape. São capacidades do analítico servidor | não existem mais em `apps/` |
| ACOM (CRUD, TCP, realtime) | **Real**, mas sem o caller que atua | `apps/ms-controllers/src/acom/` (80 arquivos) |
| Persistência de geometria de região | **Não existe em banco nenhum** - é proxy HTTP direto pro device | - |
| Entidade "Analítico" persistida | **Existe desde 12/09 (#3328)**: `CameraAnalytic` (Sprint 30) mais a `AnalyticInstance` da `UC-075`. A linha antiga - "é a chave `deviceSourceId` num campo `Json` livre" - caducou | `apps/ms-cameras/src/database/schema/analytic_instance/` |

## Os cinco buracos de ciclo de vida

A Sprint 27 especificou o **caminho do dado** (stream, detecção, ocupação, evento de detector, histórico)
e fez isso bem. O que ela deliberadamente não tocou é a **gestão do analítico** - e é exatamente o que as
notas de alinhamento do user pedem. Nenhum destes tem uma linha de spec:

1. **Entidade Analítico persistida**, com a unicidade "um analítico embarcado por tipo por câmera, exceto
   servidor".
2. **Healthcheck do analítico** consultável pelo operador. Hoje falha degrada em silêncio: região vazia é
   indistinguível de device offline.
3. **Compatibilidade por arquitetura de câmera** (ARTPEC 7/8/9), com identificação automática pelo
   backend (requisito fechado em 25/08) - o repo inteiro só cita ARTPEC em doc de codec de streaming.
4. **Preset PTZ com snapshot de região**. Hoje mover a câmera de preset invalida a geometria em silêncio.
5. **Atualização remota (OTA) do app embarcado**. Não existe nenhuma gestão de aplicação no device.

> [!important] Estado em 12/09: os quatro primeiros foram fechados, e o item 1 mudou de forma duas vezes
> Os itens 1 a 4 saíram entre as Sprints 30 e 32. O item 1 em particular fechou em duas etapas: o
> `CameraAnalytic` da Sprint 30 (um analítico embarcado por tipo por câmera) e, na #3328, a
> `AnalyticInstance` da `UC-075`, que faz da **unidade de processamento** um registro próprio nos dois
> modos de execução. A unicidade também apertou: passou a valer por `(câmera, tipo)` ativo, não só para
> `EMBEDDED`. Só o item 5 (OTA) segue sem nenhuma linha de código.

## Mapa de código

| Área | Onde | Estado |
| --- | --- | --- |
| Proxy pro device, WS ao vivo, consumer Kafka | `apps/ms-cameras/src/analytics-realtime/` | Real; sem persistência, sem writer de `deviceSourceId` |
| Tela de Detecção (desenho, overlay 60fps) | `apps/web-attlas/src/app/modules/analytics-detection/` | Real; congela o quadro e desenha sobre o frame do preset ativo. Desde a #3328 é a **única** superfície que lê e escreve região, laço e configuração do embarcado. De `modules/cameras/analytics/` sobraram só `analytics.types.ts` e `analytics.constants.ts`, compartilhados com ela |
| Contratos de região, laço, detecção, frame | `libs/contracts/src/lib/object-detection/`, `.../virtual-loop/` | Real; região é polígono de pontos em %, sem conceito de linha e sem validação |
| Contratos de detector (sumidouro) | `libs/contracts/src/lib/detectors/` | Real e completo (`IDetectorRawEvent`, `VIRTUAL_LOOP`, `deriveDetectorId`) |
| Histórico de detecção | `apps/ms-detector-history/` | Real e maduro; aceita o evento do laço virtual sem nenhuma mudança |
| ACOM | `apps/ms-controllers/src/acom/` | Real (CRUD, TCP, codec, pollers); **falta o caller** |
| `ms-video-analytics` | `apps/ms-video-analytics/` | Real: SPEC, `MOD-001` (pipeline), `MOD-002` (escala), INT-001/002, PROJ-001/002 e UC-001. É o único dos cinco que nasceu |
| `ms-acom` | `apps/ms-acom/` | Último scaffold de pé. `ms-connector-virtual-loop`, `ms-atspm` e `ms-dai` foram removidos em 05/09; a decisão sobre este segue em aberto |

## Notas deste domínio

- [[Analítico - Visão do produto]] - **comece aqui**: o módulo por inteiro em uma nota - o que é, onde
  roda, os três caminhos do dado, com o que se relaciona, estado real de cada peça e as 16 decisões das
  Sprints 30 a 32, cada uma com o motivo. É a vista de cima; as notas abaixo têm a profundidade.
- [[Analítico - Embarcado x Servidor]] - **a nota central**: o que muda e o que não muda entre as duas
  formas de execução, matriz de compatibilidade por arquitetura de câmera, e o contrato que faz as duas
  convergirem.
- [[Analítico - Requisitos e SLA]] - regras de negócio das notas de alinhamento e do PDF do squad de CV,
  cada uma com o estado real conferido no código.
- [[Analítico - Arquitetura e estratégias]] - implementação do que existe, as decisões preservadas das 14 PRs fechadas, dívida
  técnica e proposta de topologia de serviço.
- [[Analítico - Fluxos]] - fluxo de decisão ao cadastrar câmera e os três pipelines de dado.
- [[Analítico - Frontend do attlas-design]] - o frontend do módulo já foi desenhado e codado fora do
  produto, no repo `attlas-design`. Mapa de o que serve portar, o que não serve, e o que ainda é
  desenho novo (ARTPEC não existe no protótipo).
- [[Analítico - O que falta para fechar o módulo]] - **o inventário de fechamento**: os cinco recursos do
  edital (seção 4.6) confrontados com o código em 09/09, o que falta de cada um, e por que o módulo
  inteiro não cabe em um dev até 18/09. É a nota que o replanejamento da [[Attlas - Sprint 32]] usa.
- [[Analítico - Tela de Métricas no web-attlas]] - estado da rota `/analytics/metrics` no produto: o que
  já está em review, as 33 discrepâncias visuais contra a referência, os dois defeitos funcionais e de
  onde vem o dado de cada uma das três sub-abas.

- [[Registro - prova de campo do analítico servidor no EC2 em 11 de setembro]] - o dia em que a cadeia
  do analítico servidor rodou fora da máquina de desenvolvimento: estado final do EC2 dev, os nove
  achados em ordem, os cinco bugs de código e a PR de destino de cada um, o que foi verificado e não é
  bug, e os débitos declarados.

- [[Registro - os quatro blocos de configuração da Detecção no EC2 em 14 de setembro]] - onde cada um
  dos quatro blocos abaixo do player lê o estado dele, o inventário das sete analíticas do EC2 dev que
  mostrou por que os quatro apareciam desabilitados, e o script que fecha isso.

## Planejamento

Quatro sprints, contra o prazo externo de **18/09** (front e backend) registrado no topo desta nota. Cada
uma tem um `index.md` respondendo o que entrega em feature e em tela:

- [[Sprint 30 - o que entrega]] (24-30/08) - camada de gestão do embarcado: entidade em banco, saúde do
  analítico, writer do vínculo, compatibilidade ARTPEC, dedup de incidente, preset com snapshot,
  evidência. **5 telas. Fechada em 28/08**, 11 de 11 cards, 51 pts.
- [[Sprint 31 - o que entrega]] (31/08-06/09) - analítico servidor (Virtual Loop em container).
  **Fechada em 05/09**, 10 de 10 cards, 32 pts, mais quatro PRs fora do plano: peso do modelo, escala,
  pedestre como segundo agente e a remoção dos três scaffolds. Entregou também a tela de métricas do
  Laço Virtual.
- [[Sprint 32 - o que entrega]] (07-13/09) - **replanejada em 09/09**: 11 PRs em cascata e 30 pts em 9
  cards, somando o modo edição da aba Detecção (o recurso "Visão Geral" do edital, hoje construído e
  desligado) aos três cards que já existiam. **Fechada em 11/09**: a #3066 e as oito de spec mergearam, e a prova de
  campo (`SOFTWARE-2200`) foi executada no EC2 dev; as correções dela viram PR. **Em 12/09** saiu a
  consolidação do console (#3328) mais as três PRs de correção da prova de campo (#3303, #3304, #3305),
  todas com CI verde e **nenhuma mergeada**.
- [[Attlas - Sprint 33]] (14-20/09) - **a semana do prazo**, que cai na quinta 18/09. Resíduo declarado:
  ATSPM Split Monitor e Yellow/Red, a face lendo os dois grupos novos, e o histórico de configuração.

> [!danger] Fechar o módulo inteiro até 18/09 não é possível com um dev
> Depois da Sprint 33 sobram **90 pts** do edital, dos quais 16 são do módulo Controladores: ACOM,
> Dashboard do Analítico, decisão automatizada alimentando as Estratégias, as métricas ATSPM que exigem
> o mapa estágio-grupo de movimento e classe no evento, o snapshot da configuração semafórica, polling
> com histórico, recorrência de incidente, exportação e o OTA do embarcado.
>
> O que a entrega de 18/09 **é**: a cadeia do Laço Virtual ponta a ponta, demonstrável em campo, com a
> Detecção configurável pela tela, Instâncias e Incidentes no ar e as Métricas do Laço Virtual com dado
> real. O que ela **não é**: atuação em controlador legado, e o Dashboard do módulo. Item por item em
> [[Analítico - O que falta para fechar o módulo]].
>
> **Estado em 12/09**: o "polling com histórico" saiu desta lista - a `UC-075` da #3328 entregou
> `pollingIntervalSeconds` configurável e `AnalyticInstanceAvailability`. Os pontos correspondentes
> precisam sair da conta quando a PR mergear.

## Relacionados

[[ms-cameras]] · [[Cameras]] · [[PTZ e presets]] · [[Saúde e monitoramento]] · [[Streaming]] ·
[[Carga desnecessária nas câmeras - reconciler do analítico e conexões duplicadas]]

## Estudo de caso de 14/09

[[Analítico - Estudo de caso de captura, inferência e sincronização]] - por que o analítico servidor
gasta 580% de CPU no EC2 (é a inferência, não o vídeo), a arquitetura alvo em três camadas (captura
direta da câmera num perfil de analítico, inferência dentro de um orçamento, sincronização pelo relógio
da câmera nas duas pontas), o diagnóstico do videowall e a decisão sobre CDN. As cinco PRs que saem
dele estão na [[Attlas - Sprint 33]].
