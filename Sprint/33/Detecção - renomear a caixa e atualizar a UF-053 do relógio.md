---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
card: SOFTWARE-3183
clickup: https://app.clickup.com/t/86akhpa44
titulo: "[Front] O nome `cuboid` mente desde que a caixa virou plana"
frente: Analítico
tamanho: 2 pts
pr: "#3444"
status: "PR #3444 aberta: os três arquivos, a interface e a função renomeados para o que a peça desenha hoje, com o que traria o volume de volta registrado no utilitário (pose vinda do analítico, nunca heurística no front). A UF-053 ganha o contrato do relógio que a tela realmente tem - precedência das três leituras, tradução dos carimbos do equipamento e o alcance de 400 ms da predição."
sprint: "[[Attlas - Sprint 33]]"
atualizado: 2026-09-13
---

# Detecção - renomear a caixa e atualizar a UF-053 do relógio

A extrusão isométrica saiu em 12/09, mas o nome ficou: `utils/cuboid-path.util.ts`,
`interfaces/i-detection-cuboid.interface.ts`, `constants/detection-cuboid.constants.ts`, a função
`cuboid()` e o docblock do `detection-object-boxes`, que ainda diz que desenha "a solid". Nome que
descreve o que a peça já não é.

## Por que a caixa 3D saiu, e o que a traria de volta

O analítico não reporta pose, então a direção do volume é a mesma para um ônibus atravessando e para um
carro de frente, e na tela isso lê como caixa torta pendendo para um lado. O que ficou é a caixa plana,
com cantoneiras, fiel ao retângulo reportado mais uma margem pequena para cobrir o veículo inteiro. Se
a ideia voltar, depende de pose vinda do analítico - ângulo do veículo, ou caixa 3D já projetada pelo
device -, nunca de heurística no front.

## O que o card faz

- Renomeia os três arquivos, a interface e a função para o que a peça é hoje.
- No mesmo passe, atualiza a `UF-053`, que descreve o contrato do relógio do overlay e ainda não
  conhece nem a leitura dos carimbos do device no relógio do navegador nem o alcance de predição de
  400 ms.
