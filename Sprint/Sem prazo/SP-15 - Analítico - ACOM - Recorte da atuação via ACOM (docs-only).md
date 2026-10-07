---
id: SP-15
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
status: 'SEM PRAZO desde 10/08, e segue válido: o caller que fecha o contato na transição de ocupação ainda não existe na develop de 23/09. A PR em draft #1356 foi fechada sem merge no reescopo de 24/08, que manteve o card por não ter substituto. Duas das quatro perguntas do escopo foram respondidas pelo código entre 11 e 23/09. Histórico: fila da Sprint 27, docs-only, aberto em 31/07, validado contra a develop em 03/08.'
sprint: "[[Sem prazo (backlog)]]"
atualizado: 2026-09-23
aliases:
  - "SOFTWARE-2392 - Recorte da atuação via ACOM (docs-only)"
---

# SP-15 - Analítico - ACOM - Recorte da atuação via ACOM (docs-only)

> [!warning] Estado em 23/09: o ACOM mudou de forma, e o caller continua faltando
> Conferido na develop de 23/09. O que o corpo abaixo descreve do `ms-controllers` é o retrato de
> 03/08 e parte dele não vale mais:
>
> - **`AcomAssociation` não existe.** O módulo Controladores refez o modelo em 11 e 12/09: cada `Acom`
>   pertence a um `controllerId`, tem `analyticSlots` com default 4, e a fiação é `AcomOutputWiring`,
>   uma linha por saída com câmera, analítico, índice da região, slot e canal. A tela é a sub-aba ACOMs
>   do detalhe do controlador.
> - **A pergunta do índice linear está respondida.** Desde a PR
>   [#4256](https://github.com/atmanadmin/attlas-2026/pull/4256) (`UC-183`, 23/09), o índice do
>   detector sai de `DetectorAddressing.indexFrom(protocolo, slot, canal)` sobre a linha de fiação, e
>   salvar a fiação cria o vínculo região-detector no `ms-cameras`. É a associação ACOM que dá o
>   índice, não uma faixa sintética.
> - **A pergunta de ownership está respondida pelo código**: o ACOM real vive em
>   `apps/ms-controllers/src/acom/`, e o `ms-acom` continua esqueleto.
> - **O caller continua sem existir**: nenhum handler de `src/acom/` consome tópico Kafka. As outras
>   duas perguntas, se ACOM é obrigatório para atuar e o alinhamento com o squad de controladores,
>   seguem em aberto.

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

- [[S32-01 - Analítico - Servidor - Prova de campo do analítico em container]], card irmão que ficou com a rota
  analítica.
- [[Attlas - Sprint 27]].
