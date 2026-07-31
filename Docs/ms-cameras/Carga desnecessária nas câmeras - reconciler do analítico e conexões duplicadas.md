---
tags:
  - doc
  - ms-cameras
  - cameras
atualizado: 2026-07-29
---

# Carga desnecessária nas câmeras - reconciler do analítico e conexões duplicadas

Investigação de 29/07/2026. Ponto de partida: o log do ACAP do device de analítico (`10.11.20.101`) mostrava requisições contínuas em `/local/atman_traffic_edge_atspm/api/config` e `/producer`, com `Config updated via API: {'source_id': ...}` seguido de `Kafka producer toggled via API`. A pergunta era de onde vinham.

Saíram dois problemas distintos, um deles não sendo o que parecia.

## O IP de origem do log não serve para nada

Toda requisição chega no ACAP com origem `10.11.1.1`, seja de onde for. `aquario-server` (`100.77.100.21`) é o subnet router que anuncia `10.11.20.101/32` e as redes `10.11.{1,3,4,5,6,7,38,56}.0/24` no tailnet, e faz SNAT no caminho. Ou seja `10.11.1.1` é ele, não o cliente.

Não há acesso SSH ao aquario para ler o conntrack, então esse caminho de diagnóstico está fechado. **Para achar o cliente, comparar o `source_id` corrente do device com o `deviceSourceId` no banco de cada instância candidata.** Foi assim que a origem apareceu.

## Problema 1: várias instâncias do Attlas disputando o mesmo device

### O que dava para medir

Polling do `/config` do device de 9 em 9 segundos:

```
18:23:37 source_id=9ca37bb1-475d-47ac-9f4c-ad6d2110e80c producer=true
18:23:46 source_id=9ca37bb1-...                         producer=false
18:23:56 source_id=9ca37bb1-...                         producer=false
18:24:06 source_id=be730bdc-a1ba-483c-b15d-4310e51e7569 producer=true
18:25:01 source_id=be730bdc-...                         producer=true
18:25:11 source_id=9ca37bb1-...                         producer=true
```

O `source_id` alterna entre dois valores mais ou menos a cada minuto, e o producer fica `false` por ~20s em cada troca.

### A cadeia

1. `AnalyticsProducerReconcilerService` (PROJ-014, mergeado na develop) rodava `@Cron(EVERY_MINUTE)`. Quando achava o producer desligado, chamava `ensureSourceId`.
2. `ensureSourceId` compara o `source_id` do device com o `deviceSourceId` da linha de câmera dele, e faz `PUT /config` se diferir.
3. **`PUT /config` de `source_id` reinicia o pipeline do device**, o que derruba o producer. O próprio tick religa em seguida com `POST /producer?enable=true`.
4. O reinício abre uma janela de ~20s com o producer off. Se o tick da outra instância cai nessa janela, ela encontra a mesma condição e carimba o `source_id` dela. Volta pro passo 3, para sempre.

O worker criado para manter o stream ligado 100% do tempo era exatamente o que mantinha o device reiniciando.

### Por que existiam múltiplos writers

`apps/ms-cameras/src/database/seed.ts` na develop hardcodava:

```
ANALYTICS_HOST = '10.11.20.101'
deviceSourceId: 'be730bdc-a1ba-483c-b15d-4310e51e7569'
```

Um device de campo real, compartilhado, alcançável pela tailnet. Então **toda pessoa que rodava o seed local e subia o `ms-cameras` virava writer automático do device de todo mundo**, sem saber, no momento em que o cron entrou na develop. O `be730bdc` que aparecia no log é literalmente essa constante.

O segundo UUID (`9ca37bb1`) não existe na develop, então vem de fora do 26. O Attlas 25 é o suspeito, porque também empurra `source_id` e `/infra` no device: o `kafka_broker_ip` do device estava de volta em `dev.attlas.atmansystems.com` (o 25), tendo sido apontado para o `dev.v2` em 17/07. O `/config` do device também mostra `attlas_url: https://vitoria.attlas.atmansystems.com`, então produção conhece esse device.

### O EC2 26 (dev.v2) estava fora dessa disputa

Vale registrar porque foi onde procurei primeiro:

- A câmera `10.11.20.101` não existe mais no `attlas_cameras` dele (0 linhas).
- Nenhuma câmera tem `analyticsCapabilities.deviceSourceId`, e o `DeviceStreamConsumer` loga `0 mapped source(s)`.
- Nenhum dos dois UUIDs está no banco.
- Captura de 90s na bridge docker não pegou nenhuma requisição dele para `/local/atman_traffic_edge_atspm/*`.

### O `/horus/traffic-analytics/status/analytic` não é Attlas

Aparece no mesmo log e confunde. Zero referência no repo e zero no bundle deployado (`/app/main.js`). É health probe de terceiro.

Detalhe do device: o uvicorn do ACAP serve os dois prefixos na **porta 2001** (`/horus/traffic-analytics/status/analytic` responde `{"status":"ok"}`), enquanto pela porta 80 o Apache da Axis dá 404 em `/horus/`. Por isso as duas coisas aparecem no mesmo access log.

