---
tags:
  - attlas
  - task
  - permissoes
  - cameras
card: SOFTWARE-2005
clickup: https://app.clickup.com/t/86ajc6uzx
titulo: "[Back] Permissões de usuário nas rotas de câmeras: mapa das 86 rotas e chaves que faltam"
frente: Permissões de câmeras
tamanho: a estimar
status: to do. Movido da lista da Sprint 26 para a Sprint 27 no ClickUp em 03/08, e da Sprint 27 para a Sprint 28 em 10/08 (a 27 encerrou em 09/08 sem o card ser tocado; fica fora do foco único do videowall/VMS desta semana, mas precisa de lista ativa).
lista_clickup: Sprint 29 (17/8/26 - 23/8/26), movido em 17/08
sprint: "[[Attlas - Sprint 29]]"
atualizado: 2026-08-17
---

# Permissões nas rotas de câmeras — mapa das 86 rotas

> Rescopado em 31/07: deixou de ser "novas regras de permissões de usuário" genérico (que colidia
> com o squad 3 — [[SOFTWARE-2329]] e [[SOFTWARE-2292]] do Hadson no `ms-organization`) e virou o
> recorte que é nosso, permissão em tudo de câmeras. Detalhe completo em [[Attlas - Sprint 26]].

## Por que existe

O `ms-cameras` importa `CoreAuthModule.forRoot()` e valida assinatura de JWT, mas tem **zero**
decorator de autorização nas suas **86 rotas** de 15 controllers — qualquer token válido passa em
qualquer rota. O catálogo em `@attlas/contracts` tem só **8 chaves de câmera** (`stream:view`, 3 de
PTZ, create, edit, delete, `crowdControl:enable`) e `DASHBOARD_PERMISSIONS` está vazio, contra 27
chaves do traffic-model e 19 do pmv.

## Objetivo

Entregar o mapa/tabela de decisão das 86 rotas (qual chave de permissão cada uma exige) mais as
chaves novas que faltam no catálogo, aditivas e coordenadas com o dono do catálogo. **Não aplica**
o decorator — isso é o [[SOFTWARE-2400 - Aplicar enforcement de permissão nas rotas de câmeras|2400]],
card separado porque são duas PRs.

## Escopo

- [ ] Mapear as 86 rotas dos 15 controllers do `ms-cameras` e decidir a chave de permissão de cada uma.
- [ ] Adicionar as chaves novas em `@attlas/contracts` (aditivo, sem quebrar as 8 existentes).
- [ ] Preencher `DASHBOARD_PERMISSIONS` (hoje vazio).
- [ ] Registrar a tabela de decisão na spec (MOD/atomic do `ms-cameras`).

## DoD

- Tabela de decisão das 86 rotas aprovada.
- Catálogo de chaves de câmera atualizado em `@attlas/contracts`, aditivo.
- Zero decorator aplicado ainda — isso fica para o 2400.

## Fontes de verdade

- [[Attlas - Sprint 26]] — seção "Permissões de câmera entram na semana (31/07)", onde o rescopo foi decidido.
- Contexto de módulos funcionais em `docs/modules/` e o edital (fonte de verdade das regras de negócio).
