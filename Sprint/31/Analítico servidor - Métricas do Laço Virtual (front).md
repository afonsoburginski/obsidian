---
tags:
  - attlas
  - task
  - sprint-31
  - analitico
  - frontend
card: SOFTWARE-2797
clickup: https://app.clickup.com/t/86ak7x0hm
titulo: "[Front] Métricas do Laço Virtual (Fluxo, Volume, Ocupação e Tempo de ocupação)"
frente: Analítico
tamanho: 5 pts
status: "EM CODE REVIEW com duas PRs, em 03/09. A #2380 (base develop) entregou o painel, os quatro cartões, a modal e a tabela crua; a #2517 (empilhada) entregou o mapa de câmeras e o escopo por interseção. A #2380 está em changes requested por três threads de valor CSS literal sem token, a #2517 está aprovada por dois revisores. Nenhuma das duas recebeu CI, porque os jobs do ci-pr.yml exigem base develop e a base da #2380 só foi retargetada em 03/09 às 13:30. O card segue em backlog no ClickUp, o que contraria a semântica do board, e os pontos continuam sem valor no campo nativo - setar 5 a mão pelo REST."
sprint: "[[Attlas - Sprint 31]]"
atualizado: 2026-09-03
---

# Analítico servidor - Métricas do Laço Virtual (front)

A única tela da Sprint 31, e ela entra justamente porque **não depende da sprint**. Porta o painel de
métricas do Laço Virtual do `attlas-design` para a aba **Métricas** do módulo `analytics` do
`web-attlas`, que hoje cai num `SectionPlaceholder` vazio.

> [!danger] Correção de veredito, 28/08: a nota do vault estava errada
> [[Analítico - Frontend do attlas-design]] classificava esta superfície como **"esperar Sprint 31 -
> não existe backend antes do servidor de VL"**, e por isso ela ficou fora do planejamento das três
> sprints do analítico. Conferido no código em 28/08, está errado nas duas pontas: o backend existe,
> está maduro, e não é o servidor de VL que o entrega.
>
> A afirmação nunca tinha sido conferida contra o `ms-detector-history` - foi deduzida de "métrica de
> laço virtual precisa do laço virtual", que confunde **quem produz o dado** com **quem serve a
> leitura**. O código vence a nota: a nota foi corrigida no mesmo passe.

## Por que o backend já existe

A tela não lê o analítico. Lê o **histórico de detector**, e o `ms-detector-history` é o serviço mais
maduro da cadeia (217 arquivos, contra 6 do scaffold do `ms-atspm`, que não nasce como serviço
desde [[Analítico - Topologia de serviço do analítico de vídeo]]). As quatro leituras do catálogo do
protótipo saem inteiras de um endpoint que já está no ar:

| Métrica da tela (`virtual-loop-metric-catalog`) | Campo de `GET /api/detector-history/detectors/:id/metrics` |
| --- | --- |
| `loop-flow` - Fluxo (veíc/h) | `windows[].flow`, já em veículos/hora |
| `loop-volume` - Volume (veíc) | `windows[].vehicleCount` |
| `loop-occupancy` - Ocupação (%) | `windows[].occupation`, fração 0..1 com 4 decimais |
| `loop-occupancy-time` - Tempo de ocupação (s) | derivada de `occupation × duration`, ambos na mesma janela |

Só a quarta exige conta, e é uma multiplicação. As outras três são leitura direta de campo.

Endpoints disponíveis hoje: `:id/metrics`, `multiple/metrics`, `multiple/count` e `:id/timeline`.

**E o cliente também já existe.** O `web-attlas` tem `DetectorHistoryService`
(`modules/controllers/services/detector-history.service.ts`), já reusado pelo `traffic-model` em
`via-detector-metrics.service.ts`. O porte reusa esse serviço em vez de criar cliente novo, o que é o
padrão do repo e não uma economia improvisada.

## O que a tela mostra antes do card 8 mergear

Dado real, sempre - **nunca mock**. Enquanto o card 8
([[Analítico servidor - Tradução de endereço e publicação do detector raw|SOFTWARE-2699]]) não mergear,
não existe detector de tecnologia `VIRTUAL_LOOP` publicando, e a tela mostra **estado vazio honesto**
para esse filtro. Os detectores de laço físico que já publicam aparecem normalmente.

