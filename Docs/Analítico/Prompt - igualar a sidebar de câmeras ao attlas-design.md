---
tags:
  - analítico
  - frontend
  - prompt
atualizado: 2026-09-09
---

# Prompt - igualar a sidebar de câmeras ao attlas-design

Prompt de execução para agente (Codex). Card: `SOFTWARE-3057`, refinamento de emergência do frontend
do Analítico, Sprint 32. Referência viva do módulo: [[Analítico - Frontend do attlas-design]] e
[[Analítico - Tela de Métricas no web-attlas]]. Pendências do módulo:
[[Analítico - O que falta para fechar o módulo]].

---

## O objetivo, em uma frase

A sidebar de câmeras do módulo Analítico do `attlas-2026` tem de ficar **idêntica** à do
`attlas-design`, visual e funcionalmente, ao ponto de não se distinguir uma da outra numa comparação
lado a lado na mesma resolução.

Isto **não** é uma tarefa de alinhar declarações de CSS. É uma tarefa de UI: o que vale é o que
aparece na tela. Duas telas que rendem igual estão certas mesmo com CSS diferente; dois arquivos com
CSS idêntico e telas diferentes estão errados.

## Critério de pronto

Só está pronto quando, abrindo as duas telas lado a lado na mesma largura de janela:

1. A sidebar da nossa tela oferece o mesmo **filtro de faces** que a da referência, com os mesmos
   rótulos, na mesma ordem, e a mesma face ativa por padrão.
2. Cada card mostra os **mesmos campos, na mesma ordem, com o mesmo peso e a mesma cor**, nas duas
   formas de card que a referência tem (cheia e condensada).
3. O **scroll acontece dentro da sidebar**, nunca na página. Verificável no console:
   `document.documentElement.scrollHeight === document.documentElement.clientHeight`, e
   `scrollHeight > clientHeight` no `.atspm-camera-panel__body`.
4. Estados de interação batem: repouso, hover, foco por teclado e selecionado.
5. Nada foi inventado. Todo elemento na nossa tela existe na referência, e todo elemento da
   referência que não existe na nossa está listado no relatório final com o motivo.

## Como ver as duas telas (faça isso ANTES de escrever qualquer código)

**Nossa tela**: o `web-attlas` já roda em modo dev. Não builde, não rode `nx serve`.

- `http://localhost:4200` — o roteamento é por hash.
- Se cair em `#/organization`, é o seletor de sistema, não login: clique em **Acessar** no sistema
  (Quito) e você entra.
- Se pedir login, o usuário do seed é `admin@atmansystems.com` / `change-me`
  (default de dev de `ATOM-001-seed-master-and-atman.md`).
- A tela é `http://localhost:4200/#/analytics/metrics`. A sidebar aparece nas faces ATSPM e Laço
  Virtual.
- A tela de Detecção, que monta a mesma sidebar em outra forma, é `#/analytics/detection`.

**Tela da referência**: `http://localhost:4243/modulo/analitico/metricas`. Já está de pé.

⚠️ O navegador do Playwright abre uma janela visível na máquina do usuário e **atrapalha ele**. Abra
o mínimo, faça o que precisa numa sessão só, e **feche o navegador** (`browser_close`) quando
terminar de olhar. Não deixe aberto entre passos.

## As quatro maneiras de errar isto, que eu errei antes de te passar

Leia antes de começar. Cada uma custou um passe inteiro.

1. **Raspar estilo computado do navegador em vez de ler o fonte da referência.** Eu inspecionei o
   DOM da referência rodando, vi um selo de estado sobre o vídeo num card que estava offline, e
   concluí que o card tinha um selo. Não tem: aquilo pertence ao componente de stream dela e só
   aparece offline. Eu inventei `__badge`, `__wash`, `__frame-top` e `__dot` no nosso card e tive de
   remover tudo. **O fonte da referência é a autoridade, não a tela dela num estado qualquer.**
2. **Copiar uma regra sem ver quem dimensiona o container.** Eu tirei `height: 100%` do `:host` do
   painel porque a referência não tem essa linha, sem ver que a coluna dela é limitada por um
   `atspm-panel__side` com `max-height: calc(100dvh - ...)` e a nossa não tem teto nenhum. Resultado:
   a página inteira passou a rolar. **Antes de copiar ou remover uma regra de layout, ache quem dá
   altura ao elemento nos dois repos.**
