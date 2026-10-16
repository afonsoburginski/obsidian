---
tags:
  - plano
  - infraestrutura
  - kubernetes
  - k3s
aliases:
  - "Migração para k3s"
  - "Plano k3s"
atualizado: 2026-10-16
---

# Migração para k3s - plano e validação

Volta para [[Infraestrutura - Orbit]].

## Resumo

| Pergunta | Resposta |
| --- | --- |
| Decisão | k3s no dev e na produção. RKE2 só se o cliente exigir segurança certificada (CIS ou FIPS) |
| Por quê | Na documentação do fabricante, o servidor k3s com carga simples usa 1,6 GB e 6% de um vCPU. O RKE2, 5 GB e 17%. Não é teste nosso e as versões diferem |
| O que não resolve | A carga 15,8 do EC2 (8 vCPU) é de processador. O Kubernetes do dev usa 1,5 GB e 0,4 vCPU |
| Pode quebrar? | Sim. Seis pontos dependem da rede Docker de hoje (tabela abaixo). Nenhum foi testado com k3s |
| Pior ponto | As portas públicas de mídia (RTSP e WebRTC do H9) e do Kafka usam DNAT manual para o nó do kind |
| Próximo passo | Provar a rede numa máquina com Docker que não seja o EC2 nem o sumo, antes de tocar no dev |

Unidades: vCPU é um núcleo virtual, GB é gigabyte. Pod é a menor unidade que o Kubernetes executa.

## Estado do hub medido

| Item | Valor |
| --- | --- |
| Máquina | `t3a.2xlarge`, 8 vCPU, 31,8 GB, Ubuntu 26.04, kernel `7.0.0-1004-aws` |
| Cluster | kind 1.37.0, um nó, 94 pods, 51 imagens em uso |
| Dados | 26 GB em `local-path`, 42 volumes (17 bancos de 2 GiB, Kafka e MinIO de 5 GiB) |
| Disco | 129 de 193 GB usados (67%) |
| Carga | 15,8 na média de 15 minutos (limite saudável é 8) |
| Kubelet do kind | despejo por disco desligado, limpeza de imagem em 100%, `maxPods: 200`, `failSwapOn: false` |
| Redes Docker | `kind` 172.19.0.0/16 com `orbit`, `orbit-gitops`, `orbit-ingress`, `orbit-ingress-tls`, `attlas-asm` e o nó |

## Cenários que dependem da rede Docker

Hoje as regras de rede do Kubernetes vivem dentro do container do nó kind. Com k3s elas passam a viver no host, junto com Docker, Tailscale e WireGuard.

| Cenário | Hoje | Com k3s | Validação |
| --- | --- | --- | --- |
| Orbit chama a API | `https://attlas-control-plane:6443`, nome DNS da rede Docker | `https://172.19.0.1:6443` (ponte do host), com esse IP em `tls-san`. CA e token mudam | Container para o host na ponte respondeu (porta 22 em `172.19.0.1` e no IP da VPC). A API em si não foi testada |
| Orbit chama o Argo CD | `http://172.19.0.2:30080` (IP do nó) | `http://172.19.0.1:30080` (NodePort no host) | NodePort só responde nesses IPs com kube-proxy em modo iptables. Fixar `proxy-mode=iptables`. Não testado |
| Argo CD lê o GitOps | pod chama `git://172.19.0.100` (container `orbit-gitops`, mesma rede do nó) | pod em 10.42.0.0/16 teria de atravessar o FORWARD até a ponte Docker. Solução: git daemon no host, escutando no IP do `cni0` (10.42.0.1), que entra pelo INPUT e não depende do FORWARD | Leitura das regras: hoje passaria só porque o FORWARD não tem os saltos do Docker. Não testado |
| Ingress do dev | `socat` e Caddy chamam `attlas-control-plane:30081` | `172.19.0.1:30081` | Igual ao Argo CD. Não testado |
| Portas públicas | quatro DNAT manuais para `172.19.0.2`: `8189/udp`, `8554/tcp`, `554/tcp`, `9094/tcp` | quebram. O nó deixa de existir e um DNAT para NodePort no mesmo host não funciona, porque o DNAT encerra a travessia da tabela nat e o do kube-proxy não é aplicado. Solução: `hostPort` no mediamtx (8189/udp, 8554, 554) e no Kafka (9094) | Raciocínio sobre o netfilter. Não testado |
| Saída dos pods | FORWARD aceita a sub-rede do kind e o host faz MASQUERADE | o flannel acrescenta `FLANNEL-FWD` no fim do FORWARD, aceitando 10.42.0.0/16, e o k3s faz o MASQUERADE. Vale também para o WireGuard (`10.200.0.0/24`) | Leitura do código do flannel e das regras. Não testado |

