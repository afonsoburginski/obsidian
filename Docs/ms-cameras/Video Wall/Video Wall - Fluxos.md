---
tags: [doc, cameras, ms-cameras, video-wall]
---

# Video Wall — Fluxos

> Parte do [[00 - Video Wall]] (MOD-006). Fluxos de use case (backend) e o user flow de montar o mural. Visual no canvas: [[06 - MOD-006 video-wall.excalidraw|diagrama]].

## UC — Listar layouts (`GET /video-wall/layouts`)

| # | Passo |
| --- | --- |
| 1 | Controller lê `organizationId` do JWT (`@CurrentUser`); null → só globais |
| 2 | `ListVideoWallLayoutsHandler` → `repository.findLayouts(org)` |
| 3 | Query `organizationId IN (org, GLOBAL)`, ordena `isDefault desc, columns asc, rows asc` |
| 4 | Retorna `{ data: IVideoWallLayout[] }` (`id, name, columns, rows, isDefault`) |

## UC — Picker de câmeras (`GET /cameras/video-wall`)

| # | Passo |
| --- | --- |
| 1 | Controller injeta `systemId` do header `system-id` (`@SystemId()`) na query |
| 2 | `ListVideoWallCamerasHandler` aplica filtros `q`, `cameraType[]`, `lifecycleState[]` + paginação (`page`/`pageSize`) |
| 3 | `repository.findForVideoWall(...)` devolve linhas + total |
| 4 | Mapeia para `ICameraVideoWallItem` (inclui `ptz`, `status`, `hasSecondaryStream`) + bloco `pagination` |

Elegibilidade segue a mesma regra da cena (existe, não deletada, ≠ `STOCK`, ver [[Video Wall - Arquitetura e estratégias]]).

## UC — Criar cena (`POST /video-wall/scenes`)

| # | Passo |
| --- | --- |
| 1 | Controller grava `organizationId` (JWT) no `CreateVideoWallSceneCommand` |
| 2 | `resolveSceneGrid` — exige **exatamente um** de `layoutId`/`customGrid` (senão 400); layout inexistente na org∪global → 404 |
| 3 | `validateSceneCellsFitGrid` — cada célula cabe na grade e nenhuma sobrepõe (senão 409) |
| 4 | `assertCamerasEligible` — toda célula com câmera é elegível (senão 409 `CAMERA_NOT_ELIGIBLE`) |
| 5 | `createScene` (transação): resolve/materializa layout (custom → dedup por org), `sortOrder = count(org)`, `isActive = false`, cria células |
| 6 | Retorna `VideoWallSceneResult` (slim + `allocatedCameraCount`/`onlineCameraCount`) |

`PATCH /video-wall/scenes/:id` segue o mesmo pipeline de validação; `cells` substitui o conjunto inteiro; trocar layout revalida as células existentes e limpa o layout custom órfão.

## UC — Ativar cena em 1 ação (`POST /video-wall/scenes/:id/activate`)

| # | Passo |
| --- | --- |
| 1 | `SetVideoWallSceneActiveCommand(org, id, true)` |
| 2 | `setSceneActive` confirma a cena na org (senão 404) e faz `update { isActive: true }` |
| 3 | Retorna a cena atualizada (200) |

`deactivate` é idêntico com `isActive = false`. **Atenção**: ativar **não** desativa outras cenas — não há "cena ativa única" no backend (ver [[Video Wall - Arquitetura e estratégias]]). RF-VW-02 ("ativar com ação única") é atendido por este único POST.

## User flow — montar o mural

Passos do operador no feature module `videowall`, e o que o backend faz em cada um:

| # | Ação do operador | Backend |
| --- | --- | --- |
| 1 | Escolhe um layout (1x1..4x4 ou custom) | `GET /video-wall/layouts` (custom só materializa no save) |
| 2 | Abre o picker e arrasta câmeras para as células | `GET /cameras/video-wall` (paginado, filtrável) |
| 3 | Salva o mural como cena | `POST /video-wall/scenes` (valida grade, sobreposição, elegibilidade) |
| 4 | Ativa a cena com um clique | `POST /video-wall/scenes/:id/activate` |
| 5 | Vê os feeds ao vivo | Player resolve o **stream secundário** via [[00 - Streaming]] (backend não devolve URL) |
| 6 | Comanda PTZ inline numa célula | Comandos/estado via [[00 - PTZ e presets]]; o estado por célula é do frontend (RF-VW-04) |
| 7 | Deixa as cenas rodarem em rotação | Rotação é temporizada no **frontend** (RF-VW-03); backend só serve as cenas |
| 8 | Expande uma célula em tela cheia | `GET /video-wall/scenes/:id` + status/detalhe da câmera; popup é do frontend (RF-VW-05) |

## Erros e status

| Situação | Exceção → HTTP |
| --- | --- |
| Cena/layout de outra org ou inexistente | `ResourceNotFoundException` → 404 |
| `layoutId` e `customGrid` juntos (ou nenhum) | `InvalidInputException` → 400 |
| Célula fora da grade / posição inválida | `BusinessRuleViolationException` → 409 |
| Células sobrepostas | `BusinessRuleViolationException` → 409 |
| Câmera não elegível na cena | `BusinessRuleViolationException` → 409 |

## Relacionados

[[00 - Video Wall]] · [[Video Wall - Arquitetura e estratégias]] · [[Video Wall - Banda e alertas]] · [[00 - PTZ e presets]] · [[00 - Streaming]]
</content>
