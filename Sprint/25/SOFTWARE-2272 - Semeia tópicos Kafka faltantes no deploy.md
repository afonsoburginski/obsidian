---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2272
frente: Infra / deploy dev
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: Closed (mergeada 20/07)
atualizado: 2026-07-24
pr: https://github.com/atmanadmin/attlas-2026/pull/888
---

# SOFTWARE-2272 - Semeia tópicos Kafka faltantes no deploy (AD do ms-audit + analytics do ms-cameras)

Deploys quebravam serviços por tópico Kafka inexistente: o kafka-init ficava defasado em relação ao catálogo de tópicos da lib contracts, o consumer crashava no boot e o Kong respondia 503 ("name resolution failed") porque o container morria. Foi assim com os tópicos de AD do ms-audit e os de analytics do ms-cameras.

O fix garante que o deploy semeia os tópicos que faltam antes de os consumers subirem, alinhado ao catálogo (fonte única via KafkaTopicRegistry, CROSS-037). Recuperação manual (criar tópico no broker na mão) deixou de ser necessária a cada deploy.

Frente: infra do ambiente dev (EC2). Prioridade alta na semana.
