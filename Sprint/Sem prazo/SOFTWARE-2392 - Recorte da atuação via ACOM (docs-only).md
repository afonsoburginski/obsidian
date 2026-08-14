---
tags:
  - attlas
  - task
  - backlog
  - sem-prazo
  - analitico
  - controladores
card: SOFTWARE-2392
clickup: https://app.clickup.com/t/86aju63t9
titulo: "[Back] Recorte da atuação da detecção no controlador via ACOM"
frente: Analítico em container
tamanho: 2 pts
status: SEM PRAZO desde 10/08 (frente do analítico despriorizada; a Sprint 27 fechou sem entrega e a 28 foi para VMS e videowall externo). PR em draft segue aberta. Histórico: fila da Sprint 27 (in progress no ClickUp), docs-only. Aberto em 31/07 quando o levantamento mostrou que a ACOM já está implementada e o que falta é o caller. Validado contra a develop em 03/08, sem mudança de escopo. PR aberta em draft: [#1356](https://github.com/atmanadmin/attlas-2026/pull/1356).
sprint: "[[00 - Sem prazo (backlog)]]"
atualizado: 2026-08-10
---

# SOFTWARE-2392 - Recorte da atuação via ACOM (docs-only)

A semana fecha na timeline do histórico, por decisão. Este card guarda a outra metade do 2200 original: a
detecção do laço virtual virando **presença real na entrada do controlador**.

## O que mudou, e por que isso encolheu o problema

A nota do 2200 registrava, em 15/07, que a comunicação ACOM estava especificada (MOD-014, 015 e 016,
atômicas INT-080 a 084 e UC-080 a 088) mas não construída. **Não é mais verdade.** O `ms-controllers` tem
`src/acom/` inteiro:

- CRUD de ACOM com `AcomAssociation` (controlador, slot, canal) e validador de unicidade de slot e canal.
- Cliente TCP stateless com `getDeviceState` (INT-081) e `setDeviceParameters` (INT-082), mais codec de
  frame próprio (`build-frame`, `parse-frame`, `extract-length`, `sanitize-payload`).
- Escrita no padrão commit-depois-do-ACK: transação aberta, linha e associações reconciliadas, params
  empurrados ao device, e commit só depois do ACK. Falha do device faz rollback.
- Realtime com pollers distribuídos de status e de dados, gateways `/acom/status` e `/acom/data`, lock por
  device e normalização de saídas.

Ou seja, a placa que converte laço virtual em contato seco na entrada MDE já é alcançável por software. A
peça que falta não é transporte, é **quem decide escrever a saída quando o laço detecta**.

## Escopo do card (docs-only)

- Onde vive o caller, e a decisão de ownership entre o `ms-acom` dedicado do catálogo de serviços (hoje
  esqueleto) e o módulo `acom` que já existe dentro do `ms-controllers`.
- Como o `index` linear do detector se relaciona com `slot` e `canal` da associação ACOM. Se a atuação for
  o caminho escolhido, o índice deriva da associação e não de faixa sintética.
- Se ACOM é obrigatório para atuar, ou se existe caminho device-direto, com o próprio analítico falando
  `acom_host` e `acom_port`.
- Alinhamento com o squad de controladores: o `ms-controllers` é deles, e a fase 2 do SOFTWARE-2360
  (publicar em Kafka a leitura de detector raw por ACP) ainda não está versionada no repo.

## Fora

Qualquer código de atuação, e validação com a placa física. A prova com contato seco na entrada MDE exige
controlador e placa reais, e não é o que a semana promete.

## Validação 03/08

Card conferido contra a develop e permanece válido. Confirmado no código: `setDeviceParameters` tem
hoje um único chamador, dentro do fluxo de cadastro do ACOM, e nenhum consumidor de detecção existe
dentro do `ms-controllers`. O caller de atuação realmente não existe, como o card já apontava.

O conteúdo deste card vai para um documento de planejamento do domínio de detecção, no mesmo lugar
onde as decisões da cadeia detector-controlador já são registradas, porque o `ms-controllers` é de
outro squad e a atômica de implementação só nasce lá quando a atuação de fato entrar em execução.

## Referências

- [[SOFTWARE-2200 - Prova de campo do analítico em container]], card irmão que ficou com a rota
  analítica.
- [[Attlas - Sprint 27]].
