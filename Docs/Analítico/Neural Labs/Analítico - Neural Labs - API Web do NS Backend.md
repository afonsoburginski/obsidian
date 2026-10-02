---
tags:
  - doc
  - analitico
  - neural-labs
  - lpr
aliases:
  - "API Web do NS Backend"
  - "NsBackend"
  - "Neural Platform API"
  - "Neural Labs - API Web do NS Backend"
atualizado: 2026-10-01
---

# Analítico - Neural Labs - API Web do NS Backend

API HTTP da **Neural Platform** (o backend "NS Backend") para sistemas externos consultarem eventos, sanções, imagens, vídeos e trechos. Fonte: "Neural Platform, NS Backend web API integration" v26.1, revisão 1.7 de 15/05/2026. O Attlas não usa esta API hoje. Índice da pasta em [[Analítico - Neural Labs]].

## Visão geral

- **Base**: `/nlapi/api/v2/`. Host e porta dependem da instalação; o exemplo do documento usa `http://localhost:5000`.
- **Autenticação**: `POST /nlapi/api/v2/Auth/login` e, depois, o cabeçalho `Authorization: Bearer <token>` em toda chamada.
- **Permissões**: cada rota exige um "command" no grupo do usuário, configurado na tela "Edit group" da plataforma (a tela tem também uma aba "Permission Cameras").
- **Envelope de resposta**: `{ "data": ..., "isSuccess": bool, "type": string|null, "errors": [{ "code", "detail" }] }`. Erro 500 vem em outro formato: `{ "error": { "message", "data", "exception" } }`. 401 e 403 podem vir sem corpo.
- **Histórico**: 1.0 (11/12/2024) criação; 1.1 trechos; 1.2 faixa exclusiva e motivos de sanção; 1.3 parâmetros obrigatórios; 1.4 vídeos por um controlador genérico de imagem; 1.5 (12/02/2026) "Remove obsolete methods", sem dizer quais; 1.6 eventos e imagens; 1.7 sanções a partir de um ID.

**Não há rota que liste câmeras, computadores, localidades ou configuração.** As 11 rotas abaixo são o documento inteiro.

## Rotas

| Verbo e rota | Permissão | Para quê |
| --- | --- | --- |
| `POST /Auth/login` | nenhuma | obter o token |
| `POST /Penalties/get-penalties` | `readpenalties` | sanções entre duas datas |
| `GET /Penalties/get-penalties-from-id` | `readpenalties` | até 100 sanções a partir de um ID |
| `GET /Penalties/get-penalty-by-id` | `readpenalties` | detalhe de uma sanção com os eventos e as imagens |
| `GET /ImageVideo/get-anpr-images` | uma entre `readpenalties`, `ver_events`, `view_sections`, `convoy_analysis`, `consultar_alarmas` | imagem da leitura e recorte da placa |
| `GET /ImageVideo/get-evidence-images-by-type` | idem | imagens de evidência |
| `GET /ImageVideo/get-evidence-videos` | idem | caminho do vídeo de evidência |
| `GET /ImageVideo/download-video` | idem | arquivo `video/mp4` |
| `GET /Sections/get-section` | `export_sections` | cálculo de trechos (tempo e velocidade média entre duas câmeras) |
| `POST /Events/get-events` | `ver_events` | eventos (leituras) entre duas datas |
| `GET /Events/get-event-by-id` | `ver_events` | um evento |

Todas as rotas acima ficam sob `/nlapi/api/v2`.

### Login

Corpo: `{ "username", "password", "keepMeLoggedIn": false, "verificationCode": "", "language": "en" }`.

Resposta: `data.token`, `data.refreshToken`, `data.isAdmin`, `data.keepMeLoggedIn`, `data.twoFactorRequired`, `data.setPasswordRequired`, `data.userInfo.username`.

Erros: 400 `Login.UsernameRequired` e `Login.PasswordRequired`; 401 `Login.InvalidCredentials`; 422 `Login.InvalidCode` (segundo fator inválido); 500. O documento não descreve rota de renovação do token nem a validade dele.

