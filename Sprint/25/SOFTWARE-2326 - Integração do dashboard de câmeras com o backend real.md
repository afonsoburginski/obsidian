---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2326
epico: SOFTWARE-1899
frente: Dashboard de câmeras - backend
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: Closed
pontos: a estimar
atualizado: 2026-07-28
---

# SOFTWARE-2326 - Integração do dashboard de câmeras com o backend real

Virada de mock pra HTTP real da tela de Dashboard de câmeras, análoga à SOFTWARE-2289 dos Eventos
(#951). Continuação da PR #1054 (que mergeou por engano só a spec CROSS-040). PR
[#1058](https://github.com/atmanadmin/attlas-2026/pull/1058), **mergeada em 25/07 22:11**.

## O que entrou

Com os 7 backends do dashboard (2213-2219, PRs #856-863) mergeados no mesmo dia, a integração foi
além da virada básica - no dia 25/07, em sequência: os **16 métodos** do `CamerasDashboardService`
ligados a `/api/dashboard/*` (mock apagado), tabelas de conectividade no backend real, fixes de
review, e um adicional que não estava no escopo original: **atualização em tempo real via
Socket.IO com adapter Redis** (`redis-io.adapter.ts`, `camera-status.gateway.ts`,
`dashboard-invalidation.publisher.ts` no `ms-cameras`) - o dashboard invalida/refaz o fetch sozinho
quando o dado muda, sem precisar de refresh manual. Mapa, capacidades e degradação foram religados
ao backend real no mesmo lote.

Depois disso, mais trabalho incremental: scope filter coerente + gráfico de disponibilidade
empilhado (21/07), ajustes de UI (abas, sparklines, expand em modal).

## Estado real vs. o que eu tinha registrado antes

Nesta sessão eu retomei o trabalho a partir de um resumo de conversa que ainda achava a PR #1058
aberta e o front parcialmente ligado - o resumo tinha ficado "congelado" num ponto anterior ao
merge. Fiz de novo (numa branch cuja PR já tinha sido fechada) uma versão simplificada da mesma
virada, sem saber que o trabalho real já tinha avançado muito mais (incluindo o real-time). Esse
retrabalho ficou órfão na branch remota `cameras/feat/SOFTWARE-2326-2` (2 commits acima do merge
da PR), sem PR aberta - não deve ser mesclado, é redundante.

**Pendência real remanescente**: e2e visual pela tela (clique-a-clique), que depende do Kong do
ambiente `dev.v2` estar sincronizado com a develop (ver [[SOFTWARE-2318 - Dashboard de câmeras - validação E2E de dados|SOFTWARE-2318]],
que já validou os 13 endpoints via API+banco em 27/07).

Frente: [[Dashboard de câmeras - backend]]. Épico SOFTWARE-1899.

---
**Spec** `docs/specs/cross-service/CROSS-040-cameras-dashboard-fullstack-integration.md` · **PR**
[#1058](https://github.com/atmanadmin/attlas-2026/pull/1058) (**MERGEADA** 25/07) · **ClickUp** Closed
