---
tags:
  - doc
  - ms-cameras
  - cameras
  - novastar
  - quito
  - videowall
aliases:
  - "Videowall externo (NovaStar H9)"
  - "00 - Videowall externo (NovaStar H9)"
  - "Videowall"
atualizado: 2026-10-01
---

# Videowall externo (NovaStar H9)

O videowall é o painel físico da sala de controle de Quito, comandado por um processador NovaStar H9 que não
é do Attlas e que a plataforma dirige pela Open API, direto da consola e por Ethernet, como exige a cláusula
16.13 do contrato. É um alvo de exibição do [[VMS]], dentro do `ms-cameras`
(`apps/ms-cameras/src/video-wall/targets/`) e do módulo `videowall` do front
(`apps/web-attlas/src/app/modules/videowall/display-target/`, tela `/cameras/videowall-panel`). Tem dois modos:
**espelho**, com a tela do operador na parede, e **projeção nativa**, com uma fonte por câmera de uma cena
salva, usada também por plano de resposta. Em ambos a fonte é servida pela plataforma pelo [[Streaming]], e
credencial de câmera nunca vai ao equipamento. O adaptador segue a Open API oficial e o H9 real de Quito, em
`10.200.0.51` pelo WireGuard do dev.v2, aceita comando, fonte e camada; o vídeo ainda não chega ao painel, ver
[[Videowall H9 - vídeo não chega ao painel]].

## Notas deste domínio

- [[Videowall - Arquitetura e estratégias]] - os dois modos, por que mora no VMS, transporte do espelho, código, rotas, persistência, capacidades, brilho e ocupação, frontend, equipamento e Open API, lacunas.
- [[Videowall - Fluxos]] - espelhar, projetar cena, plano de resposta, grupos e rotação, brilho.
- [[Videowall - Requisitos e SLA]] - cláusula 16.13 literal, obrigações e o que o código entrega, leituras e precedência.
