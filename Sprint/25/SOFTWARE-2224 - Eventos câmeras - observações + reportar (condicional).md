---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2224
epico: SOFTWARE-2047
frente: Eventos de câmeras - backend
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: backlog (condicional)
pontos: 3
atualizado: 2026-07-17
---
# SOFTWARE-2224 - Eventos câmeras: observações + reportar (condicional)

Backend das observações e do "reportar ocorrência" do evento. **CONDICIONAL**: gated atrás de Incidents/Inventário (adiado, MOD BLOCKER 6 / §1); o botão "Reportar ocorrência" está desabilitado no front hoje. 1 PR.

**Endpoints**: `GET /api/cameras/events/:id/observations`, `POST /api/cameras/events/:id/report`

**Contratos**: `ICameraEventObservation { id, author, createdAt, text, replies:[{author, createdAt, text}] }`; `ICameraEventReportInput { name, description }` (evidências = multipart out-of-band).

**Falta tudo (nada existe)**:
- Observações: **model Prisma novo** (observação + replies, author, texto ~280) + CRUD + persistência de `author` (join identidade).
- Report: endpoint POST que cria ocorrência/incidente a partir do evento (depende de Incidents/Inventário) + upload multipart de evidências.

Edital 4.6 (Incidentes: criação manual, vinculação com Inventário). Frente: [[Eventos de câmeras - backend]]. Épico SOFTWARE-2047.
