---
id: S25-25
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2312
frente: Infra / CI
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: Closed (mergeada 24/07)
atualizado: 2026-07-24
pr: https://github.com/atmanadmin/attlas-2026/pull/1017
aliases:
  - "SOFTWARE-2312 - Cache-correctness do NX no CI + serialização da integração"
---

# S25-25 - Infraestrutura - CI - Cache-correctness do NX e serialização da integração

Follow-up do [[S25-15 - Infraestrutura - CI - Cache remoto self-hosted|2293]]: com o cache remoto ligado, o CI passou a servir artefato defasado. Três classes de falha corrigidas na #1017:

## O que foi feito

- **Cache servindo Prisma client velho**: `prisma:generate` e `build` rodam como comando (opacos ao NX), então a versão das ferramentas não entrava na chave de cache. Com o drift `^7.7.0` no lockfile vs `7.8.0` instalado, o cofre servia client velho pra vários serviços (o ms-audit foi só o primeiro a explodir). Fix: `externalDependencies` (prisma/@prisma/client) nas inputs dos 10 `prisma:generate` + `package-lock.json` e `.nvmrc` no `sharedGlobals` do `nx.json` + node-version-file fixo nos workflows.
- **Integrações concorrentes estourando testcontainers**: os 3 runners heavy vivem numa VM só; integrações em paralelo derrubavam o provisionamento do Postgres (`ECONNREFUSED` em pmv/traffic-model). Fix da época: serializar a integração com o concurrency group `attlas-integration-sumo` (depois substituído pela fila no nível do runner, ver [[S25-26 - Infraestrutura - CI - Fila da integração no runner|2321]]).
- **ms-pmv morrendo por memória**: `runInBand` acumulava heap das ~50 suites num processo só. Troquei por 1 worker com `workerIdleMemoryLimit` (recicla sem race de banco).

develop e #951 verdes de ponta a ponta depois disso. Runbook: `docs/architecture/ci-remote-cache.md`.
