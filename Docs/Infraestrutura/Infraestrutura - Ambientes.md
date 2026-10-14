---
tags:
  - doc
  - infraestrutura
  - ambientes
aliases:
  - "Infraestrutura - Ambientes"
  - "Ambientes - dev.v2, Dell e sumo"
  - "Ambiente de validação - Dell"
  - "Registro - deriva do env do dev.v2 e deploy quebrado em 26 de setembro"
  - "Deriva do env do dev.v2"
  - "Deploy do dev.v2 quebrado por env"
atualizado: 2026-10-14
---

# Infraestrutura - Ambientes

Volta para [[Infraestrutura]].

## Resumo

| Ambiente | O que é | Acesso |
| --- | --- | --- |
| **dev** (`https://dev.v2.attlas.atmansystems.com`) | Attlas 26 em Kubernetes: cluster kind `attlas`, namespace `attlas-dev`, 23 serviços entregues pelo [[Infraestrutura - Orbit]] a cada release da `develop` | navegador; `kubectl` no hub ([[Infraestrutura - Runbook - Comandos#Kubernetes no hub dev]]) |
| **Local** (Dell) | backend em Docker Compose e front em `nx serve` | `localhost`; Kong na porta 8000 |

O dev não usa Docker Compose. O `docker-compose.yml` do repositório serve ao ambiente local e de origem para gerar o estado inicial do GitOps (`tools/compose_to_gitops.py`, no repositório `orbit`). Máquinas, endereços e rede: [[Infraestrutura - Servidores e rede]]. Fluxo do commit ao pod: [[Infraestrutura - CI-CD de ponta a ponta]].

## Como o dev é montado

| Peça | Detalhe |
| --- | --- |
| Cluster | kind `attlas`, um nó (container `attlas-control-plane`, Kubernetes v1.37), com metrics-server e Argo CD |
| Aplicações no Argo CD | um aplicativo por serviço, mais `infra-dev`; os ApplicationSets `attlas` (chart `atman-service`) e `attlas-infra` (chart `atman-infra`) os geram |
| Serviços | Deployments de 1 réplica (template `dev`, sem autoescalador), atualização contínua com `maxUnavailable: 0`; liveness a cada 20 s com 6 falhas toleradas e timeout de 5 s |
| Dados | um Postgres (`db-<serviço>-0`) e um Redis (`redis-<serviço>-0`) por serviço, em StatefulSets com volume `local-path` |
| Infraestrutura comum | Kafka com ZooKeeper, kafka-exporter, Kafdrop, MinIO, Kong, MediaMTX, MailHog, `analytics-kafka-bridge`, `acom-sim` e o gateway nginx `attlas-gateway` |
| Jobs | `kafka-init` e `minio-init` rodam a cada sync da infraestrutura (hooks idempotentes) e terminam como `Completed` |
| Configuração | os values se combinam na ordem `charts/<chart>`, `templates/<template>`, `services/<serviço>`, `apps/<ambiente>/<serviço>`; o último vence |
| Variáveis de ambiente | Secret `<serviço>-env` no namespace; ver [[#Variáveis dos serviços]] |
| Imagens | `atmanadmin/attlas-<ms>:<sha>` no Docker Hub; o pull usa o Secret `atman-registry` |

## Caminho de uma requisição

1. O nginx do host recebe `https://dev.v2.attlas.atmansystems.com` na porta 443, termina o TLS e repassa para `127.0.0.1:8081`. Rotas de SSE saem sem buffer.
2. O `orbit-ingress` (socat na porta 8081) abre a conexão com o NodePort 30081 do nó kind.
3. O `attlas-gateway` (nginx dentro do cluster) roteia `/api/` para o Kong, as rotas de stream do alarms, notifications, organization e traffic-model direto ao Kong sem buffer, `/socket.io/` para o `ms-cameras`, `/whep/` e `/mtx-hls/` para o MediaMTX, os buckets de alarmes, relatórios e e-mails para o MinIO e `/` para o `web-attlas`.
4. O Kong valida o JWT e entrega ao serviço em `/api/<serviço>`.

Pela tailnet, o Caddy (`orbit-ingress-tls`, porta 8443) serve o mesmo gateway em HTTP/2 e HTTP/3; o endereço `:8081` segue em HTTP/1.1, que enfileira os cerca de 200 arquivos do front e faz a primeira carga demorar mais.

Fora do caminho HTTP, o hub redireciona portas para NodePorts do nó por DNAT: WebRTC `8189/udp` para o MediaMTX (31889), RTSP `8554` (30554) e Kafka externo `9094` (30094). O TCP dos controladores Neo fica no NodePort 30079 do `ms-connector-neo`. O relay TURN (`attlas-coturn`) roda fora do cluster, com rede do host. Quem alcança o dev de fora: [[Infraestrutura - Mapa de puertos#Diferencias entre local y dev]].

## Variáveis dos serviços

Os Secrets `<serviço>-env` saem dos `.env.docker` guardados em `~/orbit/state/secrets/compose-env/apps/<ms>/` no hub, aplicados por `local/env-secrets.sh <namespace> <pasta>`. O arquivo segue o formato do `.env.example` (seções fixas, regra em `docs/architecture/env-vars.md`); para que serve cada variável está em `apps/<ms>/docs/ENV.md`.

Chave nova no `.env.example` não chega sozinha ao cluster. Acrescentar a chave no `.env.docker` do serviço, rodar o script de novo e reiniciar o serviço (`kubectl rollout restart deploy/<serviço>`), porque Secret alterado não reinicia o pod. Para comparar à mão:

```bash
diff <(grep -oE '^[A-Z0-9_]+' ~/orbit/state/secrets/compose-env/apps/<ms>/.env.docker | sort) \
     <(grep -oE '^[A-Z0-9_]+' <repo>/apps/<ms>/.env.example | sort)
```

Linha só à esquerda é chave que só o ambiente tem; linha só à direita é chave que falta. Um `ANALYTICS_STREAM_BROKERS` do `ms-cameras` apontando para outro broker que não o do equipamento faz o pisca da região de detecção parar sem erro nenhum.

## Dell

- Gateway Kong em `http://afonso-dell-14-dc14250.tailca0a03.ts.net:8000` (rotas `/api/*`). Usar o hostname MagicDNS, não o IP da tailnet, que muda.
- Pelo Mac: `ATTLAS_API=<gateway>` em `apps/web-attlas/.env`. O `apps/web-attlas/proxy.conf.mjs` lê a variável, sem mudar código.
- O arranjo preferido é backend em Docker e front em dev. Os sete serviços em `nx serve` mais o front esgotam os 15 GiB. Um serviço por vez, o `ms-organization` primeiro para o login voltar logo:

  ```bash
  npx nx run <ms>:build
  DOCKER_BUILDKIT=1 docker build -f apps/<ms>/Dockerfile --secret id=npmrc,src=.npmrc \
    --build-arg DIST_PATH=dist/apps/<ms> -t atmanadmin/attlas-<ms>:dev .
  docker compose -f docker-compose.yml up -d --no-deps <ms>
  ```

- Os sete serviços são `ms-organization`, `ms-cameras`, `ms-traffic-model`, `ms-controllers`, `ms-notifications`, `ms-detector-history` e `ms-video-analytics`. O Kong não precisa ser recriado: o `docker-compose.override.yml` aponta cada um para o `host-gateway`, nas mesmas portas do `nx serve`, e o container publica essas portas no host.
- O front sobe com `npm run serve web-attlas`, que tem teto de 6 GB no Node e `GOMEMLIMIT` de 3 GiB no esbuild. O Tailwind varre só `apps/web-attlas/src` e `apps/web-attlas/libs`.
- O `npm run docker:up` completo (cerca de 57 containers) não cabe na Dell. Monitorar a memória antes e durante a subida.
- O `.env.docker` local também defasa: o `npm run setup:env` reescreve as chaves que ele gerencia (host, porta, URL e segredos) e preserva as outras; para o resto, completar só as chaves que faltam a partir do `.env.example`.

## Armadilhas conhecidas

| Sintoma | Causa | Correção |
| --- | --- | --- |
| serviço em CrashLoop com `validateEnv ... should not be empty` | o Secret `<serviço>-env` não tem uma chave que o serviço exige | acrescentar a chave no `.env.docker` do hub e rodar `local/env-secrets.sh` de novo |
| Kong 503 `name resolution failed` | o pod do serviço upstream não existe ou não está pronto: tópico Kafka faltando, Prisma P3018 ou env faltando | `kubectl -n attlas-dev logs deploy/<serviço>`; não reiniciar o Kong às cegas |
| pod do serviço em loop com `P3018` ou `23505` no log | o boot roda `prisma migrate deploy` e um índice único novo bate em duplicata antiga; `CONCURRENTLY` deixa o índice `INVALID`, e o retry passa sem unicidade | achar duplicatas com `GROUP BY ... HAVING count(*) > 1`, soft-delete das sobras (mantendo ids), `DROP INDEX CONCURRENTLY IF EXISTS`, marcar a migration como rolled back em `_prisma_migrations` e deixar o pod subir; conferir `indisvalid`. Antes de índice único novo, rodar o `GROUP BY` em todo ambiente |
| reinício em loop durante rollout, com load alto no hub | probe estourou por CPU saturada | o chart `atman-service` usa timeout de 5 s e liveness com 6 falhas; reduzir a carga do host antes de forçar rollout |
| consumidor Kafka nunca sobe | tópico faltando | o job `kafka-init` recria os tópicos a cada sync da infraestrutura; a lista `docker/kafka-topics.list` sai do `KafkaTopicRegistry` por `npm run generate:kafka-topics` |
| SSE mudo através da borda | o nginx do host segura blocos TLS de 16 KiB e o Kong esconde `X-Accel-*` | rota SSE nova no `docker/kong.yml` usa a âncora `*sse-edge-unbuffered-plugin` (`X-Accel-Buffering: no`) e entra no `attlas-gateway` |
| `infra-dev` parado em `Progressing` no Argo CD | o kind não preenche o status do Ingress | o health customizado de Ingress em `local/argocd-values.yaml` o marca como saudável; aplicar com o `up.sh` |
| vídeo não abre depois de reboot do hub | o DNAT de `8189/udp` e `8554` sumiu | `bash ~/orbit/local/ingress/media-dnat.sh`; o cron `@reboot` já faz isso |
| Secret ou ConfigMap alterado sem efeito | o pod não reinicia sozinho | `kubectl -n attlas-dev rollout restart deploy/<serviço>` |

## Glossário

| Termo | O que é |
| --- | --- |
| NodePort | porta do nó do cluster que expõe um Service; o hub redireciona portas do host para elas |
| StatefulSet | workload com identidade e volume fixos por pod, usado nos bancos, Redis, Kafka e MinIO |
| Secret | objeto do Kubernetes que guarda as variáveis de ambiente de um serviço |
| `host-gateway` | nome que o Docker resolve para o IP do host, usado para o container alcançar um processo fora dele |
| P3018, 23505 | erro do Prisma de migration que falhou e erro do Postgres de valor duplicado em índice único |
