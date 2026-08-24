---
tags:
  - doc
  - ms-cameras
  - cameras
  - crud
aliases:
  - "Cameras"
  - "00 - Cameras"
atualizado: 2026-08-24
servico: ms-cameras
fonte: apps/ms-cameras/src/cameras
---

# Cameras - cadastro e ciclo de vida

> Submódulo do [[ms-cameras]] (MOD-001 `cameras-crud`). Diagrama: [[01 - MOD-001 cameras-crud.excalidraw|diagrama]].

Domínio de gestão da entidade `Camera`: cadastro técnico em lote, listagem com filtros, leitura, atualização parcial, transição do ciclo de vida (4 estados), substituição de equipamento com herança, soft-delete, catálogo de fabricantes/modelos, validação de credenciais ONVIF e consulta em lote para outros módulos. É o **único ponto de acesso à entidade `Camera`** no banco do serviço - todos os outros submódulos (saúde, PTZ, streaming, VMS) leem/escrevem via `ICamerasRepository` desta camada. Fonte de negócio: `docs/modules/cameras.md` (RF-CAM-01/02/06/07/08, RF-INT-07, RNF-CAM-01/06/07/10/13).

## Mapa de código

| Arquivo | Papel |
| --- | --- |
| `src/cameras/cameras.controller.ts` | Roteamento REST; delega tudo a `CommandBus`/`QueryBus`; injeta `System-Id` e Bearer após validação |
| `src/cameras/repositories/cameras.repository.ts` | Acesso a dados (`CamerasRepository` + token `ICamerasRepositoryToken`); `where`/`orderBy`/paginação (à mão, sem o toolkit `list-query`); `createMany` mistura `create`/reativação na mesma `$transaction`; `replaceCamera` em `$transaction` |
| `src/cameras/repositories/cameras.repository.interface.ts` | Contrato `ICamerasRepository` |
| `src/cameras/mappers/camera.mapper.ts` | `Camera` (Prisma) → `ICameraResponse`; `toCreateInput` (projeção única create single/batch, força `lifecycleState=STOCK`); `toReactivateInput` (mesma projeção para reviver um soft-deleted) |
| `src/cameras/helpers/lifecycle-transitions.helper.ts` | Máquina de estados (`assertValidTransition`) + `assertNotInStock` (guard, sem callers) |
| `src/cameras/services/manufacturer-resolver.service.ts` | Resolve marca por UUID/nome/code; auto-registra marca não catalogada (concurrency-safe via P2002) |
| `src/cameras/services/camera-credential-probe.service.ts` | Probe ONVIF de credenciais (10s timeout); extrai device info/perfis/PTZ range; sem persistência |
| `src/cameras/services/camera-provisioning.service.ts` | Persiste credencial + `CameraStreamProfile` a partir do probe, chamado pelo próprio `POST /cameras` (SOFTWARE-2226) |
| `src/shared/tenancy/camera-tenancy.service.ts` | `CameraTenancyService.assertCameraInSystem` - checkpoint único de escopo `systemId` (MOD-011), reusado por mutações/PTZ/presets/automations |
| `src/cameras/pipes/uuid-array-body.pipe.ts` | Valida body que é array cru de UUIDs (`/validate`, `/batch-get`) |
| `src/cameras/exceptions/cameras-not-found-batch.exception.ts` | 404 batch com `missingIds` (UC-018) |
| `src/cameras/cameras.constants.ts` | Limites (`MAX_BATCH_SIZE=50`, CSV, correlação) |

## Endpoints REST (domínio)

