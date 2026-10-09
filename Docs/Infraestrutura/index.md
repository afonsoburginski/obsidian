---
tags:
  - doc
  - infra
  - indice
aliases:
  - "Infraestrutura"
  - "Server e CI"
  - "Server e CI - índice"
10|atualizado: 2026-10-09
banner: "assets/banners/servers.jpg"
banner_y: 0.3
---

# Infraestrutura

## Resumo

Onde o Attlas 26 é construído e roda: o CI self-hosted na VM `ci-runner` do servidor sumo, o ambiente dev.v2 no
EC2 (compose), a máquina de dev Dell, a rede pela tailnet `atmansystems.com` e a observabilidade da aplicação.
O deploy em Kubernetes é por **Argo CD + Atman Platform** (Devtron foi testado e descartado): hoje um hub de
avaliação num `kind` no EC2 dev, com o ambiente dev completo do Attlas.

## Notas

| Nota | Abra quando |
| --- | --- |
| [[Infraestrutura - Runbook - Comandos]] | precisa do comando de uma ferramenta |
| [[Infraestrutura - Acessos SSH]] | precisa entrar no sumo, no EC2, na VM do CI ou nas VMs da LAN, ou saber onde está uma credencial |
| [[Infraestrutura - Ambientes]] | precisa saber o que roda onde, como o deploy do dev.v2 funciona ou por que um container caiu |
| [[Infraestrutura - CI e runners]] | o CI está vermelho, lento, parado ou sem check, ou você vai mexer em `.github/workflows/` ou `scripts/ci/` |
| [[Infraestrutura - Observabilidade]] | vai subir Prometheus, Grafana e Loki, ou quer saber o que falta medir no CI |
| [[Infraestrutura - Atman Platform - Plano e bootstrap]] | vai usar ou subir a Atman Platform (Argo CD, templates, ambientes, clusters), fazer deploy em servidor de cliente por VPN ou montar o Terraform e o RKE2 |
| [[Infraestrutura - Pipeline de CI-CD]] | quer entender o caminho do commit ao cluster, o versionamento por serviço, o que muda no GitHub Actions ou como promover para cliente |

## Explicações para usuário

| Explicação | Responde |
| --- | --- |
| [[Infraestrutura - Mapa de puertos]] | qué puerto usa cada servicio, en tu máquina y en el EC2, y qué puertos están expuestos |

## Diagramas

| Diagrama | Nota |
| --- | --- |
| `infra-atman-platform` | [[Infraestrutura - Atman Platform - Plano e bootstrap]] |
| `infra-pipeline-argocd` | [[Infraestrutura - Pipeline de CI-CD]] |
