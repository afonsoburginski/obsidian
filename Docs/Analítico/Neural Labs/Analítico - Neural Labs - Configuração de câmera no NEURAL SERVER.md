---
tags:
  - doc
  - analitico
  - neural-labs
  - lpr
aliases:
  - "Configuração de câmera no NEURAL SERVER"
  - "Manual do NEURAL SERVER"
  - "Neural Labs - Configuração de câmera no NEURAL SERVER"
atualizado: 2026-10-06
---

# Analítico - Neural Labs - Configuração de câmera no NEURAL SERVER

Como o NEURAL SERVER é instalado e como cada câmera é cadastrada nele. Fonte principal: **"NEURAL SERVER Manual del Usuario" v.4.2.0.0** (69 páginas, última alteração 10/10/2018), publicado pelo distribuidor Casmar. Complementos: o manual em inglês do VPAR SERVER (nome antigo do produto, 2017) e o guia de instalação com o Milestone (v2, 30/05/2019). Links em [[Analítico - Neural Labs - Produtos e documentação]]. Índice da pasta em [[Analítico - Neural Labs]].

> [!warning] Versão do manual
> O manual público é de 2018. A Neural Labs está hoje na linha 5.x (a integração com o Nx Witness cita a versão 5.5.1.1, de 21/08/2025). A estrutura descrita aqui é a que o fabricante publicou; o que mudou desde então só a Neural Labs confirma.

## Arquitetura

- Servidores de reconhecimento, cada um com o software NEURAL SERVER e licenças para N câmeras.
- **Banco SQL Server** (ou SQL Server Express) que guarda **a configuração** e as leituras.
- Câmeras ligadas por TCP/IP (ou DirectShow, USB) ao servidor.
- **Até 16 câmeras por servidor** no manual de 2018: "Inicialmente el número máximo de cámaras que pueden conectarse a un único servidor es de 16", uma limitação de capacidade do hardware. "La gestión de más de 16 cámaras se realiza mediante el uso de varios servidores que trabajan como una misma solución."
- Protocolos de captura: RTSP, GigE Vision, JPG, Motion JPEG, DirectShow, AVI, pasta de imagens, pasta de vídeos, uEye IDS, Milestone e Point Grey.

Para as cerca de 800 câmeras da instalação, isso quer dizer **dezenas de servidores NEURAL SERVER**, cada um com o seu `ComputerID`, se o limite de 16 continuar valendo na versão instalada.

## Primeira execução

1. **Banco de configuração**: o NEURAL SERVER pede `Server` (IP e instância, exemplo `localhost\VPARSQLSERVER`), `Database` (sugerido `ANPR`), `User` (precisa ser `sysadmin`) e `Password`. Na primeira vez ele cria o banco.
2. **Computer ID**: "Este ID es un identificador de la instancia del programa asociado al codigo de licencia. Si la licencia se cambia el sistema volverá a solicitar el Computer ID. Se puede usar un ID existente o crear uno nuevo. Toda la información registrada estará asociada a este identificador." O padrão é `COMPUTER_ID=1`. "En caso de tener una arquitectura distribuida es aconsejable cada punto determinarlo con un Computer ID diferente para poder distinguir sus capturas en el sistema central."
3. Região e país das placas.

Consequências para o Attlas:

- O `ComputerID` é **escolhido pelo operador** e ligado à licença; trocar a licença pede o número de novo.
- A unicidade entre servidores é só uma recomendação. Dois servidores podem ter o mesmo `ComputerID` quando chegam ao Attlas por IPs diferentes, porque o Attlas separa pela instância (o IP de origem da conexão). Atrás do mesmo NAT eles chegam com o mesmo IP e precisam de `ComputerID` diferente.

## Cadastro de uma câmera

A tela principal tem nove abas; a de câmeras é "Cameras". Cada câmera tem as abas Info, General, Connection, Input, Imagen, Dorlet, Calibration e Web.

### Aba Info (só leitura)

Resume a câmera: `ID` (exemplo `3`), `Name` (`LPR Calle`), `Type` (`RTSP: Video Stream RTSP`), `Size` (`1920 X 1080`), **`URL` (`192.168.1.58/live.sdp`)**, `Evidence camera` (`NO` é modo LPR) e `Input mode` (`Motion detection`).

### Aba General

- **ID Cámara**: "Identificador único de cámara, de uso interno y no debe repetirse."
- **Nombre**: "Descripción de la cámara."
- **Localización**: "Ubicación de la cámara. Este dato es importante porque el sistema permite agrupar resultados por este criterio." Cada localidade tem **nome, latitude, longitude e endereço** (tela de edição do manual). Câmeras da mesma localidade podem ser agrupadas para devolver a melhor leitura do grupo ("FILTRAR POR LOCALIZACIÓN").
- **FPS** máximo processado, **MJPEG port** (compartilhar a câmera em MJPEG), **Cámara de Evidencia** (não lê placa, grava vídeo) e **Enable recording**.
- **Engine Type**: `LPR` (placa) ou `ACCR` (contêiner).
- **Analíticas**: câmera dual, velocidade, classificação, marca e cor (exigem calibração).
- **Dorlet camera**, **IO camera** e **Associated cameras** (câmeras de evidência ligadas a esta câmera LPR).

