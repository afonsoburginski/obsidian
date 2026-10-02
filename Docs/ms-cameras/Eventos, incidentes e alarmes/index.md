---
tags:
  - doc
  - ms-cameras
  - eventos
aliases:
  - "Eventos, incidentes e alarmes"
  - "00 - Eventos, incidentes e alarmes"
atualizado: 2026-10-01
---

# Eventos, incidentes e alarmes

Como o [[ms-cameras]] registra as ocorrências das câmeras (eventos de saúde do device, eventos externos e
incidentes do analítico embarcado) num seam único, as mostra na tela de Eventos da rede inteira, as agrupa
em incidentes por correlação ou por report do operador e emite alarmes para o `ms-alarms`. O mesmo domínio
serve a fila de incidentes do [[Analítico]]: um incidente de analítico é um `CameraEventLog` de categoria
`ANALYTICS` com ciclo de tratamento próprio. Cobre RF-EVT-01 a 03 e RF-INC-01 a 04; regra de negócio em
`docs/modules/cameras.md` (seções 3.3, 3.4, 8.3 e 8.4). Código em `apps/ms-cameras/src/events/`. Visual:
[[Diagrama - MOD-007 eventos de câmera.excalidraw|diagrama]].

## Notas deste domínio

- [[Eventos, incidentes e alarmes - Arquitetura e estratégias]] - seam de registro e as três origens,
  leitura da rede, fila do analítico, correlação, alarme, observações e report, endpoints, tópicos Kafka,
  persistência, armadilhas e pendências.
- [[Eventos, incidentes e alarmes - Fluxos]] - caminho de um evento até o alarme, use cases e o mapa de UF
  para endpoint do frontend.
- [[Eventos, incidentes e alarmes - Requisitos e SLA]] - estado de cada RF-EVT, RF-INC e RNF-CAM-06, e os
  parâmetros de correlação e da tela.
- [[Eventos, incidentes e alarmes - Catálogo e criticidade]] - todo evento produzido hoje, o que torna um
  evento crítico e o mapa de causa para incidente e alarme.

## Relacionados

[[Saúde e monitoramento]] · [[PTZ e presets]] · [[Streaming]] · [[Analítico]] · [[Dashboard de câmeras]]
