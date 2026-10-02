---
tags:
  - doc
  - infra
  - observabilidade
aliases:
  - "Observabilidade CI - plano (stack completa)"
atualizado: 2026-10-01
---

# Observabilidade - Aplicação e CI

A aplicação tem stack de métricas e logs versionada em `docker/observability/`; o CI não tem
observabilidade nenhuma além do passo `Resumo` de cada job. A regra de quem pode raspar `/metrics` e o que
um label de métrica pode carregar está em `docs/architecture/observability.md` e na CROSS-062
(`metrics-scrape-authorization`).

## Aplicação

- **Stack**: projeto e rede próprios (`docker compose -f docker/observability/docker-compose.yml up -d`),
  com Prometheus em `127.0.0.1:9300`, Grafana em `127.0.0.1:9700` e a UI do Grafana Alloy em
  `127.0.0.1:9320`. O Loki não publica porta; só o Grafana chega nele. Datasources e dashboards são
  provisionados por arquivo (`grafana/dashboards/*.json`, recarga a cada 30 s).
- **Métricas**: o Prometheus raspa o `/metrics` de cada serviço pela `attlas-net`, um job por serviço.
  `/metrics` exige `Authorization: Bearer $METRICS_SCRAPE_TOKEN` (`MetricsScrapeGuard`); sem a variável o
  serviço recusa todo scrape. O token vai em `docker/observability/metrics-token`, sem quebra de linha no
  fim. O Kong expõe `/metrics` na porta 8100.
- **Logs**: o Alloy (`logs.alloy`) descobre pelo socket do Docker, a cada 5 s, os containers da
  `attlas-net` e empurra stdout e stderr para o Loki (`loki.yml`). Labels: `service` (do `SERVICE_NAME` no
  JSON do pino, ou o nome do serviço no compose), `level` e `env`. Campos filtráveis sem virar índice:
  `context`, `req_id`, `method`, `url`, `status_code`, `response_time_ms`, `err_type`, `stream`. Em consulta
  de métrica, usar `keep` antes de agregar para o `req_id` não estourar o limite de séries.
- **Retenção**: 15 dias no Prometheus e no Loki.
- **Ambiente remoto**: `PROMETHEUS_CONFIG=prometheus.remote.yml` aponta o Prometheus para outro ambiente
  através do Kong, com o `METRICS_SCRAPE_TOKEN` daquele ambiente. Os logs continuam sendo só os do Docker
  local.
- **Segurança**: portas só em `127.0.0.1`; o Loki não tem autenticação, e a única barreira contra segredo
  e dado pessoal no log é a redação do pino (`buildRedactOptions` em `libs/core-common`); o Alloy monta o
  socket do Docker. A stack é para máquina de desenvolvimento, não para host compartilhado.

> [!warning] O dev.v2 depende do `.env.docker` do host
> Serviço sem `METRICS_SCRAPE_TOKEN` no `.env.docker` do dev.v2 recusa o scrape. Conferir a chave no host
> antes de apontar um Prometheus remoto para lá; ver [[Ambientes - dev.v2, Dell e sumo#O .env.docker do host]].

## CI

Hoje o que existe é o passo `Resumo` (`scripts/ci/ci-summary.mjs`) no fim de cada job, com a tabela do que
veio do cache no resumo do run, e os alertas do `ci-disk-watch` no journal da VM. Não há Prometheus,
Grafana nem alerta de fila ou de runner; o diagnóstico é `gh run list`, `journalctl -u ci-scaleset` e
`journalctl -t ci-disk-watch -p warning`.

## Pendências

Observabilidade do CI, dentro da VM `ci-runner` e sem SaaS (o host sumo não tem RAM sobrando):

- **Fila e duração por poller**, não por webhook: um script com `gh` a cada 2 min lê runs e jobs com conta
  de colaborador (webhook exigiria admin no repositório e endpoint alcançável pelo GitHub) e emite fila
  agora, espera até iniciar e duração por job em p50 e p95, taxa de sucesso em 24 h e 7 dias, e o status
  do último run da `develop`.
- **Saúde da VM** por `node_exporter` com textfile local: units das vagas, idade do `Runner.Worker` mais
  velho (zumbi antes do reaper), volumes dangling, testcontainers vivos, sentinela do `npm ci`.
- **Cache hit do Nx** empurrado a um Pushgateway por um passo curto com `|| true`, que nunca quebra o
  CI, mais as métricas nativas do MinIO do cache remoto.
- **Alertas**: disco acima de 85% por 10 min, RAM livre baixa ou swap acima de 50%, fila parada com zero
  jobs em execução, worker acima de 80 min, volumes dangling crescendo, pipeline de métrica mudo há 48 h, e
  o serviço `ci-scaleset` fora do ar.
- Se o CI for para o ARC ([[CI - Arquitetura e runners#Pendências]]), as métricas do próprio ARC (fila,
  runners ocupados, espera) substituem o poller.

## Relacionados

[[Server e CI]] · [[CI - Arquitetura e runners]] · [[Runbook - desempenho do dev.v2]]
