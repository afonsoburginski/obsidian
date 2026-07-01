---
tags:
  - kubernetes
  - infra
  - diagrama
---

# Arquitetura (diagrama)

Diagrama completo da infraestrutura: pipeline CI/CD (GitOps) e infraestrutura por cliente (servidor -> cluster -> nos -> pods). Referenciado por [[01-VISAO-GERAL]].

```mermaid
flowchart TB

subgraph PIPE[" Pipeline CI / CD  -  GitOps "]
    direction TB
    CODE(["Repo de Codigo"])
    GHA(["GitHub Actions CI<br/><i>builda 1 imagem imutavel versionada,<br/>a mesma para todos os clientes</i>"])
    REG[("Docker Registry")]
    GIT[("Estado em Git (GitOps)<br/><i>values/&lt;cliente&gt;.yaml:<br/>release set + servicos habilitados</i>")]
    FLEET{{"Rancher Fleet<br/><i>reconcilia o estado do Git</i>"}}
    OUT["helm upgrade do chart attlas<br/>(infra/helm/attlas) no cluster do cliente"]
    CODE --> GHA -->|"push da imagem imutavel"| REG -->|"tag fixada em"| GIT --> FLEET --> OUT
end

subgraph INFRA[" Infraestrutura por cliente "]
    direction TB
    RAN["Rancher + Fleet<br/><i>painel + reconciliacao GitOps</i>"]
    HV["Servidor fisico<br/><i>KVM/libvirt (teste)<br/>Nutanix AHV/Prism (prod)</i>"]
    TF["Terraform - rke2-kvm<br/><i>IaC: provisiona as VMs + RKE2</i>"]
    TF ==>|"terraform apply"| HV
    HV ==>|"cria as 6 VMs"| CID
    RAN -.->|"deploy helm (Fleet) / observa"| CID

    subgraph CID[" Cluster attlas-quito  -  RKE2 / Kubernetes  -  HA 3+3 fixo "]
        direction TB
        subgraph CPLANE["Control-plane HA  -  RKE2 server + etcd (quorum 3)"]
            direction LR
            S0["VM server-0<br/><i>4 CPU / 8 GB</i>"]:::vm
            S1["VM server-1<br/><i>4 CPU / 8 GB</i>"]:::vm
            S2["VM server-2<br/><i>4 CPU / 8 GB</i>"]:::vm
        end
        VIP{{"kube-vip - VIP 192.168.122.50<br/><i>endpoint HA do API (leader-election)</i>"}}
        subgraph WORKERS["Workers  -  RKE2 agent  -  capacidade FIXA (sem autoscaler de no)"]
            direction LR
            W0["VM worker-0<br/><i>8 CPU / 16 GB</i>"]:::vm
            W1["VM worker-1<br/><i>8 CPU / 16 GB</i>"]:::vm
            W2["VM worker-2<br/><i>8 CPU / 16 GB</i>"]:::vm
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
```

> Fonte: `infra/docs/arquitetura.mmd` (branch `shared/feat/SOFTWARE-1719`). O original usa `look: handDrawn` + tema dark; aqui simplifiquei o front-matter pro mermaid nativo do Obsidian renderizar sem plugin.
