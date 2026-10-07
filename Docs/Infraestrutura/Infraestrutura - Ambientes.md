---
tags:
  - doc
  - infra
  - ambientes
aliases:
  - "Ambiente de validação - Dell"
  - "Registro - deriva do env do dev.v2 e deploy quebrado em 26 de setembro"
  - "Deriva do env do dev.v2"
  - "Deploy do dev.v2 quebrado por env"
  - "Ambientes - dev.v2, Dell e sumo"
  - "Infraestrutura - Ambientes"
atualizado: 2026-10-07
---

# Infraestrutura - Ambientes

Volta para [[Infraestrutura]].

## Resumo

| Ambiente | O que é | Acesso |
| --- | --- | --- |
| **dev.v2** (`https://dev.v2.attlas.atmansystems.com`) | EC2 `t3a.2xlarge` (`i-06e8f8cf75102367e`, `us-east-2c`), 8 vCPU e 32 GiB, crédito de CPU em `unlimited`; a stack Compose inteira roda em `~`, atrás de um nginx do host | `ssh aws-attlas-26`, ou o host `aws-attlas-dev-v2` na tailnet |
| **Dell** | máquina de dev do dono, 12 vCPU e 15 GiB; backend em Docker, front em `nx serve` | Tailscale SSH; Kong em `:8000` |
| **sumo** (`10.1.1.115`) | servidor físico de gestão: 112 threads, 128 GB de RAM em 2 de 16 slots, cerca de 1,8 TB de disco; hospeda a VM do CI, o cache remoto do Nx, a stack legada do Attlas 25 e as VMs `attlas-vm-1..7` | `ssh sumo`, só pela tailnet |

Nenhum cluster Kubernetes de aplicação está no ar: a aplicação roda em Docker Compose. Cluster, chart Helm,
Terraform e KEDA ficam no repositório `Developer/kubernetes` e na skill `attlas-kubernetes`. Usuários, chaves
e comandos de entrada estão em [[Infraestrutura - Acessos SSH]]; o CI, em [[Infraestrutura - CI e runners]].

## Rede

A tailnet certa é a `atmansystems.com`; as tailnets pessoais não têm rota para a rede da Atman. A LAN
`10.1.1.0/24` (sumo, câmeras e VMs) é roteada pelo nó `aquario-server` da tailnet, que é ponto único de
falha: quando ele cai, tudo em `10.1.1.x` some de uma vez.

O cliente precisa subir o Tailscale com `--accept-routes`. Sem a flag, a rota aparece no
`tailscale status --json`, mas não entra na tabela de roteamento da máquina.

```bash
sudo tailscale up --accept-routes
tailscale ping 100.77.100.21
```

O `tailscale ping` mede o `aquario-server`. Sem resposta, o problema é o roteador da LAN, não o destino.

## Deploy do dev.v2

O deploy é o `.github/workflows/deploy.yml`, disparado só à mão (`workflow_dispatch`). Cada deploy recria os
serviços com imagem nova, e as conexões de stream e WebSocket que passam por eles caem por 2 a 4 min; por
isso não há deploy agendado. A ordem é o Build & Push da `develop` verde (imagens `:dev` no Docker Hub
`atmanadmin`) e depois o deploy:

```bash
gh run list --workflow ci-develop.yml --limit 3
gh workflow run deploy.yml
gh workflow run deploy.yml -f projects=ms-cameras,web-attlas
```

O input `projects` recebe nomes de serviço do compose separados por vírgula; vazio, entram todos os
serviços com código. O job roda no runner `heavy` da VM do CI, um deploy por vez (grupo de concorrência
`deploy`, sem cancelar o que está em curso), e entra no host definido pelo secret `DEPLOY_HOST`.

1. **Escolha dos serviços.** O job lê do `docker-compose.yml` os pares `<serviço do compose>:<app>`; o
   `ms-reports-worker` usa a imagem do `ms-reports`. Sem input, só entra app com mais de 10 arquivos `.ts`
   em `src`, o que deixa os esqueletos de fora sem lista manual.
2. **Uma conexão SSH só, multiplexada** (`ControlMaster`). Cinco ou mais handshakes em poucos segundos
   bloqueiam a porta 22 daquele IP de origem por cerca de 2 min. A conexão tem até 3 tentativas, com 90 s
   de espera entre elas.
