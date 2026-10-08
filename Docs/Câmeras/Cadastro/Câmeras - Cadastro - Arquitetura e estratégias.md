---
tags:
  - doc
  - cameras
  - cadastro
aliases:
  - "Cameras - Arquitetura"
  - "Cameras - Arquitetura e estratégias"
atualizado: 2026-10-07
banner: "database registry system"
---

# Câmeras - Cadastro - Arquitetura e estratégias

Volta para [[Câmeras - Cadastro]].

## Resumo

O cadastro é CQRS sobre o `CamerasController`: o controller valida, injeta o contexto do pedido e despacha
para o handler da operação. O `POST /cameras` sonda e provisiona cada câmera no mesmo pedido e nunca falha por
causa do equipamento; a resposta traz um aviso por câmera que não respondeu. O IP é único entre câmeras ativas
do mesmo sistema, e recadastrar o IP de uma removida reativa a linha antiga. Os quatro estados têm máquina de
transição na API, mas o cadastro pela tela promove a câmera com vídeo a Operativa. Cada gesto publica
auditoria, notificação e, no cadastro, edição e remoção, o evento de ciclo de vida para o `ms-organization`.

## Onde está no código

Caminhos relativos a `apps/ms-cameras/src/` quando não começam por `apps/` ou `libs/`.

| Caminho | Papel |
| --- | --- |
| `cameras/cameras.controller.ts` | Rotas REST do cadastro e dos subdomínios vizinhos; despacha para `CommandBus` e `QueryBus` e injeta `System-Id`, Bearer e o `userSubject` do JWT nos comandos |
| `cameras/handlers/<operação>/` | Um handler por operação: `create-camera`, `update-camera`, `change-camera-state`, `replace-camera`, `soft-delete-camera`, `validate-credentials`, `batch-update-camera-locations`, `attach-camera-to-intersection`, `detach-camera-from-intersection`, `list-cameras`, `get-camera-by-id`, `get-camera-media-profiles`, `list-manufacturers`, `list-manufacturer-models`, `validate-cameras`, `get-cameras-batch`, `download-bulk-template` |
| `cameras/repositories/cameras.repository.ts` | `CamerasRepository` atrás do token `ICamerasRepositoryToken`: `where` e `orderBy` da listagem, `createMany` (criação e reativação na mesma `$transaction`), `replaceCamera`, `repointStreamProfiles`, `hasActiveStreamProfile` |
| `cameras/mappers/camera.mapper.ts` | `toCreateInput` e `toReactivateInput` (as projeções do cadastro), `toCameraDetail`, `toLifecycleEvent` |
| `cameras/helpers/lifecycle-transitions.helper.ts` | Máquina de estados (`assertValidTransition`) e `assertNotInStock`, que não tem chamador |
| `cameras/services/camera-credential-probe.service.ts` | Sondagem ONVIF com fallback ISAPI e ativação do ONVIF em Hikvision, detecção do analítico embarcado e de PTZ real; não grava no banco |
| `cameras/services/camera-provisioning.service.ts` | Grava credencial e até três `CameraStreamProfile` a partir da sondagem, promove a câmera a `OPERATIONAL` e a PTZ, registra o analítico embarcado |
| `cameras/services/camera-registration-provisioning.service.ts` | Sequência de provisionamento de uma câmera (sondagem, provisionamento, entrada no monitoramento, vínculo do analítico, descoberta de perfis de mídia), usada pelo cadastro e pela edição que salva endereço |
| `cameras/services/manufacturer-resolver.service.ts` | Resolve a marca por UUID, nome ou code e registra marca nova |
| `cameras/services/camera-media-profile-discovery.service.ts`, `cameras/workers/camera-media-profile-discovery.worker.ts` | Descoberta do inventário de perfis do equipamento, no cadastro e periódica |
| `cameras/services/cameras-background-tasks.service.ts` | Trabalho destacado da resposta (ciclo de vida, descoberta, vínculo do analítico, reprovisionamento), drenado no shutdown |
| `cameras/events/camera-lifecycle.publisher.ts`, `cameras/events/camera-lifecycle-buffer-drain.job.ts` | Publicação do ciclo de vida e drenagem da fila Redis de reenvio |
| `cameras/consumers/node-camera-association/` | Projeta em `Camera.trafficElementId` o vínculo câmera e interseção feito no Modelo de Tráfego |
| `cameras/pipes/uuid-array-body.pipe.ts` | Valida corpo que é array cru de UUIDs (`/validate`, `/batch-get`), de 1 a 200 itens |
| `cameras/cameras.constants.ts` | Lote máximo do cadastro, página do backfill do espelho (500), TTL do cache de status, formato do CSV de importação |
| `cameras/cameras.metrics.ts` | Nomes das métricas Prometheus do cadastro e do ciclo de vida |
| `shared/tenancy/camera-tenancy.service.ts` | `assertCameraInSystem`, a guarda de escopo da câmera por sistema |
| `shared/audit/cameras-audit.publisher.ts`, `shared/audit/cameras-notification.publisher.ts` | Ponto único de auditoria e de evento notificável do serviço |
| `internal-api/` | Rotas internas de leitura para outros serviços (tabela em [[Câmeras - Arquitetura e estratégias]]) |
| `database/seed.ts` | Seed de desenvolvimento |
| `apps/ms-cameras/scripts/backfill-lifecycle-mirror.ts` | Backfill do espelho de câmeras no `ms-organization`; runbook em `apps/ms-cameras/docs/runbooks/backfill-lifecycle-mirror.md` |
| `libs/contracts/src/lib/camera/` | `ICreateCameraRequest`, `CameraLifecycleState`, `CameraValidation`, `CAMERA_BATCH_MAX_SIZE`, `CAMERA_REPLACEABLE_LIFECYCLE_STATES`, `CameraReplacementReason` |
| `apps/web-attlas/src/app/modules/cameras/` | Telas do cadastro (ver [[Câmeras - Cadastro - Fluxos]]) |

