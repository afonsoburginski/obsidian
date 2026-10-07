---
tags:
  - doc
  - cameras
  - dispositivo
  - ms-cameras
aliases:
  - "Integração com dispositivo - Fluxos"
atualizado: 2026-10-07
---

# Câmeras - Integração com dispositivo - Fluxos

Volta para [[Câmeras - Integração com dispositivo]].

## Resumo

Esta camada não tem tela própria: cada fluxo é disparado por um consumidor ([[Câmeras - PTZ e presets]],
[[Câmeras - Streaming]], [[Câmeras - Saúde e monitoramento]], [[Câmeras - Cadastro]]), e aqui fica só o trecho
que fala com o equipamento. Caminhos relativos a `apps/ms-cameras/src/`.

| Fluxo | Gatilho | Resultado |
| --- | --- | --- |
| [[#1. Comando PTZ por ONVIF]] | Rota de movimento, stop ou plano de resposta | Câmera se move pela sessão ONVIF de controle e grava uma linha `PTZ_COMMAND` |
| [[#2. Comando VAPIX na Axis]] | Ir para preset, passo de tour ou zoom | Câmera se move em unidades nativas pelo `ptz.cgi` |
| [[#3. Montagem da URL de stream]] | Pedido de sessão de vídeo | `ICameraStream` com a URL RTSP final para o MediaMTX |
| [[#4. Sondagem no cadastro e na edição]] | Validação de credencial, cadastro ou edição de endereço | Identidade, perfis e capacidades lidos da câmera |
| [[#5. Ativação do ONVIF na Hikvision]] | Sondagem encontra ONVIF desligado e ISAPI respondendo | ONVIF ligado e conta ONVIF criada no equipamento |
| [[#6. Canais de saúde]] | Início do monitoramento do equipamento | Conexão de eventos e heartbeat por fabricante |
| [[#7. Leitura de bitrate e codecs]] | Passada de dados do equipamento, no boot e a cada atualização | Bitrate configurado e codecs declarados gravados |

## 1. Comando PTZ por ONVIF

**Gatilho.** `executeOnvifPtz` em `cameras/services/ptz.service.ts`, chamado pelos handlers de movimento
relativo, absoluto, contínuo e stop, e pelo `MovePtzByDeltaHandler` do plano de resposta. A autorização acontece
antes, na rota ([[Câmeras - PTZ e presets - Arquitetura e estratégias]]).

**Passos.**

1. `findForPtz` carrega câmera, credencial e perfil PRIMARY.
2. Guards: protocolo ONVIF, câmera com PTZ mecânico ou digital, `mediaProfileToken` e credencial.
3. Monta `IOnvifConnectionOptions`: ONVIF em `<ip>:<porta do perfil>`, RTSP em `<ip>:554` e o token do perfil.
4. `PtzDriverPool.acquire` devolve a sessão de controle já aberta da câmera ou cria um `OnvifDriver` e chama
   `connectControl()` sob timeout de 5 s.
5. Executa cada `movePTZ` em sequência, cada um sob timeout de 4 s.
6. Grava uma linha `PTZ_COMMAND` em `CameraEventLog`.

**Resultado.** Câmera em movimento e linha de auditoria gravada. A Hikvision passa por este mesmo caminho
depois que o cadastro liga o ONVIF (fluxo 5).

**Erros.** Timeout vira `ExternalServiceException('camera-onvif')` com `CAMERA_UNREACHABLE`; outro erro de I/O
vira a mesma exceção com `EXTERNAL_SERVICE_ERROR`. Qualquer falha descarta a sessão do pool, e o próximo comando
abre outra. `DomainException` de guard propaga sem ser reembrulhada. Lista de comandos vazia é
`PTZ_PIPELINE_NO_COMMANDS`, erro de programação do chamador.

## 2. Comando VAPIX na Axis

**Gatilho.** `executeVapixAbsolute`, `executeVapixAbsoluteZoom`, `executeVapixZoom` e
`executeVapixZoomStop` em `ptz.service.ts`. Não passam pela factory nem pelo driver.

**Passos.**

1. `loadForVapix` carrega id, IP e credencial, sem guard de ONVIF nem de tipo; por isso vale para câmera fixa
   com zoom.
2. Monta o comando em unidades nativas (graus de pan e tilt, zoom de 1 a 9999): `vapixAbsolutePtz`
   (`ptz.cgi?pan&tilt&zoom&speed`), `vapixAbsoluteZoom` ou `vapixContinuousZoom` (`continuouszoommove`).
3. `AxisDigestClient.get()` faz o desafio Digest; qualquer 2xx é sucesso.
4. Grava uma linha `PTZ_COMMAND`; o stop de zoom não grava.

As conversões ficam em `cameras/utils/vapix-ptz.utils.ts`: `presetZoomLevelToVapix` leva 0 a 100% para 1 a
9999, e `speedPercentToVapix` leva 0 a 100% para 1 a 100.

**Resultado.** Câmera na posição pedida, na mesma unidade que o preset guarda.

**Erros.** Falha de rede ou de autenticação vira `ExternalServiceException('camera-vapix')` com
`CAMERA_UNREACHABLE`. Câmera sem credencial é 409 `CAMERA_CREDENTIAL_MISSING`. O stop de zoom nunca falha:
erro vira `warn` no log.

## 3. Montagem da URL de stream

**Gatilho.** `CameraStreamSourceResolver.resolve(cameraId, quality, requestedCodecs?)` em
`streaming/services/camera-stream-source.resolver.ts`, chamado quando o player pede uma sessão de vídeo. A
negociação de codec do ponto de vista do player está em [[Câmeras - Streaming - Codecs]].

**Passos.**

1. Percorre a cadeia de qualidade: PRIMARY só PRIMARY; SECONDARY e depois PRIMARY; TERTIARY, SECONDARY e
   depois PRIMARY. Para no primeiro perfil ativo; câmera e credencial só são lidas depois que um perfil casa.
2. `selector.select(camera.communicationProtocol)` escolhe a estratégia RTSP, ONVIF ou ISAPI.
3. `withRtspCredentials` põe a credencial na URL do perfil, codificada uma única vez.
4. Escolhe o codec: o primeiro da lista do cliente que a câmera serve. AV1 exige `STREAM_AV1_ENABLED`, AV1
   declarado em `supportedVideoCodecs` e URL `/axis-media/`; H.265 é recusado com analítico embarcado ativo;
   H.264 sempre serve. Sem lista do cliente, vale o codec do perfil, nunca AV1.
5. Escolhe a resolução: a do perfil quando ele é do tier pedido e a declara; senão a escada (SECONDARY
   1280x720, TERTIARY 640x360).
6. Ajusta a URL por fabricante. Na Axis (`/axis-media/`), acrescenta `videocodec`, `videokeyframeinterval`
   (calculado para caber em 300 ms de vídeo), `videozgopmode=fixed`, `h264profile=baseline` no H.264 e
   `resolution`; no AV1, tira `videobitrate`. Quando o codec não é H.264, monta também a URL reserva em H.264.
   Na Hikvision, troca o canal pelo do tier pedido. Outros fabricantes passam sem mudança.
7. `strategy.buildLiveStreamDescriptor` devolve o `ICameraStream`.
8. A credencial entra também na URL que a estratégia montou pelo IP, a Hikvision recebe o canal do tier, e a
   URL final é validada.

**Resultado.** `ICameraStream` com a URL RTSP final, o codec resolvido, a qualidade servida e, quando há, a URL
reserva em H.264. Na Hikvision, TERTIARY e SECONDARY abrem o mesmo canal secundário e compartilham o path do
MediaMTX.

**Erros.** Nenhum perfil ativo na cadeia é 409 `STREAM_PROFILE_NOT_CONFIGURED`. URL que o MediaMTX não aceita é
409 `STREAM_SOURCE_URL_INVALID`, sem a URL na mensagem. Estratégia ONVIF sem URL descoberta é
`ONVIF_STREAM_URL_NOT_DISCOVERED`.

## 4. Sondagem no cadastro e na edição

**Gatilho.** `probe(item)` em `cameras/services/camera-credential-probe.service.ts`, chamado por
`POST /cameras/validate-credentials`, de novo dentro de `POST /cameras`, e em segundo plano quando a edição
salva um endereço novo de câmera sem perfil de stream ativo. Nos dois últimos casos, a sequência completa é a
do `CameraRegistrationProvisioningService`: sondagem, perfis, saúde, vínculo do analítico embarcado e inventário
de perfis de mídia.

**Passos.**

1. `new OnvifDevice({ address, user, pass })` e `servicesInit()`, com 10 s para a conexão.
2. `deviceInformationInit()` e `mediaGetProfiles()` em `Promise.allSettled`, depois `mediaGetStreamUri`.
3. Identidade: fabricante, modelo, número de série, firmware e hardwareId.
4. Perfis: tokens, resolução, codec, fps, bitrate, `streamUrl` (esquema forçado para `rtsp://`) e snapshot.
   PTZ só conta com faixa real de pan ou tilt; o provisionamento promove a câmera a PTZ e nunca rebaixa.
5. Analítico embarcado: testa os transportes candidatos do ACAP dentro de um orçamento próprio. Esgotar o
   orçamento deixa `hasEmbeddedAnalytics` indefinido, nunca `false`.
6. Classifica o erro: 401 é `CAMERA_CREDENTIALS_INVALID`; timeout, `ECONNREFUSED` e `EHOSTUNREACH` são
   `CAMERA_UNREACHABLE`; 404 é `CAMERA_CREDENTIALS_UNSUPPORTED`; o resto é `CAMERA_CONNECTION_FAILED`.
7. Em `CAMERA_CREDENTIALS_UNSUPPORTED` (ONVIF desligado), confirma a credencial por ISAPI em
   `/ISAPI/System/deviceInfo`, lê os canais em `/ISAPI/Streaming/channels` e tenta ligar o ONVIF (fluxo 5),
   sondando de novo por ONVIF se der certo.

**Resultado.** A câmera declara as próprias capacidades, e é isso que permite cadastrar sem desenvolvimento por
fabricante. Sem os perfis lidos por ISAPI, a Hikvision seria salva sem stream e o player responderia 409 ao
pedir vídeo.

**Erros.** Os quatro códigos do passo 6 voltam ao cartão da câmera no assistente de cadastro. Na edição, a falha
do reprovisionamento em segundo plano não desfaz o salvamento.

## 5. Ativação do ONVIF na Hikvision

**Gatilho.** A sondagem (fluxo 4) confirmou a credencial por ISAPI e encontrou o ONVIF desligado. Vale no
cadastro, na validação de credenciais e no reprovisionamento da edição.

**Passos.**

1. `GET /ISAPI/System/Network/Integrate` mostra `<ONVIF><enable>false</enable></ONVIF>`.
2. `PUT` do mesmo recurso só com o bloco ONVIF ligado.
3. `GET` e `POST /ISAPI/Security/ONVIF/users`: as contas ONVIF são separadas das contas web, e o ONVIF pode
   estar ligado sem ninguém conseguir autenticar.
4. Relê `enable=true` e sonda de novo por ONVIF; o `GetProfiles` passa a responder com cerca de 2 s de atraso.

**Resultado.** Daí em diante, PTZ e perfis de mídia da Hikvision seguem o fluxo 1, e o ISAPI fica para o
stream (fluxo 3) e a saúde (fluxo 6). O fluxo foi validado contra a Hikvision de bancada
(`192.168.210.80`).

**Erros.** Sem efeito em caso de falha: fica a leitura ISAPI, e a câmera continua cadastrável.

## 6. Canais de saúde

**Gatilho.** O worker `health/workers/camera-health.worker.ts` começa a monitorar um equipamento; qual réplica
monitora qual equipamento é decidido por `health/leases/device-monitor-coordinator.service.ts`
([[Câmeras - Saúde e monitoramento - Arquitetura e estratégias]]). `resolveMonitoringOptions` escolhe o canal
pelo `manufacturer.code` no boot, na reconciliação e no cadastro.

**Passos.**

| Fabricante | Canal | Cliente | Heartbeat |
| --- | --- | --- | --- |
| `AXIS` | `AXIS_WEBSOCKET` | `AxisWsClient` | Tempo de ida e volta do ping e pong do WebSocket, em laço; token de sessão pelo digest; traduz tópicos de evento em `CameraEventCauseCode` e acompanha a posição PTZ enquanto `is_moving=1` |
| `HIKVISION` | `HIKVISION_ISAPI_ALERT_STREAM` | `HikvisionAlertStreamClient` | Cada parte `EventNotificationAlert` da conexão aberta em `/ISAPI/Event/notification/alertStream`; ignora o `videoloss` `inactive` que o equipamento repete; 30 s de silêncio é desconexão |
| `HIKVISION` sem alertStream | `HIKVISION_ISAPI_POLL` | `HikvisionIsapiHeartbeatClient` | `GET /ISAPI/System/status` a cada 15 s; 2 falhas seguidas antes de desconectar. O worker troca para este canal quando o alertStream responde 404 e o cliente emite `unsupported` |
| Outros | `ONVIF_PULLPOINT` | `OnvifPullPointClient` | Cada `PullMessages` (espera de até `PT5S`) bem-sucedido; assinatura com validade `PT60S` |

**Resultado.** Os eventos `connected`, `disconnected`, `error` e `heartbeat` alimentam snapshot, histórico e
EventBus. Avaliação de estado, incidentes e métricas pertencem à [[Câmeras - Saúde e monitoramento]].

**Erros.** Queda da conexão reconecta com espera crescente e variação aleatória. A queda vira evento
`HEALTH_OFFLINE` com causa `PUSH_DISCONNECT`.

## 7. Leitura de bitrate e codecs

**Gatilho.** A passada de dados do equipamento do `provisioned-bandwidth-collector.service.ts`, no boot e a
cada atualização.

**Passos.**

1. `DeviceBitrateReader.read` lê o encoder pelo `OnvifDriver.getEncoderConfig`, criado e descartado na própria
   leitura.
2. Na Axis, lê `Image.I0.RateControl`; na Hikvision, `Streaming/channels/<id>`.
3. `resolveProvisionedBitrate` combina as leituras pelas regras de
   [[Câmeras - Integração com dispositivo - Arquitetura e estratégias#Bitrate e codecs lidos do equipamento|Bitrate e codecs]].
4. Na Axis, o `CameraVideoCodecProbe` lê `Properties.Image` e grava `Camera.supportedVideoCodecs` se a lista
   mudou.

**Resultado.** Bitrate configurado e lista de codecs atualizados, usados pelo card de banda e pela negociação de
codec.

**Erros.** Qualquer falha devolve `null` e mantém o valor anterior; o heartbeat nunca é afetado.
