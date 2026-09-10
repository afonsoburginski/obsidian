---
tags:
  - doc
  - attlas
  - infra
atualizado: 2026-09-02
---

# Server e CI

Acessos SSH e topologia dos runners self-hosted do CI. Verificado ao vivo em 02/09 (SSH direto nos
dois servidores) - substitui qualquer nota anterior que ainda citasse o EC2 como parte do fleet de CI.

## Acessos SSH

- **sumo** - `ssh develop@10.1.1.115`. Host físico de gestão (Rancher, VMs libvirt do cluster quito,
  cache remoto NX em `10.1.1.115:8388`). Sem sudo sem senha para o user `develop`.
- **VM `ci-runner`** (dentro da sumo) - de dentro da sumo: `ssh ubuntu@192.168.122.66`. 32 vCPU / 56 GB,
  domínio libvirt `ci-runner` (`virsh` só enxerga via `qemu:///system`, exige sudo). É onde os 4
  runners de CI rodam de verdade.
- **EC2** (`attlas-dev-runner`) - `ssh ubuntu@3.15.199.101` (alias `aws-attlas-26`). Continua sendo o
  ambiente dev vivo (stack `attlas-ms-*`/`attlas-db-*` completa em Docker), **mas não roda CI desde
  antes de 02/09** - zero `actions.runner.*` systemd, zero diretório `actions-runner`, zero processo.

## Topologia do CI (02/09)

**Todo o CI da empresa roda em 4 runners, todos na mesma VM `ci-runner` da sumo**: serviços systemd
`actions.runner.atmanadmin-attlas-2026.sumo-ci-runner{,-2,-3,-4}.service`, todos `active running`.
Nenhum runner fora dessa VM participa mais - o EC2 saiu completamente (era só Lint desde a mudança de
27/08; agora nem isso).

Consequência prática: o pool `heavy` (`runs-on: [self-hosted, linux, x64, heavy]`, usado por
Integration Test e Build em `ci-pr.yml`/`ci-develop.yml` e pelos validators - permission-catalog,
compose-ports, settings-timeout, dockerfile, kafka-topics) tem só esses 4 assentos para toda PR de
todo squad.

### Histórico (não repetir)

- Até 27/08: EC2 fazia Lint (pool aberto `[self-hosted, linux, x64]`), sumo tinha 3 runners `heavy`
  fazendo Integration+Build - contexto completo em `project_ci_heavy_runner_bottleneck_and_contracts_camera_split`
  na memória do Claude.
- 02/09: confirmado por SSH que virou 4 runners na sumo e zero no EC2. Comentário do job `lint` em
  `ci-pr.yml` corrigido no mesmo dia para não citar mais a EC2 como pool aberto.

## Fila: trava de base==develop, sem teto por autor (02/09)

`ci-pr.yml` e os 4 workflows validators (permission-catalog, compose-ports, settings-timeout,
dockerfile) reconferem `pull_request.base.ref == 'develop'` em runtime em todo job pesado - o filtro
declarativo `on.pull_request.branches` sozinho **não bastou** (PR empilhada com base != develop
disparou mesmo assim, confirmado no run 33638308829 do PR #2518).

Cheguei a colocar um job `admission` com teto de 1 execução de `ci-pr` em voo por autor (polling em
`ubuntu-latest`, fora do pool heavy) e **revertido a pedido do user no mesmo dia**: o FIFO nativo do
GitHub Actions já ordena por chegada entre jobs do mesmo label, e o teto só atrasava a segunda PR
legítima de alguém sem mudar quem causa fila de verdade - PR empilhada disparando sozinha (já coberto
pela trava acima) e o volume normal de 12 pessoas para 4 assentos. Não reintroduzir sem pedido
explícito.

## Ver também

[[Analítico]] · [[Convenções de escrita]]
