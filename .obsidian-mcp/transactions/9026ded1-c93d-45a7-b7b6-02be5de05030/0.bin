---
tags:
  - doc
  - analitico
aliases:
  - "Analítico"
  - "Analítico de vídeo"
  - "VL e ATSPM"
servico: ms-virtual-loop, ms-atspm, ms-connector-virtual-loop, ms-dai (planejados, todos scaffold hoje)
fonte: auditoria de código de 24/08 (embarcado, servidor, ACOM/ATSPM) + Anotações sobre Analítico de vídeo (notas do user) + attlas-vl-atspm.pdf (squad de Visão Computacional, 10/08) + decisões preservadas das 14 PRs fechadas da Sprint 27 + prazo externo fechado em 25/08
atualizado: 2026-08-25
---

# Analítico (Virtual Loop, ATSPM, DAI, ACOM)

> Módulo próprio do edital (`docs/architecture/modules.md`), **não é submódulo de** [[ms-cameras]]. A
> relação com Câmeras é de dependência, não de posse. Duas capacidades de produto - **Virtual Loop** e
> **ATSPM** - e cada uma pode rodar de duas formas: **embarcada** na câmera ou em **servidor** analítico.
> A diferença entre as duas formas é o assunto de [[Analítico - Embarcado x Servidor]], que é a nota
> central deste domínio.

> [!important] Prazo externo: 18/09/2026, front e backend
> Fechado pelo user em 25/08: a entrega do Analítico de vídeo, **front e backend**, tem prazo de
> **18 de setembro de 2026**. A data cai na Sprint 33, depois do fim da [[Attlas - Sprint 32]] - as três
> sprints do analítico (30, 31, 32) são o desenvolvimento cheio antes da semana de entrega. Maior risco
> conhecido contra o prazo: nenhuma das três tem card de implementação de frontend, só spec `UF-*` - ver
> [[Attlas - Sprint 32]], seção "Proposto, sem pontos fechados".

## As duas capacidades e a placa

- **Virtual Loop (VL)** - detecção de cruzamento por laço virtual desenhado sobre o vídeo. Não tem
  geometria própria: reaproveita as regiões de detecção de objeto (DAI).
- **ATSPM** - pacote de quatro funcionalidades (Tracker, DAI, TPM e o VL embutido). Onde há ATSPM, o app
  de VL separado não é necessário. Cada funcionalidade é um sub-produto endereçável.
- **ACOM** - **não é capacidade**, é transporte: a placa que converte o laço virtual em contato seco para
  o controlador legado ler como laço físico. Vive em `ms-controllers/src/acom/` (DD-20), não no
  `ms-acom`, que é esqueleto morto.

## Estado real em 24/08 (auditado contra o código)

> [!important] Só o caminho embarcado existe, e ele tem um furo que impede o uso real
> O pipeline embarcado (`ms-cameras/src/analytics-realtime/`) é o único analítico que roda de fato. Mas
> **`deviceSourceId` não tem nenhum writer no banco**: só o seed e edição manual gravam essa chave, e é
> ela que liga o frame do device à câmera. Consequência verificável: **câmera cadastrada pela UI nunca
> recebe detecção ao vivo**. É o defeito mais grave do domínio hoje, maior que o bug de `kind` que a
> Sprint 27 registrou.

| Frente | Estado | Onde |
| --- | --- | --- |
| Analítico embarcado (pipeline ao vivo) | **Real**, com o furo acima | `apps/ms-cameras/src/analytics-realtime/` |
| Aba Analíticos no frontend (desenhar região e laço, overlay ao vivo) | **Real** | `apps/web-attlas/src/app/modules/cameras/analytics/` |
| Contratos de região, laço, detecção e frame | **Real** | `libs/contracts/src/lib/{object-detection,virtual-loop}/` |
| Analítico servidor (`ms-virtual-loop`) | **Zero código.** As 14 PRs de spec de 03/08 foram fechadas no reescopo de 24/08; decisões preservadas, spec renasce na [[Attlas - Sprint 31]] | `apps/ms-virtual-loop/` (scaffold) |
| Tradutor de endereço (`ms-connector-virtual-loop`) | **Especificado, zero código** | `apps/ms-connector-virtual-loop/` (scaffold) |
| `ms-atspm` e `ms-dai` | **Nem spec existe** | scaffold puro, banco e rota Kong provisionados e vazios |
| ACOM (CRUD, TCP, realtime) | **Real**, mas sem o caller que atua | `apps/ms-controllers/src/acom/` (80 arquivos) |
| Persistência de geometria de região | **Não existe em banco nenhum** - é proxy HTTP direto pro device | - |
| Entidade "Analítico" persistida | **Não existe** - é a chave `deviceSourceId` num campo `Json` livre | `Camera.analyticsCapabilities` |

## Os cinco buracos de ciclo de vida

A Sprint 27 especificou o **caminho do dado** (stream, detecção, ocupação, evento de detector, histórico)
e fez isso bem. O que ela deliberadamente não tocou é a **gestão do analítico** - e é exatamente o que as
notas de alinhamento do user pedem. Nenhum destes tem uma linha de spec:

