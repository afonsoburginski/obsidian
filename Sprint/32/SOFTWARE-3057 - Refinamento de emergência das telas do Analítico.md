---
tags:
  - attlas
  - task
  - sprint-32
  - analitico
card: SOFTWARE-3057
clickup: https://app.clickup.com/t/86akfgfvq
titulo: "[Front] Refinamento de emergência das telas do Analítico"
frente: Analítico
tamanho: 5 pts
pr: "#3066"
status: MERGEADA em 11/09 às 23:01 (#3066), depois de duas rodadas de review (Will, Daniel, Sarah, Igor e o claude[bot]) e três correções de ci-pr (a11y do combobox de período, asserção de capacidades da frota com ATSPM, imagens MinIO para o Quay). Deploy no EC2 dev feito na mesma noite. Card fecha.
sprint: "[[Attlas - Sprint 32]]"
atualizado: 2026-09-11
---

# SOFTWARE-3057 - Refinamento de emergência das telas do Analítico

Pedida em 09/09 fora do plano da semana. Aproxima o painel de câmeras, Incidentes e Detecção da
referência do attlas-design e acrescenta o filtro por data e hora.

## Por que ela virou a base da pilha

O plano dizia que esta PR não empilharia, por não ter sobreposição de arquivo com as PRs da
Detecção. Na execução ela virou a base: a [[SOFTWARE-3051 - Reconciliar o doc de módulo do Analítico com o edital|SOFTWARE-3051]]
tem base nela e as outras sete sobem em cascata a partir daí. Consequência prática: **é a única das
nove que recebe CI**, porque o `ci-pr.yml` só dispara com base `develop`.

## O que as duas rodadas de review renderam

Primeira rodada, 14 threads de Will, Daniel e do `claude[bot]`: as duas tiras de abas feitas à mão
viraram o `app-segmented-tabs` compartilhado, ganhando navegação por seta; textos fixos em pt-BR
foram para o catálogo; o mapper parou de inventar nome de região em português; e a suíte do dialeto
de device virou hermética em vez de decorar a contagem de candidatos.

Segunda rodada, 18 threads de Igor e Sarah: a borda final da janela de tempo deixou de cortar o
último minuto do dia, o `frame-publisher` passou a ler env validada e tirou a varredura de câmera
ociosa do caminho do quadro, o seed passou a apagar as analíticas fora da lista, e os códigos de
erro que eram string literal dos dois lados viraram enum em `@attlas/contracts`.

Dois achados foram recusados com argumento: o `releaseFrameUrl` já era chamado no `onDestroy`, e
esvaziar o campo `23:59` do period-picker corrigiria o bug mas custaria a UI, já que a conversão
corrigida torna a semente correta.

## Achado que não veio de review

A validação na tela pegou o que o CI não pegaria a tempo: o build do `web-attlas` estava quebrado
depois do merge com a develop. O contrato de métricas mudou na develop, `duration` virou opcional e
cada janela passou a trazer o próprio `start`, e o util de baldes do laço virtual ainda reconstruía
o eixo somando durações - exatamente o que o comentário novo do contrato desaconselha.

## Conflito de spec a resolver antes da #3189

A `UF-053` que entra aqui abre justificando o próprio ID com "a `UF-046` deste módulo nunca existiu"
e renomeia para `UF-053` as cinco citações dos fontes. A
[[SOFTWARE-3052 - UF-046, UF-047 e MOD-012 - as specs que o código já cita|SOFTWARE-3052]] faz o
oposto: cria a `UF-046` do analytics justamente para adotar aquelas citações. Mergeadas em
sequência, a segunda entra com a premissa já falsa. Decisão de qual decomposição vale é do user.

## Ver também

- [[Attlas - Sprint 32]] - a pilha inteira e a ordem de merge