### Aba Connection

- **Tipo**: MJPG, JPG, DS (DirectShow), AVI, DIR, SDIR, PATH, AVIPATH, **RTSP**, RTSP_FFMPEG (com aceleração de hardware), IDS, MIL (câmera do Milestone), GIGE, AVT, PTG, GHOSTNLR (câmeras GHOST da Neural Labs).
- **URL**: "la dirección en la cual el sistema intentará encontrar la señal de video". Para RTSP, "Ruta HTTP de acceso al streaming RTSP" (no exemplo, `192.168.1.58/live.sdp`, sem o `rtsp://`). Para MIL, o nome da câmera no Milestone. Para GIGE, o IP da câmera. Para PTG, o número de série da câmera.
- **Login** e **Password** do stream (MJPEG, JPG ou RTSP).
- **Relay** e **RTSP Caching** (exemplo `1000`), e o botão **Test Camera**.
- **Asistente ONVIF**: descobre câmeras ONVIF na rede local; ao salvar, os dados de conexão vão para a configuração da câmera. Há também "Añadir manual".

**É na URL que está o endereço da câmera Hikvision que a Neural Labs lê.** Ela fica guardada no banco de configuração do servidor.

## Parâmetros de rede (aba de opções)

- **Puerto para cámaras por trigger**: porta TCP dos triggers externos, padrão `8040`.
- **Sending Connection**: envio das leituras, em dois modos. "Cliente mode: Actúa como cliente y se conecta a un único equipo" (IP e porta); "Server mode: Actúa como servidor, puede aceptar varias conexiones". Formato **XML ou JSON**; o socket pode fechar a cada envio ou ficar aberto; a imagem lida pode ir no XML.
- **HeartBeat IP, Port, Seconds e type** (XML ou JSON): trama periódica de estado. O formato do heartbeat do NEURAL SERVER não é descrito no manual; o do Orchestrator está em [[Analítico - Neural Labs - Heartbeat e eventos do Orchestrator]].
- **Synchronize remote DB**: "NEURAL server intentará enviar los datos detectados a una base de datos remota", de X em X segundos ou por comando. É assim que vários servidores alimentam um banco central.
- **Integration (CL_CODE)**: "Para activar la integración con determinados grabadores de video o clientes. Dependiendo de la integración que se elija, el comportamiento del Neural Server será diferente en cada caso."
- Também: `Autoconexión en BD`, `EXTERNAL TIME` (sincronia com servidor de hora externo), `GPS`, `FILE RENAMING` e sobreposição de texto nas imagens.

O manual de 2018 remete a dois documentos não públicos: o "manual de Integración de Datos" (é o "NEURAL SERVER Data Integration", ver [[Analítico - Neural Labs - Envio XML do NEURAL SERVER]]) e a "Guía de instalación de cámaras para LPR y Analíticas de Tráfico".

## Como a Neural Labs casa câmeras com sistemas de vídeo (VMS)

- **Milestone XProtect** (guia v2, 30/05/2019): a câmera é ligada **pelo nome exato**. "In the “Name” parameter type the exact same name the camera has on you Milestone Server. The name has to be exactly the same as you see it on XProtect Smart Client." Depois o tipo da câmera vira `MIL`, e a URL passa a ser esse nome. O plugin do Smart Client lê **direto o SQL Server do NEURAL SERVER**, por um arquivo `NeuralPlugin.connectionString`.
- **Nx Witness** (ficha 473 do marketplace, 21/08/2025): no NEURAL SERVER escolhe-se a integração Nx Witness, informa-se IP, porta (padrão `7001`), usuário e senha do servidor Nx; na aba Connection, com o tipo Nx Witness, "all cameras available on our Nx Witness server will appear in CAM. Upon selecting the desired camera, the ID field ... will be automatically filled." Os eventos chegam no Nx como "Generic Event".
- Genetec, IndigoVision, Digifort, Pelco, NUUO e outros aparecem em material comercial, sem documentação pública de como casam as câmeras.

As integrações oficiais casam **pelo nome** ou **escolhendo a câmera do VMS dentro do NEURAL SERVER**. Nenhuma usa IP ou série.

## Relacionado

- [[Analítico - Neural Labs - Vínculo de câmeras]]
- [[Analítico - Neural Labs - Banco de dados do NEURAL SERVER]]
