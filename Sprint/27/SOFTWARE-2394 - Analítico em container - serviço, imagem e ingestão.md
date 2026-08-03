---
tags:
  - attlas
  - sprint-27
  - task
  - analitico
card: SOFTWARE-2394
clickup: https://app.clickup.com/t/86aju7bxa
titulo: "[Back] Analítico em container: serviço, imagem e ingestão do stream"
frente: Analítico em container
tamanho: 3 pts
status: comprometido (terça). Validado contra a develop em 03/08. PR aberta em draft: [#1346](https://github.com/atmanadmin/attlas-2026/pull/1346). ClickUp movido para `in progress`.
sprint: "[[Attlas - Sprint 27]]"
atualizado: 2026-08-03
---

# SOFTWARE-2394 - Analítico em container - serviço, imagem e ingestão

O analítico rodando em container, puxando o stream de uma câmera e entregando frames decodificados
de forma estável. Sem detecção ainda: o que este card prova é que o vídeo entra e o container
aguenta.

## Escopo (1 PR)

Serviço no runtime que a especificação escolher, com imagem de container e entrada no compose do
stack local. Ingestão do stream decidido no card de alimentação, com reconexão e recuo progressivo
quando a câmera cai. Decodificação de frames com taxa e resolução configuráveis por variável de
ambiente, não fixas no código. Métricas de quadros por segundo, quadros descartados e latência de
decodificação, mais health com estado de vivo diferente de estado pronto.

## Validação 03/08

Card conferido contra a develop e permanece válido. O serviço nasce no esqueleto já existente no
monorepo, que hoje é só o boilerplate do gerador, sem nenhuma linha de domínio. Depende
inteiramente das decisões fechadas na especificação do serviço.

## DoD

Container de pé consumindo câmera real, com contador de frames subindo e reconexão provada
derrubando o stream na mão. Consumo de CPU e memória por câmera registrado, para confrontar com o
teto estimado no card de alimentação.

## Dependências

[[SOFTWARE-2385 - Alimentação de vídeo do analítico em container|2385]] e [[SOFTWARE-2386 - Especificação do analítico de vídeo em container|2386]].

## Referências

- [[SOFTWARE-2395 - Analítico em container - detecção por frame|2395]], próximo elo da escada.
- [[Attlas - Sprint 27]].
