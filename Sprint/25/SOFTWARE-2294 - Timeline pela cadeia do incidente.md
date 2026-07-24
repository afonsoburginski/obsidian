---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2294
epico: SOFTWARE-2047
frente: Eventos de câmeras - backend
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: Closed (entregue na #951, mergeada 24/07)
pontos: 3
atualizado: 2026-07-22
spec: UC-041 (revisada) + UC-021 (revisada)
pr: https://github.com/atmanadmin/attlas-2026/pull/951
---

# SOFTWARE-2294 - Timeline do evento pela cadeia do incidente

O card "Histórico do Evento" mostrava só o próprio evento. Diagnóstico em três camadas: a timeline (UC-041) lia `CameraEventLog.correlationId`, que é chave de **idempotência da ingestão** e nunca é populada como cadeia; o worker de correlação (UC-021) nunca criava incidente porque **nenhum `causeCode` real estava na lista** de correlacionáveis (0 incidentes no banco); e o evento típico de rotina (health INFO) nunca teria cadeia de qualquer forma.

## O que foi feito

- **Timeline por incidente**: o handler monta a cadeia pelos eventos ligados ao(s) incidente(s) do âncora via `CameraIncidentEvent`, cross-câmera, realizando o exemplo do RF-EVT-02 (queda de energia → N câmeras). `correlationId` intocado.
- **Fallback de contexto**: âncora sem incidente devolve os eventos da mesma câmera em ±30min (cap 50, `CameraEventTimelineConfig`), para rotina não renderizar timeline de 1 item.
- **Correlação destravada**: `VAPIX_TAMPERING` (VANDALISM/HIGH) e `PUSH_DISCONNECT` (COMMUNICATION/HIGH) entraram nos pares correlacionáveis.
- **Backfill idempotente** (`src/database/backfill-incident-correlation.ts`, mesmas regras/janelas do worker, só clusters ≥2 viram incidente DETECTED): rodado no dev, 594 eventos correlacionáveis → **108 incidentes, 527 eventos em cadeia**.
- Specs UC-041 (BR-041-01) e UC-021 (BR-CAM-CORR-004) corrigidas; specs de teste do handler reescritos.

## Validação (smoke local, JWT cunhado)

- Evento em cadeia → 49 itens (cluster de CONNECTIVITY_CHANGED em ~22min).
- Evento de rotina (o que o user abriu) → 22 itens via contexto ±30min (antes: 1).

Frente: [[Eventos de câmeras - backend]]. Épico SOFTWARE-2047.