Prefixo global `/api`. JWT no Kong, exceto `@Public()`. Escopo tenant via header `System-Id` (`@SystemId()` fail-closed 400) e/ou `CameraTenancyService.assertCameraInSystem` - ver [[Cameras - Arquitetura e estratégias#Multi-tenant por systemId|seção multi-tenant]].

| Método | Rota | UC | Nota |
| --- | --- | --- | --- |
| `POST` | `/cameras` | UC-001 | Criação em **batch** (`ICreateCameraRequest[]`, máx 50); tudo sob `System-Id`; `lifecycleState=STOCK` forçado; valida IP duplicado e reativa soft-deleted (BR-CRUD-009); provisiona ONVIF/ISAPI no mesmo request (SOFTWARE-2226) |
| `GET` | `/cameras` | UC-002 | Lista paginada + filtros (q, `connectionStatus`, `lastConnection`, model, tipo, ptz/dai/virtualLoop, topologia, uptime); escopo tenant |
| `GET` | `/cameras/:id` | UC-003 | Detalhe; 404 se deletada ou de outro tenant |
| `PATCH` | `/cameras/:id` | UC-004 | Update parcial (só campos presentes); resolve marca; valida IP duplicado (BR-CRUD-009); 404 se inexistente/outro tenant |
| `PATCH` | `/cameras/:id/safe-mode` | - | Liga/desliga flag `safeMode`; 200 devolve o detalhe |
| `PATCH` | `/cameras/:id/state` | UC-005 | Transição de ciclo de vida validada por `LifecycleTransitions`; 409 se inválida |
| `POST` | `/cameras/:id/replace` | UC-012 | Substituição com herança; câmera velha → STOCK + `replacedByCameraId` |
| `DELETE` | `/cameras/:id` | UC-006 | Soft-delete (`deletedAt=now()`); 204 |
| `GET` | `/cameras/:id/media-profiles` | UC-031 | Inventário de perfis ONVIF/ISAPI descoberto no device (device-truth, **não** é a config de streaming/`CameraStreamProfile`); escopo tenant via `@SystemId()` no handler; 404 cross-tenant |
| `PUT` | `/cameras/locations` | - | Atualização de localização em lote (`latitude`/`longitude`/`azimuth`); escopo tenant aplicado na própria escrita (`updateMany` por item), não num lookup prévio |
| `POST` | `/cameras/validate-credentials` | UC-013 | Probe ONVIF (batch ≤50); **sem efeito colateral**; 200 |
| `POST` | `/cameras/validate` | UC-018 | Valida existência batch (RF-INT-07); 204 ou 404 (`CamerasNotFoundBatchException`) |
| `POST` | `/cameras/batch-get` | UC-019 | Dados de exibição batch (RF-INT-07); 200; sem efeito colateral |
| `GET` | `/cameras/bulk-template` | UC-020 | CSV de importação massiva (labels i18n, BOM UTF-8); download |
| `GET` | `/cameras/manufacturers` | UC-015 | Catálogo de marcas ativas |
| `GET` | `/cameras/manufacturers/:id/models` | UC-015 | Modelos distintos já cadastrados p/ marca (agregação de inventário, não catálogo curado) |
| `GET` | `/cameras/:id/thumbnail` | - | `@Public()`; snapshot JPEG VAPIX/Axis (digest auth); 404 sem câmera/credencial, 502 em falha |

Outros grupos do mesmo controller pertencem a domínios vizinhos: `GET /cameras/vms` (UC-014 → [[VMS]], path renomeado - `/cameras/video-wall` foi removido em `c9766ab960`, 18/08, confirmado em 24/08), `/:id/status` e realtime ([[Status em tempo real]]), `/:id/events[/:eventId]` e `/incidents` ([[Eventos, incidentes e alarmes]]), PTZ/`/presets`/`/automations` ([[PTZ e presets]]), `/:id/health` ([[Saúde e monitoramento]]), streaming/`/hls` ([[Streaming]]).

## Handlers CQRS

**Commands** (mutação): `CreateCamerasHandler` (batch; item = `CreateCameraCommand`) · `UpdateCameraHandler` · `ChangeCameraStateHandler` · `UpdateCameraSafeModeHandler` · `ReplaceCameraHandler` · `SoftDeleteCameraHandler` · `ValidateCredentialsHandler` · `BatchUpdateCameraLocationsHandler`.

**Queries** (leitura): `ListCamerasHandler` · `GetCameraByIdHandler` · `GetCameraMediaProfilesHandler` · `ListManufacturersHandler` · `ListManufacturerModelsHandler` · `ValidateCamerasHandler` · `GetCamerasBatchHandler` · `DownloadBulkTemplateHandler`.

## Persistência (Prisma)

Schema multi-arquivo em `src/database/schema/`; client gerado em `database/generated/prisma`.

| Model | Arquivo | Papel |
| --- | --- | --- |
| `Camera` | `camera/camera.prisma` | Hub da entidade; auto-relação `CameraReplacement` (`replacedByCameraId`); `deletedAt` (soft-delete); `systemId` (tenant); índices em `manufacturerId`, `lifecycleState`, `trafficElementId`, `(systemId, ipAddress)`; índice único parcial `Camera_active_ip_unique` (`systemId`+`ipAddress` WHERE `deletedAt IS NULL`, BR-CRUD-009) |
| `CameraCredential` | `camera/camera_credential.prisma` | 1:1 ONVIF/VAPIX (`username`/`password`); `onDelete: Cascade`; gravada pelo próprio `POST /cameras` via probe (SOFTWARE-2226) - ver correção abaixo |
| `CameraManufacturer` | `camera/camera_manufacturer.prisma` | Catálogo de marcas; `code` `@unique`; `active`; `onDelete: Restrict` em `Camera` |
| `CameraStreamProfile` | `stream/camera_stream_profile.prisma` | Perfil por papel (PRIMARY/SECONDARY/…) com codec, resolução, bitrate, fps, heartbeat/timeout, fallback; gravado pelo próprio `POST /cameras` via probe (SOFTWARE-2226) - ver correção abaixo |

> [!warning] Achado em 24/08 - a nota dizia o contrário do código
> Até esta revisão, esta nota, `Cameras - Fluxos` e `Cameras - Requisitos e SLA` afirmavam que o CRUD "não cria `CameraStreamProfile` nem `CameraCredential`" e que a config de stream "é feita na integração", separada do cadastro. Isso era verdade **antes** de SOFTWARE-2226 (27/07-02/08). Hoje `CreateCamerasHandler` chama o probe ONVIF/ISAPI e `CameraProvisioningService.provisionFromProbe` **dentro do próprio `POST /cameras`** - grava `CameraCredential` e `CameraStreamProfile` (quando o probe acha um perfil H264/H265 utilizável) e já sobe a câmera para `OPERATIONAL`, sem etapa de "ativação" separada (comentário do próprio handler: *"the create call is the SINGLE point where a camera is first hit by Attlas — no separate 'activate' step"*). Corrigido nas três notas nesta passada; ver detalhe em [[Cameras - Fluxos]].

## Ciclo de vida - 4 estados (RF-CAM-02)

Transições **apenas manuais** (`PATCH /:id/state`); o sistema nunca transiciona sozinho. Máquina em `lifecycle-transitions.helper.ts`. Enum `CameraLifecycleState` em `@attlas/contracts`.

| Estado (código) | Domínio | Transições permitidas | Warning obrigatório |
| --- | --- | --- | --- |
| `STOCK` | Em estoque | → `TESTING` | Não |
| `TESTING` | Em testes | → `IN_FIELD`, `STOCK` | Sim (fora de Operativa, RNF-CAM-10) |
| `IN_FIELD` | Em campo - sem configurar | → `OPERATIONAL`, `TESTING` | Sim (fora de Operativa, RNF-CAM-10) |
| `OPERATIONAL` | Operativa | → `IN_FIELD` | Não |

Toda câmera nasce em `STOCK` (forçado no `CameraMapper.toCreateInput`, ignora qualquer estado enviado). Transição fora da tabela → `BusinessRuleViolationException` (`errorCode: BUSINESS_RULE_VIOLATION`, 409). O **warning** de RNF-CAM-10 é responsabilidade do frontend (o backend define o estado; ver [[Cameras - Requisitos e SLA]]).

## Notas do domínio

- [[Cameras - Arquitetura e estratégias]] - como está construído e por quê (CQRS, repository, batch, multi-tenant, máquina de estados, herança, topologia de produção).
- [[Cameras - Fluxos]] - fluxos de use case (backend) e user flow (frontend `cameras`).
- [[Cameras - Requisitos e SLA]] - cobertura RF/RNF e estado de implementação.