## Contratos

### Rotas REST

Prefixo `/api`. O `CamerasController` tem `@RequireSystemDuty()` na classe, então toda rota não pública exige
que o requisitante seja membro do sistema do header `System-Id`. Rota por câmera passa ainda por
`assertCameraInSystem` (404 quando a câmera não é do sistema).

| Método | Rota | Permissão | Comportamento | Spec |
| --- | --- | --- | --- | --- |
| `POST` | `/cameras` | `cameras.camera:create` | Lote de até 50; valida IP único, reativa removida, sonda e provisiona no mesmo pedido; o item pode declarar a capacidade de leitura de placa e o analítico servidor | UC-001 |
| `GET` | `/cameras` | pertencimento | Paginada; filtros `q`, `connectionStatus`, `lastConnection`, `model`, `cameraType`, `lifecycleState`, `ptz`, `dai`, `virtualLoop`, uptime e elementos de topologia; cada linha traz a interseção (`topologyElement`, resolvida numa chamada ao `POST /internal/nodes/lookup` do `ms-traffic-model` e omitida se ele estiver fora), `address` e `updatedAt` | UC-002 |
| `GET` | `/cameras/:id` | pertencimento | 404 se removida ou de outro sistema | UC-003 |
| `PATCH` | `/cameras/:id` | `cameras.camera:edit` | Grava só os campos presentes; valida IP único; endereço enviado reaponta os perfis de stream e reprovisiona câmera sem perfil | UC-004 |
| `PATCH` | `/cameras/:id/state` | `cameras.camera:edit` | Transição validada pela máquina de estados; 409 se inválida | UC-005 |
| `POST` | `/cameras/:id/replace` | `cameras.camera:edit` | Substituição com herança e motivo | UC-012 |
| `DELETE` | `/cameras/:id` | `cameras.camera:delete` | Remoção lógica, 204 | UC-006 |
| `GET` | `/cameras/:id/media-profiles` | pertencimento | Inventário de perfis descoberto no equipamento; 404 só fora do sistema, inventário vazio é página vazia | UC-031 |
| `PUT` | `/cameras/locations` | pertencimento | Latitude, longitude e azimute de até 200 câmeras; resultado por câmera (`results`, `updated`, `failed`), uma falha não impede as outras; chamado pelo `ms-traffic-model` | RF-INT-08 |
| `POST` | `/cameras/validate-credentials` | `cameras.camera:create` ou `cameras.camera:edit` | Sondagem em lote (até 50); não grava no banco | UC-013 |
| `POST` | `/cameras/validate` | pertencimento | Existência em lote; 204 ou 404 com `missingIds` | UC-018 |
| `POST` | `/cameras/batch-get` | pertencimento | Dados de exibição em lote (id, nome, modelo, tipo, status, estado, coordenadas, IP) | UC-019 |
| `GET` | `/cameras/bulk-template` | pertencimento | CSV de importação com rótulos traduzidos e BOM UTF-8 | UC-020 |
| `GET` | `/cameras/manufacturers` | pertencimento | Marcas ativas | UC-015 |
| `GET` | `/cameras/manufacturers/:id/models` | pertencimento | Modelos já cadastrados da marca (agregação do inventário) | UC-015 |
| `GET` | `/cameras/:id/thumbnail` | `@Public()` | JPEG do stream SECONDARY por VAPIX (Axis) ou ISAPI (Hikvision); a última imagem fica 10 min em cache e quem pede recebe a cópia na hora enquanto a nova vem por trás (`Cache-Control: public, max-age=10, s-maxage=10, stale-while-revalidate=600`); 404 sem câmera ou credencial, 502 em falha | - |
| `GET` | `/cameras/:id/frame` | pertencimento | Quadro atual em resolução nativa do PRIMARY, `Cache-Control: no-store`; usado pelas telas que desenham sobre a imagem | UF-053 |

