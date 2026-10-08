---
tags:
  - doc
  - analitico
  - neural-labs
  - lpr
  - referencia
aliases:
  - "Neural Labs - Payloads e endpoints"
  - "Neural Labs - Referência rápida"
  - "Payloads da Neural Labs"
  - "Endpoints da Neural Labs"
atualizado: 2026-10-07
---

# Analítico - Neural Labs - Payloads e endpoints

Volta para [[Analítico - Neural Labs]].

## Resumo

Esta é a nota de consulta rápida da integração com a Neural Labs. Ela reúne num lugar só o que o NEURAL SERVER manda, o que o Attlas responde, as rotas de cada serviço, as variáveis e o comando do teste de ponta a ponta.

Os valores conferem com o código da PR #6225.

> [!warning] Parte desta nota entra com a PR #6225
> O JSON no socket, o `total` do trajeto, a série de 30 min e o LPR na tela do trajeto estão na PR #6225, aberta em 07/10. Até o merge, a develop aceita só XML e a tela mostra o LPR vazio. O porquê de cada decisão está em [[Analítico - Neural Labs - Arquitetura e estratégias]], e a regra do cálculo em [[Analítico - Neural Labs - Tempo de viagem]].

| Pergunta | Seção |
| --- | --- |
| Por onde a leitura passa até a tela? | Caminho de uma leitura |
| O que o NEURAL SERVER manda no socket? | Socket TCP |
| Quais rotas existem e quem chama cada uma? | Rotas |
| O que a tela do trajeto recebe? | Medição do trajeto |
| Que variável liga o quê? | Variáveis |
| Como testo do socket até a tela? | Teste de ponta a ponta |

## Caminho de uma leitura

```widget
src: _widgets/diagrams/neural-labs-payloads.html
```

O caminho tem quatro passos:

1. O NEURAL SERVER disca para a porta 17000 e manda cada leitura.
2. O `ms-video-analytics` grava a leitura, sem a placa em claro, e pareia a passagem com a câmera seguinte do trajeto.
3. O `ms-traffic-model` repassa a medição sem guardar nada.
4. A tela pede a medição pelo Kong.

Não há tópico Kafka em nenhum passo.

## Socket TCP

### Conexão

| Item | Valor |
| --- | --- |
| Porta | `17000` (`NEURAL_LPR_TCP_PORT`), publicada no `docker-compose.yml` |
| Modo do equipamento | Client mode: o NEURAL SERVER disca para o Attlas |
| Quem pode conectar | só o IP de uma instância cadastrada e habilitada; qualquer outro IP é fechado antes de ler um byte |
| Conexão quieta | nunca fecha; o keepalive TCP de 30 s acha o par morto |
| Teto de um quadro | 2 MiB (`NEURAL_LPR_TCP_MAX_FRAME_BYTES`); acima disso a conexão cai |
| Conexões simultâneas | 16 (`NEURAL_LPR_TCP_MAX_CONNECTIONS`) |
| Resposta ao equipamento | nenhuma; o Client mode não tem ACK |

### Formatos aceitos

O primeiro byte do corpo, depois do cabeçalho, decide o formato.

| Formato | Como chega | Onde o quadro termina |
| --- | --- | --- |
| XML | `NEURAL` + tamanho + `<?xml ...><infoplate>...</infoplate>` | em `</infoplate>` |
| JSON | `NEURAL` + tamanho + `{...}` | na `}` que fecha o objeto raiz |
| JSON solto | `{...}` sem cabeçalho, um por linha (NDJSON) ou colados | na `}` que fecha o objeto raiz |

O tamanho declarado depois de `NEURAL` só é conferido, e a divergência entra numa métrica. Quem delimita o quadro é o fechamento, porque o manual não diz se os separadores contam no tamanho.

> [!warning] O JSON real do equipamento não foi capturado
> O manual mostra a opção JSON na tela, mas não descreve o formato. O Attlas aceita as mesmas chaves do XML, em texto ou número, com objeto plano ou com `{"infoplate": {...}}`. Antes de produção, capturar um quadro real e conferir os nomes de campo e o enquadramento.

