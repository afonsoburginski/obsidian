---
tags:
  - attlas
  - sprint-22
  - task
  - eventos
card: SOFTWARE-1921
titulo: "[Back] Eventos de câmera (geração automática + duração)"
frente: Eventos
tamanho: Média
pr: 575
pr_url: https://github.com/atmanadmin/attlas-2026/pull/575
branch: cameras/feat/SOFTWARE-1921
status: MERGED
clickup_status: Closed
merged: 2026-07-01
clickup: https://app.clickup.com/t/86aj9aw2v
sprint: "[[Attlas - Sprint 22]]"
---

# SOFTWARE-1921 — Eventos de câmera (geração automática + duração)

> Tarefa 3. **PR [#575](https://github.com/atmanadmin/attlas-2026/pull/575) MERGEADA (01/07)** · ClickUp **Closed**. Spec PROJ-004.

Alimenta a aba "Log de Eventos" e o card "Eventos recentes".

## Já existia (não refazer)

- `GET /api/cameras/:id/events` → `ICameraEventLogPage` (UC-11)
- `GET /api/cameras/:id/events/:eventId` → `ICameraEventDetail` (UC-18)
- Pipeline: record-camera-event (UC-019), correlate-events (UC-021), emit-alarm (UC-022)
- Worker de saúde emite eventos in-process + broadcast WebSocket

## Entregue (#575)

- [x] Geração automática de eventos a partir das transições de saúde/stream para o `CameraEventLog` persistido (incidente abre na saída de STABLE, fecha no retorno; o worker anexa o evento de recuperação).
- [x] Campo de duração no evento: `payload.durationMinutes`, calculado do incidente de stream ao restaurar.
- [x] Enum de tipos/severidade/categoria conferido: cobre os casos da planilha.

## Gatilho (frontend, fora do escopo backend)

- `getCameraEvents` ainda é MOCK em `cameras.service.ts` (~linha 320) → deve chamar `GET /api/cameras/:id/events`.
