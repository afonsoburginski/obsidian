---
tags:
  - attlas
  - task
  - sprint-30
  - analitico
card: SOFTWARE-2683
clickup: https://app.clickup.com/t/86ak5dx8n
titulo: "[Back] Contagem e dedup de incidente DAI"
frente: Analítico
tamanho: 5 pts
status: comprometido na Sprint 30. Reestimado em 25/08 de 3 para 5 pts como [Back]; a fila de incidentes virou card irmão [[Analítico - Fila de incidentes (front)]] (8 pts, a maior tela da semana). PR
sprint: "[[Attlas - Sprint 30]]"
atualizado: 2026-08-25
---

# Analítico - Contagem e dedup de incidente DAI

O requisito é registrar **quantas detecções de incidente cada câmera teve**, sabendo que o mesmo incidente
reaparece em vários frames e não pode ser contado uma vez por frame. Hoje não existe contagem porque não
existe registro: o incidente é lido e jogado fora.

## O incidente é lido e descartado no mesmo passo

`apps/ms-cameras/src/analytics-realtime/device-stream.consumer.ts` lê `region_incidents[i]` do frame,
converte para o booleano `hasIncident` e usa esse booleano **só para escolher o `kind` do WebSocket**.
Qual incidente era, se foi `WRONG_WAY` ou `CONGESTION`, se perde ali mesmo. O contrato
`IAnalyticsDetectionEvent`, em `libs/contracts/src/lib/object-detection/`, nem tem campo para carregar
essa informação, então o dado não teria como atravessar o gateway mesmo que fosse preservado.

O tipo já é vocabulário fechado: `EnumAtmanIncidentType`, em
`libs/contracts/src/lib/object-detection/atman-incident-type.enum.ts`, tem oito valores (`WRONG_WAY`,
`STOPPED_FLOW`, `SLOW_MOVING`, `VIOLATION`, `CONGESTION`, `TIME_EXCEEDED`, `ANOMALY`, `ANIMAL`). Não é
preciso inventar taxonomia, só parar de descartá-la.

## Os dois destinos possíveis estão prontos e vazios

- **Log de evento de câmera**: `CameraEventCategory.ANALYTICS` existe em
  `libs/contracts/src/lib/camera/camera-event-category.enum.ts` e tem **zero produtores**. O próprio código
  registra a situação em comentário: "No producers yet - matches nothing".
- **Alarme**: `ANLT_SEVERE_CONGESTION`, em `libs/contracts/src/lib/alarms/catalog/types/analytics.ts`, está
  com `generatesAlarm: false` e também sem nenhum produtor.

Ou seja, a categoria e o código de alarme foram reservados e nunca ligados. O card liga o primeiro; o
alarme fica como decisão explícita, não como consequência automática.

## O precedente de dedup que já existe no serviço

A máquina de correlação de incidentes do `ms-cameras` é o molde a reusar, não a reescrever:
`CameraIncident.correlationKey` (`apps/ms-cameras/src/database/schema/incident/camera_incident.prisma`) é
um `VarChar(64)` no formato `<eventType>:<causeCode>`, indexado em `(correlationKey, status)`, e
`camera_incident_event.prisma` tem `@@unique([incidentId, eventLogId])`, que é justamente o que impede o
mesmo evento entrar duas vezes no mesmo incidente.

Essa máquina hoje é alimentada só por eventos de conectividade: **ela não vê incidente de analítico**.
O trabalho é fazer o incidente DAI chegar nela com uma chave de correlação própria, para que a segunda
aparição do mesmo incidente na mesma região vire novo evento do incidente aberto em vez de um incidente
novo, e a contagem por câmera saia daí.

## DoD

Incidente DAI preservado do frame até o registro, com o tipo de `EnumAtmanIncidentType`, virando evento de
categoria `ANALYTICS` correlacionado por câmera e região, com a contagem consultável por câmera. Teste de
integração cobrindo o caso de reaparição do mesmo incidente em frames consecutivos, que precisa somar
detecção sem abrir incidente duplicado. A decisão sobre `ANLT_SEVERE_CONGESTION` gerar alarme fica
registrada, seja para fazer, seja para adiar.

## Encosta em

- [[Analítico - Requisitos e SLA]], seção "Detecção, incidente e evidência", regra "Contagem de detecções
  de incidente com dedup".
- [[Analítico - Entidade, persistência de região e unicidade]], porque a correlação por região precisa de
  identidade estável de região.
- [[Analítico - Writer do deviceSourceId e higiene do embarcado]], que mexe no mesmo consumer e leva o flip
  do `kind` junto com o teste que trava a semântica.
- [[Attlas - Sprint 30]] e [[ms-cameras]].
