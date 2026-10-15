---
id: S38-05
tags:
  - attlas
  - task
  - sprint-38
  - infraestrutura
  - kafka
titulo: "[Infra] Kafka do dev com retenção definida para o tópico espelhado do campo e volume do tamanho real"
frente: Kafka
tamanho: 3
pr: "-"
status: "Planejada em 15/10. Sem PR."
sprint: "[[Attlas - Sprint 38]]"
atualizado: 2026-10-15
---

# S38-05 - Infraestrutura - Kafka - Retenção do tópico espelhado e disco do broker

## O que está errado

Um único tópico ocupa quase todo o disco do broker do dev, e o volume declarado não limita nada.

| Sinal | Medido em 15/10 |
| --- | --- |
| Dados do broker | 15 GB, dos quais 14 GB são `traffic-motion-detection.detections` e 1,2 GB `attlas.detectors.raw` |
| Volume `data-kafka-0` | 5 GiB declarados. O `local-path` do kind não impõe o tamanho, então o excesso cai no disco do EC2 |
| Entrada | `traffic-motion-detection.detections` com 20,8 mensagens/s; `attlas.detectors.raw` com 12,4 mensagens/s |
| Retenção | Nenhuma configuração por tópico e nenhuma `KAFKA_LOG_RETENTION_*` no broker: vale o padrão de 7 dias |
| `analytics-kafka-bridge` | 559 MiB de memória para um limite de 768 MiB |
| Partições | 271 dos 276 tópicos com 1 partição; o `kafka-init` cria todos com `--partitions 1` (`docker-compose.yml`, linha 163) |

O `traffic-motion-detection.detections` é a cópia que o `analytics-kafka-bridge` traz do broker de campo
para o dev. 20,8 mensagens/s em 7 dias dá cerca de 12,6 milhões de mensagens, o total que o tópico tem: ele
já está no teto da retenção e não cresce mais, mas o teto é 14 GB.

## O que a task entrega

- Retenção por tópico para os dois de maior volume no dev, definida no `kafka-init` do GitOps e do Compose
  juntos, com o valor decidido pelo que o analítico precisa reler.
- `data-kafka-0` declarado com o tamanho real que sobra depois da retenção.
- Limite de memória do `analytics-kafka-bridge` revisto pelo uso medido.
- Partições: fica registrado por que o dev segue com 1 (um broker só) e o que muda em produção. Mudar a
  contagem não entra nesta task.

## Estado

Planejada. Uma PR no monorepo (`kafka-init` do Compose) e um commit no GitOps do Orbit.
