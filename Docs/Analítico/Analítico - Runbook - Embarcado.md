---
tags:
  - doc
  - analitico
  - runbook
aliases:
  - "Runbook - analítico embarcado"
atualizado: 2026-10-20
---

# Analítico - Runbook - Embarcado

Volta para [[Analítico]].

## Resumo

Como conferir e reprovisionar o app da Atman dentro da câmera Axis. Conferir o equipamento vem antes de concluir que
o defeito é do Attlas. Builds, portas e rotas estão em [[Analítico - Arquitetura e estratégias#Builds do app embarcado]];
comandos gerais de container e banco, em [[Infraestrutura - Runbook - Comandos]]. Credenciais das câmeras não ficam
aqui.

| Pergunta | Seção |
| --- | --- |
| Que equipamentos de bancada existem? | [[#Que equipamentos de bancada existem]] |
| Qual app está rodando na câmera? | [[#Como sei qual app está rodando na câmera]] |
| O producer está ligado? | [[#Como sei se o producer está ligado]] |
| O broker/bridge está duplicando mensagens? | [[#Como diagnostico loop no bridge Kafka]] |
| O app está processando e com quais regiões? | [[#Como sei se o app está processando]] |
| O `source_id` do aparelho bate com o do Attlas? | [[#Como confiro a identidade e o destino do app]] |
| "Testar" respondeu, mas não consigo cadastrar? | [[#Como diferencio câmera alcançável de publisher Kafka cadastrável]] |
| O vínculo deu 422, 409 ou "não respondeu"? | [[#Como o vínculo escolhe o tipo e por que falha]] |
| Onde está o log do app? | [[#Como leio o log do app]] |
| Como reprovisiono depois de atualizar firmware ou app? | [[#Como reprovisiono depois de atualizar firmware ou app]] |
| Como acho a mídia de um incidente no equipamento? | [[#Como acho a mídia de um incidente no equipamento]] |
| O que significa cada sintoma comum? | [[#O que significa cada sintoma comum]] |
| Como preparo o ambiente local? | [[#Como preparo o ambiente local]] |

Nos comandos, `<base>` é `http://<ip>/local/atman_traffic_edge_atspm/api` no app ATSPM (pela porta 80 da Axis, com
Digest) e `http://<ip>:2002/horus/traffic-edge-sdct` no SDCT (sem autenticação; tirar o `--digest -u` do comando).
A credencial da câmera vai em `$CAM_USER` e `$CAM_PASS`.

## Que equipamentos de bancada existem

| Equipamento | Endereço | O que roda |
| --- | --- | --- |
| ATMN - DEMO | 10.1.1.78, M1135 Mk II, `hardwareId` 950.1 = ARTPEC 7 | `atman_traffic_analytics` (API em `/local/atman_traffic_analytics/api`). Antes rodava só o `atman_traffic_edge_sdct` na 2002 |
| ATMN - EMBEDDED 080 | 10.1.1.80, ARTPEC 8/9 | `atman_traffic_analytics` (API em `/local/atman_traffic_analytics/api`) e `atman_virtual_loop_analytic` |
| ATMN - VIX Analytic | 10.11.20.101, ARTPEC 8/9 | `atman_traffic_edge_atspm` (API em `/local/atman_traffic_edge_atspm/api`) |
| ATMN - PTZ | 10.1.1.79 | Só o app de laço por TCP |
| Placa ACOM | 10.1.1.146 | Firmware `A12B31`, gestão na 81, sinal na 82 |

No dev.v2 o mesmo equipamento pode estar cadastrado como câmeras de Sistemas diferentes, e cada Sistema ganha as
próprias linhas de incidente. Em 2026-10-20, 10.1.1.78 e 10.1.1.80 estavam cadastradas nos Sistemas atman,
Orquestração, Visão e Vídeo e DMQ (a 78 também como "Atman Externa"). Só um deles pode receber os quadros: o
aparelho publica com um `source_id` só, então vincular num Sistema é tomar o equipamento dos outros.

## Como sei qual app está rodando na câmera

```bash
curl --digest -u "$CAM_USER:$CAM_PASS" "http://<ip>/axis-cgi/applications/list.cgi"
```

A resposta lista cada app instalado com `Name` e `Status`. O app com `Status="Running"` é o que o Attlas vai sondar;
o nome dele diz o build (`atman_traffic_edge_atspm`, `atman_traffic_edge_sdct` ou `atman_virtual_loop_analytic`).
App que o catálogo de builds não conhece deixa a câmera como "Não monitorado".

## Como sei se o producer está ligado

```bash
curl --digest -u "$CAM_USER:$CAM_PASS" "<base>/producer"
curl --digest -u "$CAM_USER:$CAM_PASS" -X POST "<base>/producer?enable=true"
```

O primeiro comando diz se o producer está ligado. Desligado, nenhum quadro chega ao Attlas; o segundo comando o
religa. Só a instalação dona do equipamento (`ANALYTICS_OWNED_DEVICE_SOURCE_IDS`) religa o producer sozinha quando a
fonte fica muda; nas outras, religar é por este comando ou pelo Vincular.

## Como sei se o app está processando

```bash
curl --digest -u "$CAM_USER:$CAM_PASS" "<base>/status"
curl --digest -u "$CAM_USER:$CAM_PASS" "<base>/regions"
```

O `/status` traz `regions_count`, e no SDCT também `producer_connected` e `frames_processed`. O `/regions` lista as
regiões na ordem estável que o Attlas usa como índice; região com id novo e sem nome indica equipamento resetado.

## Como confiro a identidade e o destino do app

```bash
curl --digest -u "$CAM_USER:$CAM_PASS" "<base>/config"
docker exec -it attlas-db-cameras psql -U cameras_user -d attlas_cameras -c \
  "SELECT \"cameraId\", \"type\", \"deviceSourceId\", \"deviceAdapterId\" FROM \"CameraAnalytic\" WHERE \"cameraId\" = '<camera-id>' AND \"deletedAt\" IS NULL;"
```

O `/config` traz `source_id`, `analytic_id`, `kafka_broker_ip`, `kafka_broker_port`, `kafka_topic` e os campos
`acom_*`. O `source_id` tem de ser igual ao `deviceSourceId` do banco, e o broker tem de ser um que o Attlas consome
(`ANALYTICS_STREAM_BROKERS`). Se o `source_id` diverge, o Vincular regrava no aparelho o que o Attlas espera.

## Como leio o log do app

```bash
curl --digest -u "$CAM_USER:$CAM_PASS" "http://<ip>/axis-cgi/systemlog.cgi"
```

O log do sistema da câmera traz as linhas do app, inclusive erro de publicação no broker. Root por SSH é recusado,
então esta é a forma de ler o log.

## Como diagnostico loop no bridge Kafka

Em 2026-10-20, a investigação do incidente de Quito identificou um loop no serviço legado
`attlas-analytics-kafka-bridge`: ele consumia `traffic-motion-detection.detections` e republicava no mesmo tópico e
broker (`atlas.epmmop.gob.ec:9094`). Cada republicação virava nova entrada do próprio consumer, causando crescimento
exponencial. O processo não é um serviço oficial do Attlas; era um resíduo do ambiente de desenvolvimento AWS. O guia
de deploy já alertava para removê-lo quando o destino não deveria consumir o broker de origem.

O broker de publicação das câmeras e o broker de consumo do serviço são papéis diferentes. Configure
`ANALYTICS_DEVICE_PUBLISH_BROKER` com o DNS alcançável pelas câmeras em cada implantação (por exemplo, dev AWS ou
Quito) e `ANALYTICS_STREAM_BROKERS` com o broker que o Attlas deve consumir. DNS é configuração do deployment, não um
valor global inferido pelo backend. Nunca configure um bridge para republicar no mesmo tópico do mesmo broker.

Na investigação, confira o `kafka_broker_ip` e `kafka_broker_port` retornados por `/config`, os brokers/tópicos de
origem e destino do bridge e os logs/volume do consumer. Se origem e destino coincidirem, pare o bridge legado antes
de retomar a publicação. Em sistemas compartilhados, não faça takeover nem reinicie a câmera sem confirmação explícita
do operador responsável.

O PR #8286 (merge commit `f08e39d`, 2026-10-20) adiciona reparo explícito do vínculo do device e estados transitórios
na tabela; não é um solucionador universal de DNS ou infraestrutura. Correções de DNS, disponibilidade de Kafka e
bridges continuam dependendo da configuração e operação do ambiente. Validações locais finais passaram; o CI remoto
estava na fila de runners no momento do merge.

## Como diferencio câmera alcançável de publisher Kafka cadastrável

O botão **Testar** confirma que a rota de descoberta responde naquele momento. Isso não valida que o processo esteja
publicando no Kafka consumido pelo Attlas, nem cria vínculo de instância. São sinais diferentes: reachability HTTP,
identidade `source_id`/broker e chegada recente de eventos precisam ser verificados separadamente.

Só a geração Horus/standalone de verdade (API de status/regiões sem identidade Kafka) é não cadastrável:
`422 DEVICE_ANALYTIC_NOT_CONFIGURABLE`. `502 DEVICE_ANALYTIC_UNREACHABLE` fica para o aparelho sem resposta. Antes de
concluir que o app é Horus, confira se o serviço está sondando o caminho certo (seção abaixo): em 2026-10-20 o 422 da
78 e da 80 era isso, não o app.

## Como o vínculo escolhe o tipo e por que falha

Estado depois da PR #8450 (merge `05dda00`, no dev.v2 desde 2026-10-20 18:24 UTC).

- **Caminhos sondados.** O serviço testa cada caminho de `ATMAN_ANALYTIC_API_PATHS`, em ordem. O padrão do código é
  `/local/atman_traffic_analytics/api,/local/atman_traffic_edge_atspm/api`. No dev.v2 a variável vem do secret
  `ms-video-analytics-env`, aplicado à mão com `kubectl` e fora do GitOps; estava só com o caminho antigo e fazia a
  78 e a 80 (app novo) caírem num caminho de relatório, com 422. Corrigido em 2026-10-20, com backup em
  `~/backups/ms-video-analytics-env.secret.bak-20261020-172407.yaml` no host. Para conferir:
  `docker exec attlas-control-plane kubectl -n attlas-dev exec deploy/ms-video-analytics -- printenv ATMAN_ANALYTIC_API_PATHS`.
- **Tipo gravado.** É o primeiro tipo que o build sondado serve e que a arquitetura da câmera aceita. O app
  `atman_traffic_analytics` serve ATSPM e laço: em ARTPEC 8/9 grava ATSPM; em ARTPEC 7, que não aceita ATSPM
  embarcado, grava laço virtual. Só recusa (409 de compatibilidade) se nenhum tipo servido couber.
- **Arquitetura ausente.** Se o espelho da câmera não tem `artpecArchitecture`, o vínculo usa a tabela por
  `hardwareId` (`@attlas/contracts`, a mesma do `ms-cameras`), sem gravar de volta. Câmera fora da tabela continua
  recusada até o `ms-cameras` reprovisionar; não existe endpoint de reidentificação.
- **ARTPEC 8/9 com laço legado.** ATSPM e laço embarcados não coexistem (BR-CAV-003). O vínculo promove a linha do
  laço para ATSPM no lugar (mesmo id, regiões e vínculos de faixa/detector preservados) ou desativa a sobra quando já
  havia duas; tudo numa transação com trava por câmera.
- **Reinício do app.** O vínculo só reinicia o app da câmera quando a API não responde. Antes da #8450, qualquer erro
  de leitura (inclusive o 422) mandava `control.cgi?action=restart` e o card ficava em "O analítico embarcado desta
  câmera não respondeu" durante o reinício. Hoje, app parado numa câmera que responde volta 422 e precisa ser iniciado
  na câmera.
- **409 de tomada.** Se o aparelho publica com o `source_id` de outro Sistema, o vínculo pede confirmação; confirmar
  tira os quadros do outro Sistema.

Em 2026-10-20, no Sistema atman, a 10.11.20.101 já estava vinculada (ATSPM, `atspm-http`); a 78 e a 80 ficaram para
vincular pela tela depois do deploy.

## Como reprovisiono depois de atualizar firmware ou app

A atualização não preserva configuração: o app volta com `source_id` novo ou nulo, broker em `localhost:9092`,
producer desligado e a região resetada (id novo, sem nome, classes de fábrica). Durante a atualização a API responde
503.

1. **Vincular** no cartão do equipamento, na página da instância (Analítico, aba Instâncias): repõe `source_id`,
   broker e producer, e relê.
2. **Salvar a região na Detecção**: reenvia a geometria e a configuração guardadas no Attlas.
3. Se o equipamento tiver destino ACOM, a próxima escrita da placa no módulo Controladores o regrava.

Depois, conferir com [[#Como confiro a identidade e o destino do app]].

## Como acho a mídia de um incidente no equipamento

```bash
curl --digest -u "$CAM_USER:$CAM_PASS" -X POST -H 'Content-Type: application/json' \
  -d '{"start_timestamp": <inicio-epoch-s>, "end_timestamp": <fim-epoch-s>}' "<base>/incidents"
curl --digest -u "$CAM_USER:$CAM_PASS" -o incidente.jpg "<base>/output/incidents/screenshots/<source-id>/<arquivo>"
curl --digest -u "$CAM_USER:$CAM_PASS" "http://<ip>/axis-cgi/record/list.cgi?recordingid=all"
curl --digest -u "$CAM_USER:$CAM_PASS" -o incidente.mp4 \
  "http://<ip>/axis-cgi/record/export/exportrecording.cgi?schemaversion=1&recordingid=<recording-id>&diskid=<disco>&exportformat=mp4"
```

O `POST /incidents` lista os incidentes da janela (filtra por região, não por tipo) com `screenshot_path`; a imagem é
do app ATSPM, em JPEG 640x360, com cerca de 64 KB. O vídeo é a gravação da câmera no cartão SD, cerca de 23 s por
incidente, exportado em MP4 1080p30 sem `Range`, em cerca de 9 s. O `recording_id` do app vem nulo, e o Attlas acha a
gravação pelo horário. O SD limpa em 7 dias.

## O que significa cada sintoma comum

| Sintoma | Causa provável |
| --- | --- |
| "Não monitorado" | O equipamento não está vinculado, ou roda um app que o catálogo de builds não conhece |
| Região não acende com carro passando | Producer desligado, `source_id` do aparelho diferente do guardado, ou o Kafka do equipamento fora. O diagnóstico do stream na Detecção diz qual |
| Vincular responde 409 | O aparelho publica com a identidade de outra instalação; confirmar a tomada ou desvincular na outra |
| Caixas não aparecem | O build não entrega caixa (SDCT, laço por TCP); é esperado |
| Região acende cerca de 2 s depois do carro | O SDCT publica em lotes; de 1,45 s a 2,2 s ficam dentro da câmera |
| Câmera vinculada não aparece no ao vivo | O mapa de vínculo do consumidor se refaz a cada 30 s; esperar meio minuto |

## Como preparo o ambiente local

```bash
grep -E '^(SEED_ATMAN_EMBEDDED_SOURCE_ID|ANALYTICS_STREAM_BROKERS|ATMAN_ANALYTIC_API_PATHS?)=' apps/ms-cameras/.env
npx nx daemon --stop
```

- O seed avisa quando `SEED_ATMAN_EMBEDDED_SOURCE_ID` está vazia; preencher com o `source_id` do `/config` do
  aparelho.
- O stack local consome o mesmo broker do dev.v2, então vincular localmente toma o aparelho (`confirmTakeover`) e o
  tira do dev.v2.
- Um `ATMAN_ANALYTIC_API_PATH` antigo no `.env` local, sem `ATMAN_ANALYTIC_API_PATHS`, vence o padrão do código e faz
  a sondagem responder 404.
- O daemon do NX guarda o ambiente antigo: depois de mudar o `.env` do `ms-cameras`, parar o daemon com o segundo
  comando antes de subir o serviço de novo.

## Glossário

| Termo | O que é |
| --- | --- |
| Producer | O publicador Kafka dentro do app; desligado, nenhum quadro sai |
| `source_id` | Identidade que o app grava em cada quadro e que o Attlas usa para achar a câmera |
| Digest | Autenticação HTTP por desafio que a Axis exige na porta 80 |
| VAPIX | A API HTTP das câmeras Axis (`/axis-cgi/...`) |
| Instalação dona | O deployment do Attlas listado em `ANALYTICS_OWNED_DEVICE_SOURCE_IDS` para aquele equipamento |
