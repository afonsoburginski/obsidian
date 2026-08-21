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
status: code review na [PR #1718](https://github.com/atmanadmin/attlas-2026/pull/1718), junto com a 2436, com correção pedida em 18/08. Conferido em 19/08 que os arquivos de expiração só existem no branch da PR, nada entrou na develop por outra task. O critério é presença de publicação, nunca contagem de espectadores.
pr: "[#1755](https://github.com/atmanadmin/attlas-2026/pull/1755)"
sprint: "[[Attlas - Sprint 29]]"
atualizado: 2026-08-19
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

## O que a implementação de 18/08 decidiu

Expiração passou a ser desfecho registrado num livro de ocupações encerradas, criado neste PR, porque a
sessão vigente é uma linha única por painel e é apagada no encerramento: o desfecho não tem onde morar na
própria sessão. Liberação pelo dono e tomada também escrevem no livro, senão a distinção que a regra pede
não existiria.

O relógio vem de configuração validada: cadência de quinze segundos e tolerância de sessenta segundos sem
publicação, o que dá setenta e cinco segundos no pior caso para o painel voltar a estar disponível.
Reivindicação que morreu antes de anexar o caminho de ingestão conta como ausência de publicação e expira
pelo mesmo relógio, o que resolve a linha órfã de um processo que morreu no meio da tomada.

## Relacionados

[[Attlas - Sprint 28]] · [[Videowall externo (NovaStar H9)]]
