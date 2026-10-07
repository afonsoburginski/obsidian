---
tags:
  - doc
  - infra
  - indice
aliases:
  - "Infraestrutura"
  - "Server e CI"
  - "Server e CI - índice"
atualizado: 2026-10-07
---

# Infraestrutura

## Resumo

Onde o Attlas 26 é construído e roda fora de Kubernetes: o CI self-hosted na VM `ci-runner` do servidor sumo,
o ambiente dev.v2 no EC2, a máquina de dev Dell, a rede pela tailnet `atmansystems.com` e a observabilidade da
aplicação. Nenhum cluster Kubernetes de aplicação está no ar; cluster, chart Helm, Terraform e KEDA ficam no
repositório `Developer/kubernetes` e na skill `attlas-kubernetes`.

## Notas

| Nota | Abra quando |
| --- | --- |
| [[Infraestrutura - Runbook - Comandos]] | precisa do comando de uma ferramenta |
| [[Infraestrutura - Runbook - Desempenho do dev.v2]] | o dev.v2 está lento e você precisa achar onde o tempo vai |
| [[Infraestrutura - Acessos SSH]] | precisa entrar no sumo, no EC2, na VM do CI ou nas VMs da LAN, ou saber onde está uma credencial |
| [[Infraestrutura - Ambientes]] | precisa saber o que roda onde, como o deploy do dev.v2 funciona ou por que um container caiu |
| [[Infraestrutura - CI e runners]] | o CI está vermelho, lento, parado ou sem check, ou você vai mexer em `.github/workflows/` ou `scripts/ci/` |
| [[Infraestrutura - Observabilidade]] | vai subir Prometheus, Grafana e Loki, ou quer saber o que falta medir no CI |

## Explicações para usuário

O domínio não tem explicação para usuário final na raiz do vault.

## Diagramas

O domínio não tem diagrama.
