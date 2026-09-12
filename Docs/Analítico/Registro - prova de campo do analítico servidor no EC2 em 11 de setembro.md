---
tags:
  - doc
  - analitico
  - registro
  - ec2
  - ms-video-analytics
  - ms-cameras
aliases:
  - "Prova de campo do analítico no EC2 (11/09)"
  - "Registro - deploy do analítico no EC2"
fonte: sessão de 11/09/2026 no box aws-attlas-26 (compose em /home/ubuntu), banco attlas_cameras, logs dos containers, tela pública dev.v2.attlas.atmansystems.com, código da develop em dbe3b2ab3c
atualizado: 2026-09-11
---

# Registro - prova de campo do analítico servidor no EC2 em 11 de setembro

Parte do [[Analítico]]. É o registro histórico do dia em que a cadeia do analítico servidor rodou ponta
a ponta **fora da máquina de desenvolvimento**, no EC2 dev, com câmera real e bounding box na tela
pública. Serve a duas coisas: fechar a prova de campo do `SOFTWARE-2200` com evidência, e listar cada
achado, bug e decisão que saiu dela, com o destino de cada um (PR, débito declarado, ou "não é bug").

> [!success] O que ficou provado
> Duas câmeras ATMN do tenant `atman` detectam no `ms-video-analytics` do EC2 dev: `ATMN – DEMO`
> (`00000000-0000-4000-8000-000000000010`, 10.1.1.78, Laço Virtual) e `ATM-PTZ`
> (`7f3a5cf8-2ede-4dd2-a6ea-e0a5719a9dbb`, 10.1.1.79, ATSPM), as duas em modo `SERVER`. As caixas
> chegam em `attlas.virtual-loop.frame-detections`, a ocupação vira `attlas.detectors.raw` para o
> controlador `Quito 2 - Novo cadastro` (UNE, tenant atman), e o `ms-detector-history` criou os
> detectores 22 e 23 dele com registros gravados. A tela `#/analytics/detection/<cameraId>` mostra
> "car" sobre a via da DEMO, estado Online, e o modo edição abre e fecha na região em modo SERVER.

![[Prova de campo EC2 11-09 - bounding box na ATMN DEMO.png]]

![[Prova de campo EC2 11-09 - regiao na ATM-PTZ.png]]

> [!info] Estado em 11/09 no fechamento
> A #3303 reúne a reconciliação dos paths, o transporte TCP e o filtro de caixas pela região. A #3304
> sincroniza o overlay ao relógio do vídeo. A #3305 torna permanentes o restart condicional do MediaMTX
> e as URLs internas dos serviços. A #3306 aplica os quatro defaults prometidos pelo ms-simulation. As
> quatro estão abertas contra `develop`, sem comentários pendentes e com Lint, Build e Integration Test
> verdes; a #3305 também passou no validate do compose.
>
> O P4 do embarcado não foi reproduzido. A câmera compartilhada `10.11.20.101` apontava para
> `vitoria.attlas.atmansystems.com:9094`, com `source_id` nulo e sem regiões. O producer foi reativado,
> mas o tópico externo não entregou mensagem na janela observada. Ela continua ausente do banco do 26 e
> nenhuma geometria, identidade ou configuração de broker foi alterada, para não disputar o device com
> o Attlas 25. Sem região e sem `source_id`, uma ponte Kafka não produziria fluxo utilizável.
>
> A configuração embarcada já existente da `ATMN - DEMO`, em
> `#/cameras/devices/00000000-0000-4000-8000-000000000010`, fica como referência de reuso para o
> estilo do laço, as caixas e as regras da tela de Detecção.

> [!success] Estado após merge e deploy
> As #3297 e #3300 foram mergeadas na `develop`. O deploy #41 (`34665519410`) terminou com sucesso.
> O EC2 mantém `ms-video-analytics` saudável com 2 alvos, 2 ingestões e 2 produtores. A ponte
> `attlas-analytics-kafka-bridge` está ativa no override persistente e replica o tópico do broker externo.
> A câmera `10.11.20.101` foi cadastrada como `ATMN - EMBEDDED 101`, AXIS P1475-LE, no tenant atman,
> com analítico `ATSPM` embarcado, identidade `E827251A4173`, três perfis RTSP e uma região de
> aproximação central. O consumer do `ms-cameras` apresenta offsets avançando no tópico bridged.

## Estado final do ambiente

