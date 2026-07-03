# infra/ — infraestrutura do Attlas 2026

**Público:** engenheiros de DevOps que provisionam, atualizam ou operam o cluster de uma cidade. Este documento é o guia operacional; as decisões de arquitetura e o dimensionamento estão em `docs/`.

Este diretório reúne tudo que sustenta o Attlas fora do código de aplicação: o cluster Kubernetes, os addons de base e o chart que instala a stack. A regra é uma cidade (cliente) por cluster RKE2, e um release do chart por cluster. O código dos microsserviços está em `apps/`.

Índice rápido: [provisionar um cluster](#provisionar-um-cluster-novo-deploy-manual) · [deploy contínuo (GitOps)](#deploy-contínuo-gitops) · [operação](#operação-comandos-comuns) · [[05-FALHAS-E-RECUPERACAO|modos de falha]].

## As três camadas

A infraestrutura é montada em três camadas, aplicadas nesta ordem. Cada uma tem um README próprio com o procedimento detalhado.

```
1. Terraform  ->  provisiona as VMs e o cluster RKE2 (single-node ou HA 3+3)
2. Bootstrap  ->  instala os addons de base no cluster (local-path, KEDA)
3. Helm       ->  instala a stack Attlas (7 microsserviços reais + infra + frontend)
```

| Camada       | Pasta                                          | O que entrega                                                         | README                                |
| ------------ | ---------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------- |
| 1. Cluster   | `terraform/rke2-kvm/` | VMs KVM/libvirt e RKE2 pinado, configurado no boot via cloud-init     | [[Provisionar cluster - Terraform RKE2|ver]] |
| 2. Addons    | `bootstrap/`                   | StorageClass default (local-path) e KEDA (autoescala de pods)         | [[Bootstrap - KEDA e autoescala|ver]]          |
| 3. Aplicação | `helm/attlas/`               | Chart com os microsserviços reais, Kafka, Kong, Postgres, Redis e web | [[Deploy - Helm chart|ver]]        |

As regras de escala de pods (ScaledObjects do KEDA) ficam em [[Regras de escala - ScaledObjects]] e são versionadas no chart.

## Mapa de diretórios

```
infra/
├── terraform/rke2-kvm/     # camada 1: IaC do cluster (libvirt/KVM, host-agnóstico)
│   ├── main.tf, variables.tf, versions.tf, outputs.tf
│   ├── cloud-init/         # templates que instalam rke2-server / rke2-agent no boot
│   └── terraform.tfvars.example
├── bootstrap/              # camada 2: addons de base do cluster
│   ├── install.sh          # script idempotente (local-path + KEDA)
│   ├── keda-values.yaml
│   └── scaling/            # templates de ScaledObject (REST por CPU, consumidor por lag)
├── helm/attlas/            # camada 3: chart da aplicação
│   ├── Chart.yaml, values.yaml
│   ├── templates/          # microservices, databases, redis, kong, messaging, web, scaledobjects
│   ├── files/              # kong.yml, kafka-topics.list, mediamtx.yml (cópias de docker/) + env/ (gitignored)
│   └── load-images.sh      # carrega as imagens privadas no containerd do node
└── docs/                   # decisões, dimensionamento, produção e modos de falha
```

## Pré-requisitos

Antes do primeiro deploy:

- **Ferramentas**: `terraform`, `kubectl`, `helm` e um host com KVM/libvirt (para a camada 1). Node 22 (`nvm use`) para os comandos de build executados na raiz do repositório.
- **Imagens construídas**: o chart usa imagens privadas `atmanadmin/attlas-*`, que precisam existir antes do deploy. Construa-as na raiz com `npm run docker:build`. O `load-images.sh` apenas exporta imagens já presentes no containerd de origem; ele não as constrói.
- **Variáveis de ambiente dos microsserviços**: os arquivos `apps/<ms>/.env.docker` são ignorados pelo git por conterem credenciais. Gere-os com `npm run setup:env` na raiz. O `JWT_SECRET` usado no deploy é lido desses arquivos.

## Provisionar um cluster novo (deploy manual)

> **Estado atual:** o deploy é manual, pelo `helm install` do passo 3. A distribuição por GitOps (ver [[04-CI-CD]]) é o modelo-alvo e ainda não foi implementada: não existem a pasta `values/` nem o recurso GitRepo no repositório.

**1. Cluster (Terraform).** Em um host com KVM/libvirt (local, servidor ou EC2 com virtualização aninhada):

```bash
cd infra/terraform/rke2-kvm
cp terraform.tfvars.example terraform.tfvars   # o default é single-node (desenvolvimento);
                                               # para uma cidade em HA, use o perfil 3+3 comentado no exemplo
terraform init && terraform apply
terraform output kubeconfig_hint               # instruções para baixar o kubeconfig
export KUBECONFIG=<caminho-do-kubeconfig>
```

**2. Addons (Bootstrap).** Com o `KUBECONFIG` apontando para o cluster recém-criado:

```bash
cd infra/bootstrap && ./install.sh             # instala o local-path (como default) e o KEDA
```

**3. Aplicação (Helm).** Carregue as imagens, prepare as variáveis de ambiente e instale o chart:

```bash
# carrega as imagens privadas no containerd do node (uma vez por worker no perfil HA)
sudo ./infra/helm/attlas/load-images.sh ubuntu@<ip-do-worker>

# copia as variáveis de ambiente dos microsserviços (gere antes com `npm run setup:env`)
for ms in ms-organization ms-traffic-model ms-pmv ms-cameras \
          ms-connector-une ms-communication-channels ms-audit; do
  cp apps/$ms/.env.docker infra/helm/attlas/files/env/$ms.env
done

helm install attlas ./infra/helm/attlas -n attlas --create-namespace \
  --set jwtSecret="$JWT_SECRET"                 # mesmo valor definido no .env.docker dos microsserviços
```

O procedimento detalhado de cada camada está no README da respectiva pasta. Para provisionar outra cidade, repita a sequência em um cluster novo.

## Deploy contínuo (GitOps)

> **Estado atual: modelo-alvo, ainda não provisionado.** Hoje o deploy é o `helm install` manual descrito acima.

O modelo pretendido: cada cluster declara em Git a versão e os serviços que executa (`values/<cidade>.yaml`), e um controlador reconcilia o estado (`helm upgrade`), sem execução manual de `helm` no cluster. O desenho completo está em [[04-CI-CD]].

**Fleet** é a ferramenta escolhida pelo projeto, integrada ao Rancher da Atman. O Rancher central observa o repositório e aplica o chart por cluster:

```yaml
# GitRepo (no cluster de gestão, namespace fleet-default) — exemplo do modelo-alvo
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata: { name: attlas, namespace: fleet-default }
spec:
  repo: <url-do-repositório>
  paths: [infra/helm/attlas] # com um fleet.yaml apontando o chart e o values/<cidade>.yaml
  targets:
    - clusterSelector: { matchLabels: { city: quito } }
```

**ArgoCD** é a alternativa, com o mesmo princípio, usando um recurso `Application` que aponta para o chart:

```yaml
# Application (namespace argocd) — exemplo do modelo-alvo
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata: { name: attlas-quito, namespace: argocd }
spec:
  project: default
  source:
    repoURL: <url-do-repositório>
    path: infra/helm/attlas
    helm: { valueFiles: [../../values/quito.yaml] }
  destination: { server: <api-do-cluster>, namespace: attlas }
  syncPolicy: { automated: { prune: true, selfHeal: true } }
```

Adotar qualquer uma das duas exige criar a pasta `values/<cidade>.yaml`, migrar a CI para tags imutáveis e ativar o controlador. É um trabalho à parte, descrito em [[04-CI-CD]].

## Operação (comandos comuns)

Estado da stack:

```bash
kubectl get pods -n attlas
kubectl get scaledobjects,hpa -n attlas          # estado da autoescala (KEDA)
kubectl logs -n attlas deploy/ms-organization -f # logs de um microsserviço
```

Atualizar a stack após uma mudança em `values.yaml`, em uma imagem ou na configuração de escala:

```bash
helm upgrade attlas ./infra/helm/attlas -n attlas --set jwtSecret="$JWT_SECRET"
```

Publicar uma imagem nova no cluster, depois de construí-la com `npm run docker:build`:

```bash
sudo ./infra/helm/attlas/load-images.sh ubuntu@<ip-do-worker>
kubectl rollout restart -n attlas deploy/<ms>    # reinicia o deployment para recarregar a imagem
```

Para ajustar a escala de um serviço, edite o bloco `scaling:` do `values.yaml` e aplique com `helm upgrade`. Não edite o ScaledObject diretamente no cluster (`kubectl edit`): isso desalinha o estado da fonte de verdade em Git. As regras e a calibração de escala estão em [[Regras de escala - ScaledObjects]].

## Documentação

A pasta `docs/` é a fonte de verdade sobre as razões por trás da infraestrutura.

| Documento                                                               | Assunto                                             | Público               |
| ----------------------------------------------------------------------- | --------------------------------------------------- | --------------------- |
| [[01-VISAO-GERAL]]                         | Plataforma; o que escala e o que não escala         | conceitual (todos)    |
| [[02-DIMENSIONAMENTO]]                 | Teste de capacidade, métricas e cálculo do hardware | arquiteto e comercial |
| [[03-PRODUCAO]]                               | Arquitetura de produção (topologia 3+3 HA, papéis)  | arquiteto e DevOps    |
| [[04-CI-CD]]                                     | Distribuição da aplicação (build, push, GitOps)     | DevOps                |
| [[05-FALHAS-E-RECUPERACAO]]       | Armadilhas, modos de falha e recuperação            | DevOps                |
| [[06-PROBLEMAS-IDENTIFICADOS]] | Problemas em aberto (WebSocket sob escala de pods)  | DevOps e backend      |
| [[arquitetura]]                             | Diagrama Mermaid da infraestrutura                  | todos                 |

## O que roda hoje

- **Laboratório**: o cluster `attlas-quito`, no servidor de testes, com 3 control-plane e 3 workers, provisionado por esta mesma IaC. Serve como prova de conceito do desenho de produção.
- **Produção (Quito)**: a mesma topologia 3+3 HA, com workers maiores, sobre Nutanix.

## Configuração das VMs (o hardware do cluster)

Configuração de **produção** (hardware forte), RKE2 HA 3+3. **Hardware total do cluster: 60 vCPU / 120 GB / ~3 TB SSD.** A Atman entrega a configuração das 6 VMs abaixo; o servidor físico embaixo é dimensionado por quem hospeda. O servidor de teste roda a mesma topologia num cluster menor, por ser prova de conceito. Cálculo, armazenamento e limites por serviço em [[02-DIMENSIONAMENTO]] (seções 5 e 7).

| Papel                       | Qtd    | vCPU | RAM   | SSD    |
| --------------------------- | ------ | ---- | ----- | ------ |
| Control-plane               | 3      | 4    | 8 GB  | 100 GB |
| Worker                      | 3      | 16   | 32 GB | 200 GB |
| Pool de dados (Nutanix CSI) | 1 pool | -    | -     | ~2 TB  |

Soma: 60 vCPU / 120 GB / ~3 TB SSD (~0,9 TB nos discos de SO + ~2 TB no pool de dados). Os discos das VMs são pequenos (só SO/imagens); o dado dos serviços com estado fica num **pool via Nutanix CSI** - 1 volume por banco, instância única sem réplica (db-audit o maior). Estimativa ~2 TB (attlas 25 = ~700 GB hoje), expansível; backup é do cliente. Os limites de hardware e de escala por serviço estão em [[02-DIMENSIONAMENTO]] (seção 7); a rede e o acesso do cliente em [[03-PRODUCAO]] (seções 1 e 6).
