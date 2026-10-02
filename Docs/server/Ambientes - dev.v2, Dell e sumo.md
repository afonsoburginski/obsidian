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
atualizado: 2026-10-01
---

# Ambientes - dev.v2, Dell e sumo

Onde o Attlas 26 roda fora do CI, como o código chega lá e o que costuma quebrar. Nenhum cluster
Kubernetes de aplicação está no ar: a aplicação roda em Docker Compose. Cluster, chart Helm, Terraform e
KEDA vivem no repositório `Developer/kubernetes` e no skill `attlas-kubernetes`. Usuários, chaves e
comandos de entrada estão em [[Acessos SSH - Infra Attlas]]; o CI, em [[CI - Arquitetura e runners]].

## Mapa

| Ambiente | O que é | Acesso |
| --- | --- | --- |
| **dev.v2** (`https://dev.v2.attlas.atmansystems.com`) | EC2 `t3a.2xlarge` (`i-06e8f8cf75102367e`, `us-east-2c`), 8 vCPU e 32 GiB, crédito de CPU em `unlimited`. Stack Compose inteira em `~`, atrás de um nginx do host configurado à mão em `/etc/nginx/sites-available/attlas` (`http2 on`) | `ssh aws-attlas-26` pelo IP público, ou o host `aws-attlas-dev-v2` na tailnet |
| **Dell** | máquina de execução de dev do dono, 12 vCPU e 15 GiB; backend em Docker, front em `nx serve` | Tailscale SSH; Kong em `:8000` |
| **sumo** (`10.1.1.115`) | servidor físico de gestão: 112 threads, 128 GB de RAM em 2 de 16 slots, cerca de 1,8 TB de disco. Hospeda a VM do CI, o cache remoto do Nx, a stack legada do Attlas 25 (tags `:production`) e as VMs `attlas-vm-1..7` | `ssh sumo`, só pela tailnet |

## Rede

- A tailnet certa é a **`atmansystems.com`**; as tailnets pessoais não têm rota para a rede da Atman.
- A LAN `10.1.1.0/24` (sumo, câmeras, VMs) é roteada pelo subnet router **`aquario-server`**. Ele é ponto
  único de falha: quando cai, tudo em `10.1.1.x` some de uma vez. Primeira conferência:
  `tailscale ping 100.77.100.21`. O cliente precisa de `tailscale up --accept-routes`; sem a flag a rota
  aparece no `tailscale status --json`, mas não entra na tabela de roteamento.

## Deploy

`.github/workflows/deploy.yml`, só por `workflow_dispatch`: cada deploy recria serviços e derruba todo
stream e WebSocket por 2 a 4 min, então não há agendamento. Ordem: Build & Push da `develop` verde
(imagens `:dev` no Docker Hub `atmanadmin`), depois `gh workflow run deploy.yml [-f projects=...]`.

1. O job escolhe os serviços: pares `<serviço do compose>:<app>` lidos do `docker-compose.yml` (o
   `ms-reports-worker` usa a imagem do `ms-reports`), e só entra app com mais de 10 arquivos `.ts` em
   `src`, o que deixa os esqueletos de fora sem lista manual.
2. **Uma conexão SSH só, multiplexada** (`ControlMaster`). Cinco ou mais handshakes em poucos segundos
   bloqueiam a porta 22 daquele IP de origem por cerca de 2 min.
3. Vai um tarball com `docker-compose.yml`, `docker/`, `scripts/ci/deploy-env-keys-check.sh` e o
   `.env.example` de cada app. No host: `docker login`, conferência da imagem no registry e
   **`deploy-env-keys-check.sh` antes de qualquer pull**: o deploy é recusado, com a stack intacta, se o
   `.env.docker` de um serviço não tem uma chave que o `.env.example` declara (chave comentada no exemplo é
   opcional). Só nomes de chave vão para o log, nunca valores.
4. `pull`, `up -d --no-recreate`, `docker compose run --rm minio-init` (cria bucket novo), `up -d` dos
   serviços.
5. **MediaMTX** é recriado, e o `ms-cameras` reiniciado junto, só quando muda o hash de
   `docker/mediamtx.yml` mais a tag da imagem. **Kong** é recriado só quando muda o hash de
   `docker/kong.yml`, porque reiniciá-lo derruba todo WebSocket e SSE. As sentinelas ficam em
   `~/.attlas-deploy/`; a do Kong só é gravada depois do smoke.
