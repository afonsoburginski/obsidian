# Observabilidade do CI - plano da stack completa

**Status: planejado, não implementado.** Decisão de 24/07/2026: primeiro resolver a higiene dos runners (hooks nativos pós-job, PR #1040), observabilidade fica para uma PR futura. Este documento guarda o desenho completo para quando for a hora.

Objetivo: enxergar o CI como se fosse a Nx Cloud (fila, duração, taxa de sucesso, cache hit, saúde das máquinas), sem Kubernetes, sem SaaS pago, rodando na própria VM de CI.

## Onde roda

Tudo via docker compose **na VM ci-runner da sumo** (16 vCPU, 31 GB de RAM). Nada roda no host sumo raiz: a RAM do host está saturada (cerca de 109 de 125 GB usados). No EC2 entra só 1 container minúsculo (node_exporter, ~30 MB).

Fonte de verdade no repo: `deploy/ci-observability/` (compose + configs + dashboards versionados).

## Componentes e orçamento de recursos

| Componente | Para quê | RAM (limite) |
| --- | --- | --- |
| Prometheus | banco de métricas, retenção 15 dias com teto de 4 GB de disco | 400 MB |
| Grafana OSS | dashboards e alertas | 300 MB |
| cAdvisor (tunado: docker_only, housekeeping 30s) | métricas por container (testcontainers inclusive) | 300 MB |
| Pushgateway | recebe o cache hit do NX enviado pelos jobs | 64 MB |
| node_exporter (VM e EC2) | CPU/RAM/disco/swap das máquinas | 32 MB cada |
| Poller do GitHub (script bash + gh CLI, timer de 2 min) | fila, espera, duração, sucesso/falha | irrisório |

Total na VM: cerca de 1,1 GB de RAM e 5,5 GB de disco. Cabe no orçamento atual (jobs de integração usam ~7 GB e são serializados). Ajuste acoplado: subir a reserva de RAM do governor de 4 para 6 GB para descontar a stack.

## Métricas do GitHub Actions (sem precisar de admin)

Decisão de design: **poller com gh CLI**, não webhook exporter. O webhook exporter (cpanato/github_actions_exporter) exigiria criar webhook no repo (permissão admin, que não temos) e um endpoint alcançável pelo GitHub (a VM está em LAN/Tailscale). O poller lê a API de runs/jobs com conta de colaborador comum, a cada 2 minutos, e emite:

- fila agora (runs queued e in progress por workflow)
- tempo de espera até iniciar (p50/p95)
- duração por job (lint, integration, build) em p50/p95
- taxa de sucesso 24h e 7 dias
- status do último run da develop

O que a API não dá sem admin (estado dos self-hosted runners) vem de um script local na VM (timer de 1 min) que emite via textfile do node_exporter:

- estado das units dos runners (ativo/inativo)
- idade do Runner.Worker mais velho (detector de job zumbi ANTES do reaper agir aos 75 min)
- contagem de volumes dangling (a métrica que teria denunciado o vazamento de 357 volumes semanas antes)
- testcontainers vivos e idade
- sentinel do npm ci coerente com o package-lock atual

## Cache hit do NX

Os workflows já extraem "X out of Y tasks cached" do log do nx. A única mudança de workflow do plano inteiro: uma composite action pequena (`.github/actions/nx-cache-metric`) que faz um POST de 5 segundos (com timeout e `|| true`, nunca quebra o CI) no pushgateway da VM com hit percent, hits e total, por workflow e por target. São 6 séries fixas, cardinalidade controlada. O MinIO do cache remoto também expõe métricas nativas (tamanho do bucket, requests, erros).

## Dashboards (provisionados como JSON no repo)

1. **CI Overview** (a visão "Nx Cloud"): fila agora, espera p95, duração p50/p95 por job, taxa de sucesso, cache hit ao longo do tempo, último run da develop.
2. **Runners e Máquinas**: CPU/RAM/swap/disco da VM e do EC2, estado das units, idade do Worker com linha visual nos 75 min.
3. **Docker e Higiene**: volumes dangling, testcontainers vivos e idade, disco por container, total de containers por máquina.
4. **Cache NX (MinIO)**: tamanho do bucket, taxa de requests e erros, cruzado com o hit rate.

## Alertas (Grafana alerting, sem infra extra)

- disco da VM ou do EC2 acima de 85% por 10 min
- RAM disponível da VM abaixo de 3 GB por 10 min, ou swap acima de 50%
- fila morta: jobs na fila há 20 min com zero em execução (runners caíram)
- zumbi: Worker acima de 80 min (escapou do reaper)
- volumes dangling acima de 50 (vazamento recomeçou)
- pushgateway sem métrica de cache há 48h (pipeline mudo)

Canal de notificação: e-mail via SMTP (app password do Google Workspace) ou webhook de um space do Google Chat. Nada que exija servidor novo.

## Aplicação sem SSH manual (GitOps-lite)

Timer systemd de sync na VM (15 em 15 min): localiza o checkout mais novo que os runners já mantêm em `_work/`, compara o hash de `deploy/ci-observability/`, e se mudou faz rsync para `/opt/ci-observability` + `docker compose up -d`. Zero credencial nova (o código chega pelo próprio CI da develop). Rollback: revert do commit e esperar o próximo ciclo.

## Evolução futura: runners efêmeros (sem Kubernetes)

Guardado como opção estrutural caso os dashboards mostrem vazamento residual recorrente. Desenho resumido: cada runner vira um container docker compose que registra com `--ephemeral`, pega 1 job, morre, e o compose sobe um novo limpo. Docker-in-docker interno faz todo estado docker do job (containers, volumes anônimos) morrer junto. Volumes nomeados por slot preservam só o que dá velocidade (node_modules, cache npm, cache NX local). Um registry mirror local faz os pulls de imagem virarem LAN.

Pré-requisitos que hoje bloqueiam:

1. PAT fine-grained com permissão Administration read/write no repo (pedir ao gestor, conta admin do atmanadmin) para auto-registro dos runners. Sem isso não escala (registration token expira em 1h).
2. Expandir o disco da VM ci-runner de 145 GB para uns 250 GB (mirror + volumes por slot).
3. Manter uma imagem custom de runner (rebuild trimestral).

Tradeoffs mapeados: container privileged (equivalente ao acesso que o runner já tem hoje), boot de 20 a 40s por job, e o job zumbi continua precisando de um TTL externo (o problema muda de lugar, não desaparece). Por isso a decisão foi hooks primeiro: sem credencial nova e reversível com 1 linha, e a migração para efêmero só se os dados justificarem.

Referências: runbook em `docs/architecture/ci-remote-cache.md` no repo (camadas de higiene atuais), [[Acessos SSH - Infra Attlas]] (como entrar nas máquinas).
