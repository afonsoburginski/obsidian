Attlas 26 - Quito | Hardware

VMs (cluster RKE2 HA, idêntico ao laboratório; muda só o hypervisor:
Nutanix no lugar do KVM)

- 3 control-plane: 4 vCPU / 8 GB RAM / 50 GB SSD (cada)
- 3 workers: 16 vCPU / 32 GB RAM / 100 GB SSD (cada)

Soma das 6 VMs: 60 vCPU | 120 GB RAM | 450 GB SSD

Servidor para o cluster (VMs + hypervisor Nutanix + folga de crescimento):

- CPU: 72 vCPU (60 das VMs + 12 do Nutanix / CVM)
- RAM: 192 GB (120 das VMs + 32 do Nutanix + folga)
- SSD: 2 TB (450 GB das VMs + folga p/ crescimento de auditoria/Kafka)

SO das VMs: Ubuntu Server 24.04 LTS
Kubernetes: RKE2 v1.35.5 (gestão via Rancher/Fleet, deploy via Helm)
Criação das VMs: Nutanix (painel Prism ou Terraform / provider Nutanix)

Rede / IP (sub-rede dedicada):

- 6 IPs via DHCP (1 por VM)
- 1 IP fixo (fora do DHCP) para o VIP do servidor de API
- 1 IP para a aplicação web

Acesso:

- Gestão do cluster: VPN WireGuard (Atman <-> Quito)
- Usuários: aplicação web via HTTPS
