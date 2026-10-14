---
tags:
  - doc
  - infra
  - devtron
  - kubernetes
  - terraform
  - helm
  - plano
aliases:
  - "Devtron"
  - "Plano de deploy"
  - "Bootstrap Kubernetes"
atualizado: 2026-10-08
banner: "assets/banners/servers.jpg"
banner_y: 0.3
---

# Devtron - Plano e bootstrap

Volta para [[Infraestrutura]]

## Resumo

| Pergunta | Resposta |
| --- | --- |
| Decisão | **Devtron** sobre **Kubernetes (RKE2)**. Fora: Swarm, Northflank (proprietário, SaaS) e ArgoCD como ferramenta de operação |
| Por quê | Open source (Apache 2.0), interface moderna para deploy, rollback e logs por clique, pipelines de CI/CD embutidos e vários clusters num painel |
| Stack | **Terraform** cria a máquina e a rede; **RKE2** é o Kubernetes; **Devtron** é o painel e o motor de deploy; **Helm** empacota |
| Onde roda | O Devtron roda **dentro do cluster**, no namespace `devtroncd`. Você só o usa pelo navegador |
| Princípio | Deploy a cliente continua **controlado** (ADR 25): o dev entrega sozinho, o cliente promove com aprovação |
| Edição | Usamos a edição **open source**. Há uma edição Enterprise com licença à parte; antes de depender de um recurso, confirmar que ele está na OSS |

