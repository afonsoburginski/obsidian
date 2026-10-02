---
tags:
  - doc
  - ms-cameras
  - cameras
aliases:
  - "Câmeras - Cadastro"
  - "Cameras"
  - "00 - Cameras"
  - "Cameras - cadastro e ciclo de vida"
atualizado: 2026-10-01
---

# Câmeras - Cadastro

Cadastro e ciclo de vida da entidade `Camera` no [[Câmeras]]: cadastro em lote com sondagem e
provisionamento no mesmo pedido, listagem com filtros, edição, os quatro estados, substituição de
equipamento com herança, remoção lógica, catálogo de marcas e modelos, validação de credenciais e as
leituras em lote para outros serviços. Código em `apps/ms-cameras/src/cameras/`, frontend em
`apps/web-attlas/src/app/modules/cameras/`, regra de negócio em `docs/modules/cameras.md` (seções 3.1, 4
e 8.1). Diagrama: [[Câmeras - Cadastro - Diagrama.excalidraw|diagrama]].

## Notas deste domínio

- [[Câmeras - Cadastro - Arquitetura e estratégias]] - mapa de código, rotas, persistência, ciclo de vida,
  provisionamento, autorização, auditoria e publicação do ciclo de vida, armadilhas.
- [[Câmeras - Cadastro - Fluxos]] - passo a passo de cada caso de uso do backend e das telas do `web-attlas`.
- [[Câmeras - Cadastro - Requisitos e SLA]] - cobertura de RF-CAM e RNF-CAM, regras de domínio, limites e erros.
- Explicação para o usuário final: [[Câmeras - Cadastro - Explicação - Estados de cadastro]].
- [[Câmeras - Cadastro - Diagrama.excalidraw]] - desenho, apoio visual; vale o código, depois a nota.

## Relacionados

[[Câmeras]] · [[Câmeras - Integração com dispositivo]] · [[Câmeras - Saúde e monitoramento]] · [[Câmeras - PTZ e presets]] ·
[[Câmeras - VMS]] · [[Analítico]]
