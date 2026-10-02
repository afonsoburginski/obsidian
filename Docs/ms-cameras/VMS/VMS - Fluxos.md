---
tags:
  - doc
  - ms-cameras
  - cameras
  - vms
aliases:
  - "Video Wall - Fluxos"
atualizado: 2026-10-01
---

# VMS - Fluxos

Volta para [[VMS]]. Regras e modelo em [[VMS - Arquitetura e estratégias]]. Fluxos do painel físico em
[[Videowall - Fluxos]].

## Listar layouts (UC-015, `GET /api/vms/layouts`)

1. O controller lê `organizationId` do JWT (`@CurrentUser`); sem ele, só os globais.
2. `ListVideoWallLayoutsHandler` consulta `organizationId IN (org, GLOBAL)`, ordenado por
   `isDefault desc, columns asc, rows asc`.
3. Responde `{ data: IVideoWallLayout[] }` (`id, name, columns, rows, isDefault`).

## Picker de câmeras (UC-014, `GET /api/cameras/vms`)

1. `@RequireSystemDuty()` confere que o requisitante é membro do sistema; o controller injeta o `systemId`
   do header `System-Id`.
2. `ListVideoWallCamerasHandler` aplica `q`, `cameraType[]`, `lifecycleState[]` e `page`/`pageSize`.
3. `repository.findForVideoWall` devolve linhas e total; sem filtro de estado, só `OPERATIONAL`.
4. Mapeia para `ICameraVideoWallItem` mais o bloco `pagination`.

## Criar ou editar cena (UC-016, `POST` e `PATCH /api/vms/scenes`)

1. `@RequirePermission(cameras.videoWall:configure)`; o controller grava o `organizationId` do JWT no comando.
2. `resolveSceneGrid` exige exatamente um de `layoutId` ou `customGrid` (senão 400); layout inexistente na
   organização ou nos globais dá 404.
3. `validateSceneCellsFitGrid`: cada célula cabe e nenhuma sobrepõe (409).
4. `assertCamerasEligible`: toda câmera é elegível (409 `CAMERA_NOT_ELIGIBLE`).
5. `createScene` em transação: materializa o layout custom (dedup por organização), `sortOrder =
   count(org)`, `isActive = false`, cria as células.
6. Responde `VideoWallSceneResult`; o `@Audited` emite a trilha em `attlas.audit.cameras`.

No `PATCH`, `cells` substitui o conjunto inteiro, trocar o layout revalida as células e limpa o custom
órfão, e o front não manda `If-Match`.

## Ativar ou desativar cena (UC-016 e UC-051)

1. `@RequirePermission(cameras.videoWall:operate)`; o controller lê `{ target?, takeover? }` e, só se vier,
   o `System-Id` (malformado dá 400 `SYSTEM_ID_HEADER_INVALID`).
2. `SetVideoWallSceneActiveHandler` resolve o alvo; sem `target`, `BROWSER_SESSION`.
3. `BROWSER_SESSION`: `setSceneActive` confirma a cena na organização e grava `isActive`. `VIDEOWALL`: o
   `NovastarH9DisplayTarget` projeta a cena salva no painel, ou limpa a parede no `deactivate`, sem tocar
   em `isActive`.
4. Cena ausente ou de outra organização dá 404 nos dois alvos; ativação por operador emite auditoria.
5. Responde a cena (200).

No alvo padrão, ativar não desativa outras cenas: não há "cena ativa única" no backend.

## Montar o mosaico (user flow)

| # | Ação do operador | Backend |
| --- | --- | --- |
| 1 | Escolhe um layout (1x1 a 6x6 ou custom) | `GET /api/vms/layouts`; preset sem layout seedado vira `customGrid` no save |
| 2 | Abre o picker e arrasta câmeras para as células | `GET /api/cameras/vms` |
| 3 | Manda a seleção em lote para a grade | nada: o front dimensiona o preset e descarta o excedente acima de 6x6 |
| 4 | Salva como visualização | `POST /api/vms/scenes` |
| 5 | Ativa com um clique | `POST /api/vms/scenes/:id/activate` |
| 6 | Vê os feeds ao vivo | o front abre uma sessão por câmera via [[Streaming]]; a cena não devolve URL |
| 7 | Comanda PTZ numa célula | o controle compartilhado dirige o tile escolhido, via [[PTZ e presets]] |
| 8 | Deixa as visualizações em rotação | timer no front, `IRotationConfig` na URL |
| 9 | Expande uma célula em tela cheia | `GET /api/vms/scenes/:id` e detalhe da câmera; o popup é do front |
| 10 | Sai com edição pendente | nada: `videowallDirtyGuard` pede confirmação |
| 11 | Envia a grade ao painel externo | `activate` com `target: VIDEOWALL`, salvando antes se há edição pendente |

## Erros

| Situação | Exceção e HTTP |
| --- | --- |
| Cena ou layout de outra organização, ou inexistente | `ResourceNotFoundException`, 404 |
| `layoutId` e `customGrid` juntos, ou nenhum | `InvalidInputException`, 400 |
| Célula fora da grade, sobreposta ou com câmera inelegível | `BusinessRuleViolationException`, 409 |
| Sem a permissão da rota | `ForbiddenActionException`, 403 `FORBIDDEN_ACTION` |
| `ms-organization` fora do ar na avaliação | `PermissionResolverUnavailableException`, 503 (fail-closed) |
| `System-Id` malformado na ativação | `InvalidInputException`, 400 `SYSTEM_ID_HEADER_INVALID` |
