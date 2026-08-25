---
tags:
  - doc
  - infra
  - attlas
  - runbook
  - ssh
atualizado: 2026-08-24
---

# Acessos SSH - Infra Attlas

Runbook objetivo dos acessos. Aliases `sumo` e `aws-attlas-26` já estão no `~/.ssh/config`.

## Mapa rápido

| Alias / comando                         | Máquina               | Quem é                                                                                        |
| --------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `ssh sumo`                              | `develop@10.1.1.115`  | Host de gestão (sumo raiz). Dentro dele: VM do runner de CI, cluster RKE2, stack MinIO/cache. |
| `ssh aws-attlas-26`                     | `ubuntu@3.15.199.101` | EC2 dev **26**. Roda a aplicação dev inteira (66 containers) + 1 runner de CI leve (lint/build, sem label `heavy`). |
| (via sumo) `ssh ubuntu@192.168.122.66`  | VM `ci-runner`        | Onde o **CI roda** (32 vCPU / 40 GiB - cresceu de 16 vCPU/32 GB em agosto/2026; 3 runners com label `heavy`, é onde a integração corre). |
| (via sumo) `ssh ubuntu@10.1.1.120..127` | `attlas-vm-1..7`      | Cluster RKE2 em bridge (LAN).                                                                 |

---

## 1. Sumo (host raiz)

```bash
ssh sumo
```
- Resolve pra `develop@10.1.1.115`. Chave já no config.
- Se pedir senha em algum ponto: usuário `develop`, senha `develop`.

## 2. VM do runner de CI (dentro da sumo)

É onde o CI de verdade executa (integração, testcontainers). IP interno do libvirt: **192.168.122.66**. 32 vCPU / 40 GiB de RAM (cresceu de 16 vCPU/32 GB em agosto/2026, ver `docs/architecture/ci-remote-cache.md` seção "Topologia de runners" no repo), com 3 dos 4 runners self-hosted do projeto (label `heavy`) - o quarto roda no EC2, sem esse label.

**Passo a passo:**
```bash
ssh sumo                       # 1. entra na sumo
ssh ubuntu@192.168.122.66      # 2. entra na VM (do develop entra direto, sem senha)
```

**Em 1 comando (ProxyJump pela sumo):**
```bash
ssh -J sumo ubuntu@192.168.122.66
```

**Fallback pelo libvirt (se o SSH falhar):**
```bash
sudo virsh list                # confirma o nome: ci-runner
sudo virsh console ci-runner   # console serial — sair com Ctrl+]
```

**Dica - alias direto.** Adicionar ao `~/.ssh/config` pra usar `ssh ci-runner`:
```
Host ci-runner
    HostName 192.168.122.66
    User ubuntu
    ProxyJump sumo
```

## 3. EC2 dev 26 (aws-attlas-26)

```bash
ssh aws-attlas-26
```
- Resolve pra `ubuntu@3.15.199.101`. Chave já no config.
- Roda os 66 containers da aplicação dev + o runner de CI leve (só lint/build, sem `heavy`).

## 4. VMs standalone da sumo (attlas-vm-1..7)

Cluster RKE2 em bridge `br0`, IPs fixos na LAN. Entra pela sumo primeiro.

```bash
ssh sumo
ssh ubuntu@10.1.1.120     # vm-1  (…121 vm-2, …122 vm-3, …123 vm-4, …124 vm-5, …125 vm-6, …127 vm-7)
```
- VIP do cluster (kube-vip): `10.1.1.126`.
- Credenciais: usuário `ubuntu`, senha `Attlas2026!` (ou a chave `sumo@attlas` do develop).
- `sudo` como `develop` pede a senha `develop`.

---

## Não é SSH, mas relacionado

- **Rancher (UI):** https://rancher.10.1.1.115.sslip.io - login `admin` / `attlas-admin-2026` (isso é o PAINEL; `develop/develop` é só o SSH da sumo).
- **Web app dev (sumo):** http://web.10.1.1.115.sslip.io - API em `api.10.1.1.115.sslip.io`.
- **Cache de CI (MinIO):** roda como docker na sumo (`~/nx-cache`, usuário develop), servido em `10.1.1.115:8388`.

## Observações

- O `~/.ssh/config` já tem `sumo` e `aws-attlas-26`. Os demais (VM do runner, VMs 1..7) entram **pela sumo** (não têm IP público).
- Nota de segurança: este arquivo tem credenciais - manter só no vault local, não versionar em repo nem compartilhar.
- O que roda nessas máquinas e como o cluster é montado: repo `Developer/kubernetes` (o domínio Kubernetes saiu do vault em 24/08).
- Topologia e higiene dos runners de CI (governor, reaper, disco, cache remoto): `docs/architecture/ci-remote-cache.md` no repo (fonte de verdade) e [[Observabilidade CI - plano (stack completa)]].
