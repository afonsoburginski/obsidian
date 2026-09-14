---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
  - ambiente
card: SOFTWARE-3205
clickup: https://app.clickup.com/t/86akhq14j
titulo: "[Infra] Stream do analítico embarcado - broker certo por ambiente e consumidor que não acumula atraso"
frente: Analítico
tamanho: 5 pts
pr: "#3471 (fase 1/2), #3490 (fase 2/2)"
status: "Stack #3491 aberta em 14/09. Fase 1/2 (#3471) põe o broker certo por ambiente e a tela avisa quando a câmera não publica naquele broker. Fase 2/2 (#3490) resolve o atraso do consumidor: das três saídas do card, duas caem por medição contra o broker real (a frota publica numa partição só, com chave por device, e grupo dedicado continua lendo a partição inteira), e limitar o lote sozinho piora - 194 buscas em 60 s sem alcançar o fim do log. O que resolve é fazer seek para o highWatermark, que tira 20 mil mensagens de atraso em uma busca. A janela de meia hora de campo entra quando subir no dev. Falta: CI verde e o merge do usuário."
sprint: "[[Attlas - Sprint 33]]"
atualizado: 2026-09-14
---

# Analítico embarcado - broker por ambiente e consumidor sem atraso

Dois defeitos do mesmo caminho de dados, por isso uma PR só.

## 1. O broker do device não é o do ambiente dev

As caixas não apareciam para a `ATMN - EMBEDDED 101` porque o aplicativo embarcado da câmera publica em
`vitoria.attlas.atmansystems.com:9094` enquanto o `ms-cameras` consumia
`dev.attlas.atmansystems.com:9094` (`ANALYTICS_STREAM_BROKERS`). O tópico é o mesmo,
`traffic-motion-detection.detections`, e o `source_id` do device confere com o
`analyticsCapabilities.deviceSourceId` da câmera: o consumo passou a funcionar assim que o endereço foi
corrigido. No EC2 a ponte Kafka já aponta para o broker de campo e replica para o Kafka local.

O card decide qual é o broker de cada ambiente, se o `.env.example` deve apontar para onde os devices de
campo realmente publicam, e se o console precisa avisar quando o consumer está conectado a um broker em
que a câmera não publica - hoje o sintoma é silêncio absoluto na tela.

## 2. O consumidor fica para trás

Com o `ms-cameras` apontado para o broker de campo, o atraso entre o carimbo do quadro e a chegada ao
navegador cresceu de 0,8 s para quase 10 s em poucos minutos: a partição carrega o fluxo de todos os
devices em campo e o consumer processa tudo para filtrar por `source_id`.

O que investigar: filtrar por chave de partição, dedicar um grupo por `source_id`, ou limitar o lote do
consumer.

## Critério de aceite

O atraso fica estável abaixo de um segundo durante meia hora, com a tela de Detecção aberta na 101.
