---
id: S35-13
tags:
  - attlas
  - task
  - sprint-35
  - analitico
  - instancias
  - issues
  - frontend
titulo: "[Front] Cadastro manual de analítico com asterisco nos obrigatórios e endereço IP no padrão das demais telas"
frente: Instâncias
pr: "#5155"
issues: "#4955"
status: "Feita. #5155 mergeada em 29/09 às 14h29; a issue fechada no mesmo dia."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-13 - Analítico - Instâncias - Cadastro manual de analítico com obrigatórios e endereço validado

## O que se pediu

No "Adicionar analítico", o bloco "Cadastrar manualmente" não marcava Endereço IP, Usuário e Senha como
obrigatórios, não tinha Nome e Porta, e o endereço aceitava texto livre e repetia o valor digitado na
mensagem de erro. A referência era o diálogo de cadastro de ACOM, em Controladores.

## O que a PR entregou

- Asterisco e `aria-required` em Endereço IP, Usuário e Senha.
- O endereço só aceita dígito, ponto, vírgula, barra e espaço, inclusive ao colar, e continua aceitando um
  endereço, uma lista ou uma faixa.
- O erro aparece também ao sair do campo e diz "Informe um endereço IPv4 válido.", sem repetir o valor.
- Nome e Porta não entraram, com o motivo na própria PR: o cadastro manual só varre o endereço e não cria
  registro, e o equipamento é acessado em portas fixas.

## Estado

Mergeada e issue fechada em 29/09.
