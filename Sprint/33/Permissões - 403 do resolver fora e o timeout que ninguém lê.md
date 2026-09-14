---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
  - permissoes
card: SOFTWARE-3202
clickup: https://app.clickup.com/t/86akhpt3y
titulo: "[Back] Guard de permissão responde 403 quando o resolver está fora, e o timeout do `.env` é letra morta"
frente: Plataforma
tamanho: 3 pts
pr: "#3453"
status: "PR #3453 aberta: `503 PERMISSION_RESOLVER_UNAVAILABLE` dedicado (a negação continua; o que muda é o que ela diz) e um nome só para o timeout - fica `CORE_AUTH_PERMISSION_TIMEOUT_MS`, que é quem faz a consulta, com o `.env.example` do `ms-cameras` declarando o mesmo trio dos demais, inclusive limiar e janela do circuito, que ele não declarava."
sprint: "[[Attlas - Sprint 33]]"
atualizado: 2026-09-13
---

# Permissões - 403 do resolver fora e o timeout que ninguém lê

Dois defeitos do mesmo mecanismo, por isso uma PR só.

## 1. O status engana

Quando o resolver de permissões não responde, o `core-auth` nega e a resposta é `403 FORBIDDEN_ACTION`
com `PERMISSION_RESOLVER_UNAVAILABLE` no corpo. Falhar fechado está certo; o código de status é que
engana, porque lê como "você não tem permissão" quando o que houve foi "não deu para perguntar".

Proposta: manter o fail-closed e responder 503 com o mesmo `errorCode` quando o motivo for
indisponibilidade do resolver, separando as duas coisas na tela e no log.

## 2. A variável do `.env` não é lida

O `.env.docker` do `ms-cameras` define `PERMISSIONS_CHECK_TIMEOUT_MS=1500`, mas o `core-auth` lê
`CORE_AUTH_PERMISSION_TIMEOUT_MS`, cujo default é 800 ms. Deu para ver na prática: o `PUT` que falhava
respondia em 875 ms e 805 ms, tempo do abort de 800. O card escolhe um nome só, corrige os
`.env.example` de todos os serviços que declaram o antigo e confere se o mesmo par existe para os
outros parâmetros do resolver (limiar e janela do circuit breaker).

## Contexto que vale guardar

O `ms-cameras` roda em container e o `ms-organization` estava em `nx serve` no host, então o nome
`ms-organization` não resolvia na attlas-net: a consulta estourava por timeout e o guard negava. A
permissão nunca esteve errada - `cameras.analyticsRegion:configure` é catalog-bound no perfil
Administrador. A correção local foi `ms-organization:host-gateway` no `extra_hosts` do `ms-cameras`, no
`docker-compose.override.yml`.
