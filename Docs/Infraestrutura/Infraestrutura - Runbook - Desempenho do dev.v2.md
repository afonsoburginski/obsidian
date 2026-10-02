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
atualizado: 2026-10-01
---

# Infraestrutura - Runbook - Desempenho do dev.v2

Onde o dev.v2 perde tempo, o que já está no código para não perder, os pontos lentos conhecidos e como
medir de novo. O ambiente está em [[Infraestrutura - Ambientes]].

> [!info] Unidades
> **p50, p95, p99**: metade, 95% e 99% das requisições terminam abaixo desse tempo. **vCPU**: um núcleo
> virtual; 0,5 vCPU é meio núcleo. **RTT**: uma ida e volta na rede.

## Onde o tempo vai

- **O servidor fica em Ohio** (`us-east-2`). Cada ida e volta até o Brasil custa de 150 a 290 ms, uma
  conexão nova cerca de 0,6 s, e o caminho perde cerca de 0,2% dos segmentos. Esse é o piso; só sai com
  o servidor na região de São Paulo.
- **O servidor não é o gargalo da navegação.** O Kong gasta de 1 a 13 ms por requisição, a borda inteira
  (nginx mais Kong) poucas dezenas de ms, a CPU não satura (cada fatia espera dezenas de µs), o Kafka tem
  lag 0 e nenhum banco, Redis ou Kafka é dependência lenta compartilhada.
- **Navegação lenta em todo o sistema tem causa no front**: trabalho repetido sobre o RTT. Antes de olhar
  o servidor, olhar se o front abre conexão, baixa snapshot ou relê lista de novo a cada troca de tela.
- **Espera em tela específica vem do equipamento**: as telas de controlador e as leituras de câmera que
  descem ao dispositivo no caminho da requisição.

## O que já está no código (não regredir)

| Onde | O quê |
| --- | --- |
| `web-attlas`, `core/shared/services/alarm-realtime-channel.service.ts` | o SSE de alarmes sobrevive à troca de módulo (`release()` com graça de 5 s, UF-022); o snapshot de cerca de 1,9 MB baixa uma vez por carga de página |
| `docker-compose.yml`, Kong | gzip de `application/json` acima de 1 KB; respostas grandes da API ficam de 12 a 14 vezes menores |
| `web-attlas`, preload por perfil | a estratégia herda o dado da rota pai e carrega um módulo por vez depois da tela inicial |
| `web-attlas`, Métricas | serviços providos na página (UF-062): sair da tela fecha o WebSocket do analítico e para a releitura de `incidents/metrics` |
| `web-attlas`, sino e fila de alarmes | com o painel fechado relê só a contagem; a fila só com a tela montada (UF-023) |
| `web-attlas`, câmera | os streams de uma câmera dividem um WebSocket |
| `web-attlas`, i18n | `OnDemandMessageFormatCompiler`: string sem ICU passa direto, ICU compila no primeiro uso |
| `libs/core-common/src/lib/kafkajs/kafkajs-idle-timer.fix.ts` | `KafkajsIdleTimerFix`: o kafkajs 2.2.4 acordava o event loop cerca de 850 vezes por segundo com a fila vazia (cerca de 0,06 vCPU por serviço) |
| `ms-controllers` (MOD-063 seção 3.5) | passada a janela de 60 s do cache de leitura do equipamento, o `GET` de configuração responde do espelho por até 15 min e relê por trás, uma releitura por chave; a escrita fecha as duas janelas. `real-time/batch` e os pollers ficam fora |
| `ms-cameras` | cache em Redis da topologia do `ms-traffic-model`, TTL `TOPOLOGY_CACHE_TTL_SECONDS` (300 s), com chave por Sistema e hash do token |
| `docker-compose.yml`, healthchecks | Postgres a cada 30 s (com `start_interval` de 2 s no boot) e Kong a cada 60 s |
| `docker/kong.yml` | rotas SSE com `X-Accel-Buffering: no` |
| Host do EC2 (fora do repo) | HTTP/2 no nginx; BBR e `tcp_slow_start_after_idle = 0`, sem o qual uma resposta de 121 KB numa conexão parada há 3 s levava 815 ms em vez de 270 ms |

## Pontos lentos conhecidos

- **`ms-controllers` lendo o UNE pelo `ms-connector-une`**: a leitura periódica (`plan-selection` a cerca
  de 70 por minuto, as duas leituras de detectores a 36 por minuto cada) está acima do que uma tela
  precisa, e as ACOM sem rota pela VPN são tentadas a cada volta, sem recuo exponencial.
