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

# Cameras — Requisitos e SLA

> Parte do domínio [[00 - Cameras]] · [[ms-cameras - visão geral]]. Ver [[Cameras - Arquitetura e estratégias]] e [[Cameras - Fluxos]].

Cobertura dos requisitos de `docs/modules/cameras.md` por este domínio (cadastro e ciclo de vida) e o estado real na implementação. Legenda: **Implementado** · **Parcial** · **Frontend** (requisito de UX fora desta camada backend).

## Requisitos funcionais

| ID | Critério (domínio) | Estado na implementação |
| --- | --- | --- |
| RF-CAM-01 | Cadastrar, listar, editar e remover câmeras com atributos técnicos | **Implementado** — CRUD completo (create batch, list c/ filtros, get, patch parcial, soft-delete). Ressalva: `CameraType` só tem `PTZ`/`FIXED`; "analítica"/"térmica" ficam em `analyticsCapabilities` (JSON), não como tipo. Codec (RNF-CAM-05) é `videoCodec` string livre no cadastro |
| RF-CAM-02 | 4 estados, transição só manual; sistema nunca transiciona sozinho; estados ≠ Operativa exigem warning | **Implementado** (transição manual + máquina de estados; nasce em STOCK). Warning (RNF-CAM-10) → **Frontend** |
| RF-CAM-06 | Stream primário/secundário com codec/resolução/fps/bitrate configuráveis por stream | **Parcial** — model `CameraStreamProfile` existe (papel + config independente por stream), mas a **configuração não faz parte deste CRUD**; é feita na integração ONVIF/streaming ([[00 - Streaming]] / [[00 - Integração com dispositivo]]) |
| RF-CAM-07 | Substituição com herança (localização, presets PTZ, cenas VW); cenas atualizadas automaticamente; substituição registrada | **Implementado** (herança + velha→STOCK + `replacedByCameraId`). O registro permanente é RNF-CAM-13 (parcial, abaixo) |
| RF-CAM-08 | Câmera no mapa com ícone/cone/tooltip; operável em ≤2 cliques | **Parcial** — backend persiste e devolve `latitude`/`longitude`/`address`/`intersection` (list + batch-get). Ícone/cone/tooltip e ≤2 cliques → **Frontend** (mapa/Painel de Operações) |
| RF-INT-07 | Consulta em lote: valida existência (qualquer estado, não removida) + dados de exibição, sem efeito colateral | **Implementado** — `POST /cameras/validate` (existência, 204/404) e `POST /cameras/batch-get` (exibição); dedup, escopo tenant, `deletedAt: null`, qualquer ciclo de vida |

## Requisitos não-funcionais

| ID | Critério (domínio) | Estado na implementação |
| --- | --- | --- |
| RNF-CAM-01 | Rede cresce sem interrupção nem redesign (escalabilidade) | **Parcial/arquitetural** — paginação, batch atômico e índices (`lifecycleState`, `manufacturerId`, `trafficElementId`) suportam crescimento; escala horizontal de fato é infra (RKE2/Helm), fora do código do domínio |
| RNF-CAM-06 | Toda ação de operador registrada com timestamp + identidade | **Parcial** — logs estruturados com `cameraId` e `from`/`to`; **operador não é capturado** em CRUD/state/replace/delete (só em comandos PTZ). Sem trilha de auditoria dedicada nesta camada |
| RNF-CAM-07 | Stream/PTZ/preset em ≤2 cliques a partir do mapa | **Frontend** — condiciona popup do mapa e Painel de Operações; fora desta camada backend |
| RNF-CAM-10 | Comandos em câmera fora de "Operativa" exigem confirmação explícita | **Frontend** — o backend define o estado; a confirmação é aplicada no cliente. O guard `assertNotInStock` existe no código mas **não tem callers** |
| RNF-CAM-13 | Histórico de substituições permanente e íntegro, com metadados herdados, timestamp e operador | **Parcial** — só o ponteiro `replacedByCameraId` + `updatedAt`; **sem** tabela de histórico dedicada, **sem** operador capturado, evento `attlas.cameras.replaced` é TODO (PROJ-002) |

## Regras de domínio

- **4 estados / máquina** — `STOCK ↔ TESTING ↔ IN_FIELD ↔ OPERATIONAL` (cadeia linear bidirecional; tabela em [[00 - Cameras]]). Toda câmera nasce em `STOCK` (forçado no mapper). Transição fora do mapa → 409 `INVALID_STATE_TRANSITION`.
- **Warnings (RNF-CAM-10)** — obrigatórios no frontend para comandos operacionais em câmera fora de "Operativa"; backend não bloqueia.
- **Herança na substituição (RF-CAM-07)** — nova herda localização + presets PTZ default + cenas do Video Wall; velha → STOCK com `replacedByCameraId`.
- **Rastreabilidade (RNF-CAM-06/13)** — parcial: falta operador em CRUD/lifecycle/replace e trilha permanente de substituição.
- **Multi-tenant** — escopo `systemId` sempre do header `System-Id` (fail-closed); autorização de pertencimento é do módulo Permissões (RF-INT-06), não desta camada.
- **Soft-delete** — `deletedAt`; câmera deletada some das listagens (404 no GET/:id) mas permanece no banco.
- **Marca não catalogada** — auto-registrada no cadastro (nunca 404 por marca desconhecida; decisão SOFTWARE-1195).

## SLA e qualidade

- **Batch**: `POST /cameras` e `POST /cameras/validate-credentials` limitados a **50** itens (`MAX_BATCH_SIZE`); o create é atômico (`$transaction`). `validate`/`batch-get` aceitam até ~200 UUIDs.
- **Probe ONVIF**: timeout de **10s** por credencial validada.
- **Latência esperada** (MOD-001 §8, tabela ≤5.000 linhas): `GET /cameras` < 100ms p99 (SELECT + LEFT JOIN em `operationalSnapshot`, apoiado no índice `lifecycleState`); `POST`/`PATCH`/`DELETE` < 100ms p99.
- **Erros → HTTP** (via `AllExceptionsFilter`): `BATCH_LIMIT_EXCEEDED` 400 · `RESOURCE_NOT_FOUND` 404 · `INVALID_STATE_TRANSITION`/`CAMERA_SELF_REPLACE` 409 · P2002/P2025 tratados pelo filtro global. `errorCode` é estável (nunca traduzido); `message` é traduzível via `translationKey`.
- **Métricas Prometheus**: `cameras_created_total`, `cameras_state_transitions_total{from,to}`, `cameras_soft_deleted_total`.

## Referências

- Contexto de negócio: `docs/modules/cameras.md` (RF-*/RNF-*).
- Spec do módulo: `apps/ms-cameras/docs/modules/MOD-001-cameras-crud.md`; atômicas `UC-001..006`, `UC-012/013/015/018/019/020`.
- Código: `src/cameras/` (controller, handlers, repositories, services, helpers, mappers).
