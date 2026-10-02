---
tags:
  - doc
  - ms-cameras
  - cameras
aliases:
  - "Cameras - Arquitetura"
atualizado: 2026-10-01
---

# Cameras - Arquitetura e estratégias

Parte do domínio [[Cameras]]. Caminhos relativos a `apps/ms-cameras/src/` quando não começam por `apps/`
ou `libs/`.

## Mapa de código

| Arquivo | Papel |
| --- | --- |
| `cameras/cameras.controller.ts` | Rotas REST do cadastro (e de PTZ, presets, eventos, ver os domínios vizinhos); despacha para `CommandBus`/`QueryBus`; injeta `System-Id`, Bearer e o `userSubject` do JWT nos comandos |
| `cameras/repositories/cameras.repository.ts` | `CamerasRepository` atrás do token `ICamerasRepositoryToken`; `where`/`orderBy` da listagem escritos à mão; `createMany` mistura criação e reativação na mesma `$transaction`; `replaceCamera`; `repointStreamProfiles` |
| `cameras/mappers/camera.mapper.ts` | `toCreateInput` e `toReactivateInput` (projeções únicas do cadastro), `toCameraDetail`, `toLifecycleEvent` |
| `cameras/helpers/lifecycle-transitions.helper.ts` | Máquina de estados (`assertValidTransition`) e `assertNotInStock`, que não tem chamador |
| `cameras/services/camera-credential-probe.service.ts` | Sondagem ONVIF com fallback ISAPI e ativação do ONVIF em Hikvision (INT-020), detecção do analítico embarcado e de PTZ real; não grava no banco |
| `cameras/services/camera-provisioning.service.ts` | Grava credencial e até três `CameraStreamProfile` a partir da sondagem, promove a câmera a `OPERATIONAL` e a PTZ, registra o analítico embarcado |
| `cameras/services/manufacturer-resolver.service.ts` | Resolve marca por UUID, nome ou code e registra marca nova |
| `cameras/services/cameras-background-tasks.service.ts` | Trabalho destacado da resposta (publicação de ciclo de vida, descoberta de perfis, vínculo do analítico), drenado no shutdown |
| `cameras/events/camera-lifecycle.publisher.ts` | Publica `CREATED`/`UPDATED`/`DELETED` em `attlas.cameras.lifecycle`, com fila Redis de reenvio drenada por `camera-lifecycle-buffer-drain.job.ts` (MOD-020, INT-022) |
| `cameras/consumers/node-camera-association/` | Projeta em `Camera.trafficElementId` o vínculo câmera e interseção feito no Modelo de Tráfego (PROJ-029) |
| `shared/audit/cameras-audit.publisher.ts`, `cameras-notification.publisher.ts` | Ponto único de auditoria (`attlas.audit.cameras`) e de evento notificável do serviço (MOD-019) |
| `shared/tenancy/camera-tenancy.service.ts` | `assertCameraInSystem`, a guarda de escopo da câmera por `systemId` (MOD-011) |
| `internal-api/` | Rotas internas de leitura para outros serviços, fora do Kong |
| `cameras/pipes/uuid-array-body.pipe.ts` | Valida corpo que é array cru de UUIDs (`/validate`, `/batch-get`), de 1 a 200 itens |
| `cameras/cameras.constants.ts` | Lote máximo do cadastro (50), página do backfill do espelho (500), TTL do cache de status, formato do CSV de importação, espera do enquadramento de preset |
| `apps/ms-cameras/scripts/backfill-lifecycle-mirror.ts` | Backfill do espelho de câmeras no `ms-organization` (INT-025), runbook em `apps/ms-cameras/docs/runbooks/backfill-lifecycle-mirror.md` |

A tabela `Camera` não tem dono único de acesso: o CRUD passa por `ICamerasRepository`, mas saúde,
dashboard, streaming, VMS, eventos, analítico e as rotas internas fazem as próprias leituras com
`prisma.camera`, e o `CameraProvisioningService`, o `CameraRegionsController` e os handlers de vínculo com
interseção também escrevem nela.

## Rotas REST

