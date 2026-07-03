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

# Cameras — cadastro e ciclo de vida

> Submódulo do [[ms-cameras - visão geral]] (MOD-001 `cameras-crud`). Diagrama: [[01 - MOD-001 cameras-crud.excalidraw|diagrama]].

Domínio de gestão da entidade `Camera`: cadastro técnico em lote, listagem com filtros, leitura, atualização parcial, transição do ciclo de vida (4 estados), substituição de equipamento com herança, soft-delete, catálogo de fabricantes/modelos, validação de credenciais ONVIF e consulta em lote para outros módulos. É o **único ponto de acesso à entidade `Camera`** no banco do serviço — todos os outros submódulos (saúde, PTZ, streaming, video wall) leem/escrevem via `ICamerasRepository` desta camada. Fonte de negócio: `docs/modules/cameras.md` (RF-CAM-01/02/06/07/08, RF-INT-07, RNF-CAM-01/06/07/10/13).

## Mapa de código

| Arquivo | Papel |
| --- | --- |
| `src/cameras/cameras.controller.ts` | Roteamento REST; delega tudo a `CommandBus`/`QueryBus`; injeta `System-Id` e Bearer após validação |
| `src/cameras/repositories/cameras.repository.ts` | Acesso a dados (`CamerasRepository` + token `ICamerasRepositoryToken`); `where`/`orderBy`/paginação; `replaceCamera` em `$transaction` |
| `src/cameras/repositories/cameras.repository.interface.ts` | Contrato `ICamerasRepository` |
| `src/cameras/mappers/camera.mapper.ts` | `Camera` (Prisma) → `ICameraResponse`; `toCreateInput` (projeção única create single/batch, força `lifecycleState=STOCK`) |
| `src/cameras/helpers/lifecycle-transitions.helper.ts` | Máquina de estados (`assertValidTransition`) + `assertNotInStock` (guard, sem callers) |
| `src/cameras/services/manufacturer-resolver.service.ts` | Resolve marca por UUID/nome/code; auto-registra marca não catalogada (concurrency-safe via P2002) |
| `src/cameras/services/camera-credential-probe.service.ts` | Probe ONVIF de credenciais (10s timeout); extrai device info/perfis/PTZ range; sem persistência |
| `src/cameras/pipes/uuid-array-body.pipe.ts` | Valida body que é array cru de UUIDs (`/validate`, `/batch-get`) |
| `src/cameras/exceptions/cameras-not-found-batch.exception.ts` | 404 batch com `missingIds` (UC-018) |
| `src/cameras/cameras.constants.ts` | Limites (`MAX_BATCH_SIZE=50`, CSV, correlação) |

## Endpoints REST (domínio)

Prefixo global `/api`. JWT no Kong, exceto `@Public()`. Escopo tenant via header `System-Id` (`@SystemId()` fail-closed 400).

| Método | Rota | UC | Nota |
| --- | --- | --- | --- |
| `POST` | `/cameras` | UC-001 | Criação em **batch** (`ICreateCameraRequest[]`, máx 50); tudo sob `System-Id`; `lifecycleState=STOCK` forçado |
| `GET` | `/cameras` | UC-002 | Lista paginada + filtros (q, `connectionStatus`, `lastConnection`, model, tipo, ptz/dai/virtualLoop, topologia); escopo tenant |
| `GET` | `/cameras/:id` | UC-003 | Detalhe; 404 se deletada ou de outro tenant |
| `PATCH` | `/cameras/:id` | UC-004 | Update parcial (só campos presentes); resolve marca; 404 se inexistente |
| `PATCH` | `/cameras/:id/safe-mode` | — | Liga/desliga flag `safeMode`; 200 devolve o detalhe |
| `PATCH` | `/cameras/:id/state` | UC-005 | Transição de ciclo de vida validada por `LifecycleTransitions`; 409 se inválida |
| `POST` | `/cameras/:id/replace` | UC-012 | Substituição com herança; câmera velha → STOCK + `replacedByCameraId` |
| `DELETE` | `/cameras/:id` | UC-006 | Soft-delete (`deletedAt=now()`); 204 |
| `POST` | `/cameras/validate-credentials` | UC-013 | Probe ONVIF (batch ≤50); **sem efeito colateral**; 200 |
| `POST` | `/cameras/validate` | UC-018 | Valida existência batch (RF-INT-07); 204 ou 404 (`CamerasNotFoundBatchException`) |
| `POST` | `/cameras/batch-get` | UC-019 | Dados de exibição batch (RF-INT-07); 200; sem efeito colateral |
| `GET` | `/cameras/bulk-template` | UC-020 | CSV de importação massiva (labels i18n, BOM UTF-8); download |
| `GET` | `/cameras/manufacturers` | UC-015 | Catálogo de marcas ativas |
| `GET` | `/cameras/manufacturers/:id/models` | UC-015 | Modelos distintos já cadastrados p/ marca (agregação de inventário, não catálogo curado) |
| `GET` | `/cameras/:id/thumbnail` | — | `@Public()`; snapshot JPEG VAPIX/Axis (digest auth); 404 sem câmera/credencial, 502 em falha |

