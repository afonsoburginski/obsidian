---
tags:
  - doc
  - cameras
  - vms
aliases:
  - "Câmeras - VMS - Fluxos"
  - "Video Wall - Fluxos"
  - "VMS - Fluxos"
atualizado: 2026-10-07
---

# Câmeras - VMS - Fluxos

Volta para [[Câmeras - VMS]].

## Resumo

| Fluxo | Gatilho | Resultado |
| --- | --- | --- |
| [[#Listar layouts]] | `GET /api/vms/layouts` | Layouts da organização mais os globais |
| [[#Seletor de câmeras]] | `GET /api/cameras/vms` | Página de câmeras elegíveis |
| [[#Criar ou editar cena]] | `POST` ou `PATCH /api/vms/scenes` | Cena persistida e auditada |
| [[#Ativar ou desativar cena]] | `POST /api/vms/scenes/:id/activate` ou `/deactivate` | `isActive` alterado, ou cena projetada no painel |
| [[#Montar o mosaico]] | Operador na tela `/cameras/vms` | Mosaico com vídeo ao vivo, PTZ e rotação |

Modelo, regras e permissões: [[Câmeras - VMS - Arquitetura e estratégias]]. Fluxos do painel físico:
[[Câmeras - Videowall - Fluxos]].

## Listar layouts

**Gatilho.** `GET /api/vms/layouts`.

**Passos.**

1. O controller lê `organizationId` do JWT (`@CurrentUser`); sem ele, devolve só os globais.
2. `ListVideoWallLayoutsHandler` consulta `organizationId IN (org, GLOBAL)`, ordenado por
   `isDefault desc, columns asc, rows asc`.

**Resultado.** `{ data: IVideoWallLayout[] }`, com `id`, `name`, `columns`, `rows` e `isDefault`.

**Erros.** Sem JWT válido, 401 no Kong; a rota não tem outra recusa.

## Seletor de câmeras

**Gatilho.** `GET /api/cameras/vms` com `q`, `cameraType[]`, `lifecycleState[]`, `page` e `pageSize`.

**Passos.**

1. `@RequireSystemDuty()` confere que o requisitante é membro do sistema; o controller injeta o `systemId` do
   header `System-Id`.
2. `ListVideoWallCamerasHandler` aplica os filtros e a paginação.
3. `findForVideoWall` devolve linhas e total; sem filtro de estado, só `OPERATIONAL`, e nunca `STOCK`.
4. Mapeia para `ICameraVideoWallItem` mais o bloco `pagination`.

**Resultado.** Página de câmeras elegíveis para o mosaico.

**Erros.** Header `System-Id` ausente ou malformado: 400. Requisitante fora do sistema: 403.

## Criar ou editar cena

**Gatilho.** `POST /api/vms/scenes` ou `PATCH /api/vms/scenes/:id`.

**Passos.**

1. `@RequirePermission(cameras.videoWall:configure)`; o controller grava o `organizationId` do JWT no comando.
2. `resolveSceneGrid` exige exatamente um de `layoutId` ou `customGrid`.
3. `validateSceneCellsFitGrid` confere que cada célula cabe na grade e que nenhuma sobrepõe outra.
4. `assertCamerasEligible` confere que toda câmera existe, não está apagada e não é `STOCK`.
5. Em transação: materializa o layout custom (reusado por dimensões dentro da organização), define
   `sortOrder = count(org)` e `isActive = false` na criação e grava as células.
6. O `@Audited` publica a trilha em `attlas.audit.cameras`.

No `PATCH`, `cells` substitui o conjunto inteiro, trocar o layout revalida as células e remove o custom que
ficou órfão, e o front não manda `If-Match`.

**Resultado.** `VideoWallSceneResult`, com `allocatedCameraCount` e `onlineCameraCount`.

**Erros.**

| Situação | Exceção e HTTP |
| --- | --- |
| Sem `cameras.videoWall:configure` | `ForbiddenActionException`, 403 `FORBIDDEN_ACTION` |
| `ms-organization` fora do ar na avaliação de permissão | `PermissionResolverUnavailableException`, 503 (fail-closed) |
| Cena de outra organização ou inexistente, no `PATCH` | `ResourceNotFoundException`, 404 |
| `layoutId` e `customGrid` juntos, ou nenhum | `InvalidInputException`, 400 `LAYOUT_SOURCE_AMBIGUOUS` |
| Layout inexistente na organização e nos globais | 404 |
| Célula fora da grade | `BusinessRuleViolationException`, 409 `CELL_OUT_OF_BOUNDS` ou `INVALID_CELL_POSITION` |
| Células sobrepostas | 409 `CELL_OVERLAP` |
| Câmera inexistente, apagada ou em `STOCK` | 409 `CAMERA_NOT_ELIGIBLE` |

## Ativar ou desativar cena

**Gatilho.** `POST /api/vms/scenes/:id/activate` ou `/deactivate`, com corpo `{ target?, takeover? }`.

**Passos.**

1. `@RequirePermission(cameras.videoWall:operate)`; o controller lê o corpo e, só se vier, o header
   `System-Id`.
2. `SetVideoWallSceneActiveHandler` resolve o alvo; sem `target`, `BROWSER_SESSION`.
3. O handler confirma que a cena existe na organização, para os dois alvos.
4. `BROWSER_SESSION`: `setSceneActive` grava `isActive`. `VIDEOWALL`: o `NovastarH9DisplayTarget` projeta a
   cena salva no painel, ou limpa a parede no `deactivate`, sem tocar em `isActive`
   ([[Câmeras - Videowall - Fluxos]]).
5. Ativação por operador publica auditoria com o antes e o depois de `isActive`.

**Resultado.** A cena (200). No alvo padrão, ativar não desativa as outras cenas.

**Erros.**

| Situação | Exceção e HTTP |
| --- | --- |
| Sem `cameras.videoWall:operate` | `ForbiddenActionException`, 403 `FORBIDDEN_ACTION` |
| `ms-organization` fora do ar na avaliação de permissão | `PermissionResolverUnavailableException`, 503 (fail-closed) |
| Cena de outra organização ou inexistente | `ResourceNotFoundException`, 404 |
| `System-Id` malformado | `InvalidInputException`, 400 `SYSTEM_ID_HEADER_INVALID` |
| Erros do painel físico com `target: VIDEOWALL` | [[Câmeras - Videowall - Fluxos]] |

## Montar o mosaico

**Gatilho.** O operador abre `/cameras/vms` ou `/cameras/vms/:viewId`.

**Passos.**

| # | Ação do operador | O que acontece |
| --- | --- | --- |
| 1 | Escolhe um layout (1x1 a 6x6 ou custom) | `GET /api/vms/layouts`; preset sem layout no seed vira `customGrid` no save |
| 2 | Abre o seletor e arrasta câmeras para as células | `GET /api/cameras/vms` |
| 3 | Manda a seleção em lote para a grade | Nenhuma chamada: o front dimensiona o preset e descarta o excedente acima de 6x6, avisando |
| 4 | Salva como visualização | `POST /api/vms/scenes` |
| 5 | Ativa com um clique | `POST /api/vms/scenes/:id/activate` |
| 6 | Vê os vídeos ao vivo | O front abre uma sessão por câmera pelo [[Câmeras - Streaming]]; a cena não devolve URL |
| 7 | Comanda PTZ numa célula | O controle compartilhado dirige o tile escolhido, via [[Câmeras - PTZ e presets]] |
| 8 | Deixa as visualizações em rotação | Timer no front; `IRotationConfig` na URL |
| 9 | Expande uma célula em tela cheia | `GET /api/vms/scenes/:id` e detalhe da câmera; o popup é do front |
| 10 | Sai com edição pendente | Nenhuma chamada: `videowallDirtyGuard` pede confirmação |
| 11 | Envia a grade ao painel externo | `activate` com `target: VIDEOWALL`, salvando antes se há edição pendente |

**Resultado.** Mosaico com vídeo ao vivo, PTZ por tile, rotação e tela cheia.

**Erros.** Tile cuja sessão não abre mostra "Sem sinal" sobre a miniatura; o teto de sessões (429) mostra o
estado `cap-reached`. Controle sem permissão aparece desabilitado com cadeado.
