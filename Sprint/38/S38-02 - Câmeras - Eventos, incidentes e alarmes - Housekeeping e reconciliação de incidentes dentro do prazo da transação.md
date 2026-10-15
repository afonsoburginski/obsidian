---
id: S38-02
tags:
  - attlas
  - task
  - sprint-38
  - cameras
  - incidentes
  - backend
titulo: "[Back] Housekeeping da correlação e reconciliação de incidentes do ms-cameras sem transação expirada"
frente: Eventos, incidentes e alarmes
tamanho: 3
pr: "-"
status: "Planejada em 15/10. Sem spec e sem PR."
sprint: "[[Attlas - Sprint 38]]"
atualizado: 2026-10-15
---

# S38-02 - Câmeras - Eventos, incidentes e alarmes - Housekeeping e reconciliação de incidentes dentro do prazo da transação

## O que está errado

Dois jobs agendados do `ms-cameras` falham quase todo minuto no dev, fora de qualquer deploy.

| Job | Erro | Medido em 15/10 |
| --- | --- | --- |
| `CorrelateEventsListener.housekeeping` (cron de 1 minuto) | `A commit cannot be executed on an expired transaction`: limite de 5000 ms, levou 7944 ms | 24 em 60 minutos; 15 nos 20 minutos depois do pod estabilizar |
| `AnalyticsIncidentReconciliationJob.run` | `Unable to start a transaction in the given time` | 1 em 60 minutos; 7 nos 20 minutos seguintes |

## Causa no código

- `apps/ms-cameras/src/events/consumers/correlate-events/correlate-events.listener.ts`, linhas 55 a 73: o
  `$transaction` interativo envolve o `runHousekeeping()` inteiro só para segurar o
  `pg_try_advisory_xact_lock`. Usa o timeout padrão do Prisma (5000 ms), e o lote todo precisa caber nele.
  Enquanto roda, a transação prende uma conexão do pool.
- `apps/ms-cameras/src/events/reconciliation/analytics-incident-reconciliation.job.ts`: o "Unable to start"
  é estouro do `maxWait`, ou seja, o pool estava sem conexão livre. É o mesmo pool que o housekeeping
  segura (ver [[S38-03 - Câmeras - Saúde e monitoramento - Pool do banco, readiness e deadlock do ms-cameras sob carga|S38-03]]).

## O que a task entrega

- O housekeeping decide quem roda pelo lock sem prender o lote inteiro numa transação interativa: lote
  paginado, cada página na sua transação curta, ou lock de sessão liberado no fim.
- Timeout e `maxWait` dos dois jobs em constantes nomeadas, como já faz `camera-event-treatment.constants.ts`.
- Teste de integração que falha no código atual: housekeeping com lote maior que cabe em 5000 ms.

## Fora do escopo

O tamanho do pool e a readiness, que ficam na S38-03. Esta task vem antes porque pode ser ela que esgota o
pool.

## Estado

Planejada. Falta a spec atômica (`PROJ-*`, pois é job agendado).