As leituras não declaram chave de permissão: a visibilidade de recurso com posição no mapa vem do alcance
operacional do requisitante. A chave das escritas é avaliada no `ms-organization` com
`targetResourceType: 'device'` e o recurso tirado do `:id`. `PUT /cameras/locations` fica só com pertencimento
porque o avaliador resolve um dispositivo por vez e o lote chega a duzentas câmeras.

Os outros grupos do mesmo controller pertencem aos subdomínios vizinhos: `GET /cameras/vms` ([[Câmeras - VMS]]),
`/:id/status` e disponibilidade ([[Câmeras - Saúde e monitoramento]]), eventos e incidentes
([[Câmeras - Eventos, incidentes e alarmes]]), PTZ, presets e automações ([[Câmeras - PTZ e presets]]) e imagem de
evidência ([[Analítico]]). As rotas internas estão em [[Câmeras - Arquitetura e estratégias]].

### Tópicos Kafka

| Direção | Tópico | Código | Quando |
| --- | --- | --- | --- |
| Produz | `attlas.cameras.lifecycle` | `cameras/events/camera-lifecycle.publisher.ts` | `CREATED` no cadastro, `UPDATED` na edição, `DELETED` na remoção; chave `deviceId`; consumido por `apps/ms-organization/src/device/consumers/device-lifecycle.consumer.ts` |
| Produz | `attlas.audit.cameras` | `shared/audit/cameras-audit.publisher.ts` | Todo gesto do cadastro, consumido pelo `ms-audit` |
| Produz | `attlas.notifications.event-occurred` | `shared/audit/cameras-notification.publisher.ts` | Evento notificável `cameras.camera.*` |
| Consome | `attlas.node-devices.associated`, `attlas.node-devices.dissociated` | `cameras/consumers/node-camera-association/node-camera-association.listener.ts` | Vínculo de câmera com interseção feito no `ms-traffic-model`; payload inválido vai para `attlas.dlq.cameras` |

O envelope do ciclo de vida (`IDeviceLifecycleEvent`) leva `eventId`, `action`, `deviceId`, `deviceType`
(`CAMERA`), `systemId`, `name`, `actorUserId` e `occurredAt`, com `isMobile: false` e `areaId: null`. Mudança de estado, substituição e localização em lote não
publicam ciclo de vida.

> [!warning] Substituição sem tópico próprio
> `attlas.cameras.replaced` existe nas constantes e no SPEC, mas não tem produtor: o handler de substituição
> carrega um TODO no lugar da publicação.

### Banco

Schema em `database/schema/`.

