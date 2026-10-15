---
id: S38-04
tags:
  - attlas
  - task
  - sprint-38
  - cameras
  - kafka
  - backend
titulo: "[Back] Consumer Kafka do ms-cameras pelo buildKafkaConsumerOptions, com o estado do consumer na readiness e na liveness"
frente: Kafka
tamanho: 3
pr: "-"
status: "Planejada em 15/10. Sem spec e sem PR."
sprint: "[[Attlas - Sprint 38]]"
atualizado: 2026-10-15
---

# S38-04 - Câmeras - Kafka - Consumer do ms-cameras no padrão do core-messaging

## O que está errado

O consumer do `ms-cameras` perde o grupo e volta, e nada disso aparece na saúde do serviço.

| Sinal | Medido em 15/10 |
| --- | --- |
| Broker remove o membro de `ms-cameras-group-server` por heartbeat expirado | 2 vezes em 2 minutos (19h26 e 19h27) |
| `The coordinator is not aware of this member` no log do serviço | 29 em 60 minutos; 35 nos 20 minutos depois do pod estabilizar |

O `sessionTimeout` é de 30 s. Perder o heartbeat com esse prazo indica o event loop do processo travado por
dezenas de segundos. Não confirmado: a S38-02 e a S38-03 mostram o processo esperando o banco no mesmo
período.

## Causa no código

- `apps/ms-cameras/src/shared/kafka/kafka-options.factory.ts` lê `process.env` direto. O próprio arquivo
  diz que a migração para o `buildKafkaConsumerOptions` (CROSS-041) está pendente neste serviço.
- O serviço não usa `KafkaConsumerState` nem `KafkaConsumerLivenessIndicator` (CROSS-267). O
  `ms-video-analytics` já usa os dois, em `src/health/consumer.health.ts`. Sem eles a readiness fica verde
  com o consumer fora do grupo.

## O que a task entrega

- `KafkaOptionsFactory` substituído por `buildKafkaConsumerOptions` sobre o `ConfigService` validado.
- `KafkaConsumerState.attach(microservice)` ligado na readiness e o estado terminal na liveness, como no
  `ms-video-analytics`.
- Medição do event loop (atraso por intervalo) durante uma hora no dev, para fechar ou descartar a hipótese
  acima.

## Estado

Planejada. Falta a spec atômica. Segue a CROSS-041 e a CROSS-267, sem decisão nova.
