---
id: S36-03
tags:
  - attlas
  - task
  - sprint-36
  - cameras
  - eventos
  - issues
  - frontend
titulo: "[Front] Tela de Eventos de câmera: colunas Câmera, Área e Subárea, visualização do protótipo, ícone do Total e data com \"às\""
frente: Eventos, incidentes e alarmes
pr: "#5743, #5846, #6004"
issues: "#1875, #5999"
status: "Feita. #5743 mergeada em 05/10 às 09h12, #5846 às 15h38 e #6004 em 06/10 às 16h49; as issues #1875 e #5999 fechadas."
sprint: "[[Attlas - Sprint 36]]"
atualizado: 2026-10-07
---

# S36-03 - Câmeras - Eventos, incidentes e alarmes - Colunas, visualização e data da tela de Eventos

## O que estava errado

- **#1875**: em Câmeras, Eventos, a tabela abria na lista compacta, que não tem Câmera, Área e Subárea como
  colunas próprias. O "Ocultar colunas" dessa lista oferecia colunas que nela não existem, e desmarcar
  qualquer uma não fazia nada.
- **#5999**: a tela divergia do protótipo "Dispositivos - Cam - Eventos - Tabela" em três pontos: o modo de
  visualização inicial, o ícone do cartão Total (um avião de papel) e o formato de "Detectado em", sem o
  "às" e sem acompanhar o idioma.

## O que as PRs entregaram

- **#5743** (aberta em 02/10): o "Ocultar colunas" lista só as colunas da visualização que está na tela.
  Não fechava a #1875, que dependia de decisão de produto.
- **#5846**: por decisão do dono, a tela passou a abrir na tabela ampla, com Código, Câmera, Evento,
  Classificação, Área, Subárea, Severidade, Acionamentos e Detectado em; Origem e Status ocultas por padrão.
  Fechou a #1875.
- **#6004**: com a #5999, a tela volta a abrir na lista agrupada, como no protótipo, e a tabela ampla fica
  no segundo botão com as mesmas colunas. O cartão Total usa o ícone de câmera, e "Detectado em" usa o
  formato do catálogo de tradução, como "06/10/2026 às 08:43:30". O cartão Críticos mantém o ícone atual
  até o design confirmar a troca.

## Estado

As três mergeadas. A #1875 foi fechada em 05/10 e a #5999 em 06/10.