3. **Pacote.** Vai um tarball com `docker-compose.yml`, `docker/`, `scripts/ci/deploy-env-keys-check.sh` e
   o `.env.example` de cada app implantado. No host: `docker login` (credenciais por stdin) e conferência
   de cada imagem no registry; serviço sem imagem `:dev` é pulado.
4. **Conferência das chaves, antes de qualquer pull.** O `deploy-env-keys-check.sh` recusa o deploy, com a
   stack intacta, quando o `.env.docker` de um serviço não tem uma chave que o `.env.example` declara. Conta
   como presente a chave atribuída no `env_file`, mesmo vazia, e a que o bloco `environment:` do serviço
   fixa no compose. Chave comentada no exemplo é opcional. Só nomes de chave vão para o log, nunca valores.
5. **Subida.** `docker compose pull <serviços>`, `up -d --no-recreate`, `docker compose run --rm
   minio-init` (cria bucket novo; nenhum serviço cria o próprio) e `up -d <serviços>`.
6. **MediaMTX e Kong.** O MediaMTX é recriado só quando muda o hash de `docker/mediamtx.yml` mais a tag da
   imagem, e o `ms-cameras` é reiniciado junto, porque reiniciar o MediaMTX apaga os paths `analytic-*` que
   o `ms-cameras` cria pela API dele. O Kong é recriado só quando muda o hash de `docker/kong.yml`, porque
   reiniciá-lo derruba todo WebSocket e SSE. As sentinelas ficam em `~/.attlas-deploy/` no host; a do Kong
   só é gravada depois do smoke, para um `kong.yml` que não sobe ser tentado de novo no próximo deploy.
7. **Fim.** `kafka-init`, 30 s de espera e smoke pelo status de cada serviço mais o Kong (`ps -a`, então
   container que morreu no boot conta como falha, com as últimas 40 linhas de log no job). Depois,
   `image prune` das imagens sem tag e das sem uso há mais de 72 h.

O Kong acha o IP novo de um serviço recriado por `KONG_DNS_VALID_TTL=10` e comprime `application/json`
acima de 1 KB (`KONG_NGINX_PROXY_GZIP*` no `docker-compose.yml`), porque o nginx do host só comprime
`text/html`. O `text/event-stream` fica fora da compressão de propósito.

## Deploy direto de imagem

Para hotfix sem passar pelo registry, a imagem construída numa máquina vai direto para o host:

```bash
docker save atmanadmin/attlas-<svc>:dev | gzip -1 | ssh aws-attlas-26 'gunzip | docker load'
ssh aws-attlas-26 'docker compose --profile full up -d --no-deps --force-recreate <svc>'
```

Sem `pull` depois: o `pull` traria de volta a imagem do registry.

## O .env.docker do host

O `.env.docker` de cada serviço vive só no host (`~/apps/<ms>/.env.docker`, no dev.v2) e o deploy não o
sincroniza; a cada variável nova ele fica para trás do `.env.example`. As URLs internas estão fixadas nos
blocos `environment:` do compose, que vencem o `env_file`. O arquivo segue o formato do `.env.example`
(seções fixas, regra em `docs/architecture/env-vars.md`), e chave que só existe naquele ambiente fica numa
seção final `# Só deste ambiente`. Para que serve cada variável está em `apps/<ms>/docs/ENV.md`.

Quando a conferência recusar o deploy, acrescentar cada chave nomeada no `.env.docker` do host, com o valor
do ambiente, e rodar o deploy de novo. Para comparar à mão:

```bash
diff <(grep -oE '^[A-Z0-9_]+' ~/apps/<ms>/.env.docker | sort) \
     <(grep -oE '^[A-Z0-9_]+' <repo>/apps/<ms>/.env.example | sort)
```

Linha só à esquerda é chave que só o host tem; linha só à direita é chave que falta no host.

Na Dell vale o mesmo: o `.env.docker` local também defasa. O `npm run setup:env` reescreve as chaves que ele
gerencia (host, porta, URL e segredos) e preserva as outras; para o resto, completar só as chaves que faltam
a partir do `.env.example`. Um `ANALYTICS_STREAM_BROKERS` do `ms-cameras` apontando para outro broker que
não o que a câmera de bancada publica faz o pisca da região parar sem erro nenhum.

