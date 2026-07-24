---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2322
frente: Infra / CI
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: Closed (mergeada 24/07 na #1038, que consolidou a #1040)
atualizado: 2026-07-24
pr: https://github.com/atmanadmin/attlas-2026/pull/1038
---

# SOFTWARE-2322 - Higiene automática dos runners de CI (docker-gc + hook pós-job + rotação)

Incidente: disco da VM de CI em 100% com 357 volumes órfãos (25 GB). Os testcontainers de Postgres criam volume anônimo sem o label `org.testcontainers`; qualquer remoção sem `-v` (reaper, kill, Ryuk forçado) vazava o volume, e o cleanup por label do workflow nunca pegava. Disco cheio derruba a integração inteira (testcontainer não provisiona).

## O que foi feito (camadas)

- **Na fonte**: passo do workflow e reaper passaram a remover com `docker rm -fv` + `docker volume prune`.
- **Hook nativo do runner** (`ACTIONS_RUNNER_HOOK_JOB_COMPLETED`): limpeza automática logo após CADA job, sem tocar em YAML de workflow. Remove testcontainer parado sempre; rodando, só ao fim de integração com um único worker vivo (seguro sob integrações concorrentes). Também derruba o sentinel do npm ci se o node_modules corrompeu (OOM) e poda build cache se o disco passa de 85%.
- **docker-gc periódico** (systemd timer): na VM de CI poda volume dangling sempre e cache/imagens sob pressão de disco; no EC2 (host da aplicação) NUNCA toca em volume.
- **Rotação semanal** (domingo 03:00, só se ocioso): recicla o listener do runner, poda `_diag`/`_temp`, e recicla o swap quando a RAM absorve. Nunca toca no node_modules aquecido.

Deployado e validado nas duas máquinas no mesmo dia: disco da VM de 100% pra 82%, zero dangling, e o hook pegou um vazamento real ao vivo (16 containers órfãos removidos segundos após o job). Runbook com a tabela das camadas: `docs/architecture/ci-remote-cache.md`. Plano futuro (observabilidade estilo Nx Cloud + runners efêmeros): [[Observabilidade CI - plano (stack completa)]].
