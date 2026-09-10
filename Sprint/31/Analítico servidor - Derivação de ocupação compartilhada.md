---
tags:
  - attlas
  - task
  - sprint-31
  - analitico
card: SOFTWARE-2798
clickup: https://app.clickup.com/t/86ak7xcc7
titulo: "[Back] Derivação de ocupação compartilhada (presença, histerese e transição)"
frente: Analítico
tamanho: 2 pts
status: "ABERTO em 28/08 na revisão de coerência da Sprint 31, a pedido do user. Card criado no ClickUp em 28/08, lista da Sprint 31, backlog. Pontos ainda não setados no campo nativo (REST bloqueado pelo classificador) - setar 2 a mão."
sprint: "[[Attlas - Sprint 31]]"
atualizado: 2026-08-28
---

# Analítico servidor - Derivação de ocupação compartilhada

O card que faltava para o contrato comum ser de verdade. Sem ele,
[[Analítico servidor - Embarcado no contrato de ocupação comum|o card 3]] e
[[Analítico servidor - Laço virtual e ocupação da região|o card 6]] escrevem **a mesma lógica duas
vezes**, em dois serviços, e ela diverge.

## O achado que abriu este card

Conferido no código em 28/08. O `DeviceStreamConsumer` do `ms-cameras`
(`analytics-realtime/device-stream.consumer.ts`) **já calcula ocupação por região por frame**:

```ts
const occupied = (msg.labels?.[i]?.length ?? 0) > 0;
```

O caminho servidor vai chegar no mesmo ponto por outro percurso: a inferência devolve caixa, e a caixa
cai ou não dentro da região. Daí para frente **os dois fazem exatamente o mesmo trabalho**: amortecer o
sinal por frame, detectar a transição, e publicar só na virada.

O planejamento anterior colocava esse trecho dentro do card 3 (para o embarcado) e dentro do card 6
(para o servidor), em serviços diferentes. O resultado seria o contrato comum sendo cumprido por **duas
máquinas de estado distintas** - exatamente o que o contrato existe para impedir. Convergência tem de ser
de comportamento, não só de formato do payload.

> [!note] Por que isso não apareceu no planejamento de 24/08
> A nota tratava o embarcado como "já publica, só falta trocar o formato". Ele não publica em Kafka
> nenhum: o `DeviceStreamConsumer` consome o broker do device e emite **só por WebSocket**
> (`gateway.emitDetection` / `emitFrame`), para destaque visual no frontend. E o que ele tem por frame é
> um booleano de ocupação, não uma transição. O card 3 é mais trabalho do que a nota supunha, e a parte
> nova dele é justamente a que o card 6 também precisa.

## Escopo

Função pura, sem I/O e sem dependência de Node: recebe a sequência de leituras booleanas por região com
timestamp, aplica histerese (limiar de entrada e de saída separados, para não piscar no limite), e emite
a transição com o instante e a duração do estado anterior.

Teste de unidade cobrindo entrada, saída, oscilação no limiar e lacuna de frames.

## Onde mora

Recomendação: **`@attlas/utils`**, que é TS puro e isomórfico e não puxa runtime de Node.
`@attlas/core-common` é a alternativa se o ADR do card 1 decidir que a peça é backend-only.

**A escolha é do card 1**, não deste. O que este card fixa é só o piso: não pode ser código duplicado
dentro de `apps/`.

## Fora de escopo

**Publicar.** Quem publica são os cards 3 e 6, cada um no seu serviço. Este card entrega a derivação e os
testes dela, e nada mais.

## Posição na semana

Depende do card 2 (o contrato, para saber a forma do evento de transição) e **bloqueia os cards 3 e 6**.
Entra logo depois do contrato, na segunda ou terça, senão vira gargalo de dois cards ao mesmo tempo.

## Ver também

[[Attlas - Sprint 31]] · [[Analítico servidor - Contrato de ocupação]] ·
[[Analítico servidor - Embarcado no contrato de ocupação comum]] ·
[[Analítico servidor - Laço virtual e ocupação da região]] · [[Analítico - Embarcado x Servidor]]
