---
tags:
  - attlas
  - sprint-25
  - moc
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: em andamento - troca de escopo em 20/07: Dashboard (2213-2219) voltou pro backlog; foco = backend da tela de Eventos de câmeras. Lista+detalhe já entregues pelo UC-032 (#803, lucas); resta stats/timeline/recurrence/campos-filtros (2220-2223, to do). Fixes 2271 (mergeado) e 2272 (em review) também na semana
atualizado: 2026-07-20
---

# Attlas - Sprint 25

Foco: **backend da tela de Eventos de câmeras** (`/api/cameras/events/*`). Mudança de plano em 20/07 - o Dashboard de câmeras (2213-2219) saiu desta semana e voltou pro backlog. A **lista e o detalhe cross-câmera já foram entregues** pelo UC-032 (SOFTWARE-1914, PR #803, lucas) e o front consome sem mock; a semana é o que sobra: stats, timeline, recurrence e os campos/filtros reais da lista/detalhe. Backend-only, 1 card = 1 PR.

A fundação **2212** (MOD-013, PR #822 APPROVED aguardando merge) foi movida da Sprint 24 pra cá em 20/07 - os endpoints de eventos reusam o resolver de período/escopo e o `SPEC-ms-cameras` que ele bootou. O merge dele destrava a semana.

## Cards (1 PR cada) - esta semana

Base lista+detalhe já entregue pelo UC-032 (#803). O que sobra:

| Card | Escopo | Existe / falta | Pts |
| --- | --- | --- | --- |
| [[SOFTWARE-2220 - Eventos câmeras - campos reais + filtros\|2220]] | campos reais + filtros da lista/detalhe | area/subarea via topologia, honrar filtros ignorados (area/subarea/origin/state/status), status/triggerCount reais | 5 |
| [[SOFTWARE-2221 - Eventos câmeras - stats\|2221]] | `/events/stats` (total/critical/warning/info + trend) | nada existe; `COUNT GROUP BY severity` no mesmo `where` da lista + trend | 3 |
| [[SOFTWARE-2222 - Eventos câmeras - timeline + acionamentos\|2222]] | `/events/:id/timeline` + `triggeredActions` INCIDENT | timeline do evento não existe; `triggeredActions` devolve `[]` (só INCIDENT viável) | 5 |
| [[SOFTWARE-2223 - Eventos câmeras - recorrência\|2223]] | `/events/:id/recurrence?period=` | nada; agregação bucketizada por período | 3 |
| **Total** | | | **16** |

Draft PRs (spec-only UC-*, base develop): 2220 [#899](https://github.com/atmanadmin/attlas-2026/pull/899) (UC-043), 2221 [#895](https://github.com/atmanadmin/attlas-2026/pull/895) (UC-040), 2222 [#896](https://github.com/atmanadmin/attlas-2026/pull/896) (UC-041), 2223 [#897](https://github.com/atmanadmin/attlas-2026/pull/897) (UC-042).

Frente e mapa de reuso: [[Eventos de câmeras - backend]].

## Condicional / backlog

- [[SOFTWARE-2224 - Eventos câmeras - observações + reportar (condicional)]] - segue backlog: depende de Incidents/Inventário (adiados), botão desabilitado no front.
- **Dashboard de câmeras (2213-2219)** - voltou pro backlog em 20/07. Specs UC-033..039 e os 7 draft PRs (#856-863) seguem abertos, prontos pra retomar. Frente: [[Dashboard de câmeras - backend]].
- SOFTWARE-2200 (analítico desacoplado) e SOFTWARE-2201 (videowall externo) - backlog, sem prazo.

## Fixes da semana

- SOFTWARE-2271 (#885, mergeado) - guarda de sistema selecionado nas rotas system-scoped (fecha o 400 de system-id ausente). Destravei o build de produção que quebrava por import órfão no videowall antes de mergear.
- SOFTWARE-2272 (#888, em review) - semeia os 3 tópicos Kafka faltantes no seed do deploy (AD do ms-audit + analytics do ms-cameras).

## Processo (SDD + gate)

- 1 atômica = 1 PR; gate completo do serviço (`nx test/lint/build`), não só affected; 0 erros de lint.
- PR base `develop`. Sem `HttpException`/`Error` crus. CI antes do deploy.
- Specs em `apps/ms-cameras/docs/atomic/`; fundação compartilhada MOD-013 (2212).
