---
id: S36-15
tags:
  - attlas
  - task
  - sprint-36
  - cameras
  - issues
  - frontend
titulo: "[Front] Rótulos das colunas dos perfis de mídia em cinza e ajuda no token da origem"
frente: Detalhe da câmera
pr: "#6006"
issues: "#5977"
status: "Mergeada em 07/10 às 08h41, atendendo parte da issue #5977, que segue aberta."
sprint: "[[Attlas - Sprint 36]]"
atualizado: 2026-10-07
---

# S36-15 - Câmeras - Detalhe da câmera - Rótulos dos Perfis de Mídia e ajuda no token da origem

## O que estava errado

A issue #5977 lista seis divergências entre a aba Perfis de Mídia e o protótipo. Duas eram de aparência: os
rótulos das colunas da listagem pareciam links clicáveis, e o campo "Token da Origem" do painel de detalhe
não explicava o que era.

## O que a PR entregou

Os rótulos das colunas voltam ao cinza neutro do protótipo, e o "Token da Origem" ganha um ícone de
informação com o texto de ajuda, acessível por teclado, nos quatro idiomas.

## Estado

Mergeada em 07/10. A issue segue aberta: as outras quatro divergências (novo perfil, editar por linha,
excluir e o rodapé do painel) precisam de criar, editar e excluir perfil, que não existem hoje, porque o
`ms-cameras` só lê o inventário ONVIF, e não há spec desse fluxo.
