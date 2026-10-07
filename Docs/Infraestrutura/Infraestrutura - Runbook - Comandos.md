---
tags:
  - doc
  - infraestrutura
  - runbook
  - comandos
aliases:
  - "Infraestrutura - Runbook - Comandos"
  - "Comandos"
  - "Comandos gerais"
atualizado: 2026-10-07
---

# Infraestrutura - Runbook - Comandos

Volta para [[Infraestrutura]].

## Resumo

| Ferramenta | Para que serve | Onde roda | Seção |
| --- | --- | --- | --- |
| SSH e Tailscale | entrar no dev.v2, no sumo, na VM do CI e na Dell; alcançar a LAN das câmeras | máquina local | [[#Acesso aos servidores]] |
| Docker e Docker Compose | subir, derrubar, ler log, entrar e recriar serviço da stack | máquina local e dev.v2 | [[#Docker e Docker Compose]] |
| npm e Nx | preparar a máquina, servir um projeto em desenvolvimento, gerar client e migrar Prisma | máquina local | [[#Monorepo]] |
| psql | consultar o banco de cada serviço | containers `attlas-db-*` | [[#Banco de dados]] |
| ferramentas do Kafka | listar tópicos, ler mensagens, ver lag de consumer group | container `attlas-kafka` | [[#Kafka]] |
| redis-cli | achar chave, ler valor e TTL, medir latência | containers `attlas-redis-*` | [[#Redis]] |
| curl na API | obter token, chamar rota pelo Kong, health e metrics | máquina local ou host da stack | [[#API do Attlas por HTTP]] |
| API de controle do MediaMTX | paths, leitores, sessões e erro da puxada | rede `attlas-net` do host da stack | [[#MediaMTX]] |
| ffmpeg, ffprobe e ffplay | abrir RTSP, medir codec, FPS, GOP, bitrate e latência, tirar quadro, gravar trecho | máquina com rota até a câmera | [[#ffmpeg, ffprobe e ffplay]] |
| ONVIF | descoberta, capacidades, perfis, URL de stream e PTZ de qualquer fabricante | máquina com rota até a câmera | [[#ONVIF]] |
| VAPIX | API HTTP da Axis | máquina com rota até a câmera | [[#VAPIX da Axis]] |
| ISAPI | API HTTP da Hikvision | máquina com rota até a câmera | [[#ISAPI da Hikvision]] |
| ss, nc, tcpdump, tailscale, iptables | rede do host e dos containers | dev.v2 e máquina local | [[#Rede do host]] |
| nginx e systemd | borda HTTPS do dev.v2 e serviços do sistema nos hosts | dev.v2, sumo e VM do CI | [[#nginx e systemd no host]] |
| git e gh | ler a `develop`, acompanhar PR, checks, runs e logs de job, disparar deploy | máquina local | [[#Git e GitHub CLI]] |

Os procedimentos de diagnóstico de cada domínio ficam nos runbooks dele: [[Câmeras - Streaming - Runbook]],
[[Câmeras - Integração com dispositivo - Runbook]], [[Analítico - Runbook - Embarcado]] e
[[Infraestrutura - Runbook - Desempenho do dev.v2]]. Esta nota guarda o comando de cada ferramenta e a leitura da
saída; a ordem dos passos de um diagnóstico mora no runbook do domínio.

Kubernetes não entra aqui porque nenhum cluster de aplicação está no ar: o Attlas roda em Docker Compose. "Local"
nesta nota é a máquina de desenvolvimento (a Dell), com o repositório em
`~/Área de trabalho/Developer/attlas-2026`. Nenhuma credencial aparece nos comandos: cada `$VARIÁVEL` está em
[[#Variáveis usadas nesta nota]].

## Acesso aos servidores

### Para que serve

O SSH entra nos servidores. O Tailscale põe a máquina local na tailnet `atmansystems.com`, que é o único caminho até o
sumo, as VMs dele e as câmeras da LAN `10.1.1.0/24`.

### Comandos

**Saber quais hosts existem e como entrar em cada um**

| Host | Comando de entrada | O que roda |
| --- | --- | --- |
| dev.v2, EC2 `3.15.199.101` | `ssh aws-attlas-26` | a stack Compose inteira do ambiente de desenvolvimento, em `~`, atrás de um nginx do host |
| dev.v2 pela tailnet | `ssh -o ControlMaster=no -i ~/.ssh/id_ed25519_aws_attlas ubuntu@aws-attlas-dev-v2` | o mesmo host, quando a porta 22 pública dá timeout |
| sumo, `10.1.1.115` | `ssh sumo` | VM do CI, cache remoto do Nx (MinIO na porta 8388), stack legada do Attlas 25 e VMs `attlas-vm-1..7` |
| VM do CI `ci-runner`, `192.168.122.66` | `ssh -J sumo ubuntu@192.168.122.66` | os runners do GitHub Actions (scale set `sumo-ci-runner`) |
| `attlas-vm-1..7`, `10.1.1.120` a `10.1.1.125` e `10.1.1.127` | `ssh -J sumo ubuntu@<ip>` | VMs em bridge na LAN; `10.1.1.126` é o VIP do kube-vip |
| Dell | `ssh <usuário>@afonso-dell-14-dc14250.tail4b16e5.ts.net` | máquina de desenvolvimento; Kong na porta 8000 |
| `aquario-server`, `100.77.100.21` na tailnet | sem acesso do time; só responde a `tailscale ping` | subnet router que anuncia `10.1.1.0/24` e as redes `10.11.x.x` |

**Entrar no dev.v2 e rodar vários comandos numa conexão só**

```bash
# local
ssh aws-attlas-26
ssh aws-attlas-26 'docker compose ps -a'          # o diretório inicial é ~, onde está o docker-compose.yml
ssh aws-attlas-26 'bash -s' < script.sh           # vários comandos, um handshake só
```

**Abrir no navegador local uma porta que o dev.v2 só publica para ele mesmo**

```bash
# local; Kafdrop em http://localhost:9000 e MailHog em http://localhost:8025
ssh -N -L 9000:localhost:9000 -L 8025:localhost:8025 aws-attlas-26
# ms-cameras direto, sem passar pelo Kong, em http://localhost:13300
ssh -N -L 13300:localhost:3300 aws-attlas-26
```

**Entrar na VM do CI**

```bash
# local
ssh -J sumo ubuntu@192.168.122.66
```

**Criar o alias `ssh ci-runner` no `~/.ssh/config`**

```text
Host ci-runner
    HostName 192.168.122.66
    User ubuntu
    ProxyJump sumo
```

**Abrir o console da VM do CI quando o SSH dela falha**

```bash
# no sumo
virsh --connect qemu:///system list --all
virsh --connect qemu:///system console ci-runner     # sair com Ctrl+]
```

**Entrar na tailnet da empresa e aceitar as rotas da LAN**

```bash
# local
tailscale switch --list                 # contas logadas; a certa é a @atmansystems.com
sudo tailscale up --accept-routes       # sem a flag, a rota do aquario-server não entra na tabela
tailscale status | grep -E 'aquario|aws-attlas|dell'
ip route get 10.1.1.78                  # tem de sair por dev tailscale0
# conta errada logada: sudo tailscale logout e depois sudo tailscale up --accept-routes, com a conta @atmansystems.com
```

### Leitura do resultado

| Saída | O que significa |
| --- | --- |
| `ip route get 10.1.1.78` mostra `dev tailscale0 table 52` | a rota da LAN de câmeras está ativa |
| a rota aparece em `tailscale status --json` (`AllowedIPs`), mas `ip route get` sai pela interface física | falta `--accept-routes` |
| `ssh aws-attlas-26` dá `Connection timed out` com o site respondendo | bloqueio da porta 22 pública para o seu IP; entrar pela tailnet |
| `ssh sumo` sem resposta e `tailscale ping 100.77.100.21` sem pong | o `aquario-server` caiu; tudo em `10.1.1.x` some de uma vez |
| `virsh list` vazio no sumo | o `virsh` sem `--connect qemu:///system` abre a sessão do usuário, que não tem VM |

### Armadilhas

| O que dá errado | Como evitar |
| --- | --- |
| Tailnet pessoal logada (a do GitHub do dono ou a do Vision Team): nenhuma rota para a rede da Atman | `tailscale switch` para a conta `@atmansystems.com` |
| Cinco ou mais handshakes SSH em poucos segundos bloqueiam a porta 22 do dev.v2 para aquele IP por cerca de 2 min | agrupar comandos em `bash -s`, ou entrar pela tailnet |
| O `aquario-server` é ponto único de falha: sem ele somem sumo, VMs e câmeras | conferir `tailscale ping 100.77.100.21` antes de suspeitar do Attlas; o conserto é no local, não existe caminho remoto até ele |
| `terraform apply` em `~/iac/attlas-vms` no sumo destrói as VMs, porque o state ainda as coloca na rede NAT `default` | não rodar até reconciliar o state |

## Docker e Docker Compose

### Para que serve

O `docker-compose.yml` descreve a stack inteira: a infraestrutura comum fica sem perfil e sobe com `npm run infra:up`;
microsserviços, `web-attlas` e alguns bancos e Redis ficam no perfil `full`. Na máquina local o
`docker-compose.override.yml` é carregado sozinho e aponta o Kong para os serviços em `nx serve`; no dev.v2 a stack mora
em `~` e o `.env.docker` de cada serviço em `~/apps/<ms>/`.

### Comandos

**Subir e derrubar a infraestrutura local**

```bash
# local, na raiz do repositório
npm run infra:up                       # docker compose up -d: sem perfil, com o override
npm run infra:down                     # docker compose down; os volumes ficam
docker compose --profile full up -d    # tudo, cerca de 57 containers
```

**Subir ou recriar um serviço só**

```bash
# local ou no dev.v2 (em ~)
docker compose up -d --no-deps <svc>                       # nomear o serviço ativa o perfil dele
docker compose up -d --no-deps --force-recreate <svc>      # depois de mudar env, imagem ou compose
docker compose --profile full up -d --no-deps --no-build --force-recreate <svc>   # erro "network ... not found"
```

**Ver o estado dos containers**

```bash
docker compose ps -a --format 'table {{.Service}}\t{{.Status}}\t{{.Ports}}'
docker compose ps -a | grep -v ' Up '          # o que não está de pé
docker inspect attlas-<svc> --format '{{.RestartCount}} {{.State.StartedAt}} {{.State.ExitCode}} {{.State.OOMKilled}}'
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'
```

**Ver os logs de um serviço**

```bash
docker compose logs --tail 200 -f <svc>
docker logs --since 30m attlas-<svc> 2>&1 | grep -E '"level":(50|60)'      # só erro e fatal, em container
# requisições acima de 1 s, a partir do JSON do pino
docker logs --since 1h attlas-<svc> 2>&1 | python3 -c '
import json, sys
for line in sys.stdin:
    try:
        e = json.loads(line)
    except ValueError:
        continue
    if e.get("responseTime", 0) > 1000:
        print(e["responseTime"], e["req"]["method"], e["req"]["url"], e["res"]["statusCode"])'
```

**Entrar num container e ver o ambiente dele**

```bash
docker exec -it attlas-<svc> sh
docker exec attlas-<svc> printenv | cut -d= -f1 | sort      # só os nomes das variáveis, sem valor
```

**Conferir a configuração que vale de fato**

```bash
docker compose config <svc>                        # compose + override + .env interpolados; imprime segredos
docker compose -f docker-compose.yml up -d <svc>   # local: sobe sem o override
```

**Criar os tópicos e os buckets que faltam**

```bash
docker compose run --rm kafka-init
timeout 180 docker compose run --rm minio-init
```

**Conferir idade e conteúdo de uma imagem, e construir local**

```bash
docker image inspect atmanadmin/attlas-<svc>:dev --format '{{.Created}}'
docker run --rm --entrypoint sh atmanadmin/attlas-<svc>:dev -c 'grep -c <símbolo novo> main.js'
npx nx run <svc>:docker:build --skip-nx-cache      # local; sem a flag o Nx pode servir do cache
```

**Levar uma imagem local para o dev.v2 sem registry**

```bash
# local
docker save atmanadmin/attlas-<svc>:dev | gzip -1 | ssh aws-attlas-26 'gunzip | docker load'
# no dev.v2, em ~, sem pull
docker compose --profile full up -d --no-deps --force-recreate <svc>
```

**Comparar o `.env.docker` do dev.v2 com o `.env.example`**

```bash
# no dev.v2, em ~; o deploy deixa o .env.example ao lado de cada .env.docker
bash scripts/ci/deploy-env-keys-check.sh -f docker-compose.yml <svc>
diff <(grep -oE '^[A-Z0-9_]+' ~/apps/<ms>/.env.docker | sort) <(grep -oE '^[A-Z0-9_]+' ~/apps/<ms>/.env.example | sort)
```

**Subir Prometheus, Grafana e Loki na máquina local**

```bash
# local; Grafana em http://127.0.0.1:9700, Prometheus em http://127.0.0.1:9300
docker compose -f docker/observability/docker-compose.yml up -d
```

**Liberar disco**

```bash
df -h /
docker system df
docker image prune -f                           # imagens sem tag
docker image prune -af --filter "until=72h"     # o mesmo corte que o deploy usa
docker builder prune -af                        # cache de build
sudo du -sh /var/lib/docker/containers/*/*-json.log | sort -h | tail     # logs de container
```

### Leitura do resultado

| Saída | O que significa |
| --- | --- |
| `Exited (0)` em `attlas-kafka-init` e `attlas-minio-init` | normal: são containers de uma execução só |
| `Exited (1)` num `attlas-ms-*` | o boot falhou: variável faltando no `.env.docker`, migration Prisma (P3018) ou tópico Kafka ausente; o motivo está no fim do `docker compose logs` |
| `Exited (137)` | SIGKILL: shutdown acima de 10 s no deploy, ou falta de memória quando `OOMKilled` vem `true` |
| `RestartCount` subindo a cada leitura | o container está em laço de reinício |
| `"level":40`, `50` e `60` no log | warn, error e fatal do pino; em container o serviço roda com `NODE_ENV=production` e loga JSON, em `nx serve` loga texto colorido |
| `responseTime` | duração da requisição em ms; em SSE e WebSocket é o tempo de vida da conexão |
| o `deploy-env-keys-check.sh` lista chaves e sai com código 1 | o `.env.docker` do host não tem uma chave que o `.env.example` declara |

Portas que o compose publica no host:

| Porta | Container |
| --- | --- |
| 8000, 8001, 8100 | `attlas-kong`: proxy das rotas `/api/*`, Admin API e `/metrics` |
| 9092, 9094 | `attlas-kafka`: listener do host e listener externo para o equipamento publicar no dev.v2 |
| 9000 | `attlas-kafdrop` |
| 8025 | `attlas-mailhog`, interface web |
| 9100, 9101 | `attlas-minio`: API S3 e console |
| 8888, 8889, 8189/udp, 8554 | `attlas-mediamtx`: LL-HLS, WHEP, mídia WebRTC e RTSP |
| 5432 | `attlas-db-cameras`; os outros bancos ficam entre 5401 e 5415 |
| 6379 a 6397 | um Redis por serviço; 6390 é o do `ms-cameras` |
| 3001, 3010, 3300 e as demais | microsserviços; o `docker compose ps` mostra cada uma |
| 4200 | `attlas-web-attlas`, só no perfil `full` |

### Armadilhas

| O que dá errado | Como evitar |
| --- | --- |
| Na máquina local, o Kong guarda o IP antigo de um serviço recriado e responde 502 ou 404, porque o override desliga o `KONG_DNS_VALID_TTL` | `docker compose up -d --force-recreate kong` depois de recriar um serviço; no dev.v2 o TTL de 10 s resolve sozinho |
| O override aponta `<ms>:host-gateway` para um serviço que está em container: o Kong bate na porta do `nx serve` e recebe `connection refused` | cada linha do `extra_hosts` só vale para serviço em `nx serve`; com o serviço em container, comentar a linha dele e recriar o Kong |
| `docker compose pull` depois de um `docker load` | traz a imagem do Docker Hub por cima da carregada; no deploy direto não se usa `pull` |
| `nx run-many -t docker:build` serve do cache e não roda o `docker build` | `--skip-nx-cache` e conferir o `{{.Created}}` da imagem |
| `docker volume prune` ou `docker system prune --volumes` | apaga os bancos; nunca no host da aplicação |
| Kafka cai no boot com `NodeExists` depois de reinício rápido | `docker restart attlas-zookeeper`, `docker start attlas-kafka` e `docker compose run --rm kafka-init` |
| Mudança de env ou de compose sem efeito | `restart` reaproveita o container antigo; usar `--force-recreate` |
| Recriar o Kong derruba todo WebSocket e SSE; recriar o MediaMTX derruba todo vídeo | só quando a configuração deles mudou; o deploy já decide isso pelo hash do `docker/kong.yml` e do `docker/mediamtx.yml` |
| `docker compose config` e `printenv` com valor | imprimem segredos; não colar a saída em PR, chat ou nota |
| `--profile full` na Dell | cerca de 57 containers não cabem nos 15 GiB; subir só os serviços nomeados |
| Chave nova no `.env.example` | o deploy não sincroniza o `.env.docker` do dev.v2; a chave entra à mão e o serviço é recriado |

## Monorepo

### Para que serve

npm e Nx preparam a máquina local, servem um projeto em modo de desenvolvimento e rodam os alvos de cada projeto, como os
do Prisma. Teste, lint e build completos ficam para o CI.

### Comandos

**Preparar a máquina**

```bash
# local, na raiz do repositório
nvm use                  # Node 22.22.1, do .nvmrc
npm ci
npm run setup:env        # gera ou reconcilia o .env e o .env.docker de cada serviço e o .env da raiz
```

**Servir um projeto em desenvolvimento**

```bash
npm run infra:up
npm run serve ms-organization     # primeiro, para o login funcionar
npm run serve ms-cameras
npm run serve web-attlas          # http://localhost:4200
```

**Servir o front local contra o dev.v2**

```bash
ATTLAS_API=https://dev.v2.attlas.atmansystems.com \
ATTLAS_ORGANIZATION_API=https://dev.v2.attlas.atmansystems.com \
npm run serve web-attlas
```

**Gerar o client e aplicar migrations do Prisma**

```bash
npx nx run <ms>:prisma:generate
npx nx run <ms>:prisma:migrate        # prisma migrate deploy
npx nx run <ms>:prisma:seed           # só nos serviços que têm seed; aplica as migrations antes
cd apps/<ms> && npx prisma migrate status
```

**Criar uma migration nova**

```bash
cd apps/<ms>
npx prisma migrate dev --create-only --name <descricao>
```

Depois disso vêm o `rollback.sql` e o ciclo de validação em banco shadow, descritos em
`docs/architecture/backend-standards.md`, seção "Origem da migration".

**Ver os alvos de um projeto**

```bash
npx nx show project <ms> --json | jq '.targets | keys'
```

**Reiniciar o daemon do Nx**

```bash
npx nx daemon --stop && npx nx daemon --start
ls .nx/workspace-data/d/disabled      # se o arquivo existir, o daemon fica desligado; mover de lado e religar
```

**Gerar e validar artefatos versionados**

```bash
npm run generate:kafka-topics                       # docker/kafka-topics.list a partir do KafkaTopicRegistry
npm run validate:kafka-topics
node scripts/contracts-integration-inputs.mjs <ms> --json
npm run validate:pre-pr                             # varredura leve do diff da branch, só leitura
```

### Leitura do resultado

| Saída | O que significa |
| --- | --- |
| `Reusing JWT_SECRET from existing ./.env` | o `setup:env` reaproveitou o segredo da raiz; os tokens continuam válidos |
| arquivo `.bak` ao lado de um `.env` | cópia feita pelo `setup:env` antes de reescrever |
| `Nest application successfully started` | o serviço subiu |
| `Waiting for <ms>:serve:development in another nx process` | outro serve do mesmo projeto segura a tarefa; matar a cadeia inteira dele (`npm exec`, `sh`, `node`) por PID |
| `NX Daemon is not running. Node process will not restart automatically after file changes` | o serve não recompila; religar o daemon e o serve |
| `Database schema is up to date!` | `prisma migrate status` sem migration pendente |

### Armadilhas

| O que dá errado | Como evitar |
| --- | --- |
| `npx nx serve web-attlas` direto perde o `NODE_OPTIONS` do script e morre com `The expression evaluated to a falsy value: (compilation)` | subir sempre por `npm run serve` |
| `npm run serve ms-cameras` roda `prisma migrate deploy` e o seed antes de subir | contar com isso antes de apontar o serviço para um banco que não é descartável |
| O `setup:env` reescreve host, porta, URL, `NODE_ENV` e `JWT_SECRET` de todo `.env` | conferir os apontamentos manuais depois de rodar |
| Valor já gravado no `.env` não muda quando o default do código muda | default sujeito a mudança fica comentado no `.env.example` (`# CHAVE=valor`) |
| Mudança no `.env` de um serviço em `nx serve` não pega | reiniciar o daemon do Nx, que guarda o ambiente antigo, e depois o serve |
| `prisma db push` e `prisma migrate reset` | proibidos pelo `backend-standards.md`; migration errada na dev se desfaz pelo `rollback.sql` |
| Editar `docker/kafka-topics.list` à mão | o guard do Lint recusa; a lista sai do `npm run generate:kafka-topics` |
| `nx test`, `nx lint` ou `nx build` completos na Dell | esgotam os 15 GiB; o CI cobre lint e build |
| `nx serve ms-cameras` não faz type-check | erro de tipo só aparece no build do CI |

## Banco de dados

### Para que serve

Cada serviço tem um Postgres 15 próprio no container `attlas-db-<serviço>` (o do `ms-cameras` é `attlas-db-cameras`). O
usuário e o banco estão nas variáveis `POSTGRES_USER` e `POSTGRES_DB` do próprio container, e o `psql` roda lá dentro,
pelo socket local, sem senha.

### Comandos

**Abrir o psql de um serviço**

```bash
# local ou no dev.v2
docker exec -it attlas-db-<serviço> sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

**Consultar o dev.v2 só para leitura**

```bash
# local; a consulta fica no arquivo q.sql e vai por stdin
ssh aws-attlas-26 'docker exec -i -e PGOPTIONS="-c default_transaction_read_only=on" attlas-db-cameras sh -c "psql -U \$POSTGRES_USER -d \$POSTGRES_DB"' < q.sql
```

**Preencher `$CRED` com a credencial de uma câmera**

```bash
# local
CAM=10.1.1.79
CRED=$(docker exec -i attlas-db-cameras sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA' <<SQL
SELECT cc.username || ':' || cc.password FROM "Camera" c JOIN "CameraCredential" cc ON cc."cameraId" = c.id
WHERE c."ipAddress" = '$CAM' AND c."deletedAt" IS NULL LIMIT 1;
SQL
)
```

**Consultas de diagnóstico**

```sql
\dt
\d "Camera"
SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;
SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
SELECT pid, state, now() - query_start AS duracao, left(query, 80) FROM pg_stat_activity WHERE state <> 'idle';
SELECT relname, seq_scan, idx_scan, n_live_tup FROM pg_stat_user_tables ORDER BY seq_scan DESC LIMIT 10;
SELECT datname, temp_files, pg_size_pretty(temp_bytes) FROM pg_stat_database;
```

**Achar duplicata antes de criar um índice único**

```sql
SELECT "systemId", "ipAddress", count(*) FROM "Camera" WHERE "deletedAt" IS NULL GROUP BY 1, 2 HAVING count(*) > 1;
```

**Ligar um cliente gráfico ao banco do dev.v2**

```bash
# local; depois conectar em localhost:15432 com o usuário e a senha do serviço no docker-compose.yml
ssh -N -L 15432:localhost:5432 aws-attlas-26      # 5432 é o attlas-db-cameras; os outros, no docker compose ps
```

### Leitura do resultado

| Saída | O que significa |
| --- | --- |
| `rolled_back_at` preenchido e `finished_at` vazio | migration que falhou e foi marcada como desfeita |
| linha no `pg_index ... NOT indisvalid` | índice criado com `CONCURRENTLY` que falhou; existe, mas não garante unicidade |
| `seq_scan` alto numa tabela de poucas linhas | consulta repetida em laço |
| `temp_bytes` alto | consulta que ordena ou agrega sem índice e grava arquivo temporário |
| `ERROR: cannot execute UPDATE in a read-only transaction` | a proteção de leitura funcionou |

### Armadilhas

| O que dá errado | Como evitar |
| --- | --- |
| `psql -h localhost` pede senha e trava num script | entrar pelo socket com `docker exec`, como acima |
| Tabela e coluna do Prisma em PascalCase e camelCase | aspas duplas: `"Camera"."ipAddress"` |
| Aspas aninhadas em `ssh ... docker exec ... psql -c` travam o shell | consulta num arquivo, mandada por stdin |
| Câmera inserida à mão com id derivado de hash | usar `gen_random_uuid()`; o WebSocket do analítico recusa id que não é UUID válido |
| Procurar consulta lenta pelo `pg_stat_statements` | a extensão não está ligada em nenhum Postgres |
| Duplicata antiga quebra a migration de um índice único no boot (P3018 com erro 23505) | rodar o `GROUP BY ... HAVING count(*) > 1` em todo ambiente antes; a recuperação está em [[Infraestrutura - Ambientes]] |
| Escrita no banco do dev.v2 | só na receita de recuperação; para o resto, `default_transaction_read_only=on` |

## Kafka

### Para que serve

Um broker só, `attlas-kafka` (imagem `confluentinc/cp-kafka:7.0.1`), atende todos os serviços. As ferramentas de linha
de comando já vêm no container; dentro da rede `attlas-net` o endereço do broker é `kafka:29092`.

### Comandos

**Listar e descrever tópicos**

```bash
# local ou no dev.v2
docker exec attlas-kafka kafka-topics --bootstrap-server kafka:29092 --list
docker exec attlas-kafka kafka-topics --bootstrap-server kafka:29092 --describe --topic <tópico>
grep -i '<parte do nome>' docker/kafka-topics.list       # local: a lista que o kafka-init cria
```

**Ler mensagens de um tópico**

```bash
docker exec attlas-kafka kafka-console-consumer --bootstrap-server kafka:29092 --topic <tópico> \
  --from-beginning --max-messages 5 --timeout-ms 15000 \
  --property print.timestamp=true --property print.key=true --property print.partition=true
# só o que chegar daqui em diante: tirar --from-beginning
```

**Ver o lag de um consumer group**

```bash
docker exec attlas-kafka kafka-consumer-groups --bootstrap-server kafka:29092 --list
docker exec attlas-kafka kafka-consumer-groups --bootstrap-server kafka:29092 --describe --group <grupo>
docker logs attlas-<svc> 2>&1 | grep -m3 'Connecting to Kafka'      # clientId e grupo que o serviço usa
```

**Criar os tópicos que faltam e religar um broker morto**

```bash
docker compose run --rm kafka-init
docker restart attlas-zookeeper && docker start attlas-kafka      # broker parado com NodeExists no log
```

**Testar a porta em que o equipamento publica no dev.v2**

```bash
# local
nc -vz dev.v2.attlas.atmansystems.com 9094
```

A interface web é o Kafdrop: `http://localhost:9000` na máquina local, ou pelo túnel de [[#Acesso aos servidores]] no
dev.v2.

### Leitura do resultado

| Saída | O que significa |
| --- | --- |
| `LAG` zero ou baixo e estável | o consumidor acompanha |
| `LAG` crescendo entre duas leituras | consumidor lento ou parado |
| `Consumer group '<grupo>' has no active members.` | nenhuma instância do serviço está consumindo |
| grupo com sufixo `-server` | o transporte Kafka do NestJS acrescenta `-server` ao `KAFKA_CONSUMER_GROUP`: `ms-cameras-group` aparece como `ms-cameras-group-server` |
| `Topic bootstrap complete (created=N, already_existed=M)` | saída do `kafka-init`; `created` acima de zero quer dizer que faltavam tópicos |
| `UNKNOWN_TOPIC_OR_PARTITION` ou `This server does not host this topic-partition` no boot de um serviço | tópico ausente; o serviço cai e o Kong responde 503 |
| `nc` com `succeeded`, `refused` ou timeout na 9094 | listener externo de pé; security group aberto sem listener; porta bloqueada |

### Armadilhas

| O que dá errado | Como evitar |
| --- | --- |
| `kafka-console-consumer --group <grupo de um serviço>` | entra no grupo do serviço, toma partições dele e grava offset; sem `--group` o console usa um grupo descartável |
| Tópico novo no código, ausente no broker, derruba o consumidor no boot | `docker compose run --rm kafka-init`; o deploy já roda esse passo |
| `ANALYTICS_STREAM_BROKERS` do `ms-cameras` apontando para outro broker que não o do equipamento | a região de detecção para de acender sem erro nenhum; conferir no `.env.docker` |

## Redis

### Para que serve

Cada serviço tem um Redis 7 próprio no container `attlas-redis-<serviço>` (o do `ms-cameras` é `attlas-redis-cameras`,
porta 6390 no host). Ele guarda cache, estado de curta duração e travas; o banco continua sendo a fonte de verdade.

### Comandos

**Abrir o redis-cli**

```bash
# local ou no dev.v2
docker exec -it attlas-redis-cameras redis-cli
docker exec -it -e REDISCLI_AUTH="$REDIS_PASS" attlas-redis-alarms redis-cli     # Redis com senha
```

**Achar chaves e ler tipo, TTL e valor**

```bash
docker exec attlas-redis-cameras redis-cli --scan --pattern '<prefixo>*' | head -20
docker exec attlas-redis-cameras redis-cli TYPE <chave>
docker exec attlas-redis-cameras redis-cli TTL <chave>
docker exec attlas-redis-cameras redis-cli GET <chave>          # HGETALL para hash
```

**Ver tamanho e memória**

```bash
docker exec attlas-redis-cameras redis-cli INFO keyspace
docker exec attlas-redis-cameras redis-cli INFO memory | grep used_memory_human
```

**Medir latência e ver comandos ao vivo, sempre com prazo**

```bash
docker exec attlas-redis-cameras timeout 15 redis-cli --latency
docker exec attlas-redis-cameras timeout 10 redis-cli MONITOR
```

### Leitura do resultado

| Saída | O que significa |
| --- | --- |
| `TTL` igual a `-1` | chave sem expiração |
| `TTL` igual a `-2` | chave não existe |
| `--latency` com `avg` abaixo de 1 ms | normal para um Redis no mesmo host; dezenas de ms indicam host saturado |
| `NOAUTH Authentication required.` | Redis com `requirepass`; passar `REDISCLI_AUTH` |
| `WRONGTYPE` ou `ERR value is not an integer or out of range` no log de um serviço | duas aplicações gravando a mesma chave com tipos diferentes, em geral por apontar para o Redis de outro serviço |

### Armadilhas

| O que dá errado | Como evitar |
| --- | --- |
| `MONITOR` ou `PSUBSCRIBE` aberto por `docker exec` sem prazo: o `timeout` do lado de fora mata só o cliente docker, e a sessão segue viva gastando CPU | o `timeout` vai dentro do `docker exec`, como acima |
| `KEYS *` | bloqueia o Redis enquanto varre; usar `--scan` |
| Redis com senha: `attlas-redis-controllers`, `-alarms`, `-pmv`, `-simulation`, `-selective-priority` e os dos conectores de UPS, PMV e laço virtual | a senha está no `command:` do serviço no `docker-compose.yml` |

## API do Attlas por HTTP

### Para que serve

Toda rota pública passa pelo Kong (`$ATTLAS_API`, rotas `/api/<serviço>/...`), que valida o JWT; o serviço lê o Sistema
do header `System-Id`. Health e metrics ficam fora do prefixo `/api`, na porta do próprio serviço.

### Comandos

**Obter um token**

```bash
TOKEN=$(curl -s "$ATTLAS_API/api/organization/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ATTLAS_USER\",\"password\":\"$ATTLAS_PASS\"}" | jq -r .accessToken)
```

**Descobrir o id do Sistema**

```bash
curl -s "$ATTLAS_API/api/organization/systems/me/overview" -H "Authorization: Bearer $TOKEN" \
  | jq -r '.items[] | "\(.id)  \(.name)  \(.organizationName)"'
```

**Chamar uma rota**

```bash
curl -s "$ATTLAS_API/api/cameras/<id>" -H "Authorization: Bearer $TOKEN" -H "System-Id: $SYSTEM_ID" | jq .
curl -s "$ATTLAS_API/api/cameras/<id>/stream-diagnostics?quality=PRIMARY&codec=H264" \
  -H "Authorization: Bearer $TOKEN" -H "System-Id: $SYSTEM_ID" | jq .
```

**Ver health e metrics de um serviço**

```bash
# no host que roda o serviço (local ou dev.v2)
curl -s localhost:<porta>/health/live
curl -s localhost:<porta>/health/ready | jq .
curl -s localhost:<porta>/metrics -H "Authorization: Bearer $METRICS_SCRAPE_TOKEN" | grep '^ms_cameras_stream_'
curl -s localhost:8100/metrics | grep -E '^kong_(kong|upstream|request)_latency_ms'
curl -s "$ATTLAS_API/api/cameras/health/live"       # pelo Kong
```

**Medir o tempo de cada fase de uma chamada**

```bash
curl -o /dev/null -s \
  -w 'conexão %{time_connect}s  tls %{time_appconnect}s  primeiro byte %{time_starttransfer}s  total %{time_total}s  status %{http_code}\n' \
  "$ATTLAS_API/api/<rota>" -H "Authorization: Bearer $TOKEN" -H "System-Id: $SYSTEM_ID"
```

**Conferir SSE e compressão através da borda**

```bash
curl -sN -D - "$ATTLAS_API/api/alarms/realtime" -H "Authorization: Bearer $TOKEN" -H "System-Id: $SYSTEM_ID" | head -20
curl -s -o /dev/null -D - --compressed "$ATTLAS_API/api/organization/users/me/permissions/effective" \
  -H "Authorization: Bearer $TOKEN" -H "System-Id: $SYSTEM_ID" | grep -i content-encoding
```

**Ver as rotas e validar a configuração do Kong**

```bash
# no host que roda a stack
curl -s 'localhost:8001/routes?size=1000' | jq -r '.data[].paths[]' | grep '/api/cameras'
docker exec attlas-kong kong config parse /tmp/kong.yml
```

**Chamar um serviço por dentro da rede, sem o Kong**

```bash
docker exec attlas-ms-cameras node -e "fetch('http://ms-detector-history:3000/<rota>').then(r => r.text()).then(console.log)"
```

### Leitura do resultado

| Saída | O que significa |
| --- | --- |
| `"status":"authenticated"` com `accessToken` | login certo |
| `"status":"mfa_required"` | usuário com MFA; copiar o token do navegador |
| 401 `{"message":"Unauthorized"}` | o Kong recusou: token ausente ou malformado |
| 401 `{"exp":"token expired"}` | token vencido; logar de novo |
| 401 com `TOKEN_TYPE_MISMATCH` | token que não é de acesso |
| 400 com `SYSTEM_ID_HEADER_MISSING` | faltou o header `System-Id` |
| 403 com `PERMISSION_RESOLVER_UNAVAILABLE` | o serviço não alcançou o `ms-organization` para checar permissão, e a checagem falha fechada |
| 404 numa câmera que existe | a câmera é de outro Sistema; o serviço responde 404, não 403 |
| 200 com lista vazia | `System-Id` sem dados; conferir o id |
| 502 no `ms-cameras` por 4 a 5 min depois de um deploy | janela de boot; esperar, não reiniciar |
| 503 `{"message":"name resolution failed"}` | o container do serviço não existe ou está parado |
| `/health/ready` com 503 e `"status":"error"` | uma dependência (banco, Redis, Kafka) está fora; o campo `error` diz qual |
| `X-Accel-Buffering: no` nos headers do SSE | a rota tem o plugin que solta os eventos na borda |
| `content-encoding: gzip` | o Kong comprimiu o JSON |

### Armadilhas

| O que dá errado | Como evitar |
| --- | --- |
| Login por `curl` recusado com o reCAPTCHA ligado (`RECAPTCHA_ENABLED=true` no `ms-organization`): a rota exige o header `x-recaptcha-token` | copiar o token de uma requisição do navegador no DevTools |
| Ranking de latência com SSE e WebSocket dentro | a duração deles é o tempo de vida da conexão; tirar `/realtime` e as rotas de stream da conta |
| Reiniciar o `ms-cameras` porque respondeu 502 logo depois do deploy | a janela de boot dura de 4 a 5 min |
| Kong 503 e reinício do Kong às cegas | o 503 diz que o container sumiu; achar por que ele caiu |

## MediaMTX

### Para que serve

O MediaMTX (`attlas-mediamtx`) puxa o RTSP de cada câmera sob demanda e entrega WebRTC (WHEP), LL-HLS e RTSP. Cada
stream é um path `<cameraId>-<primary|secondary|tertiary>`, com `-h265` ou `-av1` no fim quando o codec não é H.264; o
videowall usa `videowall-mirror-*` e `videowall-projection-*`. A API de controle, na porta 9997, mostra paths, leitores,
sessões e o erro da última puxada, e não é publicada no host do dev.v2 porque devolve a senha das câmeras.

### Comandos

**Listar paths, bytes recebidos e leitores**

```bash
# no dev.v2 ou na stack local em container: pelo ms-cameras, o mesmo caminho que o serviço usa
docker exec attlas-ms-cameras wget -qO- http://mediamtx:9997/v3/paths/list \
  | python3 -c 'import json,sys; [print(p["name"], p.get("available"), p.get("inboundBytes"), len(p.get("readers") or [])) for p in json.load(sys.stdin)["items"]]'
# local com o override, que publica a 9997 só em 127.0.0.1
curl -s localhost:9997/v3/paths/list | jq -r '.items[] | [.name, .available, .inboundBytes, (.readers | length)] | @tsv'
# com o ms-cameras parado: um container descartável dentro da rede do MediaMTX
docker run --rm --network container:attlas-mediamtx redis:7-alpine wget -qO- http://localhost:9997/v3/paths/list
```

**Medir a taxa de ingestão: duas leituras com 10 s de intervalo**

```bash
for i in 1 2; do docker exec attlas-ms-cameras wget -qO- http://mediamtx:9997/v3/paths/list \
  | python3 -c 'import json,sys; [print(p["name"], p.get("inboundBytes")) for p in json.load(sys.stdin)["items"]]'; sleep 10; done
```

**Ver por que a puxada de um path falhou**

```bash
docker exec attlas-ms-cameras wget -qO- http://mediamtx:9997/v3/paths/static-sources/get/<path>     # campo lastError
docker exec attlas-ms-cameras wget -qO- http://mediamtx:9997/v3/paths/get/<path>
```

**Listar sessões de leitura**

```bash
docker exec attlas-ms-cameras wget -qO- http://mediamtx:9997/v3/webrtc/sessions/list
docker exec attlas-ms-cameras wget -qO- http://mediamtx:9997/v3/hls/sessions/list
docker exec attlas-ms-cameras wget -qO- http://mediamtx:9997/v3/rtsp/sessions/list
```

**Ler o log do MediaMTX**

```bash
docker compose logs --tail 300 mediamtx | grep -E ' (ERR|WAR) |<cameraId>'
```

As medições de FPS, GOP e bitrate no próprio path estão em [[#ffmpeg, ffprobe e ffplay]], com
`RTSP=rtsp://localhost:8554/<cameraId>-primary`.

### Leitura do resultado

| Saída | O que significa |
| --- | --- |
| `available` verdadeiro (`True` no Python, `true` no jq) com leitores | puxada viva |
| `available` falso sem `lastError` | path ocioso, o normal sob demanda |
| `available` verdadeiro com zero leitores por mais de 30 s | configuração errada: sem leitor, o path deveria fechar |
| `inboundBytes` da segunda leitura menos o da primeira, vezes 8, dividido por 10 | bitrate de entrada do path, em bit/s |
| `lastError` com `bad status code: 401` | credencial da câmera errada |
| `lastError` com `bad status code: 4xx` num path `-h265` | a câmera não serve H.265 nesse perfil; o serviço volta para H.264 |
| `inboundBytes` liso enquanto o navegador congela | a perda está depois do MediaMTX, no transporte WebRTC |
| boot no log sem `reloading configuration (API request)` | o container reiniciou; os paths sumiram e os players reconectam sozinhos |

### Armadilhas

| O que dá errado | Como evitar |
| --- | --- |
| `docker compose exec mediamtx wget ...` falha: a imagem `bluenviron/mediamtx:1.21.1` só tem o binário, sem shell e sem `wget` | chamar a API de outro container, como acima |
| `/v3/config/paths/list` e `/v3/config/paths/get` devolvem a URL RTSP com a senha da câmera | não colar a saída; a 9997 nunca é publicada fora de `127.0.0.1` |
| `curl localhost:9998/metrics` | o MediaMTX está com `metrics: no`; a porta não responde |
| Campo `online` | engana em path sob demanda; ler `available` |
| Mudar campo global da configuração em tempo de execução | derruba todas as sessões |
| Configuração nova de um path com leitores fica adiada até o path ficar ocioso | não derrubar leitores para forçar; com o path ocioso, `PATCH /v3/config/paths/patch/<path>` aplica na hora |
| `ss` no host não mostra as puxadas RTSP do MediaMTX | o socket mora na rede do container; usar `nsenter`, como em [[#Rede do host]] |
| O RTSP do MediaMTX aceita só TCP (`rtspTransports: [tcp]`) | cliente sempre com `-rtsp_transport tcp` |
| `docker exec attlas-ms-cameras ffmpeg` | a imagem do `ms-cameras` não tem `ffmpeg` |

## ffmpeg, ffprobe e ffplay

### Para que serve

O ffprobe lê o stream sem decodificar (codec, resolução, quadros e pacotes), o ffmpeg decodifica, grava e tira quadro, e
o ffplay mostra o vídeo. Com eles se separa defeito da câmera de defeito do Attlas.

### Comandos

**Montar a URL do teste**

```bash
CAM=<ip da câmera>
RTSP="rtsp://$CRED@$CAM:554/axis-media/media.amp"           # Axis
RTSP="rtsp://$CRED@$CAM:554/Streaming/Channels/101"          # Hikvision, canal principal (102 é o secundário)
RTSP="rtsp://localhost:8554/<cameraId>-primary"              # path do MediaMTX, no host da stack
```

**Abrir e assistir com o menor atraso**

```bash
ffplay -rtsp_transport tcp -fflags nobuffer -flags low_delay -framedrop "$RTSP"
```

**Ver codec, perfil, resolução e FPS declarado**

```bash
ffprobe -v error -rtsp_transport tcp -i "$RTSP" -select_streams v:0 \
  -show_entries stream=codec_name,profile,level,width,height,r_frame_rate,avg_frame_rate,has_b_frames -of default=nw=1
```

**Medir o FPS real**

```bash
ffmpeg -rtsp_transport tcp -i "$RTSP" -an -t 20 -f null - 2>&1 | tr '\r' '\n' | grep 'fps=' | tail -1
```

**Medir o GOP**

```bash
# instante de cada keyframe em 20 s; a diferença entre linhas é o GOP em segundos
ffprobe -v error -rtsp_transport tcp -i "$RTSP" -select_streams v:0 -skip_frame nokey \
  -show_entries frame=pts_time -of csv=p=0 -read_intervals '%+20'
# tipo (I, P, B) e tamanho de cada quadro
ffprobe -v error -rtsp_transport tcp -i "$RTSP" -select_streams v:0 \
  -show_entries frame=pts_time,pict_type,pkt_size -of csv=p=0 -read_intervals '%+20'
```

**Medir o bitrate real em 30 s**

```bash
ffprobe -v error -rtsp_transport tcp -i "$RTSP" -select_streams v:0 \
  -show_entries packet=size -of csv=p=0 -read_intervals '%+30' | awk '{s+=$1} END {print s*8/30/1000 " kbit/s"}'
```

**Tirar um quadro**

```bash
ffmpeg -rtsp_transport tcp -i "$RTSP" -frames:v 1 -q:v 2 quadro.jpg
```

**Gravar um trecho sem recodificar**

```bash
ffmpeg -rtsp_transport tcp -i "$RTSP" -t 10 -c copy -an trecho.mp4
```

**Medir o tempo até o primeiro pacote de vídeo**

```bash
time ffprobe -v error -rtsp_transport tcp -timeout 15000000 -i "$RTSP" -select_streams v:0 \
  -show_entries packet=pts_time -of csv=p=0 -read_intervals '%+#1'
```

**Testar a latência ponta a ponta**

```bash
# na câmera e no path do MediaMTX, um de cada vez, com a câmera filmando um cronômetro em milissegundos
ffplay -rtsp_transport tcp -fflags nobuffer -flags low_delay -framedrop "rtsp://$CRED@$CAM:554/axis-media/media.amp"
ffplay -rtsp_transport tcp -fflags nobuffer -flags low_delay -framedrop "rtsp://localhost:8554/<cameraId>-primary"
```

**Pedir à Axis um perfil reduzido pela URL**

```bash
ffplay -rtsp_transport tcp "rtsp://$CRED@$CAM:554/axis-media/media.amp?resolution=1280x720&videocodec=h264&h264profile=baseline&videokeyframeinterval=15"
```

### Leitura do resultado

| Saída | O que significa |
| --- | --- |
| `codec_name=h264`, `profile=Constrained Baseline` ou `Main`, `has_b_frames=0` | o que o WebRTC toca em qualquer navegador |
| `codec_name=hevc` | H.265; toca só onde há decodificação por hardware |
| intervalo entre keyframes | é a espera de cada tile novo; no path de uma Axis provisionada pelo Attlas, o keyframe vem a cada `round(fps x 0,3)` quadros |
| `avg_frame_rate` abaixo de `r_frame_rate` | a câmera entrega menos quadros que o nominal |
| `401 Unauthorized` | credencial errada |
| `method DESCRIBE failed: 404 Not Found` | caminho RTSP errado, ou path inexistente no MediaMTX |
| `Connection timed out` ou `No route to host` | rota (tailnet, `aquario-server`) ou porta 554 fechada |
| `RTP: missed N packets` | perda em UDP; usar `-rtsp_transport tcp` |
| `Could not find ref with POC` ou `concealing N errors` | defeito no encoder ou no transporte, não no player |
| tempo até o primeiro pacote acima de 5 s | partida lenta da câmera, como com MBR na URL |
| latência ponta a ponta | numa foto que pegue a tela do cronômetro e a janela do ffplay, a diferença entre os dois números; medir na câmera e no path separa o atraso de cada trecho |

### Armadilhas

| O que dá errado | Como evitar |
| --- | --- |
| Cada ffprobe ou ffplay na câmera abre uma puxada a mais, além da do MediaMTX | medir no path do MediaMTX; ir à câmera só quando o path é o suspeito |
| `-stimeout` não existe mais do ffmpeg 5 em diante | `-timeout <microssegundos>` |
| Senha com `@`, `:` ou `/` dentro da URL RTSP | codificar em porcentagem: `@` vira `%40` |
| URL com credencial aparece em `ps` e no histórico do shell | montar a URL com `$CRED` e não colar saída de `ps` |
| `videobitratemode=mbr` na URL da Axis faz o RTSP levar cerca de 12 s para responder, e o MediaMTX desiste da fonte | não usar MBR em tier H.264 |
| Parâmetro de URL ignorado pela Axis | só vale em `/axis-media/media.amp`; câmera cadastrada com `/onvif-media/` serve o próprio perfil |
| `ffplay` no dev.v2 | o servidor não tem tela; lá só ffprobe e ffmpeg |

## ONVIF

### Para que serve

ONVIF é o protocolo SOAP comum entre fabricantes. O `ms-cameras` lê por ele identidade, perfis de mídia, URL de stream e
eventos, pela biblioteca `@atmanadmin/node-onvif-ts`; os comandos abaixo repetem essas chamadas fora do Attlas.

### Comandos

**Descobrir câmeras ONVIF na rede local**

```bash
# local, na raiz do repositório; só acha câmera no mesmo segmento de rede
node -e "require('@atmanadmin/node-onvif-ts').startProbe().then(l => l.forEach(d => console.log(d.name, d.xaddrs[0])))"
```

**Carregar a função de chamada com WS-Security**

```bash
# uso: onvif <XAddr do serviço> '<corpo SOAP>'; lê usuário e senha de $CRED
onvif() {
  local user=${CRED%%:*} pass=${CRED#*:} created nonce_file nonce digest
  created=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  nonce_file=$(mktemp)
  openssl rand 16 > "$nonce_file"
  nonce=$(base64 < "$nonce_file")
  digest=$({ cat "$nonce_file"; printf '%s%s' "$created" "$pass"; } | openssl dgst -sha1 -binary | base64)
  rm -f "$nonce_file"
  curl -s --max-time 10 -H 'Content-Type: application/soap+xml; charset=utf-8' --data-binary @- "$1" <<EOF
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Header><wsse:Security s:mustUnderstand="1" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"><wsse:UsernameToken><wsse:Username>$user</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">$digest</wsse:Password><wsse:Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">$nonce</wsse:Nonce><wsu:Created>$created</wsu:Created></wsse:UsernameToken></wsse:Security></s:Header><s:Body>$2</s:Body></s:Envelope>
EOF
}
```

**Ler a hora da câmera, a identidade e os endereços dos serviços**

```bash
onvif "http://$CAM/onvif/device_service" "<GetSystemDateAndTime xmlns='http://www.onvif.org/ver10/device/wsdl'/>"
onvif "http://$CAM/onvif/device_service" "<GetDeviceInformation xmlns='http://www.onvif.org/ver10/device/wsdl'/>"
onvif "http://$CAM/onvif/device_service" \
  "<GetCapabilities xmlns='http://www.onvif.org/ver10/device/wsdl'><Category>All</Category></GetCapabilities>" | grep -oE 'XAddr>[^<]+'
```

**Listar perfis e pedir a URL de stream**

```bash
XADDR_MEDIA=<XAddr do serviço de mídia>
onvif "$XADDR_MEDIA" "<GetProfiles xmlns='http://www.onvif.org/ver10/media/wsdl'/>" \
  | grep -oE 'Profiles token="[^"]+"|(Encoding|Width|Height|FrameRateLimit|BitrateLimit|GovLength)>[^<]+'
PROFILE=<token do perfil>
onvif "$XADDR_MEDIA" "<GetStreamUri xmlns='http://www.onvif.org/ver10/media/wsdl'><StreamSetup><Stream xmlns='http://www.onvif.org/ver10/schema'>RTP-Unicast</Stream><Transport xmlns='http://www.onvif.org/ver10/schema'><Protocol>RTSP</Protocol></Transport></StreamSetup><ProfileToken>$PROFILE</ProfileToken></GetStreamUri>" \
  | grep -oE 'Uri>[^<]+'
```

**Mover o PTZ, parar e usar presets**

```bash
XADDR_PTZ=<XAddr do serviço de PTZ>
onvif "$XADDR_PTZ" "<GetStatus xmlns='http://www.onvif.org/ver20/ptz/wsdl'><ProfileToken>$PROFILE</ProfileToken></GetStatus>"
onvif "$XADDR_PTZ" "<ContinuousMove xmlns='http://www.onvif.org/ver20/ptz/wsdl'><ProfileToken>$PROFILE</ProfileToken><Velocity><PanTilt xmlns='http://www.onvif.org/ver10/schema' x='0.3' y='0'/></Velocity></ContinuousMove>"
onvif "$XADDR_PTZ" "<Stop xmlns='http://www.onvif.org/ver20/ptz/wsdl'><ProfileToken>$PROFILE</ProfileToken><PanTilt>true</PanTilt><Zoom>true</Zoom></Stop>"
onvif "$XADDR_PTZ" "<GetPresets xmlns='http://www.onvif.org/ver20/ptz/wsdl'><ProfileToken>$PROFILE</ProfileToken></GetPresets>"
onvif "$XADDR_PTZ" "<GotoPreset xmlns='http://www.onvif.org/ver20/ptz/wsdl'><ProfileToken>$PROFILE</ProfileToken><PresetToken>$PRESET</PresetToken></GotoPreset>"
```

**Fazer o mesmo em Python, com o onvif-zeep**

```python
# pip install onvif-zeep; rodar com CAM e CRED exportados (export CAM CRED)
import os, time
from onvif import ONVIFCamera

user, pwd = os.environ["CRED"].split(":", 1)
cam = ONVIFCamera(os.environ["CAM"], 80, user, pwd)
print(cam.create_devicemgmt_service().GetDeviceInformation())

media = cam.create_media_service()
token = media.GetProfiles()[0].token
print(media.GetStreamUri({"StreamSetup": {"Stream": "RTP-Unicast", "Transport": {"Protocol": "RTSP"}}, "ProfileToken": token}))

ptz = cam.create_ptz_service()
ptz.ContinuousMove({"ProfileToken": token, "Velocity": {"PanTilt": {"x": 0.3, "y": 0.0}}})
time.sleep(1)
ptz.Stop({"ProfileToken": token})
```

### Leitura do resultado

| Saída | O que significa |
| --- | --- |
| `GetSystemDateAndTime` responde | ONVIF ligado; comparar a hora UTC dela com a da máquina |
| `NotAuthorized` ou `Sender not authorized` no `Fault` | credencial errada, ou relógio da câmera fora por mais de alguns minutos |
| HTTP 404 em `/onvif/device_service` | ONVIF desligado, o padrão de fábrica da Hikvision |
| HTTP 401 sem corpo SOAP | a câmera quer HTTP Digest além do WS-Security: acrescentar `--digest -u "$CRED"` ao `curl` da função |
| lista de `XAddr>` | URL de cada serviço (device, media, events, imaging, PTZ), na ordem que a câmera responde |
| `Uri>rtsp://...` | URL RTSP do perfil; `&amp;` nela é o `&` escapado pelo XML |

### Armadilhas

| O que dá errado | Como evitar |
| --- | --- |
| A descoberta por multicast não atravessa a tailnet | câmera de outra rede se testa direto pelo IP |
| Relógio da câmera fora gera `NotAuthorized` genérico | conferir `GetSystemDateAndTime` antes de suspeitar da senha |
| Hikvision com ONVIF desligado parece credencial errada | testar pelo ISAPI, em [[#ISAPI da Hikvision]] |
| Os usuários ONVIF da Hikvision são uma lista separada dos usuários da interface web | conferir em `ISAPI/Security/ONVIF/users` |
| `ContinuousMove` sem `Stop` | a câmera segue girando; mandar sempre o `Stop` |
| A biblioteca `node-onvif-ts` devolve `http://` no `GetStreamUri` | o `ms-cameras` troca o esquema para `rtsp://`; pelo `curl`, a câmera responde a URL certa |
| O caminho do XAddr muda por fabricante | ler o `XAddr` do `GetCapabilities` em vez de supor |

## VAPIX da Axis

### Para que serve

VAPIX é a API HTTP das câmeras Axis, com autenticação Digest. O `ms-cameras` usa por ela quadro JPEG, parâmetros de
bitrate e codecs, PTZ, apps instalados (ACAP), gravações do cartão SD e o WebSocket de eventos.

### Comandos

**Ler identidade, codecs e bitrate configurado**

```bash
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/param.cgi?action=list&group=Brand"
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/param.cgi?action=list&group=Properties.System"
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/param.cgi?action=list&group=Properties.Image"
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/param.cgi?action=list&group=Image.I0.RateControl"
```

**Tirar um quadro JPEG**

```bash
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/jpg/image.cgi?resolution=320x240&compression=35" -o miniatura.jpg   # a miniatura do Attlas
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/jpg/image.cgi" -o quadro.jpg                                        # resolução nativa
```

**Ver apps instalados, log do sistema e gravações**

```bash
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/applications/list.cgi"
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/systemlog.cgi"
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/record/list.cgi"
```

**Comandar o PTZ**

```bash
PTZ="http://$CAM/axis-cgi/com/ptz.cgi"
curl -s --digest -u "$CRED" "$PTZ?query=position"
curl -s --digest -u "$CRED" "$PTZ?query=limits"
curl -s --digest -u "$CRED" "$PTZ?continuouspantiltmove=40,0"    # pan para a direita
curl -s --digest -u "$CRED" "$PTZ?continuouspantiltmove=0,0"     # parar pan e tilt
curl -s --digest -u "$CRED" "$PTZ?continuouszoommove=50"         # zoom
curl -s --digest -u "$CRED" "$PTZ?continuouszoommove=0"          # parar zoom
curl -s --digest -u "$CRED" "$PTZ?pan=10&tilt=-5&zoom=2000"      # absoluto, em unidades nativas
curl -s --digest -u "$CRED" "$PTZ?rpan=5&rtilt=0"                # relativo
curl -s --digest -u "$CRED" "$PTZ?query=presetposall"
curl -s --digest -u "$CRED" "$PTZ?gotoserverpresetno=1"
```

**Reiniciar a câmera quando o pipeline de vídeo travou**

```bash
curl -s --digest -u "$CRED" -X POST "http://$CAM/axis-cgi/restart.cgi"
```

### Leitura do resultado

| Saída | O que significa |
| --- | --- |
| linhas `root.<grupo>.<parâmetro>=<valor>` | resposta do `param.cgi`; em `Image.I0.RateControl` estão o modo e os limites de bitrate |
| `# Error:` na resposta do `param.cgi` | grupo ou parâmetro que o modelo não tem |
| app com `Status="Running"` no `applications/list.cgi` | o ACAP está rodando |
| 401 mesmo com `--digest` | credencial errada |
| `query=position` com `pan`, `tilt` e `zoom` | posição atual do PTZ, nas unidades nativas da câmera |

### Armadilhas

| O que dá errado | Como evitar |
| --- | --- |
| `videobitratemode=mbr&videomaxbitrate=N` na URL RTSP: partida de cerca de 12 s | nunca em tier H.264; `videobitrate` é ignorado pela câmera |
| Alternar parâmetro de sensor (Defog, HighlightsRecovery) em sequência reinicia o pipeline de vídeo e pode derrubá-lo | mexer uma vez, medir e parar |
| Depois do `restart.cgi`, o produtor do ACAP volta desligado | religar como em [[Analítico - Runbook - Embarcado]] |
| PTZ contínuo sem a parada | a câmera segue girando; mandar sempre `continuouspantiltmove=0,0` e `continuouszoommove=0` |
| SSH como root na Axis é recusado | ler o log pelo `systemlog.cgi` |
| `Layout.DefaultVideoFormat=av1` na câmera com analítico | é o padrão da interface web e fica assim; não trocar |

## ISAPI da Hikvision

### Para que serve

ISAPI é a API HTTP da Hikvision, sempre ligada e com HTTP Digest, usando o mesmo usuário do painel web. O `ms-cameras`
usa por ela identidade, status de reserva da saúde, canais e bitrate, quadro JPEG, o canal de eventos e a ativação do
ONVIF no cadastro.

### Comandos

**Saber se o ONVIF está ligado, sem credencial**

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://$CAM/onvif/device_service"
```

**Ler identidade e status**

```bash
curl -s --digest -u "$CRED" "http://$CAM/ISAPI/System/deviceInfo"
curl -s --digest -u "$CRED" "http://$CAM/ISAPI/System/status"
```

**Ler canais de vídeo e bitrate configurado**

```bash
curl -s --digest -u "$CRED" "http://$CAM/ISAPI/Streaming/channels"
curl -s --digest -u "$CRED" "http://$CAM/ISAPI/Streaming/channels/101"
```

**Tirar um quadro JPEG**

```bash
curl -s --digest -u "$CRED" "http://$CAM/ISAPI/Streaming/channels/102/picture" -o miniatura.jpg   # canal secundário, a miniatura do Attlas
curl -s --digest -u "$CRED" "http://$CAM/ISAPI/Streaming/channels/101/picture" -o quadro.jpg      # canal principal
```

**Acompanhar o canal de eventos**

```bash
curl -sN --digest -u "$CRED" --max-time 30 "http://$CAM/ISAPI/Event/notification/alertStream"
curl -s --digest -u "$CRED" "http://$CAM/ISAPI/Event/capabilities"
```

**Ver a integração ONVIF e as contas dela**

```bash
curl -s --digest -u "$CRED" "http://$CAM/ISAPI/System/Network/Integrate"      # bloco <ONVIF><enable>
curl -s --digest -u "$CRED" "http://$CAM/ISAPI/Security/ONVIF/users"
```

**Saber se há PTZ de verdade**

```bash
curl -s --digest -u "$CRED" "http://$CAM/ISAPI/PTZCtrl/channels/1/capabilities"
```

### Leitura do resultado

| Saída | O que significa |
| --- | --- |
| `404` em `/onvif/device_service` | ONVIF desligado |
| `401` em `/onvif/device_service` | ONVIF ligado, pedindo autenticação |
| `deviceInfo` com `<model>` e `<firmwareVersion>` | câmera de pé e credencial válida |
| `<enable>false</enable>` no bloco ONVIF do `Integrate` | falta ligar o ONVIF; o cadastro do Attlas liga sozinho, e à mão é em Configuration, Network, Advanced Settings, Integration Protocol |
| `Invalid Operation` com `subStatusCode` `notSupport` no `PTZCtrl` | câmera fixa, sem motor |
| blocos `EventNotificationAlert` chegando no `alertStream` | canal de eventos vivo; o `ms-cameras` dá a conexão por morta depois de 30 s sem dados |

### Armadilhas

| O que dá errado | Como evitar |
| --- | --- |
| A interface web desenha setas, zoom e presets até em câmera fixa | a capacidade real vem do `PTZCtrl/.../capabilities` |
| ONVIF desligado responde 404 mesmo com credencial certa e parece problema de senha ou de rede | se o ISAPI responde, a câmera e a credencial estão boas |
| Canal é câmera vezes 100 mais o stream: 101 principal, 102 secundário | no Attlas a Hikvision tem no máximo dois tiers |
| Smart codec (H.264+ ou H.265+) gera GOP longo e variável | desligar para vídeo ao vivo |
| A Hikvision de bancada fica fora da tailnet | só responde a partir da rede local do escritório |

## Rede do host

### Para que serve

Estes comandos respondem se o caminho até a câmera, o serviço ou o navegador está de pé, e quem está falando com quem.
Servem no dev.v2 e na máquina local; os que olham dentro de container pedem `sudo`.

### Comandos

**Conferir o roteador da LAN de câmeras**

```bash
tailscale ping 100.77.100.21
tailscale status --json | jq '.Peer[] | select(.DNSName | startswith("aquario-server")) | {Online, LastHandshake, RxBytes, TxBytes}'
ping -c 5 10.1.1.79
```

**Saber se uma porta responde**

```bash
nc -vz "$CAM" 80
nc -vz "$CAM" 554
```

**Ver as conexões abertas por um container**

```bash
PID=$(docker inspect -f '{{.State.Pid}}' attlas-mediamtx)
sudo nsenter -t "$PID" -n ss -tn state established '( dport = :554 )'     # puxadas RTSP do MediaMTX
PID=$(docker inspect -f '{{.State.Pid}}' attlas-ms-cameras)
sudo nsenter -t "$PID" -n ss -tan                                          # todas as conexões do ms-cameras
```

**Saber qual container fala com a câmera, antes do NAT**

```bash
docker network ls --filter name=attlas-net --format '{{.ID}} {{.Name}}'    # a interface da bridge é br-<ID>
sudo tcpdump -i br-<ID> -nn -q "host $CAM"
docker network inspect <rede> --format '{{range .Containers}}{{.IPv4Address}} {{.Name}}{{println}}{{end}}'
```

**Ver RTT e janela TCP dos navegadores na borda**

```bash
# no dev.v2
ss -ti '( sport = :443 )'
```

**Conferir as regras do Docker no iptables**

```bash
sudo iptables -S FORWARD | grep -E 'DOCKER|br-'
sudo iptables -A FORWARD -o br-<ID> -j DOCKER       # repõe o salto que uma atualização do Tailscale removeu
systemctl status fix-docker-forward.service
sudo iptables -L DOCKER-USER -n -v                  # filtro das portas publicadas pelo Docker
```

**Conferir o ajuste de TCP do host**

```bash
sysctl net.ipv4.tcp_congestion_control net.ipv4.tcp_slow_start_after_idle
```

O tempo de cada fase de uma chamada HTTP está em [[#API do Attlas por HTTP]].

### Leitura do resultado

| Saída | O que significa |
| --- | --- |
| `pong from aquario-server (100.77.100.21) via DERP(sao) in ...` | caminho por relay; funciona, com mais atraso |
| `pong from aquario-server (100.77.100.21) via <ip>:<porta> in ...` | caminho direto |
| sem pong, `LastHandshake` em `0001-01-01` e `RxBytes` zero | o Tailscale do `aquario-server` parou; o conserto é no local |
| `10.1.1.79` responde e `10.11.x.x` volta com erro de destino inalcançável | o `aquario-server` está de pé, mas perdeu a rede de campo atrás dele |
| `nc` com `succeeded`, `refused` ou timeout | porta aberta; host responde e porta fechada; filtro ou falta de rota |
| mais de uma conexão `:554` por path aberto no MediaMTX | tier, codec, Sistema ou videowall abrindo paths distintos para a mesma câmera |
| `CLOSE-WAIT` acumulando, ou `ESTAB` acima das abas abertas | vazamento de conexão no serviço |
| `minrtt` e `cwnd` no `ss -ti` | menor ida e volta medida e janela de congestionamento de cada cliente |
| salto `-j DOCKER` ausente na `FORWARD` | WebRTC e UDP públicos mortos |
| `bbr` e `0` no `sysctl` | o ajuste de rede da borda está aplicado |

### Armadilhas

| O que dá errado | Como evitar |
| --- | --- |
| `ss` no host não mostra socket de container | entrar na rede do container com `nsenter -t <pid> -n` |
| Conexão que chega pela tailnet num container aparece vinda do gateway da bridge (no dev.v2, `172.18.0.1`), porque o Tailscale faz MASQUERADE | allowlist por IP de origem dentro do container não identifica quem vem pela tailnet |
| Porta publicada pelo Docker não passa pelo firewall de entrada do host | restringir no security group, na cadeia `DOCKER-USER` ou no bind por IP do compose |
| Atualizar o Tailscale do host remove o salto da `FORWARD` para o `DOCKER` | manter o `fix-docker-forward.service` habilitado |
| No sumo, VM em bridge pinga o host e não sai: o Docker liga `bridge-nf-call-iptables` com `FORWARD` em DROP | `iptables -I DOCKER-USER -i br0 -o br0 -j ACCEPT`, persistido em `br0-forward-accept.service` |
| Reiniciar o Tailscale do dev.v2 quando o `aquario-server` caiu | não resolve e atrapalha as outras câmeras; o defeito está no roteador |

## nginx e systemd no host

### Para que serve

O nginx do host do dev.v2 termina o HTTPS de `dev.v2.attlas.atmansystems.com` e repassa para o Kong; a configuração foi
feita à mão e fica fora do repositório. O systemd mantém os serviços do sistema que sustentam rede e CI:
`fix-docker-forward.service` no dev.v2, `br0-forward-accept.service` no sumo, e `ci-scaleset.service` com os timers de
limpeza na VM do CI.

### Comandos

**Testar e recarregar o nginx**

```bash
# no dev.v2
sudo nginx -t
sudo systemctl reload nginx
sudoedit /etc/nginx/sites-available/attlas
```

**Ler o tráfego da borda**

```bash
sudo tail -f /var/log/nginx/access.log
sudo awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn                 # contagem por status
sudo awk '{print $7}' /var/log/nginx/access.log | sed -E 's/[0-9a-f-]{36}/:id/g; s/\?.*//' | sort | uniq -c | sort -rn | head -20
sudo tail -n 100 /var/log/nginx/error.log
```

**Ver estado e log de um serviço do systemd**

```bash
systemctl status <unit>
journalctl -u <unit> -n 200 --no-pager
journalctl -u <unit> -f
systemctl list-timers
```

**Operar a VM do CI**

```bash
# na VM ci-runner
sudo journalctl -u ci-scaleset -f
journalctl -t ci-disk-watch -p warning
sudo dmesg -T | grep -iE 'killed process|out of memory'
sudo /usr/local/bin/ci-runner-drain.sh --poweroff     # manutenção: para o scale set, espera os jobs e desliga a VM
```

**Ver o cache remoto do Nx**

```bash
# no sumo
cd ~/nx-cache && docker compose ps
```

### Leitura do resultado

| Saída | O que significa |
| --- | --- |
| `nginx: configuration file /etc/nginx/nginx.conf test is successful` | pode recarregar |
| linha `101` de 109 bytes no `access.log` | WebSocket que abriu e fechou sem entrar no namespace; em geral, front local de desenvolvedor apontado para o dev.v2 |
| SSE parado com `body_bytes_sent` mais 432 múltiplo de 16384 | o nginx segurou blocos TLS de 16 KiB; a rota precisa da âncora `*sse-edge-unbuffered-plugin` no `docker/kong.yml` |
| `Active: active (exited)` num serviço `oneshot` | a regra foi aplicada no boot e o serviço terminou, o normal |
| aviso do `ci-disk-watch` | disco da VM do CI acima de 75% ou de 88% |
| `Killed process` no `dmesg` | o kernel matou processo por falta de memória |

### Armadilhas

| O que dá errado | Como evitar |
| --- | --- |
| A configuração do nginx, o ajuste de TCP (`/etc/sysctl.d/99-attlas-edge.conf`) e o `ci-scaleset` existem só nos hosts | um host recriado perde tudo; a mudança precisa ser repetida à mão |
| O nginx do host comprime só `text/html` | a compressão de JSON é do Kong; `text/event-stream` não se comprime |
| `reload` com configuração quebrada | rodar `nginx -t` antes |
| Medo de reiniciar o `ci-scaleset` | é seguro: os jobs em curso rodam em units próprias |

## Git e GitHub CLI

### Para que serve

O `git` lê a `develop` sem trocar de branch. O `gh` acompanha PRs, checks, runs e logs de job do
`atmanadmin/attlas-2026` e dispara CI e deploy.

### Comandos

**Ler a develop sem checkout**

```bash
# local, no repositório
git fetch origin
git show origin/develop:<arquivo>
git log --oneline --since=<AAAA-MM-DD> origin/develop -- <caminho>
git grep -n '<termo>' origin/develop -- apps libs docker
```

**Acompanhar PRs**

```bash
gh pr list --author @me
gh pr view <n> --json author,title,state,reviewDecision,latestReviews,mergeable
gh pr diff <n>
gh pr list --base develop --state merged -L 10 --json number,title,mergedAt     # o que entrou por último
```

**Acompanhar checks e runs**

```bash
gh pr checks <n> --watch
gh run list --workflow ci-pr.yml --branch <branch> -L 5
gh run watch <run-id>
gh run view <run-id> --log-failed
gh run view --job <job-id> --log
gh run rerun <run-id> --failed
gh workflow run ci-pr.yml --ref <branch>       # PR empilhada, que não ganha check sozinha
```

**Fazer deploy no dev.v2**

```bash
gh run list --workflow ci-develop.yml -L 3                    # o Build & Push precisa estar verde antes
gh workflow run deploy.yml                                    # todos os serviços com código
gh workflow run deploy.yml -f projects=ms-cameras,web-attlas
gh run list --workflow deploy.yml -L 3
```

**Mudar título, corpo e responsável de uma PR**

```bash
gh api repos/atmanadmin/attlas-2026/pulls/<n> -X PATCH -f title='<título>' -F body=@corpo.md
gh api repos/atmanadmin/attlas-2026/issues/<n>/assignees -X POST -f 'assignees[]=afonsoburginski'
gh pr view <n> --json title,assignees
```

### Leitura do resultado

| Saída | O que significa |
| --- | --- |
| `Integration Test` como `skipping` | desligado de propósito nos dois workflows; não é falha |
| PR sem nenhum check | a base não é `develop` (PR empilhada) |
| `Build` vermelho com `Application bundle generation failed` sem erro | saída cortada em 64 KiB; reconstruir o merge commit na VM do CI com `--outputStyle=stream` |
| rerun continua vermelho depois de a `develop` corrigir | o rerun reusa o merge commit antigo; empurrar commit ou usar "Update branch" |
| `nx: not found` ou `Could not find Nx modules` | `node_modules` da vaga do runner corrompido; apagar `node_modules/.attlas-lock-hash` da vaga e rodar de novo |
| `reviewDecision` `APPROVED` | basta para o merge, que é feito à mão pelo dono |

### Armadilhas

| O que dá errado | Como evitar |
| --- | --- |
| `gh pr edit` falha com erro de "Projects (classic)" e às vezes sai com código 0 | usar a REST acima e conferir com `gh pr view` |
| Ler CI verde como suíte de teste verde | nenhum job roda teste unitário e a integração está desligada; o verde cobre lint, validadores e build |
| Escrever em PR de outra pessoa | nada de commit, push, merge, rebase ou deleção da branch dela; conferir `gh pr view <n> --json author` antes de qualquer escrita |
| Pedir novo review a quem já aprovou | só quem está em `CHANGES_REQUESTED` no `latestReviews` recebe pedido novo |
| CI vermelho que parece sem causa | olhar as PRs mergeadas na `develop` nas últimas horas antes de diagnosticar |
| Deploy derruba streams e WebSockets por 2 a 4 min | disparar à mão, só com o Build & Push verde |

## Variáveis usadas nesta nota

`<svc>`, `<ms>` e os outros textos entre `<>` não são variáveis: trocam-se à mão. `<svc>` é o nome do serviço no
compose, igual ao nome do projeto no Nx (`ms-cameras`). Variável usada por script Python precisa de `export`.

| Variável | O que é | Onde obter |
| --- | --- | --- |
| `$ATTLAS_API` | URL base do Kong | local `http://localhost:8000`; dev.v2 `https://dev.v2.attlas.atmansystems.com`; Dell pela tailnet `http://afonso-dell-14-dc14250.tail4b16e5.ts.net:8000` |
| `$ATTLAS_USER`, `$ATTLAS_PASS` | e-mail e senha de login no Attlas | `BOOTSTRAP_MASTER_EMAIL` e `BOOTSTRAP_MASTER_PASSWORD` em `apps/ms-organization/.env` (local) ou em `~/apps/ms-organization/.env.docker` (dev.v2) |
| `$TOKEN` | access token JWT | login em [[#API do Attlas por HTTP]], ou o header `Authorization` de uma requisição no DevTools |
| `$SYSTEM_ID` | id do Sistema, mandado no header `System-Id` | `GET /api/organization/systems/me/overview`, ou o header `system-id` no DevTools |
| `$METRICS_SCRAPE_TOKEN` | credencial do `/metrics` dos serviços | `METRICS_SCRAPE_TOKEN` no `.env` do serviço (local) ou no `~/apps/<ms>/.env.docker` (dev.v2); para o Prometheus local, o arquivo `docker/observability/metrics-token`, que fica fora do git |
| `$CAM` | IP da câmera | coluna `ipAddress` da tabela `Camera`; as câmeras de bancada estão em [[Câmeras - Integração com dispositivo - Runbook]] |
| `$CRED` | `usuário:senha` da câmera | tabela `CameraCredential` do `attlas-db-cameras`, pelo comando em [[#Banco de dados]] |
| `$RTSP` | URL RTSP do teste | montada com `$CRED` e `$CAM`, em [[#ffmpeg, ffprobe e ffplay]] |
| `$XADDR_MEDIA`, `$XADDR_PTZ` | URL dos serviços ONVIF de mídia e de PTZ | saída do `GetCapabilities` |
| `$PROFILE`, `$PRESET` | token do perfil de mídia e do preset ONVIF | saída do `GetProfiles` e do `GetPresets` |
| `$REDIS_PASS` | senha de um Redis com `requirepass` | `command:` do serviço no `docker-compose.yml`, ou `REDIS_PASSWORD` no `.env` do serviço |
| `$PID` | PID do processo principal de um container | `docker inspect -f '{{.State.Pid}}' <container>` |
| `100.77.100.21` | IP do `aquario-server` na tailnet | `tailscale status` |
| `aws-attlas-dev-v2` | nome do dev.v2 na tailnet | `tailscale status` |
| `10.1.1.115` | sumo na LAN | alias `sumo` no `~/.ssh/config` |
| `192.168.122.66` | VM `ci-runner`, na rede NAT do libvirt do sumo | `virsh --connect qemu:///system net-dhcp-leases default`, no sumo |
| `~/.ssh/id_ed25519_aws_attlas` | chave SSH do dev.v2 | já referenciada pelo alias `aws-attlas-26` |
| senhas de SSH do sumo e das VMs | login e `sudo` | [[Infraestrutura - Acessos SSH]] |

## Glossário

| Termo | O que é |
| --- | --- |
| tailnet | rede privada do Tailscale; a da empresa é `atmansystems.com` |
| subnet router | nó da tailnet que anuncia uma rede física; o `aquario-server` anuncia `10.1.1.0/24` |
| DERP | servidor de relay do Tailscale, usado quando não há caminho direto entre dois nós |
| ProxyJump (`-J`) | SSH que passa por um host intermediário |
| perfil do Compose | rótulo (`full`) que deixa um serviço fora do `up` até ele ser pedido pelo nome ou por `--profile` |
| override | `docker-compose.override.yml`, carregado sozinho pelo Compose por cima do `docker-compose.yml` |
| nível do pino | número do nível de log no JSON: 30 info, 40 warn, 50 error, 60 fatal |
| consumer group | conjunto de consumidores Kafka que divide as partições de um tópico e guarda o offset lido |
| lag | quantidade de mensagens no tópico que o grupo ainda não leu |
| path | nome de um stream no MediaMTX |
| sob demanda | o MediaMTX só puxa a câmera enquanto há leitor no path e fecha a puxada 30 s depois do último |
| WHEP | protocolo HTTP com que o navegador abre um WebRTC só de recepção |
| LL-HLS | HLS de baixa latência, a reserva do player quando o WebRTC falha |
| keyframe | quadro completo, de onde um decodificador novo consegue começar |
| GOP | intervalo entre dois keyframes |
| MBR, CBR, VBR | controle de bitrate máximo, constante e variável |
| SOAP | protocolo XML sobre HTTP usado pelo ONVIF |
| WS-Security UsernameToken | credencial no cabeçalho SOAP, com a senha em digest SHA-1 de nonce, data e senha |
| XAddr | URL de um serviço ONVIF (device, media, PTZ) |
| HTTP Digest | autenticação HTTP em que a senha não trafega em texto |
| ACAP | app instalado dentro da câmera Axis |
| SSE | stream HTTP de eventos do servidor para o navegador |
| `FORWARD` | cadeia do iptables por onde passa o tráfego encaminhado entre interfaces, inclusive o dos containers |
| `DOCKER-USER` | cadeia do iptables onde entra filtro próprio para as portas publicadas pelo Docker |
| `nsenter` | roda um comando do host dentro de um namespace de outro processo, como a rede de um container |