1. **Entidade Analítico persistida**, com a unicidade "um analítico embarcado por tipo por câmera, exceto
   servidor".
2. **Healthcheck do analítico** consultável pelo operador. Hoje falha degrada em silêncio: região vazia é
   indistinguível de device offline.
3. **Compatibilidade por arquitetura de câmera** (ARTPEC 7/8/9), com identificação automática pelo
   backend (requisito fechado em 25/08) - o repo inteiro só cita ARTPEC em doc de codec de streaming.
4. **Preset PTZ com snapshot de região**. Hoje mover a câmera de preset invalida a geometria em silêncio.
5. **Atualização remota (OTA) do app embarcado**. Não existe nenhuma gestão de aplicação no device.

## Mapa de código

| Área | Onde | Estado |
| --- | --- | --- |
| Proxy pro device, WS ao vivo, consumer Kafka | `apps/ms-cameras/src/analytics-realtime/` | Real; sem persistência, sem writer de `deviceSourceId` |
| Aba Analíticos (desenho, overlay 60fps) | `apps/web-attlas/src/app/modules/cameras/analytics/` | Real; desenha sobre vídeo ao vivo, não sobre frame congelado |
| Contratos de região, laço, detecção, frame | `libs/contracts/src/lib/object-detection/`, `.../virtual-loop/` | Real; região é polígono de pontos em %, sem conceito de linha e sem validação |
| Contratos de detector (sumidouro) | `libs/contracts/src/lib/detectors/` | Real e completo (`IDetectorRawEvent`, `VIRTUAL_LOOP`, `deriveDetectorId`) |
| Histórico de detecção | `apps/ms-detector-history/` | Real e maduro; aceita o evento do laço virtual sem nenhuma mudança |
| ACOM | `apps/ms-controllers/src/acom/` | Real (CRUD, TCP, codec, pollers); **falta o caller** |
| `ms-virtual-loop`, `ms-connector-virtual-loop`, `ms-atspm`, `ms-dai`, `ms-acom` | `apps/` | Scaffold NX byte-idêntico; infra (compose, Kong, banco) provisionada e vazia |

## Notas deste domínio

- [[Analítico - Visão do produto]] - **comece aqui**: o módulo por inteiro em uma nota - o que é, onde
  roda, os três caminhos do dado, com o que se relaciona, estado real de cada peça e as 16 decisões das
  Sprints 30 a 32, cada uma com o motivo. É a vista de cima; as notas abaixo têm a profundidade.
- [[Analítico - Embarcado x Servidor]] - **a nota central**: o que muda e o que não muda entre as duas
  formas de execução, matriz de compatibilidade por arquitetura de câmera, e o contrato que faz as duas
  convergirem.
- [[Analítico - Requisitos e SLA]] - regras de negócio das notas de alinhamento e do PDF do squad de CV,
  cada uma com o estado real conferido no código.
- [[Analítico - Arquitetura e estratégias]] - implementação do que existe, as decisões preservadas das 14 PRs fechadas, dívida
  técnica e proposta de topologia de serviço.
- [[Analítico - Fluxos]] - fluxo de decisão ao cadastrar câmera e os três pipelines de dado.
- [[Analítico - Frontend do attlas-design]] - o frontend do módulo já foi desenhado e codado fora do
  produto, no repo `attlas-design`. Mapa de o que serve portar, o que não serve, e o que ainda é
  desenho novo (ARTPEC não existe no protótipo).

## Planejamento

Três sprints, contra o prazo externo de **18/09** (front e backend) registrado no topo desta nota. Cada
uma tem um `index.md` respondendo o que entrega em feature e em tela:

- [[Sprint 30 - o que entrega]] (24-30/08) - camada de gestão do embarcado: entidade em banco, saúde do
  analítico, writer do vínculo, compatibilidade ARTPEC, dedup de incidente, preset com snapshot,
  evidência. **5 telas.** 51 pts em 12 cards, 11 entregues.
- [[Sprint 31 - o que entrega]] (31/08-06/09) - analítico servidor (Virtual Loop em container). 25 pts,
  **nenhuma tela** - é o caminho do dado.
- [[Sprint 32 - o que entrega]] (07-13/09) - escala e prova de campo. Último checkpoint antes do prazo.

> [!danger] A conta de capacidade não fecha com um dev
> Somando o que falta: 40 pts na Sprint 30, 25 na 31, 4 na 32 = **69 pts em 3 semanas**, ou ~23 por
> semana, contra 13-20 que a tabela do time põe numa semana de um dev. Detalhe e as três saídas
> possíveis em [[Attlas - Sprint 30]], seção "O veredito de capacidade".

## Relacionados

[[ms-cameras]] · [[Cameras]] · [[PTZ e presets]] · [[Saúde e monitoramento]] · [[Streaming]] ·
[[Carga desnecessária nas câmeras - reconciler do analítico e conexões duplicadas]]
