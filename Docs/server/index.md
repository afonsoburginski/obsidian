---
tags:
  - doc
  - infra
  - server
aliases:
  - "Server e CI"
  - "Server e CI - índice"
atualizado: 2026-10-01
---

# Server e CI

Infraestrutura em que o Attlas 26 é construído e roda fora de Kubernetes: o CI self-hosted na VM
`ci-runner` do servidor sumo, o ambiente dev.v2 no EC2, a máquina de dev Dell, a rede pela tailnet e a
observabilidade da aplicação. Cluster, chart Helm, Terraform e KEDA vivem no repositório
`Developer/kubernetes` e no skill `attlas-kubernetes`, não aqui.

## Notas deste domínio

- [[CI - Arquitetura e runners]] - workflows, o que o CI roda e não roda, o runner scale set
  `sumo-ci-runner`, caches, higiene, operação da VM, armadilhas e o caminho para o ARC.
- [[Ambientes - dev.v2, Dell e sumo]] - mapa dos ambientes, tailnet, fluxo do deploy, o `.env.docker` do
  host, receita da Dell e as armadilhas de ambiente.
- [[Runbook - desempenho do dev.v2]] - onde o dev.v2 perde tempo, o que está no código para não perder,
  pontos lentos conhecidos e como medir.
- [[Observabilidade - Aplicação e CI]] - Prometheus, Grafana, Loki e Alloy da aplicação, e o que falta para
  o CI.
- [[Acessos SSH - Infra Attlas]] - runbook de acesso a sumo, EC2, VM do CI e VMs. Tem credenciais, não
  versionar.

## Relacionados

[[Docs - índice raiz]] · [[ms-cameras]] · [[Runbook - câmeras reais e teste por terminal]] (comandos de câmera pelo terminal, inclusive ISAPI da Hikvision)
