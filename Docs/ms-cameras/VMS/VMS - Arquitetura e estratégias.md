---
tags:
  - doc
  - ms-cameras
  - cameras
  - vms
aliases:
  - "Video Wall - Arquitetura e estratégias"
  - "Video Wall - Requisitos e SLA"
atualizado: 2026-08-24
---

# VMS - Arquitetura e estratégias

> Parte do [[VMS]] (MOD-006). Canvas: [[06 - MOD-006 VMS.excalidraw|diagrama]]. Nomenclatura: VMS é o mosaico no browser; o painel físico externo é [[Videowall externo (NovaStar H9)]].

## Modelo: layout, cena, célula

Três entidades encadeadas (`src/database/schema/video_wall/`):

- **`VideoWallLayout`** - a grade. `columns × rows`, `isDefault` (predefinido vs custom), `organizationId`. Predefinidos (1x1, 2x2, 3x3, 4x4, via seed) vivem na org global; customs pertencem à org do usuário.
- **`VideoWallScene`** - o mosaico salvo. Aponta para um layout (`layoutId`, FK **cascade**), tem `name`, `isActive`, `sortOrder`. Uma cena por linha; `cells` compõem o conteúdo.
- **`VideoWallSceneCell`** - a célula. `cameraId?` (null = **slot vazio**), posição (`gridColumn`, `gridRow`, 1-indexed) e ocupação (`columnSpan`, `rowSpan`, default 1). FK câmera **restrict** (não deixa apagar câmera ainda usada em cena).

Limites de validação (`libs/contracts/src/lib/camera/video-wall.validation.ts`, fonte única back+front):
`name` 1 a 120; grade `min 1`, `max 1000×1000`; **máx. 100 células** por cena.

## Escopo por organização

Layouts e cenas são **org-scoped** pelo `organizationId` do JWT. Todo repositório filtra por org;
cross-org devolve 404 sem vazar existência (BR-VWS-001). Layouts predefinidos são compartilhados via a
org sentinela `GLOBAL_ORGANIZATION_ID` (`00000000-0000-0000-0000-000000000000`), e a listagem usa
`organizationId IN (org, GLOBAL)`, com ordenação fixa `isDefault desc, columns asc, rows asc`
(BR-VWL-003). Cenas listam por `sortOrder asc, name asc`.

## Custom grid (D3/D4)

Uma cena informa **exatamente um** de `layoutId` ou `customGrid` (BR-VWS-005; ambos ou nenhum → 400
`LAYOUT_SOURCE_AMBIGUOUS`). O `customGrid` só é **materializado no `save`**, dentro da transação
(`resolveLayoutId` em `video-wall-scenes.repository.ts`):

1. Procura um layout custom (`isDefault=false`) da org com as mesmas dimensões → **reusa** (dedup por org).
2. Não achou → cria `Custom {C}x{R}` (`isDefault=false`).
3. Ao trocar o layout de uma cena, o custom anterior é **removido se ficar órfão** (`isDefault=false` e nenhuma cena o referencia).

O teto de grade em 1000×1000 (D4) existe porque o frontend projeta a **árvore de tiling do mosaico**
numa grade percentual virtual (até 0,1% por passo); o backend só valida e persiste posições/spans nessa
grade, não conhece o layout visual.

## Validação de células (BR-VWS-003/004)

No create/update (`handlers/_helpers/validate-scene-cells.ts`):

- **Cabe na grade**: `gridColumn/Row ≥ 1` e `col+span-1 ≤ columns` / `row+span-1 ≤ rows` (senão 409 `CELL_OUT_OF_BOUNDS`/`INVALID_CELL_POSITION`).
- **Sem sobreposição**: interseção de retângulos par a par, O(n²) sobre as células (limitado a 100), independente da resolução da grade → 409 `CELL_OVERLAP`.
- **Câmeras elegíveis**: toda célula com `cameraId` referencia câmera que existe, não deletada e **diferente de `STOCK`** (`findEligibleCameraIds`); ineligível → 409 `CAMERA_NOT_ELIGIBLE`. Mesma regra do picker. Slots vazios (`cameraId: null`) são ignorados.

No `PATCH`, quando só o layout muda (sem novas células), as células **atuais** são revalidadas contra a
nova grade, então o update nunca deixa a cena fora dos limites. `cells` no update é **substituição
total** do conjunto.

