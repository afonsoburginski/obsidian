---
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - videowall
  - frontend
titulo: "[Front] Videowall - nome de grupo salvo deixa de duplicar por capitalização"
frente: Câmeras
tamanho: 2 pts
pr: "#4148"
issues: "#3025"
status: "Feita. PR #4148 mergeada na develop em 22/09, fechando a issue 3025."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
---

# Videowall - nome de grupo duplicado por capitalização

"Novo grupo" e "Novo GRUPO" entravam como dois grupos distintos e ficavam lado a lado na lista. Fecha
a issue 3025.

## Por que acontecia

A recusa vem do servidor, montada sobre a violação do índice único de nome do grupo por sistema, e é
para vir de lá mesmo: leitura prévia perde a corrida. Só que o Postgres compara esse índice byte a
byte, então duas grafias que diferem apenas na caixa nunca colidem e o conflito nunca era emitido.

## O que muda

Uma função de dobra de nome, com `trim` mais caixa baixa por locale, passa a ser a forma em que os
nomes são comparados no diálogo. O diálogo lê os nomes já salvos ao abrir e nunca os exibe, porque
ler não é listar e a segunda lista continua proibida pela spec da tela. Nome que dobra para um já
salvo recebe o mesmo aviso do repetido exato e nem chega a chamar o servidor. Leitura que falha não
recusa nada: o conflito do servidor segue sendo o portão.

## O que tem de valer no fim

Salvar um nome que já existe, diferindo só na capitalização, é bloqueado com a mesma mensagem de nome
já usado, e a corrida entre dois operadores continua sendo resolvida pelo banco.

## Relacionado

- [[Câmeras - as issues abertas do módulo]], a frente em que esta task entra.