### Eventos: `POST /Events/get-events`

Parâmetros (`*` obrigatório): `*dateFrom`, `*dateTo`, `numberPlate` (exata, ou com `?`, `*`, `AND`, `OR`), `personName`, `camerasId` (`[{ "cameraId", "computerId" }]`), `nloEvents` (`[{ "eventName", "cameraId", "computerId" }]`), `computers` ("valores de ID do banco, tabela Computer"), `directions`, `countries`, `locations` (`[{ "locationId", "computerId" }]`), `colors`, `makes`, `models` (`[{ "makeId", "modelId" }]`), `engines`, `lightStates`, `classifications`, `lanes` (`[{ "laneId", "cameraId", "computerId" }]`), `includeCutImage` (padrão `true`).

Cada item da resposta:

- **Identidade e lugar**: `eventId`, `eventDate`, `cameraId`, `cameraName`, `computerId`, `locationId`, `locationName`, `laneId`, `laneName`, `gpsLatitude`, `gpsLongitude`, `dataSourceCamera` (`L` câmera ANPR, `O` câmera do Orchestr[AI]tor).
- **Placa**: `plateNumber`, `globalConfidence`, `countryId`, `countryName`, `characterHeight`, `charConfidence`, `engine` (`LPR` ou `ACCR`), `extraInfo` e `extrainfo2` (só ACCR), `processingTime`, `contrast`, `brightness`.
- **Movimento**: `speed` e `speedConfidence` (`-1` sem velocidade), `direction` (`-1` indo, `0` não detectado, `1` vindo) e `directionDescription`.
- **Semáforo**: `redLightState` (`0` desconhecido, `1` verde, `2` âmbar, `3` vermelho) e `redLightDescription`.
- **Veículo**: `analyticClassificationId/Description/Confidence`, `analyticMake`, `analyticModel`, `analyticColor` e as confianças.
- **Pessoa ligada ao veículo**: `personFirstname`, `personSurname`, `personSurname2`, `personPicture`.
- **Imagens**: `cutImagePath`, `cutImage`, `anprImagePath`, `anprImage`, e as coordenadas `cutTop/Left/Right/Bottom`, `classificationTop/Left/Right/Bottom`, `cut*Relative`, `widthObjectEvent`, `heightObjectEvent` (só Orchestrator).
- **Outros**: `nloEventName`, `comments`, `blComments` (sempre vazio), `eventInsertionType` (`Automatic` ou `Manual`), `lastExportDate`, `validationUser` e `validationDate` (não usados).

Erros: 400 `ExportEvents.DateFromLessThanDateTo`, 401, 403, 500.

`GET /Events/get-event-by-id` recebe `*eventId` e `*computerId` e devolve o mesmo objeto; 404 `GetEventById.NotFound` quando o par não existe.

### Sanções

`POST /Penalties/get-penalties`: `*dateFrom`, `*dateTo`, `typesId`, `cameras` (dicionário **chave `cameraId`, valor `computerId`**, exemplo `{ "1": "1", "4": "1" }`), `numberPlate`, `statusId`, `minutesFrom`, `minutesTo` (área restrita), `reasonsId`. Cada item: `penaltyId`, `typeId`, `typeDescription` (exemplo `FOTOROJO`), `numberPlate`, `numberPlateExport`, `globalConfidence`, `date`, `reasonId`, `reason`, `customReason`, `statusId`, `statusDescription` (exemplo `PROPUESTA`), `minutesPenalty`, `statusDate`, `diffMinutes`, `configurationId` (não usado), `camerasNames`, `observations`; mais `totalRows`. Erros 400 `ExportPenalties.DateFromRequired`, `DateToRequired`, `DateRangeInvalid`.

`GET /Penalties/get-penalties-from-id`: `*fromId`, até 100 itens; erro `ExportPenaltiesFromIdErrorCodes.FromIdInvalid`.

