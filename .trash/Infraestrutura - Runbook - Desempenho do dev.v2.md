---
tags:
  - doc
  - infra
  - dev-v2
  - desempenho
  - runbook
aliases:
  - "Diagnóstico - Lentidão do dev.v2 por serviço e endpoint (26-09-2026)"
  - "Lentidão do dev.v2"
  - "Diagnóstico de lentidão do EC2"
  - "Registro - antes e depois da correção de lentidão do dev.v2 (27-09-2026)"
  - "Antes e depois da lentidão do dev.v2"
  - "Resultado da correção de lentidão do dev.v2"
  - "Runbook - desempenho do dev.v2"
  - "Infraestrutura - Runbook - Desempenho do dev.v2"
atualizado: 2026-10-07
---

# Infraestrutura - Runbook - Desempenho do dev.v2

Volta para [[Infraestrutura]].

## Resumo

| Pergunta | Seção |
| --- | --- |
| A lentidão vem da rede, do servidor, do front ou do equipamento? | Como sei de onde vem a lentidão |
| O que já está no código para não perder tempo? | O que não pode regredir |
| Quais pontos lentos já são conhecidos? | Quais pontos lentos já são conhecidos |
| Quanto cada rota leva dentro do serviço? | Como meço o tempo por rota no serviço |
| Quanto é Kong e quanto é serviço? | Como separo o tempo do Kong do tempo do serviço |
| Quais rotas, clientes e status chegam na borda? | Como vejo o volume na borda |
| Quanto de CPU um container gasta? | Como meço a CPU de um container |
| O banco está varrendo tabela ou gerando arquivo temporário? | Como leio as estatísticas do banco |
| Como está a conexão TCP de cada cliente? | Como vejo a janela TCP e o RTT dos clientes |
| Um container está vazando conexão? | Como acho vazamento de socket num container |
| Um processo parado gasta CPU? | Como acho um processo parado que gasta CPU |
| O front comprime e reaproveita conexão? | Como confiro a compressão e as conexões do front |

