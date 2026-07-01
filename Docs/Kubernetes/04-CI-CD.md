# CI/CD do Attlas — versionamento e deploy multi-cluster

> [!abstract] Em uma frase
> Uma **única branch** gera **imagens Docker imutáveis**; cada **cluster de cliente** declara em Git **qual versão e quais serviços** roda; o **Rancher Fleet** aplica. Mesmo código → versões/serviços diferentes por cliente, **sem branch por ambiente**.

- **Versão:** 2.0 · **Data:** 19/06/2026 · **Status:** definido
- Companion de [[01-VISAO-GERAL]] (infraestrutura), [[arquitetura]] (diagrama) e [[03-PRODUCAO]] (ambiente do cliente).

---

## 1. Como funciona (o fluxo)

Do commit ao cluster, em 5 passos:

1. **Código** numa única branch (trunk). O merge só entra com lint + test + build verdes (ver `CLAUDE.md`).
2. **GitHub Actions** builda os serviços afetados (`nx affected`) e publica **uma imagem por serviço** com **tag imutável** (`:<semver>` + `:<git-sha>`).
3. **Docker Registry** guarda as imagens. A mesma imagem serve todos os clientes (**build once, deploy many**).
4. **Git (GitOps)** guarda, por cluster, **qual versão e quais serviços** rodam — em `values/<cliente>.yaml`.
5. **Rancher Fleet** observa o Git e aplica o chart Helm [`infra/helm/attlas`](../helm/attlas) com os valores daquele cluster (`helm upgrade`).

> Diagrama do fluxo: [[arquitetura]] (bloco "Pipeline CI/CD").

---

## 2. As regras que valem

| Regra                                | O que significa                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| **Build once, deploy many**          | A imagem é construída **uma vez** e **promovida** entre clusters, sem rebuild        |
| **Uma branch, não uma por ambiente** | O que diferencia os clusters é **configuração + versão fixada em Git**, não a branch |
| **Versão imutável**                  | Tag fixa `:<semver>` + `:<git-sha>`; **nunca** `latest`/`production` mutável         |
| **Estado em Git**                    | O que cada cluster roda vive versionado; o **Fleet** reconcilia (deploy declarativo) |

Um **release set** (ex.: `attlas-2026.06.0`) agrupa as versões de todos os serviços de um release. **É ele que se fixa por cluster** — fácil de promover, reverter e auditar.

---

## 3. Versão e serviços por cliente

Cada cliente tem um arquivo em Git que diz o que roda. **Promover** = mudar o `releaseSet` e commitar (o Fleet aplica). **Rollback** = reverter o pin (a imagem imutável garante o retorno determinístico).

```yaml
# values/attlas-quito.yaml            # values/attlas-vitoria.yaml
releaseSet: attlas-2026.06.0          releaseSet: attlas-2026.05.2   # versão anterior, mesma branch
services:                             services:
  ms-organization: { enabled: true }    ms-organization: { enabled: true }
  ms-cameras:      { enabled: true }     ms-cameras:      { enabled: true }
  ms-pmv:          { enabled: true }     ms-pmv:          { enabled: false }  # módulo não contratado
```

---

## 4. Cliente novo

**Terraform** `rke2-kvm` (`infra/terraform/rke2-kvm`) cria o cluster RKE2 → **registra o cluster no Rancher** (passo à parte, ver abaixo) → cria `values/<cliente>.yaml` com o release set + serviços → **Fleet aplica** o chart. Pronto.

> [!warning] Registrar no Rancher é um passo separado, não sai do `terraform apply`
> O Terraform só provisiona as VMs + RKE2. O cluster vira gerenciado pelo Rancher (e ganha o Fleet) só quando o **manifesto de import** do Rancher é aplicado nele (`kubectl apply -f <import-url>`), o que instala o `cattle-cluster-agent`. Validado na prática (25/06): destruir/recriar o cluster por fora do Rancher **quebra o registro** (o cluster fica `Unavailable`, "agent not connected") porque o cluster e o agente são destruídos juntos; é preciso **remover o registro morto e reimportar** o cluster novo. Em produção esse import deve ser um passo do bootstrap, logo após o `terraform apply`.

---

## 5. Falta implementar

- **Registry:** definir Docker Hub `atmanadmin/*` (privado) ou registry próprio — o resto do desenho independe disso.
- **Segredos:** manter fora do Git em claro (SealedSecrets / ExternalSecrets).
- **CI:** mudar para **tag imutável + release set** (o legado usa `:production`), criar a pasta GitOps e ligar o Fleet nela.
- **Registro no Rancher automatizado:** hoje o import do cluster no Rancher é manual (aplicar o manifesto do agente após o `terraform apply`). Automatizar como passo do bootstrap (§4) para o ciclo cliente-novo ser realmente um disparo só.
- **Distribuição de imagens privadas:** sem registry acessível ao cluster, as imagens `atmanadmin/*` são carregadas à mão no containerd de cada nó (`ctr import`). Com o registry (acima) + `imagePullSecret`, o nó puxa sozinho.
