---
tags:
  - doc
  - ms-cameras
  - ptz
aliases:
  - "PTZ e presets"
  - "00 - PTZ e presets"
atualizado: 2026-10-01
---

# PTZ e presets

Controle das câmeras móveis no [[ms-cameras]]: movimento manual (relativo, absoluto, contínuo e parada),
presets nomeados com enquadramento capturado, tours, comando vindo de plano de resposta e acompanhamento da
posição ao vivo. Cobre RF-CAM-05, com autorização pelo módulo Permissões (RF-INT-06, RNF-CAM-08). O
comando entra por HTTP do operador, por Kafka do `ms-execution-plans` ou pelo tour em execução, e sai por
ONVIF ou por VAPIX conforme o tipo de comando. Código em `apps/ms-cameras/src/cameras/` e
`apps/ms-cameras/src/events/consumers/execution-plans-ptz-command/`, regra de negócio em
`docs/modules/cameras.md`. Diagrama: [[Diagrama - MOD-004 PTZ e presets.excalidraw|diagrama]].

## Notas deste domínio

- [[PTZ e presets - Arquitetura e estratégias]] - rotas, handlers, persistência, caminhos ONVIF e VAPIX,
  autorização, comando por plano, tour, auditoria, posição ao vivo, enquadramento do preset.
- [[PTZ e presets - Fluxos]] - comando manual, ir para preset, tour, comando por plano, captura de
  enquadramento e as telas que operam PTZ.
- [[PTZ e presets - Requisitos e SLA]] - cobertura de RF e RNF, limites e timeouts.

## Relacionados

[[Integração com dispositivo]] · [[Saúde e monitoramento]] · [[Eventos, incidentes e alarmes]] · [[VMS]] ·
[[Analítico]]
