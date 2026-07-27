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
tamanho: G (escopo ampliado)
status: mergeada (develop)
branch: cameras/feat/SOFTWARE-2004
pr: https://github.com/atmanadmin/attlas-2026/pull/709
spec: MOD-009-telemetry-partitioning + PROJ-009-telemetry-partition-maintenance
sprint: "[[Attlas - Sprint 23]]"
atualizado: 2026-07-12
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


## Andamento (11/07)

- Fase 0 fechada com o user: bucket semanal p/ heartbeat e janelas (mensal p/ TTFF na fase 2, rollup fora); reuso das envs de retenção existentes; corte limpo. Specs MOD-009/PROJ-009 adequadas à develop pós-2006 (frontend confirmado sem impacto).
- Migration de particionamento autorada pelo fluxo Prisma (`migrate dev --create-only` + SQL manual `prisma-unsupported`), validada em banco limpo `attlas_cameras_dev` (drift zero, insert roteando pra partição da semana, relkind `p`).
- **Escopo ampliado** validando com o stack completo (Kong + ms-organization + mediamtx):
  - Métricas de saúde (UC-026) que estavam `null` desde o 1923 ligadas: TTFF média + `lastTtffMs` (real da última abertura, contrato aditivo), bitrate médio (rollup+hoje), série adaptativa ao filtro, `currentBitrateMbps` via mediamtx, sessões por câmera.
  - **Causa raiz**: `ScheduleModule.forRoot()` em 2 módulos = 2 schedulers = todo `@Cron` disparava 2x; o 2º passe do sampler sobrescrevia o bitrate com null. forRoot único no AppModule + log info p/ amostra anulada com sessão ativa.
  - Log de eventos tratado no front (padrão da tela de Eventos): causas VAPIX humanas, duração na recuperação, badge severidade, ícone categoria, i18n 4 locales.
- Branch reconstruída sem force (remoto + merge develop + commit único `d65c264df`), push fast-forward; PR #709 e ClickUp atualizados com o escopo. Suítes completas verdes (854 + 6838).
- **Fica pra próxima PR**: worker PROJ-009 (criar semanas futuras + drop coordenado c/ rollup, substituindo os cleanups).

## Andamento (12/07)

- 2ª leva na PR #709 (commit `8a18498e8`): **métricas de saúde em tempo real ponta a ponta** — sampler/streaming publicam `camera:health:update` na sala WS (janela 5min / TTFF gravado); painel refaz o `GET /health` silencioso; gráfico null-aware (lacuna honesta, dot p/ medição isolada). Provado em runtime com cliente socket recebendo os frames `ttff` e `window`. Suítes completas verdes (856 + 6838).

## Fechamento (12/07)

- **MERGEADA na develop** (PR #709, merge `8521a8659`). Card fechado no ClickUp.
- Review todo tratado (16 threads respondidas/resolvidas + re-review): specs do contrato sincronizadas, cache no probe de bitrate, bootstrap da migration com 8 semanas, cobertura dos novos caminhos, match 1006 ancorado, Record de ícones.
- **Pendência única do escopo**: worker PROJ-009 (cria semanas futuras + drop coordenado com o rollup, substituindo o cleanup por DELETE) — abrir PR própria.
- **Encaminhamento (13/07)**: worker PROJ-009 é a tarefa 1 (P0) da [[Attlas - Sprint 24]], com card novo no ClickUp. O bootstrap criou só 8 semanas de partições, então tem prazo real (início de setembro).
