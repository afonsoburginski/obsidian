---
tags:
  - doc
  - infra
  - ssh
  - acesso
aliases:
  - "Acessos SSH - Infra Attlas"
  - "Infraestrutura - Acessos SSH"
atualizado: 2026-10-07
---

# Infraestrutura - Acessos SSH

Volta para [[Infraestrutura]].

## Resumo

| Comando | Máquina | O que é |
| --- | --- | --- |
| `ssh sumo` | `develop@10.1.1.115` | servidor físico de gestão: VM do CI, cache remoto do Nx, stack legada do Attlas 25 e as VMs da LAN |
| `ssh -J sumo ubuntu@192.168.122.66` | VM `ci-runner` | onde o CI roda |
| `ssh aws-attlas-26` | `ubuntu@3.15.199.101` | EC2 do dev.v2; na tailnet, host `aws-attlas-dev-v2` |
| `ssh sumo`, depois `ssh ubuntu@10.1.1.120` | `attlas-vm-1..7` | VMs Ubuntu na LAN, em bridge `br0` |

Tudo em `10.1.1.x` só responde pela tailnet `atmansystems.com` com `--accept-routes` (ver
[[Infraestrutura - Ambientes#Rede]]). O que roda em cada máquina está em [[Infraestrutura - Ambientes]] e
[[Infraestrutura - CI e runners]]; comando genérico de SSH, Docker e servidor está em
[[Infraestrutura - Runbook - Comandos]].

## Sumo

```bash
ssh sumo
```

O alias do `~/.ssh/config` da Dell resolve para `develop@10.1.1.115`. Quando o servidor pede senha, no SSH
sem chave ou no `sudo`, é a senha do usuário `develop` (ver a seção Credenciais).

## VM do CI (`ci-runner`)

A VM fica atrás da rede NAT do libvirt no sumo, com IP interno `192.168.122.66` e usuário `ubuntu`. A partir
do usuário `develop` do sumo ela entra direto, sem senha.

Em dois passos:

```bash
ssh sumo
ssh ubuntu@192.168.122.66
```

Em um passo, saltando pelo sumo:

```bash
ssh -J sumo ubuntu@192.168.122.66
```

Para usar `ssh ci-runner`, o bloco abaixo vai no `~/.ssh/config`:

```text
Host ci-runner
    HostName 192.168.122.66
    User ubuntu
    ProxyJump sumo
```

Quando o SSH da VM não responde, o console serial pelo libvirt do sumo ainda entra. O `virsh` do sumo só
enxerga a VM com `--connect qemu:///system`:

```bash
sudo virsh --connect qemu:///system list
sudo virsh --connect qemu:///system console ci-runner
```

A primeira linha confirma que o domínio se chama `ci-runner`; a segunda abre o console, e `Ctrl+]` sai dele.

## EC2 do dev.v2

```bash
ssh aws-attlas-26
```

O alias resolve para `ubuntu@3.15.199.101` com a chave `~/.ssh/id_ed25519_aws_attlas`. Depois de muitos
handshakes em poucos segundos, a porta 22 do IP público fica bloqueada para aquele IP de origem por cerca de
2 min. Nesse caso a entrada é pela tailnet, com a mesma chave:

```bash
ssh -o ControlMaster=no -i ~/.ssh/id_ed25519_aws_attlas ubuntu@aws-attlas-dev-v2
```

## VMs da LAN (`attlas-vm-1..7`)

As VMs estão em bridge `br0` na LAN, com IP fixo. A chave autorizada nelas é a `sumo@attlas`, que é a
`~/.ssh/id_ed25519` do `develop` no sumo; por isso o caminho sem senha passa pelo sumo:

```bash
ssh sumo
ssh ubuntu@10.1.1.120
```

| VM | IP |
| --- | --- |
| `attlas-vm-1` | `10.1.1.120` |
| `attlas-vm-2` | `10.1.1.121` |
| `attlas-vm-3` | `10.1.1.122` |
| `attlas-vm-4` | `10.1.1.123` |
| `attlas-vm-5` | `10.1.1.124` |
| `attlas-vm-6` | `10.1.1.125` |
| `attlas-vm-7` | `10.1.1.127` |

O `10.1.1.126` é o VIP do kube-vip, não uma VM. O cuidado com o Terraform dessas VMs está em
[[Infraestrutura - Ambientes#sumo]].

## Credenciais

Nenhuma senha ou token fica no vault: a tabela diz onde cada um está guardado. As memórias locais do Claude
Code citadas ficam na Dell, em
`~/.claude/projects/-home-afonso--rea-de-trabalho-Developer-attlas-2026/memory/`.

| Credencial | Usada em | Onde está guardada |
| --- | --- | --- |
| Chave `~/.ssh/id_ed25519_aws_attlas` | SSH no EC2 do dev.v2 | na Dell; o alias `aws-attlas-26` já aponta para ela |
| Chave `sumo@attlas` | SSH do sumo para a `ci-runner` e as `attlas-vm-1..7` | `~/.ssh/id_ed25519` do `develop` no sumo |
| Senha do usuário `develop` no sumo | `sudo` no sumo e SSH sem chave | memória local `reference_rancher_sumo.md` |
| Senha do usuário `ubuntu` das `attlas-vm-1..7` | console e SSH sem chave | cloud-init das VMs, no módulo Terraform `~/iac/attlas-vms/` do sumo; cópia na memória local `project_sumo_standalone_vms.md` |
| Login do painel Rancher | painel do sumo, quando reinstalado | memória local `reference_rancher_sumo.md`; é outra conta, diferente da do SSH |
| Token do scale set (PAT clássico com escopo `repo`) | serviço `ci-scaleset` da VM do CI | `/etc/ci-scaleset/token` na VM, legível só por root; cópia em `~/.config/attlas-ci/scaleset-token` na Dell |
| `DEPLOY_HOST`, `DEPLOY_SSH_KEY`, `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `NX_REMOTE_CACHE_TOKEN` | workflows do CI e do deploy | secrets do repositório `atmanadmin/attlas-2026` no GitHub |

## Painéis web do sumo

> [!warning] Rancher e app web do sumo fora do ar
> As duas URLs abaixo eram servidas pelo RKE2 `local` do sumo, que foi desinstalado. Só respondem depois
> de reinstalar o RKE2 e o Rancher.

- Rancher: `https://rancher.10.1.1.115.sslip.io`.
- App web: `http://web.10.1.1.115.sslip.io`, com a API em `api.10.1.1.115.sslip.io`.

O cache remoto do Nx no sumo não é painel; endereço e operação estão em
[[Infraestrutura - CI e runners#Caches]].

## Glossário

| Termo | O que é |
| --- | --- |
| tailnet | a rede privada do Tailscale; a da empresa é a `atmansystems.com` |
| `--accept-routes` | flag do `tailscale up` que instala as rotas anunciadas por outro nó, como a `10.1.1.0/24` |
| ProxyJump (`-J`) | SSH que atravessa uma máquina intermediária até o destino |
| libvirt e `virsh` | camada de virtualização do sumo e a linha de comando que administra as VMs |
| bridge `br0` | interface do sumo que põe as VMs direto na LAN, com IP próprio |
| VIP do kube-vip | IP virtual do plano de controle do Kubernetes, que responde em qualquer nó do cluster |
