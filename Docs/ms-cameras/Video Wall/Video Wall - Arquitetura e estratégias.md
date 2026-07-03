---
tags: [doc, cameras, ms-cameras, video-wall]
---

# Video Wall — Arquitetura e estratégias

> Parte do [[00 - Video Wall]] (MOD-006). Canvas: [[06 - MOD-006 video-wall.excalidraw|diagrama]].

## Modelo: layout → cena → célula

Três entidades encadeadas (`src/database/schema/video_wall/`):

- **`VideoWallLayout`** — a grade. `columns × rows`, `isDefault` (predefinido vs custom), `organizationId`. Predefinidos (1x1..4x4) vivem na org global; customs pertencem à org do usuário.
- **`VideoWallScene`** — o mural salvo. Aponta para um layout (`layoutId`, FK **cascade**), tem `name`, `isActive`, `sortOrder`. Uma cena por linha; `cells` compõem o conteúdo.
- **`VideoWallSceneCell`** — a célula. `cameraId?` (null = **slot vazio**), posição (`gridColumn`, `gridRow`, 1-indexed) e ocupação (`columnSpan`, `rowSpan`, default 1). FK câmera **restrict** (não deixa apagar câmera ainda usada em cena).

Limites de validação (`libs/contracts/src/lib/camera/video-wall.validation.ts`, fonte única back+front): `name` 1–120; grade `min 1`, `max 1000×1000`; **máx. 100 células** por cena.

## Escopo por organização

Layouts e cenas são **org-scoped** pelo `organizationId` do JWT. Todo repositório filtra por org; cross-org devolve 404 sem vazar existência (BR-VWS-001). Layouts predefinidos são compartilhados via a org sentinela `GLOBAL_ORGANIZATION_ID` (`00000000-0000-0000-0000-000000000000`), e a listagem usa `organizationId IN (org, GLOBAL)`, com ordenação fixa `isDefault desc, columns asc, rows asc` (BR-VWL-003). Cenas listam por `sortOrder asc, name asc`.

## Custom grid (D3/D4)

Uma cena informa **exatamente um** de `layoutId` ou `customGrid` (BR-VWS-005; ambos ou nenhum → 400 `LAYOUT_SOURCE_AMBIGUOUS`). O `customGrid` só é **materializado no `save`**, dentro da transação (`resolveLayoutId` em `video-wall-scenes.repository.ts`):

1. Procura um layout custom (`isDefault=false`) da org com as mesmas dimensões → **reusa** (dedup por org).
2. Não achou → cria `Custom {C}x{R}` (`isDefault=false`).
3. Ao trocar o layout de uma cena, o custom anterior é **removido se ficar órfão** (`isDefault=false` e nenhuma cena o referencia).

O teto de grade em 1000×1000 (D4) existe porque o frontend projeta a **árvore de tiling do mosaico** numa grade percentual virtual (até 0,1% por passo) — o backend só valida e persiste posições/spans nessa grade, não conhece o layout visual.

## Validação de células (BR-VWS-003/004)

No create/update (`handlers/_helpers/validate-scene-cells.ts`):

- **Cabe na grade**: `gridColumn/Row ≥ 1` e `col+span-1 ≤ columns` / `row+span-1 ≤ rows` (senão 409 `CELL_OUT_OF_BOUNDS`/`INVALID_CELL_POSITION`).
- **Sem sobreposição**: interseção de retângulos par a par, O(n²) sobre as células (limitado a 100), independente da resolução da grade → 409 `CELL_OVERLAP`.
- **Câmeras elegíveis**: toda célula com `cameraId` referencia câmera que existe, não deletada e **≠ `STOCK`** (`findEligibleCameraIds`); ineligível → 409 `CAMERA_NOT_ELIGIBLE`. Mesma regra do picker. Slots vazios (`cameraId: null`) são ignorados.

No `PATCH`, quando só o layout muda (sem novas células), as células **atuais** são revalidadas contra a nova grade — o update nunca deixa a cena fora dos limites. `cells` no update é **substituição total** do conjunto.

## Ativação de cena — não é exclusiva

`activate`/`deactivate` chamam `SetVideoWallSceneActiveCommand(org, id, isActive)` → `setSceneActive`, que **apenas alterna `isActive` da cena alvo**. O backend **não** garante "uma cena ativa por org": ativar uma cena **não desativa** as outras. Exclusividade e rotação são decisão do frontend/sessão.

## Contadores derivados na resposta

`VideoWallSceneResult` (create/update/activate/list) deriva das células, sem campo persistido:

- `allocatedCameraCount` = células com `cameraId`.
- `onlineCameraCount` = dessas, quantas têm `operationalSnapshot.connectionStatus ≠ OFFLINE` (sem snapshot conta como não-online).

O detalhe (`VideoWallSceneDetailResult`) enriquece cada célula com `ICameraVideoWallItem` (mesma forma do picker), incluindo `layout {columns, rows, name}`. **Nenhuma resposta traz URL de stream** — o player resolve o stream por conta própria via [[00 - Streaming]].

## Picker de câmeras elegíveis

`GET /cameras/video-wall` (`ListVideoWallCamerasHandler`, no domínio `cameras`) devolve as câmeras montáveis: paginado, com filtros `q` (texto), `cameraType[]` e `lifecycleState[]`, escopado por `systemId` (header). Cada item (`ICameraVideoWallItem`): `id`, `name`, `cameraType`, `lifecycleState`, `ptz` (kind PTZ ou capability `ptz`), `status` (conexão), `intersection`, `hasSecondaryStream` (tem perfil SECONDARY ativo — sinaliza aptidão ao Video Wall).

## Backend × frontend

| Recurso | Onde vive | Backend provê |
| --- | --- | --- |
| Layouts / cenas / células (RF-VW-01/02) | Backend | CRUD, validação, templates, ativação |
| Rotação automática (RF-VW-03) | **Frontend** | As cenas + `activate`/`deactivate`; a alternância temporizada é do cliente |
| PTZ inline por célula (RF-VW-04) | **Frontend** | Comandos/estado PTZ pelo domínio [[00 - PTZ e presets]]; estado por célula é do cliente |
| Popup detalhe/tela cheia (RF-VW-05) | **Frontend** | Detalhe da cena + status/detalhe da câmera; o layout do popup é do cliente |
| Monitoramento de banda (RF-VW-06) | Backend | Snapshot agregado + nível de alerta ([[Video Wall - Banda e alertas]]) |
| Renderização do mosaico / desempenho (RNF-CAM-04) | **Frontend** | Dados slim, sem stream URL; carga de vídeo fica no player/mediamtx |

## Decisões

- **D3** — custom grid materializa um `VideoWallLayout` no save (não em memória); dedup por org, limpeza de órfãos no update.
- **D4** — grade virtual até 1000×1000 para o mosaico percentual; validação O(n²) desacoplada da resolução.
- **MOD-008 reusa telemetria** — a banda não cria tabela/worker novos; reusa perfil SECONDARY + snapshot de health (ver [[Video Wall - Banda e alertas]]).

## Relacionados

[[00 - Video Wall]] · [[Video Wall - Fluxos]] · [[Video Wall - Banda e alertas]] · [[00 - Streaming]] · [[00 - PTZ e presets]] · [[00 - Cameras]]
</content>