6. `kafka-init`, smoke por status de cada serviço (`ps -a`, então container que morreu no boot conta como
   falha) e `image prune` do que tem mais de 72 h.

O Kong acha o IP novo de serviço recriado por `KONG_DNS_VALID_TTL=10` e comprime `application/json`
(`KONG_NGINX_PROXY_GZIP*` no compose), porque o nginx do host só comprime `text/html`; `text/event-stream`
fica fora da compressão de propósito.

**Deploy direto de imagem** (hotfix sem registry):
`docker save atmanadmin/attlas-<svc>:dev | gzip -1 | ssh aws-attlas-26 'gunzip | docker load'`, depois
`docker compose --profile full up -d --no-deps --force-recreate <svc>`, sem `pull`.

## O .env.docker do host

O `.env.docker` de cada serviço vive só no host (`~/apps/<ms>/.env.docker`, no dev.v2) e o deploy não o
sincroniza; a cada variável nova ele fica para trás do `.env.example`. As URLs internas estão fixadas nos
blocos `environment:` do compose, que vencem o `env_file`. Quando o check recusar o deploy: acrescentar a
chave no host e recriar o serviço. Para comparar à mão:

```bash
diff <(grep -oE '^[A-Z0-9_]+' ~/apps/<ms>/.env.docker | sort) \
     <(grep -oE '^[A-Z0-9_]+' <repo>/apps/<ms>/.env.example | sort)
```

Na Dell vale o mesmo: o `.env.docker` local defasa, e o `npm run setup:env` também reescreve host e URL do
`.env`. Completar só as chaves que faltam, a partir do `.env.example`. Um `ANALYTICS_STREAM_BROKERS` do
`ms-cameras` apontando para outro broker que não o que a câmera de bancada publica faz o pisca da região
parar sem erro nenhum.

## Dell

- Gateway Kong em `http://afonso-dell-14-dc14250.tail4b16e5.ts.net:8000` (rotas `/api/*`). Usar o hostname
  MagicDNS, não o IP da tailnet, que muda.
- Pelo Mac: `ATTLAS_API=<gateway>` em `apps/web-attlas/.env`; o `apps/web-attlas/proxy.conf.mjs` lê a
  variável, sem mudar código.
- **Arranjo preferido**: backend em Docker e front em dev. Os sete serviços em `nx serve` mais o front
  esgotam os 15 GiB. Um serviço por vez, o `ms-organization` primeiro para o login voltar logo:

  ```bash
  npx nx run <ms>:build
  DOCKER_BUILDKIT=1 docker build -f apps/<ms>/Dockerfile --secret id=npmrc,src=.npmrc \
    --build-arg DIST_PATH=dist/apps/<ms> -t atmanadmin/attlas-<ms>:dev .
  docker compose -f docker-compose.yml up -d --no-deps <ms>
  ```

  Os sete: `ms-organization`, `ms-cameras`, `ms-traffic-model`, `ms-controllers`, `ms-notifications`,
  `ms-detector-history` e `ms-video-analytics`. O Kong não precisa ser recriado: o override aponta cada
  um para o `host-gateway`, nas mesmas portas do `nx serve`. O front sobe com `npm run serve web-attlas`,
  que tem teto de 6 GB no Node e `GOMEMLIMIT` de 3 GiB no esbuild; o Tailwind varre só
  `apps/web-attlas/src` e `apps/web-attlas/libs`.
- `docker:up` completo (cerca de 57 containers) não cabe na Dell. Monitorar memória antes e durante a
  subida.
- Quem sobe e derruba serviço e front é o dono. Validação de PR é com a PR rodando, não só CI ou leitura
  do diff; merge é decisão dele.

## sumo

- Stack legada do Attlas 25 direto no host (`docker ps` do host mostra só ela), VM `ci-runner` e cache
  remoto do Nx (`~/nx-cache`, MinIO em `:8388`).
- VMs `attlas-vm-1..7` em bridge `br0` na LAN, `10.1.1.120` a `10.1.1.125` e `10.1.1.127`, com VIP
  kube-vip em `10.1.1.126`. A `attlas-vm-7` foi criada fora do Terraform.
