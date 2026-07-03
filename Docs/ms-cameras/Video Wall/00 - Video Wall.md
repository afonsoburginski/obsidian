---
tags: [doc, cameras, ms-cameras, video-wall]
---

# Video Wall (ms-cameras)

> Submódulo do [[ms-cameras - visão geral]] — **MOD-006 video-wall** (layouts + cenas) e **MOD-008 bandwidth-monitoring** (banda). Canvas: [[06 - MOD-006 video-wall.excalidraw|diagrama]].

O Video Wall compõe e exibe **N feeds simultâneos** em um mosaico configurável. O backend é a **fonte de verdade de layouts, cenas e do consumo agregado de banda**; a renderização do mosaico, a rotação automática, o PTZ inline e o popup de tela cheia são **frontend** (feature module `videowall`), que consome o vídeo pelo stream secundário via [[00 - Streaming]].

> [!abstract] O que o backend faz
> Guarda e serve **layouts** (templates de grade) e **cenas** (conjunto de câmeras posicionadas num layout, ativáveis com uma ação), oferece o **picker** de câmeras elegíveis para montar a cena, e calcula um **snapshot de banda** da sessão. Não renderiza vídeo, não roda a rotação, não mantém sessão PTZ.

## Mapa de código

| Área | Pasta no repo |
| --- | --- |
| Layouts + cenas (MOD-006) | `apps/ms-cameras/src/video-wall/` |
| Monitoramento de banda (MOD-008) | `apps/ms-cameras/src/dashboard/bandwidth/` |
| Picker de câmeras | `apps/ms-cameras/src/cameras/handlers/list-video-wall-cameras/` + rota em `src/cameras/cameras.controller.ts` |
| Persistência | `apps/ms-cameras/src/database/schema/video_wall/` |
| Contrato de banda | `libs/contracts/src/lib/camera/i-bandwidth-monitoring-payload.ts`, `bandwidth-alert-level.enum.ts` |
| Validação de cena | `libs/contracts/src/lib/camera/video-wall.validation.ts` |

## Superfície HTTP

Todas sob o prefixo global `/api`. Layouts e cenas escopados pela **organização do JWT**; o picker pelo **`system-id` do header**; a banda pelos `cameraIds` recebidos.

| Método + rota | UC | Handler | O que faz |
| --- | --- | --- | --- |
| `GET /video-wall/layouts` | UC-015 | `ListVideoWallLayoutsHandler` | Templates de layout da org ∪ globais |
| `POST /video-wall/scenes` | UC-016 | `CreateVideoWallSceneHandler` | Cria cena (`layoutId` **XOR** `customGrid` + `cells`) |
| `GET /video-wall/scenes` | UC-016 | `ListVideoWallScenesHandler` | Lista cenas da org (forma slim + contadores) |
| `GET /video-wall/scenes/:id` | UC-016 | `GetVideoWallSceneHandler` | Detalhe: layout + células enriquecidas com metadados da câmera |
| `PATCH /video-wall/scenes/:id` | UC-016 | `UpdateVideoWallSceneHandler` | Atualiza nome/layout/células (células = substituição total) |
| `DELETE /video-wall/scenes/:id` | UC-016 | `DeleteVideoWallSceneHandler` | Remove cena (204) |
| `POST /video-wall/scenes/:id/activate` | UC-016 | `SetVideoWallSceneActiveHandler` | `isActive = true` (200) |
| `POST /video-wall/scenes/:id/deactivate` | UC-016 | `SetVideoWallSceneActiveHandler` | `isActive = false` (200) |
| `GET /cameras/video-wall` | — | `ListVideoWallCamerasHandler` | Picker paginado de câmeras elegíveis (filtros `q`, `cameraType`, `lifecycleState`) |
| `GET /dashboard/bandwidth?cameraIds=` | UC-019 | `GetBandwidthSnapshotHandler` | Snapshot de banda da sessão (ou da rede sem `cameraIds`) |

Handlers CQRS (query/command bus) em `src/video-wall/handlers/…` e `src/dashboard/bandwidth/handlers/…`; wiring em `src/video-wall/video-wall.module.ts`.

## Persistência (`src/database/schema/video_wall/`)

| Modelo | Papel | Campos-chave |
| --- | --- | --- |
| `VideoWallLayout` | Template de grade (predefinido ou custom) | `columns`, `rows`, `isDefault`, `organizationId` |
| `VideoWallScene` | Cena = câmeras num layout | `layoutId` (FK cascade), `name`, `isActive`, `sortOrder`, `organizationId` |
| `VideoWallSceneCell` | Célula posicionada na grade | `cameraId?` (null = slot vazio, FK **restrict**), `gridColumn/gridRow`, `columnSpan/rowSpan` |

Layouts predefinidos (1x1..4x4) pertencem à **organização global** `00000000-0000-0000-0000-000000000000` (`GLOBAL_ORGANIZATION_ID` em `src/video-wall/video-wall.constants.ts`); a listagem consulta `organizationId IN (org, GLOBAL)`.

## Escopo por organização (JWT)

Cenas e layouts são **org-scoped**: o `organizationId` vem de `IJwtClaims` (`@CurrentUser`) e é gravado no comando pelo controller. Acesso cross-org devolve **404** (`ResourceNotFoundException`) sem vazar existência (BR-VWS-001) — os repositórios sempre filtram `where: { organizationId }`. O picker é escopado por **`systemId`** (header `system-id`, `@SystemId()`), não pelo JWT.

## Notas do domínio

- [[Video Wall - Arquitetura e estratégias]] — modelo layout/cena/célula, custom grid, ativação, backend × frontend.
- [[Video Wall - Fluxos]] — criar/ativar cena, listar layouts, picker, fluxo de montar o mural.
- [[Video Wall - Requisitos e SLA]] — RF-VW-01..06, RNF-CAM-04, RNF-CAM-12 e estado de cada um.
- [[Video Wall - Banda e alertas]] — monitoramento de banda e níveis de alerta ([[08 - MOD-008 bandwidth-monitoring.excalidraw|diagrama]]).

## Relacionados

[[00 - Cameras]] · [[00 - Streaming]] · [[00 - PTZ e presets]] · [[00 - Saúde e monitoramento]] · [[ms-cameras - visão geral]]
</content>
</invoke>
