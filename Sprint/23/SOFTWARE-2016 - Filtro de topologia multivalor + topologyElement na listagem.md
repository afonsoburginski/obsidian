---
tags:
  - attlas
  - sprint-23
  - task
  - cameras
  - topologia
card: SOFTWARE-2016
clickup: https://app.clickup.com/t/86ajcbx7k
titulo: "[Back] Cameras: filtro de topologia multivalor + topologyElement na listagem"
frente: Cameras / Topologia
tamanho: a estimar
status: backlog
sprint: "[[Attlas - Sprint 23]]"
atualizado: 2026-07-03
---

# Filtro de topologia multivalor + topologyElement na listagem

> Tarefa 8. Contraparte de backend da **SOFTWARE-1893** (front do filtro de topologia do videowall, PR #643). O front foi codificado contra o contrato ideal; o `ms-cameras` ainda ignora os campos novos e devolve a lista inteira. Origem: review da PR #643.

## Contexto

Os contratos já existem em `@attlas/contracts` (opcionais, não quebram nada): `areaIds`/`subareaIds`/`intersectionIds` em `IListCamerasFilters`; `topologyElement` (`ITopologyElementRef`) em `IListCameraItem`. Falta o `ms-cameras` atender.

## Escopo

- [ ] Estender UC-025 pra aceitar `areaIds`/`subareaIds` (multivalor) + `intersectionIds` novo (filtro direto `trafficElementId IN (...)`).
  - `areaIds`/`subareaIds`: resolve os nós via drill-down no `ms-traffic-model`; cada área multiplica as chamadas `1+N` (atenção a custo).
  - Composição: `intersectionIds` compõe em `AND` com área/subárea; manter `subareaId` acima de `areaId` (precedente UC-025).
- [ ] Popular `topologyElement` por item: lookup reverso `Camera.trafficElementId` → `{id,name,type}` no `ms-traffic-model`. Pra N câmeras é **N+1** → precisa de endpoint batch no traffic-model (resolver vários node ids de uma vez).
- [ ] Confirmar o modelo de agrupamento com o front: `trafficElementId` de câmera é sempre `NODE`, então `topologyElement.type` seria sempre `NODE`; agrupar por área/subárea exigiria os ancestrais do nó.
- [ ] Escopo por `systemId` (liga com [[SOFTWARE-2007 - Revisar uso de systemId em rotas de API]]).
- [ ] Spec (extensão de UC-025) + testes (suíte completa).

## Ligado a

- PR #643 (front, Draft aguardando este backend).
- [[SOFTWARE-2007 - Revisar uso de systemId em rotas de API]].