| Peça | Estado em 11/09 à noite |
| --- | --- |
| Imagens | `:dev` do merge da #3066 (`65e7633ce3`), deploy `workflow_dispatch` run `34656455736` |
| `CameraAnalytic` `...5001` | `ATMN – DEMO`, `VIRTUAL_LOOP`, `SERVER`, região `Via - fluxo` (`5422011e…`, 4 vértices em %) |
| `CameraAnalytic` `...5008` | `ATM-PTZ` (`7f3a5cf8…`), `ATSPM`, `SERVER`, região `Aproximacao norte` (`589995e0…`) |
| `VirtualLoopDetectorBinding` | `cff91df1…` região DEMO -> Quito 2 índice 22; `cb17f705…` região PTZ -> Quito 2 índice 23; ambos `VEHICLE` |
| Controlador | `f722dd6f-627a-48bf-a02f-16aada2fbe48`, UNE, `detectorRawEnabled` e `detectorCounterEnabled`, físicos nos índices 1 a 21, teto UNE 48 |
| `Camera` `...011` (`ATMN – PTZ`) | soft delete (`deletedAt`), era duplicata da PTZ num tenant `6ecb354a…` que não existe mais na organização |
| MinIO | `attlas-video-analytics/models/vehicle-detection.onnx`, 12.836.352 bytes, metadados `model-version=v1` e `model-sha256=adda0231…` |
| mediamtx | paths `analytic-…010` e `analytic-7f3a5cf8…` prontos, `sourceOnDemand: false`, `rtspTransport: automatic`, 1 leitor cada (o ffmpeg do analítico) |
| `.env.docker` do ms-cameras | ganhou `MS_VIDEO_ANALYTICS_INTERNAL_URL=http://ms-video-analytics:3000` (backup `.env.docker.bak-20260911-analytics-url`) |
| `.env.docker` do ms-simulation | ganhou as quatro `SIMULATION_*` de limite (backup `.env.docker.bak-20260911-deploy`) |
| Ponte embarcada | `attlas-analytics-kafka-bridge` replica `traffic-motion-detection.detections` de `vitoria.attlas.atmansystems.com:9094` para `kafka:29092`, backup `docker-compose.override.yml.bak-20260911-before-embedded-bridge` |
| Câmera embarcada `...0101` | `ATMN - EMBEDDED 101`, AXIS P1475-LE, `ATSPM`, `EMBEDDED`, `deviceSourceId=E827251A4173`, região `...6101` |
| `/health/ready` do analítico | `targets 2, ingesting 2, producing 2`, modelo carregado, `2 held here` |

Os dois SQL aplicados estão na raiz do repo, não versionados: `ec2-analytics-config.sql` (analíticos e
regiões) e `ec2-analytics-bindings.sql` (PTZ do atman, soft delete da órfã, vínculos).

## A sequência de achados, na ordem em que mascararam uns aos outros

Cada item tem sintoma, causa, o que foi feito no box e o que fica de conserto durável.

