---
tags:
  - doc
  - ms-cameras
  - cameras
aliases:
  - "Cameras"
  - "00 - Cameras"
  - "Cameras - cadastro e ciclo de vida"
atualizado: 2026-10-01
---

# Cameras

Cadastro e ciclo de vida da entidade `Camera` no [[ms-cameras]]: cadastro em lote com sondagem e
provisionamento no mesmo pedido, listagem com filtros, edição, os quatro estados, substituição de
equipamento com herança, remoção lógica, catálogo de marcas e modelos, validação de credenciais e as
leituras em lote para outros serviços. Código em `apps/ms-cameras/src/cameras/`, frontend em
`apps/web-attlas/src/app/modules/cameras/`, regra de negócio em `docs/modules/cameras.md` (seções 3.1, 4
e 8.1). Diagrama: [[Diagrama - MOD-001 cadastro de câmeras.excalidraw|diagrama]].

## Notas deste domínio

- [[Cameras - Arquitetura e estratégias]] - mapa de código, rotas, persistência, ciclo de vida,
  provisionamento, autorização, auditoria e publicação do ciclo de vida, armadilhas.
- [[Cameras - Fluxos]] - passo a passo de cada caso de uso do backend e das telas do `web-attlas`.
- [[Cameras - Requisitos e SLA]] - cobertura de RF-CAM e RNF-CAM, regras de domínio, limites e erros.
- Explicação para o usuário final: [[Câmeras - Estados de cadastro]].

## Relacionados

[[ms-cameras]] · [[Integração com dispositivo]] · [[Saúde e monitoramento]] · [[PTZ e presets]] ·
[[VMS]] · [[Analítico]]
