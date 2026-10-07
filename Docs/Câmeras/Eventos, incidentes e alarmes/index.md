---
tags:
  - doc
  - cameras
  - eventos
  - ms-cameras
aliases:
  - "Câmeras - Eventos, incidentes e alarmes"
  - "Eventos, incidentes e alarmes"
  - "00 - Eventos, incidentes e alarmes"
atualizado: 2026-10-07
---

# Câmeras - Eventos, incidentes e alarmes

## Resumo

O `ms-cameras` registra toda ocorrência de câmera (saúde do equipamento vinda de
[[Câmeras - Saúde e monitoramento]], evento externo e incidente do analítico embarcado) num único ponto de
escrita, mostra essas ocorrências na tela de Eventos, agrupa as repetidas em incidentes e emite alarmes para o
`ms-alarms`. A fila de incidentes do [[Analítico]] também mora aqui, como eventos de categoria `ANALYTICS` com
tratamento do operador. O código fica em `apps/ms-cameras/src/events/`, e a regra de negócio em
`docs/modules/cameras.md`, seções 3.3, 3.4, 8.3 e 8.4.

## Notas

| Nota | Abra quando |
| --- | --- |
| [[Câmeras - Eventos, incidentes e alarmes - Arquitetura e estratégias]] | precisa saber onde está cada peça, quais são as rotas, os tópicos Kafka e as tabelas, e por que o pipeline é assim |
| [[Câmeras - Eventos, incidentes e alarmes - Fluxos]] | quer o passo a passo de um evento até o alarme, da correlação, do tratamento, da exportação ou da leitura na tela |
| [[Câmeras - Eventos, incidentes e alarmes - Requisitos e SLA]] | precisa do estado de cada requisito do edital, das janelas, dos limites e das variáveis de ambiente |
| [[Câmeras - Eventos, incidentes e alarmes - Catálogo e criticidade]] | quer saber que eventos existem, qual deles é crítico e o que vira incidente ou alarme |

## Explicações para usuário

Não há explicação para usuário deste subdomínio na raiz do vault.

## Diagramas

| Diagrama | O que mostra |
| --- | --- |
| [[Câmeras - Eventos, incidentes e alarmes - Diagrama.excalidraw]] | o caminho de um evento até o incidente e o alarme; é apoio visual, e quando discorda vale o código e depois a nota |
