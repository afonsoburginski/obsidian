---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
card: SOFTWARE-2517
clickup: https://app.clickup.com/t/86ak0teng
titulo: "[Back] Videowall externo: projetar e liberar cena pelo alvo VIDEOWALL"
frente: Videowall externo (NovaStar H9)
tamanho: 3 pts
status: "mergeado - PR #1757 em 20/08/2026, conferido no GitHub em 25/08"
pr: "[#1757](https://github.com/atmanadmin/attlas-2026/pull/1757)"
sprint: "[[Attlas - Sprint 29]]"
atualizado: 2026-08-25
---

# SOFTWARE-2517 - Projetar e liberar cena pelo alvo VIDEOWALL

O gesto que faltava: ativar cena com o alvo do painel passa a projetar, em vez de recusar como a revisão de 13/08 previa.

## Escopo (1 PR)

Projetar a cena no painel pela mesma rota de ativação que o mosaico já usa, com o alvo pedido, e liberar
devolvendo a parede. Duas portas para o mesmo efeito seriam dois lugares para a arbitragem de ocupação
divergir, então não nasce rota nova.

Carrega a **arbitragem da parede**, decidida em 14/08: plano de resposta desloca o operador, com registro e
aviso, no mesmo precedente que o reposicionamento PTZ de Emergências já tem; exibição programada cede ao
operador e registra que cedeu; e o operador pode tomar a parede de uma projeção, com confirmação que nomeia
o plano. Projeção que falha no meio da cena fica como está e é reportada, em vez de revertida em silêncio,
porque sem ninguém na sala uma reversão silenciosa é indistinguível de nada ter acontecido.

## Relacionados

[[Attlas - Sprint 28]] · [[Videowall externo (NovaStar H9)]] · [[Cláusula 16.13 do contrato de Quito]]

> [!info] Estado em 25/08 - alinhado com o GitHub
> PR #1757 mergeada (última em 20/08/2026). Nenhuma PR desta task está aberta.
> O `status` anterior dizia: "criado em 14/08 na lista da Sprint 28, em backlog, depois da citação da cláusula 16.13 do contrato de Quito.".
