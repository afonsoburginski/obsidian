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

# Cameras - Arquitetura e estratégias

> Parte do domínio [[Cameras]] · [[ms-cameras]]. Ver também [[Cameras - Fluxos]] e [[Cameras - Requisitos e SLA]]. Diagrama: [[01 - MOD-001 cameras-crud.excalidraw|diagrama]].
>
> [!info] Nota de 24/08: Lote 6 (Cameras) completo
> Primeira passada do dia cobriu só "Topologia de produção" (preservada abaixo). Esta segunda passada
> fechou o resto do checklist do [[Plano - atualização da documentação do vault]]: seção multi-tenant
> reescrita contra `MOD-011-tenant-scoping.md` (estava incompleta), seção nova de validação de IP
> duplicado/reativação (PR #1137), seção nova de perfis de mídia (UC-031, card 2008), e confirmação de
> que a listagem ainda monta `where`/`orderBy` à mão (não migrou pro toolkit `list-query`). Um achado à
> parte, fora do checklist mas encontrado ao ler o código: esta nota, `Cameras - Fluxos` e
> `Cameras - Requisitos e SLA` diziam que o cadastro "não cria `CameraStreamProfile` nem
> `CameraCredential`" - isso deixou de ser verdade em SOFTWARE-2226 (finais de julho) e foi corrigido
> nas três notas.

Como o CRUD e o ciclo de vida da câmera estão construídos, e as decisões por trás.

## Camadas: controller → handler → repository

CQRS via `@nestjs/cqrs`. O `CamerasController` não tem lógica de negócio: valida entrada (class-validator nas classes de command/query), injeta contexto de request (`System-Id`, Bearer) e despacha para `CommandBus`/`QueryBus`. Cada operação é um handler dedicado (`src/cameras/handlers/<op>/`), com command/query e handler em arquivos separados (regra [CQRS] do `backend-standards.md`).

- **Commands** mutam estado (create, update, state, safe-mode, replace, soft-delete, validate-credentials, batch-update-locations).
- **Queries** leem (list, get-by-id, media-profiles, manufacturers, models, validate, batch-get, bulk-template).
- Handler → `ICamerasRepository` (nunca fala Prisma direto) → `PrismaService` (adapter-pg / PostgreSQL).
- Resposta serializada com `plainToInstance(<Response>, result)` no controller; o shape wire (`ICameraResponse`, etc.) vem de `@attlas/contracts` - sem DTO de resposta local (evita duplicação, regra [HC]).

**Por quê**: uma responsabilidade por classe, testabilidade unitária por handler, e o repositório como única fronteira de dados - qualquer submódulo que precise de `Camera` reusa `ICamerasRepository` em vez de reabrir consultas.

## Repository com token de injeção + Prisma

`CamerasRepository implements ICamerasRepository`, exposto por `ICamerasRepositoryToken = Symbol('ICamerasRepository')` e injetado com `@Inject(...)`. Interface e implementação em arquivos próprios. O `where`/`orderBy`/paginação da listagem são montados em métodos privados (`buildWhere`, `buildOrderBy`, `buildConnectionStatusWhere`, `buildPtzWhere`, `buildJsonCapabilityWhere`, `buildLastConnectionWhere`) - filtros multivalor, busca ILIKE (`name`/`serialNumber`/`ipAddress`/`model`), filtros JSON de `analyticsCapabilities` (`ptz`/`dai`/`virtualLoop`), filtro por topologia (`trafficElementId IN`) e filtro de uptime (UC-029, resolvido via rollups + `id IN (...)`, não dá pra virar `where` simples).

**Trade-off, confirmado em 24/08 (ainda válido)**: o `where` continua escrito à mão (não usa o toolkit `list-query` CROSS-027) porque combina derivações não triviais - status via relação 1:1 `operationalSnapshot`, JSON path, uptime agregado sobre rollups/janelas, e OR de status OFFLINE que também casa snapshot ausente. Nenhum PR desde 03/07 migrou isso para o toolkit.

## Criação em batch atômica

`POST /cameras` recebe e devolve **array** (`ParseArrayPipe` com item `CreateCameraCommand`). `CreateCamerasHandler`:

1. Rejeita batch > `MAX_BATCH_SIZE` (50) → `InvalidInputException('BATCH_LIMIT_EXCEEDED')` (400).
2. Resolve cada marca **distinta uma única vez**, sequencialmente (evita corrida ao auto-registrar a mesma marca duas vezes no mesmo batch).
3. Valida `replacedByCameraId` de cada item (404 se não existir).
4. Valida `ipAddress` (BR-CRUD-009, ver seção própria abaixo) e resolve reativação de soft-deleted quando aplicável.
5. `repository.createMany` executa todos os `create`/reativações dentro de um `$transaction` → all-or-nothing.
6. Probe ONVIF/ISAPI + `CameraProvisioningService.provisionFromProbe` **no mesmo request** (ver seção "Provisionamento no cadastro" abaixo) - sobe a câmera pra `OPERATIONAL` quando o device responde.
7. Descoberta de perfis de mídia (UC-031) é disparada em background, sem bloquear a resposta.

Projeção `Command → CameraCreateInput` centralizada em `CameraMapper.toCreateInput` (fonte única para create single e batch), que **força `lifecycleState=STOCK`** (BR-CRUD-001).

## Validação de IP único e reativação de soft-deleted (BR-CRUD-009, PR #1137 / SOFTWARE-2317)

Até 28/07 não havia checagem de unicidade de `ipAddress` - nem no schema, nem na aplicação - no create nem no update; a UI de cadastro já tinha a tratativa de erro pronta pra um `CAMERA_DUPLICATE_IP` que o backend nunca emitia. Fechado em três camadas:

1. **Dentro do batch** (`CreateCamerasHandler.assertNoDuplicateIpWithinBatch`): dois itens do mesmo `POST /cameras` não podem repetir `ipAddress`.
2. **Contra o já ativo** (`CamerasRepository.findActiveByIpAddress`): rejeita se outra câmera ativa do mesmo tenant (`deletedAt: null`) já usa o IP - aplicado no create e no `UpdateCameraHandler` (só quando `ipAddress` está de fato no delta do PATCH).
3. **Índice único parcial no banco** (`Camera_active_ip_unique`, migration `20260729114417_camera_active_ip_unique`): `UNIQUE (systemId, ipAddress) WHERE deletedAt IS NULL`, criado `CONCURRENTLY`. A checagem de aplicação lê fora da transação de escrita (READ COMMITTED), então dois submits concorrentes (duplo-clique, retry, import paralelo) podiam ambos passar a checagem e inserir; o índice fecha essa janela. O P2002 do índice é traduzido para o mesmo `CAMERA_DUPLICATE_IP` (`errorCode` novo, aditivo em `@attlas/core-common`) que a checagem de aplicação usa - create e update respondem com o mesmo shape.

**Reativação em vez de linha nova**: se o `ipAddress` bate com uma câmera **soft-deleted** e nenhuma ativa usa o mesmo IP, o create reativa esse registro (`CamerasRepository.findMostRecentlyDeletedByIpAddress` escolhe a mais recente) em vez de inserir uma linha nova - preserva histórico (eventos, incidentes) sob o mesmo id. `CameraMapper.toReactivateInput` reescreve os campos técnicos do cadastro, força `lifecycleState=STOCK` e `deletedAt=null`; `CamerasRepository.createMany` mistura, na mesma `$transaction`, os `create` dos itens novos com o `update` dos reativados.

**Limpeza dos filhos da encarnação anterior** (achado A2 do review da PR, fix não-bloqueante no mesmo card): sem isso, a câmera revivida herdava filhos que pertenciam ao device que estava naquele IP antes, não ao que está sendo cadastrado agora:

- `CamerasRepository.createMany` apaga `cameraOperationalSnapshot`, `cameraPtzPreset` e `cameraPtzTour` do id reativado antes do `update` - sem isso o snapshot velho faria a câmera aparecer online sem heartbeat novo, e os presets/tours seriam do device antigo.
- `CameraProvisioningService.provisionFromProbe` apaga os `CameraStreamProfile` antes de recriar - mas **só quando o probe devolve profile novo pra pôr no lugar** (`streamProfiles.length > 0`); sem essa guarda, um re-probe que falha apagaria a config de uma câmera que já funciona (tem teste fixando isso). `CameraStreamProfile` não tem `@@unique(cameraId, role)`, então sem o wipe os profiles duplicariam (PRIMARY/SECONDARY/TERTIARY repetidos, todos `isActive: true`).

Pendência registrada no commit original (`cfc905f3ee`): a validação de aplicação foi entregue sem o ciclo shadow-db validado localmente (infra parada no momento); o commit seguinte (`9330ed47da`) já trouxe o índice parcial + `DBM-DRIFT.md` atualizado, então a lacuna foi fechada dentro da mesma PR.

## Provisionamento no cadastro (SOFTWARE-2226) - correção de achado

`CreateCamerasHandler.probeAndProvision` roda o probe ONVIF/ISAPI (`CameraCredentialProbeService`) e `CameraProvisioningService.provisionFromProbe` **dentro do próprio `POST /cameras`**, uma câmera por vez em paralelo. É o único ponto onde a plataforma toca o device por primeira vez - não existe etapa separada de "ativação" (comentário do próprio handler: *"the create call is the SINGLE point where a camera is first hit by Attlas — no separate 'activate' step"*). `provisionFromProbe` persiste, na mesma transação: upsert de `CameraCredential`, `deleteMany` + `create` de `CameraStreamProfile` (quando o probe encontra ≥1 perfil H264/H265 utilizável) e o update da `Camera` para `lifecycleState=OPERATIONAL`. Sem perfil utilizável, ou com probe falho, a câmera fica em `STOCK`/`IN_FIELD` e a resposta do create carrega um warning por câmera com o `errorCode` classificado (`CAMERA_PROBE_FAILED`, `CAMERA_NO_STREAMABLE_PROFILE`, etc.) - soft-fail por design (BR-CRUD-001): a câmera e a credencial sempre são persistidas para o operador poder repetir.

Achado corrigido nesta revisão: esta nota, `Cameras - Fluxos` e `Cameras - Requisitos e SLA` diziam até 24/08 que "o CRUD não cria `CameraStreamProfile` nem `CameraCredential` - streams e credenciais são configurados na integração". Isso descrevia o serviço antes de SOFTWARE-2226; hoje o cadastro cria os dois inline, como parte do mesmo request.

## Resolução de marca (auto-registro)

`ManufacturerResolverService.resolve(value)` aceita UUID, nome ou code e devolve o id de `CameraManufacturer`, **auto-registrando** marca não catalogada (ex.: vendor code que o ONVIF reporta, "AXIS"). É concurrency-safe: `code` é `@unique`, então duas requisições que ambas erram o find e tentam criar caem P2002; o perdedor re-resolve pelo code derivado e devolve o vencedor (sem 500, sem marca duplicada). O `code` é derivado do nome (primeiro token, alfanumérico, upper, ≤32 chars). Decisão SOFTWARE-1195: cadastro de câmera **nunca** dá 404 por marca desconhecida.

## Multi-tenant por `systemId` (header `System-Id`)

O escopo de tenant vem **sempre** do header `System-Id`, nunca do body/query. `@SystemId()` é fail-closed (400 se ausente/UUID inválido). O controller sobrescreve `query.systemId`/`query.bearer` **após** a validação, para que qualquer `?systemId=` que o cliente mandar seja descartado.

> [!success] Confirmado e reescrito em 24/08 contra `MOD-011-tenant-scoping.md`
> A versão anterior desta nota dizia o escopo "aplicado em create (todo o batch sob o tenant), list,
> get-by-id, validate e batch-get" - isso era o estado de **SOFTWARE-1920** (PR #574, busca por
> topologia), não o estado atual. O card **SOFTWARE-2007** (`MOD-011-tenant-scoping`, spec em
> `apps/ms-cameras/docs/modules/MOD-011-tenant-scoping.md`) auditou **todas** as rotas do controller e
> fechou o resto em 3 fases (leituras por câmera, mutações, PTZ/presets/automations). Hoje o inventário
> da MOD-011 marca **toda** rota tenant-relevante de `CamerasController` como `OK`, por dois caminhos:
>
> - **Filtro direto no `where`/`findFirst`**: `POST /cameras` (cria sob o tenant), `GET /cameras`
>   (lista), `GET /cameras/vms`, `GET /cameras/:id`, `POST /cameras/validate`, `POST
>   /cameras/batch-get`, `PUT /cameras/locations` (escopo na própria escrita, não num lookup prévio -
>   evita a janela onde um id deletado no meio do caminho ainda seria escrito), `GET
>   /cameras/incidents[/:id]`.
> - **`CameraTenancyService.assertCameraInSystem(cameraId, systemId)`** (`src/shared/tenancy/`,
>   `CameraTenancyModule` sobre o `PrismaModule`) - checkpoint único reusado na borda HTTP antes de
>   qualquer mutação/comando por câmera: `PATCH /:id`, `PATCH /:id/state`, `DELETE /:id`, `POST
>   /:id/replace`, as 4 rotas de PTZ (`/ptz`, `/ptz/absolute`, `/ptz/continuous`, `/ptz/stop`), todas as
>   rotas de `/:id/presets*` e `/:id/automations*`. Lança `ResourceNotFoundException('Camera', id)`
>   (404) quando a câmera não existe, está soft-deletada ou é de outro sistema - indistinguível de
>   inexistente, sem vazar existência. `/:id/status` também assera no controller (a query em si segue
>   sem escopo porque o gateway realtime a despacha sem `System-Id`); `/:id/events[/:eventId]` assera
>   **no handler**, não no controller, porque a query já fazia essa checagem própria.
> - `GET /:id/media-profiles` (UC-031, card 2008) escopa via `@SystemId()` direto no handler da query -
>   entrou na develop **depois** da auditoria inicial da MOD-011, mas já nasceu escopado (comentário no
>   controller confirma).
>
> A MOD-011 também documenta, de propósito, que o VMS (`/vms/**`) escopa por `organizationId` (claim do
> JWT), não por `systemId` - são dois eixos de tenancy intencionalmente distintos (câmera é por sistema,
> cena/layout de VMS é por organização); reconciliar os dois fica fora do escopo deste módulo. Ver
> `MOD-011-tenant-scoping.md` seção 2 para o detalhe (fora do domínio Cameras, não expandido aqui).

