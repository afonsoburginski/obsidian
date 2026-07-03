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

# Cameras — Fluxos

> Parte do domínio [[00 - Cameras]] · [[ms-cameras - visão geral]]. Ver [[Cameras - Arquitetura e estratégias]] e [[Cameras - Requisitos e SLA]]. Diagrama: [[01 - MOD-001 cameras-crud.excalidraw|diagrama]].

Fluxos de use case (backend) e user flow (frontend). Sem diagrama embutido — o visual está no canvas linkado.

## Backend — criação em batch (UC-001)

`POST /cameras`, body `ICreateCameraRequest[]`.

1. `@SystemId()` valida o header `System-Id` (400 se ausente/inválido). O controller monta `CreateCamerasCommand(body, systemId)`.
2. `CreateCamerasHandler` rejeita batch > 50 → `InvalidInputException('BATCH_LIMIT_EXCEEDED')` (400).
3. Resolve as marcas **distintas** uma vez cada (`ManufacturerResolverService`), auto-registrando as não catalogadas.
4. Para cada item com `replacedByCameraId`, confirma existência (404 se não existir).
5. `CameraMapper.toCreateInput` projeta cada item, **forçando `lifecycleState=STOCK`** e conectando a marca resolvida + o `systemId`.
6. `repository.createMany` grava tudo em `$transaction` (all-or-nothing) e devolve as câmeras com `manufacturer` incluído.
7. Incrementa `cameras_created_total`; devolve `ICameraResponse[]` (201).

Observação: o CRUD **não** cria `CameraStreamProfile` nem `CameraCredential` — o cadastro grava só os metadados da `Camera`; streams e credenciais são configurados na integração ([[00 - Integração com dispositivo]] / [[00 - Streaming]]).

## Backend — transição de estado com warning (UC-005)

`PATCH /cameras/:id/state`, body `{ state }`.

| Passo | O quê |
| --- | --- |
| 1 | Controller injeta `id` no `ChangeCameraStateCommand` |
| 2 | `findById` → 404 (`ResourceNotFoundException`) se não existir |
| 3 | `LifecycleTransitions.assertValidTransition(from, to)` — transição fora do mapa → `BusinessRuleViolationException` (`INVALID_STATE_TRANSITION`, 409) |
| 4 | `repository.changeState` persiste o novo `lifecycleState` |
| 5 | Incrementa `cameras_state_transitions_total{from,to}`; log com `from`/`to`; devolve detalhe (200) |

O **warning** de confirmação para comandos em câmera fora de "Operativa" (RNF-CAM-10) acontece **no frontend, antes** de disparar o comando; o backend não emite nem exige o warning (o guard `assertNotInStock` existe mas não está acoplado). Ver [[Cameras - Requisitos e SLA]].

## Backend — substituição com herança (UC-012)

`POST /cameras/:id/replace`, body `{ newCameraId }`.

1. Rejeita auto-substituição (`id === newCameraId`) → `CAMERA_SELF_REPLACE` (409).
2. Valida que velha e nova existem e não estão deletadas (404 caso contrário).
3. `repository.replaceCamera` executa em `$transaction`:
   - copia `latitude`/`longitude`/`address`/`intersection`/`trafficElementId` da velha para a nova;
   - apaga tours + presets `isDefault` da nova, depois copia os presets `isDefault` da velha;
   - migra tours da velha para a nova;
   - reaponta `VideoWallSceneCell` da velha para a nova (cenas atualizadas automaticamente);
   - marca a velha como `STOCK` + `replacedByCameraId = nova`.
4. Devolve o detalhe da **velha** (agora em estoque). Evento Kafka `attlas.cameras.replaced` é TODO (PROJ-002); operador não é capturado.

## Backend — consulta em lote para outros módulos (RF-INT-07)

Dois endpoints, ambos com dedup implícito (`[...new Set(ids)]`), escopo por `systemId` e `deletedAt: null`, sem efeito colateral. Aceitam câmeras em **qualquer** estado de ciclo de vida.

| Endpoint | UC | Fluxo | Resposta |
| --- | --- | --- | --- |
| `POST /cameras/validate` | UC-018 | `findExistingIds` → calcula `missingIds` | 204 se todas existem; 404 `CamerasNotFoundBatchException(missingIds)` se falta alguma |
| `POST /cameras/batch-get` | UC-019 | `findSummariesByIds` → `GetCamerasBatchResult` por linha | 200 com `{ cameras[] }` (id, name, model, cameraType, status, lifecycleState, latitude, longitude, ipAddress) |

Consumidor típico: `ms-traffic-model` valida câmeras vinculadas a interseções e pega dados de exibição. Body é array cru de UUIDs → validado por `UuidArrayBodyPipe` (o `ValidationPipe` global ignora body sem classe).

## Backend — validação de credenciais (UC-013)

`POST /cameras/validate-credentials`, body `{ items[] }` (cardId, ip, username, password), batch ≤50. `ValidateCredentialsHandler` roda os probes ONVIF em paralelo (`CameraCredentialProbeService`, 10s por item). Cada item volta `{ cardId, ok, device? , errorCode? }`. **Não persiste** — usado pelo passo de credenciais do wizard de cadastro.

## Frontend — feature module `cameras`

NgModule clássico (DD-007) em `apps/web-attlas/src/app/modules/cameras/`, com routing module dedicado (`cameras-routing-module.ts`). Consome exclusivamente `ms-cameras`.

Rotas (nav `devices` / `videowall` / `dashboard`):

| Rota | Componente | Papel |
| --- | --- | --- |
| `devices` | `CamerasListPageComponent` (`pages/cameras-list`) | Lista/tabela de câmeras + filtros + detalhe lateral |
| `devices/:id` | `CameraDetailPageComponent` (`pages/camera-detail`) | Detalhe: header, saúde, presets, eventos, PTZ |
| `devices/new`, `devices/:id/edit` | placeholder | Formulário (cadastro/edição) |
| `videowall` | lazy `VideowallModule` | [[00 - Video Wall]] |
| `dashboard` | placeholder | Dashboard consolidado |

Componentes-chave do domínio CRUD/ciclo de vida:

- `camera-creation-panel` — **wizard de cadastro em 4 passos**: `device` → `credentials` (dispara `validate-credentials`) → `settings` → `review`.
- `camera-edit-sheet` — edição parcial (`PATCH /cameras/:id`).
- `camera-substitution-dialog` — substituição de equipamento (`POST /cameras/:id/replace`).
- `camera-location-modal` — geoposicionamento (lat/long/address/intersection).
- `cameras-filters`, `cameras-table`, `cameras-column-visibility`, `cameras-side-detail` — listagem e filtros.

## Frontend — user flow lista → detalhe → cadastro/edição

1. **Lista** (`devices`): operador filtra/busca; cada linha abre o detalhe lateral (`cameras-side-detail`) ou navega ao detalhe completo.
2. **Detalhe** (`devices/:id`): dados técnicos, saúde, presets, eventos, PTZ; ações de estado, edição e substituição.
3. **Cadastro** (`camera-creation-panel`): wizard de 4 passos; a validação de credenciais roda no passo de credenciais antes de persistir.
4. **Edição / substituição / localização**: via sheet e dialogs, cada um mapeado ao endpoint correspondente.

**≤2 cliques (RNF-CAM-07)**: a exigência de alcançar stream, PTZ e preset em até 2 cliques parte do **mapa operacional** (Painel de Operações), não da navegação interna deste feature module — é requisito de frontend fora desta camada. Ver [[Cameras - Requisitos e SLA]].