Outros grupos do mesmo controller pertencem a domínios vizinhos: `GET /cameras/video-wall` (UC-014 → [[00 - Video Wall]]), `/:id/status` e realtime ([[Status em tempo real (push)]]), `/:id/events[/:eventId]` e `/incidents` ([[00 - Eventos, incidentes e alarmes]]), PTZ/`/presets`/`/automations` ([[00 - PTZ e presets]]), `/:id/health` ([[00 - Saúde e monitoramento]]), streaming/`/hls` ([[00 - Streaming]]).

## Handlers CQRS

**Commands** (mutação): `CreateCamerasHandler` (batch; item = `CreateCameraCommand`) · `UpdateCameraHandler` · `ChangeCameraStateHandler` · `UpdateCameraSafeModeHandler` · `ReplaceCameraHandler` · `SoftDeleteCameraHandler` · `ValidateCredentialsHandler`.

**Queries** (leitura): `ListCamerasHandler` · `GetCameraByIdHandler` · `ListManufacturersHandler` · `ListManufacturerModelsHandler` · `ValidateCamerasHandler` · `GetCamerasBatchHandler` · `DownloadBulkTemplateHandler`.

## Persistência (Prisma)

Schema multi-arquivo em `src/database/schema/`; client gerado em `database/generated/prisma`.

| Model | Arquivo | Papel |
| --- | --- | --- |
| `Camera` | `camera/camera.prisma` | Hub da entidade; auto-relação `CameraReplacement` (`replacedByCameraId`); `deletedAt` (soft-delete); `systemId` (tenant); índices em `manufacturerId`, `lifecycleState`, `trafficElementId` |
| `CameraCredential` | `camera/camera_credential.prisma` | 1:1 ONVIF/VAPIX (`username`/`password`); `onDelete: Cascade` |
| `CameraManufacturer` | `camera/camera_manufacturer.prisma` | Catálogo de marcas; `code` `@unique`; `active`; `onDelete: Restrict` em `Camera` |
| `CameraStreamProfile` | `stream/camera_stream_profile.prisma` | Perfil por papel (PRIMARY/SECONDARY/…) com codec, resolução, bitrate, fps, heartbeat/timeout, fallback — config feita na integração, não neste CRUD |

## Ciclo de vida — 4 estados (RF-CAM-02)

Transições **apenas manuais** (`PATCH /:id/state`); o sistema nunca transiciona sozinho. Máquina em `lifecycle-transitions.helper.ts`. Enum `CameraLifecycleState` em `@attlas/contracts`.

| Estado (código) | Domínio | Transições permitidas | Warning obrigatório |
| --- | --- | --- | --- |
| `STOCK` | Em estoque | → `TESTING` | Não |
| `TESTING` | Em testes | → `IN_FIELD`, `STOCK` | Sim (fora de Operativa, RNF-CAM-10) |
| `IN_FIELD` | Em campo — sem configurar | → `OPERATIONAL`, `TESTING` | Sim (fora de Operativa, RNF-CAM-10) |
| `OPERATIONAL` | Operativa | → `IN_FIELD` | Não |

Toda câmera nasce em `STOCK` (forçado no `CameraMapper.toCreateInput`, ignora qualquer estado enviado). Transição fora da tabela → `BusinessRuleViolationException` (`errorCode: BUSINESS_RULE_VIOLATION`, 409). O **warning** de RNF-CAM-10 é responsabilidade do frontend (o backend define o estado; ver [[Cameras - Requisitos e SLA]]).

## Notas do domínio

- [[Cameras - Arquitetura e estratégias]] — como está construído e por quê (CQRS, repository, batch, multi-tenant, máquina de estados, herança).
- [[Cameras - Fluxos]] — fluxos de use case (backend) e user flow (frontend `cameras`).
- [[Cameras - Requisitos e SLA]] — cobertura RF/RNF e estado de implementação.
