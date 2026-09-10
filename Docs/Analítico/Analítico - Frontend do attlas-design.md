---
tags:
  - doc
  - analitico
  - frontend
atualizado: 2026-09-09
fonte: leitura direta do repo atmanadmin/attlas-design (branch main) em 25/08/2026
---

# Analítico - Frontend do attlas-design

Parte do [[Analítico]]. O frontend do módulo **já foi desenhado e codado** no repositório
`atmanadmin/attlas-design` (privado, branch `main`), fora do produto. Esta nota é o mapa de **o que
serve, o que não serve, e o que ainda precisa ser desenhado** - para não portar às cegas nem
reimplementar o que já existe.

> [!success] Estado em 09/09: as duas maiores superfícies deste mapa já foram portadas
> **Instâncias** e **Incidentes** saíram do protótipo e estão na develop, mergeadas em 07/09 pela
> [#2918](https://github.com/atmanadmin/attlas-2026/pull/2918), em
> `apps/web-attlas/src/app/modules/analytics-instances/` e `.../analytics-incidents/`. Com as
> **Métricas do Laço Virtual** (Sprint 31), o módulo passou a ter quatro abas: `detection` (desenhada e
> **desabilitada** na barra, com a rota montada para deep link não quebrar), `instances`, `incidents` e
> `metrics`.
>
> O que o porte custou, e vale reter para o próximo: 89 arquivos vieram de uma vez, e uma auditoria
> depois achou regressão de produto (fila de incidentes com teto rígido de 20 itens por ter perdido a
> paginação, chip de criticidade rotulado com a chave de período, contagem dos chips misturando agregado
> do servidor com página em mão), reversão acidental de outras frentes (rótulos de prioridade seletiva
> apagados dos quatro catálogos) e um defeito em `core/shared` que atingia todo módulo (o `ModulePage`
> escondia o slot `[pageActions]` junto com o título). **Porte grande precisa de auditoria própria**, não
> de review de tela.

> [!important] É protótipo mock-first, não um app pronto pra copiar inteiro
> Todo dado é servido por um interceptor HTTP local (`core/mocks/mock.interceptor.ts`), sem backend
> nenhum. **Zero teste automatizado**, texto pt-BR hardcoded (sem catálogo i18n), sem `errorCode`,
> sem guarda de permissão. O que se porta é **HTML, CSS e fluxo de interação** - a camada de
> `services`/`interfaces` é reescrita contra `@attlas/contracts` e os endpoints reais.

## O repositório

Não é um app único: é um monorepo de protótipos, um Angular 21 independente por módulo, cada um com
`package.json`/`angular.json` próprios, herdando uma casca comum (`base/attlas-base`) e o design
system vendorizado em `shared/zard/` (cópia local do `libs/ui-shared` do produto, Font Awesome Pro
vendorizado). Existem skills Claude Code dedicadas em `.claude/skills/` (`attlas-modulo`,
`attlas-prototipo-codigo`, `attlas-ajuste`) que padronizam como cada módulo é gerado.

O módulo do analítico vive em `modulo-analitico/entrega-frontend/`. A pasta irmã
`attlas-analitico-prototipo/` é resíduo vazio, sem `src` - ignorar. Stack: Angular 21 com
`standalone: false` (NgModule clássico + routing module dedicado, mesmo padrão DD-007 do produto),
ECharts para gráficos, MapLibre para os dois mapas.

Docs SDD próprios do protótipo em `docs/modules/analytics/`: `MOD-ANL-A-analytics.md` mais 6
atômicas `UF-ANL-A` a `UF-ANL-F`. O pacote de entrada bruto do domínio está em `pacote-de-entrada/`
(`ATSPM-FLUXO-DO-MAPA.md`, `INCIDENTES-ESPECIFICACAO.md`, `MODULO-ANALITICA-DE-VIDEO.md`).

## O que serve, por superfície

| Superfície no protótipo | Destino no produto | Veredito | Card |
| --- | --- | --- | --- |
| `incident-media/` + `incident-media-viewer/` - galeria de mídia de evidência em 3 abas (imagem, vídeo, anexos do operador), carrossel, upload, confirmação de remoção | Imagem de evidência da detecção | **PORTADO em 07/09** (#2918) - vive em `analytics-incidents/components/incident-media/` | [[Analítico - Fonte da imagem de evidência]] |
| `pages/incidents/` + `pages/incident-detail/` + `incidents-panel`/`incidents-table`/`incidents-map`/`incident-side-detail`/`incident-timeline` - fila de incidentes com mapa MapLibre e 216 incidentes mockados | Fila de incidentes do DAI | **PORTADO em 07/09** (#2918) - fila, mapa, painel lateral, timeline, barra de ferramentas, funil de tipos e controles de tratamento. A fila entrou como janela incremental, não como as 20 linhas fixas do porte original | [[Analítico - Contagem e dedup de incidente DAI]] |
| `atspm-*` (panel, camera-map, camera-card, camera-dialog, metric-card, metric-dialog, metric-visibility) - 38 métricas em 7 grupos, mapa cheio-tela com 15 interseções | Métricas ATSPM | **Esperar backend** - e não é a Sprint 31 que o entrega: o ATSPM não existe em lugar nenhum, e desde 31/08 ele é capacidade do analítico servidor, não serviço próprio. Os blocos `atspm-metric-card` e `atspm-camera-panel` saem antes, junto do Laço Virtual, por serem dependência dele | - |
| `virtual-loop-panel/` + `virtual-loop-raw-table/` - Fluxo e Densidade | Métricas do Laço Virtual | **PORTAR** - corrigido em 28/08. Não depende do servidor de VL: as 4 métricas saem do `ms-detector-history`, que já existe maduro. Ver o aviso abaixo | [[Analítico servidor - Métricas do Laço Virtual (front)]] |
| `instance-creation-panel/` - criação de instância de analítico com `compatibleTypes`/`compatibilityLine` | Compatibilidade por arquitetura | **A casca foi portada em 07/09** (#2918): a aba `instances` tem tabela, filtro, visibilidade de coluna e painel lateral. A exclusividade ali continua sendo por **tipo** de analítico (VL x ATSPM), não por arquitetura de chip - isso segue com o card próprio. Ver aviso abaixo | [[Analítico - Compatibilidade por arquitetura de câmera]] |
| `detection-frame/` (963 linhas) - desenho de região em SVG sobre **imagem parada**, com frame congelado avisado na superfície, `presets`/`activePreset`/`presetChange`, `frameCapturedAt`, `backdropRegions` e desenho por teclado | Desenho de região sobre frame congelado do preset | **PORTAR** - corrigido em 25/08. O `web-attlas` está à frente no *ao vivo* (integrado desde 14/07, PR #766), mas **não tem** o modo frame congelado, nem seletor de preset, nem desenho por teclado, e é exatamente isso que o `detection-frame` resolve | [[Analítico - Desenho de região sobre frame congelado (front)]] |
| `detection-toolbar/` + `detection-block/` + `detection-class-tree/` | Aba Analíticos (ferramentas do desenho) | **Não portar** - a aba Analíticos do `web-attlas` já cobre isso contra o `ms-cameras` real | - |
| `camera-ptz-control/` - presets como lista estática, botões Ir para/Executar/Parar | Preset PTZ com snapshot | **Não portar** - o painel declara "Sem serviço de PTZ nesta entrega" e não há fluxo de capturar/salvar snapshot. Captura e persistência são backend. Mas o *desenho* sobre o frame congelado tem sim de onde vir: `detection-frame`, linha acima | [[Analítico - Preset PTZ com snapshot de região]] |

> [!danger] Erro de leitura desta nota, corrigido em 25/08
> A versão anterior mandava **não portar** o `detection-frame` e afirmava que o card do frame
> congelado partia do zero. Errado nas duas pontas: eu tinha olhado só o `camera-ptz-control/` para
> julgar o caso do preset, e o `detection-frame` - que resolve frame congelado, seletor de preset e
> data de captura - ficou de fora da avaliação. Custou uma spec reescrita no mesmo dia.
>
> Lição para as próximas: "o produto está à frente" vale por **capacidade**, não por componente. O
> `web-attlas` está à frente no desenho *ao vivo* e atrás no desenho sobre *imagem parada*, e são
> componentes com o mesmo nome de assunto.

> [!danger] Segundo erro de leitura desta nota, corrigido em 28/08
> As duas linhas de métricas diziam **"esperar Sprint 31 - não existe backend antes do servidor de VL"**,
> e foi por isso que as telas de métricas ficaram fora das três sprints do analítico. A afirmação nunca
> tinha sido conferida contra o código, e está errada para o Laço Virtual.
>
> A tela de VL **não lê o analítico, lê o histórico de detector**. As quatro métricas do
> `virtual-loop-metric-catalog` saem inteiras de `GET /api/detector-history/detectors/:id/metrics`:
> `windows[].flow` (já em veíc/h), `windows[].vehicleCount`, `windows[].occupation` (fração 0..1), e o
> tempo de ocupação por `occupation × duration`. O `ms-detector-history` tem 217 arquivos e 5 relatórios
> de teste de campo; o `web-attlas` já consome esse endpoint pelo `DetectorHistoryService`, reusado pelo
> `traffic-model` em `via-detector-metrics.service.ts`.
>
> A dedução errada foi "métrica de laço virtual precisa do laço virtual", que **confunde quem produz o
> dado com quem serve a leitura**. Quem produz muda (laço físico hoje, `ms-virtual-loop` depois do card
> 8 da Sprint 31); quem serve é o mesmo serviço nos dois casos, e essa é justamente a intenção do
> contrato comum.
>
> Lição, e é a segunda vez que esta nota erra pelo mesmo motivo: **veredito de portabilidade só vale
> conferido contra o serviço que serve o dado**, não deduzido do nome da tela. Custou a tela ficar três
> sprints fora do planejamento, e ela só apareceu porque o user perguntou se alguma cabia.
>
> Para o ATSPM o bloqueio é real e continua: não há backend. Desde 31/08 ele deixou de ser serviço próprio e virou **capacidade** do analítico servidor ([[Analítico - Topologia de serviço do analítico de vídeo]]), o que muda onde ele será construído, não o fato de ainda não existir.

> [!danger] Terceiro erro de leitura desta nota, corrigido em 03/09
> Esta nota afirmava duas vezes que portar o Laço Virtual arrastaria `atspm-metric-card` e
> `atspm-camera-panel` por dependência, e que isso adiantaria o porte do ATSPM. Conferido no código da
> ponta da pilha (#2517), **não existe nenhum diretório `atspm-*` em
> `apps/web-attlas/src/app/modules/analytics-metrics/`**. Os componentes nasceram como
> `virtual-loop-camera-panel`, `virtual-loop-camera-list`, `virtual-loop-camera-map` e
> `virtual-loop-metric-card`, todos com nome e escopo de laço virtual, e o `metrics-filter-popover`
> não foi portado: a tela reusa o `PeriodPickerComponent` compartilhado.
>
> A dedução errada foi tratar "o painel de VL usa o cartão do ATSPM no protótipo" como se a estrutura de
> arquivo do protótipo fosse a do produto. Ela não é: quem porta nomeia pelo que a tela entrega, e a
> tela entregava laço virtual. O ATSPM continua com o mesmo peso de antes, e ganhou um item a mais -
> generalizar os quatro componentes ou duplicá-los.
>
> Lição, e é o terceiro acerto de contas desta nota no mesmo padrão: **previsão de efeito colateral de
> porte só vale conferida contra o diretório que nasceu**, nunca contra a árvore do protótipo.

> [!warning] ARTPEC não existe no protótipo
> Zero ocorrência de "ARTPEC" no repositório inteiro. O `instance-creation-panel` tem
> `compatibleTypes`/`compatibilityLine`, mas é exclusividade entre tipos de analítico, não a matriz
> de compatibilidade por geração de chip. A tela de compatibilidade
> ([[Analítico - Compatibilidade por arquitetura de câmera]]) é **desenho novo** em cima da casca
> desse painel, não portabilidade.

## Saúde do analítico: parcial, e por outro eixo

O protótipo modela saúde no nível da **instância** de analítico
(`i-instance-health.interface.ts`: `latencyMs`, `errorRatePercent`, `warningFromInstance`, mais
`i-health-history-point.interface.ts` e status online/degraded/offline em `instances.page.ts`). Isso
não é o mesmo eixo que [[Analítico - Healthcheck do analítico]] pede, que é saúde **por câmera**
dentro do payload de status que a tela de detalhe já consome. O backend e a linha na aba
"Informações Gerais" foram implementados sem portar nada daqui - o protótipo fica como referência de
como exibir histórico de saúde, se um dia isso entrar.

## Ordem de portabilidade recomendada

1. **Mídia de evidência** - mais pronto, autocontido, menor raio de impacto.
2. **Fila de incidentes** - maior superfície nova; é a tela que consome o dedup quando ele existir.
3. **Laço Virtual** (Sprint 31, `SOFTWARE-2797`) - subiu de posição em 28/08 e está em code review desde
   31/08, nas PRs #2380 e #2517. Backend pronto. **Não adiantou o item abaixo**, ver o callout de 03/09.
4. **ATSPM** (sem prazo, espera o backend do ATSPM dentro do analítico servidor) - mais pesado: MapLibre mais ECharts mais 38 métricas.
5. **Instâncias/fleet** - prioridade menor. A parte de ARTPEC saiu da conta de frontend: é lógica de
   backend (decisão do user, 25/08), e o que resta na tela é campo a mais no wizard de cadastro que já
   existe - vai dentro do card `[Full]` [[Analítico - Compatibilidade por arquitetura de câmera]], sem
   card de front próprio.

## Ver também

- [[Analítico]] · [[Analítico - Embarcado x Servidor]] · [[Analítico - Fluxos]]
- [[Attlas - Sprint 30]] (onde cada portabilidade virou card `[Front]`)
