---
tags:
  - attlas
  - sprint-23
  - task
  - api
  - multi-tenant
card: SOFTWARE-2007
clickup: https://app.clickup.com/t/86ajc6v3u
titulo: "[Back] API: revisar uso de systemId nas rotas"
frente: API / Multi-tenant
tamanho: a estimar
status: implementado (fases 0-3 no PR, falta fase 4)
branch: cameras/refactor/SOFTWARE-2007
pr: https://github.com/atmanadmin/attlas-2026/pull/711
spec: MOD-011-tenant-scoping
sprint: "[[Attlas - Sprint 23]]"
atualizado: 2026-07-12
---

# Revisar uso de systemId em rotas de API

> Tarefa 5. Gancho: já aplicado na busca por topologia da [[SOFTWARE-1920 - Busca de câmeras por topologia]] (#574).

## Objetivo

Auditar as rotas de API e garantir que todas que precisam de escopo por `systemId` (multi-tenant) o apliquem de forma consistente, sem vazar dados entre sistemas.

## Contexto

- O escopo `systemId` já foi aplicado na busca por topologia (#574) e no diagnóstico de stream por tenant (commit recente `199249dde`). A revisão é para achar as rotas que ficaram de fora.
- `systemId` chega via header `System-Id` e escopa as consultas.

## A definir no planejamento

- [x] Levantar todas as rotas de `ms-cameras` (e serviços correlatos) e marcar quais são tenant-scoped (inventário na MOD-011, seção 4; inclui a rota nova `media-profiles`, já escopada).
- [x] Verificar onde o filtro por `systemId` está aplicado x onde falta (list, detail, videowall, eventos, saúde, streaming).
- [x] Definir padrão único de aplicação: `@SystemId()` no controller + filtro na consulta; ponto único `CameraTenancyService.assertCameraInSystem` em `shared/tenancy/` (sem guard novo).
- [x] Testes cobrindo isolamento entre systemIds (unit por handler/controller + integração com Postgres real nas suítes de eventos, UC-023 e UC-024).

## Andamento (2026-07-12)

- Branch atualizada com a develop (estava 361 commits atrás) e PR #711 atualizada.
- Fase 0 entregue: `CameraTenancyService.assertCameraInSystem` (404 cross-tenant, indistinguível de inexistente) + mapa de consumo do front na spec (seção 4.1).
- Fase 1 entregue: `GET /cameras/health` filtra pela relação `camera.systemId` e `GET /cameras/health/:cameraId` responde 404 para câmera de outro sistema. Era o vazamento real da auditoria.
- Fase 2 entregue: status, eventos (log e detalhe), incidents (lista e detalhe) e `:id/health` (UC-026) escopados. `GetCameraStatusQuery` mantém a forma interna (gateway/eventos realtime também despacham) e o assert fica na borda HTTP; `:id/health` também asserta no controller para não conflitar com o handler que a PR #709 reescreve.
- Fase 3 entregue: update, state, delete, replace, PTZ (4 rotas), presets (5) e automations (5) assertam tenancy na borda HTTP antes de despachar o command.
- Falta: fase 4 (fixar comportamento de bandwidth, validate-credentials e thumbnail, os DECIDIR da auditoria).

## Riscos

- ~~Rota que hoje não escopa pode estar sendo usada assim pelo front; mapear antes de fechar para não quebrar consumo existente.~~ Resolvido no levantamento: o `SystemIdInterceptor` do web-attlas manda o header `System-Id` em toda chamada `/api/*`, e as rotas de snapshot de saúde nem têm consumidor no front. Escopar não quebra consumo legítimo.
