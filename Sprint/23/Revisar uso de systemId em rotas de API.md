---
tags:
  - attlas
  - sprint-23
  - task
  - api
  - multi-tenant
card: a criar no ClickUp
titulo: "[Back] Revisar uso de systemId em rotas de API"
frente: API / Multi-tenant
tamanho: a estimar
status: a planejar
sprint: "[[Attlas - Sprint 23]]"
atualizado: 2026-07-03
---

# Revisar uso de systemId em rotas de API

> Tarefa 5. Gancho: já aplicado na busca por topologia da [[SOFTWARE-1920 - Busca de câmeras por topologia]] (#574).

## Objetivo

Auditar as rotas de API e garantir que todas que precisam de escopo por `systemId` (multi-tenant) o apliquem de forma consistente, sem vazar dados entre sistemas.

## Contexto

- O escopo `systemId` já foi aplicado na busca por topologia (#574) e no diagnóstico de stream por tenant (commit recente `199249dde`). A revisão é para achar as rotas que ficaram de fora.
- `systemId` chega via header `System-Id` e escopa as consultas.

## A definir no planejamento

- [ ] Levantar todas as rotas de `ms-cameras` (e serviços correlatos) e marcar quais são tenant-scoped.
- [ ] Verificar onde o filtro por `systemId` está aplicado x onde falta (list, detail, videowall, eventos, saúde, streaming).
- [ ] Definir padrão único de aplicação (guard/decorator/where) para não ficar espalhado e inconsistente.
- [ ] Testes cobrindo isolamento entre systemIds.

## Riscos

- Rota que hoje não escopa pode estar sendo usada assim pelo front; mapear antes de fechar para não quebrar consumo existente.