3. **Deixar o óbvio para depois.** O filtro "Por streaming / Lista" não existe na nossa tela e o card
   condensado não existe, e eu passei dois passes ajustando `gap` e `border-radius` sem ver isso.
   **Comece pelo que está faltando na tela, não pelo que está diferente no arquivo.**
4. **"Verificar" por diff de texto sem olhar a tela.** Eu provei que o CSS do card estava idêntico
   comparando declaração por declaração, e a tela continuava diferente, porque o que faltava era
   estrutura e dado. **Diff de arquivo é evidência de apoio; a tela é a evidência.**

## Onde está o quê

Repo de trabalho: `/home/afonso/Área de trabalho/Developer/attlas-2026`. Monorepo NX, Angular 21,
NgModule clássico, TypeScript strict. Branch já criada e com checkout feito:
`analytics/feat/SOFTWARE-3057`.

Repo de REFERÊNCIA, **somente leitura, nunca edite nada nele**:
`/home/afonso/Área de trabalho/Developer/attlas-design/modulo-analitico/entrega-frontend`

Os arquivos são pares diretos, mesmo caminho relativo nos dois lados, sob
`src/app/modules/analytics/components/`:

- `atspm-camera-card/atspm-camera-card.component.{html,css,ts}`
- `atspm-camera-panel/atspm-camera-panel.component.{html,css,ts}`

Nossa raiz: `apps/web-attlas/src/app/modules/analytics/components/`.

Tradução mecânica de nome de classe, a única que existe: a referência usa `atspm-camera-card__box`
para o bloco e `atspm-camera-card__X` para os elementos; o nosso usa `camera-card` para o bloco e
`camera-card__X` para os elementos. No painel os nomes são iguais nos dois (`atspm-camera-panel__X`).

Quem monta a sidebar nas nossas telas, e é onde o layout da coluna vive:

- `apps/web-attlas/src/app/modules/analytics-metrics/components/atspm-panel/` (face ATSPM)
- `apps/web-attlas/src/app/modules/analytics-metrics/components/virtual-loop-panel/` (face Laço Virtual)
- `apps/web-attlas/src/app/modules/analytics-detection/pages/detection/` (Detecção)

## O que já está igual, e não se refaz

O CSS do card foi igualado declaração por declaração num passe anterior. Comparando os dois arquivos,
sobra **uma** divergência de seletor, o `--compact`, que é o item 2 abaixo. Confira e siga; não
reescreva o que já bate.

O scroll da página também já foi corrigido: o `:host` do nosso painel voltou a ter `height: 100%`.
Verificado na tela em 09/09: a página não rola (`scrollHeight` igual ao `clientHeight`) e o `__body`
rola por dentro (5486 contra 717). **Não remova essa linha** sem colocar um teto de altura no
`atspm-panel__aside` no lugar.

## O que falta, na ordem em que se vê na tela

### 1. O filtro de faces não existe na tela de Métricas

**Na tela**: a sidebar da referência tem, sob o título, um controle de abas que troca a forma da
lista. A nossa não tem nenhum controle ali. Confirmado no DOM da nossa tela em 09/09:
`.atspm-camera-panel__segment` não existe.

**Por quê**: a referência tem três faces em `atspm-camera-panel.component.ts` —
`view = signal<CameraPanelView>('stream')`, com `stream`, `list` e `map`, nessa ordem, e `stream`
como padrão. O nosso painel só tem `'list' | 'map'`, e o template só renderiza o segmento sob
`@if (showMap() && !stacked())`. A face ATSPM monta o painel **sem** `showMap`, então o segmento
nunca aparece.

**O que fazer**: trazer as três faces com `stream` como padrão, e mostrar o segmento sempre que
houver mais de uma face disponível (o `map` continua condicionado ao `showMap()`). Copie também o
comportamento da referência de que, quando o mapa sai, uma face `map` ativa cai de volta para
`stream`.

Use o nosso componente compartilhado `app-segmented-control`
(`apps/web-attlas/src/app/core/shared/components/segmented-control/`), que recebe `[options]`,
`[value]`, `ariaLabel` e emite `(valueChange)`. **Não** reimplemente os botões: a referência estiliza
um `role="tablist"` local porque não tem esse componente, e o visual dele é dele. E **não** o
reestilize a partir desta tela: ele serve outros módulos.

