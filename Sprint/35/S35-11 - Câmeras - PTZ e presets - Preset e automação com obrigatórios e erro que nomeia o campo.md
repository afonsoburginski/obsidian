---
id: S35-11
tags:
  - attlas
  - task
  - sprint-35
  - cameras
  - ptz
  - issues
  - frontend
titulo: "[Front] Nome do preset e preset de cada passo da automação como obrigatórios, com erro que nomeia operação e campo"
frente: PTZ e presets
pr: "#5148, #5154"
issues: "#4328, #4326"
status: "Feita. #5148 mergeada em 29/09 às 14h18 e #5154 às 14h29; as duas issues fechadas no mesmo dia."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-11 - Câmeras - PTZ e presets - Preset e automação com obrigatórios e erro que nomeia o campo

## O que estava errado

- **#4328**: o campo "Nome do preset" não tinha rótulo nem asterisco, já abria com a mensagem de erro em
  vermelho, e uma mensagem só juntava obrigatoriedade e limite de tamanho.
- **#4326**: salvar uma automação com um passo sem preset mandava a requisição mesmo assim, e o toast
  dizia "Erro ao carregar automações / Falha de validação", sem a operação real nem o campo.

## O que as PRs entregaram

- **#5148**: rótulo com o asterisco do cadastro de câmera, erro de obrigatório só depois de sair do campo
  vazio ou de tentar salvar, mensagem de limite separada, e o limite de 64 caracteres vindo da mesma
  validação que o backend usa.
- **#5154**: o preset é obrigatório em qualquer passo e bloqueia salvar e editar. O toast diz a operação
  (criar, editar ou excluir) e o campo recusado, os obrigatórios ganham asterisco, e os três campos
  numéricos do passo ficam alinhados mesmo com rótulo em duas linhas.

## Estado

As duas mergeadas e as duas issues fechadas em 29/09.

## Relacionado

- [[Câmeras - PTZ e presets - Fluxos]]
