---
tags:
  - attlas
  - task
  - sprint-30
  - analitico
  - fullstack
card: SOFTWARE-2794
titulo: "[Full] Controles de tratamento do incidente do analítico (assumir/resolver)"
clickup: https://app.clickup.com/t/86ak7txfn
frente: Analítico
tamanho: não estimado (achado em revisão de fidelidade, fora da reestimativa de 25/08)
status: "EM REVIEW em 28/08. Card criado no mesmo dia, achado numa revisão de fidelidade da fila de incidentes contra o attlas-design - não fazia parte do escopo original da SOFTWARE-2734 nem das PRs #2022/#2300. Implementado e em review na [PR #2306](https://github.com/atmanadmin/attlas-2026/pull/2306), backend (UC-062) e frontend (UF-040) na mesma PR."
sprint: "[[Attlas - Sprint 30]]"
atualizado: 2026-08-28
---

# Analítico - Controles de tratamento do incidente

O operador, na página de um incidente de analítico ([[Analítico - Fila de incidentes (front)]]),
assume o incidente ou marca como resolvido - e a fila/qualquer outro operador vê o estado
atualizado sem combinado por fora do sistema.

## Por que não existia

A `UF-034` (spec da fila) já retirava isso de si mesma em review, junto com o mapa: "controles de
tratamento do incidente (assumir, resolver) ... a transição de estado em si ... não existe ainda
nem no backend". Achado confirmado numa comparação linha a linha contra o `attlas-design`
(`components/incident-status-editor/`) em 28/08.

## O achado técnico (DD-062-01)

Não existe, em lugar nenhum do backend, um write-path de status pra incidente algum acionado por
operador:

- `ICameraIncidentsRepository` (UC-021/UC-023, a máquina de correlação de eventos de **hardware**)
  só tem transições automáticas por cron (`autoCloseExpiredDetected`, `dropExpiredTentative`,
  `autoResolveByRecovery`).
- Essa máquina é fechada em `CameraEventCauseCode` (`correlation-rules.ts`, lista
  `CORRELATABLE`), 100% causa de hardware (VAPIX/ISAPI/PROBE/PUSH). Incidente `ANALYTICS` usa
  `EnumAtmanIncidentType`, forma de payload diferente, e `isCorrelatable` retorna `false` pra ele
  sempre - **nunca vira um `CameraIncident`**, mesmo depois do `SOFTWARE-2683` (aquele card
  resolveu o produtor do evento ANALYTICS, não a correlação em cluster).

**Decisão**: tabela nova `CameraEventTreatment`, 0..1 por `CameraEventLog`, independente da
máquina de hardware - menor raio, zero risco de regressão na correlação que já está em produção.
A alternativa (estender `CORRELATABLE`/`causeCode` pra também aceitar `EnumAtmanIncidentType`) foi
descartada por exigir afrouxar um tipo usado em toda a cadeia de correlação de hardware.

## O que entrou

- **Backend (UC-062)** - `PATCH /cameras/events/:eventId/treatment-status`,
  `DETECTED → INVESTIGATING → RESOLVED` (nunca pra trás), `assignedTo` trava no primeiro operador
  que assume. `deriveCameraEventStatus` (usado pelos três handlers de leitura de evento) passa a
  preferir o tratamento sobre o status do incidente de hardware vinculado.
- **Frontend (UF-040)** - botões Assumir/Resolver no cabeçalho da página do incidente, atrás de
  permissão nova no catálogo real (`analytics.incidents:treat`), sem update otimista.
- Chave de permissão registrada no catálogo (`libs/contracts/.../permissions/catalog/analytics.ts`)
  - primeira vez que `PermissionsContextService.can()` é consumido por uma tela real do produto.

## O que fica fora

- Reatribuição de operador e reabertura de incidente resolvido (`RESOLVED → INVESTIGATING`) - fora
  de DD-062-01/BR-CAM-TRT-002/003; se virar necessidade real, é extensão desta atômica ou uma nova.
- Tempo real: a fila não atualiza sozinha quando outro operador trata um incidente em outra
  sessão. Precisa recarregar.

## Encosta em

- [[Analítico - Fila de incidentes (front)]] - a tela onde os controles vivem.
- [[Analítico - Frontend do attlas-design]] - `components/incident-status-editor/`, de onde a
  ideia (2 botões condicionados ao estado atual) vem.
- [[Attlas - Sprint 30]].
