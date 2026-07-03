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

Backend `ms-cameras` e adjacências (squad 2). Sprint **ainda não criada no ClickUp**: as 7 tarefas foram criadas no **backlog da lista da Sprint 22** (temporário, mover depois), já com card `SOFTWARE-xxxx`, tag `squad 2` e assignee Afonso. Cada tarefa está documentada e separada em nota própria. Falta estimar e quebrar em specs atômicas.

Origem do escopo: backlog levantado ao validar o ambiente em dev (03/07) + repasses de negócio. Backlog bruto: [[Próxima sprint - candidatos]].

## Tarefas

| #   | Task                                                             | Frente             | Tamanho   | Card          | Status  |
| --- | --------------------------------------------------------------- | ------------------ | --------- | ------------- | ------- |
| 1   | [[SOFTWARE-2003 - Encerramento robusto de sessões de stream (reaper + lease)]]  | Streaming          | a estimar | SOFTWARE-2003 | backlog |
| 2   | [[SOFTWARE-2004 - Particionamento de tabelas de telemetria de câmeras]]         | Banco / Infra      | a estimar | SOFTWARE-2004 | backlog |
| 3   | [[SOFTWARE-2005 - Novas regras de permissões de usuário]]                       | Permissões         | a estimar | SOFTWARE-2005 | backlog |
| 4   | [[SOFTWARE-2006 - Separação dos eventos de câmera por domínio]]                 | Eventos            | a estimar | SOFTWARE-2006 | backlog |
| 5   | [[SOFTWARE-2007 - Revisar uso de systemId em rotas de API]]                     | API / Multi-tenant | a estimar | SOFTWARE-2007 | backlog |
| 6   | [[SOFTWARE-2008 - Integração com perfis de mídia (endpoints)]]                  | Cameras            | a estimar | SOFTWARE-2008 | backlog |
| 7   | [[SOFTWARE-2009 - Escalabilidade horizontal do ms-cameras em Kubernetes]]       | Escalabilidade     | épico     | SOFTWARE-2009 | backlog |

## Incidentes relacionados

- [[Incidente - vazamento de sessões de stream (banda das câmeras)]] - origem da tarefa 1. `ms-cameras` está **parado** no EC2 dev até termos o fix.

## A fazer no planejamento

- [x] Cards criados no ClickUp (SOFTWARE-2003 a 2009), no backlog da lista Sprint 22, com tag `squad 2` e assignee Afonso.
- [ ] Criar a Sprint 23 no ClickUp e **mover** os 5 cards para lá.
- [ ] Estimar cada tarefa (tamanho) e quebrar em specs atômicas (`UC-*` REST, `PROJ-*` handler/cron) em `apps/ms-cameras/docs/atomic/`.
- [ ] Preencher `pr` e `branch` em cada nota conforme forem criados.
- [ ] Detalhar a tarefa 3 (permissões) a partir do material repassado pelo Hadson em 02/07.

## Processo (SDD + gate de qualidade)

- SDD: cada item gera spec atômica antes do código. Default 1 atômica = 1 PR.
- Branch: `cameras/<prefix>/<task-id>` (cross-service usa `shared/`). PR sempre com base `develop`.
- Gate antes do PR: suíte completa do projeto tocado (`nx test/lint/build ms-cameras`), não só affected. 0 erros de lint.
- Nada de `HttpException` ou `Error` crus nos services (usar `DomainException`).
