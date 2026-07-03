---
tags:
  - kubernetes
  - infra
  - diagrama
---

# Arquitetura da infraestrutura (Mermaid)

Diagrama em código, espelhado de `infra/docs/arquitetura.mmd`. Versão editável em quadro: [[Arquitetura.excalidraw|Excalidraw]]. Contexto: [[01-VISAO-GERAL]], [[03-PRODUCAO]], [[04-CI-CD]].

```mermaid
---
config:
  layout: dagre
  look: handDrawn
  theme: dark
  flowchart:
    nodeSpacing: 60
    rankSpacing: 70
---
flowchart TB

%% BLOCO A — Pipeline CI/CD (GitOps)
subgraph PIPE[" Pipeline CI / CD  -  GitOps "]
    direction TB
    CODE(["Repo de Codigo"])
    GHA(["GitHub Actions CI<br/><i>builda 1 imagem imutavel versionada,<br/>a mesma para todos os clientes</i>"])
    REG[("Docker Registry")]
    GIT[("Estado em Git (GitOps)<br/><i>values/&lt;cliente&gt;.yaml:<br/>release set + servicos habilitados</i>")]
    FLEET{{"Rancher Fleet<br/><i>reconcilia o estado do Git</i>"}}
    OUT["helm upgrade do chart attlas<br/>(infra/helm/attlas) no cluster do cliente"]:::edge
    CODE --> GHA -->|"push da imagem imutavel"| REG -->|"tag fixada em"| GIT --> FLEET --> OUT
end

%% BLOCO B — Infraestrutura por cliente (servidor -> cluster)
subgraph INFRA[" Infraestrutura por cliente "]
    direction TB
    RAN["Rancher + Fleet<br/><i>painel + reconciliacao GitOps</i>"]
    HV["Servidor fisico<br/><i>KVM/libvirt (teste)<br/>Nutanix AHV/Prism (prod)</i>"]
    TF["Terraform - rke2-kvm<br/><i>IaC: provisiona as VMs + RKE2</i>"]
    TF ==>|"terraform apply"| HV
    HV ==>|"cria as 6 VMs"| CID
    RAN -.->|"deploy helm (Fleet) / observa"| CID

    subgraph CID[" Cluster attlas-quito  -  RKE2 / Kubernetes  -  HA 3+3 fixo  -  producao 60 vCPU / 120 GB / ~3 TB (dado no pool CSI ~2 TB) "]
        direction TB
        subgraph CPLANE["Control-plane HA  -  RKE2 server + etcd (quorum 3)"]
            direction LR
            S0["VM server-0<br/><i>4 CPU / 8 GB</i>"]:::vm
            S1["VM server-1<br/><i>4 CPU / 8 GB</i>"]:::vm
            S2["VM server-2<br/><i>4 CPU / 8 GB</i>"]:::vm
        end
        VIP{{"kube-vip - VIP 192.168.122.50<br/><i>endpoint HA do API (leader-election)</i>"}}
        subgraph WORKERS["Workers  -  RKE2 agent  -  capacidade FIXA (sem autoscaler de no)  -  producao 16 vCPU / 32 GB / 200 GB (servidor de teste roda menor)"]
            direction LR
            W0["VM worker-0<br/><i>16 vCPU / 32 GB / 200 GB</i>"]:::vm
            W1["VM worker-1<br/><i>16 vCPU / 32 GB / 200 GB</i>"]:::vm
            W2["VM worker-2<br/><i>16 vCPU / 32 GB / 200 GB</i>"]:::vm
        end
        subgraph SCALE[" Workload nos workers "]
            direction LR
            POD["Pods nos workers<br/><i>stateless (ms-*/kong/web) escalam;<br/>bancos/Kafka/Redis: 1 replica + PV, nao escalam</i>"]
            KEDA["KEDA<br/><i>regras de escala horizontal dos pods<br/>(ScaledObjects: CPU + lag de Kafka)</i>"]
            POD ---|"KEDA ajusta as replicas"| KEDA
        end
        S0 -.- VIP
        S1 -.- VIP
        S2 -.- VIP
        VIP -.- W0
        VIP -.- W1
        VIP -.- W2
        W0 -.-> SCALE
        W1 -.-> SCALE
        W2 -.-> SCALE
    end
end

classDef vm fill:#15324f,stroke:#3b82f6,color:#fff
classDef edge fill:#1e293b,stroke:#94a3b8,color:#e2e8f0
```

> Fonte: `infra/docs/arquitetura.mmd`. O `look: handDrawn` exige mermaid recente; se não renderizar, remova o bloco `config:` do topo. Worker de produção = 16 vCPU / 32 GB / 200 GB (o servidor de teste roda a mesma topologia num cluster menor).
