---
tags:
  - doc
  - analitico
  - neural-labs
  - lpr
aliases:
  - "Envio XML do NEURAL SERVER"
  - "infoplate"
  - "Neural Labs - Triggers do NEURAL SERVER"
  - "Triggers do NEURAL SERVER"
atualizado: 2026-10-01
---

# Neural Labs - Envio XML do NEURAL SERVER

Como o NEURAL SERVER manda cada leitura de placa para um sistema externo, e os triggers que um sistema externo manda a ele. Fonte: documento "NEURAL SERVER Data Integration" v1.17, de 27/03/2023, páginas 12 a 23. O envio de leituras é o canal que o Attlas usa (`ms-video-analytics`, módulo `neural-lpr`); os triggers o Attlas não usa. Índice da pasta em [[Neural Labs]].

## Configuração do envio

A tela "Sending Connection" do NEURAL SERVER tem dois modos, e só um vale por vez:

| Modo | O que faz | Campos |
| --- | --- | --- |
| **Client mode** | o NEURAL SERVER abre a conexão TCP com o sistema externo e manda as leituras | `IP` e `Port` do servidor que escuta (exemplo da tela: `127.0.0.1` e `17000`) |
| **Server mode** ("Listen and send XML at Port") | o NEURAL SERVER escuta numa porta e manda as leituras por ela para quem conectar | `Port` (exemplo: `8051`). Ativar este modo desliga o envio normal |

- **Type**: `Format XML` ou `Format JSON`. O formato JSON aparece na tela, mas não é descrito no documento.
- **Close connection after send**: fecha a conexão depois de cada envio.
- **Send Image**: checkbox na aba "Configuration" que inclui a imagem JPEG da leitura no XML.

O Attlas implementa só o Client mode, com o formato XML completo.

## Formato do quadro

```
NEURAL + tamanho_do_XML + XML
```

- `NEURAL`: rótulo fixo, sempre o primeiro que chega.
- `tamanho_do_XML`: tamanho em bytes do XML, em texto decimal (exemplo do documento: `234231`).
- O XML começa em `<?xml version="1.0" encoding="utf-8"?>` e tem a raiz `<infoplate>`.

## XML completo (`<infoplate>`)

Exemplo do fabricante, sem os campos vazios de coordenada dos caracteres:

```xml
<infoplate>
  <DateHour>2014-09-27 11:15:40.000</DateHour>
  <Engine>LPR</Engine>
  <Plate>B3809WH</Plate>
  <Confidence>99.99</Confidence>
  <Country>SPAIN</Country>
  <CountryID>101</CountryID>
  <ProcTime>120</ProcTime>
  <CharHeight>25</CharHeight>
  <CamID>2</CamID>
  <CamName>Camera 1</CamName>
  <ImageLeft>23</ImageLeft>
  <ImageTop>45</ImageTop>
  <ImageWidth>148</ImageWidth>
  <ImageHeight>71</ImageHeight>
  <Path>c:\tmp\imgs\874A8E0A-C8A6-4D6A-9360-ADB09A3FCD69\20140927\1115409401644-000001-18553032-GCA7766.jpg</Path>
  <DirectionVector>-1</DirectionVector>
  <imgSize>0</imgSize>
  <img></img>
  <ComputerID>1</ComputerID>
  <Feedback>OK</Feedback>
  <IncidenceID></IncidenceID>
  <LocationID></LocationID>
  <LaneName></LaneName>
  <LaneID></LaneID>
  <Evidences><Evidence><IdCamEv>2</IdCamEv><imgEVSize></imgEVSize><imgEV></imgEV></Evidence></Evidences>
</infoplate>
```

### Campos

