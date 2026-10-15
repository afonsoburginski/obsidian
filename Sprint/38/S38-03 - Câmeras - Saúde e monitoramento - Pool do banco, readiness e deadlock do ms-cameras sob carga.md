---
id: S38-03
tags:
  - attlas
  - task
  - sprint-38
  - cameras
  - saude
  - backend
  - infraestrutura
titulo: "[Full] ms-cameras sem readiness caindo por banco lento: pool dimensionado e deadlock do snapshot resolvido"
frente: Saúde e monitoramento
tamanho: 5
pr: "-"
status: "Planejada em 15/10. Depende da S38-02. Sem spec e sem PR."
sprint: "[[Attlas - Sprint 38]]"
atualizado: 2026-10-15
---

# S38-03 - Câmeras - Saúde e monitoramento - Pool do banco, readiness e deadlock do ms-cameras sob carga

## O que está errado

O `/health/ready` do `ms-cameras` falha porque o ping do banco passa de 3000 ms. Com a readiness falhando, o
Kubernetes tira o pod do Service e as chamadas ao serviço, inclusive o `GET /api/cameras/:id/status`, voltam
erro até a próxima sonda passar.

| Sinal | Medido em 15/10 |
| --- | --- |
| `Health Check has failed`, `database` com `timeout of 3000ms exceeded` | 41 em 60 minutos; 23 nos 20 minutos depois do pod estabilizar |
| Deadlock e conflito de escrita no upsert de `cameraOperationalSnapshot` (`CameraHealthWorker`) | 1 de cada nos mesmos 20 minutos |
| `DATABASE_POOL_MAX` no pod | não definido, então vale o padrão do `pg` (10 conexões) |
| Conexões no `db-cameras` | 11 (5 ativas, 6 ociosas), com `max_connections` 100 |

O ping vive em `apps/ms-cameras/src/system-health/cameras-system-health.controller.ts`, linha 44. O
`DATABASE_POOL_MAX` já é lido pelo `PrismaService` do `@attlas/core-common` (`database-pool-max.ts`).

## Hipótese a confirmar

O pool de 10 conexões fica cheio: o housekeeping da S38-02 segura uma por até 8 s a cada minuto, o worker de
saúde grava um snapshot por câmera e o ping da readiness entra na fila atrás deles. Confirmar amostrando o
`pg_stat_activity` e o tempo de espera do pool depois da S38-02 entrar.

## O que a task entrega

- Medição do pool depois da S38-02, para decidir o valor com número e não por chute.
- `DATABASE_POOL_MAX` do `ms-cameras` definido no GitOps do dev e documentado no `.env.example`.
- Upsert do snapshot sem deadlock: ordem de escrita fixa por câmera ou nova tentativa no conflito, com teste
  de integração que reproduz duas escritas concorrentes.
- Decisão registrada sobre a readiness: ou o ping do banco sai da readiness, ou ganha prazo próprio. A regra
  de readiness com consumer Kafka fica na S38-04.

## Estado

Planejada. Falta a spec atômica. Duas PRs: GitOps (pool) e código (deadlock e readiness).