**Caveat de segurança (documentado no controller e na MOD-011, ainda vale)**: o header garante presença/validade do UUID, mas **não autoriza pertencimento** ao sistema - é client-controlled. A autorização multidimensional é do módulo Permissões (RF-INT-06); esta camada só aplica o escopo de leitura/escrita.

### Topologia de produção: a mesma câmera física, uma linha `Camera` por tenant

> [!success] Confirmado no código em 24/08
> Em produção (EC2), a mesma câmera física é cadastrada **uma vez por tenant** - hoje **6
> sistemas-tenant**. O comentário no código é literal:
> `apps/ms-cameras/src/health/utils/device-stream-group.util.ts` - *"the same camera is registered
> once per tenant (6 systems today)"*. Efeito prático: ~12 devices físicos reais hoje geram até 72
> linhas `Camera` (6 tenants × device), e qualquer mecanismo que trate device físico (healthcheck,
> telemetria, analytics) precisa dedupar por `streamUrl`/host, não por linha - ver
> `groupByDeviceStream()` e [[Saúde e monitoramento - Arquitetura e estratégias]]. A PTZ Atman
> (`10.1.1.79`, AXIS Q6135-LE) está `OPERATIONAL` nos 6 sistemas simultaneamente.
>
> Mesma topologia sustenta o fan-out 1:N de analytics por `deviceAnalyticId`
> (`apps/ms-cameras/docs/atomic/PROJ-013-analytics-multi-camera-fanout.md`,
> `MOD-014-analytics-pipeline-resilience.md`) e a telemetria de bitrate por device físico
> (`PROJ-006-bitrate-ttff-telemetry.md`, BR-TELE-006/007).
>
> **Não confundir com o seed de dev** (`apps/ms-cameras/src/database/seed.ts`): o seed local usa **um
> único** `SYSTEM_ID` para todas as câmeras de teste (PTZ Atman `10.1.1.79`, demo `10.1.1.78`,
> Hikvision real `192.168.210.80` via ISAPI) - é sandbox de desenvolvimento, não reflete a replicação
> por tenant de produção. A câmera do analítico embarcado (`10.11.20.101`) é a única com o app ATMAN
> Traffic Edge de fato instalado (ver [[Integração com dispositivo]]).