| Campo | Significado (tradução do documento) |
| --- | --- |
| `DateHour` | data e hora do reconhecimento; o documento não diz o fuso (o Attlas lê no fuso configurado na instância) |
| `Engine` | motor de reconhecimento: `LPR` (placa) ou `ACCR` (contêiner) |
| `Plate` | placa reconhecida |
| `Container`, `ExtraInfo` | código e informação extra de contêiner (só `ACCR`) |
| `Confidence` | confiabilidade do reconhecimento |
| `Country`, `CountryID` | país reconhecido, pelo arquivo `countrycodes.txt` do equipamento |
| `CountryISO2`, `CountryISO3`, `CountryISONUM` | código ISO do país (listados no documento, ausentes do exemplo) |
| `ProcTime` | tempo de processamento da imagem |
| `CharHeight` | altura média dos caracteres, em pixels |
| **`CamID`** | identificador da câmera que fez a leitura |
| **`CamName`** | nome da câmera que fez a leitura |
| **`ComputerID`** | identificador do equipamento que fez o reconhecimento |
| **`LocationID`** | identificador da localidade da câmera |
| `LaneName`, `LaneID` | nome e identificador da faixa detectada |
| `ImageLeft`, `ImageTop`, `ImageWidth`, `ImageHeight` | retângulo da placa na imagem, em pixels |
| `Path` | pasta onde a imagem fica guardada no equipamento que reconheceu |
| `DirectionVector` | sentido: `1` se aproxima da câmera, `-1` se afasta |
| `imgSize`, `img` | tamanho e conteúdo da imagem JPEG; `0` e vazio quando o envio de imagem está desligado |
| `Feedback` | motivo de não leitura quando a leitura veio de um trigger |
| `EventID` | identificador do evento pedido por trigger |
| **`IncidenceID`** | identificador sequencial da leitura, único junto com o `ComputerID` |
| `RecCamera` | sempre `0` |
| `nFrame`, `aviFileName` | quadro e arquivo, quando a fonte é vídeo AVI |
| `Code` | não descrito na lista de campos; na resposta do trigger 73 é a máscara das câmeras ativas (ver [[#Triggers]]) |
| `Speed` | velocidade instantânea, quando a opção "NL Speed" está ativa |
| `GPSLat`, `GPSLon` | latitude e longitude da detecção |
| `List`, `ListName` | `-1` fora de lista; senão o identificador e o nome da lista (lista negra) |
| `CharConfidence` | confiabilidade de cada caractere, separada por `;` |
| `VehicleMake`, `VehicleClass`, `VehicleColor`, `VehicleType` | analítica do veículo (códigos no anexo abaixo) |
| `RedLightState` | semáforo: `1` verde, `2` âmbar, `3` vermelho, `0` não usado, `100` erro |
| `RedLightPosTime` | milissegundos desde a última troca do semáforo |
| `Evidences` / `Evidence` | imagens de evidência: `IdCamEv` (câmera de evidência), `imgEVSize`, `imgEV` |
| `Angle` | ângulo da placa |
| `Char0TopX` ... `CharNBottomY` | posição do primeiro e do último caractere |
| **`GUID`** | "reservado para integrações"; o documento não diz o que carrega |

Em negrito, os campos que identificam de onde veio a leitura. Nenhum deles é IP, URL, MAC ou número de série da câmera.

### Diamantes IMO (mercadoria perigosa)

Dentro de `<infoplate>` pode vir `<IMO_DIAMONDS>`, com um `<IMO_DIAMOND>` por detecção:
`IMO_Class` (classe do perigo), `IMO_Subclass`, `IMO_Confidence`, `IMO_Size` (altura em pixels),
`IMO_Left`/`IMO_Top` e `IMO_Right`/`IMO_Bottom` (retângulo) e `IMO_Type` (`LPR` ou `EV`, a imagem em
que foi achado).

## XML curto

Ligado com `SendLigthWeigthXML = True` no arquivo de configuração do NEURAL SERVER (grafia do fabricante). Traz só:

`DateHour`, `Engine`, `Plate`, `Container`, `ExtraInfo`, `Country`, `CountryID`, `CamID`, `Path`, `List`, `LocationID`.

**Não traz `ComputerID`, `CamName` nem `IncidenceID`.** Com o XML curto não dá para saber de que equipamento veio a leitura, nem deduplicar. O Attlas recusa esse formato: o equipamento precisa mandar o XML completo.

## Triggers

Comandos que um sistema externo manda ao NEURAL SERVER para disparar ou controlar a captura, quando ela
é por disparo (laço indutivo, laser). O NEURAL SERVER espera o sinal numa porta: a variável `io_port` no
DB Manager e a **LOCAL PETITON PORT** (grafia do fabricante) na configuração; a tela de opções chama de
"Puerto para cámaras por trigger", padrão `8040`.

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Alarm>
  <Source><IdSource>IDSOURCE</IdSource></Source>
  <AlarmDetail>
    <AlarmType>ALARMTYPE</AlarmType>
    <ExtraFields>
      <EF Name="CameraMask">CAMERAMASK</EF>
      <EF Name="PathImage">c:\tmp</EF>
      <EF Name="PathEvidence">c:\tmp</EF>
      <EF Name="SaveNoPlate">True</EF>
      <EF Name="ExtraInfo2">Peso</EF>
    </ExtraFields>
  </AlarmDetail>
</Alarm>
```

- `IdSource` (opcional): identifica o trigger; volta na resposta como `Id_Event`.
- `CameraMask`: máscara de bits das câmeras, `2^(numcam - 1)`. `1` só a câmera 1, `3` as câmeras 1 e 2,
  `65535` todas.
- `PathImage` e `PathEvidence`: pastas onde gravar imagens e evidências. `SaveNoPlate` `True` grava as
  imagens sem placa (padrão `False`). `ExtraInfo2`: campo livre ligado à placa (peso, motorista).

| `AlarmType` | Efeito |
| --- | --- |
| `0` | Captura X segundos ou X imagens e devolve o primeiro reconhecimento válido ou a não leitura |
| `10` | Captura sem prazo até achar um resultado válido ou receber `20` |
| `20` | Para a captura iniciada por `10` ou `30` |
| `30` | Captura sem prazo devolvendo todos os resultados válidos até receber `20` |
| `40` | Como o `0`, devolvendo todos os reconhecimentos válidos |
| `62` | Captura uma imagem e grava em `PathImage` ou `PathEvidence` |
| `70` | Para a câmera indicada |
| `71` | Ativa uma câmera desativada |
| `73` | Pede a lista das câmeras ativas |

Resposta do `73`:

```xml
<infoevent>
  <DateHour>2017-10-10T11:22:51.395</DateHour>
  <Path></Path>
  <EVPath></EVPath>
  <EventID>73</EventID>
  <Code>131072</Code>
  <Feedback>INFOCAM</Feedback>
</infoevent>
```

`Code` é a máscara das câmeras ativas, na mesma regra do `CameraMask`. É a única pergunta sobre câmeras
que o NEURAL SERVER responde por este canal, e só diz **quais números de câmera estão ativos**, sem nome,
endereço nem série. Isso sugere que o `CamID` é número de ordem dentro do equipamento (o documento não
diz como ele é atribuído).

## Anexo: códigos da analítica do veículo

**Vehicle type** (`VehicleType`): 0 UNKNOWN, 1 GENERIC, 2 MOTORBIKE, 3 MOPED, 4 TRUCK, 5 TRANSPORT, 6 HEAVY, 7 TRAILER, 8 BUS, 9 PUBLIC_SERVICE, 10 TAXI, 11 POLICE, 12 AMBULANCE, 13 FIREFIGHTERS, 14 MILITARY, 15 DIPLOMATIC, 16 GOVERNMENT, 17 DEALER, 18 TEMPORAL, 19 SPECIAL, 20 PERSONALIZED, 21 AGRICULTURAL, 22 DISABLED, 23 COMMERCIAL, 24 ASSOCIATION, 25 HAZARD, 26 HIRE, 27 APPORTIONED, 28 VAN (todos com prefixo `PLATE_TYPE_`).

**Vehicle class** (`VehicleClass`): 0 Unknown, 1 Motorbikes, 2 Cars, 3 Vans, 4 Trucks, 5 Bus.

**Vehicle color** (`VehicleColor`): WHITE, GREY, BLACK, RED, ORANGE, YELLOW, GREEN, BLUE, PURPLE, UNKNOW.

**Vehicle make** (`VehicleMake`): AUDI, BMW, CHEVROLET, CITROEN, DACIA, FIAT, FORD, HONDA, HYUNDAI, KIA, LEXUS, MAZDA, MERCEDES, MITSUBISHI, NISSAN, OPEL, PEUGEOT, RENAULT, SEAT, SKODA, SUBARU, SUZUKI, TOYOTA, VOLKSWAGEN, VOLVO, UNKNOWN, ACCURA, DODGE, JEEP, PONTIAC, CHERY, DFM, GREAT WALL, JAC, LAND ROVER, MAHINDRA, MG, MINI, SAMSUNG, SSANGYONG.

## Relacionado

- [[Neural Labs - Vínculo de câmeras]]: o que cada canal diz sobre a câmera.
- [[Neural Labs - Arquitetura e estratégias]]: como o Attlas recebe esse XML.