Prefixo `/api`. O `CamerasController` tem `@RequireSystemDuty()` na classe, então toda rota não pública
exige que o requisitante seja membro do sistema do header `System-Id`. Rota por câmera passa ainda por
`CameraTenancyService.assertCameraInSystem` (404 quando a câmera não é do sistema).

| Método | Rota | Spec | Permissão | Nota |
| --- | --- | --- | --- | --- |
| `POST` | `/cameras` | UC-001 | `cameras.camera:create` | Lote de até 50; valida IP único, reativa removida, sonda e provisiona no mesmo pedido |
| `GET` | `/cameras` | UC-002 | - | Paginada; filtros `q`, `connectionStatus`, `lastConnection`, `model`, `cameraType`, `lifecycleState`, `ptz`, `dai`, `virtualLoop`, uptime e elementos de topologia; cada linha traz a interseção (`topologyElement`), resolvida numa chamada ao `POST /internal/nodes/lookup` do `ms-traffic-model` e omitida se ele estiver fora |
| `GET` | `/cameras/:id` | UC-003 | - | 404 se removida ou de outro sistema |
| `PATCH` | `/cameras/:id` | UC-004 | `cameras.camera:edit` | Só os campos presentes; valida IP único; endereço enviado reaponta os perfis de stream |
| `PATCH` | `/cameras/:id/state` | UC-005 | `cameras.camera:edit` | Transição validada pela máquina de estados; 409 se inválida |
| `POST` | `/cameras/:id/replace` | UC-012 | `cameras.camera:edit` | Substituição com herança e motivo |
| `DELETE` | `/cameras/:id` | UC-006 | `cameras.camera:delete` | Remoção lógica, 204 |
| `GET` | `/cameras/:id/media-profiles` | UC-031 | - | Inventário de perfis descoberto no equipamento; 404 só fora do sistema, inventário vazio é página vazia |
| `PUT` | `/cameras/locations` | - | só pertencimento | Localização e azimute em lote, escopo de sistema na própria escrita |
| `POST` | `/cameras/validate-credentials` | UC-013 | `cameras.camera:create` ou `cameras.camera:edit` | Sondagem em lote (até 50); não grava no banco |
| `POST` | `/cameras/validate` | UC-018 | - | Existência em lote; 204 ou 404 com `missingIds` |
| `POST` | `/cameras/batch-get` | UC-019 | - | Dados de exibição em lote (id, nome, modelo, tipo, status, estado, coordenadas, IP) |
| `GET` | `/cameras/bulk-template` | UC-020 | - | CSV de importação com rótulos traduzidos e BOM UTF-8 |
| `GET` | `/cameras/manufacturers` | UC-015 | - | Marcas ativas |
| `GET` | `/cameras/manufacturers/:id/models` | UC-015 | - | Modelos já cadastrados da marca (agregação do inventário) |
| `GET` | `/cameras/:id/thumbnail` | - | `@Public()` | JPEG do stream SECONDARY por VAPIX (Axis) ou ISAPI (Hikvision); 404 sem câmera ou credencial, 502 em falha |
| `GET` | `/cameras/:id/frame` | UF-053 | - | Quadro atual em resolução nativa do PRIMARY, autenticado, `Cache-Control: no-store`; usado pelas telas que desenham sobre a imagem |

As leituras não declaram chave de permissão: a visibilidade de recurso espacializado vem do Alcance
Operacional (CROSS-032). A chave é avaliada no `ms-organization` porque o serviço sobe com
`CoreAuthModule.forRoot({ enableSystemMembershipCache: true, enablePermissionEvaluation: true })`, com
`targetResourceType: 'device'` e o recurso tirado do `:id`. `PUT /cameras/locations` fica só com
pertencimento porque o avaliador resolve um device por vez e o lote chega a duzentas câmeras.

Rotas internas, fora do Kong (`@Public()` com `InternalServiceTokenGuard`):