## Máquina de estados do ciclo de vida

`LifecycleTransitions.assertValidTransition(from, to)` consulta um mapa fixo `VALID_TRANSITIONS` (cadeia linear bidirecional STOCK↔TESTING↔IN_FIELD↔OPERATIONAL - ver tabela em [[Cameras]]). Transição inválida → `BusinessRuleViolationException` com `errorCode: INVALID_STATE_TRANSITION` + `translationKey` para o frontend. `ChangeCameraStateHandler` valida contra o estado atual (404 se câmera não existe) e incrementa o counter `cameras_state_transitions_total{from,to}`.

O helper também expõe `assertNotInStock(state)` (guard para operações que exigem câmera no campo), mas **hoje não tem callers** em produção - a prevenção de comandos fora de "Operativa" (RNF-CAM-10) é aplicada no frontend, não no backend.

## Soft-delete

`DELETE /cameras/:id` grava `deletedAt=now()` (não apaga a linha). `findById`/`findAll`/`findExistingIds`/`findSummariesByIds` filtram `deletedAt: null`. Uma câmera deletada some das listagens, dá 404 no GET/:id, mas permanece no banco para integridade referencial com histórico (eventos, substituições). Não há endpoint de hard-delete. Reativação (revive a mesma linha em vez de recriar) só acontece por um caminho: recadastrar com o mesmo `ipAddress` no `systemId` (BR-CRUD-009, seção acima) - não há endpoint dedicado de "reativar por id".

