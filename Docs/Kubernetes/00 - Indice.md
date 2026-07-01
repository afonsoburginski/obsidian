---
tags:
  - kubernetes
  - infra
  - indice
---

# Kubernetes / Infra Attlas - Indice

Documentacao de infraestrutura puxada do repo `attlas-2026` (branch `shared/feat/SOFTWARE-1719`, pasta `infra/`). Fonte de verdade continua sendo o repo; esta copia e pra consulta rapida no Obsidian.

## Conceitual

- [[01-VISAO-GERAL]] - componentes, topologia de cluster, KEDA, observabilidade, GitOps. Comece por aqui.
- [[02-DIMENSIONAMENTO]] - capacidade, HA, topologia 3+3, calculo de recursos.
- [[03-PRODUCAO]] - operacao no hardware de producao do cliente (Nutanix), maquina fisica a adquirir.
- [[04-CI-CD]] - pipeline: 1 branch, tag imutavel, Fleet GitOps por cluster.
- [[Arquitetura.excalidraw|Arquitetura (Excalidraw, editável)]] - diagrama do CI/CD GitOps + cluster HA 3+3.
- [[arquitetura]] - mesmo diagrama em mermaid (código).
- [[hardware-resumo]] - resumo do hardware.

## Operacional (how-to)

- [[Provisionar cluster - Terraform RKE2]] - IaC que provisiona as VMs + RKE2.
- [[Deploy - Helm chart]] - como subir o chart `attlas` no cluster.
- [[Bootstrap - KEDA e autoescala]] - instalar KEDA e a autoescala.
- [[Regras de escala - ScaledObjects]] - regras de escala (CPU + lag de Kafka).

## Contexto extra (nao esta nesta pasta, esta na memoria do Claude)

- Clusters reais: `attlas-quito` (HA 3+3 + KEDA) e o servidor sumo (kind + Rancher).
- Rancher sumo: https://rancher.10.1.1.115.sslip.io
- Web app no sumo: http://web.10.1.1.115.sslip.io
