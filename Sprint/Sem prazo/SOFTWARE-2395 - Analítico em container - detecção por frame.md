---
tags:
  - attlas
  - task
  - backlog
  - sem-prazo
  - analitico
card: SOFTWARE-2395
clickup: https://app.clickup.com/t/86aju7c1v
titulo: "[Back] Analítico em container: detecção de objetos por frame"
frente: Analítico em container
tamanho: 3 pts
status: SEM PRAZO desde 10/08 (frente do analítico despriorizada; a Sprint 27 fechou sem entrega e a 28 foi para VMS e videowall externo). PR em draft segue aberta. Histórico: comprometido (quarta). Validado contra a develop em 03/08. PR aberta em draft: [#1347](https://github.com/atmanadmin/attlas-2026/pull/1347). ClickUp movido para `in progress`.
sprint: "[[00 - Sem prazo (backlog)]]"
atualizado: 2026-08-10
---

# SOFTWARE-2395 - Analítico em container - detecção por frame

O analítico deixa de só decodificar e passa a detectar: para cada frame, quais objetos existem,
onde, e com qual confiança.

## Escopo (1 PR)

Inferência com o modelo que a especificação escolheu, carregado no boot, com caminho e limiar de
confiança por variável de ambiente. Saída por frame com caixa, classe e confiança, no mesmo
vocabulário que o analítico embarcado já usa, para o consumidor não ter duas gramáticas. Filtro de
classe com veículo como alvo desta fase, pedestre declarado como próximo eixo. Métrica de tempo de
inferência por frame e contador de frames que a inferência não acompanhou.

## Validação 03/08

Card conferido contra a develop e permanece válido. É o card que produz o número que falta em toda
a frente: o custo de inferência por frame e por resolução, que fecha o teto de câmeras por
instância medido no card de escala e a estimativa que fica no ADR de alimentação.

## DoD

Detecção real de veículo em vídeo de câmera real, com caixa coerente conferida visualmente. Tempo
de inferência medido por resolução.

## Dependência

[[SOFTWARE-2394 - Analítico em container - serviço, imagem e ingestão|2394]].

## Referências

- [[SOFTWARE-2396 - Analítico em container - laço virtual e ocupação|2396]], próximo elo da escada.
- [[SOFTWARE-2398 - Escala do analítico - câmeras por instância|2398]], que fecha o número com medição.
- [[Attlas - Sprint 27]].
