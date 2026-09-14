---
tags:
  - doc
  - analitico
  - frontend
  - web-attlas
aliases:
  - "Tela de Métricas no web-attlas"
  - "Métricas do Analítico - estado da tela"
atualizado: 2026-09-09
fonte: leitura direta de apps/web-attlas/src/app/modules/analytics-metrics na ponta da pilha (cameras/feat/SOFTWARE-2797-map) contra modulo-analitico/entrega-frontend do attlas-design, em 03/09/2026
---

# Analítico - Tela de Métricas no web-attlas

Parte do [[Analítico]] e faceta de implementação de [[Analítico - Frontend do attlas-design]]. Esta é a
nota de estado da rota `/analytics/metrics` no produto: o que está no ar, o que está em review, o que
divergiu da referência e em que ordem o resto entra. Existe porque o Lote 10 do
[[Plano - atualização da documentação do vault]] nunca foi escopado e a tela entregue não tinha casa
em `Docs/`.

## Onde a tela mora

| Peça | Caminho |
| --- | --- |
| Rota | `apps/web-attlas/src/app/app.routes.ts`, dentro do bloco `analytics`, aba `metrics` |
| Módulo lazy | `apps/web-attlas/src/app/modules/analytics-metrics/` |
| Abas do módulo | `apps/web-attlas/src/app/modules/analytics/constants/analytics-nav.constant.ts` |
| Spec | `apps/web-attlas/docs/modules/analytics/atomic/UF-042-virtual-loop-metrics.md` |
| Traduções | `libs/contracts/src/lib/i18n/locales/<locale>/cameras.json`, sob `camera.metrics.virtualLoop` |
| Referência visual | `attlas-design/modulo-analitico/entrega-frontend/src/app/modules/analytics/` |

A pasta de docs se chama `analytics` e o módulo Angular se chama `analytics-metrics`, e essa diferença
importa: o `scripts/spec-id.mjs` tira o namespace do caminho de docs, então spec nova continua em
`docs/modules/analytics/atomic/` para não reiniciar a numeração.

## O que existe hoje

