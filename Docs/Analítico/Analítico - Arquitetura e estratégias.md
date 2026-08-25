---
tags:
  - doc
  - analitico
atualizado: 2026-08-24
servico: ms-virtual-loop, ms-connector-virtual-loop, ms-atspm, ms-dai (planejados, todos scaffold hoje)
fonte: auditoria de código de 24/08 (embarcado, servidor, ACOM/ATSPM, detector-history) + 14 PRs da Sprint 27, fechadas em 24/08 (#1342 a #1357) + notas do user + PDF do squad de CV
---

# Analítico - Arquitetura e estratégias

Parte do [[Analítico]]. Esta nota é sobre **implementação**: o que existe de código, o que está
especificado e não mergeou, a dívida técnica e a proposta de topologia de serviço. As regras de
compatibilidade por arquitetura de câmera e a diferença entre as duas formas de execução não moram mais
aqui - são de [[Analítico - Embarcado x Servidor]].

> [!info] Estado em 24/08 (primeira passada, do começo do dia)
> `git log` em `apps/ms-cameras/src/analytics-realtime/` não mostra nenhum commit desde 12/08 - o
> código do caminho embarcado não mudou desde a última revisão desta nota. As PRs em draft da Sprint
> 27 checadas via `gh pr view` (12 das 14, incluindo a #1355 - fix de terminologia da `UF-033`) seguem
> todas `OPEN` + `draft`: nada mergeou. A seção "Caminho embarcado" abaixo ganhou o detalhe de
> implementação que faltava (gateway WS, consumer Kafka, resolver de endpoint, controller de regiões).

> [!warning] Estado em 24/08 (segunda passada, auditoria completa - corrige a primeira)
> A passada acima foi feita sem a auditoria de código completa e ficou com três coisas erradas ou
> incompletas, corrigidas nesta revisão e mantidas aqui como histórico:
>
> 1. **As duas PRs que faltavam identificar não são #1344 e #1348.** São a **#1350** (contrato e
>    publicação da ocupação, card 2397) e a **#1354** (embarcado republica no mesmo contrato, card
>    2388). A #1344 e a #1348 são de outros autores e já mergearam - nada a ver com esta frente.
> 2. **O defeito mais grave do domínio não estava registrado**: `deviceSourceId` não tem writer no
>    banco. Ver a seção logo abaixo. É mais grave que o bug de `kind`, que a primeira passada tratava como o
>    achado principal.
> 3. **`CROSS-043` tinha colisão de ID**, não era só uma citação sem arquivo. Ver a seção própria.
> 4. **Terceira passada, fim do dia**: as 14 PRs da Sprint 27 foram **fechadas** no reescopo da frente, e
>    isso resolveu a colisão do item 3 sozinho. As duas primeiras passadas falavam delas como abertas em
>    draft, o que valia até o fim da tarde de 24/08.

## O furo do `deviceSourceId`: o binding não tem writer

> [!danger] Câmera cadastrada pela UI nunca recebe detecção ao vivo
> `analyticsCapabilities.deviceSourceId` é a chave que liga o frame publicado pelo device à câmera do
> Attlas. **Nenhum código escreve essa chave no banco.** A varredura por `deviceSourceId` em `apps/` e
> `libs/` devolve só leitores: o `camera-regions.controller.ts` lê para montar o `DeviceTarget`, o
> `device-stream.consumer.ts` lê para montar o mapa de binding, e o `atman-device-provisioner.service.ts`
> lê para comparar. Escrita, em lugar nenhum - só o seed (que nem grava a chave) e edição manual do
> registro.

O único writer que existe escreve no **device**, não no banco: `AtmanDeviceProvisioner.ensureSourceId`
faz `PUT /config` no ACAP quando o `source_id` atual do device diverge do esperado. Ele carimba o device
com um valor que ele leu do banco - se o banco não tem o valor, a função é um `return` silencioso
(`if (!target.deviceSourceId) return;`).

A cadeia da consequência é direta e verificável:

