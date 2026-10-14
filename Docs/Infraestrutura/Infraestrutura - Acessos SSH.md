---
tags:
  - doc
  - infraestrutura
  - ssh
  - acesso
aliases:
  - "Acessos SSH - Infra Attlas"
  - "Infraestrutura - Acessos SSH"
atualizado: 2026-10-14
---

# Infraestrutura - Acessos SSH

Volta para [[Infraestrutura]].

## Resumo

| Comando | Máquina | O que é |
| --- | --- | --- |
| `ssh ec2-attlas` | `ubuntu@100.101.165.32` | hub dev pela tailnet |
| `ssh aws-attlas-26` | `ubuntu@3.15.199.101` | o mesmo hub, pelo IP público |
| `ssh sumo` | `develop@10.1.1.115` | servidor físico que hospeda a VM do CI |
| `ssh sumo`, depois `ssh ubuntu@192.168.122.66` | VM `ci-runner` | onde o CI roda |

Tudo em `10.1.1.x` só responde pela tailnet `atmansystems.com` com `--accept-routes` (ver [[Infraestrutura - Servidores e rede#Rede]]). O que roda em cada máquina está em [[Infraestrutura - Servidores e rede]] e [[Infraestrutura - Ambientes]]; comando genérico de SSH, Docker e Kubernetes está em [[Infraestrutura - Runbook - Comandos]].

O Orbit também abre terminal SSH no navegador para quem tem a permissão Terminal SSH, sem chave na máquina local; a chave que ele usa para entrar nos servidores está em Configurações, Acesso aos servidores e só aparece depois de digitar a senha de novo.

## Hub dev

```bash
ssh ec2-attlas
ssh ec2-attlas 'export PATH=$HOME/bin:$PATH; kubectl --context kind-attlas -n attlas-dev get pods'
```

O `ec2-attlas` entra pela tailnet. O `aws-attlas-26` usa o IP público e a chave `~/.ssh/id_ed25519_aws_attlas`; depois de 5 ou mais handshakes em poucos segundos, a porta 22 pública fica bloqueada para aquele IP de origem por cerca de 2 min. Nesse caso entrar pela tailnet, com `-o ControlMaster=no` se houver conexão multiplexada presa. `kubectl`, `kind` e `helm` ficam em `~/bin` do hub, fora do `PATH` padrão.

## Sumo

```bash
ssh sumo
```

O alias do `~/.ssh/config` resolve para `develop@10.1.1.115`. Quando o servidor pede senha, no SSH sem chave ou no `sudo`, é a senha do usuário `develop` (ver [[#Credenciais]]).

## VM do CI

A VM fica atrás da rede NAT do libvirt no sumo, com IP interno `192.168.122.66` e usuário `ubuntu`. A chave do usuário `develop` do sumo entra nela sem senha:

```bash
ssh sumo
ssh ubuntu@192.168.122.66
```

Em um passo, `ssh -J sumo ubuntu@192.168.122.66`, só funciona se a chave da máquina local estiver no `authorized_keys` da VM; sem ela, vale o caminho em dois passos. Para usar `ssh ci-runner`, o bloco abaixo vai no `~/.ssh/config`:

```text
Host ci-runner
    HostName 192.168.122.66
    User ubuntu
    ProxyJump sumo
```

Quando o SSH da VM não responde, o console serial pelo libvirt do sumo ainda entra. O `virsh` do sumo só enxerga a VM com `--connect qemu:///system`:

```bash
sudo virsh --connect qemu:///system list
sudo virsh --connect qemu:///system console ci-runner
```

A primeira linha confirma que o domínio se chama `ci-runner`; a segunda abre o console, e `Ctrl+]` sai dele. A chave pública do Orbit também precisa estar no `authorized_keys` de `develop` (sumo) e de `ubuntu` (VM), e o `ubuntu` precisa de `sudo` sem senha, para o Orbit gravar o token e reiniciar os scale sets.

## Credenciais

Nenhuma senha ou token fica no vault: a tabela diz onde cada um está guardado. As memórias locais do Claude Code citadas ficam na Dell, em `~/.claude/projects/-home-afonso--rea-de-trabalho-Developer-attlas-2026/memory/`.

| Credencial | Usada em | Onde está guardada |
| --- | --- | --- |
| Chave `~/.ssh/id_ed25519_aws_attlas` | SSH no hub dev pelo IP público | na Dell; o alias `aws-attlas-26` já aponta para ela |
| Chave `sumo@attlas` | SSH do sumo para a VM do CI | `~/.ssh/id_ed25519` do `develop` no sumo |
| Senha do usuário `develop` no sumo | `sudo` no sumo e SSH sem chave | memória local `reference_rancher_sumo.md` |
| Token do GitHub (Orbit e scale sets do CI) | leitura de runs e releases, registro de runners | `/secrets/github-token` do Orbit e `/etc/ci-scaleset/token` na VM, legível só por root; o Orbit grava os dois pela tela. Cópia em `~/.config/attlas-ci/scaleset-token` na Dell |
| Senha do dono do Orbit (`AtmanAdmin`) | login do Orbit | `~/orbit/state/secrets/console-password` no hub; os demais usuários têm login individual criado em Usuários e acesso |
| Segredos do Orbit (tokens, kubeconfigs, pacotes de seeds, chave SSH) | operação do hub | `~/orbit/state/secrets/` no hub, modo 700; backup em `~/.local/share/orbit/backups/hub-secrets.tar` na máquina de quem opera, fora do repositório |
| `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `NX_REMOTE_CACHE_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN` | workflows do CI | secrets do repositório `atmanadmin/attlas-2026` no GitHub |

## Glossário

| Termo | O que é |
| --- | --- |
| tailnet | a rede privada do Tailscale; a da empresa é a `atmansystems.com` |
| `--accept-routes` | flag do `tailscale up` que instala as rotas anunciadas por outro nó, como a `10.1.1.0/24` |
| ProxyJump (`-J`) | SSH que atravessa uma máquina intermediária até o destino |
| libvirt e `virsh` | camada de virtualização do sumo e a linha de comando que administra a VM do CI |
