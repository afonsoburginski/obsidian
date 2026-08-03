---
tags:
  - attlas
  - sprint-27
  - task
  - analitico
  - detectores
card: SOFTWARE-2387
clickup: https://app.clickup.com/t/86aju62yc
titulo: "[Back] Especificação do connector de laço virtual"
frente: Analítico em container
tamanho: 3 pts
status: fila da Sprint 27 (in progress no ClickUp), docs-only. Validado contra a develop em 03/08. PR aberta em draft: [#1345](https://github.com/atmanadmin/attlas-2026/pull/1345).
sprint: "[[Attlas - Sprint 27]]"
atualizado: 2026-08-03
---

# SOFTWARE-2387 - Especificação do connector de laço virtual

Bootstrap SDD do `ms-connector-virtual-loop`, hoje um esqueleto do gerador sem nenhum código de
domínio, mais a especificação que define o produtor de detecção de laço virtual.

## Objetivo

Fechar as decisões da especificação do connector antes de qualquer linha de código, espelhando o
que o `ms-controllers` já resolveu para o caminho físico, sem divergir onde o domínio é o mesmo.

## Escopo (1 PR)

Especificação mínima do serviço mais o módulo do pipeline, fechando cinco pontos: forma do evento
produzido, tabela de tradução do endereço de câmera para endereço de detector, quantização da
amostra na unidade de cem milissegundos, semântica de ausência de detecção, e o fan-out de um
mesmo equipamento cadastrado como várias câmeras. Zero código de produção neste card.

## Validação 03/08

Card conferido contra a develop e permanece válido, com duas questões que o card levantava agora
fechadas por desenho:

- A decisão de tradução do endereço fica com o `ms-cameras`, que é quem já detém a região da
  câmera, em vez de exigir uma migration num serviço de outro squad. O vínculo em si é o
  [[SOFTWARE-2389 - Vínculo região da câmera para endereço de detector|2389]].
- O connector não replica nem extrai a janela de amostragem que o `ms-controllers` usa para o
  caminho físico. Como o evento de ocupação já chega normalizado na mesma unidade de cem
  milissegundos, o connector só valida o evento, traduz o endereço pelo vínculo cacheado e
  republica. Isso resolve por desenho a escolha entre extrair uma lib compartilhada ou espelhar a
  lógica, e fecha também o risco de publicação em dobro apontado no card: o caminho de vídeo passa
  a ser a fonte de verdade da presença de laço virtual, e essa regra fica registrada como decisão
  do serviço.

## Fora do escopo

Atuação no controlador. O transporte já existe pronto no `ms-controllers`, e falta só o chamador
que decide escrever a saída, o que é o recorte do
[[SOFTWARE-2392 - Recorte da atuação via ACOM (docs-only)|2392]].

## Dependências

Contrato de ocupação definido pelo [[SOFTWARE-2397 - Analítico em container - publicar ocupação no Kafka|2397]].

## Referências

- [[SOFTWARE-2390 - Connector de laço virtual - ocupação vira evento de detector|2390]], que constrói o que esta spec define.
- [[SOFTWARE-2200 - Prova de campo do analítico em container|2200]].
- [[Attlas - Sprint 27]].
