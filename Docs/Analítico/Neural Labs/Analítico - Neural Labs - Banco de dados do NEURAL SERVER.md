---
tags:
  - doc
  - analitico
  - neural-labs
  - lpr
aliases:
  - "Banco de dados do NEURAL SERVER"
  - "Neural Labs - Banco de dados do NEURAL SERVER"
atualizado: 2026-10-07
---

# Analítico - Neural Labs - Banco de dados do NEURAL SERVER

Volta para [[Analítico - Neural Labs]].

## Resumo

O NEURAL SERVER guarda as leituras num banco **Microsoft SQL Server**, e o fabricante declara esse banco
**aberto ao integrador**, para leitura em tempo real ou histórica e para gerir as listas negras. As
leituras ficam em `INCIDENCE`, a placa em `RESULTS` e a imagem em `ANPR_IMAGES`, sempre pela chave
`ComputerID` + ID da leitura. A tabela mestra de câmeras (`CAMERAS`), onde deve estar a URL de cada
câmera, é citada mas não documentada. O Attlas não lê este banco. Fonte: "NEURAL SERVER Data
Integration" v1.17, páginas 5 a 11.

## Tabelas documentadas

### `INCIDENCE`, uma linha por leitura válida

Colunas descritas no texto:

| Coluna | Significado |
| --- | --- |
| `ComputerID` (PK) | identificador do PC onde a leitura aconteceu |
| `ID` (PK) | identificador da leitura dentro daquele PC |
| `Date` | data e hora da leitura |
| `ImagePath` | caminho do arquivo de imagem |
| `GpsLatitude`, `GpsLongitude` | posição da leitura, se a opção de GPS estiver ativa |
| **`camera_id`** | câmera que leu a placa, apontando para a **tabela mestra `CAMERAS`** |

O diagrama da página 5 mostra mais colunas, sem descrição: `LOCATIONID`, `SourcePath`,
`Recognition_Left/Top/Width/Height`, `NumSteps`, `MinStep`, `MaxStep`, `DistanceCoeff`,
`HorizontalCoeff`, `VerticalCoeff`, `AngleCoeff`, `CharacterSize`, `OperatorID`, `ApplyCorrection`,
`STATUSID`, `TYPEINCIDENCEID`, `Sent`, `TimeStamp`, `Class`, `Brand`, `Color`, `Cause_N_Notification`,
`NName`, `Agent`, `Precept`, `IMP_REDUCED`, `IMP_NOT_REDUCED`, `Export`, `ExportImages`, `IDGestPol`,
`DateValidation`, `Result_Send`, `Send_Server`, `Date_Send_Server`, `Send_Action`, `Date_Send_Action`,
`Send_Action_XML`, `Id_Event_XML`.

### `RESULTS`, os dados da placa de cada leitura

| Coluna | Significado |
| --- | --- |
| `computerID`, `INCIDENCEID` | chave para `INCIDENCE` |
| `NumberPlate` | placa |
| `GlobalConfidence` | confiabilidade |
| `AverageCharacterHeigth` | altura média dos caracteres |
| `ProcessingTime` | tempo de processamento |
| `PlateFormat` | código de país |
| `Result_Left`, `Result_Top`, `Result_Right`, `Result_Bottom` | retângulo da placa |
| `ID`, `TimeStamp` | identificador e carimbo de tempo |
| `DIRECTION_VECTOR` | `0` desconhecido ou parado, `-1` se afasta, `1` se aproxima |

O diagrama acrescenta, sem descrição: `OriginalNumberPlate`, `Send_Server`, `Date_Send_Server`, `nFrame`,
`aviFileName`, `Speed`, `SpeedConfidence`, `IdLane`, `VehicleClass`, `VehicleClassConfidence`,
`VehicleMake`, `VehicleMakeConfidence`, `VehicleType`, `VehicleColor`, `VehicleColorConfidence`,
`RedLightState`, `Analytic_Type`, `RedLightPosTime`, `CharConfidence`, `TimeExternal`,
`TimeExternalSincro` e `TimeMilestone`.

### `ANPR_IMAGES`, a imagem de cada leitura