| Método | Rota | Quem chama |
| --- | --- | --- |
| `POST` | `/internal/cameras/lookup` | `ms-selective-priority` (CROSS-094): id, nome e IP por `ids` ou `search` |
| `GET` | `/internal/cameras/geo-search` | `ms-execution-plans` (CROSS-064): câmeras num retângulo geográfico |
| `GET` | `/internal/cameras/:id/resources` | `ms-execution-plans` (CROSS-147): candidatos para a busca de recursos |
| `POST` | `/internal/cameras/condition-state` | `ms-execution-plans` (CROSS-140): estado de até 200 câmeras para as condicionais |
| `POST` | `/internal/cameras/status` | `ms-execution-plans` (CROSS-185): estado e falha por candidato |

Outros grupos do mesmo controller pertencem a domínios vizinhos: `GET /cameras/vms` ([[VMS]]),
`/:id/status` ([[Saúde e monitoramento]]), eventos e incidentes ([[Eventos, incidentes e alarmes]]), PTZ,
presets e automações ([[PTZ e presets]]), imagens de evidência ([[Analítico]]), saúde e disponibilidade
([[Saúde e monitoramento]]).

## Camadas e CQRS

CQRS com `@nestjs/cqrs`. O controller não tem regra de negócio: valida a entrada (class-validator nas
classes de command e query, com limites de `CameraValidation` de `@attlas/contracts`), injeta o contexto
do pedido e despacha. Cada operação tem pasta própria em `cameras/handlers/<op>/`.

- Commands: criar em lote, editar, mudar estado, substituir, remover, validar credenciais, localização em
  lote, vincular e desvincular câmera de interseção.
- Queries: listar, detalhe, perfis de mídia, marcas, modelos, validar existência, leitura em lote, modelo
  CSV.
- A resposta é serializada por classes locais em `cameras/types/contracts/<op>/` que implementam a
  interface do contrato (`plainToInstance` no controller); `media-profiles` e `batch-get` devolvem a
  interface direto.

O `where`, o `orderBy` e a paginação da listagem são montados à mão (`buildWhere`, `buildOrderBy` e
afins), de propósito: combinam status pela relação 1:1 com `CameraOperationalSnapshot` (OFFLINE também
casa snapshot ausente), filtros JSON de `analyticsCapabilities`, PTZ mecânico ou digital, topologia por
`trafficElementId IN` e uptime agregado sobre os rollups, que o toolkit `list-query` (CROSS-027) não cobre.
A ordenação sempre desempata por `id` para a página não repetir nem pular linhas.

## Persistência

Schema multi-arquivo em `database/schema/`.

| Model | Arquivo | Papel |
| --- | --- | --- |
| `Camera` | `camera/camera.prisma` | Entidade; `systemId` (tenant), `deletedAt` (remoção lógica), `azimuth` (default 0), `lifecycleState` texto, auto-relação `replacedByCameraId`; índices em `manufacturerId`, `lifecycleState`, `trafficElementId`, `(systemId, lifecycleState)` e `(systemId, ipAddress)`; índice único parcial `Camera_active_ip_unique` (`systemId` e `ipAddress` onde `deletedAt IS NULL`), que mora só na migration |
| `CameraCredential` | `camera/camera_credential.prisma` | Usuário e senha 1:1, senha em texto puro por decisão registrada no schema; `onDelete: Cascade` |
| `CameraManufacturer` | `camera/camera_manufacturer.prisma` | Catálogo de marcas; `code` único; `onDelete: Restrict` na câmera |
| `CameraStreamProfile` | `stream/camera_stream_profile.prisma` | Perfil por papel (PRIMARY, SECONDARY, TERTIARY): URL, codec, resolução, bitrate, fps, heartbeat, timeout, fallback; sem `@@unique(cameraId, role)` |
| `CameraMediaProfile` | `stream/camera_media_profile.prisma` | Inventário de perfis descoberto no equipamento |

A pasta `camera/` também guarda `CameraEvidenceImage`, `CameraLprCapability` e `CameraServerAnalytic`, que
são do [[Analítico]]. A coluna `Camera.safeMode` está órfã: nenhum código lê ou escreve nela.

## Ciclo de vida

Quatro estados de `CameraLifecycleState` (`@attlas/contracts`), em cadeia linear de ida e volta:

