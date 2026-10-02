---
tags:
  - doc
  - infra
  - ci
aliases:
  - "Registro - CI em 23 de setembro, VM ampliada e scale set"
  - "Infraestrutura de CI - trabalho sem card"
  - "Infra de CI"
  - "Trabalho de CI sem card"
  - "Plano - CI profissional em Kubernetes com ARC"
  - "Plano - CI em Kubernetes"
  - "CI - Arquitetura e runners"
atualizado: 2026-10-01
---

# Infraestrutura - CI e runners

O CI do `attlas-2026` é GitHub Actions em runners self-hosted, todos dentro de uma VM só, a `ci-runner`,
no servidor sumo. O código mora em `.github/workflows/`, `.github/actions/setup/action.yml`,
`.github/scripts/push-images.sh` e `scripts/ci/`. O deploy do dev.v2 está em
[[Infraestrutura - Ambientes#Deploy]], e o acesso às máquinas em [[Infraestrutura - Acessos SSH]].

## Workflows

| Workflow | Gatilho | O que roda |
| --- | --- | --- |
| `ci-pr.yml` | PR para `develop` (draft fica de fora) e `workflow_dispatch` com input `projects` | **Lint** em `[self-hosted, linux, x64]`: `scripts/ci/nx-ci.sh lint --parallel=$(nproc) --configuration=ci`, depois o passo **Validadores** (`scripts/ci/validators.sh`: chaves de erro aninhadas, portas do Compose, tópicos Kafka, timeout de configurações) e o passo **Resumo** (`scripts/ci/ci-summary.mjs`). **Integration Test** em `heavy`: desligado. **Build** em `heavy`, em paralelo ao Lint (sem `needs`), `--configuration=production` com 8 GiB de heap e `--parallel` calculado por `scripts/ci/nx-parallel.sh` |
| `ci-develop.yml` | push na `develop` (ignora `docs/**`, `**/*.md` e o `deploy.yml`) e `workflow_dispatch` | Lint e integração (pulada) como no de PR, mais **Build & Push** em `heavy` depois do Lint verde: guarda de disco (abaixo de 25 GB roda `image prune`), base do affected no último run com Build & Push verde (`scripts/ci/dev-images-base.sh`), pula os esqueletos de `.github/skeleton-services.txt`, `push-images.sh` com `scripts/ci/smoke-image-boot.sh` antes do push e tags `:dev` e `:<sha>` no Docker Hub `atmanadmin` |
| `deploy.yml` | só `workflow_dispatch` | deploy no dev.v2, ver [[Infraestrutura - Ambientes#Deploy]] |
| `dockerfile-validate.yml` | PR ou push que toca Dockerfile, o `docker/Dockerfile.template` ou o `package-lock.json` | guarda do pin do `tslib`, build e smoke das imagens alteradas |
| `kong-config-validate.yml` | push na `develop` que muda o `docker/kong.yml` | `kong config parse` |
| `claude-code-review.yml` | comentário `@claude` | review no runner `heavy` |

Regras do fluxo:

- **Concorrência**: no `ci-pr` um run novo cancela o anterior só em evento de PR; no `ci-develop` um push
  novo cancela o run em curso, e o próximo publica todas as imagens que o cancelado publicaria, porque a
  base vem do último Build & Push verde.
- **Trava de base**: todo job do `ci-pr` reconfere `pull_request.base.ref == 'develop'`, porque o filtro
  declarativo `on.pull_request.branches` sozinho deixou passar uma PR empilhada. Consequência: **PR
  empilhada não ganha check**; rodar à mão com `gh workflow run ci-pr.yml --ref <branch>`.
- **Sem teto por autor na fila.** O FIFO nativo do GitHub Actions já ordena por chegada; um job de
  admissão com teto por autor só atrasava a segunda PR legítima e não se reintroduz sem pedido explícito.
- **Log enxuto**: `scripts/ci/nx-ci.sh` imprime uma linha por task e a saída inteira só da task que falhou.

## O que o CI não roda

- **Nenhum job roda o alvo `test`** (Jest unitário).
- **A integração está desligada**: o job tem `false &&` no `if` nos dois workflows, o check
  `Integration Test` aparece pulado em toda PR, e Build e Build & Push aceitam a integração pulada. É
  decisão de CI e se acata, não é falha a investigar. Os passos para religar estão na
  `docs/specs/cross-service/CROSS-022-ci-fanout-reduction.md`, seção 14.5.
- Com as duas coisas, **nenhuma suíte de teste é gate de merge**. O CI cobre lint, validadores e build.
- Não existe ambiente de preview por PR. O `docs/architecture/workflow.md` (testes e preview no CI) e o
  `docs/architecture/docker.md` (Helm, Actions e branch `main`) estão errados nesse ponto.

## Runners

- **VM `ci-runner`** no sumo: 96 vCPU, 86 GB de RAM, 15 GB de swap, cerca de 387 GB de disco, Ubuntu
  24.04, domínio libvirt `ci-runner`. "O `sumo-ci-runner`" no vocabulário do time é a VM inteira.
- **Runner scale set `sumo-ci-runner`**, com os labels `self-hosted, linux, x64, heavy`, os mesmos que os
  workflows pedem. O serviço `ci-scaleset` (Go, sobre o cliente oficial do GitHub para scale set) mantém
  2 runners de prontidão, sobe mais conforme a fila até **20 vagas** e só sobe runner novo com pelo menos
  10 GB de RAM livre.
- **Um runner efêmero por job.** A página de runners do GitHub mostra uma linha por job em paralelo,
  `sumo-ci-runner-NN-xxxxxx` com sistema "unknown", que some quando o job termina. Não há configuração que
  junte essas linhas.
- **Cada vaga** é uma unit `actions.runner.atmanadmin-attlas-2026.sumo-ci-runner-N` com pasta própria, que
  persiste entre jobs com o `node_modules` aquecido e o `.env` dos hooks.
- **Recursos por job**: o governador dá teto de RAM de pelo menos 16 GB por job; o orçamento de CPU dá uma
  janela de 12 vCPU (8 quando a RAM livre cai abaixo de 24 GB), sem `CPUQuota`, e janelas sobrepostas
  dividem por `CPUWeight` igual.
- **Credencial**: token clássico com escopo `repo` da conta de administração do repositório, legível só
  por root na VM.
- O EC2 do dev.v2 não tem runner: dividia 8 vCPU com a stack e o stream de câmera e saturava a saída de
  rede.

## Caches

- **Setup** (`.github/actions/setup/action.yml`): `git clean -xfd` preservando `node_modules` e
  `.nx/workspace-data`, `nrwl/nx-set-shas@v5` com base `develop`, e a sentinela
  `node_modules/.attlas-lock-hash`, que também exige `node_modules/.bin/nx` e o `tslib`; faltando
  qualquer um, roda `npm ci`.
- **Nx local** compartilhado entre as vagas em `/home/ubuntu/.cache/nx-attlas`.
- **Nx remoto** em `http://10.1.1.115:8388` (nx-cache-server mais MinIO no host sumo, em `~/nx-cache`,
  secret `NX_REMOTE_CACHE_TOKEN`). A retenção é um sweep do bucket com teto de 32 GB mais ILM de 7 dias.
- **ESLint por arquivo** em `<projeto>/node_modules/.cache/eslint/<chave>/`, com a chave tirada do grafo
  do nx por `scripts/ci/eslint-cache.mjs` e a configuração `ci` do lint no `nx.json`. Vaga fria copia o
  cache de outra vaga.
- **Fora do cache, de propósito**: `test:integration` e o cache persistente do Angular (`CI=true`).

## Higiene e disco

Scripts em `scripts/ci/`, units em `scripts/ci/systemd/`.

| Mecanismo | O que faz |
| --- | --- |
| `nx-cache-gc` | a cada 15 min, teto de 30 GB de Nx e 10 GB de Jest, com faixas ocioso, parcial e crítico (88%) |
| `nx-cache-bucket-sweep` | de hora em hora no host, teto de 32 GB mais ILM de 7 dias no bucket |
| `docker-gc` | na VM de CI poda volumes; no host de aplicação nunca poda volume; cache de build com teto de 8 GB |
| `ci-disk-watch` | alerta no journal a 75% e 88% |
| `ci-job-hook-completed.sh`, `ci-integration-lock-acquire.sh` | hooks de job; o segundo também aplica o orçamento de CPU |
| `ci-runner-reaper` | mata job acima de 75 min e varre container Ryuk morto |
| `ci-runner-rotate` | rotação semanal; não reinicia vaga com o `ci-scaleset` ativo |
| sysctl (`scripts/ci/sysctl.d/99-attlas-ci-runner.conf`) | `fs.inotify.max_user_instances=8192` |

## Operação da VM

| O quê | Onde |
| --- | --- |
| Serviço do scale set | `ci-scaleset.service`, binário em `/usr/local/bin/ci-scaleset` |
| Lista de vagas | `/etc/ci-scaleset/slots`, uma linha por vaga: unit e pasta |
| Credencial | `/etc/ci-scaleset/token`, só root |
| Estado das vagas | `/var/lib/ci-scaleset` |
| Código do serviço | `/opt/ci-scaleset/src` na VM; build no host, em `~/ci-scaleset` do `develop`, com contêiner `golang:1.26` |
| Scripts de recurso | `/usr/local/bin/ci-runner-governor.sh` e `/usr/local/bin/ci-job-cpu-budget.sh` |

- Log ao vivo: `sudo journalctl -u ci-scaleset -f`. Reiniciar o serviço é seguro: os jobs em curso rodam
  em units próprias.
- Manutenção: `sudo /usr/local/bin/ci-runner-drain.sh --poweroff` para o scale set, espera cada job
  terminar e desliga a VM.
- Mais vagas: copiar a pasta de uma vaga sem `_work` e `_diag`, criar a unit e o drop-in `scaleset.conf` a
  partir de uma existente, acrescentar a linha em `/etc/ci-scaleset/slots` e reiniciar o serviço.
- Redimensionar a VM no host: `virsh --connect qemu:///system` com `setvcpus --config` e
  `setmaxmem`/`setmem --config`, depois desligar e ligar; disco cresce a quente com `virsh blockresize`,
  seguido de `growpart` e `resize2fs` dentro da VM.

> [!warning] O que roda na VM não está no repositório
> O `ci-scaleset`, o piso de 16 GB do governador e a janela de 12/8 vCPU existem só na VM. O
> `scripts/ci/ci-job-cpu-budget.sh` da `develop` ainda divide núcleos por jobs ocupados (de 2 a 32) com
> `CPUQuota`, o `ci-runner-reaper.sh` e o `ci-runner-rotate.sh` olham `actions-runner{,-2,-3}` e podem não
> cobrir as 20 vagas, e a topologia do `docs/architecture/ci-remote-cache.md` (3 runners mais 1, VM de
> 32 vCPU) está obsoleta. Um redeploy a partir do repositório desfaz o que roda hoje.

## Armadilhas conhecidas

| Sintoma | Causa | Correção |
| --- | --- | --- |
| `nx: not found`, "Could not find Nx modules" | `node_modules` corrompido com sentinela batendo | a sentinela confere `.bin/nx`; se persistir, apagar `node_modules/.attlas-lock-hash` da vaga e rodar de novo |
| "Application bundle generation failed" sem erro | saída cortada em 64 KiB, não OOM | rebuildar o merge commit na VM com `--outputStyle=stream` |
| Build do `web-attlas` morrendo por heap | o compilador Angular passa de 4 GiB | o Build roda com `--max-old-space-size=8192`, e o `nx-parallel.sh` divide a RAM por esse heap |
| Rerun segue vermelho depois de a `develop` corrigir | o rerun reusa o merge SHA antigo | empurrar commit ou "Update branch" |
| PR sem checks | base não é `develop` | `gh workflow run ci-pr.yml --ref <branch>` |
| Log sem o resumo do Jest | truncamento do pino | ler `/tmp/nx-integration.log` na VM |
| `pull access denied minio/*` | o MinIO saiu do Docker Hub | `quay.io/minio/...` |
| Timeout de pull de imagem na integração | AAAA sem rota IPv6 | precedência no `gai.conf` mais `scripts/ci/prepull-test-images.sh` |
| Cache remoto devolvendo 500 | quota no bucket do MinIO | só sweep; **nunca `mc quota`** |
| VM afunda, runners aparecem offline | `MemoryHigh` por job abaixo do pico de um build (5 a 6 GB): o kernel estrangula, o swap enche e o runner não fala com o GitHub a tempo | piso de 16 GB por job no governador |
| Muitos jobs na fila | vagas cheias, ou runner recusando subir com pouca RAM ou disco | `journalctl -u ci-scaleset` e a tabela de higiene acima |

Armadilhas da integração, que voltam quando ela for religada:

- **Vaga com dono morto.** Job cancelado pelo GitHub não roda o hook de conclusão; a vaga de integração é
  liberada pela morte do processo dono, não por guarda de tempo.
- **inotify.** O MediaMTX do testcontainers morria no boot por falta de instância de inotify, logo depois
  de imprimir a linha que o testcontainers usa como sinal de pronto, e a suíte rodava contra um container
  morto. O teto padrão de 128 estoura com containers vazados pelo reaper Ryuk compartilhado; daí o sysctl
  de 8192 e a varredura do reaper.
- **Duas integrações na mesma máquina** disputam porta e banco; o acesso é por semáforo de vagas
  (`INTEGRATION_SLOTS`).

Antes de diagnosticar CI vermelho, olhar as PRs mergeadas na `develop` nas últimas horas: a maior parte
das falhas "misteriosas" entrou ali.

## Pendências

O checklist vive em [[CI - runner profissional em Kubernetes com ARC]]. O que falta, e por quê:

- **Versionar o que só existe na VM** (`ci-scaleset`, governador, orçamento de CPU, provisionamento) em
  `scripts/ci/`, e **trocar o token pessoal por um GitHub App** com permissão mínima. Não depende de
  hardware e protege o que já funciona.
- **Painel e alerta** de fila parada, runner fora do ar e serviço do scale set caído; o desenho está em
  [[Infraestrutura - Observabilidade#Pendências]].
- **Religar a integração** pela CROSS-022, seção 14.5.
- **CI em Kubernetes com o ARC** (Actions Runner Controller), num cluster RKE2 só de CI, isolado porque o
  pod roda Docker-in-Docker privilegiado. Cada job vira pod com CPU e RAM reservadas (substitui governador
  e orçamento de CPU), servidor novo vira capacidade sem configuração, e a configuração inteira fica no
  repositório. Exige cache em volume persistente por nó (`node_modules` e Nx local), confirmar que a versão
  do ARC aceita os labels atuais, e convive alguns dias com cache frio.
- **Hardware**: o sumo tem 2 de 16 slots de memória ocupados (2 pentes DDR5 de 64 GB). Seis pentes DDR5
  RDIMM de 64 GB e 5600 MT/s levam a 512 GB e a 8 canais em uso. O ARC só vale depois da RAM: com 128 GB, o
  cluster teria menos capacidade útil que a VM. Sem um segundo servidor, a queda do sumo continua parando o
  CI de todos os squads.
- **Separar o domínio de câmera de `libs/contracts`** (`camera`, `camera-analytic`,
  `camera-media-profile`) num projeto NX próprio: uma PR que só muda tipo de câmera deixaria de marcar os
  cerca de 20 consumidores de `@attlas/contracts` como afetados. Desenhado, não executado; exige mover os
  arquivos, reescrever imports no `ms-cameras` e no `web-attlas`, criar o alias e rerodar
  `scripts/contracts-integration-inputs.mjs`.

## Relacionados

[[Infraestrutura]] · [[Infraestrutura - Ambientes]] · [[Infraestrutura - Acessos SSH]]
