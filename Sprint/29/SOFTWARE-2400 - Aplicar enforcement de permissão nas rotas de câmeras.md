---
tags:
  - attlas
  - task
  - permissoes
  - cameras
card: SOFTWARE-2400
clickup: https://app.clickup.com/t/86aju7hgr
titulo: "[Back] Aplicar o enforcement de permissão nas rotas de câmeras"
frente: Permissões de câmeras
tamanho: a estimar
status: to do. Movido da lista da Sprint 26 para a Sprint 27 no ClickUp em 03/08, e da Sprint 27 para a Sprint 28 em 10/08 (a 27 encerrou em 09/08 sem o card ser tocado; fica fora do foco único do videowall/VMS desta semana, mas precisa de lista ativa).
lista_clickup: Sprint 29 (17/8/26 - 23/8/26), movido em 17/08
sprint: "[[Attlas - Sprint 29]]"
atualizado: 2026-08-17
depende_de: "[[SOFTWARE-2005 - Permissões nas rotas de câmeras - mapa das 86 rotas]]"
---

# Aplicar enforcement de permissão nas rotas de câmeras

> Nasceu em 31/07 junto do rescopo do [[SOFTWARE-2005 - Permissões nas rotas de câmeras - mapa das 86 rotas|2005]].
> Dois cards porque são duas PRs: o 2005 entrega a tabela de decisão mais as chaves novas do
> catálogo, este aplica o decorator. Detalhe completo em [[Attlas - Sprint 26]].

## Objetivo

Aplicar os decorators de autorização nas 86 rotas do `ms-cameras` a partir da tabela de decisão do
2005, com teste do caminho negado (token válido sem a permissão certa deve ser rejeitado).

## Escopo

- [ ] Decorator de permissão em cada uma das 86 rotas, conforme a chave decidida no 2005.
- [ ] Teste de caminho negado por rota (ou por grupo de rotas equivalentes).
- [ ] Conferir os fluxos principais no `:4200` com login real antes do merge.

## Risco a vigiar

Ligar enforcement em serviço que nunca teve derruba tela que hoje funciona por ausência de regra.
Não mergear sem validar os fluxos principais com login real.

## Bloqueio

Depende do catálogo de chaves e da tabela de decisão do 2005 estarem fechados antes de decorar —
decorar contra um alvo que ainda vai mudar é retrabalho.

## Fontes de verdade

- [[Attlas - Sprint 26]] — seção "Permissões de câmera entram na semana (31/07)".
- [[SOFTWARE-2005 - Permissões nas rotas de câmeras - mapa das 86 rotas]].