No instante em que o card 8 publica em `attlas.detectors.raw`, a mesma tela passa a mostrar o laço
virtual **sem uma linha de frontend mudar**. Isso não é sorte: é exatamente a intenção de projeto do
contrato comum, a mesma razão pela qual o `ms-detector-history` não precisa de mudança nenhuma.

É por isso que esta tela é boa companhia para a semana em vez de peso: ela **demonstra** o resultado da
escada de 8 cards no dia em que a escada fecha.

## Escopo do porte, e o que de fato entrou

O planejamento de 28/08 previa cerca de 2.100 linhas em seis blocos, sendo dois deles `atspm-*`
compartilhados. **Não foi isso que entrou.** O que existe hoje na ponta da pilha (#2517) são 65 arquivos
e 3.577 linhas em `apps/web-attlas/src/app/modules/analytics-metrics/`, todos nomeados por laço virtual:

| Bloco entregue | Papel |
| --- | --- |
| `pages/virtual-loop-metrics/` | A página, que é ela mesma o painel do laço virtual |
| `components/virtual-loop-camera-panel/` | A lateral, com segmentado Lista e Mapa |
| `components/virtual-loop-camera-list/` | A lista de câmeras, com busca |
| `components/virtual-loop-camera-map/` | O mapa MapLibre, com escopo por interseção |
| `components/virtual-loop-metric-card/` | O cartão de métrica, com sparkline SVG próprio |
| `components/virtual-loop-metric-dialog/` | A modal da métrica expandida |
| `components/virtual-loop-raw-table/` | A leitura crua, sobre o `app-data-table` compartilhado |
| `constants/` + `interfaces/` + `types/` + `utils/` (8 utils com 8 specs) | Catálogo das 4 métricas, máquina de estados e a matemática das leituras |

> [!danger] O efeito colateral prometido não aconteceu
> Este planejamento afirmava que o porte arrastaria `atspm-metric-card` e `atspm-camera-panel` como
> apresentação pura compartilhada, adiantando o ATSPM. **Não existe nenhum diretório `atspm-*` no
> repo.** Os quatro componentes nasceram com nome e escopo de laço virtual, e o filtro
> `metrics-filter-popover` também não foi portado: a tela reusa o `PeriodPickerComponent` compartilhado,
> com quatro presets. Quando o ATSPM tiver backend, ou esses quatro componentes são generalizados
> primeiro, ou o ATSPM duplica cartão e painel.

## O que este card não faz

- **Métricas ATSPM.** Não há backend nenhum (e desde 31/08 o ATSPM é capacidade do analítico servidor, não serviço próprio), e não é esta sprint
  que constrói. Continua sem prazo.
- **Backend novo.** Zero. Se aparecer necessidade de endpoint novo, o card estourou o escopo e a
  premissa acima precisa ser reexaminada antes de continuar.

## O que o protótipo não entrega, e precisa nascer aqui

O de sempre, igual aos 3 cards `[Front]` da Sprint 30: reescrever a camada `services`/`interfaces`
contra `@attlas/contracts`, i18n por catálogo (o protótipo tem pt-BR hardcoded), guarda de permissão, e
teste. O protótipo não tem nenhum dos quatro.

## Posição na semana

**Independente dos 8 cards**, então não entra na escada e não sofre o risco de cascata. Sai em paralelo,
de preferência não no fim da semana - justamente por ser a única entrega que não pode ser derrubada pelo
escorregão da escada de código.

## O que falta para a tela ficar igual à referência

O porte fechou a fatia do laço virtual, não a tela de Métricas. O levantamento de 03/09 contou 33
discrepâncias visuais mensuráveis e 8 invenções locais entre o que está no repo e o que está no
`attlas-design`, e as três faltas estruturais são a barra das três sub-abas, o cartão com gráfico de
verdade e a casca de página. O detalhe item por item vive em
[[Analítico - Tela de Métricas no web-attlas]].

## Ver também

[[Attlas - Sprint 31]] · [[Analítico - Frontend do attlas-design]] ·
[[Analítico - Tela de Métricas no web-attlas]] ·
[[Analítico servidor - Tradução de endereço e publicação do detector raw]] · [[Analítico]]