| Estado | Domínio | Transições permitidas | Aviso de RNF-CAM-10 |
| --- | --- | --- | --- |
| `STOCK` | Em estoque | `TESTING` | Não |
| `TESTING` | Em testes | `IN_FIELD`, `STOCK` | Sim |
| `IN_FIELD` | Em campo, sem configurar | `OPERATIONAL`, `TESTING` | Sim |
| `OPERATIONAL` | Operativa | `IN_FIELD` | Não |

- `PATCH /cameras/:id/state` valida pela `LifecycleTransitions.assertValidTransition`; fora da tabela
  responde `BusinessRuleViolationException` (409, detalhe `INVALID_STATE_TRANSITION`, chave
  `cameras.errors.INVALID_LIFECYCLE_TRANSITION`).
- No cadastro, `ICreateCameraRequest.lifecycleState` é opcional e aceita qualquer estado, sem validação de
  transição; ausente, a câmera nasce `STOCK`. Quando o campo não vem e a sondagem acha um perfil H264 ou
  H265, o provisionamento promove a câmera a `OPERATIONAL` por fora da máquina de estados; com o campo
  enviado, não promove.
- O wizard do `web-attlas` não manda o campo, então toda câmera cadastrada pela tela entra `OPERATIONAL`
  quando há vídeo e `STOCK` quando não há. A edição da câmera não troca o estado, e nenhuma tela chama
  `PATCH /cameras/:id/state`.
- A substituição move estados por fora da máquina (seção própria abaixo).
- `assertNotInStock` não tem chamador: o backend não bloqueia comando por estado, e a confirmação de
  RNF-CAM-10 só existe no PTZ do VMS (ver [[PTZ e presets - Fluxos]]).

> [!warning] Divergência entre regra, spec e código
> RF-CAM-02 diz que só o administrador transiciona e que o sistema nunca transiciona sozinho, mas o
> cadastro pela tela promove a `OPERATIONAL`. E `docs/modules/cameras.md` seção 4 diz que o formulário de
> cadastro pede o estado inicial, o que o wizard da `develop` não faz.

## Cadastro em lote e provisionamento

`POST /cameras` recebe e devolve array. O `CreateCamerasHandler`:

1. Recusa lote acima de 50 (`InvalidInputException`, detalhe `BATCH_LIMIT_EXCEEDED`).
2. Resolve cada marca distinta uma única vez, em sequência, para o lote não registrar a mesma marca duas
   vezes.
3. Valida `replacedByCameraId` de cada item.
4. Aplica a regra de IP único (seção seguinte) e decide quais itens reativam uma câmera removida.
5. Grava tudo numa `$transaction` (tudo ou nada).
6. Sonda e provisiona cada câmera em paralelo (`probeAndProvision`); câmera que respondeu é anexada já ao
   monitoramento de saúde (`DeviceMonitorCoordinatorService.attachRegisteredCamera`), as outras entram na
   próxima reconciliação. Câmera com analítico embarcado dispara em segundo plano o vínculo do equipamento
   (`BindAnalyticDeviceCommand`, UC-216, sem tomar posse de equipamento que outra instalação governa).
7. Dispara em segundo plano a descoberta de perfis de mídia, com permissão para ligar o ONVIF do
   equipamento (único chamador autorizado, INT-020).
8. Publica `CREATED` no ciclo de vida, audita uma linha por câmera e emite as notificações do lote.
9. Relê as câmeras para a resposta já trazer o estado pós-provisionamento.

O provisionamento (`CameraProvisioningService.provisionFromProbe`) grava numa transação: a credencial
(sempre, mesmo com sondagem falha, para o operador repetir), os perfis de stream e o update da câmera.

- Perfis: os H264 e H265 do equipamento ordenados por área de imagem, até três papéis. Quando a URL do
  PRIMARY é de fabricante que aceita redução pela própria URL, papel inferior que não é menor que o de
  cima vira versão reduzida: SECONDARY 1280x720, 30 fps, 2000 kbps; TERTIARY 848x480, 30 fps, 500 kbps.
