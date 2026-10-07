---
tags:
  - doc
  - analitico
  - neural-labs
aliases:
  - "Heartbeat e eventos do Orchestrator"
  - "NEURAL ORCHESTRATOR"
  - "Neural Labs - Heartbeat e eventos do Orchestrator"
atualizado: 2026-10-07
---

# Analítico - Neural Labs - Heartbeat e eventos do Orchestrator

Volta para [[Analítico - Neural Labs]].

## Resumo

O **Neural Orchestr[ai]tor** é o produto de analítica de vídeo por IA da Neural Labs (contagem,
classificação, alarmes de imagem), separado do NEURAL SERVER de placas. Ele se integra por dois envios: um
heartbeat XML para IP e porta, que lista as câmeras do equipamento com estado, e um resumo de eventos em
JSON por HTTP. É o único canal documentado da Neural Labs que lista câmeras, mas sem IP, URL nem série. O
Attlas não usa este canal. Fonte: "NEURAL ORCHESTRATOR Integration Manual" v3.1, de 30/11/2025.

Versões do documento: 1.0 (29/09/2021); 2.0 e 2.1 (07/04/2020, com data trocada no próprio documento),
horário e classes no XML; 2.2 (13/02/2023), XML estendido e banco; 3.0 (17/01/2025), heartbeat e integração
de eventos; 3.1 (30/11/2025), atualização dos eventos.

## Heartbeat (XML para IP e porta)

Ligado na tela de configurações do Orchestrator: `Enabled`, `Heartbeat rate [s]` (exemplo `1`), `IP`
(exemplo `127.0.0.1`) e `Port` (exemplo `17001`). O Orchestrator manda periodicamente:

```xml
<HeartBeat>
  <DateHour>TimeStamp</DateHour>
  <FreeSpace>FreeSpace</FreeSpace>
  <TotalSpace>TotalSpace</TotalSpace>
  <ComputerId>0</ComputerId>
  <InferenceEngine>
    <Models>
      <Model><Id>CameraID</Id><Name>ModelType</Name><Workers>WorkerID</Workers><InferenceAvgTime>XX</InferenceAvgTime></Model>
    </Models>
  </InferenceEngine>
  <Cameras>
    <Camera><Id>CameraID</Id><Name>Camera name</Name><Status>X</Status><FPS>X</FPS><Resolution>XxY</Resolution></Camera>
  </Cameras>
  <Alarms>
    <Alarm><Id>AlarmID</Id><Name>Alarm name</Name><DateTime>TimeStamp</DateTime><CameraId>CameraID</CameraId><CameraName>Camera name</CameraName></Alarm>
  </Alarms>
</HeartBeat>
```

| Elemento | Significado |
| --- | --- |
| `FreeSpace`, `TotalSpace` | espaço livre e total do equipamento |
| `ComputerId` | número do equipamento |
| `Model` | `Id` (câmera), `Name` (modelo), `Workers`, `InferenceAvgTime` (tempo médio de inferência) |
| **`Camera`** | `Id` (número da câmera), `Name`, `Status`, `FPS` de entrada e `Resolution` em pixels |
| `Alarm` | `Id`, `Name`, `DateTime`, `CameraId`, `CameraName` |

| `Camera.Status` | Estado |
| --- | --- |
| `1` | CONNECTED |
| `2` | NOT_CONNECTED |
| `3` | CONNECTING |
| `4` | CONNECTION_LOST |
| `5` | RECONNECTING |

Nomes de alarme (`Alarm.Name`): `IMAGE_TOO_BLURRY`, `IMAGE_TOO_DARK`, `MOTION_ALARM`, `IMAGE_TOO_BRIGHT`,
`GLOBAL_SCENE_CHANGE`, `SIGNAL_LOSS`.

É o único canal documentado da Neural Labs que **lista as câmeras de um equipamento** (número, nome,
estado, FPS e resolução). Ainda assim não traz IP, URL nem série, e é do Orchestrator, não do NEURAL
SERVER de placas. O que cada canal diz sobre a câmera está em
[[Analítico - Neural Labs - Vínculo de câmeras]].

## Eventos (JSON por HTTP)

Os eventos são resumidos numa tabela do banco e enviados periodicamente, por HTTP, a um endereço definido
pelo usuário: o total por classificação e câmera no intervalo, que pode ser 60 (padrão), 30, 15 ou 5
minutos.

```json
[
  {
    "name": "Camera 1",
    "DateTime": "2024-09-24T10:15:00",
    "IdComputer": 1,
    "IdLocalization": 3,
    "IdCamera": 1,
    "EventName": "Event Name 1",
    "IdClassification": 2,
    "TotalCount": 230,
    "SpeedCount": 230,
    "SumSpeed": 0,
    "AvgSpeed": 26
  }
]
```

Os nomes mudam em relação ao NEURAL SERVER:

| Orchestrator | NEURAL SERVER |
| --- | --- |
| `IdComputer` | `ComputerID` |
| `IdCamera` | `CamID` |
| `IdLocalization` | `LocationID` |

O documento não diz se os números de câmera dos dois produtos são do mesmo espaço. Na API Web da Neural
Platform, os eventos do Orchestrator aparecem com `dataSourceCamera = O` e imagens `*_NLO`
([[Analítico - Neural Labs - API Web do NS Backend]]).

## Classes de objeto (`IdClassification`)

| Código | Classe |
| --- | --- |
| 1 | MOTORCYCLE |
| 2 | CAR |
| 3 | VAN |
| 4 | TRUCK |
| 5 | BUS |
| 6 | PERSON |
| 7 | BICYCLE |
| 8 | ABANDONED_OBJECT |
| 9 | ELECTRIC_SCOOTER |
| 10 | SMOKE |
| 14 | TRICYCLE |
| 114 a 123 | ANIMALS |
| 201 | FACE |
| 202 | FOG |
| 301 | GUN |
| 302 | KNIFE |

## Glossário

| Termo | O que é |
| --- | --- |
| Orchestrator | produto de analítica de vídeo por IA da Neural Labs, separado do NEURAL SERVER |
| Heartbeat | mensagem periódica de estado do equipamento |
| Modelo de inferência | rede de IA que o equipamento roda sobre o vídeo de uma câmera |
| Classificação | classe do objeto contado (carro, pessoa, bicicleta) |