- **`POST /api/controllers/real-time/batch`** termina sempre nos 10 s do teto.
- **Timeout encadeado**: o `ms-traffic-model` chama o `ms-controllers` com 1,5 s
  (`MS_CONTROLLERS_TIMEOUT_MS`, `infrastructure/http-clients/controllers/controllers.http-client.ts`); quando
  a leitura desce ao equipamento, planos de subárea voltam sem o dado.
- **Leitura de dispositivo no `ms-cameras`**: thumbnail, regiões de detecção e laços leem a câmera em toda
  chamada, de 0,5 a 1,4 s. Cabe cache curto por câmera com invalidação na gravação.
- **Banco**: o `detector-history` e o `pmv` geram terabytes de arquivo temporário com varredura completa
  (`PmvTelemetrySample` e as partições de `detection_record`); pede rollup incremental por janela com
  índice na coluna de tempo. `Camera` e `controller`, com cerca de 100 linhas cada, têm milhões de
  varreduras, sinal de consulta em laço. Nenhum Postgres tem `pg_stat_statements` ligado.
- **Permissão operacional sem cache**: o `ms-traffic-model` pergunta ao `ms-organization` a cada leitura de
  topologia.
- **Simuladores**: os cinco `asc-simulador` somam cerca de 0,7 vCPU num compose próprio do host
  (`/home/ubuntu/simulador-docker/`, fora do repo, `restart: unless-stopped`), e o `ms-controllers` lê os
  cinco controladores NEO simulados uma vez por segundo cada.
- **Shutdown longo**: `ms-controllers`, `ms-execution-plans`, `ms-traffic-model` e `ms-pmv` passam dos 10 s
  ao desligar no deploy e levam SIGKILL (exit 137).
- **Painel de Operações**: a primeira leva de cerca de 30 requisições volta vazia e se repete 5 s depois;
  a causa não aparece no código e precisa ser reproduzida na tela.
- **Snapshot duplicado**: o SSE de alarmes manda o snapshot duas vezes por abertura; o ganho está no front
  usar o segundo formato para não reler a lista.

## Como medir

Tudo por SSH no EC2, só leitura. Streams (alarmes, notificações, WebSockets) ficam fora de ranking de
latência: no log e no Kong, a duração deles é o tempo de vida da conexão.

- **Por rota, no serviço**: `docker logs <attlas-ms-*>`; cada linha do pino com `responseTime` traz método,
  URL, status e origem. Agrupar por rota com id trocado por `:id`; mapear origem para container com
  `docker inspect`.
- **Kong contra upstream**: `curl http://<ip do attlas-kong>:8100/metrics`. `kong_kong_latency_ms` é o
  tempo do Kong, `kong_upstream_latency_ms` o do serviço, `kong_request_latency_ms_bucket` o total. Somar
  por `route=`, sem as rotas de stream.
- **Volume por rota, cliente e status**: `sudo cat /var/log/nginx/access.log`. WebSocket que abre e fecha
  sem entrar no namespace aparece como linha `101` de 109 bytes; costuma ser front local de desenvolvedor
  apontado para o dev.v2.
- **CPU por container**: `/sys/fs/cgroup/system.slice/docker-<id>.scope/cpu.stat`, lido duas vezes com
  30 s de intervalo.
- **Banco**: `psql` em cada `attlas-db-*` com `default_transaction_read_only=on`, lendo
  `pg_stat_user_tables` e `pg_stat_database`.
- **Janela TCP e RTT dos clientes**: `ss -ti` na porta 443 do host (`minrtt`, `cwnd`, `lastsnd`).
- **Sockets de um container**: `sudo nsenter -t <pid do container> -n ss -tan`; CLOSE-WAIT acumulando ou
  ESTAB acima das abas abertas é vazamento.
- **Processo parado gastando CPU**: ler `/proc/<pid>/task/<pid>/syscall` mil vezes seguidas; um
  `epoll_pwait` com timeout 1 foi o que mostrou o timer do kafkajs.
- **Compressão e conexões do front**: a resposta de `/api/organization/users/me/permissions/effective` vem
  com `content-encoding: gzip`; `/api/alarms/realtime` abre uma vez por aba, não por troca de módulo; a tela
  de detalhe abre um `/api/cameras/status/realtime` por câmera.
- **Nunca deixar `redis-cli monitor` ou `PSUBSCRIBE` sem prazo por `docker exec`**: o `timeout` mata o
  cliente docker, não o `redis-cli` de dentro do container.

## Relacionados

[[Infraestrutura - Ambientes]] · [[Infraestrutura - Acessos SSH]] · [[Infraestrutura - Observabilidade]]