Só é preenchida com a opção "Guarda Imagen en DB" ativa. Relação 1 para 1 com `INCIDENCE`: `computerID`,
`INCIDENCEID` e `ImageSourceBlob` (a imagem inteira, JPEG). O diagrama mostra também `ImagePath`,
`ImageSource`, `ID`, `TimeStamp`, `Send_Server` e `Date_Send_Server`.

### Listas negras: `VLIST_TYPES` e `VLIST`

| Tabela | Colunas |
| --- | --- |
| `VLIST_TYPES` | `ID` (automático), `VLIST` (identificador do tipo), `Description`, `TIMESTAMP` (automático) |
| `VLIST` | `NumberPlate`, `Description`, `Type` (aponta para `VLIST_TYPES.VLIST`), `ID` e `TimeStamp` (automáticos) |

### Sanções: `SAN_PENALTY_TYPES`, `SAN_PENALTY`, `SAN_PENALTY_INCIDENCES`

| Tabela | Colunas |
| --- | --- |
| `SAN_PENALTY_TYPES` | `ID_PENALTY_TYPE`, `DESC_PENALTY_TYPES`, `ENABLED` |
| `SAN_PENALTY` | `ID_PENALTY`, `ID_PENALTY_TYPES`, `DATE` |
| `SAN_PENALTY_INCIDENCES` | `ID_PENALTY` e `ID_INCIDENCE`/`ID_COMPUTER`, a leitura da sanção |

## O que o documento não descreve

- A **tabela mestra `CAMERAS`**: é citada como destino de `INCIDENCE.camera_id`, mas não aparece no
  diagrama e **nenhuma coluna dela é documentada**. É nela que deve estar a configuração de cada câmera
  (nome, localidade e a fonte de vídeo), porque o NEURAL SERVER conecta nas câmeras por RTSP, GigE
  Vision, MJPEG, DirectShow ou JPG (página 4). Isso é inferência: o documento não confirma.
- A tabela `Computer`: aparece na API Web (filtro `computers`, "valores de ID do banco, tabela
  Computer"), sem colunas documentadas.
- A tabela de localidades, das `LocationID`.
- O significado de `INCIDENCE.SourcePath` e de `ANPR_IMAGES.ImageSource`.

## Consultas de exemplo do fabricante

```sql
-- Leituras com a placa e a imagem
SELECT * FROM incidence
JOIN results ON incidence.id = results.incidenceid AND incidence.computerID = results.computerID
LEFT JOIN anpr_images ON incidence.id = anpr_images.incidenceid AND incidence.computerID = anpr_images.computerID
-- Filtros de exemplo:
-- WHERE incidence.TimeStamp BETWEEN '20140101 00:00:00' AND '20140102 23:59:59'
--   AND incidence.camera_id = 1 AND incidence.computerid = 1
-- WHERE ... AND results.numberplate = 'AAA111'
-- WHERE ... AND EXISTS (SELECT * FROM vlist WHERE vlist.NumberPlate = results.NumberPlate)

-- Listas negras
SELECT * FROM vlist JOIN vlist_types ON vlist.Type = vlist_types.vlist;
INSERT vlist_types (vlist, description) VALUES (10, 'Black List');
INSERT vlist (numberplate, description, type) VALUES ('AAA111', '1001 SEARCH CODE', 10);
DELETE FROM vlist WHERE numberplate = 'AAA111' AND type = 10;
```

Os exemplos filtram câmera pelo par `incidence.camera_id` e `incidence.computerid`, o mesmo par que o XML
chama de `CamID` e `ComputerID`. Ler o cadastro de câmeras deste banco é uma pendência do vínculo, em
[[Analítico - Neural Labs - Vínculo de câmeras#Pendências]].

## Glossário

| Termo | O que é |
| --- | --- |
| Incidence | no vocabulário do fabricante, uma leitura válida de placa, não um incidente de trânsito |
| ANPR | reconhecimento automático de placa, sinônimo de LPR |
| Lista negra | lista de placas de interesse (`VLIST`) que o NEURAL SERVER marca na leitura |
| Sanção | infração montada a partir de uma ou mais leituras (`SAN_PENALTY`) |
