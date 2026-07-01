# Bootstrap do cluster — addons (camada entre o Terraform e a aplicação)

> [!abstract] O que é
> Depois que o **Terraform** (`infra/terraform/rke2-kvm`) entrega o cluster RKE2 HA no ar, e **antes** de subir a stack Attlas (chart `infra/helm/attlas` via Fleet), o cluster precisa de **3 addons de base**. Este doc fixa **quais são, em que versão e como instalar de forma reprodutível** — o que foi validado no servidor (`attlas-quito`, 19/06/2026).

Ordem das camadas: **1) Terraform (cluster)** → **2) Bootstrap (este doc)** → **3) App (Helm/Fleet)**.

## Arquivos desta pasta

| Arquivo                                  | O que é                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`install.sh`](./install.sh)             | **O código** — script idempotente que aplica os addons (local-path + KEDA via Helm)       |
| [`keda-values.yaml`](./keda-values.yaml) | **O arquivo de configuração** — values do chart `kedacore/keda` (réplicas, recursos, log) |
| `README.md`                              | Este doc — o que é cada addon, versões e como validar                                     |

Rodar tudo de uma vez: `export KUBECONFIG=~/iac/quito/kubeconfig-attlas-quito.yaml && ./install.sh`.

---

## Addons de base

| Addon                      | Versão (no servidor) | Papel                                                                          | Como instalado                                                     |
| -------------------------- | -------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| **kube-vip**               | `v0.8.9`             | VIP HA do API server (`192.168.122.50`)                                        | **já no Terraform** (static pod via cloud-init) — não refazer aqui |
| **local-path-provisioner** | `v0.0.30`            | StorageClass **default** (`local-path`) — PV local pros bancos                 | manifesto (`kubectl apply`)                                        |
| **KEDA**                   | `2.16.1`             | escalonamento horizontal de pods (ScaledObjects) — ver [[01-VISAO-GERAL]] §4.1 | **Helm** (`kedacore/keda`)                                         |

> [!note] Estado no servidor (19/06/2026)
> O **KEDA agora é uma release Helm** (`helm list -n keda` → `keda 2.16.1 deployed`). Foi originalmente aplicado via `kubectl apply` e depois **adotado pelo Helm** com `helm upgrade --install ... --take-ownership` (sem downtime); os deployments duplicados do manifesto antigo foram removidos. O **local-path** segue por manifesto (não tem ganho em Helm). Daqui pra frente o KEDA pode virar dependência do Fleet, reusando [`keda-values.yaml`](./keda-values.yaml).

---

## Instalação

Pré-requisito: `KUBECONFIG` apontando pro cluster (`~/iac/quito/kubeconfig-attlas-quito.yaml`, que aponta pro VIP).

### 1. local-path-provisioner (StorageClass default)

```bash
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.30/deploy/local-path-storage.yaml
# tornar default (os bancos pedem PV sem StorageClass explícita):
kubectl patch storageclass local-path \
  -p '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

### 2. KEDA (via Helm)

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm repo update
helm install keda kedacore/keda \
  --namespace keda --create-namespace \
  --version 2.16.1
```

Sobe `keda-operator` + `keda-metrics-apiserver` + `keda-admission-webhooks` (todos `2.16.1`). Os **ScaledObjects por serviço** não entram aqui — vêm no chart da aplicação (`infra/helm/attlas`, bloco `scaling`); ver [[01-VISAO-GERAL]] §4.1.

---

## Validação

```bash
kubectl -n keda get pods                 # operator + metrics-apiserver + admission Running
kubectl get sc                           # local-path (default)
kubectl get crd scaledobjects.keda.sh    # CRD do KEDA presente
helm list -A                             # keda deployed (quando instalado por Helm)
```

Estado de referência (servidor, 19/06/2026): KEDA `2.16.1`, local-path `v0.0.30` (default), Helm `v3.21.1`, RKE2 `v1.35.5+rke2r2`.

---

Companion: [[01-VISAO-GERAL]] (infraestrutura), [[04-CI-CD]] (distribuição da app), [`infra/terraform/rke2-kvm`](../terraform/rke2-kvm) (cluster), [`infra/bootstrap/scaling`](./scaling) (regras de escala).
