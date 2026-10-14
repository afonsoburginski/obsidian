---
tags:
  - doc
  - infra
  - observabilidade
aliases:
  - "Observabilidade CI - plano (stack completa)"
  - "Observabilidade - Aplicação e CI"
  - "Infraestrutura - Observabilidade"
atualizado: 2026-10-14
---

# Infraestrutura - Observabilidade

Volta para [[Infraestrutura]].

## Resumo

A observabilidade tem três camadas. A máquina de desenvolvimento usa a stack versionada em
`docker/observability/` (Prometheus e Grafana para métricas, Loki e Grafana Alloy para logs). O ambiente dev não
tem essa stack: o Orbit lê direto as fontes do cluster e mostra tudo no Monitoramento. O CI não tem
observabilidade além do passo `Resumo` de cada job, dos alertas de disco no journal da VM e dos alertas do Orbit
sobre o runner. A regra de quem pode raspar `/metrics` e do que um label de métrica pode carregar está em
`docs/architecture/observability.md`.

| Camada | Onde | Ferramenta |
| --- | --- | --- |
| Máquina de desenvolvimento | local | Prometheus, Grafana, Loki e Alloy ([[#Stack da aplicação]]) |
| Ambiente dev | hub dev | Monitoramento do Orbit ([[#Ambiente dev]]) |
| CI | VM `ci-runner` | passo `Resumo`, journal e alertas do Orbit ([[#CI]]) |

## Stack da aplicação

| Componente | Endereço no host | Papel |
| --- | --- | --- |
| Prometheus | `http://127.0.0.1:9300` | raspa o `/metrics` de cada serviço a cada 30 s; retenção de 15 dias |
| Grafana | `http://127.0.0.1:9700` | painéis e consulta; datasources e dashboards provisionados por arquivo |
| Grafana Alloy | `http://127.0.0.1:9320` (UI) | lê o stdout e o stderr dos containers e envia ao Loki |
| Loki | sem porta no host | guarda os logs por 15 dias; só o Grafana chega nele |
| Kong | porta `8100` do `attlas-kong`, publicada no host | expõe o `/metrics` do gateway sem credencial; o Prometheus da stack não o raspa |

A stack roda em projeto e rede próprios (`attlas-observability`, rede `obs-net`), e o Prometheus entra também
na `attlas-net` para raspar cada container direto, sem passar pelo Kong. Ela exige o ecossistema de pé (a
rede `attlas-net` sai do `npm run infra:up`) e o `npm run setup:env` já executado.

Preparação, uma vez por máquina:

```bash
grep '^METRICS_SCRAPE_TOKEN=' .env | cut -d= -f2- | tr -d '\n' > docker/observability/metrics-token
cp docker/observability/grafana.env.example docker/observability/grafana.env
```

A primeira linha grava a credencial de scrape sem quebra de linha no fim, porque o Prometheus manda o
conteúdo cru no header `Authorization`. A segunda cria o arquivo com usuário e senha do admin do Grafana
(`GF_SECURITY_ADMIN_USER` e `GF_SECURITY_ADMIN_PASSWORD`), que se edita em seguida. Os dois arquivos, e o
`prometheus.remote.yml`, ficam fora do git.

Subir e derrubar:

```bash
docker compose -f docker/observability/docker-compose.yml up -d
docker compose -f docker/observability/docker-compose.yml down
```

A coleta de métricas se confere em `http://127.0.0.1:9300/targets`, um job por serviço. A coleta de logs se
confere na UI do Alloy, no componente `loki.source.docker.attlas`, um alvo por container. Em worktree, o nome
da rede muda; `ATTLAS_NETWORK=<rede>` antes do `docker compose` corrige o Prometheus e o Alloy.

## Métricas

O `/metrics` de cada serviço exige `Authorization: Bearer $METRICS_SCRAPE_TOKEN` (`MetricsScrapeGuard`, em
`libs/core-common/src/lib/observability/metrics/metrics-scrape.guard.ts`). Sem a variável, ou com ela vazia,
o serviço responde 401 a todo scrape, em qualquer ambiente; abrir o endpoint exige
`METRICS_SCRAPE_DISABLED=true` explícito. O boot nunca é recusado por isso. A credencial é a mesma em todos
os serviços e é distinta da `INTERNAL_SERVICE_TOKEN`.

Dashboard novo é um JSON em `docker/observability/grafana/dashboards/`; o Grafana recarrega a pasta a cada
30 s.

## Logs

O Alloy (`docker/observability/logs.alloy`) descobre pelo socket do Docker, a cada 5 s, os containers em
execução na `attlas-net` e envia stdout e stderr ao Loki (`docker/observability/loki.yml`). A linha é
guardada crua, com o JSON inteiro do pino.

| Label (indexado) | Origem |
| --- | --- |
| `service` | campo `service` do JSON do pino (`SERVICE_NAME`); sem ele, o nome do serviço no compose |
| `level` | o `level` do pino, a severidade do log do nginx, o status do log de acesso, ou stderr como `error` em linha que não é JSON de um `ms-*` |
| `env` | `local` |

Campos filtráveis que não viram índice: `context`, `req_id`, `method`, `url`, `status_code`,
`response_time_ms`, `err_type` e `stream`. Exemplos de consulta no Explore do Grafana, datasource Loki:

```logql
{service="ms-alarms", level=~"warn|error|fatal"}
{service="ms-organization"} | req_id="<id do request>"
{service=~"ms-.+"} | response_time_ms > 1000
sum by (service) (count_over_time({level=~"error|fatal"} | keep service [5m]))
```

Em consulta de métrica, o `keep` descarta os campos antes de agregar; sem ele cada `req_id` vira uma série e
a consulta pode estourar o limite de séries do Loki. Container que morre antes da primeira varredura de 5 s
escapa da coleta; nesse caso `docker logs <container>` continua sendo a fonte.

## Ambiente dev

Não há Prometheus, Loki nem Grafana no hub. O Orbit lê direto as fontes e guarda o mínimo:

| Dado | Fonte |
| --- | --- |
| CPU e memória de nós e pods | metrics-server |
| Pods, reinícios e eventos Warning | API do Kubernetes |
| Saúde e sincronização dos serviços | API do Argo CD |
| Erros e avisos dos logs | `pods/log`, coleta contínua a cada 30 s, 24 h em memória, erros agrupados por mensagem |
| Tráfego, 5xx e latência | `/metrics` do Kong |
| Lag e mensagens por segundo do Kafka | kafka-exporter |

O Monitoramento do Orbit cobre o ambiente inteiro; logs e métricas de um serviço ficam na página do serviço. Erro de ruído conhecido é declarado em `~/orbit/state/secrets/observe-expected.json`: continua visível, marcado como esperado, e sai dos contadores e das notificações. O que vira notificação (sininho, toast e aviso do sistema) e a autocorreção estão em [[Infraestrutura - Orbit#Entrega e autocorreção]]. Se o Orbit cair, nada notifica enquanto ele estiver fora; o cron do host o reinicia depois de 3 falhas do `/healthz`.

## Ambiente remoto

Para raspar outro ambiente através do gateway:

```bash
cp docker/observability/prometheus.remote.yml.example docker/observability/prometheus.remote.yml
PROMETHEUS_CONFIG=prometheus.remote.yml docker compose -f docker/observability/docker-compose.yml up -d
```

Antes de subir, trocar `__GATEWAY_HOST__` pelo host do gateway e ajustar o label `env` no arquivo copiado. O
Prometheus passa a raspar `https://<gateway>/api/<serviço>/metrics`, e o `metrics-token` passa a ser o
`METRICS_SCRAPE_TOKEN` daquele ambiente. Os logs continuam sendo só os do Docker local.

> [!warning] Chave vazia recusa todo scrape
> Um `METRICS_SCRAPE_TOKEN` vazio no Secret `<serviço>-env` do dev faz o serviço recusar todo scrape. Conferir o
> comprimento do valor, sem imprimi-lo, antes de apontar um Prometheus remoto para lá; ver
> [[Infraestrutura - Ambientes#Variáveis dos serviços]].

## Segurança

- As portas ficam em `127.0.0.1`. O Prometheus não tem autenticação e acumula a telemetria de todos os
  serviços.
- O Loki não tem autenticação (`auth_enabled: false`). A única barreira contra segredo e dado pessoal no log
  é a redação do pino (`buildRedactOptions` em `libs/core-common`); linha que escapa dela fica no Loki por
  15 dias.
- O Alloy monta o socket do Docker, e quem controla o socket controla o daemon. Por isso a stack é para
  máquina de desenvolvimento, não para host compartilhado.
- Quem obtém o `metrics-token` lê a métrica de todos os serviços: nomes de rota, taxas de erro e tamanho de
  frota. Rotacionar é trocar o valor nos serviços, com redeploy, e reescrever o arquivo; o Prometheus relê
  o arquivo a cada scrape.

## CI

O que existe é o passo `Resumo` (`scripts/ci/ci-summary.mjs`) no fim de cada job, que escreve no resumo do
run a tabela do que veio do cache e quanto tempo cada parte levou, os alertas do `ci-disk-watch` no journal da
VM e os alertas do Orbit sobre o runner (serviço do scale set parado, reiniciando ou com token inválido). Não há
Prometheus, Grafana nem alerta de fila parada ou de job lento. O diagnóstico é manual:

```bash
gh run list --workflow ci-pr.yml --limit 5
sudo journalctl -u ci-scaleset -u ci-scaleset-develop -f
journalctl -t ci-disk-watch -p warning
```

O `gh` roda de qualquer máquina; os dois `journalctl` rodam na VM `ci-runner`.

## Pendências

Observabilidade do CI, dentro da VM `ci-runner` e sem SaaS, porque o host sumo não tem RAM sobrando.

| O que falta | Por que importa | Onde |
| --- | --- | --- |
| Fila e duração por poller: um script com `gh` a cada 2 min lê runs e jobs com conta de colaborador e emite fila atual, espera até iniciar, duração por job em p50 e p95, taxa de sucesso em 24 h e 7 dias e o status do último run da `develop` | mostra fila parada e job lento sem abrir o GitHub; webhook exigiria admin no repositório e endpoint alcançável pelo GitHub | VM `ci-runner` |
| Saúde da VM por `node_exporter` com textfile local: units das vagas, idade do `Runner.Worker` mais velho, volumes sem uso, testcontainers vivos, sentinela do `npm ci` | acha job zumbi antes do reaper e disco enchendo antes do alerta | VM `ci-runner` |
| Cache hit do Nx enviado a um Pushgateway por um passo curto com `\|\| true`, mais as métricas nativas do MinIO do cache remoto | mede o ganho do cache sem nunca quebrar o CI | `scripts/ci/` e host sumo |
| Alertas: disco acima de 85% por 10 min, RAM livre baixa ou swap acima de 50%, fila parada com zero jobs em execução, worker acima de 80 min, volumes sem uso crescendo, e pipeline de métrica mudo há 48 h | hoje nada avisa; o serviço do scale set parado e o token inválido já são alertas do Orbit | VM `ci-runner` |
| Se o CI for para o ARC, as métricas do próprio ARC (fila, runners ocupados, espera) substituem o poller | evita manter dois coletores | [[Infraestrutura - CI e runners#Pendências]] |

## Glossário

| Termo | O que é |
| --- | --- |
| scrape | a leitura periódica que o Prometheus faz do `/metrics` de um serviço |
| label | campo indexado de uma série ou de um stream de log; label demais multiplica as séries |
| structured metadata | campo do Loki que acompanha a linha e é filtrável, mas não vira índice |
| LogQL | linguagem de consulta do Loki |
| p50, p95 | tempo abaixo do qual terminam 50% e 95% das execuções |
| Pushgateway | componente que recebe métricas empurradas por processo curto, para o Prometheus raspar depois |
