---
tags:
  - doc
  - analitico
  - runbook
atualizado: 2026-10-01
---

# Runbook - analítico embarcado

Como conferir e reprovisionar o app da Atman dentro da câmera Axis. Builds, portas e rotas estão em
[[Analítico - Arquitetura e estratégias#Builds do app embarcado]]. Credenciais das câmeras não ficam
aqui.

## Bancada

| Equipamento | Endereço | O que roda |
| --- | --- | --- |
| ATMN - DEMO | 10.1.1.78, ARTPEC 7 | `atman_traffic_edge_sdct` (só ele), API na 2002. Laço sem caixa e sem incidente |
| ATMN - EMBEDDED 080 | 10.1.1.80 | `atman_traffic_edge_atspm` 0.10.2 e `atman_virtual_loop_analytic` ao mesmo tempo |
| ATMN - PTZ | 10.1.1.79 | Só o app de laço por TCP |
| Placa ACOM | 10.1.1.146 | Firmware `A12B31`, gestão na 81, sinal na 82 |

No dev.v2 o mesmo equipamento pode estar cadastrado como câmeras de Sistemas diferentes; cada
Sistema ganha as próprias linhas de incidente.

## Conferir um equipamento, nesta ordem

1. **Apps instalados**: `GET /axis-cgi/applications/list.cgi` com Digest. Diz qual build está em
   `Running`.
2. **Producer**: `GET <base>/producer`. Desligado, nenhum quadro chega; `POST <base>/producer?enable=true`
   religa.
3. **Status**: `GET <base>/status` (`regions_count`; no SDCT também `producer_connected` e
   `frames_processed`).
4. **Regiões**: `GET <base>/regions`.
5. **Identidade e destino**: `GET <base>/config` (`source_id`, `analytic_id`, `kafka_broker_ip`,
   `kafka_broker_port`, `kafka_topic`, `acom_*`). O `source_id` tem de ser o que o Attlas guarda no
   `deviceSourceId`.

`<base>` é `/local/atman_traffic_edge_atspm/api` pela 80 da Axis no ATSPM, e
`http://<ip>:2002/horus/traffic-edge-sdct` no SDCT. Root por SSH é recusado; o log do app sai em
`GET /axis-cgi/systemlog.cgi`, inclusive erro de publicação no broker.

Só depois disso concluir que o defeito é do Attlas.

## Depois de atualizar firmware ou app

A atualização não preserva configuração: o app volta com `source_id` novo ou nulo, broker em
`localhost:9092`, producer desligado e a região resetada (id novo, sem nome, classes de fábrica). Durante
a atualização a API responde 503.

1. **Vincular** no cartão do equipamento, na página da instância: repõe `source_id`, broker e
   producer, e relê.
2. **Salvar a região na Detecção**: reenvia a geometria e a configuração guardadas no Attlas.
3. Se o equipamento tiver destino ACOM, a próxima escrita da placa no módulo Controladores o regrava.

## Sintomas comuns

| Sintoma | Causa provável |
| --- | --- |
| "Não monitorado" | O equipamento não está vinculado, ou roda um app que o catálogo de builds não conhece |
| Região não acende com carro passando | Producer desligado, `source_id` do aparelho diferente do guardado, ou o Kafka do equipamento fora |
| Vincular responde 409 | O aparelho publica com a identidade de outra instalação; confirmar a tomada ou desvincular na outra |
| Caixas não aparecem | O build não entrega caixa (SDCT, laço por TCP); é esperado |
| Região acende cerca de 2 s depois do carro | O SDCT publica em lotes; 1,45 a 2,2 s ficam dentro da câmera |

## Ambiente local

- O seed avisa quando `SEED_ATMAN_EMBEDDED_SOURCE_ID` está vazia; preencher com o `source_id` do
  `/config` do aparelho.
- O stack local consome o mesmo broker do dev.v2, então vincular localmente toma o aparelho
  (`confirmTakeover`) e o tira do dev.v2.
- `ATMAN_ANALYTIC_API_PATH` antigo num `.env` local derruba a sondagem em 404; o padrão do código já
  está certo. Mudar env do `ms-cameras` exige matar o daemon do NX, que guarda o ambiente antigo.

## Mídia de incidente no equipamento

- A imagem é do app ATSPM: `POST <base>/incidents` lista os incidentes da janela (filtra por região,
  não por tipo) com `screenshot_path`; o JPEG sai por `GET <base>/output/<caminho>`, 640x360, cerca de
  64 KB.
- O vídeo é da gravação da câmera no cartão SD, cerca de 23 s por incidente:
  `GET /axis-cgi/record/list.cgi` e `GET /axis-cgi/record/export/exportrecording.cgi` (MP4 1080p30,
  sem `Range`, cerca de 15 s para exportar 22 s). O `recording_id` do app vem nulo e o Attlas acha a
  gravação pelo tempo. O SD limpa em 7 dias.
- Prazos no `ms-cameras`: `ANALYTICS_INCIDENT_MEDIA_HEADER_TIMEOUT_MS` (15 s) e
  `ANALYTICS_INCIDENT_MEDIA_BODY_TIMEOUT_MS` (120 s).
