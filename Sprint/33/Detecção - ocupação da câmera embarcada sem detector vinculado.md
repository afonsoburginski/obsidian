---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
card: SOFTWARE-3197
clickup: https://app.clickup.com/t/86akhp77y
titulo: "[Full] Ocupação da câmera embarcada é descartada por falta de detector vinculado"
frente: Analítico
tamanho: 3 pts
pr: "#3443"
status: "PR #3443 aberta, e a decisão foi as duas coisas: a semente vincula a região da câmera embarcada a um índice próprio (resolve a 101 de hoje) e a tela passa a dizer que sem faixa associada a região não alimenta as Métricas (resolve a próxima câmera cadastrada sem vínculo, que voltaria a falhar em silêncio). O descarte também passa a ser reportado uma vez por região em vez de uma vez por ocupação - o contador já carregava o volume."
sprint: "[[Attlas - Sprint 33]]"
atualizado: 2026-09-13
---

# Detecção - ocupação da câmera embarcada sem detector vinculado

`DetectorTranslationService` registra `occupancy discarded: camera …101 region 0 has no VEHICLE
detector binding` a cada poucos segundos, nos dois ambientes. A câmera embarcada tem região configurada
e publica caixa normalmente - o que não existe é a linha em `VirtualLoopDetectorBinding` ligando a
região a um detector de controlador, porque a semente só vincula as duas câmeras de modo servidor.

Consequência: a contagem e a ocupação da 101 não chegam ao `ms-detector-history`, então ela não aparece
nas Métricas nem alimenta o controlador, embora a tela de Detecção pareça correta.

## O que o card decide

Se a câmera embarcada ganha vínculo de detector por padrão - e em qual controlador e índice -, ou se a
tela passa a dizer que a região não tem detector, em vez de deixar o descarte só no log.

## Onde olhar

`apps/ms-video-analytics` (`DetectorTranslationService`), `VirtualLoopDetectorBinding` no
`apps/ms-cameras/src/database`, e a semente `SEED_DETECTOR_BINDINGS`.
