---
tags:
  - doc
  - infraestrutura
  - orbit
  - kubernetes
  - argocd
aliases:
  - "Infraestrutura - Orbit"
  - "Infraestrutura - Orbit CD"
  - "Orbit"
  - "Orbit One"
  - "Atman Platform"
  - "Como usar a Atman Platform"
  - "Deploy em servidor remoto"
  - "Infraestrutura - Atman Platform - Plano e bootstrap"
  - "Plano de deploy em Kubernetes"
  - "Argo CD"
atualizado: 2026-10-14
banner: "assets/banners/servers.jpg"
banner_y: 0.3
---

# Infraestrutura - Orbit

Volta para [[Infraestrutura]].

## Resumo

| Pergunta | Resposta |
| --- | --- |
| O que é | Plataforma de entrega da Atman (produto Orbit One). Leva cada versão do Attlas do commit ao ambiente por GitOps sobre o Argo CD. Servidor Node sem dependências e tela de página única, no repositório `atmanadmin/orbit` |
| Onde roda | No hub dev: containers `orbit` (porta 8090) e `orbit-gitops` (git daemon), mais o cluster kind `attlas` com o Argo CD. Máquina em [[Infraestrutura - Servidores e rede]] |
| Endereço | `https://orbit.3-15-199-101.sslip.io` (público, login próprio) e `http://100.101.165.32:8090` pela tailnet |
| Fonte da verdade | O repositório GitOps. Toda ação da tela (deploy, rollback, ligar CD, criar ambiente) é um commit, e o Argo CD aplica |
| CD | Automático no ambiente `dev`: o Orbit registra a release de cada run verde do `ci-develop` e a aplica em ondas. Fluxo completo em [[Infraestrutura - CI-CD de ponta a ponta]] |
| Clusters | `attlas` (kind do hub, ambiente `dev`) e `sumo` (RKE2 de nó único, ainda sem ambiente) |
| Documentação de uso | Dentro da tela, menu Documentação, e no README do repositório `orbit` |

Esta nota explica como o Orbit se encaixa na infraestrutura. Passo a passo de tela e referência de variáveis ficam no README e na documentação da própria tela, para não existirem em dois lugares.

## As cinco peças

```widget
src: _widgets/diagrams/infra-orbit-conceitos.html
```

Template define a receita, cluster define o destino, ambiente junta os dois, release é a versão de um serviço e deploy aplica uma release num ambiente.

| Template | Escala | Máquina de destino | Deploy |
| --- | --- | --- | --- |
| `dev` | 1 pod por serviço, sem autoescalador | 1 nó, 8 vCPU, 31 GB | automático |
| `prod` | autoescalador de 2 a 3 pods por serviço, alvo de 70% de CPU, descida em janela de 5 min, PodDisruptionBudget | 3 nós, 16 vCPU e 32 GB cada, 1 nó de folga | configurável |
| `compose` | Docker Compose em servidor único, sem Kubernetes; o Orbit aplica por SSH | o servidor | manual |

O modo de deploy (automático ou manual) é um interruptor no template, no ambiente e no serviço; o do ambiente vale para o ambiente inteiro. Bancos, Redis, Kafka, MinIO e Kong não escalam: ficam no chart `atman-infra` com réplica fixa, e os conectores com TCP de hardware e o `ms-reports-worker` não usam autoescalador.

## Onde vive cada coisa

