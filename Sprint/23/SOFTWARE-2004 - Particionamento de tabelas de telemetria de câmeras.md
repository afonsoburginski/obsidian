---
tags:
  - attlas
  - sprint-23
  - task
  - banco
  - telemetria
card: SOFTWARE-2004
clickup: https://app.clickup.com/t/86ajc6uu0
titulo: "[Back] Banco: particionamento das tabelas de telemetria de cameras"
frente: Banco / Infra
tamanho: a estimar
status: spec em review
branch: cameras/feat/SOFTWARE-2004
pr: https://github.com/atmanadmin/attlas-2026/pull/709
spec: MOD-009-telemetry-partitioning + PROJ-009-telemetry-partition-maintenance
sprint: "[[Attlas - Sprint 23]]"
atualizado: 2026-07-08
---

# Particionamento das tabelas de telemetria de câmeras

> Tarefa 2. Gancho: [[SOFTWARE-1922 - Janelas de 5 min + latência + rollup 90d]] e [[SOFTWARE-1923 - Bitrate histórico + TTFF]].

## Problema

As tabelas de histórico/telemetria de câmeras crescem de forma contínua e são as que mais incham o banco. Sem particionamento, consultas por período e a limpeza/retensão ficam caras conforme o volume sobe.

## Candidatas a particionar (por tempo)

- `CameraAvailabilityWindow` (janelas de 5 min + `avgBitrateMbps`) - alta cardinalidade (por câmera x cada 5 min).
- `CameraTtffSample` (um registro por abertura de stream).
- `CameraHeartbeatHistory` (heartbeats do ping WS/ONVIF; hoje limpa via `heartbeat-history-cleanup.service`).
- rollup de 90 dias da T4.

## Objetivo

Particionar por tempo (range/PostgreSQL declarative partitioning) as tabelas de telemetria que mais crescem, tornando barata a consulta por janela e o descarte de partições antigas (retensão vira `DROP PARTITION` em vez de `DELETE` em massa).

## A definir no planejamento

- [ ] Confirmar quais tabelas entram (medir crescimento real no dev/quito).
- [ ] Chave e granularidade da partição (por dia? por semana? por mês?).
- [ ] Estratégia de retensão por tabela e como se relaciona com o `heartbeat-history-cleanup` já existente (pode ser substituído por drop de partição).
- [ ] Caminho de migration com Prisma (partição declarativa costuma exigir SQL manual na migration; ver regra "Origem da migration" em backend-standards).

## Riscos

- Prisma tem suporte limitado a tabelas particionadas nativas; provável necessidade de SQL cru na migration e cuidado com o schema espelhado.
- Migrar tabela existente para particionada não é in-place trivial; planejar janela/backfill.
