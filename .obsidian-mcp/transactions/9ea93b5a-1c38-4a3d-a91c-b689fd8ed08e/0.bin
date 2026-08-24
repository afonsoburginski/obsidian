---
tags:
  - doc
  - ms-cameras
  - cameras
  - vms
aliases:
  - "VMS"
  - "00 - VMS"
  - "doc"
  - "ms-cameras"
  - "cameras"
  - "vms"
  - "00 - Video Wall"
  - "Video Wall (ms-cameras)"
atualizado: 2026-08-22
---

# VMS - Video Monitoring System (ms-cameras)

> [!success] Estado em 22/08: entregue desde a última atualização (13/08)
> - **Espelhar com destino escolhido** (`UF-034`): o operador escolhe o slot na parede antes de espelhar,
>   com a parede desenhada como esquema no dialog. PR [#1889](https://github.com/atmanadmin/attlas-2026/pull/1889)
>   mergeada na develop.
> - **Brilho do painel** (`INT-015`/`UF-029`): controle ao vivo, com duty de escrita alinhado ao
>   `SystemMemberDuty.SYSTEM_ADMIN` do backend.
> - **Projeção nativa de cena pelo alvo VIDEOWALL** (`UC-051`/`INT-018`): PR [#1757](https://github.com/atmanadmin/attlas-2026/pull/1757) mergeada.
> - **Comando de plano de resposta chega à parede**: despacho no motor de planos (`PROJ-004`,
>   PR [#1760](https://github.com/atmanadmin/attlas-2026/pull/1760)) e eco/recusa idempotente no
>   `ms-cameras` (`PROJ-020`, PR [#1761](https://github.com/atmanadmin/attlas-2026/pull/1761)) — os dois
>   mergeados em 19-21/08.
> - **Refactor em três camadas do frontend do VMS** (página/store/serviço, como o módulo de alarmes) em
>   PR [#1884](https://github.com/atmanadmin/attlas-2026/pull/1884), com review em andamento.
>
> [!warning] Colisão de número achada em 22/08, ainda sem resolver
> A PR #1884 (e a #1889, pelo título) citam **SOFTWARE-2519** como task — mas o ClickUp `SOFTWARE-2519`
> real (`86ak0tepc`) é **outra tarefa, já fechada**: "[Back] Videowall externo: consumidor do comando de
> plano e echo idempotente" (PR #1761, seção acima). O trabalho de frontend de espelhar-com-destino e do
> refactor em camadas parece não ter task própria vinculada, ou a task certa nunca foi identificada nas
> PRs. **Precisa confirmar com o dono do card qual é a task real** antes de fechar as PRs #1884/#1889, ou
> a rastreabilidade (B1 do review) fica quebrada.

> Submódulo do [[ms-cameras]]. Backend: **MOD-006 video-wall** (layouts + cenas) e **MOD-008 bandwidth-monitoring** (banda). Frontend: **MOD-001-videowall**. Canvas: [[06 - MOD-006 VMS.excalidraw|diagrama]].

> [!important] Nomenclatura: VMS é o interno, videowall é o externo
> A regra é essa e não tem meio-termo. **VMS é o que temos internamente**: esta tela, o mosaico de
> feeds ao vivo que o Attlas desenha no browser do operador. **Videowall é o externo**: o painel
> físico da sala de controle de Quito, comandado pelo processador NovaStar H9, que não é nosso e que o
> Attlas apenas dirige por API ([[Videowall externo (NovaStar H9)]]). Desde 10/08 esse painel é um
> **alvo de exibição deste VMS**, submódulo dele, o que não afrouxa a regra de nomenclatura: continuam
> sendo o sistema e uma das saídas dele, com nomes diferentes justamente para não se confundirem.
>
> Decidido na daily de 31/07 e formalizado na spec CROSS-045, aplicada em 10/08 nas PRs
> [#1438](https://github.com/atmanadmin/attlas-2026/pull/1438),
> [#1439](https://github.com/atmanadmin/attlas-2026/pull/1439) e
> [#1440](https://github.com/atmanadmin/attlas-2026/pull/1440). O renome atinge o que é observável
> (rota, tela, i18n, ícones); pasta, classes e contratos do backend continuam dizendo `video-wall`
> de propósito, ver a seção do renome abaixo.

O VMS compõe e exibe **N feeds simultâneos** em um mosaico configurável. O backend é a **fonte de
verdade de layouts, cenas e do consumo agregado de banda**; a renderização do mosaico, a rotação
automática, o PTZ inline e o popup de tela cheia são **frontend**, que consome o vídeo pelo stream
secundário via [[Streaming]].

> [!abstract] O que o backend faz
> Guarda e serve **layouts** (templates de grade) e **cenas** (conjunto de câmeras posicionadas num layout, ativáveis com uma ação), oferece o **picker** de câmeras elegíveis para montar a cena, e calcula um **snapshot de banda** da sessão. Não renderiza vídeo, não roda a rotação, não mantém sessão PTZ.

## Alvos de exibição: o videowall é submódulo do VMS (10/08)

Decisão do user em 10/08, e ela muda a arquitetura da frente seguinte. Uma cena diz qual câmera fica em
qual posição. **Onde ela aparece é um alvo de exibição**, e o VMS tem dois:

| Alvo | O que faz | Onde |
| --- | --- | --- |
| Sessão no browser | O mosaico deste documento. Ativar cena é gravar o estado ativo | `src/video-wall/targets/browser-session/` |
| Videowall externo | Espelha no painel físico de Quito a tela da sessão do operador, como fonte única em tela cheia | `src/video-wall/targets/novastar-h9/` |

O que sustenta um alvo em cima do outro é o espelho **nascer de uma sessão de VMS**. O painel não recebe
câmera nem cena, recebe a superfície que o operador está vendo, e quem compõe essa superfície continua
sendo o VMS. Não existe um segundo modelo de cena porque não existe cena nenhuma do lado do equipamento,
só uma fonte e uma janela em tela cheia, e é por isso que o painel cabe aqui e não em módulo irmão.

> [!warning] Revisão de 13/08: o propósito do alvo mudou
> Até 12/08 o painel projetava a cena, traduzindo célula em fonte IPC, camada e preset, e o containment se
> justificava pela célula já ser geometria proporcional sobre um `customGrid` virtual, o que tornava a
> projeção uma multiplicação pela resolução do painel. Isso caiu junto com a projeção. O containment
> sobrevive pelo argumento acima, que é mais forte: antes o painel era uma segunda saída do mesmo modelo,
> agora ele é uma segunda saída da mesma sessão.

Três consequências que valem lembrar: a superfície inteira fica sob `/api/vms`, com o equipamento em
`/api/vms/videowall/*`; o gesto do painel é **tomar e liberar o espelho**, com dono exclusivo, e ativar
cena com o alvo videowall passa a ser recusa definitiva; e o espelhamento é de **mão única**, porque
composição montada direto no equipamento não tem representação do lado da plataforma. Detalhe do desenho,
incluindo o strategy por transporte e a resolução de tenancy do RF-7, em
[[Videowall externo (NovaStar H9)]]. O material de hardware que sustentou a escolha de transporte está em
[[Pesquisa - transporte do espelhamento de tela]].

## Renome para VMS: o que mudou (aplicado em 10/08)

Executado nas três PRs abaixo, sob a spec CROSS-045. A fronteira que a spec estabelece é **renomear o
que é observável e não renomear implementação nem valor serializado**.

| Categoria | De | Para |
| --- | --- | --- |
| Rotas REST de cenas e layouts | `/api/video-wall/*` | `/api/vms/*` |
| Rota REST do picker | `/api/cameras/video-wall` | `/api/cameras/vms` |
| Rota Kong | `ms-cameras-video-wall-route` | `ms-cameras-vms-route`, com os dois paths |
| Rota do front | `/cameras/videowall` | `/cameras/vms`, com redirect por prefixo |
| Namespace i18n | `videowall.json` e chave raiz `videowall` | `vms.json` e chave raiz `vms` |
| Chaves de ícone | `videowall.*` no `ui-icons` | `vms.*` |
| Rótulo de navegação | `camera.navbar.videowall` | `camera.navbar.vms`, valor `VMS` |
| `localStorage` | `videowall.lastSceneBySystem` | `vms.lastSceneBySystem`, com migração de leitura única |

### O que continua dizendo video-wall, de propósito

Isto **não é dívida esquecida, é decisão medida**. A primeira versão da PR de backend movia a pasta
para `src/vms/` e migrava os contratos para `lib/vms/`: deu **98 arquivos, 91 sem nada observável**, e
foi cortada para 7.

| Fica | Motivo |
| --- | --- |
| Pasta `apps/ms-cameras/src/video-wall/` e as classes `VideoWall*` | os models Prisma que elas persistem continuam `VideoWall*`, porque nome de tabela é valor persistido. Renomear as classes em volta produzia um `VmsScenesRepository` operando em `prisma.videoWallScene`, ou seja dois vocabulários no mesmo arquivo |
| Contratos `lib/videowall/`, `lib/camera/video-wall.validation.ts` e os símbolos `IVideoWall*` | nome de símbolo não aparece na tela, na URL, no payload nem no banco. Migrar exigia 22 aliases obsoletos no `@attlas/contracts` mais um card só para removê-los |
| Tabelas `VideoWallLayout` / `VideoWallScene` / `VideoWallSceneCell` | renome de tabela custa migration; vai junto da migration do cadastro do processador H9, numa janela só |
| Valores de `EnumVideowallLayout` e os `errorCode` `VIDEOWALL_*` | valor serializado e contrato estável |
| IDs e slugs de spec (`MOD-006-video-wall`, UC-014/015/016, `MOD-001-videowall`, `RF-VW-*`) | imutáveis depois de `in-review`, exigido pelo SPEC-GUIDE |
| Pasta `modules/videowall/` do front, selectors `app-videowall-*`, classes CSS, tokens de z-index | diff mecânico grande sem ganho funcional; card do dono do módulo |

Se a implementação for renomeada um dia, vai junto da migration das tabelas, num card só, para schema e
código nunca ficarem em vocabulários diferentes.

> [!success] Colisão de sigla: resolvida em 31/07
> A tela fica com **VMS**. Quem muda de nome é o outro: o sistema externo de gravação deixa de ser
> chamado de VMS e passa a **gravador externo (NVR)** em `docs/modules/cameras.md` (9 linhas, incluindo
> o glossário, RF-INT-01 e RNF-CAM-11), nos SPEC do `ms-cameras` e do `ms-traffic-model`, no
> `SPEC-GUIDE` e no template de spec de integração. Isso é a fase 0 do renome, docs-only.
>
> Segunda colisão, essa **intocável**: no `ms-pmv`, VMS é *Variable Message Sign*, com cerca de 90
> ocorrências em testes NTCIP/SNMP. Regra dura das PRs do renome: **nenhuma toca `apps/ms-pmv/**` nem
> `apps/ms-connector-*/**`**, e o CI do `ms-pmv` verde é a prova de que nada vazou.

### As três PRs (10/08)

| Card | PR | Conteúdo | Tamanho |
| --- | --- | --- | --- |
| [[SOFTWARE-2431 - Renome para VMS - fase 0 terminologia\|2431]] | [#1438](https://github.com/atmanadmin/attlas-2026/pull/1438) | Spec CROSS-045 e todo o markdown: prosa dos docs, glossário, conteúdo de MOD-006, UC-014/015/016, MOD-011 e do `SPEC.md`; de carona a dependência quebrada do UC-028 | 18 arquivos |
| [[SOFTWARE-2438 - Renome para VMS - fase 1 API e contratos\|2438]] | [#1439](https://github.com/atmanadmin/attlas-2026/pull/1439) | Só o caminho público: os dois controllers atendem `vms` além de `video-wall`, Kong publica `/api/vms`, testes provam as duas rotas | 7 arquivos |
| [[SOFTWARE-2439 - Renome para VMS - fase 2 rota e i18n\|2439]] | [#1440](https://github.com/atmanadmin/attlas-2026/pull/1440) | Rota do front com redirect, i18n nos 4 locales, ícones, `localStorage` com migração, e a deleção dos 4 bundles monolíticos órfãos | 43 arquivos |

Ordem de merge obrigatória, 1438 depois 1439 depois 1440: o front só funciona em runtime com `/api/vms`
já no gateway, e o teste unitário não pega essa dependência. O prefixo antigo sai no card de limpeza
[[SOFTWARE-2481 - Renome VMS - fase 3 remove o path legado|2481]] — **o ClickUp marca esse card como
fechado, mas o código na develop ainda tem a rota dupla** (`cameras.controller.ts`,
`video-wall.controller.ts`, `docker/kong.yml`), achado em 22/08. Ver a nota do card.


## Mapa de código

| Área | Caminho no repo |
| --- | --- |
| Layouts + cenas (MOD-006) | `apps/ms-cameras/src/video-wall/` |
| Monitoramento de banda (MOD-008) | `apps/ms-cameras/src/dashboard/bandwidth/` |
| Picker de câmeras | `apps/ms-cameras/src/cameras/handlers/list-video-wall-cameras/` + rota em `src/cameras/cameras.controller.ts` |
| Persistência | `apps/ms-cameras/src/database/schema/video_wall/` |
| Seed dos layouts predefinidos | `apps/ms-cameras/src/database/seed.ts` (`VIDEO_WALL_LAYOUTS`) |
| Contratos da view (front) | `libs/contracts/src/lib/videowall/` (`i-videowall-view.ts`, `i-videowall-cell.ts`, `i-rotation-config.ts`, `videowall.enum.ts`) |
| Contrato de banda | `libs/contracts/src/lib/camera/i-bandwidth-monitoring-payload.ts`, `bandwidth-alert-level.enum.ts` |
| Validação de cena | `libs/contracts/src/lib/camera/video-wall.validation.ts` |
| Frontend (mosaico do VMS) | `apps/web-attlas/src/app/modules/videowall/` (mosaico, side panel, layout picker, rotação, dirty guard) |
| Alvo videowall externo (backend) | `apps/ms-cameras/src/video-wall/targets/` (`novastar-h9/` client+codec+capabilities+mirror+projection, `processor/`, `state/` brilho e estado, `group/`, `browser-session/`, `playground/` emulação sem hardware) — ver [[Videowall externo (NovaStar H9)]] |
| Alvo videowall externo (front) | `apps/web-attlas/src/app/modules/videowall/display-target/` (dialog compartilhado: espelhar com slot picker, processador, brilho, estado) |
| Despacho de plano → videowall | `libs/contracts/src/lib/execution-plans/videowall-command-action.type.ts`, `apps/ms-execution-plans/src/infrastructure/actions/videowall-actions.service.ts`, eco em `apps/ms-cameras/src/events/consumers/execution-plans-videowall-command/` |

## Superfície HTTP

Todas sob o prefixo global `/api`. Layouts e cenas escopados pela **organização do JWT**; o picker pelo
**`system-id` do header**; a banda pelos `cameraIds` recebidos. Os mesmos caminhos sob `/api/video-wall`
e `/api/cameras/video-wall` respondem igual durante a janela de transição de uma sprint; os nomes de
handler continuam `VideoWall*` de propósito, ver a seção do renome acima.

| Método + rota | UC | Handler | O que faz |
| --- | --- | --- | --- |
| `GET /vms/layouts` | UC-015 | `ListVideoWallLayoutsHandler` | Templates de layout da org mais os globais |
| `POST /vms/scenes` | UC-016 | `CreateVideoWallSceneHandler` | Cria cena (`layoutId` **XOR** `customGrid` + `cells`) |
| `GET /vms/scenes` | UC-016 | `ListVideoWallScenesHandler` | Lista cenas da org (forma slim + contadores) |
| `GET /vms/scenes/:id` | UC-016 | `GetVideoWallSceneHandler` | Detalhe: layout + células enriquecidas com metadados da câmera |
| `PATCH /vms/scenes/:id` | UC-016 | `UpdateVideoWallSceneHandler` | Atualiza nome/layout/células (células = substituição total) |
| `DELETE /vms/scenes/:id` | UC-016 | `DeleteVideoWallSceneHandler` | Remove cena (204) |
| `POST /vms/scenes/:id/activate` | UC-016 | `SetVideoWallSceneActiveHandler` | `isActive = true` (200) |
| `POST /vms/scenes/:id/deactivate` | UC-016 | `SetVideoWallSceneActiveHandler` | `isActive = false` (200) |
| `GET /cameras/vms` | UC-014 | `ListVideoWallCamerasHandler` | Picker paginado de câmeras elegíveis (filtros `q`, `cameraType`, `lifecycleState`) |
| `GET /dashboard/bandwidth?cameraIds=` | UC-019 | `GetBandwidthSnapshotHandler` | Snapshot de banda da sessão (ou da rede sem `cameraIds`) |

Handlers CQRS (query/command bus) em `src/video-wall/handlers/…` e `src/dashboard/bandwidth/handlers/…`;
wiring em `src/video-wall/video-wall.module.ts`.

> [!note] Banda: do VMS é só o snapshot
> `/api/dashboard/bandwidth-consumption`, `bandwidth-by-area` e `bandwidth-comparison` (rota Kong
> `ms-cameras-dashboard-bandwidth`) pertencem ao **dashboard de câmeras** (UC-038 e vizinhos), não à
> sessão do VMS. Compartilham a regra de seleção de perfil, nada mais. Ver [[VMS - Banda e alertas]].

## Persistência (`src/database/schema/video_wall/`)

| Modelo | Papel | Campos-chave |
| --- | --- | --- |
| `VideoWallLayout` | Template de grade (predefinido ou custom) | `columns`, `rows`, `isDefault`, `organizationId` |
| `VideoWallScene` | Cena = câmeras num layout | `layoutId` (FK cascade), `name`, `isActive`, `sortOrder`, `organizationId` |
| `VideoWallSceneCell` | Célula posicionada na grade | `cameraId?` (null = slot vazio, FK **restrict**), `gridColumn/gridRow`, `columnSpan/rowSpan` |

Não existe coluna `version`: o `version` do contrato `IVideowallView` é vestígio do locking otimista que
o front abandonou (ver [[VMS - Arquitetura e estratégias]]).

Layouts predefinidos são **1x1, 2x2, 3x3 e 4x4**, criados pelo seed (`VIDEO_WALL_LAYOUTS`) na
**organização global** `00000000-0000-0000-0000-000000000000` (`GLOBAL_ORGANIZATION_ID` em
`src/video-wall/video-wall.constants.ts`); a listagem consulta `organizationId IN (org, GLOBAL)`. Os
presets 5x5 e 6x6 que o front oferece **não têm layout seedado** e caem no `customGrid`.

## Escopo por organização (JWT)

Cenas e layouts são **org-scoped**: o `organizationId` vem de `IJwtClaims` (`@CurrentUser`) e é gravado
no comando pelo controller. Acesso cross-org devolve **404** (`ResourceNotFoundException`) sem vazar
existência (BR-VWS-001); os repositórios sempre filtram `where: { organizationId }`. O picker é
escopado por **`systemId`** (header `system-id`, `@SystemId()`), não pelo JWT.

## Rastreabilidade

- Contexto de negócio: `docs/modules/cameras.md` (3.2, 8.2, 9) - RF-VW-01 a RF-VW-20, RNF-CAM-04, RNF-CAM-12, RNF-CAM-14 a RNF-CAM-19.
- Specs backend (mosaico): UC-014 (picker), UC-015 (layouts, SOFTWARE-1368), UC-016 (cenas, SOFTWARE-1370), UC-019 (banda), UC-030 (banda device-truth), UC-038 (série histórica de banda), PROJ-008 (coletor de banda provisionada), MOD-006, MOD-008.
- Specs backend (videowall externo): `MOD-016-videowall-display-target` (nível Alto), UC-049 (cadastro), UC-050 (tomar/liberar), UC-051 (projetar/liberar cena), UC-052 (grupos/shares), UC-053 (atualizar processador), INT-014 (janelas/presets, `superseded`), INT-015 (brilho/estado), PROJ-019 (expira espelho órfão), PROJ-020 (eco do comando de plano); despacho em `PROJ-004` no `ms-execution-plans`.
- Spec frontend: `apps/web-attlas/docs/modules/videowall/MOD-001-videowall.md` — **[DEFASADO 22/08]** o corpo ainda descreve o estado pré-renome (`/cameras/videowall`), não reconciliado com a SOFTWARE-2439; ver banner do próprio doc. Atômicas do mosaico: UF-001 a UF-022 (views, rotação, dirty guard UF-011). Atômicas do videowall externo: UF-023 a UF-034 (`UF-024` dialog compartilhado, `UF-029` brilho, `UF-031` espelhar com preview, `UF-034` escolher slot de destino).
- BRs citadas no código: `BR-VWL-*`, `BR-VWS-*`, `BR-BW-*`, `BR-VWM-*` (mirror).

## Arquitetura do frontend em 22/08: página vira casca, estado vira store própria

A PR [#1884](https://github.com/atmanadmin/attlas-2026/pull/1884) reorganizou `videowall.page.ts` de
2023 para ~1180 linhas, aplicando ao módulo do VMS o padrão de camadas que o módulo de alarmes já usa
no `web-attlas` — vale como referência para qualquer feature module grande do front, não só este:

- **Página** só reage a gesto do operador e orquestra os componentes filhos; não guarda estado de
  domínio nem lógica de decisão.
- **Store de página** (`@ngrx/signals`, um `signalStore` por preocupação, não um só monolítico) guarda o
  estado com signals e expõe `computed` para o template. Nasceram quatro: sessões de vídeo HLS
  (`videowall-stream-session.store.ts`), diretório de câmeras do painel, cena do mosaico
  (`videowall-mosaic-scene.store.ts`) e modo imersivo. Cada uma tem o spec ao lado.
- **Serviço** só fala HTTP — sem lógica de decisão, sem estado.
- **Componentização**: cada aba/grade que antes era markup solto na página virou componente próprio
  (`videowall-cameras-tab`, `videowall-views-tab`, `videowall-responsive-grid`, `videowall-toolbar`),
  cada um levando junto a folha de estilo e o spec.

**Achado do review desta PR, ainda em aberto em 22/08 (ver comentários do PR)**: mover markup pra um
componente novo sem mover 100% do CSS/spec junto foi o erro que se repetiu em três componentes
extraídos (`videowall-responsive-grid`, `videowall-views-tab`, `videowall-cameras-tab` — este último
com regressão real de paleta de cor). Padrão a repetir em qualquer extração de componente futura: ao
mover markup, conferir classe por classe que o CSS de origem tem equivalente na folha nova, e que o
`.spec.ts` velho não ficou testando seletor que não existe mais no componente filho.

## Notas do domínio

- [[VMS - Arquitetura e estratégias]] - modelo layout/cena/célula, custom grid, ativação, divisão backend x frontend, requisitos e desempenho.
- [[VMS - Fluxos]] - criar/ativar cena, listar layouts, picker, fluxo de montar o mosaico, erros.
- [[VMS - Banda e alertas]] - banda device-truth, níveis de alerta, fronteira com o dashboard ([[08 - MOD-008 bandwidth-monitoring.excalidraw|diagrama]]).

## Relacionados

[[Videowall externo (NovaStar H9)]] · [[Cameras]] · [[Streaming]] · [[PTZ e presets]] · [[Saúde e monitoramento]] · [[ms-cameras]]
