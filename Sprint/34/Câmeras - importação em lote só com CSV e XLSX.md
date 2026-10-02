---
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - frontend
titulo: "[Front] Câmeras - importação em lote anuncia apenas CSV e XLSX"
frente: Câmeras
tamanho: 1 pt
pr: "#4166"
issues: "#3226"
status: "Feita. PR #4166 mergeada na develop em 22/09, fechando a issue 3226."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
---

# Câmeras - importação em lote só com CSV e XLSX

A etapa Dispositivos do cadastro de câmeras anunciava CSV, XLS e XLSX como formatos aceitos na
importação em lote, e o arquivo `.xls` era recusado por uma mensagem que mandava usar justamente
`.xls`. Fecha a issue 3226.

## O que estava errado

Só a copy. A decisão sobre o XLS já estava tomada na spec da importação: o `exceljs` lê apenas o
formato OOXML, o `.xls` binário legado é outro formato de arquivo e está fora do escopo. O parser e o
seletor de arquivo já aceitavam só `.csv` e `.xlsx`; o banner de onboarding e o toast de formato não
suportado é que diziam o contrário. Arrastar o arquivo sobre o painel contornava o filtro do seletor e
caía na mensagem circular.

## O que muda

As duas mensagens passam a dizer "CSV ou XLSX" nos quatro idiomas, e as duas atômicas que repetiam a
lista errada foram corrigidas. Um teste novo prende as três superfícies que anunciam formato umas às
outras: os catálogos, o `accept` do campo de arquivo e a lista de extensões do parser. Ampliar o parser
sem reescrever os catálogos, ou citar num catálogo um formato que o parser recusa, deixa a suíte
vermelha.

## O que tem de valer no fim

Toda superfície da importação em lote de câmeras anuncia o mesmo conjunto de formatos que o parser
aceita, e a recusa de um `.xls` dá uma instrução que resolve: salvar a planilha como `.xlsx`.

## O que ficou de fora

O módulo de controladores tem a mesma copy com XLS, mas ali o campo de arquivo declara aceitar `.xls`
de fato. Saber se o parser dele lê o formato é outra investigação, em outra tela, e pede issue própria.

## Relacionado

- [[Câmeras - as issues abertas do módulo]], a frente em que esta task entra.
