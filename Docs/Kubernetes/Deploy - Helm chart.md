# Helm chart `attlas` — stack Attlas no RKE2

Sobe a stack Attlas (2026) num cluster RKE2: os **7 microsserviços reais** +
infra (Kafka, Kong, PostgreSQL, Redis, Zookeeper, mailhog, mediamtx) + frontend.
**Mesmo conjunto que roda no sumo** (cluster `attlas-quito`, 22/22). Um release
por cidade. Camada de aplicação — o cluster vem de `infra/terraform/rke2-kvm/`.

Derivado do `docker-compose.yml` (mesmos nomes de service/env), então os hosts
dos `.env.docker` (`db-organization`, `kafka:29092`, `redis-organization`)
resolvem dentro do namespace. **Não altera o `docker-compose.yml`** (deploy do EC2).

## O que sobe (escopo em `values.yaml`)

- **microservices**: organization, traffic-model, pmv, cameras, connector-une,
  communication-channels, audit. (Adicione à lista para subir mais — sem template novo.)
- **databases**: 6 PostgreSQL (`emptyDir`, efêmero) — `connector-une` não tem banco, só Redis. **redis**: 3.
- **infra**: zookeeper, kafka (+ Job `kafka-init`), kong, mailhog, mediamtx. **web-attlas**.

## Pré-requisitos

1. **Imagens privadas no node** (`atmanadmin/*`). O registry é privado e o CI não
   toca o host, então carregue no containerd do node:
   ```bash
   sudo ./load-images.sh ubuntu@<ip-do-node>
   ```
   As públicas (postgres, kafka, ...) o node puxa do Docker Hub.
2. **Env dos ms** — copie de `apps/<ms>/.env.docker` (gitignored, têm credenciais):
   ```bash
   for ms in ms-organization ms-traffic-model ms-pmv ms-cameras \
             ms-connector-une ms-communication-channels ms-audit; do
     cp apps/$ms/.env.docker infra/helm/attlas/files/env/$ms.env
   done
   ```

## Instalar (por cidade)

```bash
helm install attlas ./infra/helm/attlas -n attlas --create-namespace \
  --set jwtSecret="$JWT_SECRET"   # obrigatório; mesmo valor do .env.docker dos ms
# outra cidade: aponte o --kube-context e repita (ou -f values-<cidade>.yaml)
```

## Sincronizar configs com a fonte (`docker/`)

`files/{kong.yml,kafka-topics.list,mediamtx.yml}` são cópias de `docker/`.
Se mudar o original, ressincronize:

```bash
cp docker/kong.yml docker/kafka-topics.list docker/mediamtx.yml infra/helm/attlas/files/
```

## Notas (exigências do K8s que não existem no compose)

- Service `kafka` expõe **9092 e 29092** — clientes usam `kafka:29092`; sem a
  29092 dão timeout e CrashLoop.
- `enableServiceLinks: false` em todos os pods — o Service `kafka` injeta
  `KAFKA_PORT` (compat docker-links) e quebra o entrypoint do cp-kafka.
- `kafka-init` (hook helm) cria os tópicos do `kafka-topics.list` no boot.
- `jwtSecret` não tem default versionado (é chave de assinatura): passe via
  `--set jwtSecret=...` no install, com o mesmo valor do `.env.docker` dos ms.
- Env dos ms vem dos `files/env/<ms>.env` (gitignored, copiados do `.env.docker`):
  nenhuma credencial é versionada; o ConfigMap é gerado no install a partir deles.
