---
tags:
  - attlas
  - sprint-23
  - task
  - permissoes
card: a criar no ClickUp
titulo: "[Back] Novas regras de permissões de usuário"
frente: Permissões
tamanho: a estimar
status: a planejar
sprint: "[[Attlas - Sprint 23]]"
atualizado: 2026-07-03
---

# Novas regras de permissões de usuário

> Tarefa 3. Repassada pelo **Hadson em 02/07**. É o item mais documentado do lote, serve de base para detalhar a spec.

## Objetivo

Aplicar as novas regras de permissões de usuário repassadas pelo Hadson. Definição de negócio vem do material do Hadson (02/07) - essa nota é o placeholder de planejamento até destrinchar o conteúdo.

## A definir no planejamento

- [ ] Consolidar o material do Hadson (02/07) e transcrever as regras exatas aqui.
- [ ] Mapear o que é papel/perfil x permissão granular por recurso.
- [ ] Identificar onde vive hoje a autorização (Kong valida JWT no gateway; `@attlas/core-auth` lê claims) e o que muda em `ms-organization` vs nos serviços consumidores.
- [ ] Cruzar com a tarefa [[Revisar uso de systemId em rotas de API]] (escopo multi-tenant costuma andar junto de permissão).
- [ ] Derivar specs atômicas por serviço afetado.

## Fontes de verdade

- Material do Hadson (02/07) - anexar/linkar quando disponível.
- Contexto de módulos funcionais em `docs/modules/` e o edital (fonte de verdade das regras de negócio).