Rótulos: os da referência são "Por streaming" e "Lista" — confira em
`atspm-camera-panel.component.ts` dela (`copy.panel.viewStream`, `copy.panel.viewList`) e o do mapa.
Entram como chaves novas nos quatro catálogos, sob `analytics.metrics.atspm.panel`, que já tem
`title`, `listName`, `viewLabel`, `hint`, `searchLabel`, `searchPlaceholder`, `clearSearch`,
`emptyTitle`, `emptyHint` e `scopeClear`.

### 2. O card condensado não existe

É a face `list` do item 1: o mesmo card **sem vídeo, sem os quatro campos e sem as duas ações**, com
respiro menor.

Na referência, `atspm-camera-card.component.css`:

```css
.atspm-camera-card__box--compact {
  gap: var(--spacing-1-5);
  --card-inset: var(--spacing-3);
  padding: var(--card-inset);
}
```

E no `.html` dela, tudo isso fica sob `@if (!compact())`. O botão esticado também troca de papel: no
condensado ele **é** o controle e leva `aria-pressed` e `aria-label`; no cheio é pointer-only, com
`tabindex="-1"` e `aria-hidden="true"`. Leia o bloco inteiro dela antes de escrever, está descrito
lá.

O nosso card precisa de um input `compact` (`input(false, { transform: booleanAttribute })`, igual ao
`picker` que já existe) e da mesma bifurcação.

### 3. O nome não tem o sufixo de aproximação, e falta o quarto campo

**Na tela**: na referência o nome do card é `AV-10 DE AGOSTO · N1 · Aprox. Norte` e há um quarto
campo, "Direção da câmera: Aprox. Norte". No nosso o nome para em `N1` e os campos são três: IP,
Última atualização e Modelo.

O dado existe no contrato: `azimuth`, graus no sentido horário a partir do norte, em
`libs/contracts/src/lib/camera/i-camera-response.ts` e
`libs/contracts/src/lib/camera/i-camera-summary.ts`. O que falta é o caminho até a tela: o
`ICameraSummary` do frontend
(`apps/web-attlas/src/app/modules/analytics/interfaces/i-camera-summary.interface.ts`) não tem o
campo, e a projeção que monta essa interface não o preenche.

Ache quem monta a projeção (grep por `ICameraSummary` em
`apps/web-attlas/src/app/modules/analytics*`), leve o `azimuth` até lá, e converta graus em rumo
("Aprox. Norte", "Aprox. Nordeste", ...) num util próprio com teste. O rótulo do campo é chave nova
nos quatro catálogos, sob `analytics.metrics.atspm.card`.

Se a rota que a tela consome não devolver `azimuth`, **pare, não invente valor**, e diga no relatório
qual rota precisaria passar a devolver.

### 4. O anel da marca só usa duas das quatro tonalidades

A referência dá quatro valores ao `data-tone` do `__ring`: `configured` (cheio, verde, com halo),
`error` (cheio, vermelho), `unconfigured` (anel sólido) e `unlinked` (anel pontilhado). **O CSS das
quatro já está no nosso arquivo** — o que falta é o dado que escolhe entre elas.

O nosso `ICameraAnalyticMark`
(`apps/web-attlas/src/app/modules/analytics/interfaces/i-camera-analytic-mark.interface.ts`) só
carrega `id`, `type` e `mode` (`EMBEDDED`/`SERVER`), então o método `ringTone` do nosso card hoje
mapeia embarcado para `configured` e servidor para `unconfigured`. Falta o estado de configuração e o
de saúde do analítico. Veja no `.ts` da referência como `marks()` deriva `tone`, `label` e `state`,
descubra de onde esse estado viria no nosso backend e ligue. Sem fonte, deixe o mapeamento atual e
reporte.

### 5. Depois dos quatro acima, feche o resto por comparação

Com a estrutura no lugar, aí sim vale o passe fino: abra as duas telas na mesma largura, e para cada
elemento da sidebar (cabeçalho, bloco da lista, dica, busca, cada card, o estado vazio, o mapa e os
controles flutuantes dele) compare espaçamento, tipografia, cor e estado. Onde a referência usa um
token `var(--...)`, use **o mesmo token**: todos existem no nosso repo, em
`apps/web-attlas/libs/ui-styles/tokens/`. Cuidado com o par que colide: `--primary` (600) é o azul de
controle e `--base-primary` (500) não é o mesmo; a referência usa `--primary` nos estados do card de
propósito.