> [!warning]
> As quatro regras DNAT estão no `iptables` do host, mas só `8189/udp` e `8554/tcp` estão em `local/ingress/media-dnat.sh`. As de `554/tcp` e `9094/tcp` não sobrevivem a um reboot.

> [!warning]
> A cadeia FORWARD do host não salta para `DOCKER-USER` nem para `DOCKER-FORWARD` (dump do `nft list chain ip filter FORWARD`). A regra que bloqueia `45.138.12.0/24` em `DOCKER-USER`, criada por `~/bin/block-ips.sh`, não é avaliada no tráfego encaminhado. Só a regra de `INPUT` vale.

## Cenários verificados

| Item | Resultado |
| --- | --- |
| Portas do k3s | 6443, 10250, 8472/udp, 2379 e 2380 livres no host |
| Portas públicas | 8189/udp, 8554, 8888, 8889, 9997, 30080 e 30081 livres no host |
| Faixas de IP | pods 10.42.0.0/16 e serviços 10.43.0.0/16 não colidem com a VPC 172.31.32.0/20, Docker 172.17 a 172.19, WireGuard 192.168.8.0/24, 192.168.10.0/24, 10.200.0.0/24 e 10.200.1.0/24, nem com a tailnet 100.64.0.0/10 |
| Kernel | módulos `br_netfilter`, `vxlan`, `overlay`, `ip_vs`, `nf_conntrack` existem para o kernel em uso e não estão carregados (o k3s carrega ao subir) |
| Firewall do host | `ufw` e `firewalld` inativos. `INPUT` com política ACCEPT, então o problema conhecido do k3s com `INPUT` restritivo não se aplica |
| Disco dos dados | volume do nó kind e destino do k3s ficam em `/dev/root`. Mover as pastas com `mv` não gasta espaço. Copiar levaria o disco a cerca de 88% |
| Armazenamento | os charts do GitOps não fixam `storageClass`, então o `local-path` do k3s serve |
| Versão | k3s 1.37.1 existe (canal `latest`), mesma linha do kind 1.37.0. O canal `stable` é 1.36.5 |

## Configuração proposta do k3s

Arquivo `/etc/rancher/k3s/config.yaml`, com o mesmo comportamento do kubelet do kind:

```yaml
write-kubeconfig-mode: "0644"
tls-san:
  - 172.19.0.1
  - <ip-da-vpc>
disable:
  - traefik
  - servicelb
  - metrics-server
kube-proxy-arg:
  - proxy-mode=iptables
kubelet-arg:
  - max-pods=200
  - fail-swap-on=false
  - eviction-hard=
  - image-gc-high-threshold=100
```

Instalação com etcd embutido desde o início, para aceitar mais servidores depois (o k3s com banco local não aceita):

```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION=v1.37.1+k3s1 sh -s - server --cluster-init
```

O `metrics-server` embutido fica desligado porque o `up.sh` instala o do Helm com `--kubelet-insecure-tls`. Imagens privadas do Docker Hub entram por `/etc/rancher/k3s/registries.yaml`, com a credencial de `~/.docker/config.json`.

## Plano

### Fase 0: prova da rede

1. Máquina com Docker 29, Ubuntu 26.04 e o mesmo `/etc/docker/daemon.json` do hub. Criar a rede `kind` 172.19.0.0/16 e subir um `orbit-gitops` e um container que simule o `orbit`.
2. Instalar k3s com a configuração acima, Argo CD e um mediamtx com `hostPort`.
3. Reproduzir os seis cenários da tabela e a mesma cadeia FORWARD do hub (incluindo as regras manuais).
4. Medir memória e vCPU de k3s e de RKE2 com o mesmo Argo CD. Registrar se o fator de 3 se confirma.

Saída: cada cenário passa ou ganha uma correção.

### Fase 1: código do Orbit

| Arquivo | Mudança |
| --- | --- |
| `local/up.sh` | modo k3s: sem `kind create`, sem `docker exec` no nó, `ARGOCD_URL` e `K8S_URL` pelo IP da ponte, git daemon no `cni0` |
| `local/env-secrets.sh`, `local/hub-backup.sh`, `local/host-collector.py`, `remote/check-remote.sh` | contexto do kubectl e referências ao nó `attlas-control-plane` |
| `local/host-collector.py` | classificar processos por pod do containerd, não por cgroup `docker-<id>.scope` e rótulo do kind |
| `console/server.mjs` | instalador com opção k3s e `--cluster-init` (hoje só `get.rke2.io`, linha 2812); liberar nó de controle em k3s (linha 3116); contexto do hub (linha 7086) |
| `remote/connect-cluster.sh` | `tls-san` e CA do k3s (hoje o CA lido é o do RKE2, linha 214) |
| `local/ingress/media-dnat.sh` | removido, substituído por `hostPort` no GitOps |
| `gitops/attlas` | `hostPort` no mediamtx e no Kafka; anotações do nginx em `charts/atman-infra/templates/ingress.yaml` |
| Terraform e docs | módulo `k3s-cluster` no lugar de `rke2-cluster`; README e páginas `stack`, `producao-ha` e `adicionar-servidor` |

