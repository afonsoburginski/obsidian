---
tags:
  - doc
  - infra
  - indice
aliases:
  - "Infraestrutura"
  - "Server e CI"
  - "Server e CI - índice"
atualizado: 2026-10-15
banner: "assets/banners/servers.jpg"
banner_y: 0.3
---

# Infraestrutura

## Resumo

Onde o Attlas 26 é construído e roda. O CI é GitHub Actions em runners self-hosted na VM `ci-runner` do servidor
sumo. O ambiente dev roda em Kubernetes (kind) no hub, uma EC2 que também hospeda o Orbit, a plataforma própria que
registra releases, faz o deploy por GitOps sobre o Argo CD e vigia o ambiente. A rede é a tailnet `atmansystems.com`.
O dev não usa deploy por Docker Compose; o Compose serve ao ambiente local.

## Notas

| Nota | Abra quando |
| --- | --- |
| [[Infraestrutura - IPs e SSH]] | precisa do IP, do comando de SSH ou da VPN agora, numa página só |
| [[Infraestrutura - Servidores e rede]] | quer saber que máquinas existem, o que roda em cada uma, os endereços e como a rede e a tailnet funcionam |
| [[Infraestrutura - Acessos SSH]] | precisa entrar no hub, no sumo ou na VM do CI, ou saber onde está uma credencial |
| [[Infraestrutura - Ambientes]] | quer entender como o dev é montado, o caminho de uma requisição, o ambiente local da Dell, ou por que um serviço não sobe |
| [[Infraestrutura - Orbit]] | precisa explicar ou seguir o fluxo cluster, template, ambiente e deploy, entender o CD em ondas e a autocorreção, ou subir o Attlas num servidor novo |
| [[Infraestrutura - CI-CD de ponta a ponta]] | quer o caminho completo do commit ao pod: CI, imagem, release, CD e rollback |
| [[Infraestrutura - CI e runners]] | o CI está vermelho, lento, parado ou sem check, ou você vai mexer em `.github/workflows/` ou `scripts/ci/` |
| [[Infraestrutura - Observabilidade]] | vai subir Prometheus, Grafana e Loki na máquina local, quer saber como o dev é monitorado ou o que falta medir no CI |
| [[Infraestrutura - Runbook - Comandos]] | precisa do comando de uma ferramenta, local ou no hub |

## Explicações para usuário

| Explicação | Responde |
| --- | --- |
| [[Infraestrutura - Mapa de puertos]] | qué puerto usa cada servicio, en tu máquina y en dev, y qué puertos están expuestos |

## Diagramas

| Diagrama | Nota |
| --- | --- |
| `infra-servidores-e-rede` | [[Infraestrutura - Servidores e rede]] |
| `infra-cicd-ponta-a-ponta` | [[Infraestrutura - CI-CD de ponta a ponta]] |
| `infra-orbit-conceitos` | [[Infraestrutura - Orbit]] |
| `infra-orbit-servidor-remoto` | [[Infraestrutura - Orbit]] |