Tudo que roda no servidor é por SSH no EC2 do dev.v2 e só de leitura (acesso em
[[Infraestrutura - Acessos SSH]]; o ambiente em [[Infraestrutura - Ambientes#dev.v2]]). Streams de alarmes,
notificações e WebSockets ficam fora de qualquer ranking de latência: no log e no Kong, a duração deles é o
tempo de vida da conexão. Comando genérico de Docker e de servidor está em
[[Infraestrutura - Runbook - Comandos]].

## Como sei de onde vem a lentidão

Da máquina do usuário, contra uma rota que não é stream:

```bash
curl -s -o /dev/null -H "Authorization: Bearer $TOKEN" \
  -w 'conexão=%{time_connect} tls=%{time_appconnect} primeiro byte=%{time_starttransfer} total=%{time_total}\n' \
  https://dev.v2.attlas.atmansystems.com/api/<rota>
```

O `conexão` é uma ida e volta na rede; a diferença entre `primeiro byte` e `tls` é o servidor mais uma ida e
volta. Os números de referência medidos:

- **A rede é o piso.** O servidor fica em Ohio (`us-east-2`). Cada ida e volta até o Brasil custa de 150 a
  290 ms, uma conexão nova cerca de 0,6 s, e o caminho perde cerca de 0,2% dos segmentos. Esse piso só sai
  com o servidor na região de São Paulo.
- **O servidor não é o gargalo da navegação.** O Kong gasta de 1 a 13 ms por requisição, a borda inteira
  (nginx mais Kong) poucas dezenas de ms, a CPU não satura (cada fatia espera dezenas de µs), o Kafka tem lag
  0, e nenhum banco, Redis ou Kafka é dependência lenta compartilhada.
- **Navegação lenta em todo o sistema tem causa no front**: trabalho repetido sobre o RTT. Antes de olhar o
  servidor, olhar se o front abre conexão, baixa snapshot ou relê lista de novo a cada troca de tela.
- **Espera numa tela específica vem do equipamento**: as telas de controlador e as leituras de câmera que
  descem ao dispositivo no caminho da requisição.
- **Nunca é crédito de CPU**: a instância está em `unlimited` (ver [[Infraestrutura - Ambientes#dev.v2]]).

## O que não pode regredir

| Onde | O quê | Spec |
| --- | --- | --- |
| `web-attlas`, `core/shared/services/alarm-realtime-channel.service.ts` | o SSE de alarmes sobrevive à troca de módulo (`release()` com 5 s de graça, `ALARM_STREAM_DISCONNECT_GRACE_MS`); o snapshot de cerca de 1,9 MB baixa uma vez por carga de página | `UF-022` |
| `docker-compose.yml`, Kong | gzip de `application/json` acima de 1 KB; respostas grandes da API ficam de 12 a 14 vezes menores | - |
| `web-attlas`, preload por perfil | a estratégia herda o dado da rota pai e carrega um módulo por vez depois da tela inicial | - |
| `web-attlas`, Métricas | os serviços são providos na página: sair da tela fecha o WebSocket do analítico e para a releitura de `incidents/metrics` | `UF-062` |
| `web-attlas`, sino e fila de alarmes | com o painel fechado, relê só a contagem; a fila só com a tela montada | `UF-023` |
| `web-attlas`, câmera | os streams de uma câmera dividem um WebSocket | - |
| `web-attlas`, `core/i18n/on-demand-message-format.compiler.ts` | `OnDemandMessageFormatCompiler`: string sem ICU passa direto, ICU compila no primeiro uso | - |
| `libs/core-common/src/lib/kafkajs/kafkajs-idle-timer.fix.ts` | `KafkajsIdleTimerFix`: sem ele, o kafkajs 2.2.4 acorda o event loop cerca de 850 vezes por segundo com a fila vazia, cerca de 0,06 vCPU por serviço | - |
| `ms-controllers`, `device-read-cache/` | passada a janela de 60 s do cache de leitura do equipamento (`CONTROLLERS_DEVICE_READ_CACHE_TTL_SECONDS`), o `GET` de configuração responde do espelho por até 15 min (`CONTROLLERS_DEVICE_READ_CACHE_STALE_TTL_SECONDS=900`) e relê por trás, uma releitura por chave; a escrita fecha as duas janelas. `real-time/batch` e os pollers ficam fora | `MOD-063` seção 3.5 |
| `ms-cameras`, topologia | cache em Redis da topologia do `ms-traffic-model`, TTL `TOPOLOGY_CACHE_TTL_SECONDS` (300 s), com chave por Sistema e por usuário (hash do token) | - |
| `ms-cameras`, `cameras/services/camera-thumbnail.cache.ts` | thumbnail em Redis: cópia fresca por 10 s e cópia velha por 10 min; leitura que só acha a velha responde com ela e relê a câmera por trás, uma leitura por câmera de cada vez na réplica | `MOD-011` seção 4 |
| `docker/kong.yml`, rota `/api/cameras/:id/thumbnail` | `proxy-cache` em memória por 10 s, respeitando o `s-maxage` que o `ms-cameras` manda: vários operadores abrindo as mesmas câmeras custam uma leitura por câmera | - |
| `docker-compose.yml`, healthchecks | Postgres a cada 30 s (com `start_interval` de 2 s no boot) e Kong a cada 60 s | - |
| `docker/kong.yml`, rotas SSE | âncora `*sse-edge-unbuffered-plugin` com `X-Accel-Buffering: no` | - |
| Host do EC2, fora do repositório | HTTP/2 no nginx; BBR e `tcp_slow_start_after_idle = 0`, sem o qual uma resposta de 121 KB numa conexão parada há 3 s leva 815 ms em vez de 270 ms | - |

## Quais pontos lentos já são conhecidos

| Ponto | O que acontece | Caminho |
| --- | --- | --- |
| `ms-controllers` lendo o UNE pelo `ms-connector-une` | a leitura periódica (`plan-selection` a cerca de 70 por minuto e as duas leituras de detectores a 36 por minuto cada) está acima do que uma tela precisa, e as ACOM sem rota pela VPN são tentadas a cada volta, sem recuo exponencial | reduzir a frequência e pôr recuo exponencial |
| `POST /api/controllers/real-time/batch` | termina sempre no teto de 10 s por controlador (`REAL_TIME_TRAFFIC_PLANS_BATCH_CONTROLLER_TIMEOUT_MS=10000`) | - |
| Timeout encadeado | o `ms-traffic-model` chama o `ms-controllers` com 1,5 s (`MS_CONTROLLERS_TIMEOUT_MS`, em `infrastructure/http-clients/controllers/controllers.http-client.ts`); quando a leitura desce ao equipamento, planos de subárea voltam sem o dado | - |
| Leitura de dispositivo no `ms-cameras` | regiões de detecção e laços leem a câmera em toda chamada, de 0,5 a 1,4 s | cache curto por câmera com invalidação na gravação, como o do thumbnail |
| Banco | o `detector-history` e o `pmv` geram terabytes de arquivo temporário com varredura completa (`PmvTelemetrySample` e as partições de `detection_record`); `Camera` e `controller`, com cerca de 100 linhas cada, têm milhões de varreduras, sinal de consulta em laço; nenhum Postgres tem `pg_stat_statements` ligado | rollup incremental por janela com índice na coluna de tempo |
| Permissão operacional sem cache | o `ms-traffic-model` pergunta ao `ms-organization` a cada leitura de topologia | cache da permissão |
| Simuladores | os cinco `asc-simulador` somam cerca de 0,7 vCPU num compose próprio do host (`/home/ubuntu/simulador-docker/`, fora do repositório, `restart: unless-stopped`), e o `ms-controllers` lê os cinco controladores NEO simulados uma vez por segundo cada | - |
| Shutdown longo | `ms-controllers`, `ms-execution-plans` e `ms-traffic-model` usam os 10 s padrão do Compose, passam deles ao desligar no deploy e levam SIGKILL (exit 137) | - |
| Painel de Operações | a primeira leva de cerca de 30 requisições volta vazia e se repete 5 s depois; a causa não aparece no código | reproduzir na tela |
| Snapshot duplicado | o SSE de alarmes manda o snapshot duas vezes por abertura | o front usar o segundo formato para não reler a lista |

> [!warning] Shutdown do `ms-pmv`
> O `ms-pmv` também foi medido com exit 137 no deploy, mas o `docker-compose.yml` dá a ele
> `stop_grace_period: 60s` (e 30 s ao `ms-connector-une`). Não está confirmado se ele ainda passa dos 60 s.

> [!warning] Varredura do `ms-pmv`
> O `ms-pmv` já tem o agregado `PmvTelemetryRollup`, recalculado por um worker, e o índice
> `PmvTelemetrySample_observedAt_idx`. Não está confirmado se a varredura completa medida vem desse worker ou
> de outra leitura.

## Como meço o tempo por rota no serviço

```bash
docker logs --since 1h attlas-<ms> 2>&1 | grep '"responseTime"' | tail -50
docker inspect -f '{{.Name}} {{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' $(docker ps -q)
```

Cada linha de requisição do pino traz `req.method`, `req.url`, `res.statusCode`, `req.remoteAddress` e
`responseTime` em ms. Para o ranking, agrupar por rota com o id trocado por `:id`. A segunda linha lista o IP
de cada container, para saber qual serviço é a origem (`req.remoteAddress`) de uma chamada interna.

## Como separo o tempo do Kong do tempo do serviço

```bash
curl -s http://127.0.0.1:8100/metrics | grep -E '^kong_(kong|upstream|request)_latency_ms'
```

O `kong_kong_latency_ms` é o tempo gasto no Kong, o `kong_upstream_latency_ms` o tempo do serviço, e o
`kong_request_latency_ms_bucket` o total. Somar por `route=`, sem as rotas de stream.

## Como vejo o volume na borda

```bash
sudo tail -n 5000 /var/log/nginx/access.log | awk '{print $9, $1, $7}' \
  | sed -E 's#/[0-9a-f-]{36}#/:id#g' | sort | uniq -c | sort -rn | head -30
```

No formato `combined` padrão do nginx, `$9` é o status, `$1` o cliente e `$7` o caminho. WebSocket que abre e
fecha sem entrar no namespace aparece como linha `101` de 109 bytes; costuma ser front local de
desenvolvedor apontado para o dev.v2.

## Como meço a CPU de um container

```bash
ID=$(docker inspect -f '{{.Id}}' attlas-<ms>)
cat /sys/fs/cgroup/system.slice/docker-$ID.scope/cpu.stat
sleep 30
cat /sys/fs/cgroup/system.slice/docker-$ID.scope/cpu.stat
```

A diferença de `usage_usec` entre as duas leituras, dividida por 30 000 000, é a média de vCPU usada nos 30 s.

## Como leio as estatísticas do banco

```bash
docker exec -e PGOPTIONS='-c default_transaction_read_only=on' attlas-db-<svc> \
  psql -U <usuário> -d <banco> \
  -c "SELECT relname, seq_scan, seq_tup_read, idx_scan, n_live_tup FROM pg_stat_user_tables ORDER BY seq_scan DESC LIMIT 15" \
  -c "SELECT datname, temp_files, pg_size_pretty(temp_bytes) FROM pg_stat_database WHERE datname = current_database()"
```

Usuário e banco de cada `attlas-db-*` estão no healthcheck dele no `docker-compose.yml`. Tabela pequena com
`seq_scan` na casa dos milhões é consulta em laço; `seq_tup_read` alto é varredura completa; `temp_bytes`
alto é ordenação ou agregação que não cabe na memória.

## Como vejo a janela TCP e o RTT dos clientes

```bash
sudo ss -tin state established '( sport = :443 )'
```

Para cada cliente, `minrtt` é o piso da ida e volta, `cwnd` a janela de congestionamento e `lastsnd` os ms
desde o último envio. Janela pequena depois de conexão parada indica que o `tcp_slow_start_after_idle`
voltou a 1.

## Como acho vazamento de socket num container

```bash
PID=$(docker inspect -f '{{.State.Pid}}' attlas-<ms>)
sudo nsenter -t "$PID" -n ss -tan | awk 'NR > 1 {print $1}' | sort | uniq -c
```

`CLOSE-WAIT` acumulando, ou `ESTAB` acima do número de abas abertas, é vazamento.

## Como acho um processo parado que gasta CPU

```bash
PID=$(docker inspect -f '{{.State.Pid}}' attlas-<ms>)
for i in $(seq 1000); do sudo cat /proc/$PID/task/$PID/syscall; done \
  | cut -d' ' -f1,5 | sort | uniq -c | sort -rn | head
```

Cada linha é a chamada de sistema em que a thread principal está e o quarto argumento dela. No x86_64, `281` é
o `epoll_pwait`, e o quarto argumento é o timeout em ms, em hexadecimal. Um `281 0x1` dominante com a fila
vazia foi o que mostrou o timer do kafkajs acordando o event loop.

## Como confiro a compressão e as conexões do front

```bash
curl -s -o /dev/null -D - -H 'Accept-Encoding: gzip' -H "Authorization: Bearer $TOKEN" \
  https://dev.v2.attlas.atmansystems.com/api/organization/users/me/permissions/effective \
  | grep -i content-encoding
```

A resposta tem de vir com `content-encoding: gzip`. As conexões se conferem na aba Network do navegador: o
`/api/alarms/realtime` (ou `/api/alarms/realtime/all` fora de um Sistema) abre uma vez por aba, não por troca
de módulo, e a tela de detalhe da câmera abre um `/api/cameras/status/realtime` por câmera.

`redis-cli monitor` ou `PSUBSCRIBE` sem prazo por `docker exec` não se usa aqui: o motivo está em
[[Infraestrutura - Ambientes#Armadilhas conhecidas]].

## Glossário

| Termo | O que é |
| --- | --- |
| p50, p95, p99 | tempo abaixo do qual terminam 50%, 95% e 99% das requisições |
| vCPU | um núcleo virtual; 0,5 vCPU é meio núcleo |
| RTT | uma ida e volta na rede |
| `cwnd` | janela de congestionamento do TCP: quanto o servidor manda antes de esperar confirmação |
| BBR | algoritmo de controle de congestionamento do Linux que tolera melhor perda e RTT alto |
| ICU | formato de mensagem com plural e variável usado nas traduções |
| SIGKILL, exit 137 | encerramento forçado do container depois do prazo de desligamento |
| stale-while-revalidate | responder com a cópia velha do cache e buscar a nova por trás |
