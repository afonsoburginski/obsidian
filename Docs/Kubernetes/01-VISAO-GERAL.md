# Infraestrutura Attlas — Definições Gerais

> [!abstract] Propósito desta spec
> **Fonte única das definições gerais da infraestrutura Attlas** — os componentes e o que cada um faz, a topologia de cluster, as regras de escalonamento (KEDA), a observabilidade e a distribuição por GitOps — válidas para **qualquer cluster de cliente**. O **servidor** (ambiente de teste, virtualizado em KVM) é a referência concreta onde tudo isto é validado: o inventário real (§3) comprova as definições. A operação no **hardware de produção do cliente** (Nutanix) está em [[03-PRODUCAO]]; o pipeline de distribuição, em [[04-CI-CD]]. Diagrama completo: [[arquitetura]] (`arquitetura.mmd`).

- **Versão:** 5.0 · **Data:** 19/06/2026

---

## 1. Arquitetura (visão geral)

> [!tip] Diagrama da arquitetura: ver **[[arquitetura]]** (`arquitetura.mmd`) — servidor → clusters → nós → pods, em cascata.

- O **servidor** (1 máquina física) é fatiado pelo **KVM** em **VMs**; nele roda o **Rancher** (no cluster de gestão).
- Cada **cidade** é um **cluster RKE2** feito de VMs: **3 controllers + 3 workers** (topologia **fixa, HA**, por redundância). Os **pods** da aplicação rodam nos workers.
- O cluster **`local`** é a **base/gestão** (roda o Rancher) — **não** roda aplicação. A aplicação roda **só nos clusters de clientes** (ex.: `attlas-quito`).
- **Escalamos apenas os serviços (stateless), via KEDA** (escala de **pods**, não de VMs). Os **bancos de dados não são distribuídos nem escalados**: ficam single-instance com **volume persistente**. Só os microsserviços stateless sobem/descem réplicas.

---

## 2. As peças (o que cada uma faz)

| Peça            | Função                                                                         |
| --------------- | ------------------------------------------------------------------------------ |
| **KVM/libvirt** | Fatia o servidor em **VMs** com CPU/RAM dedicados                              |
| **VM**          | "Computador dentro do computador" — unidade de hardware do cluster             |
| **Controller**  | VM cérebro do cluster (control-plane + etcd); decide o que roda onde           |
| **Worker**      | VM operária (fixa); é onde os **pods** da aplicação rodam                      |
| **Pod**         | Um container em execução (descartável; o RKE2 recria se cair)                  |
| **RKE2**        | O Kubernetes que organiza os pods entre as VMs                                 |
| **kube-vip**    | Mantém o **VIP** do API server (HA) com leader-election entre os 3 servers     |
| **Rancher**     | Painel único para observar/comandar os clusters                                |
| **Fleet**       | Entrega GitOps — aplica os charts nos clusters (ver [[04-CI-CD]])              |
| **KEDA**        | Escalonador horizontal de **pods** (ScaledObjects) — só nos serviços stateless |
| **Kong**        | Gateway: toda chamada externa passa por ele                                    |
| **Kafka**       | Barramento de eventos entre os microsserviços                                  |

---

## 3. Estado atual (inventário validado no servidor)

> [!example] Referência concreta das definições — validado em 19/06/2026 (Rancher API + SSH).

**Clusters:**

| Cluster              | ID Rancher | Como roda           | Recursos                                               | Papel                                             |
| -------------------- | ---------- | ------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| **gestão** (`local`) | `local`    | RKE2 direto no host | 112 CPU / 125 GB                                       | Base/gestão — roda o **Rancher**; não roda Attlas |
| **attlas-quito**     | `c-45l82`  | 6 VMs KVM (**HA**)  | 3 control-plane (4 CPU/8 GB) + 3 workers (8 CPU/16 GB) | A **cidade** — onde o Attlas roda                 |

**Nós do attlas-quito (topologia fixa, por redundância):**

| Nó                         | Papel                                   | Recursos      | max-pods | Ciclo de vida           |
| -------------------------- | --------------------------------------- | ------------- | -------- | ----------------------- |
| `attlas-quito-server-0..2` | control-plane + etcd (**HA, quórum 3**) | 4 CPU / 8 GB  | 110      | VM fixa (sempre existe) |
| `attlas-quito-agent-0..2`  | worker (workload da aplicação)          | 8 CPU / 16 GB | 110      | VM fixa (sempre existe) |

