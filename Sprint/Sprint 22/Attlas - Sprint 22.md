---
tags:
  - attlas
  - sprint-22
  - moc
sprint: Sprint 22 (29/06 a 05/07/2026)
card_guarda_chuva: SOFTWARE-1889
status: quase fechada (T1-T4, T6 e CROSS-032 mergeadas/Closed; T5/#577 e T7/#630 em code review)
atualizado: 2026-07-03
---

# Attlas — Sprint 22 (29/06 a 05/07/2026)

Backend `ms-cameras` (squad 2), sob a task guarda-chuva **SOFTWARE-1889** (dívidas técnicas do ms-cameras).

Escopo dev backend-only: o frontend de "Saúde da Câmera" já está construído consumindo mock. O trabalho da sprint é entregar os endpoints e agregações que alimentam essas telas, além de fechar o diagnóstico de travamento do WebRTC.

## Tarefas

| #   | Task                                                         | Frente    | Card          | PR                                                         | Status                  |
| --- | ------------------------------------------------------------ | --------- | ------------- | ---------------------------------------------------------- | ----------------------- |
| 1   | [[SOFTWARE-1889 - WebRTC travamento (dívidas técnicas)]]     | Streaming | SOFTWARE-1889 | [#566](https://github.com/atmanadmin/attlas-2026/pull/566) | ✅ MERGED 30/06 · Closed |
| 2   | [[SOFTWARE-1920 - Busca de câmeras por topologia]]           | Topologia | SOFTWARE-1920 | [#574](https://github.com/atmanadmin/attlas-2026/pull/574) | ✅ MERGED 01/07 · Closed |
| 3   | [[SOFTWARE-1921 - Eventos de câmera (auto + duração)]]       | Eventos   | SOFTWARE-1921 | [#575](https://github.com/atmanadmin/attlas-2026/pull/575) | ✅ MERGED 01/07 · Closed |
| 4   | [[SOFTWARE-1922 - Janelas de 5 min + latência + rollup 90d]] | Saúde     | SOFTWARE-1922 | [#576](https://github.com/atmanadmin/attlas-2026/pull/576) | ✅ MERGED 02/07 · Closed |
| 5   | [[SOFTWARE-1923 - Bitrate histórico + TTFF]]                 | Saúde     | SOFTWARE-1923 | [#577](https://github.com/atmanadmin/attlas-2026/pull/577) | 🔶 OPEN · code review   |
| 6   | [[SOFTWARE-1924 - getHealthMetrics + série + SLA]]           | Saúde     | SOFTWARE-1924 | [#578](https://github.com/atmanadmin/attlas-2026/pull/578) | ✅ MERGED 01/07 · Closed |
| 7   | [[SOFTWARE-1990 - Streaming público (LL-HLS + watchdog)]]    | Streaming | SOFTWARE-1990 | [#630](https://github.com/atmanadmin/attlas-2026/pull/630) | 🔶 OPEN · code review   |
| +   | [[CROSS-032 - Fundação WebRTC público via TURN]]             | Streaming | CROSS-032     | [#597](https://github.com/atmanadmin/attlas-2026/pull/597) | ✅ MERGED 01/07          |

Contexto compartilhado do bloco Saúde: [[Saúde da Câmera - regras de negócio e contratos]].

## Estado (03/07)

Cascata resolvida. **#566, #574, #575, #578, #576 e #597 MERGEADAS**; só **#577** (bitrate/TTFF) e **#630** (streaming público) seguem em code review. Tasks correspondentes Closed no ClickUp, menos SOFTWARE-1923 e SOFTWARE-1990.

Ordem de merge executada: **#566 → #574/#575 → #578 → #576**. Falta rebasear/mergear #577 e #630.

## A fazer hoje

- [ ] Filtro de busca por "uptime" na saúde de câmeras → entra na **#577** (ver [[SOFTWARE-1923 - Bitrate histórico + TTFF]]).
- [ ] Review + merge de **#577** e **#630**.
- [ ] Testar o ambiente em dev, validar e documentar melhorias/implementações faltantes para a próxima sprint.

Candidatos da próxima sprint: [[Próxima sprint - candidatos]].

## Processo (SDD + gate de qualidade)

- SDD: cada item gera spec atômica em `apps/ms-cameras/docs/atomic/` antes do código (`UC-*` REST, `PROJ-*` handler Kafka/cron). Default 1 atômica = 1 PR.
- Branch: `cameras/<prefix>/<task-id>` (cross-service usa `shared/`). PR sempre com base `develop`.
- Gate antes do PR: suíte completa do projeto tocado (`nx test/lint/build ms-cameras`), não só affected. 0 erros de lint.
- Nada de `HttpException` ou `Error` crus nos services (usar `DomainException`).

## Fontes de verdade

- Contexto de negócio e contratos: [[Saúde da Câmera - regras de negócio e contratos]].
- Diagnóstico WebRTC: [[04-Diagnostico-travamento-WebRTC]].
