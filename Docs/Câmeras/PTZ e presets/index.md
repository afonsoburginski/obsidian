---
tags:
  - doc
  - ms-cameras
  - ptz
aliases:
  - "Câmeras - PTZ e presets"
  - "PTZ e presets"
  - "00 - PTZ e presets"
atualizado: 2026-10-01
---

# Câmeras - PTZ e presets

Controle das câmeras móveis no [[Câmeras]]: movimento manual (relativo, absoluto, contínuo e parada),
presets nomeados com enquadramento capturado, tours, comando vindo de plano de resposta e acompanhamento da
posição ao vivo. Cobre RF-CAM-05, com autorização pelo módulo Permissões (RF-INT-06, RNF-CAM-08). O
comando entra por HTTP do operador, por Kafka do `ms-execution-plans` ou pelo tour em execução, e sai por
ONVIF ou por VAPIX conforme o tipo de comando. Código em `apps/ms-cameras/src/cameras/` e
`apps/ms-cameras/src/events/consumers/execution-plans-ptz-command/`, regra de negócio em
`docs/modules/cameras.md`. Diagrama: [[Câmeras - PTZ e presets - Diagrama.excalidraw|diagrama]].

## Notas deste domínio

- [[Câmeras - PTZ e presets - Arquitetura e estratégias]] - rotas, handlers, persistência, caminhos ONVIF e VAPIX,
  autorização, comando por plano, tour, auditoria, posição ao vivo, enquadramento do preset.
- [[Câmeras - PTZ e presets - Fluxos]] - comando manual, ir para preset, tour, comando por plano, captura de
  enquadramento e as telas que operam PTZ.
- [[Câmeras - PTZ e presets - Requisitos e SLA]] - cobertura de RF e RNF, limites e timeouts.
- [[Câmeras - PTZ e presets - Diagrama.excalidraw]] - desenho, apoio visual; vale o código, depois a nota.

## Relacionados

[[Câmeras - Integração com dispositivo]] · [[Câmeras - Saúde e monitoramento]] · [[Câmeras - Eventos, incidentes e alarmes]] · [[Câmeras - VMS]] ·
[[Analítico]]
