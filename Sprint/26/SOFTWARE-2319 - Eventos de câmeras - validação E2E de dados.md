---
tags:
  - attlas
  - sprint-26
  - task
  - cameras
  - qa
  - eventos
card: SOFTWARE-2319
clickup: https://app.clickup.com/t/86ajpnu7f
titulo: "[QA] Eventos de câmeras — validação E2E de dados (listagem e detalhes)"
frente: Eventos
tamanho: a estimar
status: to do
sprint: "[[Attlas - Sprint 26]]"
atualizado: 2026-07-27
---

# Eventos de câmeras — validação E2E de dados

> Validação manual da tela de Eventos de câmeras e dos detalhes (side card/drawer + página de
> detalhes): lista, filtros, KPIs/stats, timeline do incidente, recorrência, observações. Conferir
> se os dados exibidos batem com o que está persistido no banco. Insumo pro relatório de QA
> repassado ao QA que entra semana que vem (~03/08).

## Objetivo

Validar a listagem cross-câmera de eventos e o detalhe (side card + página própria) ponta a ponta —
dado exibido vs persistido — e corrigir ajustes pontuais encontrados no caminho.

## Contexto

Backend: [[Eventos de câmeras - backend]] (SOFTWARE-2220 a 2224, épico SOFTWARE-2047). Lista e
detalhe cross-câmera já entregues pelo UC-032 (SOFTWARE-1914, PR #803); integração front na
SOFTWARE-2289 (PR #951). **Atenção a placeholders conhecidos** (levantados na investigação de
15/07): `area`/`subarea` podem vir vazios, `status` fixo `'OPEN'`, `triggerCount` fixo `1` — conferir
se isso já foi resolvido ou se ainda é comportamento esperado antes de reportar como bug.

## Escopo da validação

- [ ] Lista de eventos (filtros: area/subarea/origin/state/status)
- [ ] KPIs/stats da tela de eventos
- [ ] Detalhe do evento (side card/drawer)
- [ ] Página própria de detalhe
- [ ] Timeline pela cadeia do incidente
- [ ] Recorrência
- [ ] Observações + reportar (condicional)

## Pendências conhecidas (herdadas da validação de [[SOFTWARE-2317 - Fluxo E2E de cadastro de câmera]])

- Login real via `ms-organization` bloqueado pelo Kafka local (ver `local_dev_machine_setup` —
  memória do Claude); testar via API pode exigir o mesmo contorno de JWT assinado manualmente.
