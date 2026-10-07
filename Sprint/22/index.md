---
tags:
  - attlas
  - sprint-22
  - moc
sprint: Sprint 22 (29/06 a 05/07/2026)
card_guarda_chuva: SOFTWARE-1889
status: fechada (T1-T7 e CROSS-032 mergeadas/Closed)
atualizado: 2026-07-06
aliases:
  - "Attlas - Sprint 22"

---

# Attlas - Sprint 22 (29/06 a 05/07/2026)

Backend `ms-cameras` (squad 2), sob a task guarda-chuva **SOFTWARE-1889** (dívidas técnicas do ms-cameras).

Escopo dev backend-only: o frontend de "Saúde da Câmera" já está construído consumindo mock. O trabalho da sprint é entregar os endpoints e agregações que alimentam essas telas, além de fechar o diagnóstico de travamento do WebRTC.

## Tarefas

| ID | Task                                                         | Frente    | Card          | PR                                                         | Status                  |
| --- | ------------------------------------------------------------ | --------- | ------------- | ---------------------------------------------------------- | ----------------------- |
| S22-01 | [[S22-01 - Câmeras - Streaming - Travamento do WebRTC (dívidas técnicas)]]     | Streaming | SOFTWARE-1889 | [#566](https://github.com/atmanadmin/attlas-2026/pull/566) | ✅ MERGED 30/06 · Closed |
| S22-02 | [[S22-02 - Câmeras - Cadastro - Busca de câmeras por topologia]]           | Topologia | SOFTWARE-1920 | [#574](https://github.com/atmanadmin/attlas-2026/pull/574) | ✅ MERGED 01/07 · Closed |
| S22-03 | [[S22-03 - Câmeras - Eventos, incidentes e alarmes - Eventos de câmera (auto e duração)]]       | Eventos   | SOFTWARE-1921 | [#575](https://github.com/atmanadmin/attlas-2026/pull/575) | ✅ MERGED 01/07 · Closed |
| S22-04 | [[S22-04 - Câmeras - Saúde e monitoramento - Janelas de 5 min, latência e rollup de 90 dias]] | Saúde     | SOFTWARE-1922 | [#576](https://github.com/atmanadmin/attlas-2026/pull/576) | ✅ MERGED 02/07 · Closed |
| S22-05 | [[S22-05 - Câmeras - Saúde e monitoramento - Bitrate histórico e TTFF]]                 | Saúde     | SOFTWARE-1923 | [#577](https://github.com/atmanadmin/attlas-2026/pull/577) | ✅ MERGED 03/07 · Closed |
| S22-06 | [[S22-06 - Câmeras - Saúde e monitoramento - Métricas de saúde (getHealthMetrics), série e SLA]]           | Saúde     | SOFTWARE-1924 | [#578](https://github.com/atmanadmin/attlas-2026/pull/578) | ✅ MERGED 01/07 · Closed |
| S22-07 | [[S22-07 - Câmeras - Streaming - Streaming público (LL-HLS e watchdog)]]    | Streaming | SOFTWARE-1990 | [#630](https://github.com/atmanadmin/attlas-2026/pull/630) | ✅ MERGED 03/07 · Closed |
| +   | [[S22-08 - Câmeras - Streaming - Fundação do WebRTC público via TURN]]             | Streaming | CROSS-032     | [#597](https://github.com/atmanadmin/attlas-2026/pull/597) | ✅ MERGED 01/07          |

Contexto compartilhado do bloco Saúde: [[Saúde da câmera - regras de negócio e contratos]].

## Estado (06/07)

Sprint fechada. **Todas as 7 tasks + CROSS-032 mergeadas e Closed no ClickUp.** #577 (bitrate/TTFF) e #630 (streaming público) foram mergeadas em 03/07 e os cards SOFTWARE-1923 e SOFTWARE-1990 passaram para Closed.

Ordem de merge executada: **#566 → #574/#575 → #578 → #576 → #577/#630**.

O trabalho seguinte (ciclo de vida de sessões + telemetria de banda) virou o card **SOFTWARE-2003** (Sprint 23): Fases 1 e 2 já em `develop` via #649, card em `in progress`, Fase 3 (validação de escala em dev) pendente.

Candidatos e continuidade da próxima sprint: [[Attlas - Sprint 23]].

## Processo (SDD + gate de qualidade)

- SDD: cada item gera spec atômica em `apps/ms-cameras/docs/atomic/` antes do código (`UC-*` REST, `PROJ-*` handler Kafka/cron). Default 1 atômica = 1 PR.
- Branch: `cameras/<prefix>/<task-id>` (cross-service usa `shared/`). PR sempre com base `develop`.
- Gate antes do PR: suíte completa do projeto tocado (`nx test/lint/build ms-cameras`), não só affected. 0 erros de lint.
- Nada de `HttpException` ou `Error` crus nos services (usar `DomainException`).

## Fontes de verdade

- Contexto de negócio e contratos: [[Saúde da câmera - regras de negócio e contratos]].
- Diagnóstico WebRTC: [[Streaming - Diagnóstico de travamento no WebRTC]].
