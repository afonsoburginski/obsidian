---
tags:
  - attlas
  - sprint-23
  - moc
sprint: Sprint 23 (datas a confirmar, pós 05/07/2026)
status: em planejamento (sem cards no ClickUp ainda)
atualizado: 2026-07-03
---

# Attlas — Sprint 23 (em planejamento)

Backend `ms-cameras` e adjacências (squad 2). Sprint ainda **não criada no ClickUp**, então nenhuma tarefa tem `SOFTWARE-xxxx` - os cards e PRs são preenchidos quando abrirmos a sprint. Por ora cada tarefa está documentada e separada em nota própria.

Origem do escopo: backlog levantado ao validar o ambiente em dev (03/07) + repasses de negócio. Backlog bruto: [[Próxima sprint - candidatos]].

## Tarefas

| #   | Task                                                             | Frente             | Tamanho   | Card    | Status     |
| --- | --------------------------------------------------------------- | ------------------ | --------- | ------- | ---------- |
| 1   | [[Encerramento robusto de sessões de stream (reaper + lease)]]  | Streaming          | a estimar | a criar | a planejar |
| 2   | [[Particionamento de tabelas de telemetria de câmeras]]         | Banco / Infra      | a estimar | a criar | a planejar |
| 3   | [[Novas regras de permissões de usuário]]                       | Permissões         | a estimar | a criar | a planejar |
| 4   | [[Separação dos eventos de câmera por domínio]]                 | Eventos            | a estimar | a criar | a planejar |
| 5   | [[Revisar uso de systemId em rotas de API]]                     | API / Multi-tenant | a estimar | a criar | a planejar |

## Incidentes relacionados

- [[Incidente - vazamento de sessões de stream (banda das câmeras)]] - origem da tarefa 1. `ms-cameras` está **parado** no EC2 dev até termos o fix.

## A fazer no planejamento

- [ ] Criar a Sprint 23 no ClickUp (lista + tag `squad 2`) e gerar os cards `SOFTWARE-xxxx`.
- [ ] Estimar cada tarefa (tamanho) e quebrar em specs atômicas (`UC-*` REST, `PROJ-*` handler/cron) em `apps/ms-cameras/docs/atomic/`.
- [ ] Preencher `card`, `pr`, `branch` em cada nota conforme forem criados.
- [ ] Detalhar a tarefa 3 (permissões) a partir do material repassado pelo Hadson em 02/07.

## Processo (SDD + gate de qualidade)

- SDD: cada item gera spec atômica antes do código. Default 1 atômica = 1 PR.
- Branch: `cameras/<prefix>/<task-id>` (cross-service usa `shared/`). PR sempre com base `develop`.
- Gate antes do PR: suíte completa do projeto tocado (`nx test/lint/build ms-cameras`), não só affected. 0 erros de lint.
- Nada de `HttpException` ou `Error` crus nos services (usar `DomainException`).
