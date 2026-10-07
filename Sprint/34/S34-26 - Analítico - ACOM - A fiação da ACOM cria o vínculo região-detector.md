---
id: S34-26
tags:
  - attlas
  - task
  - sprint-34
  - analitico
  - controladores
  - backend
titulo: "[Back] Controladores - a fiação da ACOM cria o vínculo região-detector"
frente: Vínculo região e detector
tamanho: 8 pts
pr: "#4256"
status: "PR #4256 mergeada em 23/09 às 15h15."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
aliases:
  - "Controladores - a fiação da ACOM cria o vínculo região-detector"
---

# S34-26 - Analítico - ACOM - A fiação da ACOM cria o vínculo região-detector

É a correção de backend da frente 4. A atômica é a `UC-183` do `ms-controllers`, escrita e
implementada na mesma PR.

## O que estava errado

A mesma associação vivia em duas tabelas de dois serviços, escritas por duas telas, e nenhuma
derivava da outra. A aba de detectores ACOM gravava `AcomOutputWiring`, no `ms-controllers`. Os quatro
avisos de "não relacionado", na própria aba ACOM e na tela de Detecção, leem
`VirtualLoopDetectorBinding`, no `ms-cameras`, e essa tabela só era escrita pelo diálogo de vincular
laço a detector da tela de Métricas. Salvar a fiação voltava verde e o selo "Sem detector" voltava na
mesma resposta.

O selo estava certo: a `UC-173` seção 8.7 manda exatamente isso para laço sem vínculo. O que faltava
era a escrita que criaria o vínculo.

## O que muda

Salvar as saídas de uma ACOM passa a criar, e a soltar, o vínculo correspondente no `ms-cameras`.
Corpo e resposta da rota não mudaram, e a leitura recomposta da própria requisição já volta com o
detector preenchido. A linha salva já tinha todo o dado: câmera, analítico, índice da região, slot e
canal, e o índice linear do detector sai do endereçamento pelo protocolo do controlador.

A checagem de conflito roda antes da transação da fiação, enquanto ainda dá para recusar sem ter
gravado nada, e o diff de vínculos é aplicado depois do commit. Dentro da transação não caberia: o
teto dela é o de uma ida ao equipamento, e a propagação são várias idas ao `ms-cameras`. A corrida que
sobra entre a checagem e a escrita é fechada pela unicidade do próprio `ms-cameras`.

Esta escrita não degrada em silêncio, ao contrário das leituras do serviço. Provedor de vídeo fora do
ar vira 503 com código de erro novo, distinto da placa inalcançável, e endereço já ocupado vira 409;
nos dois casos nada é gravado.

## Fora do escopo, registrado na atômica

Unificar as duas tabelas, que depende de a frente do ACOM decidir a fonte de verdade; o atalho da
tela de Detecção para onde o vínculo se cria, que a [[S34-27 - Analítico - Detecção - A faixa da via associada na Detecção|#4292]]
tornou desnecessário ao pôr a escrita na própria tela; e a escrita de regiões do `ms-cameras` que
ignora o tipo de analítico, que continua aberta.

## O que tem de valer no fim

Associar uma região a saída, módulo e canal na aba ACOM apaga o selo "Sem detector" da linha e o
"Sem faixa vinculada" da Detecção, sem passar pela tela de Métricas. Endereço já tomado recusa a
fiação inteira, e limpar a linha libera o endereço. Os sete critérios de aceite têm teste de
integração contra o banco.

## Relacionado

- [[Plano - o vínculo da região do analítico com o detector]], o diagnóstico da frente.
- [[S34-25 - Analítico - Laço virtual - Célula do detector pelo vínculo do laço]], a correção de tela que veio antes.
- [[Attlas - Sprint 34]].