1. Operador cadastra a câmera pela UI. `analyticsCapabilities` não recebe `deviceSourceId`.
2. `DeviceStreamConsumer.refreshBindings` itera as câmeras e faz `if (!caps.deviceSourceId) continue;` -
   a câmera nova nunca entra no mapa de binding.
3. O frame chega do device com um `source_id` que não casa com nenhuma câmera. É descartado.
4. A aba Analíticos abre, assina a sala, e não recebe nada. Sem erro, sem log de falha para o operador.

O analítico embarcado está "entregue desde 15/07" e funciona **só para as câmeras que o seed criou**.
É o defeito mais grave do domínio hoje. Fechá-lo é o card 2 da [[Attlas - Sprint 30]].

## O bug de `kind`: real no código e visível para o operador

`device-stream.consumer.ts` deriva o `kind` do evento de detecção a partir da presença de incidente:

```ts
const hasIncident = Array.isArray(inc) ? inc.length > 0 : !!inc;
kind: hasIncident ? EnumAnalyticsDetectionKind.OBJECT_DETECTION : EnumAnalyticsDetectionKind.VIRTUAL_LOOP,
```

A derivação está invertida em relação ao que os nomes sugerem, foi encontrada em 03/08 e **continua
intocada** - `git log` do arquivo não mostra commit desde 14/07, e não existe PR de correção.

> [!warning] O campo chega ao operador, corrigido em 24/08
> A primeira passada desta nota afirmava impacto funcional zero, e estava **errada**. É verdade que o
> overlay de desenho não usa o campo: `camera-analytics-store.service.ts`
> (`apps/web-attlas/src/app/modules/cameras/services/`) nunca lê `event.kind`. Mas
> `camera-analytics-panel.component.html:234` renderiza `{{ entry.kind }}` cru no log de detecção ao
> vivo da aba Analíticos, com `[attr.data-kind]` colorindo `VIRTUAL_LOOP` diferente. **Hoje o operador
> lê o rótulo trocado.**
>
> O que continua verdade é que nenhuma spec fixa a semântica e não existe `device-stream.consumer.spec.ts`
> no repo. Então o flip do ternário entra **junto** com o teste que trava o significado, não no lugar
> dele. Entra no card de higiene do embarcado da [[Attlas - Sprint 30]].

## O que existe de fato hoje

### Caminho embarcado (`ms-cameras/src/analytics-realtime/`)

É o único lugar do monorepo onde o analítico de vídeo roda de verdade. O device é o aplicativo Axis "ATMAN
Traffic Edge ATSPM", falado em `/local/atman_traffic_edge_atspm/api`. O serviço não persiste nada em
banco: cada leitura e escrita de região ou configuração de laço é um proxy HTTP com autenticação digest
direto pra câmera (`GET/PUT /regions`, `PUT /config`). Um WebSocket (namespace `/cameras-analytics`)
retransmite a detecção ao vivo pro front, e um consumidor Kafka lê o tópico `traffic-motion-detection.detections`,
publicado pelo próprio device num broker separado do resto da plataforma - esse tópico nunca foi
catalogado nas constantes centrais de tópicos do sistema.

O vínculo entre câmera e analítico é hoje só um campo `Json` livre (`analyticsCapabilities`), de onde o
código lê por convenção a chave `deviceSourceId`. Não existe entidade "Analítico" persistida, nem coluna
de arquitetura de processador na câmera ou no fabricante.

#### Gateway WS (`camera-analytics.gateway.ts`)

Namespace `cameras-analytics`, path `/api/cameras/analytics/realtime` (3 segmentos, de propósito - escapa
o regex de rota-por-id do Kong). Autenticação por JWT via `WsAuthGuard`
(`apps/ms-cameras/src/cameras/realtime/guards/ws-auth.guard.ts`) - **confirmado presente**: é o MESMO
guard que o gateway de streaming usa (handshake por header `Authorization` ou
`socket.handshake.auth.token`, nunca query string, pra não vazar token em log), aplicado via
`@UseGuards` nas duas mensagens que o client manda: `subscribe_camera` e `unsubscribe_camera`, que
entram/saem da sala `camera:<cameraId>`. O guard ganhou mais campo em 03/08 (commit `7ddac2831d`, feature
de dashboard) - passou a gravar `claims`/`token` no socket - mas isso não mudou a exigência de auth em si,
que já existia.

