---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2212
epico: SOFTWARE-1899
frente: Dashboard de câmeras - backend
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: MERGEADA (22/07) - PR #822. Fundação MOD-013 compartilhada (dashboard + eventos); movida da Sprint 24 pra 25 em 20/07 porque os Eventos desta semana dependem dela. O merge destravou a semana.
pontos: 3
atualizado: 2026-07-22
pr: https://github.com/atmanadmin/attlas-2026/pull/822
---

# SOFTWARE-2212 - Fundação do dashboard de câmeras: resolver de período/escopo

Fundação compartilhada do backend das telas de Dashboard e Eventos. 1 PR.

## SPEC-ms-cameras
Bootstrap do `SPEC.md` do serviço (SDD; `ms-cameras` ainda não tem SPEC), cobrindo os módulos de dashboard e eventos cross-câmera.

## Resolver de período/escopo
`IDashboardQueryParams { period, scope }`, reusado por todos os endpoints de dashboard:
- **Período** (`EnumDashboardPeriod` HOUR/H24/D7/D30) -> janela de tempo + granularidade de bucket. Molde por-câmera em `health/handlers/get-camera-health-metrics/health-range.ts` (`resolveHealthRange`); generalizar pra multi-câmera.
- **Escopo** (`IDashboardScope { areas, subareas, routes, intersections }`): câmera NÃO tem coluna de área/subárea. Vínculo = `Camera.trafficElementId` (Uuid) -> NODE do ms-traffic-model. Resolver = `ITopologyNodeIdsClient.resolveNodeIds(polygonId, systemId, bearer)` (`cameras/clients/i-topology-node-ids.client.ts`) e filtrar `Camera.trafficElementId IN (...)`. Molde: `list-cameras.handler.ts` (UC-025).
- Comparação: escopo com >= 2 entidades dispara `byScope`/multi-série.

## Validação aberta
Contrato tem dimensão `routes`, mas "rota" NÃO existe modelada em ms-cameras (só área -> subárea -> NODE). Decidir: ignorar ou mapear.

Frente: [[Dashboard de câmeras - backend]]. Épico ClickUp SOFTWARE-1899 · card SOFTWARE-2212.

## Progresso (2026-07-16)

Implementado em worktree isolada `cameras/feat/SOFTWARE-2212` (branch sobre develop, sem commit/push ainda). Build + lint de ms-cameras passam (0 erros, 0 warnings novos).

Duas correções à premissa do card:
- **ms-cameras JÁ TEM SPEC.md** (estava `completed`). Não é bootstrap greenfield: reabri o SPEC (status -> in-implementation) e criei o MOD-013 novo.
- **Os ~35 contratos de dashboard JÁ EXISTEM** em `libs/contracts/src/lib/camera/dashboard/`. Só consumi, não criei nada.

Decisões (confirmadas):
- **routes**: no-op documentado. Resolver aceita, joga em `unsupportedRoutes` e não resolve.
- **INTERSECTION**: id já é o `trafficElementId` (o NODE é a interseção), usa direto sem bater na topologia. Só AREA/SUBAREA (polígonos) vão ao `resolveNodeIds`.
- **Redis**: cache fino best-effort da resolução polígono->nodeIds (chave tenant-scoped, TTL `DASHBOARD_TOPOLOGY_CACHE_TTL_SECONDS`=300). Miss/queda cai pro live.

Arquivos: `apps/ms-cameras/src/dashboard/shared/` (period resolver + scope resolver + cliente cacheado + DTO + module + specs), `docs/modules/MOD-013-dashboard-aggregation.md`, edições em `docs/SPEC.md` e `.env.example`. Sem endpoint (é fundação; widgets ficam nos cards 2213-2219).