| Model | Arquivo | Papel |
| --- | --- | --- |
| `Camera` | `camera/camera.prisma` | Entidade; `systemId` (tenant), `deletedAt` (remoção lógica), `azimuth` (padrão 0), `lifecycleState` em texto, auto-relação `replacedByCameraId`; índices em `manufacturerId`, `lifecycleState`, `trafficElementId`, `(systemId, lifecycleState)` e `(systemId, ipAddress)`; o índice único parcial `Camera_active_ip_unique` (`systemId` e `ipAddress` onde `deletedAt IS NULL`) mora só na migration |
| `CameraCredential` | `camera/camera_credential.prisma` | Usuário e senha 1:1, senha em texto puro por decisão registrada no schema; `onDelete: Cascade` |
| `CameraManufacturer` | `camera/camera_manufacturer.prisma` | Catálogo de marcas; `code` único; `onDelete: Restrict` na câmera |
| `CameraStreamProfile` | `stream/camera_stream_profile.prisma` | Perfil por papel (PRIMARY, SECONDARY, TERTIARY): URL, codec, resolução, bitrate, fps, heartbeat, timeout, fallback; sem `@@unique(cameraId, role)` |
| `CameraMediaProfile` | `stream/camera_media_profile.prisma` | Inventário de perfis descoberto no equipamento |
| `CameraLprCapability`, `CameraServerAnalytic` | `camera/` | Declarações de leitura de placa e de analítico servidor, gravadas no cadastro quando o item as traz (domínio [[Analítico]]) |

### Estados do ciclo de vida

Quatro estados de `CameraLifecycleState` (`@attlas/contracts`), em cadeia linear de ida e volta, um passo por
vez.

| Estado | Rótulo na tela | Transições permitidas | Confirmação antes de comando PTZ no VMS |
| --- | --- | --- | --- |
| `STOCK` | Em estoque | `TESTING` | Sim |
| `TESTING` | Em testes | `IN_FIELD`, `STOCK` | Sim |
| `IN_FIELD` | Em campo, sem configurar | `OPERATIONAL`, `TESTING` | Sim |
| `OPERATIONAL` | Operativa | `IN_FIELD` | Não |

Transição fora da tabela responde `BusinessRuleViolationException` (409, detalhe `INVALID_STATE_TRANSITION`,
chave `cameras.errors.INVALID_LIFECYCLE_TRANSITION`).

### Auditoria e notificação por gesto

| Gesto | Auditoria em `attlas.audit.cameras` | Notificação |
| --- | --- | --- |
| Cadastro | `CAMERA_CREATED`, uma por câmera, payload só com latitude e longitude; mais `CAMERA_LPR_CAPABILITY_DECLARED` e `CAMERA_SERVER_ANALYTIC_DECLARED` quando o item declara | `cameras.camera.created`, agregável |
| Edição | Diff dos campos de `UpdateCameraHandler.AUDITED_FIELDS` que o patch trouxe | `cameras.camera.updated`, só se algo mudou |
| Estado | `fromState` e `toState` | `cameras.camera.stateChanged` |
| Substituição | `CAMERA_REPLACED` com `replacedByCameraId` e `reason` | `cameras.camera.replaced` |
| Remoção | `lifecycleState` | `cameras.camera.deleted` |
| Localização em lote | Uma linha para o lote | `cameras.camera.locationBatchUpdated`, uma por câmera |

O ator é o `userSubject` do JWT; sem sujeito, o envelope sai como `SYSTEM`. A publicação roda fora do caminho
da resposta, é best-effort e não tem reenvio.

## Por que é assim

### Provisionamento no próprio cadastro

O `POST /cameras` é o único ponto em que o Attlas fala com a câmera pela primeira vez: não existe passo
separado de ativação. A mesma sondagem que o wizard roda no passo de credenciais roda de novo, agora com
gravação, dentro do cadastro. O provisionamento é soft-fail: a câmera e a credencial são gravadas mesmo com
sondagem falha, para o operador repetir sem recadastrar (BR-CRUD-001).

- **Perfis.** Os perfis H264 e H265 do equipamento são ordenados por área de imagem e ocupam até três papéis.
  Quando a URL do PRIMARY é de fabricante que aceita redução pela própria URL, papel inferior que não é menor
  que o de cima vira versão reduzida: SECONDARY 1280x720, 30 fps, 2000 kbps; TERTIARY 848x480, 30 fps,
  500 kbps.
- **Bitrate de perfil VBR.** Perfil de taxa variável informa "sem limite" como o maior inteiro; o
  provisionamento troca esse valor por uma estimativa pela resolução, fps e codec, para o número nunca chegar
  às somas de banda.
