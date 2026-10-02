---
tags:
  - doc
  - ms-cameras
  - saude
aliases:
  - "Câmeras - Saúde e monitoramento"
  - "Saúde e monitoramento"
  - "00 - Saúde e monitoramento"
  - "Status em tempo real"
  - "00 - Status em tempo real"
  - "Status em tempo real (push)"
atualizado: 2026-10-01
---

# Câmeras - Saúde e monitoramento

Como o [[Câmeras]] sabe, 24 horas por dia, se cada câmera cadastrada está viva e com que qualidade de
conexão, como guarda a disponibilidade ao longo do tempo (janelas de 5 minutos consolidadas num rollup
diário de 90 dias) que alimenta a "Saúde da Câmera", e como entrega o estado ao vivo para a tela pelo
gateway Socket.IO `cameras-status` (RF-CAM-03 e RF-CAM-04). O monitoramento é um só domínio: o worker de
saúde produz o estado e a camada ao vivo só o empurra para quem está olhando. Código em
`apps/ms-cameras/src/health/` (monitoramento e histórico) e `apps/ms-cameras/src/cameras/realtime/`
(entrega ao vivo); regra de negócio em `docs/modules/cameras.md`. Visual:
[[Câmeras - Saúde e monitoramento - Diagrama.excalidraw|diagrama]].

## Notas deste domínio

- [[Câmeras - Saúde e monitoramento - Arquitetura e estratégias]] - coordenador de leases, worker por device,
  canais por fabricante, evaluator, snapshot vencido, janelas e rollup, UC-026, gateway `cameras-status`,
  cache Redis, tópico `attlas.cameras.status-changed`, endpoints, persistência, armadilhas e pendências.
- [[Câmeras - Saúde e monitoramento - Fluxos]] - ciclo do heartbeat, fechamento de janela, rollup, consulta de
  métricas, assinatura do canal ao vivo e onde a saúde aparece na tela.
- [[Câmeras - Saúde e monitoramento - Requisitos e SLA]] - regras de negócio da Saúde da Câmera (SLA, uptime e
  reachability, mapa de 4 para 3 estados), RF-CAM-03, RF-CAM-04, RNF-CAM-01, retenção e variáveis de
  ambiente.
- [[Câmeras - Saúde e monitoramento - Guia de degradação]] - PDF para público misto sobre quando a câmera é Online,
  Degradada ou Offline.
- Bitrate medido e provisionado da câmera: [[Câmeras - Streaming - Banda e bitrate]].
- [[Câmeras - Saúde e monitoramento - Diagrama.excalidraw]] - desenho, apoio visual; vale o código, depois a nota.

## Relacionados

[[Câmeras - Eventos, incidentes e alarmes]] · [[Câmeras - Integração com dispositivo]] · [[Câmeras - Streaming]] · [[Câmeras - PTZ e presets]] ·
[[Câmeras - Dashboard]]