Fontes: [repositório do Devtron](https://github.com/devtron-labs/devtron) e [guia de instalação](https://docs.devtron.ai/getting-started).

## Argo CD dentro do Devtron

O Argo CD é **opcional** no Devtron (`argo-cd.enabled=true`). Isso dá dois modos:

| Modo | Como funciona | Quando |
| --- | --- | --- |
| **Helm (padrão)** | O Devtron faz o deploy por Helm; a configuração fica no banco dele | Começo: menos peças, nada de Argo |
| **GitOps** | O Devtron grava os manifestos num repositório Git e o Argo CD aplica | Depois, se quisermos o Git como fonte da verdade e correção de drift |

O plano começa no modo Helm. Habilitar o GitOps vira uma decisão posterior, sem refazer o resto.

## Problemas de hoje e como o plano resolve

Todos vêm de [[Infraestrutura - Ambientes]] (Armadilhas conhecidas) e do `deploy.yml`.

| Problema hoje | Causa | Como fica |
| --- | --- | --- |
| Porta 22 do EC2 bloqueada em deploy | `deploy.yml` abre várias conexões SSH | Sem SSH: o Devtron fala com o cluster por dentro |
| Deploy recusado por chave faltando no `.env.docker`; serviço `Exited (1)` por variável nova | Env do host à mão, defasado do `.env.example` | Variáveis e segredos por ambiente na interface; o `deploy-env-keys-check` roda no CI antes |
| Streams e WebSocket caem 2 a 4 min a cada deploy | `up -d` recria serviço sem janela | `RollingUpdate` com `maxUnavailable: 0` e readiness; o pod velho só sai com o novo pronto |
| MediaMTX com config velha; `ms-cameras` perde os paths `analytic-*` | Mount de arquivo + restart | `ConfigMap` com checksum na annotation; o `ms-cameras` reinicia junto |
| Kong reiniciado derruba todo SSE/WebSocket | Recriado a cada deploy | O Kong só reinicia quando o `kong.yml` muda (checksum) |
| Bucket novo do MinIO e tópico Kafka novo não nascem | `minio-init` e `kafka-init` à mão | Jobs idempotentes antes dos serviços (pré-deploy) |
| Migration quebra no boot (P3018, 23505) e o serviço cai | `prisma migrate deploy` no `CMD` | Fase final: Job de pré-deploy; falha para o deploy sem derrubar o que roda |
| `:dev` é tag móvel; hotfix por `docker save` + ssh | Sem versão rastreável | Deploy sempre por `:<sha>`; hotfix é build com tag nova |
| Sem rollback formal | Estado só no host | Rollback por clique, para qualquer release anterior |

## Deploy por clique

| Quero | Onde clico no Devtron |
| --- | --- |
| Ver o que roda e se está saudável | Lista de aplicações e o painel de recursos do cluster |
| Subir uma versão | Pipeline de deploy da aplicação, no ambiente escolhido |
| Voltar a versão | Histórico de deploys da aplicação, escolher a release e reverter |
| Ver log e abrir terminal de um pod | Painel de recursos, pod |
| Mudar uma variável de um ambiente | Configurações da aplicação, por ambiente |
| Promover dev → cliente | Pipeline do ambiente do cliente, com aprovação |
| Várias aplicações de uma vez | Grupos de aplicações, para um release que mexe em mais de um serviço |

Os nomes exatos dos menus e o que é da edição OSS devem ser conferidos na primeira instalação.

## Estado atual (o que o plano respeita)

| Fato | Onde | Consequência |
| --- | --- | --- |
| 29 imagens `atmanadmin/attlas-<ms>`, tags `:dev` e `:<sha>` | `.github/scripts/push-images.sh` | O Devtron implanta **só `:<sha>`** |
| Build só dos afetados, com pulo por hash | `ci-develop.yml`, `push-images.sh` | O build continua no GitHub Actions; o Devtron recebe a imagem pronta |
| Cada serviço roda `prisma migrate deploy` no boot | `apps/<ms>/Dockerfile` | Aceitável no início (o Prisma usa advisory lock) |
| Envs por serviço em `~/apps/<ms>/.env.docker`, fora do Git | [[Infraestrutura - Ambientes]] | Viram variáveis e segredos por ambiente |
| Kong declarativo; `mediamtx.yml` e `coturn` por arquivo | `docker-compose.yml`, `docker/` | `ConfigMap` + checksum |
| Imagens só `linux/amd64` | registry | Nós em `amd64` |

## Ambientes

| Ambiente | Onde | Como sobe hoje | No plano |
| --- | --- | --- | --- |
| Local | Máquina do dev | `docker compose up -d` (perfil `full`) | Segue igual; fora do Devtron |
| dev.v2 | EC2 `dev.v2.attlas.atmansystems.com` (`ssh atman`), `t3a.2xlarge`, 8 vCPU | `gh workflow run deploy.yml`, manual | Máquina nova com RKE2 e Devtron; a atual segue até o corte |
| Cliente | Um cluster RKE2 por cliente, cloud ou on-premise | Helm values por cliente (ADR 25) | Ambiente do cliente no Devtron, promoção com aprovação |

O EC2 dev atual é dedicado ao Attlas: nunca rodar teste, build ou `npm ci` nele. O plano cria uma **máquina nova** para o dev atual continuar de pé durante o bootstrap.

## Dimensionamento

A documentação do Devtron pede, com CI/CD: **2 CPU e 6 GB** para até 5 aplicações e **6 CPU e 13 GB** para mais de 5. Também **desaconselha máquinas burstable** (série T da AWS). Fonte: [documentação](https://docs.devtron.ai/getting-started).

| Item | Consequência |
| --- | --- |
| 29 serviços | Cai na faixa de **6 CPU e 13 GB só para o Devtron** |
| Attlas inteiro | Hoje usa ~10 GB de RAM com 74 containers (dev.v2) |
| `t3a.2xlarge` (dev.v2) | É burstable: **não serve** para o Devtron |

Ponto de partida para o dev (a validar): máquina **não burstable** (família `m6a` ou `m7i`), **16 vCPU e 48 a 64 GB**, disco gp3 de 200 GB. Se pesar, o Devtron fica num cluster pequeno à parte e gerencia o do Attlas como cluster adicional.

## Mapa de portas

Fonte: `docker-compose.yml` da `develop` (81 portas publicadas). Se esta tabela e o arquivo divergirem, vale o arquivo. Versão completa em espanhol: [[Infraestrutura - Mapa de puertos]].

**Infraestrutura compartilhada**

| Serviço | Porta host → container | Uso |
| --- | --- | --- |
| `kong` | `8000`, `8001`, `8100` | Gateway `/api`; admin; estado e métricas |
| `kafka` | `9092`; `9094` externo | Broker; listener externo só se configurado (`KAFKA_*`) |
| `zookeeper` | `2181` | Coordenação do Kafka |
| `kafdrop` | `9000` | Interface web do Kafka |
| `minio` | `9100→9000`, `9101→9001` | API S3; console |
| `mediamtx` | `8554`, `8888`, `8889`, `8189/udp` | RTSP, HLS, WebRTC (WHEP), mídia WebRTC |
| `mailhog` | `1025`, `8025` | SMTP de teste; web |
| `web-attlas` | `4200→80` | Frontend |

**Microsserviços** (container `3000`; Postgres `5432`; Redis `6379`)

| Serviço | API | Postgres | Redis | Outras |
| --- | --- | --- | --- | --- |
| `ms-organization` | `3001` | `5401` | `6379` | |
| `ms-traffic-model` | `3010` | `5404` | `6395` | |
| `ms-controllers` | `3100` | `5410` | `6388` | |
| `ms-connector-neo` | `3101` | | `6381` | `55079` TCP dos controladores Neo |
| `ms-connector-une` | `3102` | | `6382` | |
| `ms-detector-history` | `3103` | `5405` | | |
| `ms-ups` | `3200` | interno | | |
| `ms-connector-ups` | `3201` | | `6383` | |
| `ms-connector-ups-snmp` | `3202` | | `6384` | |
| `ms-cameras` | `3300` (container `3300`) | `5432` | `6390` | |
| `ms-video-analytics` | `3302` | `5415` | `6398` | `17000` TCP de placas |
| `ms-acom` | `3305` | interno | | |
| `ms-connector-virtual-loop` | `3390` (container `3390`) | | `6397` | `3091` TCP do laço virtual |
| `ms-alarms` | `3400` | `5414` | `6396` | |
| `ms-device-events` | `3401` | interno | | |
| `ms-audit` | `3402` | `5402` | | |
| `ms-communication-channels` | `3403` | `5403` | `6387` | |
| `ms-notifications` | `3404` | `5408` | `6391` | |
| `ms-selective-priority` | `3500` | interno | `6393` | |
| `ms-emergencies` | `3501` | interno | | |
| `ms-pmv` | `3600` | `5407` | `6385` | |
| `ms-connector-pmv` | `3601` | | `6386` | |
| `ms-inventory` | `3602` | `5411` | | |
| `ms-execution-plans` | `3603` | `5406` | `6389` | |
| `ms-simulation` | `3604` | `5409` | `6392` | |
| `ms-reports` | `3605` | `5413` | `6394` | |
| `ms-net-clip-builder` | `3606` | | | |

- **Sem porta publicada:** `kafka-init`, `minio-init`, `coturn`, `ms-reports-worker` (imagem do `ms-reports`) e os bancos `db-acom`, `db-device-events`, `db-emergencies`, `db-selective-priority`, `db-ups`. `redis-audit-metadata` (`6380`) é a cache de identidade compartilhada.
- **Local vs EC2:** `9094` só responde no EC2; `9997` do mediamtx só existe local; `17000` só escuta com `NEURAL_LPR_TCP_LISTENER_ENABLED=true`.

**No Kubernetes**

| Tipo | Como fica | Serviços |
| --- | --- | --- |
| API HTTP | `Service` `ClusterIP` na `3000` (`3300` e `3390` nos que fogem); entrada só pelo Kong | todos os `ms-*` |
| Entrada | `Ingress` para o `kong` (`8000`), o `web-attlas` (`80`) e o painel do Devtron | `kong`, `web-attlas`, `devtron` |
| TCP de campo | `LoadBalancer` ou `NodePort`, IP estável | `55079`, `17000`, `3091`, `9094` |
| Vídeo | `LoadBalancer`; UDP `8189` e a faixa do `coturn` | `mediamtx`, `coturn` |
| Admin e debug | Sem exposição pública; `port-forward` ou `Ingress` com login | `kong:8001`, `kafdrop`, console do MinIO, `mailhog` |
| Banco e Redis | `ClusterIP` | todos |

Dentro do cluster as portas de host (`3001`…`3606`, `54xx`, `63xx`) deixam de existir: todo serviço usa a porta do container e se acha pelo nome do `Service`.

## Arquitetura alvo

```
GitHub (código)            Docker Hub            cluster RKE2
  PR -> ci-develop  --->   :<sha>   --pull-->    Devtron (devtroncd)
   build + push :<sha>                              |- aplicações (1 por serviço)
                                                    |- ambientes: dev, <cliente>
infra/terraform/  ->  máquina + rede + RKE2         '- plataforma: Postgres, Redis, Kafka,
                                                       MinIO, Kong, mediamtx, coturn
```

- **Build fica no GitHub Actions.** O `ci-develop` continua publicando `:<sha>`; o Devtron recebe a imagem pronta por webhook de CI externo (§4) ou passa a construir ele mesmo numa fase posterior.
- **Uma aplicação por serviço** no Devtron, com um modelo de deploy compartilhado (Deployment com `RollingUpdate`, probes `/health/live` e `/health/ready`, `startupProbe` para a janela de boot).
- **Um ambiente por destino:** `dev` e um por cliente. Variáveis e segredos são por ambiente.
- **Terraform** num repositório próprio (`attlas-infra`), com estado remoto.

## Bootstrap passo a passo

| # | Passo | Verificação |
| --- | --- | --- |
| 0 | Pré-requisitos (abaixo) | tudo marcado |
| 1 | `terraform apply` cria a máquina, a rede e o RKE2 | `kubectl get nodes` mostra `Ready` |
| 2 | Instalar o Devtron com Helm | `kubectl -n devtroncd get pods` tudo `Running` |
| 3 | Entrar no painel e trocar a senha do `admin` | Login funciona pelo domínio |
| 4 | Conectar registry (Docker Hub) e conta do GitHub | Teste de conexão verde |
| 5 | Subir a plataforma (Postgres, Redis, Kafka, MinIO, mediamtx, coturn) | Todos `Healthy`; jobs `kafka-init` e `minio-init` concluídos |
| 6 | Criar as aplicações, `ms-organization` primeiro | Pods `Ready`; migrations aplicadas |
| 7 | Kong e `web-attlas` | `curl https://<host>/api/organization/health/ready` responde 200 |
| 8 | Corte dos dados e do DNS | ver §Corte do dev |

**Pré-requisitos (passo 0)**

- Conta AWS com permissão para EC2, VPC, S3 e DynamoDB; região `us-east-2`.
- Bucket S3 e tabela DynamoDB do estado do Terraform, criados uma vez à mão.
- Terraform, `kubectl` e `helm` na máquina de quem opera.
- Domínio e DNS (ex.: `devtron.dev-k8s.attlas.atmansystems.com`) e certificado.
- Credencial de pull do Docker Hub (`atmanadmin`) e um token do GitHub para o Devtron ler o repositório.

### 1. Terraform e RKE2

Cria uma EC2 nova (**não burstable**, ver Dimensionamento), o security group e instala o RKE2 pelo `user_data`.

```hcl
terraform {
  backend "s3" {
    bucket         = "atman-attlas-tfstate"
    key            = "dev/rke2.tfstate"
    region         = "us-east-2"
    dynamodb_table = "atman-attlas-tflock"
    encrypt        = true
  }
}
```

```hcl
resource "aws_security_group" "node" {
  name   = "attlas-${var.env}-rke2"
  vpc_id = var.vpc_id

  ingress { from_port = 80   to_port = 80   protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] }
  ingress { from_port = 443  to_port = 443  protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] }
  ingress { from_port = 6443 to_port = 6443 protocol = "tcp" cidr_blocks = var.admin_cidrs }
  ingress { from_port = 22   to_port = 22   protocol = "tcp" cidr_blocks = var.admin_cidrs }

  ingress { from_port = 9094  to_port = 9094  protocol = "tcp" cidr_blocks = var.field_cidrs }
  ingress { from_port = 55079 to_port = 55079 protocol = "tcp" cidr_blocks = var.field_cidrs }
  ingress { from_port = 17000 to_port = 17000 protocol = "tcp" cidr_blocks = var.field_cidrs }
  ingress { from_port = 3091  to_port = 3091  protocol = "tcp" cidr_blocks = var.field_cidrs }
  ingress { from_port = 8554  to_port = 8554  protocol = "tcp" cidr_blocks = var.field_cidrs }
  ingress { from_port = 8189  to_port = 8189  protocol = "udp" cidr_blocks = ["0.0.0.0/0"] }

  egress { from_port = 0 to_port = 0 protocol = "-1" cidr_blocks = ["0.0.0.0/0"] }
}

resource "aws_instance" "node" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.node.id]
  key_name               = var.key_name
  root_block_device { volume_size = 200  volume_type = "gp3" }
  user_data              = templatefile("${path.module}/cloud-init.yaml.tpl", {
    rke2_version = var.rke2_version
    tls_san      = var.tls_san
    token        = var.rke2_token
  })
  tags = { Name = "attlas-${var.env}-rke2" }
}

resource "aws_eip" "node" { instance = aws_instance.node.id }
```

```yaml
#cloud-config
write_files:
  - path: /etc/rancher/rke2/config.yaml
    content: |
      token: ${token}
      tls-san: [${tls_san}]
      write-kubeconfig-mode: "0600"
runcmd:
  - curl -sfL https://get.rke2.io | INSTALL_RKE2_VERSION=${rke2_version} sh -
  - systemctl enable --now rke2-server.service
```

- **Versões:** `rke2_version` e `instance_type` são variáveis; nunca `latest`.
- **Disco:** `local-path` (padrão do RKE2) basta no dev de nó único. Em cliente com mais de um nó, Longhorn ou EBS CSI.
- **Kubeconfig:** `/etc/rancher/rke2/rke2.yaml` na máquina; copie, troque o IP e guarde fora do Git.
- **Backup do etcd:** snapshot agendado do RKE2 enviado para S3.

### 2. Instalar o Devtron

```bash
helm repo add devtron https://helm.devtron.ai
helm repo update

helm install devtron devtron/devtron-operator \
  --create-namespace --namespace devtroncd \
  --set installer.modules={cicd}
```

- Sem `installer.modules={cicd}` instala só o painel do Kubernetes; com ele entram os pipelines de CI/CD.
- O GitOps com Argo CD é opcional (`--set argo-cd.enabled=true`) e **fica desligado** no começo.
- Fixar a versão do chart com `--version <versão>` no primeiro `install`.

Acesso ao painel:

```bash
kubectl get svc -n devtroncd devtron-service
kubectl -n devtroncd get secret devtron-secret -o jsonpath='{.data.ADMIN_PASSWORD}' | base64 -d
```

Usuário `admin`. Exponha pelo `Ingress` com TLS e troque a senha no primeiro acesso.

### 3. Plataforma

Para o bootstrap, replica o compose em vez de inventar nova arquitetura:

| Componente | No cluster | Observação |
| --- | --- | --- |
| 16 Postgres | `StatefulSet` `postgres:15-alpine` por serviço, PVC próprio, mesmos usuários e bancos | Dados migram por `pg_dump`/`pg_restore` no corte |
| Redis por serviço | `Deployment` pequeno, sem persistência | Cache: não migra dado |
| Kafka + Zookeeper | `StatefulSet` com as mesmas imagens do compose, 1 broker | Tópicos criados pelo Job `kafka-init` com a `docker/kafka-topics.list` num `ConfigMap` |
| MinIO | `StatefulSet` + PVC; Job `minio-init` | Dados migram por `mc mirror` |
| mediamtx, coturn | `Deployment` com `ConfigMap`; `LoadBalancer`/`NodePort` | Ver Mapa de portas |
| Kong | `Deployment` com `ConfigMap` do `kong.yml` | Atrás do `Ingress` |

Operadores (Strimzi para Kafka, CloudNativePG para Postgres) ficam para depois do bootstrap.

### 4. Aplicações e ambientes no Devtron

| Item | Configuração |
| --- | --- |
| Registry | Docker Hub `atmanadmin`, com a credencial de pull |
| Git | Conta do GitHub com token de leitura do `attlas-2026` |
| Cluster | O próprio cluster do Devtron como ambiente `dev`; um ambiente por cliente |
| Aplicação | Uma por serviço (`ms-organization`, `ms-cameras`, `web-attlas`…) |
| Imagem | CI externo: o `ci-develop` avisa o Devtron por webhook com a imagem `:<sha>` (abaixo) |
| Modelo de deploy | `RollingUpdate`, `maxUnavailable: 0`, probes `/health/live` e `/health/ready`, `startupProbe` com 10 min de janela |
| Variáveis e segredos | Por ambiente, na interface; valores vindos dos `.env.docker` atuais |
| Pull secret | `dockerhub-atman` no namespace `attlas` |

Começar pelos três pilotos (`ms-organization`, `ms-cameras`, `web-attlas`) e só depois criar o resto. O chart `attlas-service` (em `deploy/charts/` na branch `shared/chore/NO-CARD-devtron`) entra como chart customizado: Global Configurations → Custom charts → Import, com um `.tgz` nomeado `<chart>-vX.Y.Z.tgz` que traga o `.image_descriptor_template.json`; depois é escolhido no Base Deployment Template de cada aplicação. Fonte: [custom charts](https://docs.devtron.ai/v/v0.6/global-configurations/custom-charts).

**Webhook do CI externo.** Cada aplicação tem um pipeline de CI do tipo externo; o `ci-develop` chama, por serviço publicado:

```bash
curl -X POST "https://<devtron>/orchestrator/webhook/ext-ci/<ci-pipeline-id>" \
  -H "Content-Type: application/json" -H "api-token: $DEVTRON_API_TOKEN" \
  -d '{"dockerImage":"atmanadmin/attlas-ms-cameras:<sha>"}'
```

O token é um API Token do Devtron (Global Configurations → Authorization → API tokens), guardado como secret do GitHub. Nesse modo o Devtron não faz scan da imagem nem etapas pré/pós CI. Fonte: [GitHub Actions com Devtron](https://devtron.ai/blog/github-actions-with-devtron/).

### 5. Segredos

Os `.env.docker` têm credenciais. No Devtron entram como **segredo por ambiente**, nunca em texto claro num repositório. Valores não secretos (URLs internas, `SERVICE_NAME`) entram como variáveis comuns. O Devtron também lê segredos do External Secrets Operator (Vault, AWS Secrets Manager e outros), se ele estiver instalado no cluster: é o caminho quando um cliente exigir cofre. Fonte: [segredos com ESO](https://docs.devtron.ai/usage/applications/creating-application/secrets/eso).

## Impacto no CI/CD

Fluxo completo, versionamento e o job do GitHub Actions em [[Infraestrutura - Pipeline de CI-CD]].

| Parte | Muda? | Como |
| --- | --- | --- |
| `ci-pr` (lint, testes) | Não | Segue igual |
| `ci-develop` build e push das imagens | Não | Segue publicando `:dev` e `:<sha>` |
| `push-images.sh` | Pequeno | Precisa informar quais serviços foram publicados |
| Job novo no `ci-develop` | Sim | Chama o webhook de CI externo do Devtron para cada serviço publicado |
| Disparo do deploy no dev | Sim | Hoje manual; passa a ser pipeline do Devtron (automático no dev, com aprovação no cliente) |
| `deploy.yml` (SSH + compose) | Sim, no fim | Fica até o corte; depois é desligado, junto com `DEPLOY_HOST` e `DEPLOY_SSH_KEY` |
| `deploy-env-keys-check.sh` | Continua | Roda no CI antes do deploy |
| Secrets do GitHub | Sim | Entra um token para o Devtron; nenhuma credencial de cluster no GitHub |

## Corte do dev

O EC2 atual segue rodando até o cluster novo estar validado.

1. **Dados:** parar escrita (janela curta), `pg_dump -Fc` dos 16 bancos no EC2, `pg_restore` nos Postgres do cluster; `mc mirror` do MinIO.
2. **Verificar:** comparar contagens por banco e o smoke que o `deploy.yml` faz (status de cada serviço + Kong).
3. **DNS:** apontar `dev.v2.attlas.atmansystems.com` para o IP novo (TTL baixo antes).
4. **Campo:** câmeras, controladores e conectores apontam para o IP novo nas portas do Mapa de portas.
5. **Rollback:** reapontar o DNS para o EC2 antigo, que fica ligado e intacto por 7 dias.
6. **Depois:** desligar `deploy.yml` e remover o compose do EC2.

## Operação do dia a dia

| Situação | Como |
| --- | --- |
| Entregar uma mudança no dev | Merge no `develop` → CI publica `:<sha>` → pipeline do Devtron implanta |
| Promover para um cliente | Pipeline do ambiente do cliente com a tag testada → aprovação → implantar |
| Voltar uma versão | Histórico de deploys da aplicação → reverter |
| Hotfix | Build com tag `:<sha>` nova e deploy. Sem `docker save` por SSH |
| Config nova (env) | Editar a variável no ambiente e reimplantar |
| Atualizar RKE2 ou Devtron | Mudar a versão no Terraform ou no `helm upgrade`; nunca `latest` |

## Fases e critério de pronto

| Fase | Entrega | Pronto quando |
| --- | --- | --- |
| 0 | Pré-requisitos e repositório de infra | Lista do passo 0 completa |
| 1 | Terraform + RKE2 + Devtron | `kubectl get nodes` `Ready`; painel acessível por domínio |
| 2 | Plataforma e 3 serviços piloto | Sobem `Healthy` com Postgres, Redis e Kafka da plataforma |
| 3 | Os 29 serviços | Dev inteiro implantado só pelo painel |
| 4 | Pipeline automático no dev | Merge no `develop` chega ao dev sem intervenção |
| 5 | Corte do dev (dados, DNS, campo) | Duas releases seguidas só pelo Devtron; EC2 antigo desligado |
| 6 | Clientes: um ambiente por cliente, promoção com aprovação | Um cliente piloto promovido e revertido |
| 7 | Migrations como Job de pré-deploy | Falha de migration para o deploy sem derrubar o que roda |

## Riscos e pontos em aberto

- **Peso do Devtron.** Pede 6 CPU e 13 GB só para ele com mais de 5 aplicações, e não aceita instância burstable. O dimensionamento da máquina nova precisa ser validado.
- **Recursos da edição OSS.** O README lista SSO e RBAC na edição open source. Aprovação de deploy, janela de deploy e auditoria **não estão confirmadas** como OSS (o material de marketing as trata como Enterprise). Se não estiverem, a aprovação do ADR 25 fica no PR/GitHub Environment que dispara o deploy do cliente.
- **Clientes on-premise sem internet.** Um painel central pode não alcançar o cluster do cliente; avaliar uma instalação por cliente ou um agente.
- **Postgres e Kafka com estado em Kubernetes.** São 16 bancos e um broker. O bootstrap replica o compose; operadores e backup agendado entram depois.
- **TCP de campo e vídeo** (`55079`, `17000`, `3091`, `9094`, RTSP, UDP `8189`): exigem IP estável e regra no security group; câmeras e controladores precisam ser reapontados.
- **WebSocket e SSE pelo Kong:** `maxUnavailable: 0` e o checksum evitam queda, e o Kong só reinicia quando o `kong.yml` muda.
- **Versões:** nenhuma foi fixada aqui (RKE2, Devtron, chart). Fixar cada uma no primeiro `apply`.