### Fase 2: troca no EC2 do dev

Exige janela com o dev.v2 parado. A duração depende da fase 0 e não foi medida.

1. `bash local/state-backup.sh` e `pg_dump` de cada banco para `~/orbit-backups`, independente do `mv`.
2. Ambiente em deploy manual e todos os serviços em 0 réplica.
3. `docker stop attlas-control-plane` (parar, não remover).
4. Instalar o k3s e conferir `kubectl get nodes`.
5. Rodar o `up.sh` em modo k3s: Argo CD, ApplicationSets, Secrets pelo `env-secrets.sh` e git daemon.
6. Subir só a infraestrutura, com os bancos em 0 réplica, e mover cada pasta `pvc-<uid>_attlas-dev_<claim>` do volume do kind para a pasta correspondente em `/var/lib/rancher/k3s/storage/`. O script `k3s-move-volumes.sh` ainda não existe.
7. Subir os serviços em ondas (a carga já chegou a 100 com 22 serviços de uma vez).
8. Validar pelo domínio: página 200, login com usuário inexistente 401, todos os pods 1/1, RTSP em 8554 e 554, Kafka em 9094 e um layer no H9.

Reversão, enquanto o kind existir:

```bash
sudo systemctl stop k3s
# mover as pastas de volta para o volume do kind
docker start attlas-control-plane
bash ~/orbit/local/ingress/media-dnat.sh
sudo iptables -t nat -I PREROUTING -p tcp --dport 9094 -m addrtype --dst-type LOCAL -j DNAT --to-destination 172.19.0.2:30094
sudo iptables -t nat -I PREROUTING -p tcp --dport 554 -m addrtype --dst-type LOCAL -j DNAT --to-destination 172.19.0.2:30554
sudo iptables -t nat -A POSTROUTING -d 172.19.0.2/32 -p tcp --dport 30554 -j MASQUERADE
```

Manter o kind parado por sete dias antes de apagar.

### Fase 3: produção

1. Três servidores iguais com `--cluster-init`, disco SSD, versão do k3s fixa e `tls-san` do endereço de acesso.
2. Capacidade: regime de 23 vCPU e 21 GB, pico de 32 vCPU. Três máquinas de 16 vCPU e 32 GB (48 vCPU e 96 GB) cobrem o regime com uma caída e chegam ao pico no limite. Sem exigência de alta disponibilidade, uma máquina com backup. Teste de carga antes de entregar.
3. Porta de entrada: o k3s traz Traefik e o chart usa anotações do nginx (50 MB e 24 h de conexão). Decidir entre a compatibilidade do Traefik e trocar as anotações.
4. Backup do etcd com `k3s etcd-snapshot` para fora das máquinas.

### Fase 4: limpeza

Remover kind do `up.sh`, atualizar as notas de `Docs/Infraestrutura` e arquivar este plano ao concluir.

## Pendências

| O que falta | Por que importa | Onde |
| --- | --- | --- |
| Testar os seis cenários com k3s | nenhum foi testado | máquina com Docker (fase 0) |
| Persistir os DNAT de `554/tcp` e `9094/tcp` | somem em reboot hoje | `local/ingress/media-dnat.sh` |
| Ligar a cadeia `DOCKER-USER` ao FORWARD ou mover o bloqueio de IP | o bloqueio de `45.138.12.0/24` não vale para portas encaminhadas | host do hub |
| Saldo de crédito de CPU do `t3a.2xlarge` | "roubo" de 3 a 15% do processador | conta AWS |
| Escrever `k3s-move-volumes.sh` | mover os volumes dos bancos sem copiar | `local/` |
| Reescrever o coletor de máquina | a tela Máquina deixa de classificar pods | `local/host-collector.py` |

## Glossário

| Termo | O que é |
| --- | --- |
| DNAT | regra do host que troca o destino de um pacote para outro endereço e porta |
| FORWARD | cadeia do firewall que decide o tráfego que passa pelo host entre redes |
| NodePort | porta do host (30000 a 32767) que o kube-proxy encaminha a um Service |
| `hostPort` | porta do host ligada diretamente a um pod, sem NodePort |
| `cni0` | ponte de rede que o flannel cria no host para os pods |
| `tls-san` | endereços aceitos no certificado da API do Kubernetes |
