---
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - streaming
titulo: "[Back] Streaming - um laço de readiness por sessão, e o runbook de saturação de ingest"
frente: Streaming
tamanho: 3 pts
pr: "#4121"
status: "Feita. #4121 mergeada em 22/09."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
---

# Streaming - readiness por sessão e o runbook de saturação de ingest

Fecha duas das quatro pendências que o registro de 21/09 deixou listadas.

## O laço de readiness

Cada pedido de abertura esperava a relay ficar pronta por conta própria, então N telas pedindo a
mesma câmera criavam N laços de espera contra o mesmo caminho. Passa a haver um por sessão, e os
demais pedidos aguardam o mesmo resultado.

## O runbook

A bancada mediu a queda de 320 para 20 KB/s por 6 segundos no mesmo relay, com o media server
registrando duração de parte indo de 134 ms a 7,1 s. Não é configuração de HLS, é fome de quadro no
ingest. O runbook registra como reconhecer isso em produção, o que medir e em que ordem, para o
próximo episódio não recomeçar do diagnóstico.

> [!warning] Estado em 23/09: a seção 6 do runbook ficou defasada no mesmo dia
> O runbook diz que o `/metrics` do media server responde na faixa da control API. A #4073, mergeada
> em 23/09, desligou esse listener (`metrics: no`), então o comando da seção 6 não responde contra a
> develop. O resto do runbook, sessões RTSP, visão do media server, FPS e GOP, configurado contra
> medido e a matriz das quatro combinações, segue certo.

## O que tem de valer no fim

Abrir a mesma câmera em várias telas paga uma espera só, e o sintoma de fome de quadro tem um
procedimento escrito em vez de memória de quem estava presente.

## Relacionado

- [[Registro - implementação do plano de vazamento de publicador em 21 de setembro]], que deixou estas pendências declaradas.
