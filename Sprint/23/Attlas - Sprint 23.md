---
tags:
  - attlas
  - sprint-23
  - moc
sprint: Sprint 23 (6/7/26 - 12/7/26)
status: encerrada (12/07) - 4 de 8 mergeadas; pendências e backlog migraram para a [[Attlas - Sprint 24]]
atualizado: 2026-07-13
---

# Attlas — Sprint 23 (encerrada)

> Encerrada em 12/07. Mergeadas e fechadas: 2004, 2006, 2007 (em prod), 2008. A 2003 segue em teste. Carryovers (2003, 2005, 2009, 2016, worker PROJ-009 e frente nova de analítico de vídeo/ACOM) estão planejados na [[Attlas - Sprint 24]].

Backend `ms-cameras` e adjacências (squad 2). Lista no ClickUp: **Sprint 23 (6/7/26 - 12/7/26)**, id `901327759373`. As 8 tarefas foram movidas da Sprint 22 para cá (07/07), com card `SOFTWARE-xxxx`, tag `squad 2` e assignee Afonso. Cada tarefa está documentada e separada em nota própria. Falta estimar as restantes.

Origem do escopo: backlog levantado ao validar o ambiente em dev (03/07) + repasses de negócio.

## Tarefas

| #   | Task                                                             | Frente             | Tamanho   | Card          | Status  |
| --- | --------------------------------------------------------------- | ------------------ | --------- | ------------- | ------- |
| 1   | [[SOFTWARE-2003 - Ciclo de vida de sessões de streaming e telemetria de banda por câmera]]  | Streaming          | grande (3 fases) | SOFTWARE-2003 | 🧪 em teste · [PR #656](https://github.com/atmanadmin/attlas-2026/pull/656) (adaptativo/codec + achados F1/F2/F3) MERGEADA na develop (08/07). Faltam F4 (respawn start-timeout), confirmar a escada em câmera Axis real e o provisionamento device-truth dos perfis. Relatório da Fase 3: `apps/ms-cameras/docs/SOFTWARE-2003-fase3-validation.md` |
| 2   | [[SOFTWARE-2004 - Particionamento de tabelas de telemetria de câmeras]]         | Banco / Infra      | G         | SOFTWARE-2004 | ✅ MERGEADA na develop (12/07), [PR #709](https://github.com/atmanadmin/attlas-2026/pull/709) (merge `8521a8659`). Particionamento semanal (heartbeat+janelas) + retenção por drop; métricas de saúde reais (TTFF última abertura, bitrate, série adaptativa) + realtime `camera:health:update`; fix scheduler duplicado; log de eventos tratado no front. Review todo tratado. **Falta worker PROJ-009 (PR própria).** Card fechado |
| 3   | [[SOFTWARE-2005 - Novas regras de permissões de usuário]]                       | Permissões         | a estimar | SOFTWARE-2005 | backlog |
| 4   | [[SOFTWARE-2006 - Separação dos eventos de câmera por domínio]]                 | Eventos            | M         | SOFTWARE-2006 | ✅ MERGEADA na develop (11/07), [PR #710](https://github.com/atmanadmin/attlas-2026/pull/710). Eventos viraram domínio top-level `events/` (irmão de hardware/health): recorder único, health worker vira detector, gateway WS compartilhado via porta broadcaster, `CameraHealthEventLogRepository` removido. Validado local (serviço sobe, endpoints eventos/incidentes 200, front consome igual, suíte verde). MOD-010 §4 opção A + PROJ-010 |
| 5   | [[SOFTWARE-2007 - Revisar uso de systemId em rotas de API]]                     | API / Multi-tenant | M         | SOFTWARE-2007 | ✅ MERGEADA + em PROD (12/07), [PR #711](https://github.com/atmanadmin/attlas-2026/pull/711). Escopo por sistema nas rotas (leak da saúde fechado + timeline de incident) + **log de eventos agnóstico de marca** (taxonomia canônica, linguagem clara, tampering→"possível adulteração") + **fix do gráfico de saúde 30/90 dias**. Backfill do banco de prod feito. Card fechado. Pendências fora do escopo: WS scoping (MOD-011 §4.2) e provisionar redis-cameras em prod |
| 6   | [[SOFTWARE-2008 - Integração com perfis de mídia (endpoints)]]                  | Cameras            | a estimar | SOFTWARE-2008 | ✅ MERGEADA na develop (09/07), [PR #708](https://github.com/atmanadmin/attlas-2026/pull/708), card fechado. Escopo ampliado (08/07): (1) perfis de mídia = inventário ONVIF do device em `CameraMediaProfile` + descoberta automática + endpoint servindo do banco (12 câmeras/34 perfis reais local); (2) log de eventos = server-side + filtro de severidade/operador + atualização ao vivo. Testes o user valida no web-attlas |
| 7   | [[SOFTWARE-2009 - Escalabilidade horizontal do ms-cameras em Kubernetes]]       | Escalabilidade     | épico     | SOFTWARE-2009 | backlog |
| 8   | [[SOFTWARE-2016 - Filtro de topologia multivalor + topologyElement na listagem]] | Cameras / Topologia | a estimar | SOFTWARE-2016 | backlog |

## Incidentes relacionados

- [[Incidente - vazamento de sessões de stream (banda das câmeras)]] - origem da tarefa 1. `ms-cameras` está **parado** no EC2 dev até termos o fix.

## A fazer no planejamento

- [x] Cards criados no ClickUp (SOFTWARE-2003 a 2009 + SOFTWARE-2016), no backlog da lista Sprint 22, com tag `squad 2` e assignee Afonso.
- [x] Sprint 23 no ClickUp (`901327759373`) e os 8 cards movidos para lá (07/07).
- [ ] Estimar cada tarefa (tamanho) e quebrar em specs atômicas (`UC-*` REST, `PROJ-*` handler/cron) em `apps/ms-cameras/docs/atomic/`.
- [x] Specs abertas em PR (base develop) para 2004, 2006, 2007 e 2008 (PRs #703 a #706). Falta 2005 e 2009/2016.
- [x] Preencher `pr` e `branch` nas notas de 2004, 2006, 2007 e 2008.
- [ ] Detalhar a tarefa 3 (permissões) a partir do material repassado pelo Hadson em 02/07.

## Processo (SDD + gate de qualidade)

- SDD: cada item gera spec atômica antes do código. Default 1 atômica = 1 PR.
- Branch: `cameras/<prefix>/<task-id>` (cross-service usa `shared/`). PR sempre com base `develop`.
- Gate antes do PR: suíte completa do projeto tocado (`nx test/lint/build ms-cameras`), não só affected. 0 erros de lint.
- Nada de `HttpException` ou `Error` crus nos services (usar `DomainException`).