- **HA do API server:** **kube-vip** mantém um VIP (`192.168.122.50`) com leader-election entre os 3 servers; kubeconfig e agents apontam pro VIP — se um server cai, o endpoint segue.
- **6 VMs fixas — sem elasticidade de VM.** A escala automática é só de **pods** (KEDA, §4). **Não há autoscaler de nó** (capacidade de VM é fixa/planejada).
- **Control-plane dedicado:** os 3 servers têm taint `CriticalAddonsOnly=true:NoExecute` → o workload da aplicação roda nos **3 workers**.
- **Storage:** `local-path-provisioner` é a StorageClass default (PV local) — usada pelos bancos (single-instance, ver §4).
- **Rede:** VMs em NAT do libvirt (`192.168.122.0/24`) — não acessíveis diretamente de fora do servidor (ver §7).
- **Acesso:** kubeconfig `~/iac/quito/kubeconfig-attlas-quito.yaml` (aponta pro VIP).
- **Versões:** RKE2 `v1.35.5+rke2r2` · Ubuntu 24.04.4 LTS.

**Alvo de teste de carga** (dedicado, isola o teste):

| Recurso    | Detalhe                                                              |
| ---------- | -------------------------------------------------------------------- |
| Deployment | `burner` (ns `stress`), imagem `hpa-example`                         |
| Escala     | **KEDA ScaledObject** (CPU 50%, 1→20) → gera o HPA `keda-hpa-burner` |
| Posição    | roda nos **workers** (control-plane tem taint)                       |

---

## 4. Como a escala funciona

A escala **automática é só de pods**, via **KEDA**. A capacidade de VM é **fixa** (6 nós, por redundância) — **não** há autoscaling de VM. Mais cidades = mais clusters (manual).

| Nível           | O que cresce             | Quando                                          | Como                                                          |
| --------------- | ------------------------ | ----------------------------------------------- | ------------------------------------------------------------- |
| **Pods (KEDA)** | nº de réplicas de um pod | gatilho do ScaledObject (CPU/RAM, lag de Kafka) | KEDA cria/ajusta um HPA por baixo, dentro dos 3 workers fixos |
| **Clusters**    | nº de cidades            | cliente/cidade nova                             | Replicar a receita com outro `cluster_name` (manual)          |

> [!important] Escala = serviços, não bancos
> O KEDA escala **apenas os serviços stateless** (`ms-*`). **Bancos NÃO escalam** — `db-*`, `redis-*`, `kafka`, `zookeeper` ficam **single-instance + PV** (local-path) e **não recebem ScaledObject**. Não há banco distribuído (decisão atual).

### 4.1 Regras de escalonamento com KEDA — decisão e como configuramos

> [!important] Decisão (best practice de gestão com KEDA)
> A escala horizontal de pods é gerida **exclusivamente por ScaledObjects do KEDA**, declarados **como código no chart** `infra/helm/attlas` (bloco `scaling` em `values.yaml`) — **um ScaledObject por serviço stateless**. **Bancos/broker/cache não entram em `scaling`** → não recebem ScaledObject → não escalam. Regra versionada, auditável e reconciliada por GitOps; **sem `kubectl` manual** no cluster.

**Onde a regra vive (fonte única de verdade).** O mapa `scaling:` no `values.yaml` do chart — uma entrada por serviço com `min`/`max` e os gatilhos (`cpu`, `kafka`). O template `templates/scaledobjects.yaml` itera esse mapa e gera um ScaledObject por entrada, _gated_ por `keda.enabled`. Quem **não** está no mapa não escala (é assim que os bancos ficam de fora).

**Como atualizar uma regra (fluxo GitOps).** Editar a entrada do serviço em `values/<cliente>.yaml` (ou no `values.yaml` base) → commit → **Fleet** reconcilia → `helm upgrade` → KEDA aplica o ScaledObject novo e ajusta o HPA por baixo. **Nunca** editar o ScaledObject direto no cluster (`kubectl edit`) — perde a fonte de verdade no Git.

**Como escolher o gatilho** (a tabela por serviço fica em [[Regras de escala - ScaledObjects]]):

| Natureza da carga           | Gatilho                                            | Por quê                                      |
| --------------------------- | -------------------------------------------------- | -------------------------------------------- |
| REST/síncrono e compute     | **`cpu`** (50–70% util); `memory` se memória-bound | carga = requisições/CPU                      |
| Consumidor de eventos       | **`kafka`** (lag do consumer group)                | sinal real de fila acumulando (event-driven) |
| Híbrido (REST + consumidor) | **`cpu` + `kafka`** no mesmo ScaledObject          | KEDA escala pelo **maior** gatilho           |
| (opcional) por RPS/latência | **`prometheus`** (Rancher Monitoring)              | métrica customizada                          |
| Banco / cache / broker      | **nenhum**                                         | stateful: single-instance + PV, não escala   |

**Parâmetros e calibração:**

