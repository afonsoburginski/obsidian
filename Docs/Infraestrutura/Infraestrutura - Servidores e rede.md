---
tags:
  - doc
  - infraestrutura
  - servidores
  - rede
aliases:
  - "Infraestrutura - Servidores e rede"
  - "Servidores e rede"
  - "Rede e tailnet"
atualizado: 2026-10-14
banner: "assets/banners/servers.jpg"
banner_y: 0.3
---

# Infraestrutura - Servidores e rede

Volta para [[Infraestrutura]].

## Resumo

| Máquina | Papel | Entrada |
| --- | --- | --- |
| Hub dev (EC2 `aws-attlas-dev-v2`) | roda o ambiente dev do Attlas e o Orbit | `ssh ec2-attlas` (tailnet) ou `ssh aws-attlas-26` (IP público) |
| sumo (`10.1.1.115`) | servidor físico: hospeda a VM do CI, o cache do Nx, um RKE2 sem uso e a stack legada do Attlas 25 | `ssh sumo`, só pela tailnet |
| VM `ci-runner` | roda os runners do GitHub Actions | `ssh sumo`, depois `ssh ubuntu@192.168.122.66` |
| Dell | máquina de desenvolvimento do dono | local |
| `aquario-server` | roteador que leva a LAN `10.1.1.0/24` para a tailnet | sem acesso do time |

Unidades: vCPU é um núcleo (o sumo é medido em threads); GB é gigabyte; load é a média de processos prontos para executar, comparada ao número de vCPU.

```widget
src: _widgets/diagrams/infra-servidores-e-rede.html
```

Como entrar em cada máquina, usuários e onde ficam as credenciais: [[Infraestrutura - Acessos SSH]]. O que roda dentro do hub e como uma requisição chega nele: [[Infraestrutura - Ambientes]].

## Máquinas

