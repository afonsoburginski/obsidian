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
atualizado: 2026-07-31
---

# VMS - Video Monitoring System (ms-cameras)

> Submódulo do [[ms-cameras]]. Backend: **MOD-006 video-wall** (layouts + cenas) e **MOD-008 bandwidth-monitoring** (banda). Frontend: **MOD-001-videowall**. Canvas: [[06 - MOD-006 VMS.excalidraw|diagrama]].

> [!important] Nomenclatura decidida na daily de 31/07
> Esta tela, o mosaico de feeds ao vivo no browser, passa a se chamar **VMS (Video Monitoring
> System)**. O termo **videowall** fica reservado ao painel físico externo de Quito, o processador
> NovaStar H9: [[Videowall externo (NovaStar H9)]]. Código, rotas, contratos e i18n ainda dizem
> `video-wall`/`videowall`; o renome é card próprio e está escopado abaixo.
> Ver [[Attlas - Sprint 27]], que registra as considerações da daily.

O VMS compõe e exibe **N feeds simultâneos** em um mosaico configurável. O backend é a **fonte de
verdade de layouts, cenas e do consumo agregado de banda**; a renderização do mosaico, a rotação
automática, o PTZ inline e o popup de tela cheia são **frontend**, que consome o vídeo pelo stream
secundário via [[Streaming]].

> [!abstract] O que o backend faz
> Guarda e serve **layouts** (templates de grade) e **cenas** (conjunto de câmeras posicionadas num layout, ativáveis com uma ação), oferece o **picker** de câmeras elegíveis para montar a cena, e calcula um **snapshot de banda** da sessão. Não renderiza vídeo, não roda a rotação, não mantém sessão PTZ.

## Renome para VMS: o que muda

Nada disso foi aplicado ainda. É o escopo do card de renome, e a rota muda junto:

| Hoje | Alvo |
| --- | --- |
| Módulo backend `apps/ms-cameras/src/video-wall/` | `src/vms/` |
| Rotas REST `/api/video-wall/layouts`, `/api/video-wall/scenes*` | `/api/vms/...` |
| Rota Kong `ms-cameras-video-wall-route` (`paths: ['/api/video-wall']`) | path e nome novos |
| Picker `GET /api/cameras/video-wall` | `GET /api/cameras/vms` |
| Contratos `libs/contracts/src/lib/videowall/` + `camera/video-wall.validation.ts` | `lib/vms/` |
| Front `apps/web-attlas/src/app/modules/videowall/` e rota `/cameras/videowall` | `modules/vms`, `/cameras/vms` |
| i18n `locales/<locale>/videowall.json`, chave de menu `camera.navbar.videowall` | `vms.json`, `camera.navbar.vms` |
| Tabelas `VideoWallLayout` / `VideoWallScene` / `VideoWallSceneCell` | renome opcional (custa migration, pode ficar para depois) |
| Specs UC-014/015/016, MOD-006, MOD-008, MOD-001-videowall | renomear ID e título junto |

> [!success] Colisão de sigla: resolvida em 31/07
> A tela fica com **VMS**. Quem muda de nome é o outro: o sistema externo de gravação deixa de ser
> chamado de VMS e passa a **gravador externo (NVR)** em `docs/modules/cameras.md` (9 linhas, incluindo
> o glossário, RF-INT-01 e RNF-CAM-11), nos SPEC do `ms-cameras` e do `ms-traffic-model`, no
> `SPEC-GUIDE` e no template de spec de integração. Isso é a fase 0 do renome, docs-only.
>
> Segunda colisão, essa **intocável**: no `ms-pmv`, VMS é *Variable Message Sign*, com cerca de 90
> ocorrências em testes NTCIP/SNMP. Regra dura das PRs do renome: **nenhuma toca `apps/ms-pmv/**` nem
> `apps/ms-connector-*/**`**, e o CI do `ms-pmv` verde é a prova de que nada vazou.

### Estratégia do renome (3 PRs, sprint a definir)

Desenhada no planejamento da Sprint 27 e escopada para outra sprint no replanejamento de 31/07, que
deixou a 27 com foco único no analítico desacoplado.

Regra que governa as três: **renomeia símbolo, arquivo, rota e namespace; não renomeia valor
serializado.** Ficam de fora de propósito os nomes de tabela e constraint Prisma, os valores string de
`EnumVideowallLayout` (as 16 chaves de ícone estão acopladas a eles) e o payload do `localStorage`.
Assim nenhuma PR consegue corromper dado.