### Exemplo em XML

```text
NEURAL
372
<?xml version="1.0" encoding="utf-8"?>
<infoplate>
  <DateHour>2026-10-07 11:15:40.000</DateHour>
  <Engine>LPR</Engine>
  <Plate>ABC1D23</Plate>
  <Confidence>99.99</Confidence>
  <CamID>2</CamID>
  <CamName>Av. Principal 100</CamName>
  <DirectionVector>-1</DirectionVector>
  <ComputerID>1</ComputerID>
  <IncidenceID>1001</IncidenceID>
  <Speed>-1</Speed>
</infoplate>
```

### Exemplo em JSON

Com cabeçalho:

```text
NEURAL
196
{"DateHour":"2026-10-07 11:15:40.000","Engine":"LPR","Plate":"ABC1D23","Confidence":99.99,"CamID":2,"CamName":"Av. Principal 100","DirectionVector":-1,"ComputerID":1,"IncidenceID":1001,"Speed":-1}
```

Solto, uma leitura por linha:

```text
{"DateHour":"2026-10-07 11:15:40.000","Plate":"ABC1D23","CamID":2,"ComputerID":1,"IncidenceID":1001}
{"DateHour":"2026-10-07 11:16:25.000","Plate":"ABC1D23","CamID":3,"ComputerID":1,"IncidenceID":1002}
```

### Campos lidos

O resto do `<infoplate>` é descartado na leitura. A lista completa do fornecedor está em [[Analítico - Neural Labs - Envio XML do NEURAL SERVER]].

| Campo | Obrigatório | Como o Attlas usa |
| --- | --- | --- |
| `DateHour` | sim | instante da leitura, sem fuso; lido no fuso cadastrado na instância; mais de 60 s no futuro recusa |
| `Plate` | sim | normalizada e guardada só como impressão HMAC, nunca em claro |
| `CamID` | sim | junto com o `ComputerID`, identifica a câmera do equipamento |
| `ComputerID` | sim | identifica o NEURAL SERVER que reconheceu |
| `IncidenceID` | não | chave da leitura; vazio ganha chave derivada do `CamID`, do instante e da placa |
| `Engine` | não | `LPR` ou ausente aceita; `ACCR` e outros recusam |
| `Confidence` | não | aceita vírgula decimal; abaixo de `LPR_MIN_CONFIDENCE`, quando definido, recusa |
| `CamName` | não | rótulo; também alimenta o vínculo automático pelo nome |
| `DirectionVector` | não | `1` se aproxima, `-1` se afasta |
| `Speed` | não | velocidade instantânea; negativo vira vazio; não entra no cálculo do trajeto |

### Por que uma leitura é recusada

O motivo aparece no rótulo `outcome` da métrica `neural_lpr_reads_total` e nunca vai para o log com o conteúdo.

| Motivo | Quando |
| --- | --- |
| `malformed_xml` | XML inválido |
| `malformed_json` | JSON inválido, raiz que não é objeto ou profundidade acima de 16 |
| `doctype_rejected` | XML com `DOCTYPE` |
| `engine_not_lpr` | `Engine` diferente de `LPR` |
| `missing_field` | falta um campo obrigatório; é o caso do XML curto |
| `invalid_plate`, `invalid_date` | placa ou data que não se leem |
| `event_in_future` | `DateHour` mais de 60 s à frente; quase sempre é o fuso errado na instância |
| `low_confidence` | abaixo do piso configurado |
| `unmapped_camera` | câmera sem vínculo; a primeira leitura se perde e o vínculo automático tenta pelo nome |
| `instance_disabled` | instância desligada |
| `duplicate_conflict` | mesma chave de leitura com conteúdo diferente |

## Rotas

### Públicas, pelo Kong

