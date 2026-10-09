---
tags:
  - doc
  - infra
  - kubernetes
  - argocd
  - gitops
aliases:
  - "Atman Platform"
  - "Plano de deploy em Kubernetes"
  - "Argo CD"
atualizado: 2026-10-09
banner: "assets/banners/servers.jpg"
banner_y: 0.3
---

# Atman Platform - Plano e bootstrap

Volta para [[Infraestrutura]] · pipeline em [[Infraestrutura - Pipeline de CI-CD]] · portas em [[Infraestrutura - Mapa de puertos]]

## Resumo

| Pergunta | Resposta |
| --- | --- |
| Decisão | **Kubernetes + Argo CD (GitOps) + Atman Platform**, a tela própria da Atman no estilo Northflank |
| Descartados | Swarm; Northflank (SaaS proprietário); **Devtron** (testado no EC2 em 08/10/2026: interface confusa, ~6 CPU e 13 GB só para ele, não aceita máquina burstable, API interna pouco documentada) |
| Stack | **Terraform** cria máquina, rede e **RKE2**; **Helm** empacota (charts `atman-service` e `atman-infra`); **Argo CD** aplica o repositório GitOps; a **Atman Platform** é a interface |
| Onde roda | Num **hub**: plataforma, Argo CD e repositório GitOps. O Argo CD do hub faz deploy no cluster do próprio hub e em **clusters remotos** pela API (porta 6443), inclusive no data center do cliente por VPN |
| Princípio | Dev aplica sozinho; cliente com deploy manual, escolhendo a versão (ADR 25) |
| Multi-projeto | A plataforma é da Atman; o Attlas é o primeiro projeto |
| Código | `deploy/` no PR #6474 (`shared/chore/NO-CARD-devtron`); depois vira os repositórios `atman-platform` e `attlas-gitops` |

```widget
src: _widgets/diagrams/infra-atman-platform.html
```

## Conceitos

| Conceito | O que é | Onde fica |
| --- | --- | --- |
| Template | Receita de ambiente: infraestrutura (Terraform), perfil Helm (escala, rollout, PDB) e política de deploy. `dev` e `prod` são os **iniciais**; cria-se outros pela tela, para este projeto ou outro | `templates/<t>/{template.yaml,values.yaml,terraform/}` |
| Ambiente | Um template aplicado num cluster: namespace `attlas-<env>`, domínio, sync automático ou manual | `environments/<env>.yaml` |
| Infraestrutura do ambiente | Bancos, Redis, Kafka, Kong, MinIO, mediamtx e o gateway nginx, com **réplica fixa** (escalam serviços, não bancos) | `infra/<env>/values.yaml` (chart `atman-infra`) |
| Serviço | Microsserviço ou frontend, com HPA vindo do template | `services/<s>/values.yaml` (chart `atman-service`) |
| Release | Versão semver publicada de um serviço | `catalog/<s>.yaml` |
| Versão implantada | `image.tag` por ambiente; é o que o deploy muda | `apps/<env>/<s>.yaml` |
| Cluster | Kubernetes conectado: o do hub ou um remoto registrado com JSON (Terraform ou `deploy/remote/connect-cluster.sh`) | segredos só no hub |

Values (o último vence): chart → template → serviço → `apps/<env>/<s>.yaml`. Dois ApplicationSets: `attlas` (ambientes × serviços) e `attlas-infra` (ambientes × infra).

## Problemas de hoje e como o plano resolve

| Problema hoje | Causa | Como fica |
| --- | --- | --- |
| Porta 22 do EC2 bloqueada em deploy | `deploy.yml` abre várias conexões SSH | Sem SSH: deploy é commit no GitOps; o Argo CD fala com o cluster |
| Serviço `Exited (1)` por variável nova; deploy recusado por chave faltando | `.env.docker` à mão, defasado | Secrets por ambiente gerados dos `.env.docker` (`local/env-secrets.sh`); depois, na tela |
| Streams e WebSocket caem 2 a 4 min a cada deploy | `up -d` recria serviço | `RollingUpdate` com `maxUnavailable: 0` e readiness |
| MediaMTX e Kong com config velha | Mount de arquivo + restart | `ConfigMap` com checksum: só reinicia quando o arquivo muda |
| Tópico Kafka e bucket novo não nascem | `kafka-init` e `minio-init` à mão | Jobs `PostSync` do Argo CD, idempotentes |
| `:dev` é tag móvel; sem rollback formal | Sem versão rastreável | Release semver no catálogo; **Rollback** num clique (commit `rollback(<env>)`) |
| Servidor novo sem seed nem configuração mínima (Quito) | Bootstrap manual | Template + infra do ambiente + seed (pendente no k8s) |
| Sem visão de escala | Compose sem HPA | HPA por serviço e métricas em tempo real na plataforma |

## A plataforma

| Tela | O que faz |
| --- | --- |
| Visão geral | Esteira (release → dev → prod com **Promover**), atividade (deploy e rollback), workflows |
| Serviços | Barra de contexto, logs ao vivo, métricas (CPU, memória, pods ao longo do tempo), pods, releases com **Deploy / Rollback / Promover / Reaplicar**, configuração |
| Ambientes | Quadro com uma coluna por ambiente (serviços, infraestrutura, domínio); página com Serviços, Infraestrutura, Domínio e Acesso |
| Templates | Receitas; editor de código (values e Terraform) com validação pelo Argo CD antes de gravar, diff e histórico |
| Clusters | Arquitetura ao vivo, uso, nós, alertas, acesso (SSH, kubeconfig), **Conectar cluster** |
| Configurações | Token do GitHub, **Registros de imagem** (Docker Hub `atmanadmin`), Argo CD, projeto |
| Documentação | Guias em HTML: deploy em servidor remoto, WireGuard de última hora, Terraform, referência de cada tela |

