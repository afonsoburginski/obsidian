---
tags:
  - attlas
  - task
  - sprint-30
  - analitico
card: SOFTWARE-2681
clickup: https://app.clickup.com/t/86ak5dx78
titulo: "[Full] Healthcheck do analítico"
frente: Analítico
tamanho: 5 pts
status: ENTREGUE em 25/08, front e back, na PR
sprint: "[[Attlas - Sprint 30]]"
atualizado: 2026-08-25
---

# Analítico - Healthcheck do analítico

Tornar a saúde da conexão analítico-câmera consultável **pelo operador**, e não só por quem abre o Grafana.

## O que existe hoje

Três métricas Prometheus, todas em
`apps/ms-cameras/src/analytics-realtime/analytics-realtime.metrics.ts`:

- `ms_cameras_analytics_frames_total{cameraId}`
- `ms_cameras_analytics_last_frame_timestamp_seconds{cameraId}`, que é o detector de staleness
- `ms_cameras_analytics_ws_subscribe_rejected_total{reason}`

E só. **Não existe rota REST de status do analítico**, `ICameraStatusPayload` não tem nenhum campo de
analítico, e o gateway emite apenas `camera:analytics:detection` e `camera:analytics:frame` - nenhum evento
de falha. Quem opera a tela não tem como saber que o analítico parou.

## A degradação é silenciosa por design

Este é o ponto que transforma o card de "expor métrica" em "consertar semântica":

- `apps/ms-cameras/src/analytics-realtime/camera-regions.controller.ts` captura a falha do device e devolve
  `[]` com um `logger.warn`. Na tela, **"device offline" é indistinguível de "sem região configurada"** -
  o operador vê a mesma coisa nos dois casos, e o segundo é estado normal.
- Sem `ANALYTICS_STREAM_BROKERS` o consumer nem inicia, e também só com `warn`. O serviço sobe saudável e
  nenhum frame chega.

Um healthcheck que só somasse as três métricas continuaria mentindo nesses dois cenários. O card precisa
distinguir os estados na origem, não só publicá-los.

## DoD

Estado de saúde por analítico exposto num contrato consumível pela tela, com "sem configuração", "device
inacessível" e "sem frame há X" como estados distintos, e a falha do device deixando de se disfarçar de
lista vazia. Teste de integração cobrindo device inacessível e ausência de broker.

## Encosta em

- [[Analítico - Requisitos e SLA]], seção "Ciclo de vida do analítico", regra "Healthcheck da conexão
  analítico-câmera".
- [[Analítico - Entidade, persistência de região e unicidade]]: saúde é por analítico, então precisa da
  entidade para se pendurar.
- [[Attlas - Sprint 30]].
