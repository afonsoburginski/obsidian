---
id: SP-12
tags:
  - attlas
  - task
  - backlog
  - sem-prazo
  - analitico
  - cameras
  - detectores
card: SOFTWARE-2389
clickup: https://app.clickup.com/t/86aju633j
titulo: "[Back] Vínculo entre região da câmera e endereço de detector"
frente: Analítico em container
tamanho: 3 pts
status: 'ENTREGUE por outro card e sem trabalho restante. O escopo foi rescopado em 24/08 para o SOFTWARE-2698, entregue pela PR #2373 (UC-064), mergeada em 02/09. A PR em draft deste card, #1352, foi fechada sem merge em 24/08. Em 23/09 as PRs #4256 e #4292 fecharam a escrita do vínculo pela fiação da ACOM e pela Detecção. Histórico: sem prazo desde 10/08, fila da Sprint 27, validado contra a develop em 03/08.'
sprint: "[[Sem prazo (backlog)]]"
atualizado: 2026-09-23
aliases:
  - "SOFTWARE-2389 - Vínculo região da câmera para endereço de detector"
---

# SP-12 - Analítico - Laço virtual - Vínculo região da câmera para endereço de detector

> [!success] Estado em 23/09: o vínculo existe, e desde hoje nasce em três telas
> O que este card pedia está na develop desde 02/09, pelo [[S31-09 - Analítico - Servidor - Vínculo região para endereço de detector|SOFTWARE-2698]]
> (PR [#2373](https://github.com/atmanadmin/attlas-2026/pull/2373), `UC-064`): a tabela
> `VirtualLoopDetectorBinding` no `ms-cameras`, criada pela migration de 31/08, com unicidade viva
> por endereço escrita à mão no SQL. A PR em draft deste card, #1352, foi fechada sem merge no
> reescopo de 24/08, que a nota [[Sem prazo (backlog)]] registra como "deletar".
>
> Em 23/09 a escrita do vínculo deixou de ser só o diálogo da tela de Métricas: a fiação da ACOM
> passou a criar e soltar o vínculo (#4256, `UC-183`) e a Detecção ganhou um select de faixa que o
> grava (#4292, `UF-722`). Ver [[Plano - o vínculo da região do analítico com o detector]].
>
> O corpo abaixo é o desenho de 10/08 e fica como registro. O "evento de atualização para invalidar
> o cache do connector" não foi conferido nesta revisão, porque o connector que o consumiria, o
> analítico servidor, saiu em 16/09.

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

A especificação do connector, [[SP-10 - Analítico - Laço virtual - Especificação do connector de laço virtual|2387]], que declara quem é autoridade da tradução.

## Referências

- [[SP-13 - Analítico - Laço virtual - Connector, ocupação vira evento de detector|2390]], que consome este vínculo.
- [[S32-01 - Analítico - Servidor - Prova de campo do analítico em container|2200]].
- [[Attlas - Sprint 27]].