Tempo real por Server-Sent Events (stream do Argo CD e watch de pods). Login próprio da plataforma; o Argo CD fica atrás.

## Estado atual (hub de avaliação no EC2 dev, 09/10/2026)

| Item | Valor |
| --- | --- |
| Cluster | `kind` `attlas` no EC2 dev, ao lado do compose do Attlas |
| Argo CD | 3.5.4 (chart 10.10.1), reconciliação 180 s, ApplicationSets a cada 30 s |
| GitOps | `~/atman-platform/gitops/attlas-gitops.git`, servido por `git daemon` (`atman-gitops`, 172.19.0.100) |
| Plataforma | `http://100.101.165.32:8090` (tailnet) ou `ssh -N -L 8090:127.0.0.1:8090 atman`; usuário `admin`, senha em `~/atman-platform/secrets/console-password` |
| Ambiente dev completo | 22 serviços (HPA 1 a 3) + 41 componentes de infraestrutura; gateway nginx em `http://100.101.165.32:8081` |
| Ambiente prod de avaliação | Só `web-attlas`, deploy manual |
| Imagens | Credencial do Docker Hub do EC2 no kubelet do nó e em Configurações → Registros; clusters remotos recebem o Secret `atman-registry` |
| Subir ou recriar | `CONSOLE_TAILNET_IP=100.101.165.32 CLUSTER_SSH_HOST=dev.v2.attlas.atmansystems.com bash ~/attlas-deploy/local/up.sh` |
| Ajustes no host | `/etc/sysctl.d/99-kind-inotify.conf`; regras `FORWARD` do kind (persistir com `sudo bash remote/routing/hub-vpn-routing.sh install`) |

## Dimensionamento

| Fato | Consequência |
| --- | --- |
| Subida do ambiente inteiro (16 Postgres iniciando, 20 serviços migrando) levou o load a ~60 no `t3a.2xlarge` | Subir ambientes novos fora do horário do time; restarts entram em backoff e o load cai sozinho |
| Em regime, compose + kind no mesmo EC2: load ~9 em 8 vCPU, ~17 GB de RAM em uso | O EC2 aguenta a avaliação, mas é burstable: para dev definitivo, máquina própria (Terraform do template dev) |
| `requests` dos serviços: 100m CPU e 160 MiB; HPA a 60% | `ms-detector-history` já escalou para 3 pods sozinho; conectores TCP e o worker com HPA desligado |

## Bootstrap

### Hub (uma vez)

| # | Passo | Verificação |
| --- | --- | --- |
| 1 | Máquina com Docker, kind, kubectl, helm (no definitivo: Terraform do template dev + RKE2) | `kubectl get nodes` `Ready` |
| 2 | `local/up.sh`: Argo CD, metrics-server, GitOps, ApplicationSets, Secrets dos serviços, plataforma e gateway | URL e senha impressas no fim |
| 3 | Login, conectar o GitHub (token só leitura) e conferir o registro de imagens | Configurações tudo verde |

### Cliente em data center remoto (caso Quito)

| # | Passo | Guia na plataforma |
| --- | --- | --- |
| 1 | Rede: Tailscale (subnet router), WireGuard da Atman (o servidor do cliente disca para o hub, UDP 51820) ou VPN do cliente no hub | WireGuard de última hora · Tailscale e VPN do cliente |
| 2 | Roteamento kind → VPN no hub e diagnóstico com `remote/check-remote.sh` | Deploy em servidor remoto |
| 3 | `terraform apply` do template prod (RKE2 por SSH, bastion opcional) → `out/registration.json` | Provisionar com Terraform |
| 4 | Clusters → **Conectar cluster** (cola o JSON, escolhe a rede) | Clusters |
| 5 | Ambientes → **Novo ambiente** com template prod nesse cluster, domínio do cliente se houver | Criar template e ambiente |
| 6 | Deploys seguintes pela tela | Deploy, promoção e rollback |

## Armadilhas encontradas

| Sintoma | Causa | Correção |
| --- | --- | --- |
| ApplicationSet novo gera 0 aplicações | Cache de 3 min do repo-server para `main` | Esperar o cache ou usar SHA |
| Validação no Argo CD: `unable to resolve 'preview-…'` | Mesmo cache, para branch nova | Renderizar pelo SHA do commit |
| Trocar o ApplicationSet derruba apps | Apps donas do ApplicationSet antigo | Apagar o antigo com `--cascade=orphan`; o novo adota |
| Kong `OOMKilled` | Um worker nginx por CPU do nó | `KONG_NGINX_WORKER_PROCESSES=2` e limite 1 GiB |
| `cp-kafka` não sobe | Service `kafka` injeta `KAFKA_PORT` | `enableServiceLinks: false` nos pods |
| `kube-proxy` cai com `too many open files` (kind) | inotify do host em 128 | 512 em `/etc/sysctl.d/` |
| Pods sem DNS (kind) | `FORWARD` em `DROP` (Tailscale) | Liberar a subrede do kind |
| `ms-connector-une` não fica `Ready` no k8s | Em aberto: o health não diz qual dependência falha | Investigar (no compose está saudável) |

## Pendências

1. Seed do bootstrap no k8s (`~/seed/bootstrap.sh` adaptado ou Job de seed nas imagens).
2. Portas de vídeo e de hardware fora do cluster (WebRTC/RTSP do mediamtx, TCP dos conectores).
3. CI publicando a release semver no catálogo e o deploy automático no dev.
4. Repositórios próprios `atman-platform` e `attlas-gitops` no GitHub.
5. Terraform e kit remoto executados num servidor de homologação.
6. Corte do dev: desligar o compose e o `deploy.yml`.
