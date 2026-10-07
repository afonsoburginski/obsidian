---
id: S36-09
tags:
  - attlas
  - task
  - sprint-36
  - analitico
  - neural-labs
titulo: "[Full] Cadastro da Neural Labs pela tela de Instâncias e socket de leitura de placas pronto para o equipamento real"
frente: Neural Labs
pr: "#5990"
status: "Feita. #5990 mergeada em 06/10 às 13h55."
sprint: "[[Attlas - Sprint 36]]"
atualizado: 2026-10-07
---

# S36-09 - Analítico - Neural Labs - Cadastro pela tela e socket pronto para o equipamento real

## O que estava errado

Na prova de campo no dev.v2, o socket de leitura de placas já recebia e gravava os quadros do simulador,
mas não havia como cadastrar o servidor Neural Labs pela tela, e o socket recusava o tráfego do
equipamento real: fechava a conexão ociosa e rejeitava leitura sem identificador.

## O que a PR entregou

- **Cadastro**: o painel "Adicionar analítico" ganha "Cadastrar servidor Neural Labs", com nome, IP de
  origem, fuso do relógio do servidor e vínculo automático pelo nome. A caixa existe porque o NEURAL SERVER
  disca para o Attlas e nunca aparece na varredura. A rota nova é auditada, e endereço já cadastrado
  responde 409.
- **Socket**: leitura com `IncidenceID` vazio, como no exemplo do próprio manual, ganha uma chave derivada;
  a conexão quieta não é mais fechada, e o keepalive TCP acha o par morto; um quadro que falha não leva os
  outros do mesmo pacote; mudar endereço, fuso ou ligar e desligar a instância fecha a conexão aberta.
- O `docker-compose.yml` publica a porta do socket.

## Estado

Mergeada em 06/10.

## Relacionado

- [[Analítico - Neural Labs - Explicação - Como cadastrar a Neural Labs]]
- [[Analítico - Neural Labs - Runbook]]