> [!info] Estado em 09/09: as duas PRs mergearam e as abas irmãs deixaram de ser placeholder
> A #2380 e a #2517 entraram em 03 e 04/09, fechando o `SOFTWARE-2797`. Em 07/09 a
> [#2918](https://github.com/atmanadmin/attlas-2026/pull/2918) trouxe o porte de **Instâncias** e
> **Incidentes**, e o módulo `analytics` passou a ter quatro abas de verdade: `detection` (existe em
> código, 53 arquivos, mas fica **desabilitada** na barra, anunciada e sem link), `instances` (51),
> `incidents` (80) e `metrics` (210).
>
> As duas decisões que esta nota deixava em aberto abaixo **foram tomadas**: as chaves nasceram em
> `libs/contracts/src/lib/i18n/locales/<locale>/analytics.json` próprio, e a barra de sub-abas entrou
> junto do porte, em branch `analytics`, não como terceira PR do `SOFTWARE-2797`.

São 65 arquivos e 3.577 linhas, somando as duas PRs que fecharam o `SOFTWARE-2797`. A rota deixou o
`SectionPlaceholder` e virou módulo lazy.

A camada de dado é composição de dois endpoints que já existiam, sem uma linha de backend novo:
`GET /api/cameras/:id/virtual-loop-bindings` devolve o vínculo com o `detectorId` já derivado no
servidor, e `GET /api/detector-history/detectors/:id/metrics` devolve as janelas. As quatro leituras
saem de `windows[].flow`, `windows[].vehicleCount`, `windows[].occupation` vezes cem e
`occupation` vezes `duration`.

O que está sólido e não se mexe: os oito utils com oito specs (a matemática das leituras, a regra de
balde vazio que renderiza traço e nunca zero, o centroide de interseção), o mapa MapLibre de 297
linhas com marcador acessível e enquadramento único por conjunto, e a tabela crua sobre o
`app-data-table` compartilhado. São 86 testes unitários em 14 arquivos.

## O que divergiu da referência

O levantamento de 03/09 comparou arquivo de estilo contra arquivo de estilo e contou **33
discrepâncias visuais mensuráveis mais 8 invenções locais**. A conclusão é que a tela do repo não é um
porte da referência, é uma segunda implementação, e por isso nenhum par de arquivo bate em grid, gap,
padding, raio, tipografia ou altura de gráfico.

As seis que produzem a percepção de tela mal acabada, na ordem em que devem ser atacadas:

1. **Sem casca de página.** A referência envolve tudo em `app-pagina-modulo`; a tela desenha um `h2` e
   um `p` próprios dentro de um `section`. O produto tem o equivalente pronto, `app-module-page`, e a
   aba irmã de Incidentes já o usa. O resultado colateral é padding dobrado: o shell aplica 24px e a
   página aplica outros 24px.
2. **Sem barra de sub-abas.** A referência tem três faces numa rota só, ATSPM, Laço Virtual e
   Incidentes, com a não construída em `aria-disabled` declarando o motivo. A tela não tem barra
   nenhuma e monta o conteúdo do laço direto na rota.
3. **Colunas invertidas.** A referência põe o conteúdo à esquerda e a lateral fixa em 320px à direita,
   com nota explícita de que uma lateral que muda de tamanho ao trocar de aba se lê como outra tela. A
   tela põe a lateral primeiro e fluida entre 224 e 288px.
4. **O gráfico do cartão é um sparkline.** A referência desenha 176px de altura, com grade, valores do
   eixo e nome de eixo rotacionado em DOM. A tela desenha 48px de `polyline` SVG com
   `preserveAspectRatio="none"`, que distorce a curva em qualquer largura. É uma diferença de 3,7 vezes
   na altura, e ECharts com `ngx-echarts` já está no repo, usado por `pmv-operations` e `controllers`.
5. **A figura virou manchete.** A referência põe a agregação numa linha de 12px, com só o número em
   negrito, e a hora da última leitura no extremo oposto. A tela põe o valor isolado a 28px e não diz
   nem a palavra da agregação nem a hora.
6. **A lista de câmeras é lista de links.** A referência é uma pilha de cartões de câmera com disco de
   status, badge de analítico compatível e frame de vídeo. A tela é um botão de duas linhas de texto,
   e o dado do status já está no `IVirtualLoopCamera`.

As invenções locais que devem sair: caixa com borda e fundo em volta do chip de escopo, input de busca
estilizado à mão em vez de `z-input-group`, seleção pintada com `--accent` e negrito em vez da lavagem
de seis por cento de primary, nome da câmera no cabeçalho da página contra decisão registrada da
referência, `max-height` descontando 160px sem origem declarada, piso de 224px no scroller do painel,
sete pesos de fonte numéricos onde há token, e a tabela da modal montada à mão duplicando a tabela crua
que já está na página.

## Defeitos funcionais, não visuais

> [!success] Resolvido em 05/09: o funil não oferece mais janela que a API recusa
> **Era** o defeito mais grosso da tela: o `ms-detector-history` recusa com 400
> `METRICS_WINDOW_TOO_LARGE` qualquer janela acima de dez horas, a checagem roda no caminho `PERIOD`, e
> três dos quatro presets (12 h, que era o **default**, mais 24 h e 7 dias) estouravam o teto. Só o de
> 6 h carregava, e o primeiro quadro da tela abria em erro que o operador lê como falha de rede.
>
> A [#2528](https://github.com/atmanadmin/attlas-2026/pull/2528) trocou o funil por **1 h, 3 h, 6 h e
> 10 h**, com default em 6 h. O teto não voltou cravado: `MAX_WINDOW_HOURS` deriva de
> `DetectorMetricsValidation.detectionSpan.maxMs`, a mesma fonte que a face ATSPM já lia. O que sobra
> preso ao número é o rótulo ("Últimas 10 h"), porque o picker compartilhado traduz chave nua e não
> aceita parâmetro: mexer no teto do contrato exige mexer nos quatro catálogos.
>
> O teto **não se contorna por balde**: ele é sobre `end - start`, não sobre quantos pontos a resposta
> traz. Uma janela de 24 h em baldes de uma hora são 24 pontos e continua recusada.

Continua morto o **período personalizado**: a página passa `customValue` ao
`app-period-picker` mas não liga `[dateRange]` nem escuta `(rangeChange)`. Escolher Personalizado abre
o calendário, a faixa é emitida e ninguém a recebe. A aba de Incidentes tem o precedente correto.

Continua aberto também um menor: a coluna Intervalo da tabela crua é derivada com o bucket pedido e com
o `start` calculado no cliente, não com o `start` realinhado que o response devolve somado à soma dos
`duration` anteriores. A própria UF-042 manda o contrário, e é o único dos oito testes obrigatórios da
spec que não tem asserção.

## De onde vem o dado de cada sub-aba

O que decide o que é possível construir é o dado, e a resposta é diferente por face.

**Laço Virtual** está inteiro servido, sem backend novo. É a única das três nessa situação.

**Incidentes** tem base real e não precisa de endpoint próprio: um incidente é um evento do log
cross-câmera com `category=ANALYTICS`, e a mesma resposta de `GET /api/cameras/events` já traz três
agregados do conjunto filtrado inteiro, `incidentTypeCounts`, `statusCounts` e `cameraCounts`. Isso
serve total, por tipo, por status, por câmera e o detalhamento tipo por câmera. Criticidade sai de um
fold por tipo, com a tabela que já existe versionada no frontend. O que **não** sai: a série temporal,
porque não há agregação por bucket de tempo no log de eventos; o corte por analítico, porque
`analyticType` só vem por linha da página; e as duas medianas de tempo até reconhecer e até concluir,
porque `CameraEventTreatment` guarda um único status e um único `updatedAt`, sem histórico de
transição. A matriz câmera por hora tem endpoint real, mas ele não filtra por categoria e somaria
falha de hardware junto com incidente.

**ATSPM** não tem uma linha de backend. O `apps/ms-atspm` é scaffold de dezoito arquivos e a PR #2530
está removendo, porque [[Analítico - Topologia de serviço do analítico de vídeo]] decidiu que ATSPM é
capacidade do analítico servidor. Mesmo que o serviço nascesse amanhã, só quatro das 38 métricas do
catálogo da referência têm origem hoje, e as sete dos Diagramas Fundamentais estão declaradas no
contrato como nunca calculadas. Vale registrar que as 38 métricas **não têm requisito aprovado no
repo**: `docs/modules/analitico.md` não lista nenhuma, e spec de UF não define regra de negócio.

## Ordem em que o resto entra

A tela completa não é ajuste da existente: são duas faces novas mais a barra, e só os painéis somam
cerca de 1.700 linhas de protótipo, fora o funil de filtros com calendário de intervalo, que são outras
900 e não existem no repo em forma nenhuma.

1. ~~Fechar as duas PRs abertas, na ordem #2380 depois #2517~~ - **feito em 03 e 04/09**.
2. Casca da tela: `app-module-page`, barra de três sub-abas com ATSPM desabilitada declarando o motivo,
   e o contrato de relatório do painel para a página, que é o que o Exportar e o subtítulo leem.
3. Paridade visual do Laço Virtual, incluindo o cartão em ECharts e os dois defeitos funcionais.
4. Face Incidentes, com os cortes possíveis construídos e os impossíveis em estado vazio que nomeia a
   falta em vez do genérico "sem dados".
5. Face ATSPM, que espera backend e não tem card.

As duas decisões que esta seção listava como pendentes saíram em 07/09, junto do porte: as chaves de
tradução nasceram em `analytics.json` próprio (a regra do repo é um arquivo por módulo Attlas), e a
barra de sub-abas entrou pela branch `analytics`, não como terceira PR do `SOFTWARE-2797`. O item 5
segue de pé: a face ATSPM espera backend e não tem card.

## Ver também

[[Analítico]] · [[Analítico - Frontend do attlas-design]] ·
[[Analítico servidor - Métricas do Laço Virtual (front)]] ·
[[Analítico - Topologia de serviço do analítico de vídeo]] · [[Attlas - Sprint 31]]
