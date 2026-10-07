---
id: S34-24
tags:
  - attlas
  - task
  - sprint-34
  - analitico
  - ms-cameras
  - frontend
titulo: "[Front] Câmeras - aba Analítico no detalhe da câmera, só leitura"
frente: Câmeras
tamanho: 5 pts
pr: "#4349"
status: "PR #4349 mergeada em 23/09 às 15h24."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
aliases:
  - "Câmeras - aba Analítico no detalhe, só leitura"
---

# S34-24 - Câmeras - Detalhe da câmera - Aba Analítico no detalhe, só leitura

A spec é a `UF-043`, a mesma unidade que tinha aposentado a aba Analíticos do detalhe da câmera em
12/09, com um callout de 18/09 que devolve a leitura ao vivo e mantém a escrita só na Detecção.

## O que estava errado

Desde que a aba Analíticos saiu do detalhe da câmera, na #3328, o operador não via ali o que o
analítico estava fazendo. Para saber se as regiões estavam sendo vigiadas e se havia objeto sendo
rastreado, precisava sair para a tela de Detecção.

## O que muda

O card lateral do detalhe da câmera ganha uma aba **Analítico**, só quando a câmera tem analítico, com
o estado do analítico, o veredito do feed com o motivo quando não chega, e a lista das regiões, cada
uma com a cor do contorno e marcada como ocupada enquanto segura algo. Com a aba aberta, o player
pinta por cima as regiões e as caixas dos objetos rastreados; fechar a aba para o socket e a pintura.

Tudo é reusado da Detecção, e não recriado: o mesmo overlay de laço, as mesmas caixas, que passaram a
componente standalone para as duas telas montarem, as mesmas frases de aviso e a mesma rampa de cor. A
página lê a geometria uma vez e serve as duas superfícies, então o card e a imagem nunca discordam. A
aba só aparece onde há player, e o popup do painel operacional continua sem ela.

## O que tem de valer no fim

A aba é só leitura: não desenha região, não congela quadro e não escreve configuração. A Detecção
continua sendo o único lugar onde a configuração do analítico é lida para edição e escrita.

## Relacionado

- [[Analítico - Arquitetura e estratégias]], com a história da aba Analíticos aposentada em 12/09.
- [[Attlas - Sprint 34]].