O gateway emite dois eventos pra sala: `camera:analytics:detection` (`IAnalyticsDetectionEvent` -
`cameraId`, `kind` (`OBJECT_DETECTION` | `VIRTUAL_LOOP`), `index` da região, `objectClass?`,
`occurredAt?`) e `camera:analytics:frame` (`IAnalyticsFrameEvent` - `cameraId`, `boxes:
IAnalyticsDetectionBox[]`, `observedAt`, `capturedAt`). Os dois contratos vivem em
`libs/contracts/src/lib/object-detection/`. `index` referencia a região de detecção de objeto (DAI),
nunca o id gerado no front - vale pros dois `kind`, porque o laço virtual não tem geometria própria
(reaproveita a região DAI). `capturedAt` é o `frame_id` do device (epoch segundos, convertido pra ms) - é
o relógio que o overlay usa pra colar a bounding box no veículo em vez de atrasar; cai pro horário de
recebimento quando o device omite `frame_id`.

#### Consumer Kafka (`device-stream.consumer.ts`)

Liga no broker de `ANALYTICS_STREAM_BROKERS` (o do próprio device, fora do Kafka da plataforma) e consome
`traffic-motion-detection.detections`. Vínculo por `source_id` no **value** da mensagem, nunca na key - a
key é o `analytic_id` do device, um token aleatório que o device troca a cada reinstall/upgrade do ACAP,
então bindar nela perderia o stream depois de qualquer rebuild. O `source_id` mapeia pra
`analyticsCapabilities.deviceSourceId` de **todas** as câmeras que compartilham aquele device físico
(mesmo hardware cadastrado uma vez por sistema-tenant) - um frame acende todas elas, não só a última. O
índice de região vem da ordem estável do `/regions` do device, nunca da posição no array do frame (que
omite região vazia e reordena).

`groupId` do consumer: `ANALYTICS_STREAM_GROUP_ID` setada (cluster) → group estável por deployment - com o
adapter Redis do Socket.IO um único consumidor por deployment basta, o fan-out pras réplicas é
do adapter (`PROJ-012`, com adendo de `PROJ-017` em 30/07); env ausente (dev) → UUID por processo,
isolamento por stack (ao custo de um group órfão por boot). É proteção contra o incidente de 2026-07-15
(`SOFTWARE-2226` item 3c), onde um group fixo fazia dev/homolog/produção - que compartilham o mesmo
broker/device - disputarem partição entre si.

#### Resolver de endpoint (`atman-endpoint.resolver.ts`)

Sonda três transportes na ordem até um responder `GET /config`: porta **2001** nativa do ACAP, porta
**80** (o Apache da Axis reverso-proxeia o mesmo path, Digest) e porta **443** (Basic, TLS
auto-assinado). Cacheia a base resolvida por IP de device com TTL (`ATMAN_ENDPOINT_TTL_MS`, default 30
min); invalida em erro pra re-sondar na próxima chamada. É o que permite alcançar uma câmera travada
(HTTP puro desligado, só HTTPS, porta do ACAP bloqueada) sem configuração por device - lista de
transportes e timeouts são tunáveis via env (`ATMAN_ANALYTIC_API_ENDPOINTS`).

#### Controller de regiões (`camera-regions.controller.ts`)

