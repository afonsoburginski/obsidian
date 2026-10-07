---
id: S35-22
tags:
  - attlas
  - task
  - sprint-35
  - cameras
  - saude
  - backend
titulo: "[Back] Câmera online aparecendo offline porque o monitor de saúde parava de reconectar"
frente: Saúde e monitoramento
pr: "#5305"
status: "Feita. #5305 mergeada em 30/09 às 08h26."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-22 - Câmeras - Saúde e monitoramento - O monitor de saúde volta a reconectar

## O que estava errado

No dev.v2, a câmera `ATMN - EMBEDDED 080` respondia ping e HTTP a partir do servidor, mas as quatro câmeras
cadastradas naquele IP apareciam offline desde 29/09. O WebSocket de eventos da Axis caiu, duas tentativas
estouraram o tempo, a terceira recebeu 503 no handshake e nenhuma tentativa nova foi agendada. O
`ms-cameras` seguiu com o lease do equipamento no Redis, então nenhuma outra réplica assumiu.

A trava que evita gravar OFFLINE duas vezes também decidia se a próxima reconexão seria agendada, e a
tentativa que falhava por evento de erro era descartada sem agendar a seguinte. Vale para a Axis quando o
handshake falha, e para toda nova tentativa ONVIF ou Hikvision.

## O que a PR entregou

Cada conexão agenda a sua reconexão uma única vez, e a trava passa a só deduplicar o registro de OFFLINE.
Os tratadores de queda e de erro, que eram cópias, viraram um só.

## Estado

Mergeada em 30/09. Até o deploy, a câmera só voltava com restart do `ms-cameras` no dev.v2.

## Relacionado

- [[Câmeras - Saúde e monitoramento - Arquitetura e estratégias]]