1. **Smoke test do deploy falhou no `ms-simulation`.** `validateEnv` recusou o boot por quatro variáveis
   ausentes (`SIMULATION_METRICS_RESPONSE_MAX_MB`, `SIMULATION_DRILLDOWN_PAGE_MAX`,
   `SIMULATION_CHARTS_MAX_METRIC_KEYS`, `SIMULATION_CHARTS_MAX_POINTS_PER_METRIC`), que entraram em
   07/09 pelas PRs de leitura de resultado. O `.env.docker` do host não é sincronizado pelo deploy
   ([[.env.docker do EC2 defasa e crasha ms|memória]]). Feito: variáveis acrescentadas no host e
   recreate. Fica: os comentários do `environment.ts` prometem "Default 64/5000/26/5000" e a classe
   exige a variável; a classe devia ter o default (#3306 abaixo).
2. **Modelo de detecção ausente no MinIO.** `ModelLoaderService` exige o objeto
   `models/vehicle-detection.onnx` com os metadados `model-version` (igual a
   `VIRTUAL_LOOP_MODEL_VERSION`) e `model-sha256`. Sem metadados o serviço loga "carries no
   model-version label" e não carrega. Feito: `scp` do peso de `~/attlas-models/` e upload com
   `quay.io/minio/mc` usando `--attr`. Fica: nada de código; entra no runbook.
3. **Frota vazia.** As oito analíticas do banco tinham zero regiões e a DEMO estava `EMBEDDED`, por
   isso a tela dizia "laço não configurável": `listTargets` só devolve analítico com região válida e
   `ingest` só com `SERVER`. Feito: `ec2-analytics-config.sql`. Fica: nada de código.
4. **mediamtx rodando configuração de agosto.** O container estava de pé desde 18/08 com o
   `docker/mediamtx.yml` anterior, sem o `read` anônimo em `~^analytic-`; o ffmpeg do analítico
   recebia `401`. O deploy faz scp do yml (o `tar -xzf` troca o inode do arquivo, e o bind mount do
   container continua no inode antigo) e só reinicia o Kong. Feito: `docker compose restart mediamtx`.
   Fica: o deploy precisa reiniciar o mediamtx quando o yml muda (#3305).
5. **Restart do mediamtx apagou os paths `analytic-*`.** Eles são criados por API, não pelo yml, e o
   `VirtualLoopPathReconciler` do ms-cameras guarda em memória (`owned`) quais já abriu, então nunca
   os recria: o ffmpeg passou de `401` para `404` para sempre. Feito: `docker compose restart
   ms-cameras`. Fica: o reconciliador tem de conferir a existência do path a cada ciclo (#3303). É o
   bug mais grave do dia, porque derruba a detecção inteira em silêncio a cada restart do mediamtx.
6. **Ocupação descartada por falta de vínculo.** Com o stream de pé, o analítico logava `occupancy
   discarded: … has no VEHICLE detector binding` e nada chegava ao histórico, enquanto as caixas
   continuavam saindo (o que engana). A tabela `VirtualLoopDetectorBinding` estava vazia. Feito:
   vínculos das duas regiões com o único controlador vivo do tenant atman, nos índices 22 e 23 (os
   físicos vão de 1 a 21, a UNE aceita 48). Os vínculos viajam no payload de
   `/api/internal/virtual-loop/sources`, então não precisou de restart. Fica: nada de código; a escolha
   do índice é manual até a `UF-052` (laço por região escolhido no Modelo de Tráfego).
7. **A PTZ existia duas vezes.** `ATMN – PTZ` (`...011`, id do seed, criada em 31/08) estava num tenant
   que não existe mais na organização, e `ATM-PTZ` (`7f3a5cf8…`) no tenant atman com perfis
   PRIMARY/SECONDARY, credencial e dois presets. O índice único `(systemId, ipAddress)` impede mover a
   linha. Feito: analítico `...5008` apontado para a `ATM-PTZ`, órfã com `deletedAt`. Fica: nada de
   código; regra de runbook: conferir `Camera.systemId` e `SystemMember` antes de configurar pelo id do
   seed.
8. **Tela dizia Offline com tudo funcionando.** O ms-cameras não tinha `MS_VIDEO_ANALYTICS_INTERNAL_URL`;
   sem ela o `AnalyticInstancesService` devolve `NOT_CONFIGURED`, e a aba Detecção só conhece
   online/degradado/offline, então pinta Offline. O compose pina outras URLs internas no bloco
   `environment:` do ms-cameras, essa não. Feito: variável no `.env.docker` do host e recreate. Fica:
   pinar no compose (#3305) e, opcional, a tela distinguir "não configurado" de "offline".
9. **Modo edição em SERVER funciona.** `PUT /api/cameras/:id/object-detection-regions` resolve o
   `serverAnalyticId` antes de cair no caminho embarcado, e a tela abriu o quadro congelado com os
   quatro vértices, a paleta e o seletor de faixa. Conferido e descartado sem salvar.

Ruído observado e não bloqueante: `FU-A`/perda de RTP nos paths `analytic-*`, e dois `stream_ended`
do ffmpeg do analítico durante o recreate do ms-cameras (a câmera recebeu conexões extras do boot do
serviço). Relacionado ao desenho em [[Carga desnecessária nas câmeras - reconciler do analítico e conexões duplicadas]].

## Pedidos adicionais do user em 11/09 à noite, já escopados

Dois problemas que a tela mostrou depois da cadeia ficar de pé, e que o user quer no mesmo pacote de correção:

1. **O overlay não acompanha o vídeo.** A caixa "car" aparece adiantada em relação ao carro: o vídeo da
   Detecção chega por WebRTC quando alcança e por HLS como fallback (segundos de latência no EC2, mediamtx
   com sete segmentos), e a caixa chega em menos de um segundo do quadro. O overlay
   (`camera-analytics-overlay.component.ts`) interpola entre amostras e só compensa o jitter entre chegadas
   de caixa; nada o amarra ao instante do vídeo em exibição. Conserto: o player publica um relógio do vídeo
   (`hls.playingDate` no HLS, `estimatedPlayoutTimestamp` no WebRTC) e o overlay usa esse relógio como cabeça
   da interpolação. O conserto está na **#3304** (`[Front]`, mesmo card `SOFTWARE-2200`).
2. **Caixa fora da região desenhada.** No servidor, o `FramePublisher` publica de propósito a caixa que não
   toca região nenhuma, com o índice da primeira região; a inferência roda no quadro inteiro quando o recorte
   das regiões cobre 90% ou mais dele, e é o caso da DEMO. Decisão do user: caixa fora de toda região não
   viaja. No embarcado o contrato já é por região (`regions[]`, `labels[i]`, `bboxes[i]` por região), então ou
   o app da câmera atribui à região o que detecta no quadro inteiro, ou a geometria enviada não é a do banco;
   precisa reproduzir local, o EC2 não tem câmera embarcada funcional. O caminho servidor entra na **#3303**;
   o embarcado permanece sem reprodução.

3. **Câmera embarcada `10.11.20.101` no 26, compartilhada com o Attlas 25.** É a câmera que o user indicou
   para testar o embarcado (ACAP `atman_traffic_edge_atspm`, publica no Kafka). A leitura final mostrou o
   broker `vitoria.attlas.atmansystems.com:9094`, `source_id` nulo e zero regiões. O producer estava
   desabilitado e foi reativado, mas nenhuma mensagem chegou na janela observada. Sem identidade e geometria,
   o 26 não consegue vincular ou desenhar as caixas; espelhar o tópico vazio não resolveria. A câmera segue
   fora do banco do 26 e nada foi alterado em identidade, regiões ou broker, preservando o Attlas 25.

## Bugs de código confirmados, e para onde vai cada um

| # | Bug | Onde | Destino |
| --- | --- | --- | --- |
| B1 | Reconciliador confia no `owned` em memória e não recria path apagado pelo mediamtx | `apps/ms-cameras/src/analytics-ingestion/virtual-loop-path.reconciler.ts` (`pass`, linha do `if (this.owned.has(cameraId)) continue;`) | **#3303**, `SOFTWARE-2200` |
| B2 | Path do analítico puxa a câmera com `rtspTransport: automatic` (UDP), com perda de RTP visível | mesmo arquivo, `applyPathConfig`; tipo `IMediamtxPathConfig` em `apps/ms-cameras/src/streaming/types/mediamtx-api.types.ts` | **#3303** |
| B3 | Deploy sincroniza `docker/mediamtx.yml` e só reinicia o Kong | `.github/workflows/deploy.yml`, script `attlas-deploy.sh` (`docker compose restart kong`) | **#3305**, sem card |
| B4 | Compose não pina `MS_VIDEO_ANALYTICS_INTERNAL_URL` no ms-cameras (as outras URLs internas são pinadas) | `docker-compose.yml`, bloco `environment:` do `ms-cameras` | **#3305** |
| B5 | Quatro limites do ms-simulation documentados com default e exigidos pela validação | `apps/ms-simulation/src/config/environment.ts` (linhas 245 a 283), `result-read-limits.config.ts`, `result-ingestion-limits.config.ts` | **#3306**, sem card |
| B6 | Caixa fora de toda região viaja com o índice da primeira região; user quer só o que está dentro | `apps/ms-video-analytics/src/detection/frame-publisher.service.ts` (`toBoxes`, `fallbackIndex`); embarcado a investigar em `apps/ms-cameras/src/analytics-realtime/device-stream.consumer.ts` | **#3303** |
| B7 | Overlay de caixas não segue o instante do vídeo em exibição (só compensa jitter entre chegadas) | `apps/web-attlas/src/app/modules/cameras/components/camera-analytics-overlay/camera-analytics-overlay.component.ts`, `camera-analytics-store.service.ts`, `analytics-detection/pages/detection/detection.page.ts` | **#3304**, `SOFTWARE-2200` |

Ordem de merge: **#3303, depois #3304, depois #3305, depois #3306**. A #3305 faz o deploy reiniciar o mediamtx, e sem a #3303 isso
derrubaria a detecção até alguém reiniciar o ms-cameras.

## Verificado e não é bug (não gastar tempo)

- `upsertEmbedded` cria linha `EMBEDDED` mesmo com uma `SERVER` do mesmo tipo: é o que o `MOD-017`
  seção 4.2 declara (unicidade parcial, `SERVER` isento). A memória de 11/09 de manhã tratava isso como
  consequência a resolver; não é.
- `preset-region-sync.service.ts` e `list-preset-regions.handler.ts` usam `findEmbeddedByCameraAndType`
  de propósito: sincronizam a geometria do app embarcado. O caminho SERVER grava por
  `camera-regions.controller.ts` (`serverAnalyticId` -> `replaceAll`).
- `CameraRegistryService` do analítico mantém a última lista quando o fetch do ms-cameras falha; só
  avisa. Não há teardown por piscada.
- `FramePublisher` só publica quando há caixa (e uma vez na borda de esvaziar). A PTZ olhando o
  escritório à noite não gera mensagem, e isso está certo.
- Usuário Master cai em `#/organizations` e as rotas de módulo redirecionam até existir sistema ativo
  (`sessionStorage.selectedSystem`). Comportamento desenhado, não defeito.

## Débitos que ficam declarados, sem PR agora

- O path `analytic-*` abre uma **segunda** sessão RTSP na câmera em vez de ler o relay que o ms-cameras
  já publica (`<cameraId>-secondary`). Mesmo assunto de
  [[Carga desnecessária nas câmeras - reconciler do analítico e conexões duplicadas]].
- `.env.docker` por serviço no host não é sincronizado pelo deploy; toda env nova obrigatória repete o
  item 1. O conserto durável é o padrão da #912 (pinar no compose) para o que é URL interna, e default
  em código para o que é limite.
- A aba Detecção pinta `NOT_CONFIGURED` como Offline. Pequeno, front, sem card.
- Índice de detector do vínculo escolhido à mão (22 e 23). A `UF-052` (mergeada como spec em #3195)
  troca isso pela faixa do Modelo de Tráfego; até lá é configuração de operador.
- Passo 5 do plano de teste do `SOFTWARE-2200` (presença contínua além do timeout gerando
  `attlas.detectors.fault`) não foi executado.

## Fora do código

- Cards que fecham no ClickUp (PR mergeada): `SOFTWARE-3051` (86akffm6d), `3052` (86akffm9z), `3053`
  (86akffme4), `3054` (86akffmkh), `3055` (86akffmpw), `3056` (86akffmt8), `3057` (86akfgfvq).
  `SOFTWARE-2686` (86ak5e32x) segue aberto: as specs mergearam, a implementação não começou.
  `SOFTWARE-2200` (86ajj1xv4) vai para `in progress` com as #3303 e #3304. Fechamento é decisão do user; o sync
  Obsidian -> ClickUp não fecha card.
- PRs anteriores mergeadas: #3297 (runbook da MinIO) e #3300 (links da referência removida nas specs de
  Detecção). Permanecem abertas #3303, #3304, #3305 e #3306, todas com CI verde e aguardando review.
- O handoff transitório foi consumido e removido; este registro, a sprint, o card e o report diário são
  a fonte permanente do fechamento.

## Como conferir de novo

```bash
ssh aws-attlas-26 'cd ~ && docker compose exec -T ms-cameras sh -c "wget -qO- http://mediamtx:9997/v3/paths/list" | python3 -c "import json,sys; [print(i[\"name\"], i[\"ready\"], len(i[\"readers\"])) for i in json.load(sys.stdin)[\"items\"] if i[\"name\"].startswith(\"analytic-\")]"'
ssh aws-attlas-26 'cd ~ && docker compose exec -T ms-cameras sh -c "wget -qO- http://ms-video-analytics:3000/health/ready" | head -c 400'
ssh aws-attlas-26 'cd ~ && docker compose logs --since 2m ms-video-analytics | grep -c "occupancy discarded"'   # tem de ser 0
ssh aws-attlas-26 'cd ~ && docker exec attlas-kafka sh -c "timeout 25 kafka-console-consumer --bootstrap-server localhost:9092 --topic attlas.virtual-loop.frame-detections --max-messages 1 --timeout-ms 20000"'
ssh aws-attlas-26 'cd ~ && docker compose exec -T db-detector-history psql -U detector_history_user -d attlas_detector_history -Atc "select m.index, count(d.*), max(d.\"sampledAt\") from meta_detector m left join detection_record d on d.\"detectorId\"=m.id where m.\"controllerId\"='"'"'f722dd6f-627a-48bf-a02f-16aada2fbe48'"'"' and m.index in (22,23) group by 1;"'
```

Tela: `https://dev.v2.attlas.atmansystems.com/#/analytics/detection/00000000-0000-4000-8000-000000000010`
(login salvo no perfil do Playwright é o Master; com Master, gravar
`sessionStorage.selectedSystem = '6c277280-b369-49a5-bbb9-72a5d5fcf789'` e recarregar).

## Relacionados

[[Analítico]] · [[Analítico - O que falta para fechar o módulo]] · [[Attlas - Sprint 32]] ·
[[SOFTWARE-2200 - Prova de campo do analítico em container]] ·
[[Registro - movimentação da develop em 05 e 07 de setembro]] ·
[[Carga desnecessária nas câmeras - reconciler do analítico e conexões duplicadas]]