## Perfis de mídia (UC-031, card 2008)

`GET /cameras/:id/media-profiles` serve o inventário ONVIF/ISAPI **descoberto no device** (device-truth) - resolução, codec, quality, fps, GOP, `h264Profile`, áudio e PTZ quando o device reporta. **Não é a mesma coisa que `CameraStreamProfile`** (que é a config de streaming que o player consome); é o inventário bruto que a tela de perfis de mídia do frontend usa para exibir o que o device tem. Reusa o contrato existente `camera-media-profile` de `@attlas/contracts` (`IListMediaProfilesResponse` = `IPaginatedResponse<IGetMediaProfileResponse>`), sem contrato novo. A descoberta roda em dois gatilhos: no cadastro (`CreateCamerasHandler.trackDiscovery`, background, não bloqueia o create) e periodicamente (`CameraMediaProfileDiscoveryWorker`). Persistido por câmera em `CameraMediaProfile` via `ICameraMediaProfileRepository`; `GetCameraMediaProfilesHandler` só lê o que já foi descoberto (nunca faz probe ao vivo na request). Escopo tenant via `@SystemId()` direto no handler da query (ver seção multi-tenant acima). Detalhe completo em `apps/ms-cameras/docs/modules/MOD-012-camera-media-profiles.md` e `apps/ms-cameras/docs/atomic/UC-031-list-camera-media-profiles.md`.

