---
id: S38-01
tags:
  - attlas
  - task
  - sprint-38
  - cameras
  - ptz
  - backend
titulo: "[Back] Status da câmera (GET e socket) informa o preset em vigor, com id e name, ou null"
frente: Saúde e monitoramento
tamanho: 3
pedido: "Daniel Zanotelli, pedido pelo squad dele em 15/10"
pr: "#7688"
status: "PR #7688 aberta em 15/10, com o Daniel Zanotelli como revisor. Antecipada da semana de 19 a 25/10."
sprint: "[[Attlas - Sprint 38]]"
atualizado: 2026-10-15
---

# S38-01 - Câmeras - Saúde e monitoramento - Preset em vigor no status da câmera

## Resumo

| Pergunta | Resposta |
| --- | --- |
| O que entrega | `GET /api/cameras/:id/status` e o socket `cameras-status` trazem `currentPreset`: o preset que a câmera ocupa agora, com `id` e `name`, ou `null` |
| Quem pediu | Daniel Zanotelli |
| Spec | `apps/ms-cameras/docs/atomic/UC-246-current-preset-in-camera-status.md` |
| PR | [#7688](https://github.com/atmanadmin/attlas-2026/pull/7688), revisor `@DanielZanotelliAtman`, assignee Afonso |
| Permissão e auditoria | Nenhuma rota nem mutação nova. O GET é leitura escopada, já contida pelo `assertCameraInSystem` |

## Como funciona

- O preset em vigor é o que tem pan, tilt e zoom dentro da tolerância da posição gravada no snapshot. O zoom
  da câmera (VAPIX, 1 a 9999) é convertido para a porcentagem que o preset guarda antes de comparar, e o pan
  compara pela menor distância angular.
- Dois presets dentro da tolerância: vence o mais próximo; empate pelo menor `sortOrder`.
- Só câmera Axis tem posição conhecida. Nas demais, e com algum eixo nulo, o campo vem `null`.
- O socket passa a reenviar o status, e regravar o cache Redis, quando a câmera Axis para de se mover e quando
  um preset da câmera é criado, alterado ou removido. O worker espera a posição final ser gravada antes de pedir
  o reenvio.

| Variável | Padrão |
| --- | --- |
| `PTZ_PRESET_MATCH_PAN_TILT_TOLERANCE_DEGREES` | `0.5` |
| `PTZ_PRESET_MATCH_ZOOM_TOLERANCE_PERCENT` | `1` |

Os padrões vêm da PTZ da bancada no dev em 15/10: parada no preset `M` (`165.000 / -90.000 / 8.00`), ela
reportava `165.000 / -89.860` e zoom `7,97%`. O preset grava o zoom em porcentagem inteira, então a tolerância de
zoom precisa passar de `0,5` ponto.

## Estado

PR aberta. Testes unitários dos arquivos tocados passaram localmente (resolver, escala de zoom, status service,
publisher, handlers, worker e CRUD de preset). O gate completo roda no CI. Falta o review do Daniel e o teste no
dev com a câmera PTZ depois do merge.

## Relacionado

- [[Câmeras - Saúde e monitoramento - Arquitetura e estratégias]]
- [[Câmeras - PTZ e presets - Arquitetura e estratégias]]