| Fase | Card | Conteúdo |
| --- | --- | --- |
| 0 | `[Back]` terminologia | Só docs: gravador externo vira NVR, glossário ganha VMS (a tela) e videowall (o painel físico), aviso no MOD do Lucas. |
| 1 | `[Back]` API e contratos | `src/video-wall/` vira `src/vms/`, controller vira `@Controller('vms')`, contratos migram para `lib/vms/` **mantendo alias de tipo no barrel** (senão a compilação quebra entre a PR de back e a de front), Kong com `paths: ['/api/vms', '/api/video-wall']` e o Nest mantendo o prefixo antigo por uma sprint, porque front e Kong deployam em pipelines separados e sem alias qualquer ordem de deploy dá 404 na tela. Specs MOD-006 e UC-014/015/016 renomeados, e de carona a referência quebrada do UC-028 corrigida. |
| 2 | `[Front]` rota e i18n | Rota `vms` com redirect `prefix` do `videowall` (preserva o deep link `/:viewId`), menu, `videowall.json` vira `vms.json` nos 4 locales **mais os bundles monolíticos que duplicam o namespace** (se dessincronizar, a tela sai metade traduzida e nenhum teste pega), ícones, e a chave de `localStorage` com migração de leitura única, senão todo operador perde a última cena por sistema. |

Fora da semana, de propósito: renomear as tabelas Prisma (vai junto da migration do videowall externo,
uma janela só) e mover a pasta do módulo Angular mais renumerar os 25 UF, que é diff mecânico gigante e
conflita com a branch do H9. Os UF são do Lucas: card no nome dele, dependente da fase 2, e a
renumeração é decisão do dono (a pasta já tem UF-013, UF-019 e UF-020 duplicados).

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
| Frontend | `apps/web-attlas/src/app/modules/videowall/` (mosaico, side panel, layout picker, rotação, dirty guard) |

## Superfície HTTP

Todas sob o prefixo global `/api`. Layouts e cenas escopados pela **organização do JWT**; o picker pelo
**`system-id` do header**; a banda pelos `cameraIds` recebidos.

| Método + rota | UC | Handler | O que faz |
| --- | --- | --- | --- |
| `GET /video-wall/layouts` | UC-015 | `ListVideoWallLayoutsHandler` | Templates de layout da org mais os globais |
| `POST /video-wall/scenes` | UC-016 | `CreateVideoWallSceneHandler` | Cria cena (`layoutId` **XOR** `customGrid` + `cells`) |
| `GET /video-wall/scenes` | UC-016 | `ListVideoWallScenesHandler` | Lista cenas da org (forma slim + contadores) |
| `GET /video-wall/scenes/:id` | UC-016 | `GetVideoWallSceneHandler` | Detalhe: layout + células enriquecidas com metadados da câmera |
| `PATCH /video-wall/scenes/:id` | UC-016 | `UpdateVideoWallSceneHandler` | Atualiza nome/layout/células (células = substituição total) |
| `DELETE /video-wall/scenes/:id` | UC-016 | `DeleteVideoWallSceneHandler` | Remove cena (204) |
| `POST /video-wall/scenes/:id/activate` | UC-016 | `SetVideoWallSceneActiveHandler` | `isActive = true` (200) |
| `POST /video-wall/scenes/:id/deactivate` | UC-016 | `SetVideoWallSceneActiveHandler` | `isActive = false` (200) |
| `GET /cameras/video-wall` | UC-014 | `ListVideoWallCamerasHandler` | Picker paginado de câmeras elegíveis (filtros `q`, `cameraType`, `lifecycleState`) |
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

- Contexto de negócio: `docs/modules/cameras.md` (3.2, 8.2, 9) - RF-VW-01 a RF-VW-06, RNF-CAM-04, RNF-CAM-12.
- Specs backend: UC-014 (picker), UC-015 (layouts, SOFTWARE-1368), UC-016 (cenas, SOFTWARE-1370), UC-019 (banda), UC-030 (banda device-truth), UC-038 (série histórica de banda), PROJ-008 (coletor de banda provisionada), MOD-006, MOD-008.
- Spec frontend: `apps/web-attlas/docs/modules/videowall/MOD-001-videowall.md` (views, rotação, dirty guard UF-011).
- BRs citadas no código: `BR-VWL-*`, `BR-VWS-*`, `BR-BW-*`.

## Notas do domínio

- [[VMS - Arquitetura e estratégias]] - modelo layout/cena/célula, custom grid, ativação, divisão backend x frontend, requisitos e desempenho.
- [[VMS - Fluxos]] - criar/ativar cena, listar layouts, picker, fluxo de montar o mosaico, erros.
- [[VMS - Banda e alertas]] - banda device-truth, níveis de alerta, fronteira com o dashboard ([[08 - MOD-008 bandwidth-monitoring.excalidraw|diagrama]]).

## Relacionados

[[Videowall externo (NovaStar H9)]] · [[Cameras]] · [[Streaming]] · [[PTZ e presets]] · [[Saúde e monitoramento]] · [[ms-cameras]]