## Ativação de cena: não é exclusiva

`activate`/`deactivate` chamam `SetVideoWallSceneActiveCommand(org, id, isActive)` → `setSceneActive`,
que **apenas alterna `isActive` da cena alvo**. O backend **não** garante "uma cena ativa por org":
ativar uma cena **não desativa** as outras. Exclusividade e rotação são decisão do frontend/sessão.

## Contadores derivados na resposta

`VideoWallSceneResult` (create/update/activate/list) deriva das células, sem campo persistido:

- `allocatedCameraCount` = células com `cameraId`.
- `onlineCameraCount` = dessas, quantas têm `operationalSnapshot.connectionStatus` diferente de `OFFLINE` (sem snapshot conta como não-online).

O detalhe (`VideoWallSceneDetailResult`) enriquece cada célula com `ICameraVideoWallItem` (mesma forma do
picker), incluindo `layout {columns, rows, name}`. **Nenhuma resposta traz URL de stream**: o player
resolve o stream por conta própria via [[Streaming]].

## Picker de câmeras elegíveis

`GET /cameras/vms` (UC-014, `ListVideoWallCamerasHandler`, no domínio `cameras`) devolve as
câmeras montáveis: paginado, com filtros `q` (texto), `cameraType[]` e `lifecycleState[]`, escopado por
`systemId` (header). Cada item (`ICameraVideoWallItem`): `id`, `name`, `cameraType`, `lifecycleState`,
`ptz` (kind PTZ ou capability `ptz`), `status` (conexão), `intersection`, `hasSecondaryStream` (tem
perfil SECONDARY ativo, o que sinaliza aptidão ao mosaico).

> [!success] Estado em 24/08: rota confirmada `/cameras/vms`
> O path `/cameras/video-wall` não existe mais desde `c9766ab960` (18/08, mergeado na develop) - só
> `/cameras/vms` responde. Ver [[VMS]] callout "Estado em 24/08".

## O frontend (MOD-001-videowall)

O front não é uma casca fina; boa parte do comportamento da tela vive nele
(`apps/web-attlas/src/app/modules/videowall/`):

