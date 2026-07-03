---
tags:
  - doc
  - cameras
  - ms-cameras
  - crud
servico: ms-cameras
fonte: apps/ms-cameras/src/cameras
atualizado: 2026-07-03
---

# Cameras — Arquitetura e estratégias

> Parte do domínio [[00 - Cameras]] · [[ms-cameras - visão geral]]. Ver também [[Cameras - Fluxos]] e [[Cameras - Requisitos e SLA]]. Diagrama: [[01 - MOD-001 cameras-crud.excalidraw|diagrama]].

Como o CRUD e o ciclo de vida da câmera estão construídos, e as decisões por trás.

## Camadas: controller → handler → repository

CQRS via `@nestjs/cqrs`. O `CamerasController` não tem lógica de negócio: valida entrada (class-validator nas classes de command/query), injeta contexto de request (`System-Id`, Bearer) e despacha para `CommandBus`/`QueryBus`. Cada operação é um handler dedicado (`src/cameras/handlers/<op>/`), com command/query e handler em arquivos separados (regra [CQRS] do `backend-standards.md`).

- **Commands** mutam estado (create, update, state, safe-mode, replace, soft-delete, validate-credentials).
- **Queries** leem (list, get-by-id, manufacturers, models, validate, batch-get, bulk-template).
- Handler → `ICamerasRepository` (nunca fala Prisma direto) → `PrismaService` (adapter-pg / PostgreSQL).
- Resposta serializada com `plainToInstance(<Response>, result)` no controller; o shape wire (`ICameraResponse`, etc.) vem de `@attlas/contracts` — sem DTO de resposta local (evita duplicação, regra [HC]).

**Por quê**: uma responsabilidade por classe, testabilidade unitária por handler, e o repositório como única fronteira de dados — qualquer submódulo que precise de `Camera` reusa `ICamerasRepository` em vez de reabrir consultas.

## Repository com token de injeção + Prisma

`CamerasRepository implements ICamerasRepository`, exposto por `ICamerasRepositoryToken = Symbol('ICamerasRepository')` e injetado com `@Inject(...)`. Interface e implementação em arquivos próprios. O `where`/`orderBy`/paginação da listagem são montados em métodos privados (`buildWhere`, `buildOrderBy`, `buildConnectionStatusWhere`, `buildPtzWhere`, `buildJsonCapabilityWhere`) — filtros multivalor, busca ILIKE (`name`/`serialNumber`/`ipAddress`/`model`), filtros JSON de `analyticsCapabilities` (`ptz`/`dai`/`virtualLoop`) e filtro por topologia (`trafficElementId IN`).

**Trade-off**: o `where` é escrito à mão (não usa o toolkit `list-query` CROSS-027) porque combina derivações não triviais — status via relação 1:1 `operationalSnapshot`, JSON path, e OR de status OFFLINE que também casa snapshot ausente.

## Criação em batch atômica

`POST /cameras` recebe e devolve **array** (`ParseArrayPipe` com item `CreateCameraCommand`). `CreateCamerasHandler`:

1. Rejeita batch > `MAX_BATCH_SIZE` (50) → `InvalidInputException('BATCH_LIMIT_EXCEEDED')` (400).
2. Resolve cada marca **distinta uma única vez**, sequencialmente (evita corrida ao auto-registrar a mesma marca duas vezes no mesmo batch).
3. Valida `replacedByCameraId` de cada item (404 se não existir).
4. `repository.createMany` executa todos os `create` dentro de um `$transaction` → all-or-nothing.

Projeção `Command → CameraCreateInput` centralizada em `CameraMapper.toCreateInput` (fonte única para create single e batch), que **força `lifecycleState=STOCK`** (BR-CRUD-001).

## Resolução de marca (auto-registro)

`ManufacturerResolverService.resolve(value)` aceita UUID, nome ou code e devolve o id de `CameraManufacturer`, **auto-registrando** marca não catalogada (ex.: vendor code que o ONVIF reporta, "AXIS"). É concurrency-safe: `code` é `@unique`, então duas requisições que ambas erram o find e tentam criar caem P2002; o perdedor re-resolve pelo code derivado e devolve o vencedor (sem 500, sem marca duplicada). O `code` é derivado do nome (primeiro token, alfanumérico, upper, ≤32 chars). Decisão SOFTWARE-1195: cadastro de câmera **nunca** dá 404 por marca desconhecida.

## Multi-tenant por `systemId` (header `System-Id`)

O escopo de tenant vem **sempre** do header `System-Id`, nunca do body/query. `@SystemId()` é fail-closed (400 se ausente/UUID inválido). O controller sobrescreve `query.systemId`/`query.bearer` **após** a validação, para que qualquer `?systemId=` que o cliente mandar seja descartado. Aplicado em create (todo o batch sob o tenant), list, get-by-id, validate e batch-get.

