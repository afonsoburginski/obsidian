---
tags:
  - doc
  - ms-cameras
  - cameras
  - vms
aliases:
  - "Video Wall - Fluxos"
atualizado: 2026-08-24
---

# VMS - Fluxos

> Parte do [[VMS]] (MOD-006). Fluxos de use case (backend) e o user flow de montar o mosaico. Visual no canvas: [[06 - MOD-006 VMS.excalidraw|diagrama]].

> [!success] Estado em 24/08: rotas atualizadas para `/vms`
> Até 31/07 as rotas abaixo eram `/video-wall` com o renome para `/vms` só escopado. Confirmado em
> 24/08 (`c9766ab960`, 18/08, mergeado na develop): o path `/video-wall` **não existe mais** em nenhum
> ambiente - só `/vms`/`/cameras/vms` respondem. As tabelas abaixo já usam as rotas atuais.

## UC-015 - Listar layouts (`GET /vms/layouts`)

| # | Passo |
| --- | --- |
| 1 | Controller lê `organizationId` do JWT (`@CurrentUser`); null → só globais |
| 2 | `ListVideoWallLayoutsHandler` → `repository.findLayouts(org)` |
| 3 | Query `organizationId IN (org, GLOBAL)`, ordena `isDefault desc, columns asc, rows asc` |
| 4 | Retorna `{ data: IVideoWallLayout[] }` (`id, name, columns, rows, isDefault`) |

Só existem 1x1, 2x2, 3x3 e 4x4 como predefinidos (seed). Preset 5x5/6x6 escolhido na tela não acha
layout e vira `customGrid` no save.

## UC-014 - Picker de câmeras (`GET /cameras/vms`)

| # | Passo |
| --- | --- |
| 1 | Controller injeta `systemId` do header `system-id` (`@SystemId()`) na query |
| 2 | `ListVideoWallCamerasHandler` aplica filtros `q`, `cameraType[]`, `lifecycleState[]` + paginação (`page`/`pageSize`) |
| 3 | `repository.findForVideoWall(...)` devolve linhas + total |
| 4 | Mapeia para `ICameraVideoWallItem` (inclui `ptz`, `status`, `hasSecondaryStream`) + bloco `pagination` |

Elegibilidade segue a mesma regra da cena (existe, não deletada, diferente de `STOCK`, ver
[[VMS - Arquitetura e estratégias]]).

## UC-016 - Criar cena (`POST /vms/scenes`)

| # | Passo |
| --- | --- |
| 1 | Controller grava `organizationId` (JWT) no `CreateVideoWallSceneCommand` |
| 2 | `resolveSceneGrid` exige **exatamente um** de `layoutId`/`customGrid` (senão 400); layout inexistente na org ou global → 404 |
| 3 | `validateSceneCellsFitGrid`: cada célula cabe na grade e nenhuma sobrepõe (senão 409) |
| 4 | `assertCamerasEligible`: toda célula com câmera é elegível (senão 409 `CAMERA_NOT_ELIGIBLE`) |
| 5 | `createScene` (transação): resolve/materializa layout (custom → dedup por org), `sortOrder = count(org)`, `isActive = false`, cria células |
| 6 | Retorna `VideoWallSceneResult` (slim + `allocatedCameraCount`/`onlineCameraCount`) |

`PATCH /vms/scenes/:id` segue o mesmo pipeline de validação; `cells` substitui o conjunto inteiro;
trocar layout revalida as células existentes e limpa o layout custom órfão. O front usa PATCH e **não**
manda `If-Match` (locking otimista descartado).

## UC-016 - Ativar cena em 1 ação (`POST /vms/scenes/:id/activate`)

| # | Passo |
| --- | --- |
| 1 | `SetVideoWallSceneActiveCommand(org, id, true)` |
| 2 | `setSceneActive` confirma a cena na org (senão 404) e faz `update { isActive: true }` |
| 3 | Retorna a cena atualizada (200) |

`deactivate` é idêntico com `isActive = false`. **Atenção**: ativar **não** desativa outras cenas, não há
"cena ativa única" no backend (ver [[VMS - Arquitetura e estratégias]]). RF-VW-02 ("ativar com ação
única") é atendido por este único POST.

## User flow - montar o mosaico

Passos do operador na tela e o que o backend faz em cada um:

| # | Ação do operador | Backend |
| --- | --- | --- |
| 1 | Escolhe um layout (1x1 a 6x6 ou custom) | `GET /vms/layouts`; preset sem layout seedado vira `customGrid` no save |
| 2 | Abre o picker e arrasta câmeras para as células | `GET /cameras/vms` (paginado, filtrável) |
| 3 | Manda a seleção em lote para a grade | Nada: o front dimensiona o preset e descarta o excedente acima de 6x6 |
| 4 | Salva o mosaico como visualização (cena) | `POST /vms/scenes` (valida grade, sobreposição, elegibilidade) |
| 5 | Ativa com um clique | `POST /vms/scenes/:id/activate` |
| 6 | Vê os feeds ao vivo | Player resolve o **stream secundário** via [[Streaming]] (backend não devolve URL) |
| 7 | Comanda PTZ inline numa célula | Comandos e estado via [[PTZ e presets]]; estado por célula é do front (RF-VW-04) |
| 8 | Deixa as visualizações em rotação | Timer no **frontend** (RF-VW-03, `IRotationConfig` na URL); backend só serve as cenas |
| 9 | Expande uma célula em tela cheia | `GET /vms/scenes/:id` + status/detalhe da câmera; popup é do front (RF-VW-05) |
| 10 | Sai da página com edição pendente | Nada: `videowallDirtyGuard` (UF-011) pede confirmação no cliente |

## Erros e status

| Situação | Exceção → HTTP |
| --- | --- |
| Cena/layout de outra org ou inexistente | `ResourceNotFoundException` → 404 |
| `layoutId` e `customGrid` juntos (ou nenhum) | `InvalidInputException` → 400 |
| Célula fora da grade / posição inválida | `BusinessRuleViolationException` → 409 |
| Células sobrepostas | `BusinessRuleViolationException` → 409 |
| Câmera não elegível na cena | `BusinessRuleViolationException` → 409 |

## Relacionados

[[VMS]] · [[VMS - Arquitetura e estratégias]] · [[VMS - Banda e alertas]] · [[PTZ e presets]] · [[Streaming]]
