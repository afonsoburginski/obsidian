---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
card: SOFTWARE-2515
clickup: https://app.clickup.com/t/86ak0temm
titulo: "[Back] Videowall externo: expiração de ocupação órfã"
frente: Videowall externo (NovaStar H9)
tamanho: 2 pts
status: criado em 14/08 na lista da Sprint 28, em backlog, depois da citação da cláusula 16.13 do contrato de Quito.
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-14
---

# SOFTWARE-2515 - Expiração de ocupação órfã

Rede de segurança do gesto de tomar o painel: sem ela, a parede fica exibindo o último quadro de uma consola que já não existe.

## Escopo (1 PR)

Job periódico que libera a parede quando o dono desapareceu sem liberar.

O critério de vida **difere por tipo de ocupação**, e isso é a decisão que a atômica carrega. No espelho é a
presença de publicação, nunca a contagem de espectadores. Na projeção nativa quem publica é a própria
plataforma, então ausência de publicação não significa dono desaparecido: o critério é o fim da execução que
originou a projeção. Aplicar o critério do espelho na projeção ceifaria uma projeção viva de madrugada, e
por isso o filtro por tipo é asserção de teste, não detalhe de implementação.

## Relacionados

[[Attlas - Sprint 28]] · [[Videowall externo (NovaStar H9)]]
