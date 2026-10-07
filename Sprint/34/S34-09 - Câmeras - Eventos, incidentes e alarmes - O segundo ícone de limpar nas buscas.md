---
id: S34-09
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - frontend
titulo: "[Front] Eventos - um único ícone de limpar nas buscas de Eventos e do Log de Eventos"
frente: Câmeras
tamanho: 2 pts
pr: "#4146"
issues: "#1873"
status: "Feita. PR #4146 mergeada na develop em 22/09, fechando a issue 1873."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
aliases:
  - "Eventos - o segundo ícone de limpar nas buscas"
---

# S34-09 - Câmeras - Eventos, incidentes e alarmes - O segundo ícone de limpar nas buscas

Mesma classe de defeito da #4143, em outras duas telas: Câmeras > Eventos e Câmeras > Dispositivos >
Ver Detalhes > Log de Eventos. Fecha a issue 1873.

## O que estava errado

Os dois campos são `input type="search"` dentro de um `z-input-group` que já fornece o botão de
limpar pelo `zAddonAfter`. O controle nativo do Chrome aparece colado ao nosso, e o usuário vê dois
"x". O componente compartilhado não tem botão embutido, então a duplicidade não vem dele.

## O que muda

A desativação do controle nativo entra escopada ao campo de cada tela, nas folhas de
`camera-events.page.css` e `camera-event-log-tab.component.css`, com o mesmo bloco que outras telas
do app já usam. O `type="search"` fica, para preservar a semântica e o `role=searchbox`.

## O que tem de valer no fim

Digitar em qualquer uma das duas buscas mostra um só controle de limpar, e ele continua passando pelo
caminho debounced da busca.

## Relacionado

- [[S34-33 - Câmeras - Issues - As issues abertas do módulo]], a frente em que esta task entra.
