---
tags:
  - attlas
  - sprint-22
  - task
  - topologia
card: SOFTWARE-1920
titulo: "[Back] Busca de câmeras por topologia (área / subárea)"
frente: Topologia
tamanho: Pequena
pr: 574
pr_url: https://github.com/atmanadmin/attlas-2026/pull/574
branch: cameras/feat/SOFTWARE-1920
status: MERGED
clickup_status: Closed
merged: 2026-07-01
clickup: https://app.clickup.com/t/86aj9aw22
sprint: "[[Attlas - Sprint 22]]"
---

# SOFTWARE-1920 — Busca de câmeras por topologia (área / subárea)

> Tarefa 2. **PR [#574](https://github.com/atmanadmin/attlas-2026/pull/574) MERGEADA (01/07)** · ClickUp **Closed**. Pequena e isolada.

Filtrar e buscar câmeras por área e subárea, cuja topologia vive no **ms-traffic-model**.

## Contexto

- ms-traffic-model é dono da topologia: `GET /api/traffic-model/topology` (raiz) e `GET /api/traffic-model/topology/:type/:id` (área → subárea → nó → câmeras). Associação nó↔câmera vive lá (tabela `NodeCamera`).
- Em ms-cameras a `Camera` só tem `trafficElementId` (id do nó), sem área/subárea. Existe `@@index([trafficElementId])`.
- Antes disto não existia HTTP client ms-cameras → ms-traffic-model (só o reverso).

## Objetivo

`GET /api/cameras` filtrável por `areaId`/`subareaId`. Spec **UC-025**.

## Entregue (#574)

- [x] **Opção A:** filtro `areaId`/`subareaId` no list-cameras. ms-cameras chama ms-traffic-model para resolver os node ids sob a área/subárea e filtra `trafficElementId IN (...)`.
  - [x] Novo HTTP client ms-cameras → ms-traffic-model (espelha o `CamerasHttpClient` inverso).
  - [x] Query params `areaId`/`subareaId` no list-cameras (handler / query / dto). **`subareaId` prevalece** sobre `areaId`.
  - [x] `where trafficElementId in (...)` no `cameras.repository`.
  - [x] Resiliência **fail-closed**: `ExternalServiceException` (502) se o traffic-model cair.
- [x] Escopo `systemId` + contadores do videowall.
- [x] Reusados utilitários de contrato (`IPaginatedResponse`, paginação/sorting).
- Opção B descartada (o pedido é busca por área/subárea na listagem).
