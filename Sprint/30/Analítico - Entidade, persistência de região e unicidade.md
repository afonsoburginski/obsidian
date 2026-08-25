---
tags:
  - attlas
  - task
  - sprint-30
  - analitico
card: SOFTWARE-2677
clickup: https://app.clickup.com/t/86ak5dx4y
titulo: "[Back] Entidade Analítico, persistência de região e unicidade"
frente: Analítico
tamanho: 5 pts
status: ENTREGUE em 25/08 na PR
sprint: "[[Attlas - Sprint 30]]"
atualizado: 2026-08-25
---

# Analítico - Entidade, persistência de região e unicidade

Pedra angular da sprint. Três coisas num card só porque são a **mesma migration**, e separá-las em três
PRs criaria três versões do mesmo schema.

## (a) Entidade Analítico persistida

Hoje não existe entidade. Um analítico cadastrado numa câmera é a chave `deviceSourceId` dentro de
`Camera.analyticsCapabilities`, uma coluna `Json` `NOT NULL` sem shape validado - o contrato do lado
TypeScript é `Record<string, unknown>`, ou seja, o banco aceita qualquer objeto e ninguém garante nada.

Enquanto for campo livre não há o que restringir, o que consultar nem o que relacionar: a unicidade da
alínea (c), o healthcheck por analítico e o vínculo com ACOM do Bloco 2 todos precisam de uma linha para
apontar.

## (b) Persistência da geometria de região

Nenhum arquivo `.prisma` do `ms-cameras` tem model de região. O caminho atual é proxy HTTP direto para o
device: `apps/ms-cameras/src/analytics-realtime/camera-regions.controller.ts` faz `GET`, `POST` e `DELETE`
em `/regions` no próprio equipamento, com **zero escrita local**.

Isso funciona enquanto o device é o dono da geometria, que é o caso do embarcado. Não funciona para o
analítico servidor, que não tem device onde guardar nada - e a decisão 3 da
[[SOFTWARE-2386 - Especificação do analítico de vídeo em container]] já fechou que a autoridade da
geometria é o `ms-cameras`. Sem esta alínea, o servidor de VL não tem de onde ler a região.

## (c) Unicidade

Um analítico embarcado por tipo por câmera - instalar VL e ATSPM juntos é proibido pela própria matriz de
[[Analítico - Embarcado x Servidor]]. O analítico servidor é a **exceção explícita**: a mesma câmera pode
ter mais de um vínculo de servidor.

A unicidade precisa nascer no banco e no domínio, não só no DTO, e a exceção do servidor precisa ser parte
da restrição em vez de um caso especial em código de validação.

## O risco de dois modelos de região, e por que ele saiu do caminho

A PR **#1352**, do card [[SOFTWARE-2389 - Vínculo região da câmera para endereço de detector]], criava
`VirtualLoopDetectorBinding` com `@@unique([controllerId, detectorIndex])` **e a persistência de região
junto**. Enquanto ela estava aberta, havia risco real de nascerem dois modelos de região no mesmo serviço,
dependendo de qual mergeasse primeiro.

**A #1352 foi fechada em 24/08 no reescopo**, então o risco de corrida deixou de existir: este card é o
único lugar onde a geometria passa a existir em banco. O vínculo de endereço de detector renasce depois,
como [[Analítico servidor - Vínculo região para endereço de detector]] na [[Attlas - Sprint 31]], e por
construção senta sobre a entidade criada aqui em vez de recriá-la. A branch `cameras/docs/SOFTWARE-2389`
ficou, então o desenho do model de vínculo é reaproveitável.

## DoD

Model do Analítico e model de região em migration única, com a unicidade por tipo aplicada no banco e a
exceção do analítico servidor coberta, mais teste de integração do cadastro e do caminho de leitura da
geometria. O card do vínculo na Sprint 31 encosta nesta entidade sem recriar a persistência de região.

## Encosta em

- [[Analítico - Writer do deviceSourceId e higiene do embarcado]], que conserta a escrita da chave antes de
  ela virar coluna.
- [[Analítico - Compatibilidade por arquitetura de câmera]] e [[Analítico - Healthcheck do analítico]], que
  se apoiam nesta entidade.
- [[SOFTWARE-2389 - Vínculo região da câmera para endereço de detector]] e [[Attlas - Sprint 30]].