- **Ressondagem não destrói.** Os perfis só são apagados e recriados quando a sondagem devolve perfil novo;
  uma ressondagem falha não apaga a configuração de uma câmera que já funciona.
- **PTZ.** A sondagem marca `hasPtz` só com faixa real de pan ou tilt, porque a biblioteca ONVIF preenche
  `range` com zeros e câmera fixa com zoom digital reporta faixa de zoom. Com PTZ real, o provisionamento
  promove `physicalCameraKind` e `analyticsCapabilities.ptz`, e nunca rebaixa (BR-CRUD-013).
- **Analítico embarcado.** Quando a sondagem lê o ACAP ATMAN, o provisionamento grava `hasEmbeddedAnalytics`,
  `dai`, `virtualLoop`, `deviceSourceId` e a arquitetura ARTPEC em `analyticsCapabilities`, registra os
  analíticos compatíveis em `CameraAnalytic` e dispara em segundo plano o vínculo do equipamento, sem tomar
  posse de equipamento que outra instalação governa.
- **Monitoramento.** Câmera que respondeu entra já no monitoramento de saúde
  (`DeviceMonitorCoordinatorService.attachRegisteredCamera`); as outras entram na próxima reconciliação.
- **Aviso.** Sem perfil utilizável ou com sondagem falha, a resposta traz um aviso por câmera com o
  `errorCode` classificado: `CAMERA_PROBE_FAILED`, o código da sondagem ou `CAMERA_NO_STREAMABLE_PROFILE`.

### Reprovisionamento ao salvar endereço

Câmera cadastrada num endereço que não respondeu fica sem `CameraStreamProfile`, e o vídeo dela responde 409
`STREAM_PROFILE_NOT_CONFIGURED`. Por isso a edição que traz `ipAddress` roda em segundo plano, para câmera sem
perfil ativo, a mesma sequência do cadastro (`CameraRegistrationProvisioningService`), com a credencial gravada e
o estado atual como estado escolhido, então a câmera não é promovida (BR-CRUD-016). Câmera que já tem perfil só
tem os perfis reapontados. Sem credencial gravada, o reprovisionamento só registra um aviso no log.

### IP único em três camadas e reativação

A regra (BR-CRUD-009) é um IP por câmera ativa no mesmo sistema, e as três camadas respondem o mesmo 422
`CAMERA_DUPLICATE_IP`:

1. Dois itens do mesmo lote com o mesmo IP, com o `cardIndex` do item recusado para o wizard abrir o card certo.
2. IP já usado por câmera ativa do sistema, no cadastro e na edição (só quando o IP está no delta).
3. O índice único parcial, que fecha a corrida entre a checagem (lida fora da transação) e a escrita; o P2002
   é traduzido para o mesmo código, sem `cardIndex`.

IP de câmera removida, sem ativa no mesmo IP, reativa a removida mais recente em vez de criar linha nova, e o
histórico fica sob o mesmo id. `toReactivateInput` reescreve os campos técnicos e zera `deletedAt`. Antes de
reativar, o repositório apaga os filhos da encarnação anterior: snapshot operacional, tours (antes dos presets,
porque o passo de tour referencia o preset com `Restrict`), presets, capacidade de leitura de placa e analítico
servidor. Sem isso a câmera revivida apareceria online sem heartbeat e herdaria presets do equipamento antigo.

### Troca de endereço reaponta os perfis

O endereço da câmera mora em dois lugares: a coluna `ipAddress` e a URL de cada perfil de stream. O
`UpdateCameraHandler` reaponta os perfis antes de anunciar a mudança, e reaponta em todo save que traz
endereço, não só quando a coluna mudou: as duas escritas não são uma transação, e salvar o mesmo endereço de
novo é o reparo do operador para perfis deixados no endereço antigo. Reapontar é idempotente. O anúncio
(`CameraOriginChangedEvent`, para o streaming abrir a próxima sessão no equipamento novo) só sai quando o
endereço mudou de fato.

### Substituição com herança

- A câmera velha precisa estar `OPERATIONAL` ou `IN_FIELD` (`CAMERA_REPLACEABLE_LIFECYCLE_STATES`).
- A nova precisa ser do mesmo sistema e estar `STOCK`. Câmera de outro sistema responde 404, nunca "existe em
  outro lugar".