`GET /Penalties/get-penalty-by-id`: `*penaltyId`, `addImagePath` (`false` devolve a imagem em base64, `true` o caminho). Devolve a sanção, `events[]` (`eventId`, `eventDate`, `numberPlate`, `cameraId`, `cameraName`, `computerId`, imagens, `speed`, `redLightState`, `trafficLightStatus`, `vehicleMake`, `direction`, `vehicleClassDescription`, `locationId`, `evidenceImages[]`) e um bloco por tipo, nulo quando não se aplica: `instantSpeed`, `restrictedArea`, `illegalStop`, `illegalTurn`, `wrongWay`, `section`, `redLight`, `trafficJam`, `abandonedObject`, `averageSpeedAlteration`, `clearance`, `exclusiveLane`, `restrictedPlate`. Erros 400 `GetPenaltyById.PenaltyIdInvalid` e 404 `GetPenaltyById.PenaltyNotFound`. O vídeo da sanção pede outra chamada.

### Imagens e vídeo

- `get-anpr-images`: `*eventId`, `*computerId`, `includeCutImage`. Itens com `eventId`, `computerId`, `imageVideoId`, `cameraId`, `cameraName`, `imageBytes`, `imageType` (`Lpr` ou `Cut`), `imagePath` e `imageBoundingBoxes[]` (`top`, `bottom`, `left`, `right`, `boundingBoxType`).
- `get-evidence-images-by-type`: `*eventId`, `*computerId`, `*type` entre `CAMERA` (imagem principal quando a fonte é o NEURAL SERVER), `CAMERA_NLO` (idem, Orchestrator), `RECORDER` e `RECORDER_NLO` (imagens usadas para gerar o vídeo).
- `get-evidence-videos`: `*eventId`, `*computerId`, `*type` entre `RECORDERAVI` (o vídeo), `RECORDER` e `RECORDER_NLO`. `imageVideoId` serve para o download; `imageBytes` vem nulo em `RECORDERAVI`.
- `download-video`: `*imageVideoId`; responde o arquivo `video/mp4`, ou 204 quando o arquivo não existe ou o ID não é de um `RECORDERAVI`.

Erros comuns: `*.EventIdInvalid`, `*.ComputerIdInvalid`, `*.TypeInvalid`, `*.TypeNotSupported`, `DownloadVideo.ImageVideoIdInvalid`.

### Trechos: `GET /Sections/get-section`

É o cálculo de tempo de viagem da própria Neural Labs. Parâmetros: `*dateFrom`, `*dateTo`, `numberPlate`, `entryLocations`/`exitLocations` (cada localidade é `idLocation + 'L' + idComputer`, várias unidas por `S`, exemplo `10L1S10L2`), `entryCameras`/`exitCameras` (cada câmera é **`idCamera + 'C' + idComputer`**, exemplo `13C1S14C1`), `*durationFrom`/`*durationTo` (padrão `00:00:00` a `23:59:59`), `*avgSpeedFrom`/`*avgSpeedTo` (padrão `0` a `10000`), `vehicleTypeIds`, `makes`, `models` (`Marca#*#Modelo`), `colors`.

Cada item: `entryDate`, `exitDate`, `numberPlate`, `entryLocationName`, `entryCameraName`, `exitLocationName`, `exitCameraName`, `averageSpeed`, `duration` (`HH:mm:ss`), `durationSeconds`, classificação, marca, modelo e cor de entrada e de saída, `entryCutImage`/`exitCutImage`, `entryEventId`/`exitEventId`, `entryComputerId`/`exitComputerId`, `entryLocationId`/`exitLocationId`, `entryCameraId`/`exitCameraId`. Erros `GetSectionCalcs.DateRangeInvalid`, `AvgSpeedRangeInvalid`, `DurationRangeInvalid`.

## O que isto diz sobre as câmeras

Em toda a API a câmera é o par `cameraId` + `computerId` (a codificação `13C1` dos trechos deixa isso explícito), com `cameraName` só como rótulo. Nenhuma resposta traz IP, URL, fabricante, modelo ou número de série. Detalhe em [[Analítico - Neural Labs - Vínculo de câmeras]].
