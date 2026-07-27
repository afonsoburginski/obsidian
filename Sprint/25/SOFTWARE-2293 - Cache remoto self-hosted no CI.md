---
tags:
  - attlas
  - sprint-25
  - infra
  - ci-cd
card: SOFTWARE-2293
pr: "#964"
status: em andamento - cofre no ar + PR aberta + paliativo aplicado; pendente escalar runners (aguardando 3 registration tokens do gestor)
atualizado: 2026-07-22
---

# SOFTWARE-2293 - Cache remoto self-hosted no CI

Card ClickUp: https://app.clickup.com/t/86ajnneth | PR: [#964](https://github.com/atmanadmin/attlas-2026/pull/964) (branch `infra/feat/SOFTWARE-2293`)

## Problema

CI de PR lento e "sem pegar cache". Diagnóstico: o commit **`da6ec19b0`** (17/jun, escondido sob título "skeleton services") tirou o offload pro `ubuntu-latest` **e** o `actions/cache` compartilhado. Desde então tudo roda só nos runners self-hosted com **cache NX local e isolado por máquina** (EC2 31G, sumo 56G, sem compartilhar) - hit de ~20% na integração. Somado a isso, ~1300 runs/mês disputam poucos agentes: a **fila** é o maior peso no relógio (run de 100 min tinha só 37 min de trabalho).

## Decisão

Cache remoto **self-hosted, custo zero, sem Nx Cloud** (que daria ~US$ 330-1000/mês no volume atual; e os pacotes `@nx/*-cache` oficiais foram deprecados por CVE-2025-36852). Nx ativa cache remoto por env var, servidor implementa `GET/PUT /v1/cache/{hash}` com bearer.

**Topologia de runners: 3 na sumo (label `heavy`) + 1 no EC2 (sem `heavy`).** Integração roda só na sumo; lint/build em qualquer um. Porquê: o EC2 roda a aplicação inteira (66 containers, load 10 em 8 núcleos, swap) - CI pesado lá degrada produção; a sumo VM (16 vCPU/31 GB) estava ociosa (load 2.7) e tem o cache local (~2 ms vs ~300 ms do EC2 via Tailscale).

## Feito (22/07)

- **Cofre no ar na sumo** (host 10.1.1.115, `~/nx-cache/docker-compose.yml`, user develop): MinIO + `ghcr.io/ikatsuba/nx-cache-server` na porta **8388**. Bucket `nx-cache` com expiração de 30 dias. Testado: PUT/GET 200, sem token 401, inexistente 404. Consumo desprezível (~130 MB RAM, ~0% CPU).
- **Alcance confirmado**: sumo local ~2 ms, EC2 via Tailscale (subnet-router aquario-server) ~300 ms.
- **Secret** `NX_REMOTE_CACHE_TOKEN` gravado no GitHub. Token também em `~/nx-cache/.env` (chmod 600) na sumo.
- **PR #964**: `ci-pr.yml` + `ci-develop.yml` apontam pro cofre; runbook `docs/architecture/ci-remote-cache.md`; decisão em `CROSS-012 §13`.
- **Paliativo no EC2** (ao vivo, sem restart, job preservado): drop-in `/etc/systemd/system/actions.runner.atmanadmin-attlas-2026.attlas-dev-runner.service.d/limits.conf` de `CPUQuota=700%/CPUWeight=100` para **`CPUQuota=300%/CPUWeight=20`** - runner cede CPU pra aplicação. Load já caiu (4.5 → 3.5). É o baseline estático; o autopiloto (abaixo) tuna por cima ao vivo.
- **Autopiloto de recursos (governador)** implantado e ATIVO nas duas máquinas: `scripts/ci/ci-runner-governor.sh` + systemd timer de 1 min. Ajusta CPU/RAM do runner por cgroup conforme a capacidade livre e o que os outros consomem. EC2 (`ROLE=shared`): quota dinâmica 200-400% por carga da app, peso 20 (app sempre ganha). Sumo VM (`ROLE=dedicated`): sem teto de CPU, `MemoryHigh` = (31-4)/nº runners (divide sozinho ao subir p/ 3). Transiente (`set-property --runtime`), reboot volta ao baseline. Log em `/var/log/ci-runner-governor.log`. Versionado no repo (PR #964), doc no runbook.
- **Limpeza dos esqueletos no EC2**: o box estava com o profile `full` do compose, subindo os 20 ms esqueleto (ms+db+redis) sem uso. Parei os esqueletos (77 → 38 containers, 7 ms reais no ar). CUIDADO aprendido: o profile `full` gateia TODOS os apps (reais + esqueletos), não separa — a autoridade de esqueleto é só `.github/skeleton-services.txt`. Errei uma vez com o diff de profile e parei os reais junto; religados na hora. Trava criada: `scripts/ops/skeleton-guard.sh` + systemd timer (15 min) que mantém os esqueletos parados por nome EXATO, com regex ancorado que nunca toca nos 7 reais. Doc `docs/architecture/ec2-skeleton-guard.md`, commitado na PR #964.

## Pendente (próxima sessão)

Escalar runners. **Precisa de 3 registration tokens** (repo é de usuário atmanadmin; meu token gh é colaborador sem admin -> 404. Gestor gera em Settings > Actions > Runners, ou `gh api -X POST repos/atmanadmin/attlas-2026/actions/runners/registration-token`).

1. **Sumo VM** (`ssh sumo` -> `ssh ubuntu@192.168.122.66`): criar 2 runners novos + reconfigurar o `sumo-ci-runner` existente, os **3 com label `heavy`**:
   `./config.sh --url https://github.com/atmanadmin/attlas-2026 --token <TOK> --name sumo-ci-runner-N --labels heavy --unattended` + `sudo ./svc.sh install && sudo ./svc.sh start`.
2. **EC2** (`ssh aws-attlas-26`): manter só o `attlas-dev-runner`, **sem** label `heavy` (já throttlado). Pastas `actions-runner-2/-3` estão vazias, ignorar.
3. **Só depois** dos 3 sumo terem `heavy`: no workflow, job integration -> `runs-on: [self-hosted, linux, x64, heavy]`, e baixar a integração pra `--parallel=3`. Commitar na PR #964. (Se commitar antes, integração fica sem executor - sequenciamento em `CROSS-012 §13.3`.)

## Como validar depois

Rodar 2 PRs seguidos e comparar o "% de cache NX" no resumo do CI e o wall-clock com os runs de hoje; confirmar nos logs que sumo e EC2 leem/escrevem no mesmo cofre.

## Ferramenta auxiliar

Fiz também um auditor de CI fora do repo em `~/Área de trabalho/Developer/attlas-observability/obs.py` (merge pela metade, arquivo perdido, CI vermelho, veredito bug-real vs branch-desatualizada).
