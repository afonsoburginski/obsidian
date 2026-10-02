---
tags:
  - doc
  - infra
  - attlas
  - runbook
  - ssh
atualizado: 2026-10-01
aliases:
  - "Acessos SSH - Infra Attlas"
---

# Infraestrutura - Acessos SSH

Runbook objetivo dos acessos. Aliases `sumo` e `aws-attlas-26` já estão no `~/.ssh/config`. O que roda em cada
máquina está em [[Infraestrutura - Ambientes]] e [[Infraestrutura - CI e runners]]. A LAN `10.1.1.0/24` só é
alcançável pela tailnet `atmansystems.com` com `--accept-routes`.

## Mapa rápido

| Alias / comando                         | Máquina               | Quem é                                                                                        |
| --------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `ssh sumo`                              | `develop@10.1.1.115`  | Host de gestão (sumo raiz). Dentro dele: VM do runner de CI, stack MinIO/cache e a stack legada do attlas 25. |
| `ssh aws-attlas-26`                     | `ubuntu@3.15.199.101` | EC2 dev **26** (dev.v2). Roda a aplicação dev inteira. Não roda CI. Na tailnet: `aws-attlas-dev-v2`. |
| (via sumo) `ssh ubuntu@192.168.122.66`  | VM `ci-runner`        | Onde o **CI roda** (96 vCPU / 86 GB; runner scale set `sumo-ci-runner` com label `heavy`, um runner efêmero por job, até 20 em paralelo). |
| (via sumo) `ssh ubuntu@10.1.1.120..127` | `attlas-vm-1..7`      | VMs em bridge `br0` na LAN, VIP kube-vip `10.1.1.126`.                                        |

---

## 1. Sumo (host raiz)

```bash
ssh sumo
```
- Resolve para `develop@10.1.1.115`. Chave já no config.
- Se pedir senha em algum ponto: usuário `develop`, senha `develop`.

## 2. VM do runner de CI (dentro da sumo)

É onde o CI executa. IP interno do libvirt: **192.168.122.66**. Topologia, recursos e operação da VM em
[[Infraestrutura - CI e runners]].

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
sudo virsh --connect qemu:///system list               # confirma o nome: ci-runner
sudo virsh --connect qemu:///system console ci-runner  # console serial, sair com Ctrl+]
```

**Dica - alias direto.** Adicionar ao `~/.ssh/config` para usar `ssh ci-runner`:
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
- Resolve para `ubuntu@3.15.199.101`. Chave já no config.
- Se a porta 22 do IP público der timeout (rate limit depois de muitos handshakes), entrar pela tailnet:
  `ssh -o ControlMaster=no ubuntu@aws-attlas-dev-v2`.

## 4. VMs standalone da sumo (attlas-vm-1..7)

VMs em bridge `br0`, IPs fixos na LAN. Entra pela sumo primeiro.

```bash
ssh sumo
ssh ubuntu@10.1.1.120     # vm-1  (…121 vm-2, …122 vm-3, …123 vm-4, …124 vm-5, …125 vm-6, …127 vm-7)
```
- VIP do cluster (kube-vip): `10.1.1.126`.
- Credenciais: usuário `ubuntu`, senha `Attlas2026!` (ou a chave `sumo@attlas` do develop).
- `sudo` como `develop` pede a senha `develop`.

---

## Não é SSH, mas relacionado

> [!warning] Rancher e web app do sumo dependem do RKE2 de gestão
> As duas URLs abaixo eram servidas pelo RKE2 `local` do sumo, que foi desinstalado. Só respondem se ele
> for reinstalado; conferir antes de contar com elas.

- **Rancher (UI):** https://rancher.10.1.1.115.sslip.io - login `admin` / `attlas-admin-2026` (isso é o PAINEL; `develop/develop` é só o SSH da sumo).
- **Web app dev (sumo):** http://web.10.1.1.115.sslip.io - API em `api.10.1.1.115.sslip.io`.
- **Cache de CI (MinIO):** roda como docker na sumo (`~/nx-cache`, usuário develop), servido em `10.1.1.115:8388`.

## Observações

- O `~/.ssh/config` já tem `sumo` e `aws-attlas-26`. Os demais (VM do runner, VMs 1..7) entram **pela sumo** (não têm IP público).
- Nota de segurança: este arquivo tem credenciais - manter só no vault local, não versionar em repo nem compartilhar.
- Cluster, chart Helm e Terraform: repo `Developer/kubernetes`.
- Topologia e higiene dos runners de CI (governor, reaper, disco, cache remoto): [[Infraestrutura - CI e runners]]. A topologia do `docs/architecture/ci-remote-cache.md` no repo está obsoleta.