| O quê | Onde |
| --- | --- |
| Tela e API | container `orbit`, código em `~/orbit/console` montado em `/app` |
| Estado e segredos | `~/orbit/state/secrets` montado em `/secrets`: senhas, tokens, usuários, pacotes de seeds, notificações, histórico de autocorreção. Nunca no Git |
| Repositório GitOps | bare em `~/orbit/state/gitops/attlas-gitops.git`, servido pelo `orbit-gitops`; cópia versionada em `gitops/attlas/` do repositório `orbit`, que também é a semente de um hub novo |
| Argo CD | namespace `argocd` do kind, NodePort 30080; o Orbit usa pelo IP do nó |
| Ingress do dev | `orbit-ingress` (socat e Caddy) e nginx do host; ver [[Infraestrutura - Ambientes#Caminho de uma requisição]] |
| Vigia | cron do host, a cada minuto: reinicia o `orbit` se `/healthz` falhar 3 vezes seguidas |
| Código dos scripts do hub | `~/orbit/local` (`up.sh`, ApplicationSets, RBAC, DNAT de vídeo, backup) e `~/orbit/remote` (servidores próprios) |

> [!warning] Caminho do estado
> O README e as páginas do menu Documentação (`hub-ec2`, `conceitos`) ainda citam `~/atman-platform`, os containers `atman-platform` e `atman-gitops` e o Attlas em Docker Compose no mesmo host. O hub usa `~/orbit/state` e os containers `orbit` e `orbit-gitops`, e o compose do dev não existe mais.

## Telas

| Grupo | Telas |
| --- | --- |
| Raiz | Visão geral: indicadores e a esteira do último commit |
| Entrega | Pipelines (GitHub Actions), Releases (deploy e rollback), Versões (conjunto de releases do projeto, gerado a partir de um ambiente) |
| Observabilidade | Órbita (canvas dos serviços com requisições por segundo e latência p95), Monitoramento (ambiente inteiro) |
| Infraestrutura | Ambientes: lista e mapa, com clusters, servidores, nós e acesso (kubectl, SSH e terminal no navegador) |
| Administração | Templates (com Seeds), Usuários e acesso, Configurações, Documentação |

## Entrega e autocorreção

| Mecanismo | Comportamento | Controle |
| --- | --- | --- |
| Release | A cada 2 min o Orbit lê os runs verdes do `ci-develop`, confere a tag no Docker Hub e grava a versão semver em `catalog/<serviço>.yaml`. `feat` sobe a minor, `!` ou `BREAKING CHANGE` sobem a major, o resto sobe a patch | `CI_WORKFLOW` (`ci-develop.yml`) |
| CD em ondas | Ambiente com deploy automático recebe 4 serviços por commit. A onda seguinte espera Synced e Healthy no Argo CD por até 10 min. Um rollout por ambiente, 15 min mínimos entre rollouts, `web-attlas` por último | `CD_WAVE_SIZE`, `CD_WAVE_TIMEOUT_MS`, `CD_MIN_INTERVAL_MS`, `CI_TRACK_ENVS` (`dev`) |
| Autocorreção de OOM | Container com OOMKilled recebe limite de memória 1,5 vez maior, até o teto, num commit `autofix(<env>)`. No teto, só notifica. No máximo um ajuste a cada 30 min por serviço | `AUTO_REMEDIATION` (`on`), `AUTO_REMEDIATION_MEMORY_CAP` (`1Gi`) |
| Autocorreção de crash loop | Serviço que o deploy automático subiu e que entra em CrashLoopBackOff na release nova volta para a release anterior, uma vez por release | mesma chave |

O OOM edita `profile.resources.<serviço>` em `templates/dev/values.yaml` quando o serviço está lá, e isso vale para todo ambiente que lê o template. O `up.sh` não repassa as variáveis `CD_*` nem `AUTO_REMEDIATION*` ao container, então valem os padrões da tabela.

Servidor, runner e notificações:

| Assunto | Comportamento |
| --- | --- |
| Runner de CI | O Orbit guarda o token do GitHub, grava na VM `ci-runner` por SSH e vigia os serviços `ci-scaleset` e `ci-scaleset-develop`. Operação do runner em [[Infraestrutura - CI e runners]] |
| Notificações | Geradas no servidor (saúde, reinício, OOM, erro novo nos logs, CI, deploy, autocorreção, segurança). Mesma ocorrência em 30 min vira uma linha com contador |
| Observabilidade | Sem Prometheus, Loki ou Grafana no hub: lê metrics-server, API do Kubernetes, Argo CD, `/metrics` do Kong e kafka-exporter. Erros dos logs ficam 24 h em memória |
| Acesso | Login individual por usuário, papéis Administrador, Desenvolvedor e Somente leitura, sessão de 12 h com 2 h de inatividade, auditoria em Configurações, Segurança |

## Servidor novo

```widget
src: _widgets/diagrams/infra-orbit-servidor-remoto.html
```

Adicionar servidor pede só o nome e o `usuário@endereço`. O servidor precisa de SSH, de um usuário com sudo (sem senha, ou com a senha informada uma única vez) e de rede até o hub; a regra de rede é: se do hub funcionam `ssh <usuário>@<servidor>` e `curl -k https://<servidor>:6443/version`, o Orbit funciona. Depois de subir uma VPN no hub, o encaminhamento do kind precisa ser liberado com `remote/routing/hub-vpn-routing.sh install`. Para ampliar um cluster RKE2 ou k3s, Adicionar nó instala o agente na mesma versão do cluster; o kind do hub não aceita nós depois de criado.

## Dados de um ambiente novo

Escolhidos no assistente Novo ambiente, na etapa Dados. O template define o pacote padrão.

| Opção | O que acontece | Limite |
| --- | --- | --- |
| Pacote de seeds | Bancos novos, migrations, depois o `.sql` de cada serviço do pacote (modo substituir, com backup) e a senha do master | só no cluster do hub |
| Copiar de outro ambiente | Job copia cada banco do ambiente de referência (`pg_dump` e `psql`) | só no mesmo cluster |
| Bancos vazios | Só migrations, sem usuário | nenhum |

| Pacote | Template | Conteúdo |
| --- | --- | --- |
| `dev` | `dev` | Configuração e cadastros do dev, com nomes e e-mails reais |
| `prod` | `prod` | Bootstrap de produção gerado pelos `seed.ts` dos serviços: organização, usuário master, módulos, licença padrão, provedores, templates de notificação, fabricantes. Sem demonstração |

> [!warning] Seeds contêm nomes e e-mails reais
> Os pacotes ficam só em `~/orbit/state/secrets/seeds/` no hub, nunca no Git. Os Secrets `<serviço>-env` de um namespace novo vêm de `local/env-secrets.sh <namespace> <pasta>` no hub; sintoma de falta: CrashLoop com `validateEnv ... should not be empty`.

## Recuperação do hub

O repositório `orbit` mais o backup dos segredos recriam o hub. O backup (`local/hub-backup.sh`) fica só na máquina de quem opera, fora do repositório; o estado do GitOps sai de `local/gitops-export.sh`, que sobrescreve `gitops/attlas/` com o `main` do hub. O passo a passo está em Documentação, Recuperar o hub.

## Pendências

| O que falta | Por que importa | Onde |
| --- | --- | --- |
| Alinhar README e páginas em tela ao hub atual (`~/orbit/state`, nomes dos containers, compose do dev inexistente) | quem seguir o texto procura pastas e containers que não existem | repositório `orbit` |
| `COMPOSE_DIR` do `local/hubs/ec2-dev.env` aponta para `/home/ubuntu/atman-platform/secrets/compose-env` | `local/env-secrets.sh` e o `up.sh` usam a pasta antiga | repositório `orbit`, host |
| Orbit ler a carga do host e reduzir a onda, pausar o CD e pausar os simuladores `asc-*` quando o load satura | o load do host chegou a 117 em 8 vCPU durante rollout | Orbit |
| Limites de memória por VPA em modo recomendação, com commit semanal dos limites | hoje só o OOM corrige, depois da falha | Orbit |
| Cluster `sumo` sem ambiente | o RKE2 consome capacidade do host sem entregar nada | [[Infraestrutura - Servidores e rede#Máquinas]] |

## Glossário

| Termo | O que é |
| --- | --- |
| GitOps | o estado desejado mora no Git e uma ferramenta o aplica; aqui o Argo CD |
| ApplicationSet | recurso do Argo CD que gera um aplicativo por ambiente e serviço a partir dos arquivos do Git |
| Synced e Healthy | o cluster bate com o Git e os pods estão prontos, segundo o Argo CD |
| HPA | autoescalador que muda o número de pods pela CPU |
| PDB | PodDisruptionBudget, garante um mínimo de pods de pé durante manutenção |
| OOMKilled | container encerrado por estourar o limite de memória |
| kind | Kubernetes dentro de containers Docker, usado como cluster do hub |
