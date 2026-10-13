---
tags:
  - doc
  - infra
  - ci-cd
aliases:
  - "CI/CD de ponta a ponta"
  - "Pipeline completo"
atualizado: 2026-10-13
banner: "assets/banners/servers.jpg"
banner_y: 0.3
---

# CI/CD de ponta a ponta

Volta para [[Infraestrutura]] · detalhes de CI em [[Infraestrutura - CI e runners]] · plano k8s em [[Infraestrutura - Pipeline de CI-CD]]

## Resumo

| Pergunta | Resposta |
| --- | --- |
| CI | GitHub Actions, runners self-hosted na VM `ci-runner` (sumo), scale set de até 20 vagas |
| Gate de merge | Lint + validadores + build. Nenhuma suíte de teste é gate (integração desligada, unit não roda no CI) |
| Imagens | Docker Hub `atmanadmin/attlas-<ms>:dev` e `:<sha>`, push só quando o build context muda (hash OCI) |
| CD atual (dev.v2) | `deploy.yml` manual: SSH na EC2, `docker compose pull` + `up -d`, sem Kubernetes |
| CD alvo (produção) | Atman Platform grava versão no repositório GitOps; Argo CD aplica no cluster RKE2; um cluster por cliente |
| Rollback | Atual: redeploy da imagem anterior. Alvo: botão na plataforma, commit `rollback(<env>)` no GitOps |
| Fonte de verdade | CROSS-012 (`docs/specs/cross-service/CROSS-012-cicd-pipeline.md`), CROSS-022 (otimização de fan-out) |

## O ciclo completo

```
 Código                CI (GitHub Actions)                  Registry          Deploy
───────────────────────────────────────────────────────────────────────────────────────
 PR aberta       ──▶  ci-pr: Lint ║ Build (paralelo)
                      Validadores (Compose ports, Kafka
                      topics, Nested Error Keys, ...)
                      ✗ Lint/Build vermelho = PR bloqueada

 Merge develop   ──▶  ci-develop:
                        1. Lint
                        2. Integration (desligada)
                        3. Build & Push
                           ├─ nx build --configuration=production
                           ├─ hash do build context ≟ label OCI ──▶  iguais: pula
                           └─ docker build + push ──────────────▶  Docker Hub
                                                                    :dev + :<sha>

 Deploy manual   ──▶  deploy.yml (workflow_dispatch)
                        SSH na EC2 ──▶ docker compose pull + up -d
                        smoke test por status de container

 Deploy k8s      ──▶  Atman Platform grava versão ──▶ GitOps repo
 (alvo)                Argo CD lê e aplica no cluster RKE2
                       dev: sync automático / prod: sync manual
```

## CI: do commit à imagem

### Dois workflows

| Workflow | Gatilho | Jobs |
| --- | --- | --- |
| `ci-pr.yml` | PR para `develop` (não draft) | Lint + Validadores, Build (paralelo, sem `needs`) |
| `ci-develop.yml` | push na `develop` | Lint → Integration (off) → Build & Push (sequencial) |

Ambos ignoram commits só de `docs/**` ou `*.md`. O `workflow_dispatch` aceita input `projects` para
seletividade.

### Affected e caches

O NX calcula o affected a partir do último commit com Build & Push verde (`scripts/ci/dev-images-base.sh`).
Sem run anterior, publica todas as imagens. O affected é refinado por `namedInputs`:

| Mudança | Afeta build? | Afeta lint? | Afeta integração? |
| --- | --- | --- | --- |
| Código de lib | sim | sim | sim |
| Spec de lib (`.spec.ts`) | não | sim | sim |
| `jest.preset.js` | não | não | sim |
| `eslint.config.mjs` | não | sim | não |
| `tsconfig.base.json` | sim | sim | sim |

