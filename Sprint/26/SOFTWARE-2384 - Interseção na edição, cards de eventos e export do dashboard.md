---
tags:
  - attlas
  - sprint-26
  - task
  - cameras
  - frontend
card: SOFTWARE-2384
clickup: https://app.clickup.com/t/86aju2wgv
titulo: "[Front] Interseção na edição de câmera, cards de eventos e export do dashboard"
frente: Câmeras (frontend)
tamanho: a estimar
status: "mergeado - PR #1237 em 31/07/2026, conferido no GitHub em 25/08"
sprint: "[[Attlas - Sprint 26]]"
atualizado: 2026-08-25
---

# Interseção na edição, cards de eventos e export do dashboard

> Continuidade da [[SOFTWARE-2356 - Validação final do frontend|#1175]]. Três pendências de tela que
> ficaram fora da validação final: a busca de interseção que só funciona no cadastro, a barra de
> variação nos cards de eventos e os botões de download do dashboard que não baixam nada.

## Objetivo

Fechar os três acertos numa PR só, sem deixar placeholder inerte nem controle que não faz nada.

## Contexto

A #1175 mergeou em 31/07 com 358 arquivos. Estes três itens apareceram no uso da tela depois do
merge. Escopo **100% frontend** (`apps/web-attlas` + catálogos i18n em `libs/contracts`) — confirmado
na investigação que nenhum deles precisa de backend.

## Os três itens

### 1. Paridade da busca de interseção (cadastro ↔ edição)

No sheet de cadastro (Etapa 3) o combobox de interseção funciona: busca em
`GET /api/traffic-model/topology/search` com ≥2 caracteres, modo "próximas" por bounding box ao redor
do pin, e Via/Área/Subárea derivados do node escolhido. Na **edição** de dispositivo não existe campo
de Interseção, e Via/Área/Subárea são três `<input disabled>` com placeholder "Em breve" — sem
`formControlName`, puro enfeite. O modal de mapa fullscreen tem o mesmo stub e é aberto pelos **dois**
fluxos, então até no cadastro a versão fullscreen mostra "Em breve".

**Causa**: o picker entrou no commit `c66b929c4`, que tocou só o `camera-creation-panel` e os 4
`cameras.json`. Os stubs da edição são do commit anterior (`142bde235`, redesenho do editar em cards) e
nunca foram revisitados.

**Backend não precisa de nada**: `trafficElementId` já está em `IUpdateCameraRequest`, é validado
(`@IsOptional() @IsUUID()`, então `null` passa e desassociar funciona) e persistido. A leitura devolve
o id, mas não o nome do node — a hidratação resolve por `nodeApi.getById`.

Trabalho: extrair o picker e os campos derivados para dois componentes do módulo de câmeras
(`camera-intersection-picker` + `camera-topology-fields`), com duas mudanças técnicas obrigatórias na
extração — CDK Overlay (o painel `position:absolute` de hoje seria **cortado** pelo `overflow-y:auto`
do sheet) e `stopPropagation()` nas teclas (o sheet tem `@HostListener` de Enter e Escape que iriam
brigar com o combobox: Enter escolhendo opção também pularia de campo, Escape fechando o painel
fecharia o sheet inteiro).

Brinde: `onIntersectionClear` do settings-step é **código morto** hoje (não há botão limpar no
template), então a extração entrega a desassociação também no cadastro.

### 2. Barra de variação nos cards de eventos

O "slider" é `app-event-counter-variation`, uma `z-progress-bar` `tone`/`xs` dentro do card
compartilhado, adicionada pela própria #1175 (commit `4a43d0f00`). Magnitude de variação percentual não
tem escala natural de 0 a 100, então a barra decora sem informar. Sai, junto com o tooltip ⓘ que entrou
no mesmo commit (decisão minha em 31/07).

Verificado que os dois inputs têm **um único consumidor** (a tela de eventos), então saem do componente
compartilhado sem afetar `dashboard-kpi-strip`, `alarm-severity-counters`, `pmv-events-list`,
`pmv-connection-health` nem `pmv-operations-performance`. Contrato e backend não mudam: a barra lê só
`trendPct`, que continua alimentando o badge.

**Consequência aceita**: o ⓘ era o único lugar que dizia que a janela de comparação é fixa em 30 dias e
não acompanha o filtro de período. Sem ele o badge fica sem explicação na tela — registrado na spec como
decisão, não escondido.

### 3. Export do card de Conectividade

Não existiam botões XLSX e CSV: existia 1 ícone na toolbar que só dava toast "indisponível" e 1 botão
"Exportar" `disabled` no card de Conectividade. Os dois eram placeholders **em conformidade com a
spec** — MOD-001 BLOCKER 3 e UF-018 BLOCKER 1 pediam exatamente a decisão de formato e client vs
server.

Decisão: o export pertence ao **card** e honra o filtro do dashboard, em XLSX e CSV, client-side. O
ícone global da toolbar sai da tela em vez de continuar como afordance morto.

**Correção de premissa achada na investigação**: as "3 tabelas" de conectividade não existem mais.
Desde 25/07 o card renderiza **uma única tabela** com intermitência e latência mescladas client-side por
`cameraId`; degradação saiu da UI. E o card já tem a população inteira em memória (`sortedRows()`),
então o export não precisa de refetch nem de loop de páginas.

**Achado colateral**: o backend crava `MAX_PAGE_SIZE = 100` e o card busca uma página só, então a tela
já está truncada em ~100 por família hoje — e o rodapé "Mostrando X de Y" **mente**, porque usa o
tamanho do array carregado como total. O export expõe esse corte com aviso honesto, e o rodapé é
corrigido na mesma PR.

## Reuso (nada de dependência nova)

- `exceljs` já é dependência de produção e já roda no frontend por `import()` dinâmico em 3 lugares —
  um 4º cai no mesmo chunk async, sem mexer no bundle inicial. O CSV nem carrega exceljs.
- O helper de download (`Blob` → objectURL → `<a download>`) existe preso no módulo `controllers`, com
  cópias soltas no pmv e no cadastro de câmera. Vira util compartilhado, como a regra RF-269 manda.
- A convenção de CSV (BOM + vírgula + escape RFC 4180) já existe no `ms-cameras` para o template de
  importação em lote — reusar em vez de inventar.

## Specs

2 UFs novas (interseção compartilhada no módulo `cameras`; export em `cameras-dashboard`) e 8 specs
corrigidas. Várias descrevem hoje um estado que o código já superou — inclusive um endpoint
(`GET /api/traffic-elements`) que **não existe**.

## Estado

- 31/07: card criado, plano aprovado, branch `cameras/fix/SOFTWARE-2384` a partir da develop.
- 31/07: implementado e [PR #1237](https://github.com/atmanadmin/attlas-2026/pull/1237) aberta —
  8 commits, 2 UFs novas (UF-018 cameras, UF-023 cameras-dashboard) e 7 specs corrigidas.
- 31/07: **CI verde** (Lint, Integration Test, Build). O Build pegou 3 erros de template estrito que
  o lint e os testes não pegam — `zAddonAfter` recebendo null, `[value]` com `string | null` e o
  `card` do `@for` sendo o modelo de rascunho, não o FormGroup. Corrigidos em 2 commits.
- 31/07: **botão de download voltou à toolbar do dashboard**, com paridade de posição com o PMV,
  abrindo o mesmo menu XLSX/CSV e delegando ao card. Eu tinha desligado o ícone porque ele só emitia
  toast de indisponível; com o PMV oferecendo o dele, a ausência lia como funcionalidade faltando.
  A `dashboard-toolbar` passou a aceitar lista de formatos; sem lista mantém o botão único do PMV.
- 31/07: **estados visuais na lista de interseções**. Hover pintava um tom que nenhum outro menu do
  app usa, sem transição, sem foco visível, sem sinal do que está associado, e o estado "escolhida"
  engolia o hover por empate de especificidade. Passou a usar o par de accent das primitivas, check
  na escolhida e o painel rolando até a opção destacada pelas setas. Dois bugs reais no caminho: a
  seta ↓ nunca reabria o painel (guard de lista vazia antes da reabertura) e o placeholder não dizia
  o que a busca aceita.
- 31/07: **achados do Otávio** (CHANGES_REQUESTED): `::ng-deep` do card virou hook
  `--data-table-skeleton-cell-height` na própria tabela compartilhada, e desabilitar voltou para
  `[zDisabled]` no input do picker e no botão do modal, com o campo de endereço stub virando
  `readonly` para não matar o `title` que o explica. Review re-solicitada.
- 31/07: **as 29 falhas de teste que o gestor cobrou são nossas**, e foram consertadas aqui.

### Achados colaterais

- **O rodapé da tabela de conectividade mentia.** "Mostrando X de Y" usava o tamanho do array
  carregado como total, e o card lê uma página no teto do serviço (100 por família) — então o corte
  existia e não aparecia em lugar nenhum. Os totais reais passam a vir do backend e o truncamento é
  declarado na tela, no toast e na aba de filtros do arquivo. Foi o export que expôs isso.
- **Uma spec documentava endpoint inexistente.** A MOD-001-cameras descrevia
  `GET /api/traffic-elements` como o catálogo de elementos de tráfego. Não existe: a associação
  sempre falou com o ms-traffic-model direto.
- **Código morto virou feature.** `onIntersectionClear` existia no settings step e nunca foi ligado
  no template, então o cadastro não tinha como desassociar. A extração entregou o botão limpar nos
  dois fluxos.

### Dívida da #1175 consertada nesta PR (auditoria de 31/07)

O gestor reportou 29 testes quebrados no dashboard de câmeras. Auditei os 6 grupos com `git blame`
nas linhas culpadas: **5 são nossos, todos do commit `4a43d0f005`** (SOFTWARE-2356, PR #1175, já na
develop). Quatro desses testes **nasceram vermelhos** no próprio commit que os escreveu; dois ficaram
para trás num refactor de assinatura nosso. O relatório que eu tinha recebido dizia que nada era do
nosso trabalho — estava errado.

| Item | Veredito |
| --- | --- |
| 3 suítes não compilam (locale ESM) | config do Jest: locales do `@angular/common` são ESM em `.js` |
| Scope filter, 8 testes NG0201 | spec sem o provider de topologia; runtime ok (provider é da página) |
| Utils de escopo, 10 testes | specs chamavam sem a topologia que passou a ser exigida |
| XSS do popup do mapa | **não é vulnerabilidade**: asserção olhava `innerHTML` e achava o `title` |
| Toolbar "unpinned initial state" | **bug real**: input lido no construtor, ignorado até em produção |

O que **não** é nosso: desde `cdbc77053c` (04/06) nenhum job de CI roda jest. `Lint` roda
`affected:lint`, `Integration Test` só tem target no backend e `Build` não compila spec — os 3 checks
ficam verdes com a suíte do frontend em qualquer estado. O `CLAUDE.md:129` afirma que o CI roda
`affected:test`, o que nunca foi verdade. **Próximo passo: PR de infra com o job `unit`**, porque sem
ele nem essas correções ficam provadas (verifiquei tudo estaticamente, com 5 agentes tentando refutar
cada spec; a única quebra encontrada foi colateral do meu `zDisabled` e já saiu).

### Pendências registradas (fora do escopo, nas specs)

- Reconciliar `node_cameras` do ms-traffic-model: o vínculo câmera↔interseção tem dois lados
  independentes e nada os alinha, então associar aqui não faz a câmera aparecer nos periféricos da
  interseção.
- Preencher a coluna free-text `Camera.intersection` que o side-detail lê (hoje sempre "—"). Backend.
- Endpoint de export server-side, para o recorte passar do teto de 100 linhas por família.

> [!info] Estado em 25/08 - alinhado com o GitHub
> PR #1237 mergeada (última em 31/07/2026). Nenhuma PR desta task está aberta.
> O `status` anterior dizia: "code review — PR #1237 com 11 commits em 31/07. Review dividido: otavioassis pediu mudanças às 16:28, os achados foram aplicados no commit da altura do skeleton e do desabilitar, e danielfaria aprovou às 16:54. O veredito agregado do GitHub segue CHANGES_REQUESTED até o otavio reavaliar, e o job de ".