- Os perfis só são apagados e recriados quando a sondagem devolve perfil novo; uma ressondagem falha não
  apaga a configuração de uma câmera que já funciona.
- PTZ: a sondagem marca `hasPtz` só com faixa real de pan ou tilt (a biblioteca ONVIF preenche `range`
  com zeros e câmera fixa com zoom digital reporta faixa de zoom). Com PTZ real, o provisionamento promove
  `physicalCameraKind` e `analyticsCapabilities.ptz`; nunca rebaixa (BR-CRUD-013).
- Analítico embarcado: quando a sondagem lê o ACAP ATMAN, grava `hasEmbeddedAnalytics`, `dai`,
  `virtualLoop`, `deviceSourceId` e a arquitetura ARTPEC em `analyticsCapabilities` e registra os
  analíticos compatíveis em `CameraAnalytic` (ver [[Analítico]]).
- Sem perfil utilizável ou com sondagem falha, a resposta carrega um aviso por câmera com o `errorCode`
  classificado (`CAMERA_PROBE_FAILED`, o código da sondagem ou `CAMERA_NO_STREAMABLE_PROFILE`), soft-fail
  por design (BR-CRUD-001).

## IP único e reativação (BR-CRUD-009)

- Três camadas, todas respondendo 422 `CAMERA_DUPLICATE_IP`: dois itens do mesmo lote com o mesmo IP (com
  `cardIndex` do item recusado, para o wizard abrir o card certo); IP já usado por câmera ativa do mesmo
  sistema (no cadastro e na edição, só quando o IP está no delta); e o índice único parcial, que fecha a
  corrida entre a checagem (lida fora da transação) e a escrita, com o P2002 traduzido para o mesmo código.
- IP de câmera removida, sem ativa no mesmo IP, reativa a removida mais recente em vez de criar linha nova,
  preservando o histórico sob o mesmo id. `toReactivateInput` reescreve os campos técnicos e zera
  `deletedAt`.
- Antes de reativar, o repositório apaga os filhos da encarnação anterior: snapshot operacional, tours (antes
  dos presets, porque o passo de tour referencia o preset com `Restrict`), presets, capacidade LPR e
  analítico servidor. Sem isso a câmera revivida apareceria online sem heartbeat e herdaria presets do
  equipamento antigo.

## Edição e troca de endereço

O `UpdateCameraHandler` grava só os campos presentes. Pedido que traz endereço reaponta a URL de todos os
perfis de stream antes de anunciar (`repointStreamProfiles`, idempotente, roda em todo save com endereço
para um save repetido consertar perfis deixados no endereço antigo); se o endereço mudou de fato, publica
`CameraOriginChangedEvent` para o streaming abrir a próxima sessão no equipamento novo. Depois invalida o
dashboard (`INVENTORY`), audita o diff e publica `UPDATED` no ciclo de vida.

## Substituição com herança (UC-012)

- A câmera velha precisa estar `OPERATIONAL` ou `IN_FIELD` (`CAMERA_REPLACEABLE_LIFECYCLE_STATES`), senão
  422 `CAMERA_LIFECYCLE_PRECONDITION_NOT_MET`.
- A nova precisa ser do mesmo sistema (senão 404, sem revelar que existe em outro) e estar `STOCK` (senão
  409 `STOCK_CAMERA_NOT_FOUND`). Auto-substituição é 409 `CAMERA_SELF_REPLACE`.
- O corpo exige `newCameraId` e `reason` (`CameraReplacementReason`: defeito técnico, upgrade, vandalismo,
  obsolescência, outro).
- `replaceCamera` numa `$transaction`: a nova herda o estado da velha, latitude, longitude, endereço,
  interseção e `trafficElementId`; os tours e presets default da nova são apagados e os presets default da
  velha copiados; os tours da velha migram; as células de cena do VMS são reapontadas; a velha vai a `STOCK`
  com `replacedByCameraId`.
- Publica `CameraReplacedEvent` in-process, que move o vínculo da Neural Labs para a câmera nova
  (`server-analytics/handlers/move-neural-labs-links-on-replacement/`), audita `CAMERA_REPLACED` com
  `replacedByCameraId` e `reason`, notifica e devolve o detalhe da velha.