## Regras duras deste repo e deste usuário

- **PROIBIDO rodar `nx test`, `nx lint`, `nx build` ou `tsc` localmente.** A máquina é fraca e trava.
  O CI valida. Nem "só para conferir".
- **PROIBIDO git op** sem pedido explícito: não commite, não dê stage, não pushe, não abra PR.
- **PROIBIDO mock de dado.** Dado vem de endpoint real; vazio vira estado vazio honesto. Não invente
  campo que não existe no contrato.
- **Realtime é WebSocket + broadcast, nunca polling.** Refetch em cadência fixa conta como polling.
- **Feche o navegador do Playwright** quando terminar de olhar. A janela atrapalha o usuário.
- **Teste de integração é obrigatório** em implementação nova, convenção
  `<assunto>.integration.spec.ts` ao lado do componente. Já existe um em
  `apps/web-attlas/src/app/modules/analytics/components/atspm-camera-card/atspm-camera-card-selection.integration.spec.ts`
  com 8 casos: mantenha e estenda. **Nunca** enfraqueça, dê `skip`/`xit` ou apague asserção para
  passar.
- **i18n**: nenhuma string de UI hardcoded. Toda chave existe nos quatro locales
  (`libs/contracts/src/lib/i18n/locales/{en-US,pt-BR,es-ES,it-IT}/analytics.json`) ou em nenhum.
  Edite os catálogos por **inserção de texto** (leia o arquivo, insira a linha, escreva de volta) e
  **nunca** reserialize o JSON: os arquivos têm chaves duplicadas pré-existentes
  (`PRIORITY_ROUTE_NOT_FOUND` e `PRIORITY_ROUTE_CODE_DUPLICATED` em `core.json` de en-US, es-ES e
  it-IT) e o reserialize colapsa elas e suja o diff. Confira com `git diff --stat` que cada catálogo
  mudou poucas linhas.
- **Comentários**: o padrão é NÃO comentar. Leia `docs/architecture/comment-guide.md` antes de
  comentar. A referência tem comentários gigantes de histórico de design, com datas e nomes de
  pessoa: **não copie nada disso**. O guia reprova narração de "antes era X agora é Y" (CMT-X10).
  Comente só decisão que o código não mostra, curto.
- **Angular**: `standalone: false` em todo componente, declarado no
  `apps/web-attlas/src/app/modules/analytics/analytics-shared-module.ts`. Signals (`input`, `output`,
  `computed`, `signal`, `linkedSignal`), `ChangeDetectionStrategy.OnPush`, control-flow novo
  (`@if`/`@for`/`@switch`, com `track` em todo `@for`), `inject()`. Sem NgRx.
- **Imports**: dentro do `web-attlas` use o self-alias `@/` a partir de dois níveis (`../../`);
  relativo só para arquivo vizinho. Entre pacotes, `@attlas/contracts`, `@web-attlas/ui-shared`,
  `@web-attlas/ui-icons`, `@web-attlas/ui-map`.
- **Zard UI**: as mesmas primitivas com os mesmos inputs (`z-button` com `zType`/`zSize`, `zTooltip`
  com `zColor` e `zClass`, `z-input-group`, `z-empty`, `z-badge`). O `zTooltip` já está disponível no
  módulo via `UiSharedModule`.
- **Não apague funcionalidade nossa que a referência não tem**: o campo de busca do painel e o chip
  de escopo (`__scope-mark` / `__scope-title`) são nossos. Traga o estilo deles para a linguagem da
  referência, não remova.
- **Não edite componente compartilhado** de `@/core/shared` — o `app-camera-stream-player` e o
  `app-segmented-control` servem outros módulos. A referência usa um `app-camera-stream` próprio, que
  é outro componente; obtenha o mesmo resultado pelos inputs que o nosso player expõe (leia
  `apps/web-attlas/src/app/core/shared/components/camera-stream-player/camera-stream-player.component.ts`).
- Sem travessão nem en-dash em texto novo: hífen e vírgula.

## Entregue

Um relatório curto com, nesta ordem:

1. O que passou a existir na tela e antes não existia.
2. O que ficou idêntico, por elemento.
3. Onde você substituiu token ou primitiva da referência por equivalente nosso, e por quê.
4. O que removeu.
5. O que ficou bloqueado por falta de dado, nomeando a rota ou o campo que precisaria existir.

E a verificação do critério de pronto item 3, com os dois números do console.