- O corpo exige `newCameraId` e `reason` (`CameraReplacementReason`: `TECHNICAL_DEFECT`, `EQUIPMENT_UPGRADE`,
  `VANDALISM_PHYSICAL_DAMAGE`, `OBSOLESCENCE`, `OTHER`).
- `replaceCamera` numa `$transaction`: a nova herda o estado da velha, latitude, longitude, endereço, interseção
  e `trafficElementId`; os tours e os presets default da nova são apagados e os presets default da velha
  copiados; os tours da velha migram; as células de cena do VMS são reapontadas; a velha vai a `STOCK` com
  `replacedByCameraId`.
- O `CameraReplacedEvent` em processo move o vínculo da Neural Labs para a câmera nova
  (`server-analytics/handlers/move-neural-labs-links-on-replacement/`).

A troca de estado da substituição acontece por fora da máquina de estados.

### Vínculo com interseção vem do Modelo de Tráfego

O `NodeCameraAssociationListener` grava `Camera.trafficElementId` com o nó quando a associação é do tipo
`CAMERA`, e a dissociação limpa o campo só se ele ainda aponta para aquele nó. É daí que a tela deriva
interseção, área e subárea, e é por esse campo que o dashboard e o filtro de topologia recortam câmeras. Vínculo
feito antes do consumidor existir só aparece depois de reassociar a câmera.

### Autorização em três camadas

1. **Pertencimento.** `@RequireSystemDuty()` na classe faz o `JwtClaimsGuard` confirmar que o requisitante é
   membro ativo do sistema do header (cache Redis com fallback no `ms-organization`, 403 `FORBIDDEN_ACTION`). O
   MASTER da plataforma passa. Toda rota nova do controller nasce protegida.
2. **Permissão funcional.** `@RequirePermission` nas rotas de escrita; avaliador fora do ar responde 503
   `PERMISSION_RESOLVER_UNAVAILABLE`.
3. **Escopo da linha.** `@SystemId()` é fail-closed (400 sem header ou com UUID inválido), e o controller
   sobrescreve `systemId` e `bearer` da query depois da validação. Leituras filtram pelo `systemId` no próprio
   `where`; mutações e comandos por câmera passam por `assertCameraInSystem`. O VMS escopa por organização, não
   por sistema (ver [[Câmeras - VMS]]).

### Publicação do ciclo de vida com fila de reenvio

O envio roda destacado da resposta, para um lote de N câmeras não pagar N vezes o timeout do Kafka. Falha vai
para uma fila Redis por câmera, drenada sob lock; evento novo de câmera com pendência entra atrás da fila para
não inverter a ordem. Só a falha dupla (Kafka e Redis) descarta o evento. Câmeras anteriores ao produtor entram
pelo script de backfill.

### Listagem com `where` montado à mão

O `where`, o `orderBy` e a paginação da listagem são escritos à mão (`buildWhere`, `buildOrderBy`) porque
combinam o status pela relação 1:1 com `CameraOperationalSnapshot` (OFFLINE também casa snapshot ausente),
filtros JSON de `analyticsCapabilities`, PTZ mecânico ou digital, topologia por `trafficElementId IN` e uptime
agregado sobre os rollups, que o toolkit `list-query` de `@attlas/core-common` não cobre. A ordenação sempre
desempata por `id` para a página não repetir nem pular linhas.

### Marca, perfis de mídia, credenciais e remoção

- **Marca.** `ManufacturerResolverService.resolve` aceita UUID, nome ou code e registra a marca não
  catalogada; o `code` é derivado do nome (primeiro token, alfanumérico, maiúsculo, até 32 caracteres) e é
  único, então a corrida entre dois pedidos cai em P2002 e o perdedor relê o vencedor. O cadastro nunca
  responde 404 por marca.
- **Perfis de mídia.** `CameraMediaProfile` é o inventário bruto do equipamento (resolução, codec, qualidade,
  fps, GOP, perfil H264, áudio, PTZ), diferente de `CameraStreamProfile`, que é o que o player consome. É
  descoberto no cadastro e periodicamente pelo `CameraMediaProfileDiscoveryWorker` (câmeras `OPERATIONAL` e
  `TESTING`), com leitura ONVIF e fallback ISAPI; a rota só lê o que já foi descoberto. Só o cadastro e o
  reprovisionamento da edição ligam o ONVIF de uma Hikvision na descoberta.
