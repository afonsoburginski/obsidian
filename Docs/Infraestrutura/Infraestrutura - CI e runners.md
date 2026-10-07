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
  - "Infraestrutura - CI e runners"
atualizado: 2026-10-07
---

# Infraestrutura - CI e runners

Volta para [[Infraestrutura]].

## Resumo

O CI do `attlas-2026` é GitHub Actions em runners self-hosted, todos na VM `ci-runner` do servidor sumo,
servidos por um runner scale set de até 20 vagas. Em PR ele roda lint, validadores e build; não roda teste
unitário nem integração, então nenhuma suíte de teste é gate de merge. O push na `develop` publica as imagens
`:dev` no Docker Hub, e o deploy no dev.v2 é manual ([[Infraestrutura - Ambientes#Deploy do dev.v2]]). O
código mora em `.github/workflows/`, `.github/actions/setup/action.yml`, `.github/scripts/push-images.sh` e
`scripts/ci/`; o acesso às máquinas está em [[Infraestrutura - Acessos SSH]].

## Workflows

| Workflow | Gatilho | O que roda |
| --- | --- | --- |
| `ci-pr.yml` | PR para `develop` (draft fica de fora) e `workflow_dispatch` com input `projects` | **Lint** em `[self-hosted, linux, x64]`: `scripts/ci/nx-ci.sh lint --parallel=$(nproc) --configuration=ci`, depois o passo **Validadores** (`scripts/ci/validators.sh`) e o passo **Resumo** (`scripts/ci/ci-summary.mjs`). **Integration Test** em `heavy`: desligado. **Build** em `heavy`, em paralelo ao Lint (sem `needs`), `--configuration=production` com 8 GiB de heap e `--parallel` calculado por `scripts/ci/nx-parallel.sh` |
| `ci-develop.yml` | push na `develop` (ignora `docs/**`, `**/*.md` e o `deploy.yml`) e `workflow_dispatch` | Lint e integração (pulada) como no de PR, mais **Build & Push** em `heavy` depois do Lint verde: guarda de disco (abaixo de 25 GB roda `docker image prune`), base do affected no último run com Build & Push verde (`scripts/ci/dev-images-base.sh`), build e `.github/scripts/push-images.sh` |
| `deploy.yml` | só `workflow_dispatch` | deploy no dev.v2, ver [[Infraestrutura - Ambientes#Deploy do dev.v2]] |
| `dockerfile-validate.yml` | PR ou push que toca um `apps/*/Dockerfile`, o `docker/Dockerfile.template`, os scripts de guarda ou o `package-lock.json` | guarda do pin do `tslib`, build e smoke das imagens alteradas; PR de fork fica de fora |
| `kong-config-validate.yml` | push na `develop` que muda o `docker/kong.yml` | `kong config parse` no `kong:3.4` |
| `claude-code-review.yml` | comentário que começa com `@claude` numa PR | review no runner `heavy` |

O `push-images.sh` publica até 4 imagens em paralelo, com as tags `:dev` e `:<sha>` no Docker Hub
`atmanadmin`. Cada imagem leva o label `attlas.build-sha256`; quando o hash do build é igual ao da `:dev` que
já está no registry, a imagem não é publicada de novo. Antes do push, o `scripts/ci/smoke-image-boot.sh` sobe
a imagem e confere que ela resolve os módulos de runtime; imagem que falha não é publicada.

Os Validadores rodam cada um só quando o diff toca os caminhos dele, e todos no `workflow_dispatch`. Um
validador vermelho não impede os outros de rodar.

| Validador | Roda quando o diff toca |
| --- | --- |
| Nested Error Keys | qualquer `.ts` em `apps/` ou `libs/`, ou os catálogos de tradução |
| Spec Status | `apps/ms-traffic-model/docs/**/*.md` (só esse serviço por enquanto) |
| Compose Ports | `docker-compose.yml`, `docker-compose.override.yml` ou um `apps/ms-*/.env.example` |
| Kafka Topics | constantes de tópico em `libs/contracts`, o mapa de tópicos de auditoria ou `docker/kafka-topics.list` |
| Settings Timeout | `docker/kong.yml` ou `apps/ms-controllers/.env.example` |
| Deploy Env Keys | `scripts/ci/deploy-env-keys-check.sh` |

Regras do fluxo:

- **Concorrência.** No `ci-pr`, um run novo cancela o anterior só em evento de PR. No `ci-develop`, um push
  novo cancela o run em curso, e o próximo publica todas as imagens que o cancelado publicaria, porque a
  base vem do último Build & Push verde.
- **Trava de base.** Todo job do `ci-pr` reconfere `pull_request.base.ref == 'develop'`, porque o filtro
  `on.pull_request.branches` sozinho deixa passar uma PR empilhada. Consequência: PR empilhada não ganha
  check; rodar à mão com `gh workflow run ci-pr.yml --ref <branch>`.
- **Esqueletos.** O `nx-ci.sh` exclui de todo alvo (lint, build e integração) os serviços listados em
  `.github/skeleton-services.txt`, e o Build & Push não publica imagem deles. Serviço que ganha código sai
  da lista na mesma PR.
- **Sem teto por autor na fila.** O FIFO nativo do GitHub Actions já ordena por chegada; um teto por autor
  só atrasava a segunda PR legítima e não se reintroduz sem pedido explícito.
- **Log enxuto.** O `nx-ci.sh` imprime uma linha por task e a saída inteira só da task que falhou. A saída
  completa fica em `$RUNNER_TEMP/nx-<target>.log` enquanto o job existe.

## O que o CI não roda

- Nenhum job roda o alvo `test` (Jest unitário).
- A integração está desligada: o job tem `false &&` no `if` nos dois workflows, o check `Integration Test`
  aparece pulado em toda PR, e Build e Build & Push aceitam a integração pulada. É decisão de CI e se
  acata, não é falha a investigar. Os passos para religar estão na seção 14.5 de
  `docs/specs/cross-service/CROSS-022-ci-fanout-reduction.md`.
- Com as duas coisas, nenhuma suíte de teste é gate de merge. O CI cobre lint, validadores e build.
- Não existe ambiente de preview por PR. O `docs/architecture/workflow.md` (testes e preview no CI) e o
  `docs/architecture/docker.md` (Helm, GitHub Actions e branch `main`) estão errados nesse ponto.

## Runners

- **VM `ci-runner`** no sumo: 96 vCPU, 86 GB de RAM, 15 GB de swap, cerca de 387 GB de disco, Ubuntu 24.04,
  domínio libvirt `ci-runner`. No vocabulário do time, "o `sumo-ci-runner`" é a VM inteira.
- **Runner scale set `sumo-ci-runner`**, com os labels `self-hosted, linux, x64, heavy`, os mesmos que os
  workflows pedem. O serviço `ci-scaleset` (Go, sobre o cliente oficial do GitHub para scale set) mantém 2
  runners de prontidão, sobe mais conforme a fila até 20 vagas e só sobe runner novo com pelo menos 10 GB
  de RAM livre.
- **Um runner efêmero por job.** A página de runners do GitHub mostra uma linha por job em paralelo,
  `sumo-ci-runner-NN-xxxxxx` com sistema "unknown", que some quando o job termina. Nenhuma configuração junta
  essas linhas.
- **Cada vaga** é uma unit `actions.runner.atmanadmin-attlas-2026.sumo-ci-runner-N` com pasta própria, que
  persiste entre jobs com o `node_modules` aquecido e o `.env` dos hooks.
- **Recursos por job.** O governador dá teto de RAM de pelo menos 16 GB por job; o orçamento de CPU dá uma
  janela de 12 vCPU (8 quando a RAM livre cai abaixo de 24 GB), sem `CPUQuota`, e janelas sobrepostas
  dividem por `CPUWeight` igual.
- **Credencial do scale set**: token clássico com escopo `repo` da conta de administração do repositório
  (onde fica: [[Infraestrutura - Acessos SSH#Credenciais]]).
- O EC2 do dev.v2 não tem runner: ele dividia 8 vCPU com a stack e o stream de câmera e saturava a saída de
  rede.

## Caches

- **Setup** (`.github/actions/setup/action.yml`): `git clean -xfd` preservando `node_modules` e
  `.nx/workspace-data` (sem os índices SQLite e o grafo de projetos), `nrwl/nx-set-shas@v5` com base
  `develop`, Node do `.nvmrc` e a sentinela `node_modules/.attlas-lock-hash`, que também exige
  `node_modules/.bin/nx` e o `tslib`; faltando qualquer um, roda `npm ci`.
- **Nx local** compartilhado entre as vagas em `/home/ubuntu/.cache/nx-attlas`.
- **Nx remoto** em `http://10.1.1.115:8388`: nx-cache-server mais MinIO no host sumo, em `~/nx-cache` do
  `develop`, com o secret `NX_REMOTE_CACHE_TOKEN`. A retenção é uma varredura do bucket com teto de 32 GB mais
  ILM de 7 dias.
- **ESLint por arquivo** em `<projeto>/node_modules/.cache/eslint/<chave>/`, com a chave tirada do grafo do
  Nx por `scripts/ci/eslint-cache.mjs` e a configuração `ci` do lint no `nx.json`. Vaga fria copia o cache
  de outra vaga.
- **Fora do cache, de propósito**: `test:integration` e o cache persistente do Angular (`CI=true`).

## Higiene e disco

Scripts em `scripts/ci/`, units e timers em `scripts/ci/systemd/`.

| Mecanismo | Frequência | O que faz |
| --- | --- | --- |
| `nx-cache-gc` | a cada 15 min | teto de 30 GB no cache do Nx e de 10 GB no do Jest, com faixas ocioso, parcial e crítico (88% de disco) |
| `nx-cache-bucket-sweep` | de hora em hora, no host sumo | teto de 32 GB no bucket do cache remoto, do objeto mais antigo para o mais novo; complementa o ILM de 7 dias |
| `docker-gc` | a cada 6 h no host de aplicação (`docker-gc-host`) | no papel `ci-vm` poda volumes sem uso; no papel `app-host` (EC2 e host sumo) nunca poda volume nem container; teto de 8 GB no cache de build |
| `ci-disk-watch` | a cada 30 min | alerta no journal a 75% e 88% de disco, e quando o cache do Nx, do Jest ou o bucket passam do teto |
| `ci-job-hook-completed.sh`, `ci-integration-lock-acquire.sh` | por job | hooks de fim e de início de job; o de início também aplica o orçamento de CPU |
| `ci-runner-reaper` | timer da VM | mata job acima de 75 min e remove testcontainer cuja sessão não tem mais Ryuk vivo |
| `ci-runner-rotate` | semanal, domingo às 03:00 | pula se houver job rodando; limpa `_diag` com mais de 14 dias e `_work/_temp`, reinicia as units e recicla o swap |
| `scripts/ci/sysctl.d/99-attlas-ci-runner.conf` | no boot | `fs.inotify.max_user_instances=8192` |

## Operação da VM

| O quê | Onde |
| --- | --- |
| Serviço do scale set | `ci-scaleset.service`, binário em `/usr/local/bin/ci-scaleset` |
| Lista de vagas | `/etc/ci-scaleset/slots`, uma linha por vaga: unit e pasta |
| Credencial | `/etc/ci-scaleset/token`, só root |
| Estado das vagas | `/var/lib/ci-scaleset` |
| Código do serviço | `/opt/ci-scaleset/src` na VM; build no host, em `~/ci-scaleset` do `develop`, com contêiner `golang:1.26` |
| Scripts de recurso | `/usr/local/bin/ci-runner-governor.sh` e `/usr/local/bin/ci-job-cpu-budget.sh` |

Na VM:

```bash
sudo journalctl -u ci-scaleset -f
journalctl -t ci-disk-watch -p warning
sudo /usr/local/bin/ci-runner-drain.sh --poweroff
```

O primeiro comando mostra o log ao vivo do scale set; reiniciar o serviço é seguro, porque os jobs em curso
rodam em units próprias. O segundo lista os alertas de disco. O terceiro para o scale set, espera cada job
terminar e desliga a VM, para manutenção.

De qualquer máquina com `gh`:

```bash
gh run list --workflow ci-pr.yml --limit 5
gh run watch <run-id>
gh workflow run ci-pr.yml --ref <branch>
```

- **Mais vagas**: copiar a pasta de uma vaga sem `_work` e `_diag`, criar a unit e o drop-in `scaleset.conf`
  a partir de uma existente, acrescentar a linha em `/etc/ci-scaleset/slots` e reiniciar o serviço.
- **Redimensionar a VM**, no host: `virsh --connect qemu:///system` com `setvcpus --config` e
  `setmaxmem`/`setmem --config`, depois desligar e ligar a VM (`reboot` não aplica). O disco cresce a quente
  com `virsh blockresize`, seguido de `growpart` e `resize2fs` dentro da VM.

> [!warning] O que roda na VM não está no repositório
> O `ci-scaleset`, o piso de 16 GB por job do governador e a janela de 12 ou 8 vCPU existem só na VM. Na
> `develop`, o `scripts/ci/ci-job-cpu-budget.sh` ainda divide núcleos por jobs ocupados (de 2 a 32) com
> `CPUQuota`, o governador divide a RAM pelos jobs ocupados sem piso, e o `ci-runner-reaper.sh` e o
> `ci-runner-rotate.sh` olham `actions-runner{,-2,-3}` e podem não cobrir as 20 vagas. A versão da VM do
> `ci-runner-rotate.sh` não reinicia vaga com o `ci-scaleset` ativo, e a do `ci-runner-drain.sh` para o
> scale set antes. A topologia do `docs/architecture/ci-remote-cache.md` (runners na sumo e no EC2) está
> obsoleta. Um redeploy a partir do repositório desfaz o que roda hoje.

## Armadilhas conhecidas

Antes de diagnosticar CI vermelho, olhar as PRs mergeadas na `develop` nas últimas horas: a maior parte das
falhas sem causa aparente entrou ali.

| Sintoma | Causa | Correção |
| --- | --- | --- |
| `nx: not found`, "Could not find Nx modules" | `node_modules` corrompido com a sentinela batendo | a sentinela confere `.bin/nx`; se persistir, apagar `node_modules/.attlas-lock-hash` da vaga e rodar de novo |
| "Application bundle generation failed" sem erro | saída cortada em 64 KiB, não falta de memória | rebuildar o merge commit na VM com `--outputStyle=stream` |
| Build do `web-attlas` morrendo por heap | o compilador Angular passa de 4 GiB | o Build roda com `--max-old-space-size=8192`, e o `nx-parallel.sh` divide a RAM do job por esse heap |
| Rerun segue vermelho depois de a `develop` corrigir | o rerun reusa o merge SHA antigo | empurrar commit ou usar "Update branch" |
| PR sem checks | base não é `develop` | `gh workflow run ci-pr.yml --ref <branch>` |
| Log do job sem o resumo do Jest | o log mostra só a task que falhou e o pino pode cortar o fim | ler `$RUNNER_TEMP/nx-<target>.log` na VM enquanto o job existe |
| `pull access denied minio/*` | o MinIO saiu do Docker Hub | usar `quay.io/minio/...` |
| Timeout de pull de imagem na integração | registro AAAA sem rota IPv6 | precedência IPv4 no `gai.conf` mais `scripts/ci/prepull-test-images.sh` |
| Cache remoto devolvendo 500 | quota no bucket do MinIO | só a varredura; nunca `mc quota` |
| VM afunda e runners aparecem offline | `MemoryHigh` por job abaixo do pico de um build (5 a 6 GB): o kernel estrangula, o swap enche e o runner não fala com o GitHub a tempo | piso de 16 GB por job no governador |
| Muitos jobs na fila | vagas cheias, ou runner recusando subir com pouca RAM ou disco | `journalctl -u ci-scaleset` e a tabela de higiene acima |

Armadilhas da integração, que voltam quando ela for religada:

- **Vaga com dono morto.** Job cancelado pelo GitHub não roda o hook de conclusão; a vaga de integração é
  liberada pela morte do processo dono, não por guarda de tempo.
- **inotify.** O MediaMTX do testcontainers morria no boot por falta de instância de inotify, logo depois de
  imprimir a linha que o testcontainers usa como sinal de pronto, e a suíte rodava contra um container
  morto. O teto padrão de 128 estoura com containers vazados; daí o sysctl de 8192 e a varredura do reaper.
- **Duas integrações na mesma máquina** disputam porta e banco; o acesso é por semáforo de vagas
  (`INTEGRATION_SLOTS`).

## Pendências

| O que falta | Por que importa | Onde |
| --- | --- | --- |
| Versionar o que só existe na VM (`ci-scaleset`, governador, orçamento de CPU, provisionamento) em `scripts/ci/`, e trocar o token pessoal por um GitHub App com permissão mínima | não depende de hardware e protege o que já funciona de um redeploy | [[CI - runner profissional em Kubernetes com ARC]] |
| Painel e alerta de fila parada, runner fora do ar e serviço do scale set caído | hoje o diagnóstico é manual | [[Infraestrutura - Observabilidade#Pendências]] |
| Religar a integração | nenhuma suíte de teste é gate de merge | seção 14.5 da `CROSS-022` |
| CI em Kubernetes com o ARC (Actions Runner Controller), num cluster RKE2 só de CI, isolado porque o pod roda Docker-in-Docker privilegiado | cada job vira pod com CPU e RAM reservadas, servidor novo vira capacidade sem configuração, e a configuração inteira fica no repositório; exige cache em volume persistente por nó, confirmar que o ARC aceita os labels atuais e convive alguns dias com cache frio | [[CI - runner profissional em Kubernetes com ARC]] |
| Memória do sumo: hoje 2 de 16 slots (2 pentes DDR5 de 64 GB); seis pentes DDR5 RDIMM de 64 GB e 5600 MT/s levam a 512 GB e 8 canais em uso | o ARC só vale depois da RAM, porque com 128 GB o cluster teria menos capacidade útil que a VM; sem um segundo servidor, a queda do sumo para o CI de todos os squads | compra de hardware |
| Separar o domínio de câmera de `libs/contracts` (`camera`, `camera-analytic`, `camera-media-profile`) num projeto Nx próprio | uma PR que só muda tipo de câmera deixa de marcar os cerca de 20 consumidores de `@attlas/contracts` como afetados; exige mover os arquivos, reescrever imports no `ms-cameras` e no `web-attlas`, criar o alias e rerodar `scripts/contracts-integration-inputs.mjs` | `libs/contracts/src/lib/` |

## Glossário

| Termo | O que é |
| --- | --- |
| runner self-hosted | máquina própria que executa os jobs do GitHub Actions, em vez da máquina do GitHub |
| runner scale set | conjunto de runners efêmeros que o GitHub entrega por fila; cada runner pega um job e some |
| label `heavy` | etiqueta que os jobs pesados pedem no `runs-on`; só a VM do CI a tem |
| affected | projetos que o Nx considera tocados pelo diff entre a base e o commit |
| sentinela | arquivo com o hash do `package-lock.json` instalado; diferente do atual, o setup roda `npm ci` |
| ILM | regra do MinIO que apaga objeto pela idade |
| Ryuk | container do testcontainers que remove os containers de teste quando o processo dono morre |
| governador | `ci-runner-governor.sh`, que ajusta CPU e RAM de cada runner pelo cgroup a cada minuto |
| ARC | Actions Runner Controller, operador que roda os runners do GitHub como pods no Kubernetes |
