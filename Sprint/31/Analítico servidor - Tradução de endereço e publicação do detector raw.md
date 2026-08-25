---
tags:
  - attlas
  - task
  - sprint-31
  - analitico
card: SOFTWARE-2699
clickup: https://app.clickup.com/t/86ak5njfd
titulo: "[Back] Tradução de endereço e publicação do detector raw"
frente: Analítico
tamanho: 3 pts
status: comprometido na Sprint 31 (planejada em 24/08). Card criado no ClickUp em 25/08.
sprint: "[[Attlas - Sprint 31]]"
atualizado: 2026-08-25
---

# Analítico servidor - Tradução de endereço e publicação do detector raw

Fecha a cadeia do analítico servidor. O `ms-virtual-loop` consome a própria ocupação que acabou de
publicar, resolve para qual detector físico aquela câmera e região correspondem, e republica no mesmo
tópico de detecção bruta que o caminho físico usa.

## Por que dentro do `ms-virtual-loop`, e não num serviço à parte

As notas de alinhamento (`Docs/Analítico/Anotações sobre Analítico de vídeo.md`, seção "Arquitetura de
serviços") listam **quatro** serviços para o analítico: `ms-cameras`, `ms-atspm`, `ms-dai`,
`ms-virtual-loop`. Não há um quinto para tradução de endereço. É decisão de produto, não lacuna de
levantamento - a primeira versão do plano desta sprint tratou isso como pergunta em aberto e não
precisava: a resposta já estava escrita.

Isso deixa `docs/modules/detectors.md` desatualizado no ponto em que designa `ms-connector-virtual-loop`
como produtor do protocolo de laço virtual - o próprio doc já registrou uma reversão de produtor
parecida em 30/07, para o caminho ACP. Ajustar essa linha do doc de domínio é parte do DoD deste card,
não card à parte.

## Escopo

Três passos, e nada mais:

1. Consome a própria ocupação publicada (card anterior desta pilha).
2. Resolve para qual detector físico aquela câmera e aquela região correspondem, usando o vínculo
   cadastrado no `ms-cameras` (`VirtualLoopDetectorBinding`, criado pelo card
   [[Analítico servidor - Vínculo região para endereço de detector]]). Sem vínculo cadastrado, **descarta
   o evento e não inventa endereço**.
3. Republica no mesmo tópico de detecção bruta (`attlas.detectors.raw`) que o caminho físico usa, com
   `deriveDetectorId` de `@attlas/core-common` - não reimplementa a derivação.

## O que ele explicitamente não faz

**Não reimplementa a reconciliação de janela nem o trim de RLE do caminho físico**
(`apps/ms-controllers/src/detector-raw/`). O problema que aquilo resolve é buffer de leitura de
equipamento por polling, e esse problema **não existe do lado do vídeo**: o analítico publica por
transição, no relógio dele, sem janela a reconciliar. Copiar a mecânica traria complexidade sem causa.

## Guarda contra contagem dupla

Se o mesmo endereço de detector já tem vínculo de câmera registrado, esse endereço **não pode** ao mesmo
tempo ser publicado como presença física pelo caminho ACP - a derivação em
`ms-controllers/src/detector-raw/derivation/derive-detector-identity.ts` mapeia `MDE + Vehicle` e o
módulo `VirtualLoop` do Neo+ para a mesma tecnologia `VIRTUAL_LOOP` que este card publica. Sem essa
guarda, o histórico soma o mesmo veículo duas vezes **sem erro visível**. Esta regra existia nas specs
fechadas da Sprint 27 e renasce aqui - o card não fecha sem ela, mesmo que a implementação do lado do
`ms-controllers` fique para outra sprint (é cross-squad).

## Dependência dura

Precisa do card [[Analítico servidor - Laço virtual e ocupação da região]] (a ocupação a traduzir) e do
card [[Analítico servidor - Vínculo região para endereço de detector]] (a tabela de vínculo a consultar).
É por isso que é o último card da pilha.

## DoD

`ms-virtual-loop` traduz endereço e publica `attlas.detectors.raw` sem vínculo cadastrado sendo
descartado silenciosamente (log, não exceção não tratada), com teste de integração cobrindo: vínculo
existente (publica), vínculo ausente (descarta), e a guarda contra contagem dupla documentada mesmo que
não implementada do lado do `ms-controllers`. `docs/modules/detectors.md` atualizado para designar
`ms-virtual-loop`, não `ms-connector-virtual-loop`, como produtor do protocolo de laço virtual.

## Encosta em

- [[Analítico servidor - Laço virtual e ocupação da região]] e
  [[Analítico servidor - Vínculo região para endereço de detector]], as duas dependências duras.
- [[Analítico - Arquitetura e estratégias]], seção da topologia de serviço, onde a decisão de não ter
  connector separado está registrada.
- [[Attlas - Sprint 31]].