- **Validação de credenciais.** Sondagem em lote com o mesmo limite de 50 do cadastro, para não esgotar
  sockets, acrescida da arquitetura ARTPEC e da compatibilidade do analítico embarcado. Não grava no banco, mas
  numa Hikvision com ONVIF desligado liga o ONVIF no equipamento. Detalhe da sondagem em
  [[Câmeras - Integração com dispositivo - Fluxos]].
- **Remoção.** Grava `deletedAt`, e as leituras filtram `deletedAt: null`. Não existe hard-delete nem rota de
  reativar por id: a reativação é o recadastro pelo mesmo IP.
- **Serialização.** `toCameraDetail` converte `Decimal` em número e `Date` em ISO, alinha `physicalCameraKind` e
  `cameraType` e acrescenta `streamTiers`, `analytics` e o aviso de provisionamento. No detalhe, `status` fica
  indefinido sem snapshot (a tela omite o selo até o WebSocket responder); na listagem, sem snapshot sai
  `OFFLINE`.

### Seed de desenvolvimento

O `database/seed.ts` cria três câmeras Axis da bancada num único sistema (`SEED_SYSTEM_ID`): demo `10.1.1.78`,
PTZ `10.1.1.79` e a do analítico embarcado `10.1.1.80`. Sem `SEED_CAMERA_PASSWORD` não grava credencial, e o
`source_id` do analítico vem de `SEED_ATMAN_EMBEDDED_SOURCE_ID`, nunca de constante versionada. O seed só grava
no banco, não fala com equipamento.

> [!warning] Divergência entre regra de negócio e código
> `docs/modules/cameras.md` diz que só o administrador transiciona o estado e que o sistema nunca transiciona
> sozinho (RF-CAM-02), e que o formulário de cadastro pede o estado inicial. No código, o wizard não manda
> `lifecycleState`, e o provisionamento promove a `OPERATIONAL` toda câmera em que achou perfil H264 ou H265;
> sem vídeo, ela fica `STOCK`. Com o campo enviado pela API, não há promoção. Nenhuma tela chama
> `PATCH /cameras/:id/state`.

## Armadilhas conhecidas

- **Ordem de limpeza dos filhos.** Recadastrar pelo IP de câmera removida falha com 409 de FK quando os presets
  são apagados antes dos tours; a ordem tours antes de presets é obrigatória em toda limpeza de filhos.
- **Esquema da URL do ONVIF.** A biblioteca ONVIF reconstrói o `GetStreamUri` com esquema `http://`; a sondagem
  força `rtsp://` de volta antes de gravar o perfil.
- **UUID de câmera inserida à mão.** Câmera inserida direto no banco precisa de UUID v4 válido
  (`gen_random_uuid()`): o gateway do analítico recusa id sem os bits de versão e a câmera nunca entra na sala
  do WebSocket.
- **`assertNotInStock` sem chamador.** O backend não bloqueia comando por estado; a confirmação fora de
  Operativa existe só no PTZ do VMS (ver [[Câmeras - PTZ e presets - Fluxos]]).
- **Estado inicial sem validação.** No cadastro pela API, `lifecycleState` aceita qualquer um dos quatro
  estados, sem passar pela máquina de transição.

## Glossário

| Termo | O que é |
| --- | --- |
| Sondagem | Conexão ONVIF (com fallback ISAPI) ao equipamento para ler marca, modelo, perfis, PTZ e analítico, sem gravar |
| Provisionamento | Gravação da credencial, dos perfis de stream e da promoção de estado e de PTZ a partir da sondagem |
| Perfil de stream | `CameraStreamProfile`, a URL e os parâmetros que o player usa, um por papel PRIMARY, SECONDARY e TERTIARY |
| Perfil de mídia | `CameraMediaProfile`, o inventário bruto de perfis que o equipamento declara |
| Reativação | Reuso da linha de câmera removida quando o mesmo IP é recadastrado no mesmo sistema |
| ACAP ATMAN | Aplicativo do analítico embarcado que roda na câmera Axis |
| ARTPEC | Família de chip das câmeras Axis; a arquitetura decide a compatibilidade do analítico embarcado |
| Espelho de câmeras | Cópia das câmeras no `ms-organization`, mantida pelo tópico de ciclo de vida |
