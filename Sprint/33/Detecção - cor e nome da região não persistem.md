---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
card: SOFTWARE-3181
clickup: https://app.clickup.com/t/86akhp5e1
titulo: "[Full] Detecção - alterar região, cor e nome não persiste"
frente: Analítico
tamanho: 3 pts
pr: "#3441"
status: "PR #3441 aberta: `IObjectDetectionRegion` ganha `stroke` opcional, persistido pelo `ms-cameras` nos dois modos e sobreposto sobre a resposta do device pelo `region_id` na leitura embarcada; o nome segue a mesma regra. Valor conferido contra `CameraValidation.regionStroke` antes de gravar. De quebra, a escrita embarcada passa a popular o cache do fallback e o modo servidor para de descartar `length` e incidentes. Round-trip em teste de integração contra Postgres real."
sprint: "[[Attlas - Sprint 33]]"
estudo: "[[Analítico - Estudo de caso de captura, inferência e sincronização]]"
atualizado: 2026-09-14
---

# Detecção - cor e nome da região não persistem

Reportado em 14/09: alterar região, cor e o resto na tela de Detecção não persiste.

## O que o código mostra

- **A cor nunca sai do navegador.** `IObjectDetectionRegion` (contrato) não tem campo de cor; o
  `stroke` existe só nas interfaces do módulo `analytics-detection`
  (`i-detection-region.interface.ts`, `i-detection-config.interface.ts`). O `PUT
  /object-detection-regions` não a envia, o `GET` não a devolve, e a paleta volta ao default a cada
  carga.
- **Em câmera embarcada, o device é a fonte de verdade.** `CameraRegionsController` escreve as
  regiões no equipamento (`POST /regions` set-all mais `DELETE` de órfãs) e o `GET` proxia o que o
  device responde. `DeviceRegionWire` carrega `name` como opcional; o que o device não guardar (ou
  normalizar) volta diferente do que o operador salvou - é assim que "alterei e não ficou" aparece
  sem erro nenhum.
- Em câmera de servidor, o `PUT` faz `replaceAll` em `CameraAnalyticRegion` com `name` e geometria;
  a cor também não existe ali.

## O que o card faz

- Campo de apresentação da região (cor, e nome quando o device não o guardar) persistido pelo
  `ms-cameras` em `CameraAnalyticRegion` **para os dois modos**, casado com a região do device pelo
  `region_id`. O device continua dono da geometria e dos parâmetros de detecção.
- Contrato: `IObjectDetectionRegion` ganha `stroke` opcional (aditivo, B12), com a validação da
  paleta.
- Round-trip provado em teste de integração com o device simulado: salvar, recarregar, comparar
  campo a campo - inclusive o nome, para provar se o device o devolve ou não.

## Onde olhar

`libs/contracts/src/lib/object-detection/i-object-detection-region.ts`,
`apps/ms-cameras/src/analytics-realtime/camera-regions.controller.ts`,
`apps/ms-cameras/src/analytics-realtime/types/atman-device-wire.types.ts`,
`apps/web-attlas/src/app/modules/analytics-detection/services/analytics-detection.http-source.ts`.
