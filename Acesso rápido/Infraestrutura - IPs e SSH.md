---
tags:
  - doc
  - infraestrutura
  - ssh
  - acesso
  - rede
aliases:
  - "Infraestrutura - IPs e SSH"
  - "Acesso rápido - IPs e SSH"
  - "Cola de acessos"
  - "Infraestrutura - Acesso rápido"
atualizado: 2026-10-15
---

# Infraestrutura - IPs e SSH
Volta para [[Infraestrutura]]. Detalhe e armadilhas de cada acesso: [[Infraestrutura - Acessos SSH]] e [[Infraestrutura - Servidores e rede]]. Comandos de cada ferramenta: [[Infraestrutura - Runbook - Comandos]].

Nenhuma senha nem chave privada mora aqui. Cada credencial diz onde está guardada, na seção [[#Onde estão as credenciais]].

## Meus endereços

- **Dell, tailnet:** `100.116.25.7`
- **Dell, MagicDNS:** `afonso-dell-14-dc14250.tailca0a03.ts.net`
- **Dell, rede local (Wi-Fi):** `10.0.1.245`, muda conforme a rede
- **Dell, VPN de Quito (WireGuard):** `192.168.10.29`
- **Chave pública WireGuard:** `2QYdpY7H3EiHpF/zwo3j8OYvXVSKG06kYbaAteza3Uc=`
- **Config WireGuard:** `~/.config/wireguard/wg-quito.conf`
- **Usuário SSH nos servidores:** `ubuntu` (hub e VM do CI) e `develop` (sumo)
- **Chave SSH do hub:** `~/.ssh/id_ed25519_aws_attlas`

## Endereço RTSP do videowall

- **Novo (padrão):** `192.168.10.16:554`, o servidor dev.v2 dentro da VPN de Quito
- **Antigo:** `3.15.199.101:554`, o IP público do mesmo servidor
- **Caminho do vídeo:** `rtsp://192.168.10.16:554/videowall-mirror-<id>`, com usuário e senha de leitura
- **Porta:** sempre `554`, nunca `8554` em comando ou nota

Contexto do H9 em [[Câmeras - Videowall - Arquitetura e estratégias]].

## Servidores por SSH

- **Hub dev pela tailnet:** `ssh ec2-attlas`
  - IP `100.101.165.32`, usuário `ubuntu`
  - É o caminho que sempre funciona
- **Hub dev pelo IP público:** `ssh aws-attlas-26`
  - IP `3.15.199.101`, usuário `ubuntu`
  - Cai em timeout depois de 5 ou mais conexões seguidas; entrar pela tailnet
- **Sumo:** `ssh sumo`
  - IP `10.1.1.115`, usuário `develop`
  - Só responde com a tailnet da Atman e `--accept-routes`
- **VM do CI (`ci-runner`):** `ssh sumo` e depois `ssh ubuntu@192.168.122.66`
  - IP interno do sumo, usuário `ubuntu`
- **Relay RTSP (`aws-attlas-develop`):** `ssh -i ~/.ssh/id_ed25519_aws_attlas ubuntu@100.95.150.89`
  - IP `192.168.10.11` no túnel de Quito

## Rede da Atman

- **Tailnet:** `atmansystems.com`, o `tailscale switch --list` precisa mostrar `Atman Systems`
- **aquario-server:** `100.77.100.21`, anuncia a LAN `10.1.1.0/24`; se cair, some tudo em `10.1.1.x`
- **potente-server:** `100.70.144.31`
- **Hub dev (`aws-attlas-dev-v2`):** `100.101.165.32`
- **Relay (`aws-attlas-develop`):** `100.95.150.89`

## Quito

- **Concentrador da VPN:** `18.216.165.106:51820`
- **Servidor Attlas na VPN:** `192.168.10.16`
- **Relay na VPN:** `192.168.10.11`
- **Ponta de Quito na VPN:** `192.168.10.10`
- **Roteador MikroTik:** `10.200.0.1`
- **H9, controlador:** `10.200.1.52:8000`
- **H9, placa INPUT 7:** `10.200.1.53` (porta 2) e `10.200.4.202` (porta 1)

## Endereços web

- **Attlas dev:** `https://dev.v2.attlas.atmansystems.com`
- **Orbit:** `https://orbit.3-15-199-101.sslip.io` ou `http://100.101.165.32:8090` pela tailnet
- **Gateway do dev pela tailnet:** `http://100.101.165.32:8081`

## Onde estão as credenciais

- **Senha do usuário `develop` no sumo:** memória local do Claude Code, `reference_rancher_sumo.md`
- **Chave do hub:** `~/.ssh/id_ed25519_aws_attlas` na Dell
- **Usuário e senha do H9, RTSP e login do Attlas:** [[Videowall - Credenciais H9]]
- **Senha do Orbit:** `~/orbit/state/secrets/console-password` no hub
- **Tokens do CI:** secrets do repositório `atmanadmin/attlas-2026` no GitHub

## Comandos importantes

### Entrar na rede

```bash
tailscale switch --list                  # o ativo tem de ser Atman Systems
sudo tailscale up --accept-routes        # sem a flag, 10.1.1.x não entra na rota
tailscale status | grep -E 'aquario|aws-attlas'
tailscale ping 100.77.100.21             # testa o aquario-server
ip route get 10.1.1.115                  # tem de sair por tailscale0
```

### VPN de Quito

```bash
sudo wg-quick up /home/afonso/.config/wireguard/wg-quito.conf
sudo wg-quick down /home/afonso/.config/wireguard/wg-quito.conf
sudo wg show                             # handshake recente = túnel de pé
ping -c2 192.168.10.16                   # servidor Attlas na VPN
ping -c2 192.168.10.11                   # relay
```

### Hub dev

```bash
ssh ec2-attlas
ssh ec2-attlas 'bash -s' < script.sh     # vários comandos, um handshake só
ssh ec2-attlas 'export PATH=$HOME/bin:$PATH; kubectl --context kind-attlas -n attlas-dev get pods'
```

No hub, `kubectl` fica em `~/bin`, fora do `PATH`:

```bash
export PATH=$HOME/bin:$PATH
K="kubectl --context kind-attlas -n attlas-dev"
$K get pods | grep -vE 'Running|Completed'     # o que não está de pé
$K logs --tail 200 -f deploy/ms-cameras
$K rollout restart deploy/<svc>
$K exec -it db-cameras-0 -- sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

### Sumo e VM do CI

```bash
ssh sumo
ssh ubuntu@192.168.122.66                # dentro do sumo, entra sem senha
virsh --connect qemu:///system list --all
virsh --connect qemu:///system console ci-runner    # sair com Ctrl+]
```

### RTSP do videowall

```bash
ffplay -rtsp_transport tcp rtsp://192.168.10.16:554/<caminho>          # abre o vídeo pela VPN
nc -vz 192.168.10.16 554                                               # a porta responde
sudo tcpdump -ni wg0 port 554                                          # no hub: a placa do H9 tenta conectar?
```

### Túnel de porta para o navegador

```bash
ssh -L 9000:localhost:9000 ec2-attlas 'export PATH=$HOME/bin:$PATH; kubectl --context kind-attlas -n attlas-dev port-forward svc/kafdrop 9000:9000'
ssh -L 15432:localhost:15432 ec2-attlas 'export PATH=$HOME/bin:$PATH; kubectl --context kind-attlas -n attlas-dev port-forward pod/db-cameras-0 15432:5432'
```

## Quando algo não conecta

- **`ssh aws-attlas-26` dá timeout:** usar `ssh ec2-attlas`, o IP público bloqueia a porta 22 por cerca de 2 min.
- **`ssh sumo` não responde:** conferir `tailscale ping 100.77.100.21`; sem resposta, o `aquario-server` caiu e não há caminho remoto.
- **`10.1.1.x` não roteia:** faltou `--accept-routes` ou a tailnet ativa é a pessoal.
- **`192.168.10.16` não responde:** a VPN de Quito está desligada; `sudo wg show` sem handshake recente.
- **`virsh list` vazio no sumo:** faltou `--connect qemu:///system`.
