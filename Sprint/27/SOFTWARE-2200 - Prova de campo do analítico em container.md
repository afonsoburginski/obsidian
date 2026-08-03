---
tags:
  - attlas
  - sprint-27
  - task
  - analitico
  - detectores
card: SOFTWARE-2200
clickup: https://app.clickup.com/t/86ajj1xv4
titulo: "[Back] Prova de campo do analítico em container até a timeline do detector"
frente: Analítico em container
tamanho: 2 pts
status: fila da Sprint 27 (in progress no ClickUp). Reescopado em 31/07 - a atuação no controlador saiu para o SOFTWARE-2392 e o card virou a prova da rota analítica. Entra na sexta se o connector fechar na quinta. Validado contra a develop em 03/08, com a rota corrigida abaixo. PR aberta em draft (plano de teste): [#1357](https://github.com/atmanadmin/attlas-2026/pull/1357).
sprint: "[[Attlas - Sprint 27]]"
atualizado: 2026-08-03
---

# SOFTWARE-2200 - Prova de campo do analítico em container

Card de origem da frente de analítico em container, movido da Sprint 25 para a 27 e reescopado. O título
antigo era "Testar módulo de analítico desacoplado" e incluía a atuação no controlador via ACOM. A
atuação saiu para card próprio, e este ficou com o que é prova de verdade: **detecção de vídeo de câmera
comum aparecendo na timeline do `ms-detector-history`**.

## Em uma frase

Câmera sem analítico embarcado, motor em container gerando a detecção do laço, publicando a ocupação
normalizada por região direto no Kafka, o connector traduzindo para o evento de detecção padrão do
Attlas, e a detecção chegando ao histórico com contadores coerentes.

## Estado verificado no código (revisão de 31/07)

Duas premissas de 15/07 mudaram. As outras se confirmaram.

- **Rota embarcada (2134) é só feedback visual.** `ms-cameras/analytics-realtime` consome
  `traffic-motion-detection.detections` do broker do device e emite WS `camera:analytics:detection` e
  `camera:analytics:frame`. `IAnalyticsDetectionEvent` diz explícito "purely for visual feedback". Não
  publica em `attlas.detectors.raw`. **Confirmado.**
- **CORRIGIDO no fim do dia 31/07: já existe produtor real de `attlas.detectors.raw`.** A PR #1216 do
  SOFTWARE-2360 mergeou às 16:15 UTC e o `ms-controllers` passou a publicar o raw no **caminho ACP**
  (MOD-044, INT-118, PROJ-009, 75 arquivos, com relatório de teste de campo). O simulador deixou de ser o
  único produtor. A cadeia da semana continua sendo o gap do **caminho de vídeo**, que ninguém cobre, mas
  a frase "ninguém produz o raw" morreu e não deve ser repetida em spec nem em card.
- **O sumidouro está pronto.** `ms-detector-history` consome o raw, valida por `isDetectorRawEvent`, faz
  upsert do `MetaDetector`, persiste `DetectionRecord`, expõe `GET /detectors/:id/timeline` e gera falha
  em `attlas.detectors.fault`. Dá para testar sozinho injetando evento no tópico. **Confirmado.**
  Ressalva de 03/08: hoje nenhum serviço consome `attlas.detectors.fault`, então o plano de teste
  confere que o evento de falha foi publicado, não que algum alarme dispara.
- **CORRIGIDO: a ACOM não está apenas especificada, está implementada.** O `ms-controllers` tem
  `src/acom/` inteiro: CRUD com `AcomAssociation` (controlador, slot, canal), cliente TCP com
  `getDeviceState` e `setDeviceParameters` (INT-081 e INT-082), codec de frame, pollers realtime de
  status e de dados, e escrita no padrão commit-depois-do-ACK. A peça que falta para atuar não é o
  transporte, é o **caller** que decide escrever a saída quando o laço detecta.
- **CORRIGIDO: o cadastro do detector virtual quase existe, mas o vínculo nasce no `ms-cameras`, não
  no `ms-traffic-model`.** O model `Detector` do `ms-traffic-model` já tem `controllerId`, `slot`,
  `channel` e `type` com `VIRTUAL_LOOP` (valor 1 do enum numérico), porém não existe hoje um cadastro
  autoritativo de detector em lugar nenhum do repo, e o `ms-traffic-model` não expõe endpoint próprio
  para isso (o detector vive embutido na Lane). O vínculo entre a região da câmera e o endereço do
  detector, feito de decisão em 31/07, é responsabilidade do `ms-cameras` (SOFTWARE-2389), que é o
  dono do domínio Cameras.
- **Serviços da cadeia seguem esqueletos.** `ms-virtual-loop`, `ms-connector-virtual-loop`, `ms-dai` e
  `ms-acom` são scaffolds de "Hello API" com cerca de 70 linhas e `docs/` só com `.gitkeep`. Reais e
  prontos: `ms-detector-history`, `ms-controllers`, `ms-traffic-model` e a base de analítico do
  `ms-cameras`.
- **Contratos servem inteiros.** `IDetectorRawEvent`, `DetectorTechnology.VIRTUAL_LOOP`,
  `DetectorPurpose.VEHICLE`, `DETECTOR_TOPICS.RAW`, `DETECTOR_SAMPLE_DURATION_MS` de 100 ms,
  `IDetectorAddress` e o `deriveDetectorId` (UUID v5) do core-common. Nada novo precisa entrar em
  `@attlas/contracts` além do tópico de ocupação normalizada.

## Rotas em jogo

```mermaid
flowchart TD
    CAM["Câmera comum<br/>(sem edge embarcado)"]
    ANL["Analítico em container<br/>(SOFTWARE-2386, 2394-2396)"]
    CAM -->|"stream decidido no ADR<br/>(SOFTWARE-2385)"| ANL

    ANL -->|"ocupação normalizada por região<br/>(SOFTWARE-2397)"| CONN["ms-connector-virtual-loop<br/>(SOFTWARE-2390)"]
    CONN -->|"IDetectorRawEvent VIRTUAL_LOOP<br/>attlas.detectors.raw"| HIST["ms-detector-history<br/>(pronto: timeline + falha)"]

    BIND["ms-cameras<br/>vínculo região para detector<br/>(SOFTWARE-2389)"] -.->|"endereço que o connector cacheia"| CONN

    EMB["Analítico embarcado<br/>(entregue em 15/07)"] -.->|"mesmo contrato de ocupação<br/>(SOFTWARE-2388)"| CONN

    CONN -.->|"fora da semana"| ACOMSW["caller da saída ACOM<br/>(SOFTWARE-2392)"]
    ACOMSW -.->|"entrada MDE"| CTRL["Controlador<br/>(lê como detector físico)"]
```

Linha cheia é a rota analítica, escopo da semana: observação e histórico, nunca atua no controlador,
alimenta ATSPM, relatórios e falha.

Linha pontilhada é a atuação, onde a detecção viraria presença real na entrada do controlador. Fica para
a 28, com o transporte ACOM já pronto e faltando só o caller.

## Plano de teste (este card)

1. **Smoke do sumidouro, que isola do produtor.** Publicar um `IDetectorRawEvent` de laço virtual em
   `attlas.detectors.raw` com o simulador de linha de comando do repositório e conferir em
   `GET /detectors/:id/timeline` que o `DetectionRecord` foi persistido e o `MetaDetector` criado.
2. **Motor em container no ar**, apontado para o stream escolhido no ADR, com região provisionada e
   detecção publicada.
3. **Cadeia completa**: ocupação normalizada saindo do analítico em container e o connector
   publicando o raw.
4. **Veículo cruzando o laço**: UP e DOWN na timeline, com contadores RLE coerentes em unidades de
   100 ms.
5. **Caminho de falha**: manter presença contínua além do timeout e confirmar que `fault` foi
   publicado em `attlas.detectors.fault`. Nenhum serviço consome esse tópico hoje, então o critério
   é o evento estar lá, não um alarme disparando.

Evidência colada no card em cada passo. A identidade derivada tem que bater com o endereço do
detector registrado pelo vínculo do SOFTWARE-2389, senão o histórico cria um `MetaDetector` órfão e
ninguém percebe.

## Reuso (mapa)

- **Base de integração com o analítico**: `ms-cameras/analytics-realtime` (`device-stream.consumer.ts`,
  `camera-regions.controller.ts`, `atman-region.mapper.ts`, digest HTTP). O producer de ocupação nasce
  daí, trocando o sink WS por producer Kafka sem perder a resolução de `region_id` para índice estável.
- **Contratos prontos**: `@attlas/contracts/detectors` mais `deriveDetectorId` em `core-common`.
- **Sumidouro pronto**: `ms-detector-history` (consumer, timeline, fault, scheduler de detector
  silencioso).
- **Template de connector**: `ms-connector-une` e `ms-connector-neo` (producer Kafka, cache de cadastro
  em Redis, health, config).
- **ACOM pronta para quando a atuação entrar**: `ms-controllers/src/acom/`.

O model `Detector` do `ms-traffic-model` (com `type` numérico `VIRTUAL_LOOP`) não é o alvo de reuso
para o vínculo região-detector: ele não tem endpoint próprio, não expõe `index` linear e não é o
cadastro autoritativo. O endereço vem do vínculo novo que o SOFTWARE-2389 cria no `ms-cameras`.

## O que o merge da fase 2 respondeu, e o que sobrou

Três das oito perguntas que eu ia levar ao alinhamento já têm resposta versionada no repo:

- **Onde a fase 2 mora**: `apps/ms-controllers/docs/modules/MOD-044-detector-raw-publication.md`, mais
  INT-118, PROJ-009 e um relatório de teste de campo. O plano de integração citado pela `INT-117` segue
  fora do repo, mas o que ele decidia está reproduzido nas specs versionadas.
- **Quem publica no ACP**: o `ms-controllers`, com reversão declarada no `docs/modules/detectors.md`. A
  mesma nota **mantém** `ms-connector-une` e `ms-connector-virtual-loop` como produtores dos seus
  protocolos, então a decisão de onde o produtor de vídeo mora está confirmada pelo doc de domínio, não
  contrariada.
- **Forma do evento**: `build-detector-raw-events.ts` mostra a projeção canônica, com `sampledAt` e os dois
  índices de amostra compartilhados por canal, canal sem identidade derivada nunca publicado, e os
  invariantes que o guard cobra. É o gabarito que o produtor de vídeo tem que respeitar.

Sobraram, e viraram conteúdo de spec no SOFTWARE-2387 em vez de bloqueio:

1. **Publicação em dobro.** A tabela do MOD-044 mapeia `MDE + Vehicle` e o módulo `VirtualLoop` do NEO para
   `VIRTUAL_LOOP`. Se um dia o laço virtual atuar por ACOM, o produtor ACP publica aquela presença e o
   produtor de vídeo também. Quem é a fonte de verdade?
2. **Reuso da janela RLE.** A lógica agnóstica de protocolo (janela, trim de runs, derivação de
   identidade) está dentro do `ms-controllers`. Extrair para lib ou espelhar no connector com card de
   unificação datado?
3. **Endereçamento**: índice de canal físico do controlador ou faixa sintética?
4. **Critério de aceite**: basta aparecer na timeline, ou ATSPM e traffic-model precisam estar prontos?

## Referências

- Rota embarcada, base do reuso: [[SOFTWARE-2134 - Analítico de vídeo ao vivo (detecção + bounding boxes)]].
- Alimentação de vídeo: [[SOFTWARE-2385 - Alimentação de vídeo do analítico em container]].
- Motor fora da câmera: [[SOFTWARE-2386 - Especificação do analítico de vídeo em container]].
- Vínculo região-detector: [[SOFTWARE-2389 - Vínculo região da câmera para endereço de detector]].
- Connector: [[SOFTWARE-2390 - Connector de laço virtual - ocupação vira evento de detector]].
- Plano do domínio de detecção: `docs/planning/detector-pipeline/` e `docs/modules/detectors.md`.
- Planejamento da semana: [[Attlas - Sprint 27]].