- O tópico `attlas.cameras.replaced` segue sem produtor (TODO do handler, PROJ-002).

## Vínculo com interseção do Modelo de Tráfego (PROJ-029)

O `NodeCameraAssociationListener` consome `attlas.node-devices.associated` e `attlas.node-devices.dissociated`
do `ms-traffic-model`. Associação do tipo `CAMERA` grava `Camera.trafficElementId` com o nó; dissociação
limpa só se o campo ainda aponta para aquele nó; payload inválido vai para a fila-morta. É daí que a tela
deriva interseção, área e subárea. Vínculo feito antes do consumidor existir só aparece depois de
reassociar a câmera.

## Autorização

1. Pertencimento: `@RequireSystemDuty()` na classe faz o `JwtClaimsGuard` confirmar que o requisitante é
   membro ativo do sistema do header (cache Redis com fallback no `ms-organization`, 403 `FORBIDDEN_ACTION`).
   O MASTER da plataforma passa. Toda rota nova nasce protegida.
2. Permissão funcional: `@RequirePermission` nas rotas de escrita (tabela acima); avaliador fora do ar
   responde 503 `PERMISSION_RESOLVER_UNAVAILABLE`.
3. Escopo da linha: `@SystemId()` é fail-closed (400 sem header ou UUID inválido) e o controller sobrescreve
   `systemId` e `bearer` da query depois da validação. Leituras filtram pelo `systemId` no próprio `where`;
   mutações e comandos por câmera passam por `assertCameraInSystem` (404 sem vazar existência). O VMS escopa
   por organização, não por sistema (MOD-011, ver [[VMS]]).

## Auditoria e notificação (MOD-019, UC-065)

Cada gesto publica um envelope em `attlas.audit.cameras` (consumido pelo `ms-audit`) e um evento
notificável `cameras.camera.*`, fora do caminho crítico da resposta. O ator é o `userSubject` do JWT; sem
sujeito, o envelope sai como `SYSTEM`.

| Gesto | Auditoria | Notificação |
| --- | --- | --- |
| Cadastro | `CAMERA_CREATED`, uma por câmera, payload só com latitude e longitude; mais as declarações de LPR e de analítico servidor feitas no wizard | `cameras.camera.created`, agregável |
| Edição | diff dos `AUDITED_FIELDS` que o patch trouxe; o IP entra só pelo nome do campo | `cameras.camera.updated`, só se algo mudou |
| Estado | `fromState` e `toState` | `cameras.camera.stateChanged` |
| Substituição | `CAMERA_REPLACED` com `replacedByCameraId` e `reason` | `cameras.camera.replaced` |
| Remoção | `lifecycleState` | `cameras.camera.deleted` |
| Localização em lote | uma linha para o lote | `cameras.camera.locationBatchUpdated`, uma por câmera |

O payload leva identificadores, nunca a entidade, porque a senha da credencial fica em texto puro e o
`audit_log` é exportável. A publicação é best-effort e sem reenvio. `@Audited` na rota só declara o par
para o teste de superfície; quem publica é o handler.

## Publicação do ciclo de vida (MOD-020, INT-022)

`CameraLifecyclePublisher` publica `IDeviceLifecycleEvent` em `attlas.cameras.lifecycle` (chave `deviceId`),
consumido pelo `ms-organization` (`apps/ms-organization/src/device/consumers/device-lifecycle.consumer.ts`).

- Publicam o cadastro (`CREATED`), a edição (`UPDATED`) e a remoção (`DELETED`); estado, substituição e
  localização em lote não publicam.
- O envelope leva `deviceId`, `systemId`, `name`, `actorUserId` e `occurredAt`, com `isMobile: false` e
  `areaId: null`.
- O envio roda destacado da resposta. Falha vai para uma fila Redis por câmera, drenada sob lock; evento
  novo de câmera com pendência entra atrás da fila para não inverter a ordem. Só a falha dupla (Kafka e
  Redis) descarta.
