---
tags:
  - attlas
  - sprint-23
  - task
  - eventos
  - refactor
card: a criar no ClickUp
titulo: "[Back] Separação dos eventos de câmera por domínio"
frente: Eventos
tamanho: a estimar
status: a planejar
sprint: "[[Attlas - Sprint 23]]"
atualizado: 2026-07-03
---

# Separação dos eventos de câmera por domínio

> Tarefa 4. Gancho: [[SOFTWARE-1921 - Eventos de câmera (auto + duração)]].

## Objetivo

Isolar a funcionalidade de eventos de câmera num domínio próprio dentro do `ms-cameras`, em vez de ficar acoplada ao health worker e ao módulo de saúde. Refactor arquitetural, sem mudar regra de negócio.

## Contexto

- Hoje os eventos (log de eventos, conectividade, VAPIX, restauração com duração) são produzidos dentro do `CameraHealthWorker` e persistidos via `CameraHealthEventLogRepository`, misturados com a lógica de monitoramento de saúde.
- A separação daria um domínio coeso de eventos (append, consulta, push em tempo real UF-024), consumido pela saúde e por quem mais precisar, com fronteira clara.

## A definir no planejamento

- [ ] Desenhar a fronteira do domínio de eventos (o que sai do health, o que fica).
- [ ] Definir a interface entre "quem detecta" (health worker, streaming) e "quem registra/publica" o evento.
- [ ] Avaliar impacto no realtime (EventBus + WS) e nos repositórios.
- [ ] Quebrar em specs atômicas de refactor, garantindo paridade de comportamento (mesmos eventos, mesmos payloads).

## Riscos

- Refactor de área com testes existentes (eventos, duração de incidente); manter a suíte verde e o comportamento idêntico.
