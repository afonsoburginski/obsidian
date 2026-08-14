---
tags:
  - attlas
  - task
  - backlog
  - sem-prazo
  - analitico
  - cameras
card: SOFTWARE-2388
clickup: https://app.clickup.com/t/86aju631k
titulo: "[Back] Analítico embarcado da câmera no mesmo contrato de ocupação"
frente: Analítico em container
tamanho: 2 pts
status: SEM PRAZO desde 10/08 (frente do analítico despriorizada; a Sprint 27 fechou sem entrega e a 28 foi para VMS e videowall externo). PR em draft segue aberta. Histórico: fila da Sprint 27 (in progress no ClickUp). Validado contra a develop em 03/08. PR aberta em draft: [#1354](https://github.com/atmanadmin/attlas-2026/pull/1354).
sprint: "[[00 - Sem prazo (backlog)]]"
atualizado: 2026-08-10
---

# SOFTWARE-2388 - Analítico embarcado no mesmo contrato de ocupação

Trazer o analítico embarcado na câmera para o mesmo contrato de ocupação do analítico em container,
para a plataforma ter um caminho só de detecção por vídeo.

## Por que não é desta semana

O caminho embarcado já entrega valor hoje: consome o stream do device e emite por WebSocket para o
front acender região e desenhar caixa, entregue e validado em 15/07. Unificar é ganho de
arquitetura, não de função, e depende do contrato de ocupação que o analítico em container define
primeiro.

## Escopo (1 PR)

Producer no `ms-cameras` republicando a ocupação por região do device no mesmo tópico do analítico
em container, reusando o consumer que já resolve o índice de região contra o device. Uma
publicação por device e região, não por câmera-tenant. Sem tocar o caminho WebSocket que o front
consome hoje.

## Validação 03/08

Card conferido contra a develop e permanece válido. O consumer do stream do device já resolve o
índice de região de forma estável, cacheado com atualização em background, então o producer novo
reusa esse binding sem trabalho extra. O fan-out por device continua servindo várias câmeras-tenant
sem duplicar publicação, mesma regra que o card já previa.

## DoD

Os dois analíticos, embarcado e em container, alimentando o mesmo tópico com a mesma forma de
evento, provado por teste.

## Dependência

Contrato de ocupação definido pelo [[SOFTWARE-2397 - Analítico em container - publicar ocupação no Kafka|2397]].

## Referências

- [[SOFTWARE-2391 - Pendências do analítico embarcado|2391]], higiene do mesmo domínio embarcado.
- [[SOFTWARE-2200 - Prova de campo do analítico em container|2200]].
- [[Attlas - Sprint 27]].