## dev.v2

| O quê | Onde |
| --- | --- |
| Stack | `docker-compose.yml` em `~`, com os serviços no profile `full` |
| `.env.docker` de cada serviço | `~/apps/<ms>/.env.docker` |
| Sentinelas do deploy | `~/.attlas-deploy/` |
| nginx do host, configurado à mão (`http2 on`) | `/etc/nginx/sites-available/attlas` |
| Tuning de rede (BBR e `tcp_slow_start_after_idle = 0`) | `/etc/sysctl.d/99-attlas-edge.conf` e `/etc/modules-load.d/attlas-bbr.conf` |
| Simuladores de controlador, fora do repositório | `/home/ubuntu/simulador-docker/` (custo em [[Infraestrutura - Runbook - Desempenho do dev.v2]]) |

Lentidão do dev.v2 nunca é crédito de CPU: a instância está em `unlimited`, então a CPU não é estrangulada e
steal alto não é crédito esgotado; o excedente acima de 40% por vCPU vira custo, cerca de US$ 40 por mês. O
`unlimited` vale só para CPU; a rede tem crédito próprio. Onde o tempo vai e como medir:
[[Infraestrutura - Runbook - Desempenho do dev.v2]].

## Dell

- Gateway Kong em `http://afonso-dell-14-dc14250.tail4b16e5.ts.net:8000` (rotas `/api/*`). Usar o hostname
  MagicDNS, não o IP da tailnet, que muda.
- Pelo Mac: `ATTLAS_API=<gateway>` em `apps/web-attlas/.env`. O `apps/web-attlas/proxy.conf.mjs` lê a
  variável, sem mudar código.
- O arranjo preferido é backend em Docker e front em dev. Os sete serviços em `nx serve` mais o front
  esgotam os 15 GiB. Um serviço por vez, o `ms-organization` primeiro para o login voltar logo:

  ```bash
  npx nx run <ms>:build
  DOCKER_BUILDKIT=1 docker build -f apps/<ms>/Dockerfile --secret id=npmrc,src=.npmrc \
    --build-arg DIST_PATH=dist/apps/<ms> -t atmanadmin/attlas-<ms>:dev .
  docker compose -f docker-compose.yml up -d --no-deps <ms>
  ```

- Os sete serviços são `ms-organization`, `ms-cameras`, `ms-traffic-model`, `ms-controllers`,
  `ms-notifications`, `ms-detector-history` e `ms-video-analytics`. O Kong não precisa ser recriado: o
  `docker-compose.override.yml` aponta cada um para o `host-gateway`, nas mesmas portas do `nx serve`, e o
  container publica essas portas no host.
- O front sobe com `npm run serve web-attlas`, que tem teto de 6 GB no Node e `GOMEMLIMIT` de 3 GiB no
  esbuild. O Tailwind varre só `apps/web-attlas/src` e `apps/web-attlas/libs`.
- O `npm run docker:up` completo (cerca de 57 containers) não cabe na Dell. Monitorar a memória antes e
  durante a subida.
- Quem sobe e derruba serviço e front é o dono. Validação de PR é com a PR rodando, não só CI ou leitura do
  diff; o merge é decisão dele.

## sumo

- A stack legada do Attlas 25 (tags `:production`) roda direto no host; `docker ps` no host mostra só
  ela. No mesmo host ficam a VM `ci-runner` e o cache remoto do Nx (`~/nx-cache`, MinIO em `:8388`).
- As VMs `attlas-vm-1..7` ficam em bridge `br0` na LAN, de `10.1.1.120` a `10.1.1.125` e `10.1.1.127`, com
  VIP do kube-vip em `10.1.1.126`. A `attlas-vm-7` foi criada fora do Terraform.
- O `virsh` do host só enxerga as VMs com `--connect qemu:///system`.

> [!warning] `terraform apply` em `~/iac/attlas-vms` destrói as VMs
> O state do Terraform ainda registra as VMs na NAT `default`, não na bridge `br0`, e o `apply` forçaria a
> substituição de cada uma. Não rodar até reconciliar o state.

