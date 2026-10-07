---
id: S35-25
tags:
  - attlas
  - task
  - sprint-35
  - analitico
  - metricas
titulo: "[Full] Métricas ATSPM instantâneas, telemetria para toda câmera cadastrada e analítico embarcado vinculado no cadastro"
frente: Métricas
pr: "#5479"
status: "Feita. #5479 mergeada em 30/09 às 22h11."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-25 - Analítico - Métricas - ATSPM instantâneo, telemetria de toda câmera e embarcado vinculado no cadastro

## O que estava errado

- A face ATSPM das Métricas levava de 7 a 10 s para carregar. A leitura do histórico do equipamento
  tinha mediana de 8,8 s nos logs do dev, era chamada a cada 10 s com a janela em milissegundos, e o
  cache Redis de 60 s nunca acertava.
- Câmera recém cadastrada ou reativada aparecia offline, porque o monitor de saúde só acompanhava os
  estados Operativa e Em testes, e o cadastro nasce Em estoque.
- O cadastro que encontrava o analítico embarcado não vinculava o equipamento, e era preciso sincronizar à
  mão depois.

## O que a PR entregou

- **ATSPM**: janela alinhada ao grão (300 s no equipamento, 60 s na região), cache de 300 s no Redis com
  pré-aquecimento a cada minuto das câmeras vistas nos últimos 30 minutos, e a grade montando na hora com
  cada fonte preenchendo os cartões quando responde.
- **Saúde**: toda câmera viva é monitorada em qualquer estado; os indicadores de disponibilidade e banda
  seguem contando só Operativa e Em testes.
- **Embarcado**: o cadastro que acha o analítico grava o `source_id` e o broker e liga o producer, como o
  "Sincronizar", sem tomar posse de equipamento governado por outra instalação. Falha do vínculo não falha
  o cadastro.

## Estado

Mergeada em 30/09. A "Atman VIX Analytic", cadastrada antes, precisava de um "Sincronizar" uma vez.
