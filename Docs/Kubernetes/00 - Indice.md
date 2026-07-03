---
tags:
  - kubernetes
  - infra
  - indice
---

# Kubernetes / Infra Attlas - Indice

Documentacao de infraestrutura espelhada do repo `attlas-2026`, pasta `infra/` (PR #475, branch `shared/feat/SOFTWARE-1719`). Fonte de verdade continua sendo o repo; esta copia e pra consulta rapida no Obsidian. Atualizado em 03/07/2026.

## Conceitual (as decisões e o porquê)

- [[01-VISAO-GERAL]] - componentes, topologia de cluster, KEDA, observabilidade, GitOps. **Comece por aqui.** (v5.0)
- [[02-DIMENSIONAMENTO]] - teste de capacidade, N+1, cálculo de hardware e recurso por serviço. (v2.5)
- [[03-PRODUCAO]] - operação no hardware de produção do cliente (Nutanix). (v3.0)
- [[04-CI-CD]] - pipeline: 1 branch, imagem imutável, Fleet GitOps por cluster. (v2.0)
- [[05-FALHAS-E-RECUPERACAO]] - armadilhas de instalação, modos de falha em operação e recuperação.
- [[06-PROBLEMAS-IDENTIFICADOS]] - problemas em aberto sob escala de pods (WebSocket + monitoramento por dispositivo). (v3.0)

## Diagramas e resumo

- [[arquitetura]] - diagrama Mermaid (código): CI/CD GitOps + cluster HA 3+3.
- [[Arquitetura.excalidraw|Arquitetura (Excalidraw, editável)]] - mesmo diagrama em quadro editável.
- [[hardware-resumo]] - hardware do cluster de produção numa página.

## Operacional (how-to)

- [[Guia operacional (infra)]] - guia único: as 3 camadas, provisionar um cluster, GitOps e comandos de operação.
- [[Provisionar cluster - Terraform RKE2]] - camada 1: IaC que provisiona as VMs + RKE2.
- [[Bootstrap - KEDA e autoescala]] - camada 2: addons de base (local-path + KEDA).
- [[Deploy - Helm chart]] - camada 3: subir o chart `attlas` no cluster.
- [[Regras de escala - ScaledObjects]] - regras de escala de pods (CPU + lag de Kafka).

## Contexto extra (ambiente real)

- **Produção (Quito):** RKE2 HA 3+3 sobre Nutanix, workers de 16 vCPU / 32 GB.
- **Servidor de teste (lab):** cluster `attlas-quito` — mesma topologia 3+3 em KVM/libvirt, workers menores (prova de conceito). SSH `develop@10.1.1.115`.
- **Rancher (lab):** https://rancher.10.1.1.115.sslip.io
- **Web app (lab):** http://web.10.1.1.115.sslip.io
- Versões de referência: RKE2 `v1.35.5+rke2r2` · KEDA `2.16.1` · local-path `v0.0.30` · Ubuntu 24.04 LTS.