Rotas `GET/PUT /cameras/:id/object-detection-regions` e `GET/PUT /cameras/:id/virtual-loops`, escopadas
por `@SystemId()`. GET lê o device de verdade (o que ele detecta de fato, degradando pra vazio/default
quando o device está fora); PUT reconcilia: relê o `/regions` atual, faz `POST /regions` (upsert do
conjunto desejado), `DELETE` das regiões que saíram (preservando incidentes DAI que o front não
gerencia), e termina chamando `enableProducer` do `AtmanDeviceProvisioner` - é aqui, e só aqui, que o
`source_id` é re-carimbado e o producer religado, sempre atrás de um save explícito do operador. **Mas
o valor re-carimbado vem do banco**, e é ele que ninguém escreve: ver a seção do furo, acima.

`AtmanDeviceProvisioner.ensureSourceId` só escreve `PUT /config` quando o `source_id` atual do device
diverge do esperado (lê antes de escrever, best-effort, nunca lança) - é exatamente o padrão idempotente
que faltava no reconciler do `PROJ-014` e que causava a guerra de escrita entre instâncias (ver achado
abaixo).

Os quatro endpoints de região estão em produção **sem nenhuma spec**.

### Aba Analíticos no frontend

`apps/web-attlas/src/app/modules/cameras/analytics/` e os componentes `camera-analytics-*` implementam o
desenho de região (DAI) e a configuração do Virtual Loop sobre o vídeo ao vivo, com overlay de bounding
box em tempo real (dead reckoning e interpolação a 60fps). Entregue pelo PR #766 e uma sequência de
follow-ups que migraram a persistência de `localStorage` para chamada HTTP real contra `ms-cameras`. A
spec `UF-033-camera-analytics-draw.md` continua descrevendo a feature como "front-only, mock em
localStorage" - texto desatualizado, ver a seção de dívida técnica abaixo.

### ACOM

Já foi portada de fato para dentro de `ms-controllers/src/acom/` (CRUD, comunicação TCP, tempo real), não
mora no serviço reservado `ms-acom`, que nunca teve uma linha de domínio escrita. A decisão de portar está
registrada como DD-20 no SPEC do `ms-controllers`.

> [!warning] A pegadinha de roteamento do Kong
> `docker/kong.yml` roteia `/api/acoms` (plural) para o `ms-controllers`, que é a implementação real, e
> `/api/acom` (singular) para o esqueleto `ms-acom`, que nunca recebe tráfego. A precedência de prefixo
> mais longo do Kong é o que mantém isso funcionando, e está comentada no próprio arquivo. Some com o
> esqueleto e a rota singular some junto - mas hoje ela é uma porta aberta para um serviço vazio.

### O sumidouro já está pronto: `ms-detector-history`

É o serviço mais maduro da cadeia (10 módulos, 5 relatórios de teste de campo executados) e é o destino
final do evento de laço virtual. **Ele aceita esse evento sem nenhuma mudança**:

- `detection/detection.service.ts` já resolve a identidade do detector com
  `deriveDetectorId({ controllerId: event.controllerId, index: event.index })` - a mesma derivação que o
  connector de laço virtual vai emitir.
- Os contratos de detector todos existem em `libs/contracts/src/lib/detectors/`: `IDetectorRawEvent`,
  `DetectorTechnology.VIRTUAL_LOOP`, `DETECTOR_SAMPLE_DURATION_MS = 100`, `deriveDetectorId`.

Ou seja, o que falta na cadeia do servidor é tudo **antes** do sumidouro: o analítico que produz a
ocupação e o connector que traduz o endereço. O lado que persiste a série já está de pé e testado.

> [!warning] `attlas.detectors.fault` é um beco sem saída hoje
> O produtor é real (`apps/ms-detector-history/src/fault-detection/fault-publisher.service.ts`, producer
> dedicado com conexão própria), o tópico está catalogado (`DETECTOR_TOPICS.FAULT`) e o contrato existe
> (`IDetectorFaultEvent`). `docs/modules/detectors.md` designa o `ms-alarms` como assinante, mas **o
> `ms-alarms` não consome o tópico**. O frontend lê falha de detector por REST. Falha de detector de laço
> virtual, quando existir, cai no vazio.