| Rota | Serviço | Permissão | Para quê |
| --- | --- | --- | --- |
| `GET /api/cameras/analytics/neural-labs/cameras` | `ms-cameras` | função no Sistema | instâncias, câmeras com associação e vínculo, câmeras sem vínculo |
| `POST /api/cameras/analytics/neural-labs/instances` | `ms-cameras` | `INSTANCES_MANAGE` | cadastra o NEURAL SERVER |
| `PATCH /api/cameras/analytics/neural-labs/instances/{id}` | `ms-cameras` | `INSTANCES_MANAGE` | liga ou desliga o vínculo automático |
| `PUT /api/cameras/analytics/neural-labs/instances/{id}/camera-mappings` | `ms-cameras` | `INSTANCES_MANAGE` | vínculo manual |
| `POST /api/cameras/analytics/neural-labs/instances/{id}/camera-mappings/import` | `ms-cameras` | `INSTANCES_MANAGE` | vínculo pela lista do equipamento |
| `DELETE /api/cameras/analytics/neural-labs/instances/{id}/camera-mappings/{cameraId}` | `ms-cameras` | `INSTANCES_MANAGE` | desfaz o vínculo |
| `GET /api/traffic-model/journeys/{id}/lpr-measurements?windowMinutes=` | `ms-traffic-model` | `JOURNEY_VIEW` | medição atual do trajeto, por trecho e total |
| `GET /api/traffic-model/journeys/{id}/lpr-measurement-series?from=&to=` | `ms-traffic-model` | `JOURNEY_VIEW` | série de 30 min do total do trajeto |
| `GET /api/traffic-model/journeys/{id}/estimated-travel-times?from=&to=` | `ms-traffic-model` | `JOURNEY_VIEW` | série da fonte externa (Google), no mesmo eixo |

### Internas, sem Kong

Exigem o cabeçalho `x-internal-service-token`, e as que levam Sistema exigem também o `System-Id`. Todas são do `ms-video-analytics`, menos as quatro últimas, que são do `ms-cameras`.

| Rota | Para quê |
| --- | --- |
| `POST` e `GET /api/internal/lpr/neural-instances` | cadastro e lista das instâncias, com `lastFrameAt` |
| `PATCH /api/internal/lpr/neural-instances/{id}` | muda nome, IP, fuso, `enabled` ou `autoLinkEnabled` |
| `PUT /api/internal/lpr/neural-instances/{id}/camera-mappings` | vínculo manual |
| `DELETE /api/internal/lpr/neural-instances/{id}/camera-mappings/{cameraId}` | desfaz o vínculo |
| `GET /api/internal/lpr/neural-instances/{id}/unmapped-cameras` | câmeras do equipamento sem vínculo |
| `GET /api/internal/lpr/camera-mappings` e `.../read-activity` | vínculos do Sistema e a atividade de leitura de cada um |
| `GET /api/internal/lpr/segments/{segmentId}/measurement?windowMinutes=` | medição de um trecho |
| `GET /api/internal/lpr/journeys/{journeyId}/measurement?windowMinutes=` | medição do trajeto, por trecho e total |
| `GET /api/internal/lpr/journeys/{journeyId}/measurement-series?from=&to=` | série de 30 min do total |
| `POST /api/internal/lpr/journeys/{journeyId}/sync` | sincroniza na hora os trechos de um trajeto, sem esperar os 5 min |
| `GET /api/internal/cameras/neural-labs/auto-link-candidates?camName=` (`ms-cameras`) | candidatas do vínculo automático |
| `POST /api/internal/cameras/{cameraId}/lpr-observations` (`ms-cameras`) | evidência de que a câmera lê placas |
| `POST /api/internal/cameras/lpr-capabilities/lookup` (`ms-cameras`) | capacidade LPR de várias câmeras |
| `POST /api/internal/cameras/lookup` (`ms-cameras`) | confere se as câmeras do vínculo são do Sistema |

### Corpos das rotas de cadastro

Cadastro da instância pela tela (`POST /api/cameras/analytics/neural-labs/instances`):