## Substituição com herança + auto-relação

`ReplaceCameraHandler` valida que velha ≠ nova, que ambas existem e não estão deletadas, e chama `repository.replaceCamera` (tudo em `$transaction`). A nova câmera herda:

- **Localização**: `latitude`, `longitude`, `address`, `intersection`, `trafficElementId`.
- **Presets PTZ default**: os presets `isDefault` da velha são copiados para a nova (os tours e presets default pré-existentes da nova são apagados antes, respeitando o `Restrict` das referências).
- **Cenas do VMS**: `VideoWallSceneCell` da velha são reapontadas para a nova (atualização automática, RF-CAM-07).
- **Tours PTZ** da velha migram para a nova.

Ao fim, a **velha** vai para `lifecycleState=STOCK` e recebe `replacedByCameraId = nova` (auto-relação `Camera.CameraReplacement`, `onDelete: SetNull`).

**Trade-off / gap**: a rastreabilidade da substituição é hoje só o ponteiro `replacedByCameraId` + `updatedAt`. **Não** há tabela de histórico dedicada, **não** se captura o operador responsável (o endpoint não injeta `@CurrentUser`), e o evento Kafka `attlas.cameras.replaced` é um TODO (aguarda client Kafka, PROJ-002). RNF-CAM-13 (histórico permanente com timestamp + operador) está portanto **parcial** - ver [[Cameras - Requisitos e SLA]]. Confirmado em 24/08: nenhum commit desde 03/07 mudou esse gap (o evento Kafka continua TODO).

## Validação de credenciais (probe, sem persistência)

`ValidateCredentialsHandler` → `CameraCredentialProbeService.probe` roda em paralelo por item (batch ≤50, mesmo limite do create para conter esgotamento de sockets). Cada probe abre um `OnvifDevice`, faz `servicesInit` + (`deviceInformationInit` ‖ `mediaGetProfiles`) com timeout de 10s, e devolve device info (fabricante/modelo/serial/firmware/hardwareId), perfis de vídeo e range PTZ. Erros são classificados em `CAMERA_CREDENTIALS_INVALID` / `CAMERA_UNREACHABLE` / `CAMERA_CONNECTION_FAILED`. **Nada é persistido neste endpoint** - alimenta o wizard de cadastro no frontend (o probe equivalente roda de novo, com persistência, dentro do `POST /cameras` - ver "Provisionamento no cadastro" acima).

## safeMode

Flag booleana `Camera.safeMode` (default false), alternada por `PATCH /:id/safe-mode` (`UpdateCameraSafeModeHandler`) e exposta no detalhe. É apenas persistida/refletida - **não** há guard no backend que a use para bloquear operações; a semântica operacional é aplicada no frontend.

## Serialização e contratos

Commands/queries implementam interfaces de `@attlas/contracts` (`ICreateCameraRequest`, `IUpdateCameraRequest`, `IChangeCameraStateRequest`, …) e validam com `class-validator` referenciando `CameraValidation.<campo>` (sem magic numbers). `CameraMapper.toCameraDetail` converte `Decimal → number` (via `NumberHelper`), `Date → ISO string`, e alinha `physicalCameraKind (Int)` ↔ `cameraType (enum)`. `status` deriva de `operationalSnapshot.connectionStatus` (undefined/OFFLINE quando não há snapshot).