| Máquina | Recursos | O que roda |
| --- | --- | --- |
| Hub dev | `t3a.2xlarge` (`i-06e8f8cf75102367e`, `us-east-2c`): 8 vCPU, 32 GiB, disco de 193 GB, crédito de CPU em `unlimited`. IP público `3.15.199.101`, tailnet `100.101.165.32` | cluster kind `attlas` com o Attlas dev e o Argo CD; containers `orbit`, `orbit-gitops`, `orbit-ingress`, `orbit-ingress-tls`; nginx do host; `attlas-coturn`; `attlas-asm`; cerca de 20 simuladores de controlador `asc-*` |
| sumo | Xeon Gold 5420+ com 112 threads, 125 GB de RAM em 2 de 16 slots, disco de 1,8 TB | VM `ci-runner`; cache remoto do Nx (MinIO e `nx-cache-server`, porta 8388); RKE2 de nó único registrado no Orbit como cluster `sumo`, sem ambiente; stack legada do Attlas 25 (imagens `:production`, cerca de 30 containers) e Portainer |
| VM `ci-runner` | 96 vCPU, 86 GB de RAM, disco de 387 GB, libvirt em NAT (`192.168.122.66`) | scale sets `sumo-ci-runner` e `sumo-ci-develop`; detalhes em [[Infraestrutura - CI e runners]] |
| Dell | 12 vCPU, 15 GiB, tailnet `100.116.25.7` | backend em Docker e front em `nx serve`; ver [[Infraestrutura - Ambientes#Dell]] |

O hub não tem runner de CI: ele dividiria as 8 vCPU com o cluster e o stream das câmeras.

O `attlas-asm` e os simuladores `asc-*` não fazem parte do ambiente dev nem do Orbit; dividem o host e ninguém os altera pela entrega do Attlas.

## Endereços

| Endereço | Aponta para |
| --- | --- |
| `https://dev.v2.attlas.atmansystems.com` | Attlas dev, pelo nginx do host |
| `https://orbit.3-15-199-101.sslip.io` | Orbit, público, com login próprio (o nginx também atende `orbit.atmansystems.com`) |
| `http://100.101.165.32:8090` | Orbit pela tailnet |
| `http://100.101.165.32:8081` | gateway do dev pela tailnet, em HTTP/1.1 |
| `https://aws-attlas-dev-v2.tailca0a03.ts.net:8443` | gateway do dev pela tailnet, em HTTP/2 e HTTP/3 (Caddy) |

## Rede

A tailnet da empresa se chama `atmansystems.com`, com sufixo MagicDNS `tailca0a03.ts.net`. O `tailscale switch --list` precisa mostrar o tailnet `Atman Systems` ativo; tailnets pessoais não têm rota para a rede da Atman. Outra pessoa administra a tailnet, que também serve à configuração de câmeras; esta infraestrutura não a altera.

| Trecho | Como funciona |
| --- | --- |
| LAN `10.1.1.0/24` (sumo e câmeras) | roteada pelo `aquario-server`, um nó da tailnet; cliente precisa de `sudo tailscale up --accept-routes` |
| Hub dev | no ar com IP público e na tailnet; a porta 22 pública bloqueia por cerca de 2 min o IP de origem que faz 5 ou mais handshakes em poucos segundos |
| Quito | rede do cliente alcançada por WireGuard (`wg-quito`), que sobe com `sudo wg-quick up wg-quito` e leva a faixa `10.200.0.0/16` |
| Hub para servidores novos | SSH (22) e API do Kubernetes (6443), por rede direta, Tailscale, VPN ou jump host; ver [[Infraestrutura - Orbit#Servidor novo]] |

Rotas de vídeo e portas publicadas no hub, uma a uma, estão em [[Infraestrutura - Mapa de puertos]].

## Armadilhas conhecidas

| Sintoma | Causa | Correção |
| --- | --- | --- |
| tudo em `10.1.1.x` some de uma vez | o `aquario-server` caiu; é ponto único de falha da LAN | `tailscale ping 100.77.100.21`; sem resposta, o conserto é no local, não há caminho remoto até ele |
| a rota aparece em `tailscale status --json` mas `ip route get 10.1.1.115` sai pela interface física | falta `--accept-routes` | `sudo tailscale up --accept-routes` |
| WebRTC ou UDP público morto depois de atualizar o Tailscale | o Tailscale removeu o jump do Docker na cadeia `FORWARD` | `fix-docker-forward.service` recoloca a regra no hub; sem ele, `iptables -A FORWARD -o br-<id> -j DOCKER` |
| porta publicada pelo Docker aberta apesar do `ufw` | porta publicada pelo Docker não passa pela cadeia `INPUT` do host | security group da nuvem, cadeia `DOCKER-USER` ou bind por IP; `~/bin/block-ips.sh` aplica a lista de origens bloqueadas nas duas cadeias no boot |
| vídeo ou Kafka externo sem resposta depois de reiniciar o hub | o cron `@reboot` reaplica o DNAT só de `8189/udp` e `8554`; a regra da `9094` está no iptables mas não é recolocada | rodar `local/ingress/media-dnat.sh` e refazer a regra da 9094, ou incluir `tcp:9094:30094` em `MEDIA_PORTS` |
| `ssh aws-attlas-26` dá timeout | bloqueio da porta 22 pública para o IP de origem | entrar pela tailnet com `ssh ec2-attlas` |

## Pendências

| O que falta | Por que importa | Onde |
| --- | --- | --- |
| Memória do sumo: 2 de 16 slots, 2 pentes de 64 GB; seis pentes DDR5 RDIMM de 64 GB a 5600 MT/s levam a 512 GB | com 128 GB, um cluster de CI teria menos capacidade útil que a VM atual; sem segundo servidor, a queda do sumo para o CI de todos | compra de hardware |
| Carga do hub: load médio de 15 min em 31 com 8 vCPU (medido em 14/10/2026) | rollout, simuladores e cluster disputam o mesmo host; probes falham sob carga | [[Infraestrutura - Orbit#Pendências]] |
| RKE2 do sumo sem ambiente | consome memória e CPU do servidor do CI sem entregar nada | decidir entre dar um ambiente a ele ou removê-lo |
| Persistir o DNAT da 9094 no boot | o Kafka externo para de receber dos equipamentos depois de um reboot | `local/ingress/media-dnat.sh` do repositório `orbit` |
| `aquario-server` como ponto único de falha | cai a LAN inteira de câmeras e do sumo | rede da Atman |

## Glossário

| Termo | O que é |
| --- | --- |
| tailnet | a rede privada do Tailscale; a da empresa é a `atmansystems.com` |
| `--accept-routes` | flag do `tailscale up` que instala as rotas anunciadas por outro nó, como a `10.1.1.0/24` |
| subnet router | nó que anuncia uma rede inteira para a tailnet; aqui, o `aquario-server` |
| libvirt | camada de virtualização do sumo, que hospeda a VM do CI |
| DNAT | regra de iptables que redireciona uma porta do host para o nó do cluster |
| `DOCKER-USER` | cadeia do iptables em que o Docker permite regras próprias sobre portas publicadas |
