---
tags:
  - doc
  - analitico
  - frontend
atualizado: 2026-08-25
fonte: leitura direta do repo atmanadmin/attlas-design (branch main) em 25/08/2026
---

# Analítico - Frontend do attlas-design

Parte do [[Analítico]]. O frontend do módulo **já foi desenhado e codado** no repositório
`atmanadmin/attlas-design` (privado, branch `main`), fora do produto. Esta nota é o mapa de **o que
serve, o que não serve, e o que ainda precisa ser desenhado** - para não portar às cegas nem
reimplementar o que já existe.

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
| `incident-media/` + `incident-media-viewer/` - galeria de mídia de evidência em 3 abas (imagem, vídeo, anexos do operador), carrossel, upload, confirmação de remoção | Imagem de evidência da detecção | **Portar** - componente mais pronto do lote, autocontido | [[Analítico - Fonte da imagem de evidência]] |
| `pages/incidents/` + `pages/incident-detail/` + `incidents-panel`/`incidents-table`/`incidents-map`/`incident-side-detail`/`incident-timeline` - fila de incidentes com mapa MapLibre e 216 incidentes mockados | Fila de incidentes do DAI | **Portar** - maior superfície genuinamente ausente no `web-attlas` hoje | [[Analítico - Contagem e dedup de incidente DAI]] |
| `atspm-*` (panel, camera-map, camera-card, camera-dialog, metric-card, metric-dialog, metric-visibility) - 38 métricas em 7 grupos, mapa cheio-tela com 15 interseções | Métricas ATSPM | **Esperar Sprint 31** - não existe backend antes do servidor de VL | - |
| `virtual-loop-panel/` + `virtual-loop-raw-table/` - Fluxo e Densidade | Métricas do Laço Virtual | **Esperar Sprint 31** - reaproveita os blocos do ATSPM | - |
| `instance-creation-panel/` - criação de instância de analítico com `compatibleTypes`/`compatibilityLine` | Compatibilidade por arquitetura | **Só a casca serve** - a exclusividade ali é por **tipo** de analítico (VL x ATSPM), não por arquitetura de chip. Ver aviso abaixo | [[Analítico - Compatibilidade por arquitetura de câmera]] |
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
3. **ATSPM** (Sprint 31+) - mais pesado: MapLibre mais ECharts mais 38 métricas.
4. **Laço Virtual** (Sprint 31+) - reaproveita os blocos do ATSPM, sai na sequência.
5. **Instâncias/fleet** - prioridade menor. A parte de ARTPEC saiu da conta de frontend: é lógica de
   backend (decisão do user, 25/08), e o que resta na tela é campo a mais no wizard de cadastro que já
   existe - vai dentro do card `[Full]` [[Analítico - Compatibilidade por arquitetura de câmera]], sem
   card de front próprio.

## Ver também

- [[Analítico]] · [[Analítico - Embarcado x Servidor]] · [[Analítico - Fluxos]]
- [[Attlas - Sprint 30]] (onde cada portabilidade virou card `[Front]`)