## Estado real dos cinco serviços reservados

`ms-virtual-loop`, `ms-connector-virtual-loop`, `ms-atspm`, `ms-dai` e `ms-acom` são **scaffold NX
byte-idêntico**: `app.service.ts` tem o mesmo hash MD5 nos cinco, e `main.ts` nos cinco ainda carrega o
comentário gerado `This is not a production server yet!`. Zero linha de domínio em qualquer um deles.

O que engana é que a **infraestrutura está toda provisionada e vazia** nos cinco: imagem Docker, entrada
no `docker-compose.yml`, rota no `docker/kong.yml` e banco `db-*` criado. Do lado de fora parece serviço
vivo - `docs/architecture/services.md` inclusive ainda anuncia o `ms-acom` como serviço na porta 3305.

## As decisões preservadas das 14 PRs fechadas

A Sprint 27 (03 a 09/08) produziu **14 PRs**, nenhuma mergeada, especificando o servidor de Virtual Loop
com bastante detalhe. A sprint fechou sem entrega de código, e as PRs foram **fechadas em 24/08 no
reescopo** da frente. Esta seção é o que sobreviveu do conteúdo delas: as decisões estruturais, que a
[[Attlas - Sprint 31]] transcreve em spec nova em vez de redescobrir.

> [!danger] As 14 PRs foram fechadas em 24/08, e as branches ficaram
> `#1342`, `#1343`, `#1345`, `#1346`, `#1347`, `#1349`, `#1350`, `#1351`, `#1352`, `#1353`, `#1354`,
> `#1355`, `#1356` e `#1357` foram **fechadas** no reescopo, todas de 03/08, todas 100% markdown e zero
> código de produção. Motivo: especificavam o caminho do dado sobre uma fundação que não existe (entidade
> Analítico, geometria em banco, unicidade, writer do vínculo).
>
> **As branches `cameras/docs/SOFTWARE-*` não foram deletadas**, então o texto integral segue
> recuperável. O que está abaixo é o resumo das decisões, e é ele que a [[Attlas - Sprint 31]] usa como
> insumo. Nenhuma decisão precisa ser reaberta; o que precisa é ser reescrita em spec sobre a fundação
> nova.

Decisões já fechadas nessas PRs:

- **Fonte do vídeo do analítico em container** (ADR, PR #1342): consome o relay que o `ms-cameras` já
  mantém pro operador assistir ao vivo, pedindo o substream de menor resolução disponível. Não lê a câmera
  direto (evitaria expor a credencial da câmera a mais um processo) e não usa Kafka para vídeo.
- **Stack e escopo do `ms-virtual-loop`** (SPEC, PR #1343): NestJS, com `ffmpeg` como processo filho pra
  decodificação e uma biblioteca de inferência nativa embutida no processo Node, não um serviço Python
  separado. O serviço ingere o stream, detecta veículo por frame, lê a geometria da região do `ms-cameras`
  (que continua dono dela) e publica a ocupação da região. Não persiste série histórica, não fala com o
  controlador, não decide atuação em hardware.
- **`ms-connector-virtual-loop` só traduz endereço** (PR #1345): consome a ocupação publicada pelo
  `ms-virtual-loop`, resolve pra qual detector físico aquela câmera e região correspondem, e republica no
  mesmo tópico de detecção bruta que o caminho físico usa. Não reimplementa a lógica de reconciliação de
  janela do caminho físico, porque o problema que ela resolve (buffer de leitura de equipamento por
  polling) não existe do lado do vídeo.
- **Contrato de ocupação** (PR #1350): `attlas.analytics.region-occupancy` com `IRegionOccupancyEvent`,
  em `libs/contracts/src/lib/analytics/`, que é **greenfield** - a pasta não existe hoje. É o contrato que
  os dois caminhos de execução compartilham, ver [[Analítico - Embarcado x Servidor]].
- **Embarcado republica no mesmo contrato** (PR #1354): o caminho embarcado passa a publicar a mesma
  ocupação, a partir do estado que já calcula pro WebSocket. É o que impede o domínio de rachar em dois
  pipelines com formatos diferentes.
- **Vínculo entre região de câmera e endereço de detector** (PR #1352, dentro de `ms-cameras`): modelo novo
  que garante que um endereço de detector físico nunca é referenciado por duas regiões ao mesmo tempo -
  regra de unicidade diferente da unicidade de analítico embarcado (ver [[Analítico - Requisitos e SLA]]),
  granularidade diferente.
- **Invariante contra contagem duplicada** (PRs #1345 e #1356, no recorte de atuação por ACOM): se o laço
  virtual algum dia atuar também via ACOM na entrada do controlador, o endereço que já tem vínculo de
  câmera registrado não pode ao mesmo tempo ser publicado como presença física pelo caminho antigo, senão
  o histórico conta o mesmo veículo duas vezes.
- **Correção da spec `UF-033` já escrita, nunca mergeada** (PR #1355): reescreve exatamente o texto
  desatualizado do frontend e corrige a terminologia morta (`deviceAnalyticId` para `deviceSourceId`).
  Confirmado por leitura direta de `develop`: o texto antigo ainda está lá. Com a #1355 fechada, o
  conserto some junto - foi por isso que ele virou parte explícita do card de higiene do embarcado da
  [[Attlas - Sprint 30]]. A terminologia morta contamina 4 docs (`INT-010`, `PROJ-011`, `PROJ-013`,
  `MOD-014`).

### `CROSS-043` e `CROSS-032`: uma colisão resolvida, uma dívida órfã

> [!success] Fechar a #1342 resolveu a colisão de `CROSS-043`
> Havia colisão até 24/08: três atômicas **já mergeadas** (`PROJ-012`, `PROJ-016`, `PROJ-017`) citam
> `CROSS-043` como a decisão do **adapter Redis do Socket.IO** - a `PROJ-017` o nomeia
> `CROSS-043-socketio-redis-adapter-unification` na lista de dependências - e a #1342 criava um
> `CROSS-043-container-analytics-video-feed.md` para outra coisa. Com a #1342 fechada, **o ID volta a
> significar só o adapter Redis**. Confirmado em `develop`: nenhum arquivo `CROSS-043*` existe, e a faixa
> salta de `CROSS-042` para `CROSS-045`, então `043` e `044` estão livres.
>
> O que resta é a ausência do arquivo: `CROSS-043` continua **referência fantasma**, citada por três
> atômicas mergeadas sem spec própria. Isso não é urgente, mas é dívida real de rastreabilidade.

> [!warning] A duplicação de `CROSS-032` ficou órfã pelo fechamento
> Existem **duas** `CROSS-032` em `develop`: `CROSS-032-operational-visibility-replaces-view-permissions.md`
> e `CROSS-032-public-webrtc-turn.md`. A renumeração da de TURN para `CROSS-044` ia de carona na #1342, que
> foi fechada - então a correção se perdeu junto. Virou card próprio na [[Attlas - Sprint 30]]. O registro
> do lado de Câmeras está em [[Status em tempo real - Arquitetura e estratégias]].

### Dívida técnica que a Sprint 27 registrou e nunca corrigiu em código

- O bug de `kind` no consumidor do device, encontrado em 03/08 e intocado - ver a seção própria acima.
  O valor invertido aparece no log ao vivo da aba Analíticos, então chega ao operador.
- O reconciliador que reativava automaticamente o produtor de stream do device (quando ele sobe desligado
  após reinício de energia) foi revertido em 29/07 por causar loop de reboot no equipamento, e nunca teve
  sucessor. Histórico completo (medição do loop entre dois writers concorrentes, causa raiz no seed com
  device hardcodado, receita de diagnóstico de rede) em
  [[Carga desnecessária nas câmeras - reconciler do analítico e conexões duplicadas]]. A spec `PROJ-017`
  (30/07, domínio Saúde - lease Redis por device pra monitor único sob N réplicas) marcou o `PROJ-014`
  como `superseded` no código e trouxe o `ANALYTICS_STREAM_GROUP_ID` estável pro consumer (ver seção
  acima), mas resolve um problema diferente (réplicas do próprio `ms-cameras` disputando o mesmo device,
  não instâncias externas de Attlas) - não é sucessora funcional pro cenário "device reinicia com producer
  desligado", que segue sem dono explícito.
- `attlas.detectors.fault` sem consumidor, ver a seção do `ms-detector-history` acima.
- A terminologia morta `deviceAnalyticId` contamina 8 docs na develop; o campo real é `deviceSourceId`.

## Compatibilidade de câmera: onde a regra mora

A regra de quais features de analítico uma câmera pode oferecer (arquitetura do processador, matriz de
execução embarcado x servidor, exclusão mútua entre app de VL e app de ATSPM) **não é assunto desta
nota** - é de [[Analítico - Embarcado x Servidor]], que é a fonte de verdade do vocabulário e da matriz.

Do lado de implementação, o que interessa aqui é que **nada disso existe em código**: `ARTPEC` só aparece
no repositório em doc de codec de streaming, nem `Camera` nem `CameraManufacturer` têm arquitetura de
processador, e `capabilities.dai` / `capabilities.virtualLoop` são duas flags independentes que a
auto-detecção do cadastro seta com o mesmo valor. Modelar isso é o card 4 da [[Attlas - Sprint 30]].

## Proposta de topologia de serviço

| Serviço | Proposta | Por quê |
| --- | --- | --- |
| `ms-cameras` | Mantém e cresce | Continua dono da geometria de região e do vínculo com o analítico embarcado. Ganha, do trabalho já especificado na Sprint 27, o vínculo região-endereço de detector e a publicação de ocupação também pelo caminho embarcado |
| `ms-virtual-loop` | Mantém, escopo já fechado | É o servidor de Virtual Loop em si, não uma camada de configuração em volta de um processamento que ficaria em outro lugar. Falta destravar e mergear |
| `ms-connector-virtual-loop` | **Não nasce como serviço.** Decidido em 24/08 relendo as notas de alinhamento (elas listam só quatro serviços) | Fica scaffold no repo/compose; a tradução de endereço e a publicação em `attlas.detectors.raw` vivem dentro do `ms-virtual-loop`, ver [[Attlas - Sprint 31]] |
| `ms-atspm` | Mantém, redefine do zero | Único dos serviços de produto sem nenhum planejamento anterior. Escopo: métricas avançadas de fato, associação com grupo semafórico e snapshot |
| `ms-dai` | Mantém, escopo pendente | Fica em aberto se processa incidentes de forma independente ou se vira sub-produto do ATSPM, exibido por ele |
| `ms-acom` | Descontinuar | Substituído por completo por `ms-controllers/src/acom/`. Sai junto a rota `/api/acom` singular do Kong |

## Planejamento

O roadmap desta frente não vive mais nesta nota. O plano ordenado, com dependências, pontos e o que está
comprometido na semana, é a [[Attlas - Sprint 30]] - frente única de 24 a 30/08. O mapa card ↔ PR das 14
PRs fechadas está em [[00 - Sem prazo (backlog)]].

## Ver também

- [[Analítico]] · [[Analítico - Embarcado x Servidor]] · [[Analítico - Requisitos e SLA]] · [[Analítico - Fluxos]]
- [[Attlas - Sprint 30]] · [[Attlas - Sprint 27]] (o planejamento que produziu as 14 PRs)
- [[Carga desnecessária nas câmeras - reconciler do analítico e conexões duplicadas]] (histórico do
  `PROJ-014` revertido e da dedup de conexão por device)
- [[Status em tempo real - Arquitetura e estratégias]] (o outro lado da história de `CROSS-043`)
- [[VMS - Arquitetura e estratégias]] (padrão de nota usado aqui) · [[ms-cameras]]
