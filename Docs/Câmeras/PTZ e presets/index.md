---
tags:
  - doc
  - cameras
  - ptz
  - ms-cameras
aliases:
  - "Câmeras - PTZ e presets"
  - "PTZ e presets"
  - "00 - PTZ e presets"
atualizado: 2026-10-07
---

# Câmeras - PTZ e presets

## Resumo

É o controle das câmeras móveis no `ms-cameras`: movimento manual, presets com enquadramento capturado, tours
(automações), comando vindo de plano de resposta e posição ao vivo. O comando entra por HTTP do operador, por
Kafka do `ms-execution-plans` ou pelo tour em execução, é autorizado pelo módulo Permissões e sai por ONVIF ou
VAPIX ([[Câmeras - Integração com dispositivo]]). O código fica em `apps/ms-cameras/src/cameras/` e
`apps/ms-cameras/src/events/consumers/execution-plans-ptz-command/`, e a regra de negócio em
`docs/modules/cameras.md`.

## Notas

| Nota | Abra quando |
| --- | --- |
| [[Câmeras - PTZ e presets - Arquitetura e estratégias]] | precisa das rotas, permissões, tabelas, dos dois caminhos de execução, do tour, da trilha de auditoria e de por que é assim |
| [[Câmeras - PTZ e presets - Fluxos]] | quer o passo a passo do comando manual, do ir para preset, do tour, do comando por plano, da captura de enquadramento ou das telas que operam PTZ |
| [[Câmeras - PTZ e presets - Requisitos e SLA]] | precisa do estado de cada requisito do edital, dos limites, timeouts e variáveis de ambiente |

## Explicações para usuário

Não há explicação para usuário deste subdomínio na raiz do vault.

## Diagramas

| Diagrama | O que mostra |
| --- | --- |
| [[Câmeras - PTZ e presets - Diagrama.excalidraw]] | as três entradas do comando e os caminhos ONVIF e VAPIX até a câmera; é apoio visual, e quando discorda vale o código e depois a nota |
