---
tags:
  - attlas
  - sprint-23
  - task
  - cameras
  - perfis-de-midia
card: SOFTWARE-2008
clickup: https://app.clickup.com/t/86ajc6yfr
titulo: "[Back] Cameras: integracao com perfis de midia (endpoints)"
frente: Cameras / Perfis de mídia
tamanho: a estimar
status: backlog
sprint: "[[Attlas - Sprint 23]]"
atualizado: 2026-07-03
---

# Integração com perfis de mídia (endpoints)

> Tarefa 6. **É [Back]**, não frontend: a tela já está pronta consumindo mock, o que falta é o backend expor a rota para a tela integrar. Mesmo padrão do bloco Saúde da Câmera (front no mock, backend entrega o endpoint).

## Problema
O frontend do módulo de câmeras tem a tela de perfis de mídia construída, mas não há endpoint no `ms-cameras` que ela consuma. Sem rota, a tela fica presa no mock.

## Objetivo
Expor a rota/endpoints de perfis de mídia por câmera para a tela do frontend integrar.

## Contexto
- Perfis de mídia = configurações de encoder da câmera (resolução, codec, bitrate, fps), tipicamente expostas via **ONVIF media profiles** (`GetProfiles`).
- No backend hoje existe o modelo `CameraStreamProfile` (primary/secondary), mas sem endpoint que a tela use.

## A definir no planejamento

- [ ] Contrato/endpoint(s) de perfis de mídia por câmera (o que a tela precisa: listar, detalhar, mapear).
- [ ] Fonte dos dados: puxar media profiles ao vivo da câmera (ONVIF `GetProfiles`) x servir o `CameraStreamProfile` persistido x descobrir na câmera e persistir.
- [ ] Spec `UC-*` (REST) do(s) endpoint(s).
- [ ] Contratos em `@attlas/contracts` (interfaces `i-*`).
- [ ] Testes (suíte completa do projeto).

## Fontes de verdade

- Edital + `docs/modules/cameras.md` para o escopo funcional da tela.
- Modelo `CameraStreamProfile` (schema Prisma do `ms-cameras`).