**Caveat de segurança (documentado no controller)**: o header garante presença/validade do UUID, mas **não autoriza pertencimento** ao sistema — é client-controlled. A autorização multidimensional é do módulo Permissões (RF-INT-06); esta camada só aplica o escopo de leitura/escrita.

## Máquina de estados do ciclo de vida

`LifecycleTransitions.assertValidTransition(from, to)` consulta um mapa fixo `VALID_TRANSITIONS` (cadeia linear bidirecional STOCK↔TESTING↔IN_FIELD↔OPERATIONAL — ver tabela em [[00 - Cameras]]). Transição inválida → `BusinessRuleViolationException` com `errorCode: INVALID_STATE_TRANSITION` + `translationKey` para o frontend. `ChangeCameraStateHandler` valida contra o estado atual (404 se câmera não existe) e incrementa o counter `cameras_state_transitions_total{from,to}`.

O helper também expõe `assertNotInStock(state)` (guard para operações que exigem câmera no campo), mas **hoje não tem callers** em produção — a prevenção de comandos fora de "Operativa" (RNF-CAM-10) é aplicada no frontend, não no backend.

## Soft-delete

`DELETE /cameras/:id` grava `deletedAt=now()` (não apaga a linha). `findById`/`findAll`/`findExistingIds`/`findSummariesByIds` filtram `deletedAt: null`. Uma câmera deletada some das listagens, dá 404 no GET/:id, mas permanece no banco para integridade referencial com histórico (eventos, substituições). Não há endpoint de hard-delete.

## Substituição com herança + auto-relação

`ReplaceCameraHandler` valida que velha ≠ nova, que ambas existem e não estão deletadas, e chama `repository.replaceCamera` (tudo em `$transaction`). A nova câmera herda:

- **Localização**: `latitude`, `longitude`, `address`, `intersection`, `trafficElementId`.
- **Presets PTZ default**: os presets `isDefault` da velha são copiados para a nova (os tours e presets default pré-existentes da nova são apagados antes, respeitando o `Restrict` das referências).
- **Cenas do Video Wall**: `VideoWallSceneCell` da velha são reapontadas para a nova (atualização automática, RF-CAM-07).
- **Tours PTZ** da velha migram para a nova.

Ao fim, a **velha** vai para `lifecycleState=STOCK` e recebe `replacedByCameraId = nova` (auto-relação `Camera.CameraReplacement`, `onDelete: SetNull`).

**Trade-off / gap**: a rastreabilidade da substituição é hoje só o ponteiro `replacedByCameraId` + `updatedAt`. **Não** há tabela de histórico dedicada, **não** se captura o operador responsável (o endpoint não injeta `@CurrentUser`), e o evento Kafka `attlas.cameras.replaced` é um TODO (aguarda client Kafka, PROJ-002). RNF-CAM-13 (histórico permanente com timestamp + operador) está portanto **parcial** — ver [[Cameras - Requisitos e SLA]].

## Validação de credenciais (probe, sem persistência)

`ValidateCredentialsHandler` → `CameraCredentialProbeService.probe` roda em paralelo por item (batch ≤50, mesmo limite do create para conter esgotamento de sockets). Cada probe abre um `OnvifDevice`, faz `servicesInit` + (`deviceInformationInit` ‖ `mediaGetProfiles`) com timeout de 10s, e devolve device info (fabricante/modelo/serial/firmware/hardwareId), perfis de vídeo e range PTZ. Erros são classificados em `CAMERA_CREDENTIALS_INVALID` / `CAMERA_UNREACHABLE` / `CAMERA_CONNECTION_FAILED`. **Nada é persistido** — alimenta o wizard de cadastro no frontend.

## safeMode

Flag booleana `Camera.safeMode` (default false), alternada por `PATCH /:id/safe-mode` (`UpdateCameraSafeModeHandler`) e exposta no detalhe. É apenas persistida/refletida — **não** há guard no backend que a use para bloquear operações; a semântica operacional é aplicada no frontend.

## Serialização e contratos

Commands/queries implementam interfaces de `@attlas/contracts` (`ICreateCameraRequest`, `IUpdateCameraRequest`, `IChangeCameraStateRequest`, …) e validam com `class-validator` referenciando `CameraValidation.<campo>` (sem magic numbers). `CameraMapper.toCameraDetail` converte `Decimal → number` (via `NumberHelper`), `Date → ISO string`, e alinha `physicalCameraKind (Int)` ↔ `cameraType (enum)`. `status` deriva de `operationalSnapshot.connectionStatus` (undefined/OFFLINE quando não há snapshot).
