---
tags:
  - doc
  - infra
  - server
aliases:
  - "Infraestrutura"
  - "Server e CI"
  - "Server e CI - índice"
atualizado: 2026-10-01
---

# Infraestrutura

Infraestrutura em que o Attlas 26 é construído e roda fora de Kubernetes: o CI self-hosted na VM
`ci-runner` do servidor sumo, o ambiente dev.v2 no EC2, a máquina de dev Dell, a rede pela tailnet e a
observabilidade da aplicação. Cluster, chart Helm, Terraform e KEDA vivem no repositório
`Developer/kubernetes` e no skill `attlas-kubernetes`, não aqui.

## Notas deste domínio

- [[Infraestrutura - CI e runners]] - workflows, o que o CI roda e não roda, o runner scale set
  `sumo-ci-runner`, caches, higiene, operação da VM, armadilhas e o caminho para o ARC.
- [[Infraestrutura - Ambientes]] - mapa dos ambientes, tailnet, fluxo do deploy, o `.env.docker` do
  host, receita da Dell e as armadilhas de ambiente.
- [[Infraestrutura - Runbook - Desempenho do dev.v2]] - onde o dev.v2 perde tempo, o que está no código para não perder,
  pontos lentos conhecidos e como medir.
- [[Infraestrutura - Observabilidade]] - Prometheus, Grafana, Loki e Alloy da aplicação, e o que falta para
  o CI.
- [[Infraestrutura - Acessos SSH]] - runbook de acesso a sumo, EC2, VM do CI e VMs. Tem credenciais, não
  versionar.

## Relacionados

[[Docs - índice raiz]] · [[Câmeras]] · [[Câmeras - Integração com dispositivo - Runbook]] (comandos de câmera pelo terminal, inclusive ISAPI da Hikvision)
