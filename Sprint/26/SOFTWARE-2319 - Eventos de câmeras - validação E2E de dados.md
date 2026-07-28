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
status: validado (API+banco); falta clique-a-clique no web-attlas
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

- [x] Lista de eventos (filtros: severity/origin/status reais; area/subarea/state não testados — ver Pendências)
- [x] KPIs/stats da tela de eventos
- [x] Detalhe do evento (side card/drawer)
- [x] Timeline (fallback contexto-da-câmera + cadeia do incidente)
- [x] Recorrência
- [x] Observações + reportar

## Resultado

Relatório completo: [[SOFTWARE-2319-eventos-e2e-validation]].

Todos os 8 endpoints validados via API + Postgres. `status`/`triggerCount` já **não são mais
placeholder** (UC-043 entregou os dois reais) — confirmado ao vivo: reportei um evento de teste,
virou um `CameraIncident` `DETECTED`, e o `status` do evento mudou de `OPEN` pra `DETECTED` na hora,
com `triggeredActions` populado. Nenhum bug de código encontrado.

## Pendências

- [ ] `area`/`subarea` — sempre vazios neste ambiente porque `ms-traffic-model` não estava rodando
      (degradação correta, BR-043-01); não validei o caminho feliz nem o filtro por área/subárea.
- [ ] Filtro `state` (connectionStatus) — não testado.
- [x] Clique-a-clique no `web-attlas` — feito em 28/07. 0 bugs de dado (confirma o resultado
      original), mas 3 gaps de UI/feature achados, ver abaixo.
- Login real via `ms-organization` continua bloqueado pelo Kafka local (ver `local_dev_machine_setup`
  — memória do Claude); testado via JWT assinado manualmente, mesmo contorno de
  [[SOFTWARE-2317 - Fluxo E2E de cadastro de câmera]] e
  [[SOFTWARE-2318 - Dashboard de câmeras - validação E2E de dados]].

## Achados do clique-a-clique (28/07)

Não são bugs de dado — gaps de UI/feature na tela já construída. Card novo aberto no ClickUp
([SOFTWARE-2356](https://app.clickup.com/t/86ajr3ffz)), implementados na branch
`cameras/fix/SOFTWARE-2356`, commitados localmente:

- [x] **Filtro por dispositivo** — `cameraId` já existia fim-a-fim no contrato/backend (só usado
      internamente pelo card "últimos eventos do dispositivo"); exposto agora como filtro na tela
      de lista + forwardado também pro endpoint de stats (que não recebia).
- [x] **Filtro "todo o período"** — não existia em nenhuma camada (enum, i18n, contrato, DTO,
      where-builder). Adicionado o token `all` fim-a-fim; omite o filtro de data inteiro.
- [x] **Rótulo de comparação do badge de tendência** — o badge já mostra a variação percentual mas
      não dizia contra o que compara (BLOCKER aberto em `UF-004-camera-events-summary-cards.md`).
      Adicionado hover tooltip no componente compartilhado; o tratamento visual definitivo (rótulo
      sempre visível) segue em aberto — o badge é um pill compacto sem espaço óbvio pro texto.
