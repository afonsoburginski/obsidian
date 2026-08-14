---
tags:
  - doc
  - analitico
aliases:
  - "Analítico"
  - "Analítico de vídeo"
  - "VL e ATSPM"
servico: ms-virtual-loop, ms-atspm, ms-connector-virtual-loop, ms-dai (planejados, todos scaffold hoje)
fonte: "Anotações sobre Analítico de vídeo.md" (notas do user) + attlas-vl-atspm.pdf (squad de Visão Computacional, 10/08) + docs/planning/analitico/ no repo
atualizado: 2026-08-12
---

# Analítico (Virtual Loop, ATSPM, DAI, ACOM)

> Módulo próprio (categoria Dependente em `docs/architecture/modules.md`), **não é submódulo de**
> [[ms-cameras]]. A relação com Câmeras é de dependência, não de posse: o analítico depende de câmera pra
> existir, mas o domínio é dele. O único motivo de hoje ter código dentro de `ms-cameras` é prático, não
> arquitetural: nenhum dos serviços dedicados (`ms-atspm`, `ms-virtual-loop`, `ms-connector-virtual-loop`,
> `ms-dai`) saiu do scaffold, então o caminho embarcado do analítico foi implementado provisoriamente
> dentro do serviço de Câmeras. Duas capacidades: **Virtual Loop** (detecção por laço virtual) e **ATSPM**
> (pacote de métricas avançadas de desempenho semafórico), cada uma podendo rodar embarcada na própria
> câmera ou num servidor analítico separado.

> [!important] Estado real: quase tudo é planejamento, não código
> Só o caminho **embarcado** existe de fato, dentro de `ms-cameras/src/analytics-realtime/`. Os quatro
> serviços que deveriam existir para o resto (`ms-atspm`, `ms-virtual-loop`, `ms-connector-virtual-loop`,
> `ms-dai`) são scaffold puro do NX no código publicado, sem nenhuma linha de domínio. Mas **existe
> planejamento detalhado não mergeado**: a Sprint 27 (03 a 09/08) produziu 14 PRs em draft especificando
> boa parte do servidor de Virtual Loop, e nenhuma delas foi mergeada. Ver
> [[Analítico - Arquitetura e estratégias]].

## O que cada capacidade faz

- **Virtual Loop (VL)** - detecção de cruzamento por laço virtual desenhado sobre o vídeo. Não tem
  geometria própria: reaproveita as regiões de detecção de objeto (DAI). Roda como app na câmera (Axis,
  qualquer arquitetura de processador) ou num servidor analítico dedicado.
- **ATSPM** - pacote de quatro funcionalidades: Tracker, DAI (detecção automática de incidentes), TPM e o
  próprio VL embutido. Quando o ATSPM está presente, o app de VL separado não é necessário. Roda como app
  só em câmeras Axis de processador mais novo, ou em servidor analítico ATSPM (qualquer câmera).
- **ACOM** - não é uma terceira capacidade do analítico, é a placa que converte o sinal do laço virtual em
  contato seco para o controlador semafórico legado enxergar como se fosse um laço físico. Já foi portada
  para dentro do módulo de Controladores - ver nota abaixo.

> [!note] ACOM vive em Controladores, não aqui
> A implementação real de ACOM (CRUD, comunicação TCP, tempo real) está em
> `apps/ms-controllers/src/acom/`, não no serviço reservado `ms-acom` (que é scaffold morto). Decisão
> registrada como DD-20 no SPEC do `ms-controllers`. Este documento trata ACOM só pelo lado do vínculo com
> o analítico (cardinalidade, atuação), não pelo domínio de comunicação com o equipamento.

## Mapa de código

| Área | Onde | Estado |
| --- | --- | --- |
| Pipeline embarcado (proxy pro device, WS ao vivo, consumer Kafka) | `apps/ms-cameras/src/analytics-realtime/` | Real, maduro |
| Aba "Analíticos" no detalhe da câmera (desenho de região, laço, overlay ao vivo) | `apps/web-attlas/src/app/modules/cameras/analytics/` + `components/camera-analytics-*` | Real, maduro (entregue via PR #766 e follow-ups) |
| Contratos de região/incidente/laço | `libs/contracts/src/lib/object-detection/`, `libs/contracts/src/lib/virtual-loop/` | Real |
| `ms-virtual-loop` (servidor de VL) | `apps/ms-virtual-loop/` | Scaffold no código; SPEC + 4 atômicas em draft (PRs #1343/1346/1347/1349/1351) |
| `ms-connector-virtual-loop` (tradutor de endereço) | `apps/ms-connector-virtual-loop/` | Scaffold no código; SPEC + atômica em draft (PRs #1345/1353) |
| `ms-atspm` (métricas avançadas) | `apps/ms-atspm/` | Scaffold, sem nenhum planejamento ainda |
| `ms-dai` (detecção automática de incidentes, standalone) | `apps/ms-dai/` | Scaffold, bloqueando `ms-traffic-model` hoje |
| `ms-acom` | `apps/ms-acom/` | Scaffold morto, substituído por `ms-controllers/src/acom/` |

## Notas do domínio

- [[Analítico - Requisitos e SLA]] - regras de negócio do PDF do squad de CV e das notas de alinhamento, com o que já está implementado e o que é novo.
- [[Analítico - Arquitetura e estratégias]] - diagnóstico do que existe de fato, o achado da Sprint 27 não mergeada, proposta de topologia de serviço e roadmap.
- [[Analítico - Fluxos]] - fluxo de decisão ao cadastrar câmera/analítico, regras de desenho de região por motor, e os três pipelines (embarcado, servidor, ACOM).

## Relacionados

[[ms-cameras]] · [[VMS]] · [[PTZ e presets]] · [[Saúde e monitoramento]] · [[Streaming]]