- `virsh` no host só enxerga as VMs com `--connect qemu:///system`.

## Armadilhas conhecidas

| Sintoma | Causa | Correção |
| --- | --- | --- |
| Deploy recusado antes do pull, com lista de chaves | `.env.docker` do host sem chave nova do `.env.example` | acrescentar no host e rodar o deploy de novo |
| Serviço `Exited (1)` no smoke | variável que o boot exige e o check não pegou (definida só no código) | `docker compose logs --tail 200 <svc>`, acrescentar no host, recriar |
| Kong 503 "name resolution failed" | container upstream ausente: tópico Kafka faltando, Prisma P3018, env faltando | achar por que o container caiu; não reiniciar o Kong às cegas |
| `ms-cameras` 502 por 4 a 5 min depois do deploy | janela de boot | esperar; não reiniciar |
| `Exited (1)` com P3018 ou 23505 no log | o boot roda `prisma migrate deploy` e um índice único novo bate em duplicata antiga; `CONCURRENTLY` deixa o índice `INVALID`, e o retry "passa" sem unicidade | achar duplicatas com `GROUP BY ... HAVING count(*) > 1`, soft-delete das sobras (mantendo ids), `DROP INDEX CONCURRENTLY IF EXISTS`, marcar a migration como rolled back em `_prisma_migrations`, `docker start` e conferir `indisvalid`. Antes de índice único novo, rodar o `GROUP BY` em todo ambiente |
| SSH na porta 22 do EC2 dá timeout | rate limit no IP público | entrar pela tailnet com `-o ControlMaster=no` |
| SSE mudo através da borda | o nginx do host segura blocos TLS de 16 KiB e o Kong esconde `X-Accel-*` | rota SSE nova no `docker/kong.yml` usa a âncora `*sse-edge-unbuffered-plugin` (`X-Accel-Buffering: no`) |
| WebRTC ou UDP público morto depois de atualizar o Tailscale | o Tailscale removeu o jump do Docker na `FORWARD` | `iptables -A FORWARD -o br-<id> -j DOCKER`, persistido em `fix-docker-forward.service` |
| VM em bridge pinga o host mas não sai | o Docker liga `bridge-nf-call-iptables` com `FORWARD` em DROP | `iptables -I DOCKER-USER -i br0 -o br0 -j ACCEPT`, persistido em `br0-forward-accept.service` no sumo |
| Serviço com config velha depois de mudar compose ou env | container não recriado | `up -d --force-recreate <svc>` |
| Consumidor Kafka nunca sobe | tópico faltando | `docker compose run --rm kafka-init`; os tópicos saem do `KafkaTopicRegistry` |
| `redis-cli monitor` esquecido | a sessão aberta por `docker exec` não morre quando o cliente sai, nem com `timeout` | usar `redis-cli --latency` ou `MONITOR` com `timeout` de dentro do container |
| Processo que devia sobreviver cai junto com o script | script em segundo plano que inicia serves e é interrompido derruba os filhos, mesmo com `setsid nohup` | subir desacoplado; foi o que deu 502 no login pela Dell |

- `terraform apply` em `~/iac/attlas-vms` no sumo **destrói as VMs**: o state ainda acha que estão na NAT
  `default` e forçaria substituição. Não rodar até reconciliar o state.
- **Lentidão do dev.v2 nunca é crédito de CPU**: a instância está em `unlimited`, então a CPU não é
  estrangulada e steal alto não é crédito esgotado (o excedente acima de 40% por vCPU vira custo, cerca de
  US$ 40 por mês). O `unlimited` vale só para CPU; a rede tem crédito próprio. Onde o tempo vai e como
  medir: [[Runbook - desempenho do dev.v2]].
- O tuning de rede do host está em `/etc/sysctl.d/99-attlas-edge.conf` (BBR e
  `tcp_slow_start_after_idle = 0`) e `/etc/modules-load.d/attlas-bbr.conf`; está fora do repositório.

## Relacionados

[[Server e CI]] · [[CI - Arquitetura e runners]] · [[Observabilidade - Aplicação e CI]] ·
[[Runbook - desempenho do dev.v2]]