Cache NX remoto: MinIO + nx-cache-server na sumo (`10.1.1.115:8388`), compartilhado entre todos os runners.
Cache ESLint por arquivo no CI (configuração `ci` do lint). Detalhes em [[Infraestrutura - CI e runners#Caches]].

### Push de imagens

O `push-images.sh` decide se publica cada imagem:

1. Calcula `sha256` de tudo que entra na imagem: `dist/apps/<ms>`, Dockerfile, prisma config,
   migrations, `.dockerignore`.
2. Compara com o label `attlas.build-sha256` da `:dev` no Docker Hub.
3. Iguais = pula build e push (o `dist/` é byte-idêntico entre builds do NX).
4. Diferente = `docker build` com o hash como label + push de `:dev` e `:<sha>`.

Antes do push, `scripts/ci/smoke-image-boot.sh` sobe a imagem e confere que ela resolve os módulos de
runtime; imagem que falha não é publicada.

Serviços esqueleto (`.github/skeleton-services.txt`) são excluídos de todo target: lint, build e push.

## CD atual: SSH + docker compose

Arquivo: `.github/workflows/deploy.yml`, disparo manual.

| Passo | O que faz |
| --- | --- |
| Detect services | Lê o `docker-compose.yml`, filtra serviços com mais de 10 `.ts` em `src/` (esqueletos ficam de fora) |
| Env keys check | `deploy-env-keys-check.sh` recusa o deploy se o `.env` do host não tem chaves do `.env.example` |
| Pull | `docker compose pull` dos serviços ativos |
| Up | `docker compose up -d --no-recreate`, depois `up -d <services>` |
| MinIO init | `docker compose run --rm minio-init` (cria buckets novos) |
| MediaMTX | Recria só se `docker/mediamtx.yml` ou imagem mudou (sentinela `~/.attlas-deploy/mediamtx.yml.sha256`) |
| Kong | Recria só se `docker/kong.yml` mudou (sentinela `~/.attlas-deploy/kong.yml.sha256`) |
| Kafka init | `docker compose run --rm kafka-init` |
| Smoke | `docker compose ps -a`, serviço unhealthy/exited/dead/restarting = falha com logs |
| Limpeza | `docker image prune` de dangling + imagens sem uso há mais de 72h |

A conexão SSH usa `ControlMaster auto` numa única conexão multiplexada. Credenciais (`DOCKERHUB_USERNAME`,
`DOCKERHUB_TOKEN`) entram por stdin, sem arquivo no host.

### Limitações do deploy atual

- Sem rolling update: `up -d` recria o container e o serviço fica fora por segundos.
- Sem rollback automatizado: voltar exige redeploy manual da imagem anterior.
- Sem escala horizontal: um container por serviço.
- Sem health check HTTP: o smoke confere status do container, não endpoint `/health/ready`.
- Sem isolamento de ambiente: tudo roda na mesma EC2.

## CD alvo: Kubernetes via Atman Platform

Plano completo em [[Infraestrutura - Pipeline de CI-CD]].

### Arquitetura

| Peça | Papel |
| --- | --- |
| GitHub Actions | CI (lint, build, push). Sem mudança |
| Docker Hub | Registry: `:<sha>` e `:<versão>` |
| Repositório GitOps (`attlas-gitops`) | Templates, ambientes, catálogo de versões, estado desejado |
| Argo CD | Lê o GitOps e aplica no cluster. ApplicationSets `attlas` e `attlas-infra` |
| Atman Platform | UI para deploy, promoção, rollback, observabilidade |
| Kubernetes (RKE2) | Um cluster por cliente, provisionado por Terraform |

### Fluxo

1. **CI** publica `atmanadmin/attlas-<ms>:<sha>`.
2. **Release** grava versão semver em `catalog/<serviço>.yaml` no GitOps (planejado: job no CI).
3. **Deploy** na plataforma: commit em `apps/<ambiente>/<serviço>.yaml`.
4. **Argo CD** aplica. Dev: sync automático. Prod: sync manual.
5. Rolling update sem queda. Rollback = commit revertendo a versão.

### Versionamento semver

| Commit | Efeito |
| --- | --- |
| `feat:` | minor |
| `fix:` | patch |
| `feat!:` ou `BREAKING CHANGE:` | major |
| `refactor:`, `test:`, `docs:`, `chore:` | nenhum |

Tag git: `<ms>@<versão>`. Imagem `:dev` persiste como legado até o ambiente dev migrar.

### Templates por ambiente

| | dev | prod |
| --- | --- | --- |
| Pods | 1–3 (HPA, 60% CPU) | 2–6 (HPA, 70% CPU) |
| PodDisruptionBudget | não | ao menos 1 pod |
| Deploy | automático | manual |
| Terraform | 1 EC2 com RKE2 nó único | RKE2 em servidores do cliente por SSH |

Bancos, Redis e Kafka ficam no chart `atman-infra` com réplica fixa. Conectores TCP e `ms-reports-worker`
têm HPA desligado.

## Runners

VM `ci-runner` na sumo: 96 vCPU, 86 GB RAM, scale set de até 20 vagas. Runners efêmeros com piso de 16 GB
por job. Label `heavy` para integração e Build & Push (só na sumo). EC2 não tem mais runner.

Detalhes, operação e armadilhas em [[Infraestrutura - CI e runners]].

## Secrets

| Secret | Usado em | Descrição |
| --- | --- | --- |
| `DEPLOY_HOST` | `deploy.yml` | IP da EC2 |
| `DEPLOY_SSH_KEY` | `deploy.yml` | Chave Ed25519 |
| `DOCKERHUB_USERNAME` | CI + deploy | `atmanadmin` |
| `DOCKERHUB_TOKEN` | CI + deploy | Token Docker Hub |
| `NX_REMOTE_CACHE_TOKEN` | CI | Cache remoto NX |

## Comandos úteis

```bash
# Disparar CI para projetos específicos
npm run ci:trigger:services --projects=ms-cameras

# Acompanhar o último run
gh run watch $(gh run list --workflow=ci-develop.yml --limit=1 --json databaseId -q '.[0].databaseId')

# Deploy manual (só após CI verde)
npm run deploy:trigger:services --projects=ms-cameras

# Status dos containers na EC2
ssh aws-attlas-26 "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep attlas-ms"

# Logs de um serviço
ssh aws-attlas-26 "docker logs attlas-ms-cameras --tail 50"
```

## O que falta

| Pendência | Estado |
| --- | --- |
| Job de release no CI (semver + catalog + retag) | planejado |
| Repositório `attlas-gitops` no GitHub | planejado |
| Deploy automático no dev a cada merge | planejado |
| Religar integração no CI | CROSS-022 §14.5 |
| CI em Kubernetes com ARC | [[SP-01 - Infraestrutura - CI - Runner profissional em Kubernetes com ARC]] |
| Ambiente do primeiro cliente com sync manual | planejado |
| Corte do `deploy.yml` | após migração do dev |
