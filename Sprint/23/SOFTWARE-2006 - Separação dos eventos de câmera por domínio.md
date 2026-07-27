---
tags:
  - attlas
  - sprint-23
  - task
  - eventos
  - refactor
card: SOFTWARE-2006
clickup: https://app.clickup.com/t/86ajc6v2q
titulo: "[Back] Eventos: separacao dos eventos de camera por dominio"
frente: Eventos
tamanho: M
status: mergeada (develop)
branch: cameras/refactor/SOFTWARE-2006
pr: https://github.com/atmanadmin/attlas-2026/pull/710
spec: MOD-010-camera-events-domain
atomica: PROJ-010-camera-event-recorder-seam
sprint: "[[Attlas - Sprint 23]]"
atualizado: 2026-07-11
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

## Andamento (11/07)

- SOFTWARE-2008 mergeada; peguei a próxima da fila (o PR #710 estava só com a spec MOD-010). Branch rebaseada onto develop.
- Decisão de paridade fechada: **opção A** (paridade estrita) registrada na MOD-010 §4. Spec atômica PROJ-010 escrita.
- Implementação feita e commitada local (1 commit, `0b7aeb8c9`):
  - Port `ICameraEventRecorder` + token; `RecordCameraEventService` implementa e trata `source` (`ingest` = pipeline completo; `health` = só persistência + WS, sem Kafka/dedup/revalidação de escopo).
  - `CameraHealthWorker` vira detector puro (delega ao recorder, `source: 'health'`); some a dependência do `CameraHealthEventLogRepository` (repositório removido) e a montagem do evento de WS.
  - `CameraEventsModule` extraído (repo de escrita + recorder + publisher); wiring de saúde/cameras/status reajustado, sem ciclo de DI.
  - Levantamento: streaming não produz eventos (fase 4 vazia); ptz/tour seguem gravando auditoria pelo repositório de propósito.
- Gate local: `nx build` e `nx lint` de ms-cameras verdes (0 erros). Testes o user valida; CI roda o affected.
- Force-push feito (branch rebaseada), PR #710 atualizado com o commit `0b7aeb8c9` e body reescrito. Card movido para **code review**.
- 2ª entrega (commit `5883879f1`, mesma PR, fast-forward): a pedido do user, separação virou **domínio físico de verdade**. Todo o código de eventos saiu de `cameras/` para `apps/ms-cameras/src/events/` (irmão de `hardware/`/`health/`): recording, publishing, reading, realtime, consumers (correlação+alarme), incidents, _shared. `EventsModule` agrega tudo. Gateway WS fica compartilhado em `cameras/realtime/`; handler de realtime de eventos usa a porta `ICameraRoomBroadcaster` (sem ciclo de DI). Split de `cameras.constants` → `events/events.constants`.
- Reorg puro: 0 mudança de contrato REST/WS/Kafka; frontend consome igual (mapeado ponta a ponta). Gate: `nx build`/`lint` e `tsc` (app+spec) verdes.
- Validação local (11/07): subi o ms-cameras REST-only (db-cameras seedado), Nest bootou limpo (DI cross-domain resolvida), endpoints de event log / event detail / incidentes / lista = 200 com dados reais, shape bate com `@attlas/contracts`, gateway WS 200 no path do front. Suíte de testes: 852 passando, 0 falhando (corrigi 1 spec do worker que dependia do publish antigo).
- **Mergeada na develop em 11/07** (PR #710, review aprovada, feito pelo user). Card fechado.
- Nota: tentei alias `@ms-cameras/*` nos imports, mas o `@nx/enforce-module-boundaries` (config raiz + hook de pre-commit) reverte alias interno de projeto; ficou no import relativo, que é o padrão imposto do monorepo. Adotar alias exigiria decisão de time (mexer na regra raiz do nx).
