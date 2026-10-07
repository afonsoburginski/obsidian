---
tags:
  - doc
  - analitico
  - runbook
aliases:
  - "Runbook - analítico embarcado"
atualizado: 2026-10-07
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
| O app está processando e com quais regiões? | [[#Como sei se o app está processando]] |
| O `source_id` do aparelho bate com o do Attlas? | [[#Como confiro a identidade e o destino do app]] |
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
| ATMN - DEMO | 10.1.1.78, ARTPEC 7 | `atman_traffic_edge_sdct`, só ele, com a API na 2002. Laço sem caixa e sem incidente |
| ATMN - EMBEDDED 080 | 10.1.1.80 | `atman_traffic_edge_atspm` 0.10.2 e `atman_virtual_loop_analytic` ao mesmo tempo |
| ATMN - PTZ | 10.1.1.79 | Só o app de laço por TCP |
| Placa ACOM | 10.1.1.146 | Firmware `A12B31`, gestão na 81, sinal na 82 |

No dev.v2 o mesmo equipamento pode estar cadastrado como câmeras de Sistemas diferentes, e cada Sistema ganha as
próprias linhas de incidente.

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
