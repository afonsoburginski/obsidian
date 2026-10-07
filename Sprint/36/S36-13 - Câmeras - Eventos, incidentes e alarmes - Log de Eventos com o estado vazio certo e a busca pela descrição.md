---
id: S36-13
tags:
  - attlas
  - task
  - sprint-36
  - cameras
  - eventos
  - issues
titulo: "[Full] Log de Eventos com o estado vazio da tela cheia e a busca que encontra a descrição no idioma da tela"
frente: Eventos, incidentes e alarmes
pr: "#6001, #6009"
issues: "#5988, #5978"
status: "Feita. #6001 mergeada em 06/10 às 15h01 e #6009 em 07/10 às 08h41; a #5988 fechada em 06/10 e a #5978 em 07/10."
sprint: "[[Attlas - Sprint 36]]"
atualizado: 2026-10-07
---

# S36-13 - Câmeras - Eventos, incidentes e alarmes - Log de Eventos com o estado vazio certo e a busca pela descrição

## O que estava errado

- **#5988**: o estado vazio da aba Log de Eventos no painel lateral usava ícone e textos próprios ("Sem
  eventos recentes"), diferentes da mesma aba em tela cheia e do protótipo.
- **#5978**: a busca do Log de Eventos não encontrava a palavra que a coluna Descrição mostra. O servidor
  comparava o termo com o resumo e com a chave de tradução, mas a descrição é montada no cliente traduzindo
  a chave, então "Câmera" nunca existiu no banco. A cada letra a tabela virava skeleton e o campo travava.

## O que as PRs entregaram

- **#6001**: o painel lateral usa o ícone e os textos da tela cheia. O componente é compartilhado, então
  as abas Saúde e os drawers de eventos que o usam mudam junto.
- **#6009**: o termo é resolvido no `ms-cameras` contra o catálogo de tradução do idioma da tela, sem
  diferenciar maiúsculas nem acentos, e a tela deixa de piscar e de travar o campo durante a digitação.

## Estado

As duas mergeadas e as duas issues fechadas.