- **Vocabulário próprio**: o operador salva **"visualizações"** (`IVideowallView` em `libs/contracts/src/lib/videowall/`), que no backend são **cenas**. Mesmo objeto, dois nomes.
- **Rota**: `/cameras/vms` e `/cameras/vms/:viewId` resolvem o mesmo `VideowallPageComponent`, reaproveitado entre trocas de `:viewId`. `videowallDirtyGuard` (UF-011) abre o diálogo de descarte ao sair com edição pendente. Rota confirmada em 24/08 - não existe mais redirect de `/cameras/videowall`, o path legado foi removido de vez (ver callout acima e [[VMS]]).
- **Arquitetura em camadas (PR #1884, mergeada)**: a página deixou de guardar estado de domínio; virou
  casca fina orquestrando componentes filhos e 6 SignalStores próprios em `pages/videowall/`
  (`videowall-stream-session.store.ts`, `videowall-camera-directory.store.ts`,
  `videowall-mosaic-scene.store.ts`, `videowall-immersive.store.ts`, `videowall-ptz.store.ts`,
  `videowall-view-catalog.store.ts`). Detalhe completo em [[VMS]] seção "Arquitetura do frontend".
- **Mosaico**: `mosaic-board`, `mosaic-tile`, `mosaic-splitter` (tiling redimensionável, `mosaic-tree.util.ts`), mais side panel, layout picker, diálogo de criar view e diálogo de rotação - hoje montados dentro da `videowall-mosaic-scene.store.ts` em vez de estado solto na página.
- **Presets de grade**: `EnumVideowallLayout` vai de `GRID_1X1` a `GRID_6X6` mais `CUSTOM`. Como o seed só tem até 4x4, `toSceneWrite` mapeia o preset para o `layoutId` seedado quando existe e **cai para `customGrid` quadrado** quando não existe (é assim que 5x5 e 6x6 funcionam).
- **Coordenadas**: o view model é **0-based**; o contrato HTTP é **1-based**. A conversão acontece no `videowall.service.ts`.
- **Rotação**: `IRotationConfig` (`items[] {viewId, dwellSeconds}`, `loop`) mora em `@attlas/contracts` porque é serializada na URL, mas **não tem endpoint**: o timer é local, `dwellSeconds` mínimo 5s, presets de 10/20/30/60/120s.
- **Envio em lote**: "mandar para a grade" dimensiona o menor preset quadrado que cabe na seleção, com teto de 6x6, e **descarta o excedente** avisando por overflow.

> [!warning] Divergência viva entre contrato e implementação
> `IVideowallView` documenta `version` como valor de `If-Match` num `PUT /api/video-wall/scenes/:id`
> (locking otimista) - path que já não existe mais (ver rota atual acima; o verbo também é `PATCH`, não
> `PUT`). O backend só expõe `PATCH`, não tem coluna `version`, e o front **abandonou** o
> locking: não manda `If-Match` e ecoa `version: 0`. O campo sobrevive nos contratos sem semântica.
> Candidato a limpeza junto com o renome para VMS.

## Divisão backend x frontend, requisitos e estado

Requisitos de `docs/modules/cameras.md` (8.2 e 9) cruzados com o código:

| ID | Requisito | Onde vive | Estado |
| --- | --- | --- | --- |
| RF-VW-01 | Layouts configuráveis | Backend | Predefinidos 1x1 a 4x4 (seed, org global) + custom por org via `GET /vms/layouts`; 5x5 e 6x6 chegam como `customGrid` |
| RF-VW-02 | Gestão de cenas, ativável em ação única | Backend | CRUD completo + `activate` num único POST |
| RF-VW-03 | Rotação automática | **Frontend** | Backend serve as cenas e o toggle; timer, ordem e `dwellSeconds` são do cliente (`IRotationConfig`) |
| RF-VW-04 | PTZ inline por célula | **Frontend** | Comandos e estado via [[PTZ e presets]]; estado por célula vive hoje na `videowall-ptz.store.ts` |
| RF-VW-05 | Popup detalhe / tela cheia | Parcial | Backend dá `GET /vms/scenes/:id` + status/detalhe da câmera; o popup é do cliente |
| RF-VW-06 | Monitoramento de banda | Parcial | Backend agrega total + nível de alerta; consumo por câmera e proatividade ficam no front ([[VMS - Banda e alertas]]) |
| RNF-CAM-04 | Desempenho do mosaico | Parcial | Ver abaixo |
| RNF-CAM-12 | Alertas de banda | Parcial | Total + `alertLevel` no backend; por câmera e o aviso proativo são do front |

### Desempenho (RNF-CAM-04)

O backend contribui por **desenho de dados**, não por otimização de vídeo (vídeo é mediamtx/player, ver
[[Streaming]]):

- **Respostas slim**: listagem e ativação usam `VideoWallSceneResult` (escalares + 2 contadores), **sem URL de stream** nem payload por frame. O custo de rede é O(nº de cenas), não O(nº de câmeras × frames).
- **Validação limitada**: sobreposição O(n²) sobre no máx. **100 células**, desacoplada da resolução da grade (até 1000×1000), barata mesmo em mosaicos densos.
- **Carga de vídeo fora do ms-cameras**: cada célula abre o stream **secundário** direto no mediamtx; adicionar células não sobrecarrega o backend de negócio.
- **Limite prático**: a responsividade independente do nº de células é majoritariamente **frontend** (nº de players WebRTC/HLS simultâneos, GPU). O backend não impõe teto por cena além das 100 células de validação.

## Decisões

- **D3** - custom grid materializa um `VideoWallLayout` no save (não em memória); dedup por org, limpeza de órfãos no update.
- **D4** - grade virtual até 1000×1000 para o mosaico percentual; validação O(n²) desacoplada da resolução.
- **MOD-008 reusa telemetria** - a banda não cria tabela nem worker novos; reusa perfil de stream + snapshot de health (ver [[VMS - Banda e alertas]]).
- **Locking otimista descartado** no front, sem contrapartida no backend (ver aviso acima).
- **Página vira casca, estado vira store própria** (PR #1884, mergeada) - ver [[VMS]] seção "Arquitetura do frontend".

## Relacionados

[[VMS]] · [[VMS - Fluxos]] · [[VMS - Banda e alertas]] · [[Videowall externo (NovaStar H9)]] · [[Streaming]] · [[PTZ e presets]] · [[Cameras]]