```json
{
  "name": "NEURAL SERVER Centro",
  "sourceAddress": "200.10.20.30",
  "timeZone": "America/Guayaquil",
  "autoLinkEnabled": true
}
```

O `sourceAddress` é o IP de onde o equipamento conecta, e é por ele que o socket reconhece a instância. Endereço já cadastrado responde 409 `NEURAL_INSTANCE_ADDRESS_IN_USE`. Qual IP cadastrar em cada ambiente está em [[Analítico - Neural Labs - Arquitetura e estratégias#Qual IP cadastrar]].

Vínculo manual (`PUT .../camera-mappings`):

```json
{ "mappings": [{ "externalComputerId": "1", "externalCamId": "2", "cameraId": "<uuid da câmera do Attlas>" }] }
```

A resposta separa os vínculos `accepted` dos `conflicts`, e cada conflito traz o `reason`.

Vínculo pela lista do equipamento (`POST .../camera-mappings/import`):

```json
{ "rows": [{ "externalComputerId": "1", "externalCamId": "2", "serialNumber": "ACCC8E000001", "ipAddress": null }] }
```

## Medição do trajeto

### Medição atual

Rota: `GET /api/traffic-model/journeys/{id}/lpr-measurements`. A janela padrão são os últimos 15 min, e o parâmetro `windowMinutes` aceita de 1 a 1440.

```json
{
  "systemId": "…",
  "journeyId": "…",
  "definitionVersion": "…",
  "windowStart": "2026-10-07T14:00:00.000Z",
  "windowEnd": "2026-10-07T14:15:00.000Z",
  "segments": [
    {
      "segmentId": "…",
      "originCameraId": "…",
      "destinationCameraId": "…",
      "distanceMeters": 1000,
      "sampleCount": 12,
      "meanTravelTimeSeconds": 45,
      "meanSpeedKmh": 80,
      "lastObservedAt": "2026-10-07T14:14:10.000Z",
      "updatedAt": "2026-10-07T14:14:10.000Z",
      "status": "ACTIVE"
    }
  ],
  "total": {
    "travelTimeSeconds": 45,
    "speedKmh": 80,
    "sampleCount": 12,
    "coveredDistanceMeters": 1000,
    "legCount": 1,
    "measuredLegCount": 1,
    "lastObservedAt": "2026-10-07T14:14:10.000Z",
    "unavailableReason": null
  }
}
```

### Série

Rota: `GET /api/traffic-model/journeys/{id}/lpr-measurement-series`. A série usa janelas de 30 min alinhadas a `:00` e `:30`, no mesmo eixo da série do Google. O padrão são 48 janelas, e o teto é de 336, ou seja, 7 dias.

```json
{
  "systemId": "…",
  "journeyId": "…",
  "definitionVersion": "…",
  "coveredDistanceMeters": 1000,
  "from": "2026-10-06T14:00:00.000Z",
  "to": "2026-10-07T14:00:00.000Z",
  "points": [
    { "windowStart": "2026-10-07T13:30:00.000Z", "travelTimeSeconds": 46, "speedKmh": 78.3, "sampleCount": 30, "unavailableReason": null },
    { "windowStart": "2026-10-07T14:00:00.000Z", "travelTimeSeconds": null, "speedKmh": null, "sampleCount": 0, "unavailableReason": "NO_DATA" }
  ]
}
```

### Como o total é calculado

- **Perna** é o conjunto de trechos paralelos entre dois nós seguidos do trajeto. Um nó com duas câmeras gera dois trechos sobre o mesmo pedaço de via, e somar os dois contaria o tempo duas vezes.
- **Tempo do trajeto** é a soma das médias das pernas, e só existe quando todas as pernas têm medição na janela.
- **Velocidade** é a distância coberta dividida pelo tempo.
- **Amostras** é a contagem da perna com menos pares. Ela diz quantos pares sustentam o valor, não quantos veículos fizeram o trajeto inteiro.
- **Sem valor, nunca zero:** quando falta valor, os números vêm vazios e o `unavailableReason` diz por quê.

| `unavailableReason` | Quer dizer |
| --- | --- |
| `NO_SEGMENTS` | o trajeto ainda não tem trecho sincronizado, ou não tem duas câmeras em nós diferentes |
| `UNMAPPED` | uma câmera de ponta não tem vínculo com a Neural Labs |
| `CAPABILITY_NOT_SUPPORTED`, `CAPABILITY_CONFLICT`, `CAPABILITY_UNKNOWN` | a capacidade LPR de uma câmera de ponta não permite medir |
| `STALE` | a última medição é antiga demais |
| `NO_DATA` | nenhum par de placas na janela |
| `INCOMPLETE` | algumas pernas mediram e outras não |
| `RETENTION_EXPIRED` | a janela é mais antiga que `LPR_RETENTION_DAYS` e já foi apagada |

Na tela, o componente do trajeto no painel de operação, a ficha da Área e a página do trajeto mostram tempo e velocidade das duas fontes. A contagem de placas aparece como nota, e o comparativo LPR x Google desenha quando as duas fontes respondem.

## Variáveis

As variáveis são do `ms-video-analytics`. A lista completa está em [[Analítico - Neural Labs - Arquitetura e estratégias#Variáveis de ambiente]].

| Variável | Para ligar o socket |
| --- | --- |
| `NEURAL_LPR_ENABLED` | `true` |
| `NEURAL_LPR_TCP_LISTENER_ENABLED` | `true` |
| `LPR_DATA_POLICY_APPROVED` | `true` |
| `LPR_RETENTION_DAYS` | `30` (de 1 a 365) |
| `LPR_FINGERPRINT_KEY` | gerada pelo `setup:env`, nunca trocada |

Métricas para conferir o tráfego:

| Métrica | O que mostra |
| --- | --- |
| `neural_lpr_frame_formats_total{format}` | quantos quadros chegaram em cada formato: `xml`, `json` ou `bare_json` |
| `neural_lpr_reads_total{outcome}` | leituras aceitas e recusadas, pelo motivo |
| `neural_lpr_auto_link_attempts_total{outcome}` | resultado das tentativas de vínculo automático |

## Teste de ponta a ponta

O simulador mora em `tools/simulators/neural-server/`. O `config.example.json` tem as câmeras "Av. Principal 100" e "Av. Principal 800" numa rota que manda a mesma placa nas duas, com 45 s de intervalo.

1. **Ligar o socket:** subir o `ms-video-analytics` com as variáveis da seção Variáveis.
2. **Criar as câmeras:** no Attlas, câmeras com os mesmos nomes do simulador. O vínculo automático acontece a partir da segunda leitura de cada uma.
3. **Criar o trajeto:** essas câmeras em nós diferentes. Depois, sincronizar com `POST /api/internal/lpr/journeys/{id}/sync`.
4. **Mandar as leituras:** rodar o simulador em JSON e depois em XML:

   ```bash
   npm run tool:simulate-neural-server -- --config tools/simulators/neural-server/config.example.json \
     --register http://localhost:3302 --source-address 127.0.0.1 --format json
   npm run tool:simulate-neural-server -- --config tools/simulators/neural-server/config.example.json \
     --source-address 127.0.0.1 --format xml
   ```

   O `--json-framing bare` manda o JSON sem o cabeçalho `NEURAL`.
5. **Conferir a medição:** `lpr-measurements` deve trazer o `total` perto de 45 s por perna, e `lpr-measurement-series` a série.
6. **Conferir a tela:** abrir `#/operations-panel?open=journey:<id>`. Os cards de tempo e velocidade do LPR aparecem preenchidos e o comparativo desenha.

No dev.v2, uma conexão que vem pela tailnet chega ao container com origem `172.18.0.1`. Por isso, para testar por ali, cadastra-se esse IP temporariamente e apaga-se depois do teste. O equipamento real chega pelo IP público, com o security group aberto só para ele.
