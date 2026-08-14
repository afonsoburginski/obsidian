---
tags:
  - attlas
  - task
  - backlog
  - sem-prazo
  - analitico
card: SOFTWARE-2396
clickup: https://app.clickup.com/t/86aju7c6y
titulo: "[Back] Analítico em container: laço virtual e ocupação da região"
frente: Analítico em container
tamanho: 2 pts
status: SEM PRAZO desde 10/08 (frente do analítico despriorizada; a Sprint 27 fechou sem entrega e a 28 foi para VMS e videowall externo). PR em draft segue aberta. Histórico: comprometido (quinta). Validado contra a develop em 03/08. PR aberta em draft: [#1349](https://github.com/atmanadmin/attlas-2026/pull/1349). ClickUp movido para `in progress`.
sprint: "[[00 - Sem prazo (backlog)]]"
atualizado: 2026-08-10
---

# SOFTWARE-2396 - Analítico em container - laço virtual e ocupação

Transformar caixa em presença: dada a geometria do laço virtual, dizer se a região está ocupada em
cada instante. É o que faz o analítico virar detector, e não só um desenhador de caixas.

## Escopo (1 PR)

Leitura da geometria da região da fonte que a especificação definir como autoridade, com recarga
sem reiniciar o container. Teste de ocupação por região e por frame, com a regra de contato
declarada e comentada no código, porque muda o instante da transição e o histórico depende disso.
Histerese para não piscar ocupação em oscilação de caixa, com o valor como constante nomeada.
Métrica de ocupação por região e contador de transições.

## Validação 03/08

Card conferido contra a develop e permanece válido. A fonte da geometria é o `ms-cameras`, a
mesma autoridade que já guarda a região do analítico embarcado, lida por este serviço via
integração interna com cache e recarga sem restart. Hoje nenhuma geometria de região persiste em
banco de dado nenhum, nem para o caminho embarcado, então essa leitura é capacidade nova em ambos
os lados, não só neste serviço.

## DoD

Veículo cruzando a região produz transições coerentes com o vídeo, conferido quadro a quadro num
trecho gravado. Região sem geometria configurada não gera ocupação e não quebra o pipeline.

## Dependência

[[SOFTWARE-2395 - Analítico em container - detecção por frame|2395]].

## Referências

- [[SOFTWARE-2397 - Analítico em container - publicar ocupação no Kafka|2397]], próximo elo da escada.
- [[SOFTWARE-2389 - Vínculo região da câmera para endereço de detector|2389]], mesma autoridade de região.
- [[Attlas - Sprint 27]].
