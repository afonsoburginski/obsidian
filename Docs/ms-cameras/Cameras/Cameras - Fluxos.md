---
tags:
  - doc
  - ms-cameras
  - cameras
  - crud
atualizado: 2026-08-24
servico: ms-cameras
fonte: apps/ms-cameras/src/cameras
---

# Cameras - Fluxos

> Parte do domínio [[Cameras]] · [[ms-cameras]]. Ver [[Cameras - Arquitetura e estratégias]] e [[Cameras - Requisitos e SLA]]. Diagrama: [[01 - MOD-001 cameras-crud.excalidraw|diagrama]].
>
> [!info] Nota de 24/08: fluxo de criação e a observação sobre stream/credencial corrigidos
> O fluxo de `POST /cameras` abaixo ganhou os passos de validação de IP duplicado/reativação
> (BR-CRUD-009, PR #1137) e de provisionamento inline (SOFTWARE-2226). A observação antiga, no fim da
> seção, dizia que o cadastro "não cria `CameraStreamProfile` nem `CameraCredential`" - isso deixou de
> ser verdade quando SOFTWARE-2226 uniu probe+provisionamento ao próprio `POST /cameras`; corrigida.

Fluxos de use case (backend) e user flow (frontend). Sem diagrama embutido - o visual está no canvas linkado.

## Backend - criação em batch (UC-001)

`POST /cameras`, body `ICreateCameraRequest[]`.

1. `@SystemId()` valida o header `System-Id` (400 se ausente/inválido). O controller monta `CreateCamerasCommand(body, systemId)`.
2. `CreateCamerasHandler` rejeita batch > 50 → `InvalidInputException('BATCH_LIMIT_EXCEEDED')` (400).
3. Resolve as marcas **distintas** uma vez cada (`ManufacturerResolverService`), auto-registrando as não catalogadas.
4. Para cada item com `replacedByCameraId`, confirma existência (404 se não existir).
5. **BR-CRUD-009**: rejeita `ipAddress` repetido dentro do próprio batch e `ipAddress` já usado por câmera ativa de outro registro (`CAMERA_DUPLICATE_IP`, 422/409 conforme o filtro global). Se o IP bate com uma câmera **soft-deleted** (nenhuma ativa), marca esse item para **reativação** em vez de criação nova.
6. `CameraMapper.toCreateInput` (itens novos) / `toReactivateInput` (itens reativados) projeta cada item, **forçando `lifecycleState=STOCK`** e conectando a marca resolvida + o `systemId`.
7. `repository.createMany` grava tudo em `$transaction` (all-or-nothing): `create` para os itens novos, `update` para os reativados - e, para reativação, apaga primeiro `cameraOperationalSnapshot`/`cameraPtzPreset`/`cameraPtzTour` do id revivido (filhos da encarnação anterior, ver [[Cameras - Arquitetura e estratégias]]). Devolve as câmeras com `manufacturer` incluído.
8. **Provisionamento inline (SOFTWARE-2226)**: para cada câmera criada, roda o probe ONVIF/ISAPI (`CameraCredentialProbeService`) e `CameraProvisioningService.provisionFromProbe`, que grava `CameraCredential` e (quando o probe acha ≥1 perfil H264/H265) `CameraStreamProfile`, e sobe a câmera pra `OPERATIONAL`. Sem perfil utilizável ou com probe falho, a câmera fica em `STOCK`/`IN_FIELD` e a resposta carrega um warning por câmera (`CAMERA_PROBE_FAILED`, `CAMERA_NO_STREAMABLE_PROFILE`).
9. Descoberta de perfis de mídia (UC-031) é disparada em background (não bloqueia a resposta).
10. Incrementa `cameras_created_total`; devolve `ICameraResponse[]` (201) - já refletindo o estado pós-provisionamento (re-lido do banco).

Observação (corrigida em 24/08): o cadastro **cria** `CameraCredential` e `CameraStreamProfile` no mesmo request desde SOFTWARE-2226 (passo 8) - não é mais uma etapa separada de integração. O que continua fora deste CRUD é a **configuração manual** de um stream (trocar codec/resolução/bitrate depois de provisionado), que é assunto de [[Integração com dispositivo]] / [[Streaming]].

## Backend - atualização parcial com validação de IP (UC-004)

`PATCH /cameras/:id`, body com campos opcionais.

1. `findById` → 404 (`ResourceNotFoundException`) se não existir.
2. **BR-CRUD-009**: se `ipAddress` está no delta e é diferente do atual, `findActiveByIpAddress` rejeita se outra câmera ativa do mesmo tenant já usa o IP (`CAMERA_DUPLICATE_IP`) - mesma checagem e mesmo `errorCode` do create.
3. Resolve marca (se `manufacturerId` estiver no delta).
4. Monta o patch só com os campos presentes (`Object.fromEntries` filtra `undefined`) e escreve via `repository.update`; o índice único parcial (`Camera_active_ip_unique`) fecha a corrida entre o passo 2 e a escrita, traduzindo P2002 para o mesmo `CAMERA_DUPLICATE_IP`.
5. Invalida o dashboard do sistema (`DashboardInvalidateDomain.INVENTORY`) e devolve o detalhe atualizado.

## Backend - transição de estado com warning (UC-005)

`PATCH /cameras/:id/state`, body `{ state }`.

| Passo | O quê |
| --- | --- |
| 1 | Controller injeta `id` no `ChangeCameraStateCommand` |
| 2 | `findById` → 404 (`ResourceNotFoundException`) se não existir |
| 3 | `LifecycleTransitions.assertValidTransition(from, to)` - transição fora do mapa → `BusinessRuleViolationException` (`INVALID_STATE_TRANSITION`, 409) |
| 4 | `repository.changeState` persiste o novo `lifecycleState` |
| 5 | Incrementa `cameras_state_transitions_total{from,to}`; log com `from`/`to`; devolve detalhe (200) |

O **warning** de confirmação para comandos em câmera fora de "Operativa" (RNF-CAM-10) acontece **no frontend, antes** de disparar o comando; o backend não emite nem exige o warning (o guard `assertNotInStock` existe mas não está acoplado). Ver [[Cameras - Requisitos e SLA]].

## Backend - substituição com herança (UC-012)

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

## Backend - perfis de mídia (UC-031)

`GET /cameras/:id/media-profiles`, query paginada (`page`/`pageSize`/`query`/`sortBy`/`sortOrder`).

1. `@SystemId()` valida o header; `GetCameraMediaProfilesQuery` recebe `id` + `systemId` direto (não passa por `CameraTenancyService`).
2. `GetCameraMediaProfilesHandler` lê o inventário **já persistido** em `CameraMediaProfile` (nunca faz probe ao vivo na própria request) - câmera de outro tenant ou sem inventário descoberto vira 404, nunca vazando existência.
3. Devolve `IListMediaProfilesResponse` (= `IPaginatedResponse<IGetMediaProfileResponse>`), contrato já existente que o front consome, sem contrato novo.

A descoberta que popula esse inventário roda em dois gatilhos, fora desta request: no cadastro (passo 9 do UC-001, background) e periodicamente (`CameraMediaProfileDiscoveryWorker`).

## Backend - consulta em lote para outros módulos (RF-INT-07)

Dois endpoints, ambos com dedup implícito (`[...new Set(ids)]`), escopo por `systemId` e `deletedAt: null`, sem efeito colateral. Aceitam câmeras em **qualquer** estado de ciclo de vida.

| Endpoint | UC | Fluxo | Resposta |
| --- | --- | --- | --- |
| `POST /cameras/validate` | UC-018 | `findExistingIds` → calcula `missingIds` | 204 se todas existem; 404 `CamerasNotFoundBatchException(missingIds)` se falta alguma |
| `POST /cameras/batch-get` | UC-019 | `findSummariesByIds` → `GetCamerasBatchResult` por linha | 200 com `{ cameras[] }` (id, name, model, cameraType, status, lifecycleState, latitude, longitude, ipAddress) |

Consumidor típico: `ms-traffic-model` valida câmeras vinculadas a interseções e pega dados de exibição. Body é array cru de UUIDs → validado por `UuidArrayBodyPipe` (o `ValidationPipe` global ignora body sem classe).

## Backend - validação de credenciais (UC-013)

`POST /cameras/validate-credentials`, body `{ items[] }` (cardId, ip, username, password), batch ≤50. `ValidateCredentialsHandler` roda os probes ONVIF em paralelo (`CameraCredentialProbeService`, 10s por item). Cada item volta `{ cardId, ok, device? , errorCode? }`. **Não persiste** - usado pelo passo de credenciais do wizard de cadastro (o probe equivalente roda de novo, com persistência, dentro do `POST /cameras` real - ver UC-001 passo 8).

## Frontend - feature module `cameras`

NgModule clássico (DD-007) em `apps/web-attlas/src/app/modules/cameras/`, com routing module dedicado (`cameras-routing-module.ts`). Consome exclusivamente `ms-cameras`.

Rotas (nav `devices` / `videowall` / `dashboard`):

| Rota | Componente | Papel |
| --- | --- | --- |
| `devices` | `CamerasListPageComponent` (`pages/cameras-list`) | Lista/tabela de câmeras + filtros + detalhe lateral |
| `devices/:id` | `CameraDetailPageComponent` (`pages/camera-detail`) | Detalhe: header, saúde, presets, eventos, PTZ |
| `devices/new`, `devices/:id/edit` | placeholder | Formulário (cadastro/edição) |
| `videowall` (rota vira `vms`) | lazy `VideowallModule` | [[VMS]] |
| `dashboard` | placeholder | Dashboard consolidado |

Componentes-chave do domínio CRUD/ciclo de vida:

- `camera-creation-panel` - **wizard de cadastro em 4 passos**: `device` → `credentials` (dispara `validate-credentials`) → `settings` → `review`.
- `camera-edit-sheet` - edição parcial (`PATCH /cameras/:id`).
- `camera-substitution-dialog` - substituição de equipamento (`POST /cameras/:id/replace`).
- `camera-location-modal` - geoposicionamento (lat/long/address/intersection).
- `cameras-filters`, `cameras-table`, `cameras-column-visibility`, `cameras-side-detail` - listagem e filtros.

## Frontend - user flow lista → detalhe → cadastro/edição

1. **Lista** (`devices`): operador filtra/busca; cada linha abre o detalhe lateral (`cameras-side-detail`) ou navega ao detalhe completo.
2. **Detalhe** (`devices/:id`): dados técnicos, saúde, presets, eventos, PTZ; ações de estado, edição e substituição.
3. **Cadastro** (`camera-creation-panel`): wizard de 4 passos; a validação de credenciais roda no passo de credenciais antes de persistir.
4. **Edição / substituição / localização**: via sheet e dialogs, cada um mapeado ao endpoint correspondente.

**≤2 cliques (RNF-CAM-07)**: a exigência de alcançar stream, PTZ e preset em até 2 cliques parte do **mapa operacional** (Painel de Operações), não da navegação interna deste feature module - é requisito de frontend fora desta camada. Ver [[Cameras - Requisitos e SLA]].
