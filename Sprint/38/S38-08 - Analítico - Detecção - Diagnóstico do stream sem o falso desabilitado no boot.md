---
id: S38-08
tags:
  - attlas
  - task
  - sprint-38
  - analitico
  - backend
titulo: "[Back] Diagnóstico do analítico ao vivo só depois do consumer conectar, e as câmeras silenciosas do dev explicadas"
frente: Detecção
tamanho: 2
pr: "-"
status: "Planejada em 15/10. Sem spec e sem PR."
sprint: "[[Attlas - Sprint 38]]"
atualizado: 2026-10-15
---

# S38-08 - Analítico - Detecção - Diagnóstico do stream sem o falso desabilitado no boot

## O que está errado

No boot de 15/10 às 19h25, o `ms-video-analytics` logou 6 vezes `analítico ao vivo desabilitado
(ANALYTICS_STREAM_BROKERS ausente): broker=none`. A variável estava definida: 2,5 s depois o
`DeviceStreamConsumer` conectou em `kafka:29092` e duas câmeras passaram a receber quadros. O
`AnalyticsStreamDiagnostics` avalia antes do consumer existir e confunde "ainda não conectou" com "sem
broker". Quem lê o log procura uma variável que não está faltando.

No mesmo boot:

- 4 câmeras do `source_id` `1414dde8` ficaram silenciosas, entre elas a câmera de seed
  `00000000-0000-4000-8000-000000000101`. Um `source_id` ligado a quatro câmeras é dado do dev a conferir.
- O `DetectorTranslationService` descartou ocupação 5 vezes em 10 minutos por região sem detector `VEHICLE`
  vinculado. É vínculo faltando no cadastro do dev, não erro de código.

## O que a task entrega

- O diagnóstico distingue "consumer conectando" de "broker não configurado", com teste.
- Os quatro vínculos do `source_id` `1414dde8` conferidos no dev e corrigidos, ou explicados.

## Estado

Planejada. Falta a spec atômica (`INT-*`, complementa a INT-023).