- `min ≥ 1` nos serviços sempre-ligados (sem scale-to-zero nos críticos).
- `max` limitado pela **CPU/RAM dos workers** (alvo do cluster: 16 vCPU / 32 GB; servidor de teste hoje 8 vCPU / 16 GB, ver [[02-DIMENSIONAMENTO]] §5) - a soma dos picos tem que caber em 2 de 3 (N+1).
- `kafka.lag` (lagThreshold): msgs de lag por réplica antes de escalar (default 50 no chart; subir p/ alto volume).
- Kafka interno = `sasl: none` / `tls: disable`, bootstrap `kafka.attlas.svc.cluster.local:29092`. Com SASL/TLS no futuro → `TriggerAuthentication`.

**Validado no servidor.** KEDA `v2.16.1` (ns `keda`: operator + metrics-apiserver + admission). ScaledObject `burner` (`cpu` 50%, 1→20) gerando o HPA `keda-hpa-burner` — escala de pods comprovada nos workers. Os ScaledObjects dos `ms-*` sobem junto com a stack (via chart) quando as imagens estão publicadas.

> [!note] O limite real é CPU/RAM (não o `max-pods`)
> `max-pods=110` é só teto; o que limita a densidade de pods por worker é **CPU/RAM (requests)**. Como os workers têm tamanho fixo (cluster: 16 vCPU / 32 GB; servidor de teste hoje 8/16), dimensione os requests dos serviços para caber. Memória não é compressível - se o uso real estourar a RAM do nó, o kernel faz **OOM-kill**/eviction.

> [!note] Load balancer é outro eixo (não cria capacidade)
> O **Ingress nginx** (porta 80/443 do host) + **kube-proxy** apenas **repartem** o tráfego entre as réplicas existentes. Quem **cria capacidade** é o **KEDA** (pods). Não há LB de nuvem.

---

## 5. Observabilidade — Rancher Monitoring

- Stack único no `attlas-quito`: **Prometheus + Grafana + Alertmanager** (app oficial do Rancher).
- **Acesso:** UI do Rancher → cluster **attlas-quito** → **Monitoring** → Prometheus / Grafana.
- Mostra uso de CPU/RAM por nó e por pod, contagem de réplicas (kube-state-metrics) e saúde dos targets.

---

## 6. Comandos — testar a escala de pods (KEDA)

> **Carga:** na **sua máquina** (com [`vegeta`](https://github.com/tsenart/vegeta)), contra o endpoint exposto do serviço. **Observação:** no **servidor** (SSH `develop@10.1.1.115`), com `alias kq='kubectl --kubeconfig ~/iac/quito/kubeconfig-attlas-quito.yaml'`.

```bash
# 1) gerar carga com VEGETA (na sua máquina) — sobe a CPU dos pods -> KEDA escala réplicas
echo "GET http://<endpoint-exposto-do-servico>" | vegeta attack -rate=300 -duration=180s | vegeta report

# 2) acompanhar ao vivo (no servidor)
kq -n stress get scaledobject,hpa -w     # KEDA/HPA subindo réplicas
kq -n stress get pods -o wide            # pods novos (nos workers)
kq top pods -n stress                    # uso real

# 3) parar a carga (Ctrl+C no vegeta) -> KEDA volta ao minReplicaCount

# 4) ajuste manual: editar min/max no ScaledObject (a fonte de verdade da escala)
kq -n stress edit scaledobject burner
```

> As VMs (nós) são **fixas** — não há `terraform apply` de escala nem autoscaler de nó. O que escala é o **pod**, pelo KEDA.

---

## 7. Notas operacionais (cuidados do ambiente)

| Ponto de atenção            | Como tratar                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **HA via kube-vip**         | VIP `192.168.122.50` com leader-election; o cert do API inclui o VIP (`tls-san`). **NIC = `ens3`** nessas VMs (não enp1s0) |
| **Corrida de rede no boot** | O install do RKE2 no cloud-init tem **retry** (no boot a rede pode não estar pronta e o download do binário falha)         |
| **Control-plane dedicado**  | Os 3 servers têm taint `CriticalAddonsOnly=true:NoExecute` → workload da aplicação vai pros 3 workers                      |
| **Bancos = stateful**       | Single-instance + **PV** (local-path); **não** recebem ScaledObject (não escalam) — só os `ms-*` stateless                 |
| **Acesso de fora (NAT)**    | Expor via ingress do cluster de gestão (`*.10.1.1.115.sslip.io`) com Service sem seletor + Endpoints → NodePort da cidade  |
| **`local` é só gestão**     | Workload vai nas cidades; o cluster `local` só roda o Rancher                                                              |

---

## 8. Ambiente de teste × Produção

A camada de virtualização difere; **RKE2 e Rancher funcionam igual**.

| Aspecto      | Servidor de teste | Produção (cliente Quito) |
| ------------ | ----------------- | ------------------------ |
| Fatia em VMs | **KVM** (libvirt) | **Nutanix** (Prism)      |
| Kubernetes   | RKE2 v1.35.5      | RKE2 (igual)             |
| Painel       | Rancher           | Rancher (igual)          |

Decisão de operação em produção (com Nutanix): ver [[03-PRODUCAO]].
