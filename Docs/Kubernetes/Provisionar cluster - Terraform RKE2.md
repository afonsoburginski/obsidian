# attlas-rke2-kvm — Terraform: cluster RKE2 sobre KVM

IaC que **provisiona VMs KVM (libvirt) e sobe um cluster RKE2 já configurado**,
espelhando o que foi validado no sumo. O `cloud-init` instala e habilita o RKE2
(versão pinada) no boot — então `terraform apply` entrega o cluster pronto, sem
passo manual.

> **Plataforma decidida: RKE2** (não "k8s" genérico), no sumo e no futuro EC2.
> Vive no monorepo em `infra/terraform/rke2-kvm/`. É **host-agnóstico** via
> `libvirt_uri`: roda contra um KVM local, contra o sumo (`qemu+ssh://...`) ou
> contra uma instância EC2 com nested virt (C8i/M8i/R8i ou `.metal`).
> **Nada aqui sobe nada sozinho** — só `terraform apply`.

## Estrutura

| Arquivo                             | Papel                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `versions.tf`                       | Provider `dmacvicar/libvirt` + `libvirt_uri`                           |
| `variables.tf`                      | Topologia, recursos, versão do RKE2, rede, imagem, token               |
| `main.tf`                           | Volume base Ubuntu 24.04 + volumes/cloud-init/domains (server e agent) |
| `cloud-init/rke2-server.yaml.tftpl` | Instala `rke2-server`, token, kubeconfig                               |
| `cloud-init/rke2-agent.yaml.tftpl`  | Instala `rke2-agent`, join no server                                   |
| `outputs.tf`                        | IPs dos nodes + como pegar o kubeconfig                                |
| `terraform.tfvars.example`          | Modelo de configuração                                                 |

## Pré-requisitos do HOST (onde as VMs vão rodar)

- KVM + libvirt + `qemu` ativos; suporte a virtualização (`/dev/kvm`).
- Rede libvirt `default` (NAT `192.168.122.0/24`) e storage pool `default`.
- No EC2: instância **C8i/M8i/R8i ou `.metal`** (nested virt), senão rodar RKE2
  direto na instância (sem a camada KVM).

## Uso (quando for subir)

```bash
cp terraform.tfvars.example terraform.tfvars   # ajuste ssh_public_key, token, etc.
terraform init
terraform plan
terraform apply        # cria VMs + RKE2 já configurado
terraform output kubeconfig_hint   # como baixar o kubeconfig
```

Single-node (`server_count=1, agent_count=0`) = o padrão, igual ao lab do sumo
(uma cidade = um cluster). Para escalar: aumente `agent_count` (mesma rede/host).

## Gotchas do host KVM (resolvidos ao validar no sumo)

Ao aplicar pela 1ª vez num host libvirt, três coisas mordem — todas resolvidas:

1. **`.terraform.lock.hcl` stale** travando o provider em `0.9.x` (schema novo,
   incompatível com este módulo). **Não commitar** o lock; o `versions.tf` pina
   `< 0.9.0`. Se já existir um lock com 0.9.x: `rm .terraform.lock.hcl && terraform init`.
2. **Permissão no backing file**: o overlay qcow2 referencia a base; o libvirt faz
   chown do disco top pro qemu mas **não do backing**. Sem isso: `Could not open
'...base.qcow2': Permission denied`. Fix de lab: `security_driver = "none"` em
   `/etc/libvirt/qemu.conf` + `systemctl restart libvirtd` (não derruba VMs no ar).
   (Reaplicar não recria a base — ela é compartilhada.)
3. **Domínio órfão** após um apply que falhou no meio (`domain '...' already exists`):
   `virsh undefine <nome>` e reaplicar.

## Topologia HA fixa (sem autoscaling de VM)

Provisiona **3 control-plane (HA, VIP via kube-vip) + N workers fixos** (`server_count` /
`agent_count`, com sizing por papel: `server_vcpu`/`agent_vcpu`/`*_memory_mb` + `vip`).
**Não** há autoscaler de nó — a capacidade de VM é fixa/planejada. A escala de carga é de
**pods, via KEDA** (ver `infra/bootstrap/scaling/` e [[01-VISAO-GERAL]] §4). O `var.max_pods` é só teto.

## Depois do cluster no ar (camadas seguintes, fora deste módulo)

1. **Registrar no Rancher** (opcional) — rodar o "registration command" do
   Rancher no node server (cluster custom).
2. **Imagens privadas** `atmanadmin/attlas-*:dev` — como o registry é privado e
   o CI não toca o host, carregar no containerd do node
   (`ctr -n k8s.io images import`) com `imagePullPolicy: IfNotPresent`; as
   públicas o node puxa do Docker Hub.
3. **Stack Attlas** — aplicar os manifests/Helm da aplicação (camada separada).
   Lembrar dos 2 ajustes de Kafka no K8s: Service `kafka` expor **29092**, e
   `enableServiceLinks: false` nos pods (senão o cp-kafka quebra).
