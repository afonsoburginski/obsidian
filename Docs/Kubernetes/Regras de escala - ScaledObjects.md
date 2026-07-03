# Escalonamento de pods com KEDA — plano por serviço (attlas-quito)

> [!abstract] Regra
> Escala **só de pods**, via **KEDA** (ScaledObjects). **Bancos e infra com estado NÃO escalam** (`db-*`, `redis-*`, `kafka`, `zookeeper` = single-instance + PV). KEDA cria um HPA por baixo de cada ScaledObject. KEDA já instalado no cluster (ns `keda`, v2.16.1). Refs: [scalers](https://keda.sh/docs/2.16/scalers/), [kafka](https://keda.sh/docs/2.16/scalers/apache-kafka/).

## Qual scaler para cada caso

| Tipo de carga                                       | Scaler KEDA                                  | Por quê                                                                                            |
| --------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Consumidor de eventos Kafka** (handlers `PROJ-*`) | **`kafka`**                                  | escala pelo **lag** do consumer group no tópico — o sinal real de "fila acumulando" (event-driven) |
| **Serviço REST síncrono** (use cases via Kong)      | **`cpu`** (+ `prometheus` por RPS, opcional) | carga = requisições; CPU é o proxy direto; Prometheus permite escalar por req/s ou latência        |
| **Serviço de processamento/compute**                | **`cpu`** (e `memory` se for memória-bound)  | gargalo é CPU                                                                                      |
| **Híbrido (REST + consumidor)**                     | **`cpu` + `kafka`** no mesmo ScaledObject    | KEDA escala pelo **maior** dos triggers                                                            |
| **Banco / cache / broker (stateful)**               | **nenhum**                                   | não escala (single-instance + PV)                                                                  |

## Mapa dos serviços Attlas (confirmar o papel de cada `ms-*` na spec do serviço)

| Workload                                                       | Stateless? | Scaler proposto                      | Trigger                           |
| -------------------------------------------------------------- | ---------- | ------------------------------------ | --------------------------------- |
| `kong` (gateway)                                               | sim        | `cpu` (+ prometheus RPS)             | CPU util; req/s                   |
| `web-attlas` (front nginx)                                     | sim        | `cpu`                                | CPU util (carga leve)             |
| `ms-organization`                                              | sim        | `cpu`                                | use cases REST                    |
| `ms-pmv`                                                       | sim        | `cpu` (+ `kafka` se consome eventos) | CPU; lag                          |
| `ms-traffic-model`                                             | sim        | `cpu`/`memory`                       | compute                           |
| `ms-cameras`                                                   | sim        | `cpu`                                | ingest/telemetria                 |
| `ms-communication-channels`                                    | sim        | **`kafka`** + `cpu`                  | lag (notifica em cima de eventos) |
| `ms-audit`                                                     | sim        | **`kafka`**                          | lag (consome eventos pra auditar) |
| `ms-connector-une`                                             | sim        | `cpu` (+ `kafka` se consumidor)      | polling/processamento             |
| `db-*`, `redis-*`, `kafka`, `zookeeper`, `mediamtx`, `mailhog` | **não**    | **nenhum**                           | —                                 |

> O conjunto exato de **tópico** e **consumerGroup** de cada `ms-*` sai do catálogo de tópicos (`@attlas/contracts` `<dominio>-topics.constant.ts`) e do `groupId` do consumidor Kafka de cada serviço. Preencher por serviço ao aplicar.

## Templates de ScaledObject

- `rest-cpu.yaml` — serviço REST/stateless (CPU).
- `kafka-consumer.yaml` — consumidor Kafka (lag) + CPU.

Convém versioná-los **no chart `infra/helm/attlas`**, um ScaledObject por serviço, gated pela flag `enabled` do serviço (ver [[04-CI-CD]]). Kafka interno do cluster = sem auth (`sasl: none`, `tls: disable`); se um dia tiver SASL/TLS, usar `TriggerAuthentication`.

## Parâmetros a calibrar

- `minReplicaCount` ≥ 1 nos serviços sempre-ligados (sem scale-to-zero nos críticos).
- `maxReplicaCount`: teto por serviço — a soma dos picos tem que caber em 2 dos 3 workers (N+1). Worker do servidor de teste = 8 vCPU/16 GB; produção = 16 vCPU/48 GB (ver [[02-DIMENSIONAMENTO]] §5 e §7).
- `kafka.lagThreshold`: mensagens de lag por réplica antes de escalar (default 50 no chart; subir p/ serviços de alto volume).
- `cpu` target: ~50–70% de utilização.