## Problema 2: uma conexão VAPIX por tenant no mesmo hardware

Achado enquanto procurava o primeiro. O `attlas-ms-cameras` mantinha **72 conexões TCP established na porta 80 de 12 devices, exatamente 6 por device**:

```
6 10.11.7.101:80    6 10.11.5.102:80    6 10.11.4.101:80    6 10.11.1.102:80
6 10.11.6.102:80    6 10.11.5.101:80    6 10.11.3.102:80    6 10.11.1.101:80
6 10.11.6.101:80    6 10.11.4.102:80    6 10.11.3.101:80    6 10.1.1.79:80
```

O 6 é o número de sistemas-tenant. Cada conexão tinha ping loop próprio de 5s (`PING_INTERVAL_MS`).

Causa: `CameraHealthBootstrapService` itera **linhas** de `Camera`, e todo o estado do `CameraHealthWorker` era chaveado por `cameraId`, nunca por host. Como a mesma câmera física é cadastrada uma vez por tenant, o banco tinha 13 IPs x 6 sistemas = 78 linhas monitoradas e o mesmo hardware recebia 6 clientes VAPIX independentes.

Amplificação por device: 6 pings a cada 5s, 6 handshakes digest por reconexão, 6 upserts de snapshot por evento. Pior no PTZ `10.1.1.79`: o `PtzTrackConfig.INTERVAL_MS` é 750ms e **cada tick é um fetch digest, que são 2 round-trips HTTP**, ou seja ~16 req/s no mesmo device enquanto ele se move.

### Como identificar o container culpado

Vale guardar a receita, porque o SNAT do docker esconde a origem no `tailscale0`:

```bash
# origem pré-SNAT: mostra o IP do container, não o do host
sudo tcpdump -i br-<bridge> -nn -q "net 10.11.0.0/16"
# 172.18.0.32 -> mapear com:
docker network inspect <net> --format '{{range .Containers}}{{.IPv4Address}} {{.Name}}{{println}}{{end}}'

# conexões do container: precisa entrar no netns dele, ss no host não vê
PID=$(docker inspect -f '{{.State.Pid}}' attlas-ms-cameras)
sudo nsenter -t $PID -n ss -tn state established
```

Payload de 6 bytes com resposta de 2 bytes na porta 80 é WebSocket PING mascarado / PONG. Não é HTTP.

## O que foi mudado

**Reconciler removido inteiro.** `AnalyticsProducerReconcilerService`, a spec dele, o registro no módulo, a métrica `PRODUCER_REENABLED_TOTAL` e o `AtmanDeviceProvisioner.ensureProducerRunning` que só existia para ele. A provisão do device agora acontece **só no save explícito do operador**, pelo `CameraRegionsController`, onde existe um dono humano por trás da escrita. `PROJ-014` foi para `status: superseded` com o motivo registrado.

**Device fora do seed.** O `upsertAnalyticsCamera` e o `deviceSourceId` fixo saíram do `seed.ts`, então nenhuma stack de dev vira writer sem alguém pedir.

**Conexões deduplicadas por device.** O `CameraHealthWorker` ganhou `deviceMonitors`, indexado pelo transporte (`canal:host` para Axis, `canal:eventServiceUrl` para ONVIF). Uma conexão por device físico; as escritas (snapshot, evento, heartbeat, broadcast WS) abrem em leque para todas as linhas atreladas, então cada tenant continua com os próprios dados de saúde. A dedup ficou no worker e não no bootstrap, de propósito: assim o caminho de cadastro de câmera (`create-cameras.handler`) também ganha, sem o caller precisar saber de nada.

Efeito esperado no EC2 26: 72 conexões viram 12, e o PTZ sai de ~16 req/s para ~2,7 req/s durante movimento. O volume de escrita no banco não muda (já eram 6 snapshots por evento).

`stopMonitoring` de uma linha que não é dona da conexão só desatrela. Quando é a dona que sai, a conexão cai e a próxima linha atrelada é promovida a dona, senão as outras tenants perderiam health porque a linha que por acaso abriu a conexão saiu.

## O que continua aberto

O 26 não escreve mais no device, mas **o outro writer continua**. Não tenho acesso SSH ao 25 (`18.218.62.5`), ao aquario, nem à produção de Vitória, então de fora só dá para observar o device. Enquanto o 25 ou a produção seguirem carimbando `source_id` nele, o device continua sendo reiniciado por eles.

Se o problema original voltar (edge sobe com producer off após reboot e ninguém religa), a solução não pode ser um laço periódico que escreve no device. Precisa de dono explícito: o device declara qual instância o governa, ou a religada é ação de operador, ou o `source_id` deixa de ser reescrito por quem não é dono.

## Referências

- `apps/ms-cameras/docs/atomic/PROJ-014-analytics-producer-reconciler.md` - spec revertida, com o motivo.
- [[Integração com dispositivo - Arquitetura e estratégias]]
- [[Saúde e monitoramento - Arquitetura e estratégias]]