## Armadilhas conhecidas

| Sintoma | Causa | Correção |
| --- | --- | --- |
| Deploy recusado antes do pull, com lista de chaves | `.env.docker` do host sem chave nova do `.env.example` | acrescentar no host e rodar o deploy de novo |
| Serviço `Exited (1)` no smoke | variável que o boot exige e o `.env.example` não declara | `docker compose logs --tail 200 <svc>`, acrescentar no host e recriar |
| Kong 503 "name resolution failed" | container upstream ausente: tópico Kafka faltando, Prisma P3018 ou env faltando | achar por que o container caiu; não reiniciar o Kong às cegas |
| `ms-cameras` 502 por 4 a 5 min depois do deploy | janela de boot | esperar; não reiniciar |
| `Exited (1)` com P3018 ou 23505 no log | o boot roda `prisma migrate deploy` e um índice único novo bate em duplicata antiga; `CONCURRENTLY` deixa o índice `INVALID`, e o retry passa sem unicidade | achar duplicatas com `GROUP BY ... HAVING count(*) > 1`, soft-delete das sobras (mantendo ids), `DROP INDEX CONCURRENTLY IF EXISTS`, marcar a migration como rolled back em `_prisma_migrations`, `docker start` e conferir `indisvalid`. Antes de índice único novo, rodar o `GROUP BY` em todo ambiente |
| SSH na porta 22 do EC2 dá timeout | bloqueio da porta para o IP de origem depois de muitos handshakes | entrar pela tailnet com `-o ControlMaster=no` |
| SSE mudo através da borda | o nginx do host segura blocos TLS de 16 KiB e o Kong esconde `X-Accel-*` | rota SSE nova no `docker/kong.yml` usa a âncora `*sse-edge-unbuffered-plugin` (`X-Accel-Buffering: no`) |
| WebRTC ou UDP público morto depois de atualizar o Tailscale | o Tailscale removeu o jump do Docker na cadeia `FORWARD` | `iptables -A FORWARD -o br-<id> -j DOCKER`, persistido em `fix-docker-forward.service` |
| Porta publicada pelo Docker aberta apesar do `ufw` | porta publicada pelo Docker não passa pela cadeia `INPUT` do host | restringir no security group da nuvem, na cadeia `DOCKER-USER` ou no bind por IP; vale para a `17000` do socket de placas da Neural Labs |
| VM em bridge pinga o host mas não sai | o Docker liga `bridge-nf-call-iptables` com `FORWARD` em DROP | `iptables -I DOCKER-USER -i br0 -o br0 -j ACCEPT`, persistido em `br0-forward-accept.service` no sumo |
| Serviço com config velha depois de mudar compose ou env | container não recriado | `docker compose up -d --force-recreate <svc>` |
| Consumidor Kafka nunca sobe | tópico faltando | `docker compose run --rm kafka-init`; a lista `docker/kafka-topics.list` sai do `KafkaTopicRegistry` por `npm run generate:kafka-topics` |
| `redis-cli monitor` esquecido continua rodando | a sessão aberta por `docker exec` não morre quando o cliente sai, nem com `timeout` por fora | usar `redis-cli --latency`, ou `MONITOR` com `timeout` de dentro do container |
| Processo que devia sobreviver cai junto com o script | script em segundo plano que inicia serves e é interrompido derruba os filhos, mesmo com `setsid nohup` | subir o processo desacoplado do script |

## Glossário

| Termo | O que é |
| --- | --- |
| `aquario-server` | nó da tailnet que anuncia a rota para a LAN `10.1.1.0/24` |
| sentinela | arquivo com o hash da última config aplicada; o deploy compara para decidir se recria o serviço |
| smoke | conferência rápida, depois da subida, de que cada container está `Up` |
| crédito `unlimited` | modo da instância `t3a` da AWS em que a CPU acima da linha de base não é cortada, só cobrada |
| `host-gateway` | nome que o Docker resolve para o IP do host, usado para o container alcançar um processo fora dele |
| P3018, 23505 | erro do Prisma de migration que falhou e erro do Postgres de valor duplicado em índice único |
