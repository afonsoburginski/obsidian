---
id: S35-14
tags:
  - attlas
  - task
  - sprint-35
  - cameras
  - eventos
  - issues
  - frontend
titulo: "[Front] Detalhe do evento de câmera mostra o nome sem {channel} cru e o pino da origem em azul"
frente: Eventos, incidentes e alarmes
pr: "#5156"
issues: "#4915"
status: "Feita. #5156 mergeada em 29/09 às 14h29; a issue fechada no mesmo dia."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-14 - Câmeras - Eventos, incidentes e alarmes - Detalhe do evento sem variável crua e com o pino em azul

## O que estava errado

Na tela de detalhe do evento de câmera, o nome aparecia com a variável crua ("Câmera conectada via
{channel}") no título, na "Descrição do Evento" e no diálogo "Reportar ocorrência", enquanto o histórico da
mesma tela mostrava o canal real. O marcador da câmera no mapa de "Informações de origem" saía cinza,
quando o protótipo pede azul com o ícone branco.

## O que a PR entregou

O utilitário que monta os parâmetros do nome do evento, antes preso ao histórico, passa a ser
compartilhado e cobre todas as variáveis das mensagens de evento de câmera. Título, descrição e diálogo
passam esses parâmetros à tradução, e variável ausente vira texto vazio. O mapa compartilhado ganha a
opção de tom do pino, e o mapa de origem usa o azul.

## Estado

Mergeada e issue fechada em 29/09.
