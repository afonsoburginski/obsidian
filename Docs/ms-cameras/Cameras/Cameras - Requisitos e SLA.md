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

# Cameras - Requisitos e SLA

> Parte do domínio [[Cameras]] · [[ms-cameras]]. Ver [[Cameras - Arquitetura e estratégias]] e [[Cameras - Fluxos]].
>
> [!info] Nota de 24/08: RF-CAM-06 revisto, BR-CRUD-009 adicionada
> RF-CAM-06 estava marcado **Parcial** com a justificativa de que a config de stream "não faz parte
> deste CRUD"; SOFTWARE-2226 (fim de julho) mudou isso - o `POST /cameras` hoje provisiona
> `CameraStreamProfile` inline via probe ONVIF/ISAPI. Reclassificado abaixo. `BR-CRUD-009` (IP único +
> reativação de soft-deleted, PR #1137) também entra nesta revisão.

Cobertura dos requisitos de `docs/modules/cameras.md` por este domínio (cadastro e ciclo de vida) e o estado real na implementação. Legenda: **Implementado** · **Parcial** · **Frontend** (requisito de UX fora desta camada backend).

## Requisitos funcionais

| ID | Critério (domínio) | Estado na implementação |
| --- | --- | --- |
| RF-CAM-01 | Cadastrar, listar, editar e remover câmeras com atributos técnicos | **Implementado** - CRUD completo (create batch, list c/ filtros incl. uptime, get, patch parcial, soft-delete). Ressalva: `CameraType` só tem `PTZ`/`FIXED`; "analítica"/"térmica" ficam em `analyticsCapabilities` (JSON), não como tipo. Codec (RNF-CAM-05) é `videoCodec` string livre no cadastro |
| RF-CAM-02 | 4 estados, transição só manual; sistema nunca transiciona sozinho; estados ≠ Operativa exigem warning | **Implementado** (transição manual + máquina de estados; nasce em STOCK). Warning (RNF-CAM-10) → **Frontend** |
| RF-CAM-06 | Stream primário/secundário com codec/resolução/fps/bitrate configuráveis por stream | **Implementado, corrigido em 24/08** - `POST /cameras` provisiona `CameraStreamProfile` (por papel, com codec/resolução/fps) **inline**, via probe ONVIF/ISAPI (`CameraProvisioningService.provisionFromProbe`, SOFTWARE-2226) - não é mais uma etapa de integração separada do CRUD. A nota anterior descrevia o estado pré-SOFTWARE-2226. Reconfiguração manual de um stream já provisionado continua em [[Streaming]] / [[Integração com dispositivo]] |
| RF-CAM-07 | Substituição com herança (localização, presets PTZ, cenas VW); cenas atualizadas automaticamente; substituição registrada | **Implementado** (herança + velha→STOCK + `replacedByCameraId`). O registro permanente é RNF-CAM-13 (parcial, abaixo). Confirmado em 24/08: sem mudança desde 03/07 |
| RF-CAM-08 | Câmera no mapa com ícone/cone/tooltip; operável em ≤2 cliques | **Parcial** - backend persiste e devolve `latitude`/`longitude`/`address`/`intersection` (list + batch-get + `PUT /cameras/locations` em lote). Ícone/cone/tooltip e ≤2 cliques → **Frontend** (mapa/Painel de Operações) |
| RF-INT-07 | Consulta em lote: valida existência (qualquer estado, não removida) + dados de exibição, sem efeito colateral | **Implementado** - `POST /cameras/validate` (existência, 204/404) e `POST /cameras/batch-get` (exibição); dedup, escopo tenant, `deletedAt: null`, qualquer ciclo de vida |

Fora do `docs/modules/cameras.md` mas dentro deste domínio: `GET /cameras/:id/media-profiles` (UC-031, card 2008) serve o inventário ONVIF/ISAPI **descoberto** de perfis de mídia - é device-truth de leitura, não regra de negócio nova sobre a entidade `Camera`; contrato já existente (`camera-media-profile`), sem RF próprio no módulo. Ver [[Cameras - Arquitetura e estratégias]].

## Requisitos não-funcionais

| ID | Critério (domínio) | Estado na implementação |
| --- | --- | --- |
| RNF-CAM-01 | Rede cresce sem interrupção nem redesign (escalabilidade) | **Parcial/arquitetural** - paginação, batch atômico e índices (`lifecycleState`, `manufacturerId`, `trafficElementId`, `(systemId, ipAddress)`) suportam crescimento; escala horizontal de fato é infra (RKE2/Helm), fora do código do domínio |
| RNF-CAM-06 | Toda ação de operador registrada com timestamp + identidade | **Parcial** - logs estruturados com `cameraId` e `from`/`to`; **operador não é capturado** em CRUD/state/replace/delete (só em comandos PTZ). Sem trilha de auditoria dedicada nesta camada |
| RNF-CAM-07 | Stream/PTZ/preset em ≤2 cliques a partir do mapa | **Frontend** - condiciona popup do mapa e Painel de Operações; fora desta camada backend |
| RNF-CAM-10 | Comandos em câmera fora de "Operativa" exigem confirmação explícita | **Frontend** - o backend define o estado; a confirmação é aplicada no cliente. O guard `assertNotInStock` existe no código mas **não tem callers** |
| RNF-CAM-13 | Histórico de substituições permanente e íntegro, com metadados herdados, timestamp e operador | **Parcial** - só o ponteiro `replacedByCameraId` + `updatedAt`; **sem** tabela de histórico dedicada, **sem** operador capturado, evento `attlas.cameras.replaced` é TODO (PROJ-002). Confirmado em 24/08: sem mudança desde 03/07 |

## Regras de domínio

- **4 estados / máquina** - `STOCK ↔ TESTING ↔ IN_FIELD ↔ OPERATIONAL` (cadeia linear bidirecional; tabela em [[Cameras]]). Toda câmera nasce em `STOCK` (forçado no mapper). Transição fora do mapa → 409 `INVALID_STATE_TRANSITION`.
- **Warnings (RNF-CAM-10)** - obrigatórios no frontend para comandos operacionais em câmera fora de "Operativa"; backend não bloqueia.
- **Herança na substituição (RF-CAM-07)** - nova herda localização + presets PTZ default + cenas do VMS; velha → STOCK com `replacedByCameraId`.
- **IP único por tenant + reativação (BR-CRUD-009, PR #1137)** - `ipAddress` é único entre câmeras **ativas** do mesmo `systemId` (checagem de aplicação + índice único parcial `Camera_active_ip_unique`, `WHERE deletedAt IS NULL`). Recadastrar um IP que pertencia a uma câmera soft-deleted **reativa** essa linha (preserva histórico) em vez de criar uma nova; os filhos da encarnação anterior (snapshot, presets/tours PTZ, stream profiles) são limpos antes de repovoar. `errorCode: CAMERA_DUPLICATE_IP` no create e no update.
- **Provisionamento no cadastro (SOFTWARE-2226)** - `POST /cameras` já grava `CameraCredential` + `CameraStreamProfile` via probe ONVIF/ISAPI, sem etapa de ativação separada; ver RF-CAM-06 acima.
- **Rastreabilidade (RNF-CAM-06/13)** - parcial: falta operador em CRUD/lifecycle/replace e trilha permanente de substituição.
- **Multi-tenant (`systemId`)** - escopo sempre do header `System-Id` (fail-closed); centralizado em `CameraTenancyService.assertCameraInSystem` para mutações/PTZ/presets/automations, filtro direto no `where` para leituras/listagens (`MOD-011-tenant-scoping.md`). Autorização de pertencimento é do módulo Permissões (RF-INT-06), não desta camada.
- **Soft-delete** - `deletedAt`; câmera deletada some das listagens (404 no GET/:id) mas permanece no banco.
- **Marca não catalogada** - auto-registrada no cadastro (nunca 404 por marca desconhecida; decisão SOFTWARE-1195).
- **Listagem sem toolkit `list-query`** - `where`/`orderBy` de `GET /cameras` continuam escritos à mão (`CamerasRepository.buildWhere`/`buildOrderBy`), de propósito: combinam derivações não triviais (relação 1:1, JSON path, uptime agregado) que o toolkit CROSS-027 não cobre. Confirmado ainda válido em 24/08.

## SLA e qualidade

- **Batch**: `POST /cameras` e `POST /cameras/validate-credentials` limitados a **50** itens (`MAX_BATCH_SIZE`); o create é atômico (`$transaction`). `validate`/`batch-get` aceitam até ~200 UUIDs.
- **Probe ONVIF**: timeout de **10s** por credencial validada (mesmo timeout no probe standalone e no provisionamento inline do create).
- **Latência esperada** (MOD-001 seção 8, tabela ≤5.000 linhas): `GET /cameras` < 100ms p99 (SELECT + LEFT JOIN em `operationalSnapshot`, apoiado no índice `lifecycleState`); `POST`/`PATCH`/`DELETE` < 100ms p99.
- **Erros → HTTP** (via `AllExceptionsFilter`): `BATCH_LIMIT_EXCEEDED` 400 · `RESOURCE_NOT_FOUND` 404 · `INVALID_STATE_TRANSITION`/`CAMERA_SELF_REPLACE` 409 · `CAMERA_DUPLICATE_IP` 422 (create/update, BR-CRUD-009) · P2002/P2025 tratados pelo filtro global. `errorCode` é estável (nunca traduzido); `message` é traduzível via `translationKey`.
- **Métricas Prometheus**: `cameras_created_total`, `cameras_state_transitions_total{from,to}`, `cameras_soft_deleted_total`.

## Referências

- Contexto de negócio: `docs/modules/cameras.md` (RF-*/RNF-*).
- Spec do módulo: `apps/ms-cameras/docs/modules/MOD-001-cameras-crud.md`; atômicas `UC-001..006`, `UC-012/013/015/018/019/020`.
- Tenant scoping: `apps/ms-cameras/docs/modules/MOD-011-tenant-scoping.md` (card SOFTWARE-2007/1920).
- Perfis de mídia: `apps/ms-cameras/docs/modules/MOD-012-camera-media-profiles.md`, `apps/ms-cameras/docs/atomic/UC-031-list-camera-media-profiles.md` (card SOFTWARE-2008).
- Código: `src/cameras/` (controller, handlers, repositories, services, helpers, mappers).