- Câmeras anteriores ao produtor entram pelo script de backfill (INT-025).

## Marca, perfis de mídia, credenciais e remoção

- Marca: `ManufacturerResolverService.resolve` aceita UUID, nome ou code e registra a marca não catalogada;
  `code` derivado do nome (primeiro token, alfanumérico, maiúsculo, até 32 caracteres) e único, então a
  corrida entre dois pedidos cai em P2002 e o perdedor relê o vencedor. Cadastro nunca dá 404 por marca.
- Perfis de mídia (UC-031): `CameraMediaProfile` é o inventário bruto do equipamento (resolução, codec,
  qualidade, fps, GOP, perfil H264, áudio, PTZ), diferente de `CameraStreamProfile`, que é o que o player
  consome. Descoberto no cadastro e periodicamente pelo `CameraMediaProfileDiscoveryWorker` (câmeras
  `OPERATIONAL` e `TESTING`), com leitura ONVIF e fallback ISAPI; a rota só lê o que já foi descoberto.
- Validação de credenciais: sondagem em lote, mesmo limite de 50 do cadastro para não esgotar sockets,
  acrescida da arquitetura ARTPEC e da compatibilidade do analítico embarcado. Não grava no banco, mas numa
  Hikvision com ONVIF desligado liga o ONVIF no equipamento. Os 10 s valem só para a conexão ONVIF; a
  detecção do analítico e o caminho ISAPI podem estender o tempo do item. Detalhe da sondagem em
  [[Integração com dispositivo - Fluxos]].
- Remoção: grava `deletedAt`; as leituras filtram `deletedAt: null`; não há hard-delete nem rota de
  reativar por id, só o recadastro pelo mesmo IP.
- Serialização: `toCameraDetail` converte `Decimal` em número e `Date` em ISO, alinha `physicalCameraKind`
  e `cameraType` e acrescenta `streamTiers`, `analytics` e o aviso de provisionamento. No detalhe, `status`
  fica indefinido sem snapshot (a tela omite o selo até o WebSocket responder); na listagem, sem snapshot
  sai `OFFLINE`.

## Topologia de produção e seed

- Em produção a mesma câmera física é cadastrada uma vez por sistema-tenant (seis hoje), então cerca de
  doze equipamentos viram dezenas de linhas `Camera`. Qualquer mecanismo que trate o equipamento físico
  (saúde, telemetria, analítico) deduplica por endereço, não por linha (`health/utils/device-stream-group.util.ts`,
  ver [[Saúde e monitoramento - Arquitetura e estratégias]]).
- O seed de desenvolvimento (`database/seed.ts`) cria só três câmeras Axis da bancada num único sistema
  (`SEED_SYSTEM_ID`): demo `10.1.1.78`, PTZ `10.1.1.79` e a do analítico embarcado `10.1.1.80`. Sem
  `SEED_CAMERA_PASSWORD` não grava credencial, e o `source_id` do analítico vem de
  `SEED_ATMAN_EMBEDDED_SOURCE_ID`, nunca de constante versionada. O seed só grava no banco, não fala com
  equipamento.

## Armadilhas conhecidas

- Recadastrar pelo IP de câmera removida falhava com 409 de FK quando os presets eram apagados antes dos
  tours; a ordem tours antes de presets é obrigatória em toda limpeza de filhos.
- A biblioteca ONVIF reconstrói o `GetStreamUri` com esquema `http://`; a sondagem força `rtsp://` de volta
  antes de gravar o perfil.
- Câmera inserida à mão no banco precisa de UUID v4 válido (`gen_random_uuid()`): o gateway do analítico
  recusa id derivado sem os bits de versão e a câmera nunca entra na sala do WebSocket.

## Pendências

- Histórico permanente de substituição (RNF-CAM-13): falta tabela própria e o produtor de
  `attlas.cameras.replaced`; hoje o rastro é o `replacedByCameraId` mais a linha de auditoria.
- A MOD-020 especifica o censo `GET internal/devices/count` (UC-076) e o teto de licença no cadastro
  (UC-077); nenhum dos dois existe no código.
