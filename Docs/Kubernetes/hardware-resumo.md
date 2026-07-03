---
tags:
  - kubernetes
  - infra
  - hardware
---

# Hardware — resumo

Resumo do hardware do cluster de **produção** (RKE2 HA 3+3). Cálculo completo, armazenamento e limites por serviço: [[02-DIMENSIONAMENTO]] (§5 e §7). Operação no cliente: [[03-PRODUCAO]].

> [!important] Hardware total do cluster: **60 vCPU / 120 GB RAM / ~3 TB SSD**

| Papel | Qtd | vCPU (cada) | RAM (cada) | SSD |
| --- | --- | --- | --- | --- |
| Control-plane (RKE2 + etcd) | 3 | 4 | 8 GB | 100 GB |
| Worker (agent) | 3 | **16** | **32 GB** | **200 GB** |
| Pool de dados (Nutanix CSI) | 1 pool | — | — | **~2 TB** |
| **TOTAL** | **6 VMs** | **60 vCPU** | **120 GB** | **~3 TB** |

- **De onde vêm os números.** Worker de 16 vCPU: o regime de Quito (~23 vCPU, pico ~32) tem que caber em **2 dos 3 workers** (N+1 → 2×16 = 32). RAM de 32 GB: puxada pelo `db-audit` (~5 GB sozinho no attlas 25) + réplicas de câmeras; 2 workers = 64 GB seguram o regime (~21 GB) com folga.
- **Discos das VMs são pequenos** (só SO/imagens/efêmero: control-plane 100 GB, worker 200 GB). O dado dos serviços com estado vive num **pool via Nutanix CSI** — 1 volume por banco, instância única sem réplica (`db-audit` o maior). ~2 TB de partida (attlas 25 = ~700 GB hoje), expansível. Backup é do cliente, off-box.
- **Servidor de teste** (`attlas-quito` no lab): mesma topologia 3+3 num cluster menor (workers hoje 8 vCPU / 16 GB), por ser prova de conceito. Os números de produção não dependem do tamanho do lab.
- **Alternativa equivalente** aos workers de 16 vCPU: 5–6 workers de 8 vCPU (mesma capacidade, mais nós).

## Rede e acesso (produção — Quito)

- Sub-rede dedicada: 6 IPs por DHCP (1/VM) + 1 IP fixo para o VIP do API server (kube-vip) + 1 IP para a web.
- SO: Ubuntu Server 24.04 LTS · Kubernetes: RKE2 v1.35.5 · VMs criadas pelo Nutanix (Prism / Terraform).
- Gestão: VPN WireGuard (Atman ↔ Quito). Usuários: web por HTTPS (ingress).
