---
id: S36-02
tags:
  - attlas
  - task
  - sprint-36
  - cameras
  - issues
  - frontend
titulo: "[Front] Detalhe de câmera inexistente mostra só o erro, sem cabeçalho, botão Editar nem trilha repetida"
frente: Detalhe da câmera
pr: "#5741"
issues: "#5469"
status: "Mergeada em 05/10 às 09h11. A issue foi fechada em 05/10 e reaberta pelo QA em 06/10."
sprint: "[[Attlas - Sprint 36]]"
atualizado: 2026-10-07
---

# S36-02 - Câmeras - Detalhe da câmera - Câmera inexistente mostra só o erro

A PR foi aberta em 02/10, na Sprint 35.

## O que estava errado

Abrindo o detalhe de uma câmera que não existe mais, por exemplo por um link antigo de notificação, a tela
mostrava "Câmera não encontrada ou removida", mas continuava montada como se houvesse câmera: cabeçalho
com ícone, ponto de estado e um travessão no lugar do nome, botão "Editar" ativo e a trilha de navegação
repetindo "Câmeras". O mesmo acontecia em acesso negado e em erro genérico.

## O que a PR entregou

No estado de erro, a tela mostra só a mensagem com "Tentar de novo" e "Voltar". O segundo nível da trilha
passa a ser o nome da câmera e só aparece quando ela carrega.

## Estado

Mergeada em 05/10. A issue #5469 foi fechada no mesmo dia e reaberta em 06/10 pelo QA, com um erro 400 ao
acessar uma URL inválida de câmera e a comparação com o comportamento da tela de controladores.
