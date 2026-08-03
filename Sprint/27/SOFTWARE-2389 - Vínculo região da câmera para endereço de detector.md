---
tags:
  - attlas
  - sprint-27
  - task
  - analitico
  - cameras
  - detectores
card: SOFTWARE-2389
clickup: https://app.clickup.com/t/86aju633j
titulo: "[Back] Vínculo entre região da câmera e endereço de detector"
frente: Analítico em container
tamanho: 3 pts
status: fila da Sprint 27 (in progress no ClickUp). Validado contra a develop em 03/08, premissa reforçada. PR aberta em draft: [#1352](https://github.com/atmanadmin/attlas-2026/pull/1352).
sprint: "[[Attlas - Sprint 27]]"
atualizado: 2026-08-03
---

# SOFTWARE-2389 - Vínculo região da câmera para endereço de detector

Fechar a identidade do laço virtual dentro do escopo do squad: qual câmera e qual região alimentam
qual endereço de detector, para o connector derivar o mesmo identificador que o histórico espera.

## Por que o vínculo nasce no ms-cameras

O desenho original colocava a autoridade no `ms-traffic-model`, o que exigiria migration e endpoint
num serviço de outro squad. O squad é dono de câmeras e analítico de vídeo, então o vínculo nasce
no `ms-cameras`, que é onde a região da câmera já vive.

## Escopo (1 PR)

Tabela no `ms-cameras` ligando câmera e região a controlador e endereço de detector, única por
endereço para não existir duas regiões apontando para o mesmo detector. Migration sob o regime de
banco do repositório, com origem no CLI do Prisma e rollback classificado. Leitura para o connector
carregar no boot, mais evento de atualização para invalidar o cache local dele. Testes de caminho
feliz e de exceção, incluindo região sem vínculo, que nunca inventa endereço.

## Validação 03/08

Card conferido contra a develop, com a premissa reforçada: não existe hoje, em lugar nenhum do
repositório, um cadastro autoritativo de detector com identificador estável. O `ms-traffic-model`
tem um registro parcial embutido na faixa de via, sem endpoint próprio e sem o índice linear que o
endereço de detector exige, e o `ms-detector-history` mantém um cadastro provisório enquanto isso
não existe. Isso torna o desvio de autoridade para o `ms-cameras` mais defensável, não menos: não é
tirar algo pronto de outro serviço, é criar o vínculo que também não existia lá.

## Desvio a registrar na spec

O documento de domínio dos detectores atribui ao connector a leitura do cadastro do
`ms-traffic-model`. O desvio de escopo do squad vai declarado com follow-up de transferência de
autoridade quando o cadastro de lá amadurecer.

## Risco a declarar

Como o identificador do detector é derivado do endereço, um vínculo errado não dá erro: cria um
registro órfão no histórico e ninguém percebe. Por isso a unicidade do endereço é invariante de
banco, e a prova ponta a ponta confere o identificador derivado contra o cadastro real.

## Dependência

A especificação do connector, [[SOFTWARE-2387 - Especificação do connector de laço virtual|2387]], que declara quem é autoridade da tradução.

## Referências

- [[SOFTWARE-2390 - Connector de laço virtual - ocupação vira evento de detector|2390]], que consome este vínculo.
- [[SOFTWARE-2200 - Prova de campo do analítico em container|2200]].
- [[Attlas - Sprint 27]].
