---
tags:
  - doc
  - kubernetes
  - infra
aliases:
  - "Kubernetes e infra"
  - "00 - Kubernetes e infra"
  - "00 - Indice"
  - "Kubernetes / Infra Attlas - Indice"
atualizado: 2026-07-31
---

# Kubernetes e infra

Índice da infraestrutura do Attlas. A **fonte de verdade é o repo**
`~/Área de trabalho/Developer/kubernetes` (`bootstrap/`, `helm/attlas`, `terraform/rke2-kvm`, `docs/`).
Atenção: esse repo **não é um repositório git**, então não há histórico nem branch para consultar; o que
está no disco é o que existe.

> [!warning] Conteúdo pendente de revisão (lote 9)
> Estas notas foram escritas em 03/07/2026 e ainda descrevem o cluster de teste `attlas-quito` como
> vivo, além de tratar elasticidade de nó de forma desatualizada. A revisão de conteúdo é o último lote
> do [[Plano - atualização da documentação do vault]]. Até lá, conferir contra o repo antes de agir.

## Documentos que vivem no repo

O vault não mantém mais cópia destes seis: cópia manual desatualiza calado. Abrir direto em
`Developer/kubernetes/docs/`:

| Arquivo | Assunto |
| --- | --- |
| `docs/01-VISAO-GERAL.md` | componentes, topologia de cluster, KEDA, observabilidade, GitOps. Comece por aqui |
| `docs/02-DIMENSIONAMENTO.md` | teste de capacidade, N+1, cálculo de hardware e recurso por serviço |
| `docs/03-PRODUCAO.md` | operação no hardware de produção do cliente (Nutanix) |
| `docs/04-CI-CD.md` | pipeline: 1 branch, imagem imutável, Fleet GitOps por cluster |
| `docs/05-FALHAS-E-RECUPERACAO.md` | armadilhas de instalação, modos de falha e recuperação |
| `docs/06-PROBLEMAS-IDENTIFICADOS.md` | problemas em aberto sob escala de pods (WebSocket e monitoramento por dispositivo) |

## Notas deste domínio

- [[Kubernetes - Arquitetura]] - diagrama Mermaid do CI/CD GitOps mais o cluster.
- [[Kubernetes - Arquitetura.excalidraw|Kubernetes - Arquitetura (Excalidraw)]] - mesmo desenho em quadro editável.
- [[Kubernetes - Hardware]] - hardware do cluster de produção numa página.
- [[Kubernetes - Guia operacional]] - as 3 camadas, provisionar um cluster, GitOps e comandos de operação.
- [[Kubernetes - Provisionamento (Terraform RKE2)]] - camada 1, IaC que provisiona as VMs e o RKE2.
- [[Kubernetes - Bootstrap e KEDA]] - camada 2, addons de base (local-path e KEDA).
- [[Kubernetes - Deploy (Helm chart)]] - camada 3, subir o chart `attlas` no cluster.
- [[Kubernetes - Regras de escala (ScaledObjects)]] - regras de escala de pods (CPU e lag de Kafka).

## Ambiente real

- **Produção (Quito)**: RKE2 HA 3+3 sobre Nutanix, workers de 16 vCPU e 32 GB.
- **Servidor de gestão (lab)**: SSH `develop@10.1.1.115`, ver [[Acessos SSH - Infra Attlas]].
- **Rancher (lab)**: https://rancher.10.1.1.115.sslip.io
- **Web app (lab)**: http://web.10.1.1.115.sslip.io
- Versões de referência: RKE2 `v1.35.5+rke2r2`, KEDA `2.16.1`, local-path `v0.0.30`, Ubuntu 24.04 LTS.

## Relacionados

[[Observabilidade CI - plano (stack completa)]] · [[Acessos SSH - Infra Attlas]] · [[ms-cameras]]
