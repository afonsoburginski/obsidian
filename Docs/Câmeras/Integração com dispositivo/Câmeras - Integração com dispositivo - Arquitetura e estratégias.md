---
tags:
  - doc
  - cameras
  - dispositivo
  - ms-cameras
aliases:
  - "Carga desnecessária nas câmeras - reconciler do analítico e conexões duplicadas"
  - "Integração com dispositivo - Arquitetura e estratégias"
atualizado: 2026-10-07
---

# Câmeras - Integração com dispositivo - Arquitetura e estratégias

Volta para [[Câmeras - Integração com dispositivo]].

## Resumo

Duas portas isolam o protocolo do resto do `ms-cameras`. O `ICameraDriver`, com estado, abre sessão,
executa PTZ e lê o encoder, e tem uma única implementação, o `OnvifDriver` genérico. O
`ICameraCommunicationStrategy`, sem estado, só monta a URL RTSP do stream, com uma estratégia por protocolo
(RTSP, ONVIF, ISAPI). VAPIX e ISAPI são chamados direto, fora das portas, para o que o ONVIF não cobre: zoom e
PTZ absoluto nativo na Axis, eventos, bitrate, codecs e a ativação do ONVIF na Hikvision. HTTP Digest serve aos
dois, pelo `AxisDigestClient`. Os passos estão em [[Câmeras - Integração com dispositivo - Fluxos]].

## Onde está no código

Caminhos relativos a `apps/ms-cameras/src/`.

| Caminho | Papel |
| --- | --- |
| `hardware/drivers/i-camera-driver.interface.ts` | Porta `ICameraDriver`: `connect`, `connectControl` opcional, `disconnect`, `getStatus`, `getStreamUrl`, `movePTZ`, `getNativeAnalytics` e `getEncoderConfig` opcionais |
| `hardware/drivers/camera-driver.factory.ts` | `CameraDriverFactory`, resolve o driver por `ProtocolType` |
| `hardware/drivers/onvif/onvif.driver.ts` | `OnvifDriver`, única implementação, sobre `@atmanadmin/node-onvif-ts` |
| `hardware/drivers/onvif/estimate-bitrate.util.ts` | Estimativa de bitrate pela resolução quando a câmera VBR não informa teto |
| `hardware/communication/i-camera-communication-strategy.interface.ts` | Porta `ICameraCommunicationStrategy`: `supports()` e `buildLiveStreamDescriptor()` |
| `hardware/communication/camera-communication-strategy.selector.ts`, `camera-communication-strategies.provider.ts` | Seletor e registro das estratégias, na ordem RTSP, ONVIF, ISAPI |
| `hardware/communication/strategies/` | `rtsp-`, `onvif-` e `isapi-camera-communication.strategy.ts` |
| `hardware/communication/strategies/helpers/rtsp-source-url.helper.ts`, `rtsp-defaults.constants.ts` | Montagem e normalização da URL RTSP; padrão `rtsp://<host>:554/stream1` |
| `hardware/enums/`, `hardware/types/` | `ProtocolType` (`ONVIF`, `ISAPI`, `RTSP`, `PROPRIETARY`), `StreamType`, `ConnectionState`, comandos PTZ, `ICameraStream`, `IDeviceBitrateConfig` |
| `cameras/services/ptz.service.ts` | Executa PTZ por ONVIF (pelo driver) e por VAPIX (direto) |
| `cameras/services/ptz-driver-pool.service.ts` | `PtzDriverPool`, mantém aberta a sessão ONVIF de controle de cada câmera |
| `cameras/utils/vapix-ptz.utils.ts`, `vapix-zoom.utils.ts` | Comandos Axis em `/axis-cgi/com/ptz.cgi` e conversões de unidade |
| `health/utils/digest-auth.utils.ts` | `AxisDigestClient`: HTTP Digest para VAPIX e ISAPI, inclusive `getStream` e `sendXml` |
| `health/clients/` | `axis-ws.client.ts`, `onvif-pullpoint.client.ts`, `hikvision-alert-stream.client.ts`, `hikvision-isapi-heartbeat.client.ts` |
| `health/utils/axis-rate-control.utils.ts`, `hikvision-rate-control.utils.ts`, `resolve-provisioned-bitrate.ts`, `health/device-bitrate.reader.ts` | Leitura do bitrate configurado no equipamento |
| `health/utils/axis-video-codecs.utils.ts`, `health/camera-video-codec.probe.ts` | Leitura dos codecs que o encoder Axis declara, gravados em `Camera.supportedVideoCodecs` |
| `health/utils/fetch-axis-ptz-position.utils.ts` | Posição PTZ atual da Axis por VAPIX |
| `health/utils/device-stream-group.util.ts`, `health/leases/device-key.util.ts` | Agrupam as linhas `Camera` por equipamento físico |
| `cameras/services/camera-credential-probe.service.ts` | Sondagem ONVIF do cadastro, com recurso ao ISAPI |
| `cameras/services/hikvision-isapi-probe.util.ts`, `hikvision-onvif-provisioning.util.ts` | Leitura ISAPI e ativação do ONVIF na Hikvision |
| `cameras/services/camera-registration-provisioning.service.ts` | Sequência de provisionamento por câmera, usada no cadastro e na edição |
| `cameras/services/camera-onvif-media-profile.reader.ts`, `camera-isapi-media-profile.reader.ts` | Inventário de perfis de mídia, ONVIF com recurso ao ISAPI |
| `streaming/services/camera-stream-source.resolver.ts` | Escolhe o perfil, o codec e a URL final do stream |
| `streaming/helpers/rtsp-credentials.helper.ts`, `hikvision-channel.helper.ts` | Credencial codificada uma única vez na URL; canal Hikvision por qualidade |
| `database/schema/camera/camera_credential.prisma` | `CameraCredential`, usuário e senha 1:1 com a câmera |

## Contratos

### Portas internas

| Porta | Padrão | Natureza | Quem escolhe |
| --- | --- | --- | --- |
| `ICameraDriver` | Adapter com Factory | Com estado: abre sessão, mede status, executa PTZ, lê o encoder | `CameraDriverFactory` |
| `ICameraCommunicationStrategy` | Strategy | Sem estado: só monta o descritor de stream | `CameraCommunicationStrategySelector` |

| `ProtocolType` na factory | Resultado |
| --- | --- |
| `ONVIF` | `new OnvifDriver(options.onvif)`; sem `options.onvif`, `ONVIF_OPTIONS_REQUIRED` |
| `RTSP` | `RTSP_HAS_NO_DRIVER`; RTSP é só estratégia |
| `PROPRIETARY` | `PROPRIETARY_PROTOCOL_NOT_SUPPORTED`; o registro de drivers por fabricante de `INT-004-proprietary-registry.md` não existe |
| Outro, inclusive `ISAPI` | `UNSUPPORTED_CAMERA_PROTOCOL`; nunca acontece na prática, porque a Hikvision usa o `OnvifDriver` depois que o cadastro liga o ONVIF |

| Estratégia | `supports()` | Descritor |
| --- | --- | --- |
| RTSP | `RTSP`, `RTSPS` | `primaryStreamUrl` normalizada, ou `rtsp(s)://<ip>:<porta>/stream1`; porta de 1 a 65535 |
| ONVIF | `ONVIF` | Exige `primaryStreamUrl` já descoberta, senão `ONVIF_STREAM_URL_NOT_DISCOVERED` |
| ISAPI | `ISAPI` | A URL do perfil registrado ou, sem ela, o IP no canal principal Hikvision; sem `ipAddress`, `ISAPI_STREAM_SOURCE_MISSING`. Não anexa parâmetro de codec, porque a Hikvision o ignora |

O descritor é sempre `ICameraStream { protocol: 'RTSP', sourceUrl, suggestedCodec, metadata? }`, que o
[[Câmeras - Streaming]] entrega ao MediaMTX, que puxa a câmera sob demanda. `RtspSourceUrl.normalize` aceita
`rtsp`, `rtsps`, `http` e `https`, prefixa `rtsp://` quando falta o esquema e põe IPv6 entre colchetes.

### Chamadas ao equipamento

| Protocolo | Endpoint | Para quê | Onde |
| --- | --- | --- | --- |
| ONVIF | `/onvif/device_service` e serviços descobertos | Sessão, `GetProfiles`, `GetStreamUri`, `ContinuousMove`, `AbsoluteMove`, `RelativeMove`, `Stop`, PullPoint | `OnvifDriver`, `OnvifPullPointClient`, sondagem |
| VAPIX | `/axis-cgi/com/ptz.cgi` | PTZ absoluto nativo, zoom contínuo e absoluto, posição (`query=position`) | `vapix-ptz.utils.ts`, `vapix-zoom.utils.ts`, `fetch-axis-ptz-position.utils.ts` |
| VAPIX | `/axis-cgi/param.cgi?action=list&group=Image.I0.RateControl` | Modo de controle de taxa (MBR, ABR, VBR) e alvo | `axis-rate-control.utils.ts` |
| VAPIX | `/axis-cgi/param.cgi?action=list&group=Properties.Image` | Codecs do encoder (`Format`) e perfis AV1 | `axis-video-codecs.utils.ts` |
| VAPIX | `/axis-cgi/jpg/image.cgi` | Quadro JPEG | `AxisDigestClient.getBuffer` |
| VAPIX | token de sessão do WebSocket e o WebSocket de eventos | Eventos e heartbeat da Axis | `AxisDigestClient.fetchWsSessionToken`, `AxisWsClient` |
| ISAPI | `/ISAPI/Event/notification/alertStream` | Eventos e heartbeat da Hikvision, conexão HTTP que não fecha | `HikvisionAlertStreamClient` |
| ISAPI | `/ISAPI/System/status` | Heartbeat de reserva por consulta periódica, quando o alertStream responde 404 | `HikvisionIsapiHeartbeatClient` |
| ISAPI | `/ISAPI/System/deviceInfo`, `/ISAPI/Streaming/channels` | Identidade e canais de vídeo na sondagem | `hikvision-isapi-probe.util.ts` |
| ISAPI | `/ISAPI/Streaming/channels/<id>` | Bitrate configurado | `hikvision-rate-control.utils.ts` |
| ISAPI | `/ISAPI/System/Network/Integrate`, `/ISAPI/Security/ONVIF/users` | Ligar o ONVIF e criar a conta ONVIF | `hikvision-onvif-provisioning.util.ts` |

### Tabela do banco

| Modelo | Arquivo | Papel |
| --- | --- | --- |
| `CameraCredential` | `database/schema/camera/camera_credential.prisma` | Usuário e senha em texto puro, 1:1 com a câmera; o acesso aos equipamentos é restrito por VPN |

A credencial chega aos clientes de saúde pelo token `CAMERA_CREDENTIAL_PROVIDER`, hoje ligado ao
`CameraCredentialProvider`, que lê o banco. Trocar para um provedor do gateway de autenticação está marcado
como TODO em `health/types/health.types.ts`.

### Códigos de erro

Toda falha é `DomainException` de `@attlas/core-common`, nunca `Error` cru.

| Código | Exceção | Quando |
| --- | --- | --- |
| `CAMERA_UNREACHABLE` | `ExternalServiceException` | Timeout de sessão ou de comando ONVIF; falha de I/O no VAPIX |
| `EXTERNAL_SERVICE_ERROR` | `ExternalServiceException('camera-onvif')` | Erro de I/O ONVIF que não é timeout |
| `ONVIF_OPTIONS_REQUIRED`, `RTSP_HAS_NO_DRIVER`, `PROPRIETARY_PROTOCOL_NOT_SUPPORTED`, `UNSUPPORTED_CAMERA_PROTOCOL` | `InvalidInputException` | Factory |
| `ONVIF_STREAM_URL_NOT_CACHED`, `ONVIF_STREAM_URL_NOT_DISCOVERED` | `InvalidInputException` | URL pedida antes da descoberta |
| `UNSUPPORTED_PTZ_COMMAND_TYPE`, `UNSUPPORTED_PTZ_ACTION` | `InvalidInputException` | Comando PTZ que o driver não conhece |
| `ONVIF_NATIVE_ANALYTICS_NOT_IMPLEMENTED` | `BusinessRuleViolationException` | `getNativeAnalytics()` |
| `UNSUPPORTED_CAMERA_COMMUNICATION_PROTOCOL` | `InvalidInputException` | Seletor sem estratégia para o protocolo |
| `STREAM_PROFILE_NOT_CONFIGURED`, `STREAM_SOURCE_URL_INVALID` | `BusinessRuleViolationException` (409) | Nenhum perfil ativo na cadeia de qualidade; URL final que o MediaMTX não aceita |

## Por que é assim

### Duas portas, dois padrões

O que é só streaming fica atrás da estratégia; o que tem estado fica atrás do driver. A regra está comentada
nos dois contratos. Isolar o protocolo é o que permite integrar fabricante novo sem tocar em streaming, PTZ e
saúde. Na prática, o `OnvifDriver` cobre qualquer câmera Profile S, e chamada proprietária só entra quando o
ONVIF não basta: recurso que ele não expõe (zoom da Axis em câmera fixa) ou firmware que sai de fábrica com
ONVIF desligado (Hikvision).

### ONVIF primeiro, proprietário só onde falta

| Protocolo | Papel | Como |
| --- | --- | --- |
| ONVIF Profile S | Obrigatório e preferido | `OnvifDriver`; PTZ por `ContinuousMove`, `AbsoluteMove`, `RelativeMove` e `Stop`; bitrate pelo encoder |
| RTSP e RTSPS | Vídeo | Sem driver; a estratégia só monta a URL |
| VAPIX (Axis) | Proprietário, chamado direto | Zoom em câmera fixa, PTZ absoluto em unidades nativas, eventos por WebSocket, posição PTZ, controle de taxa e codecs |
| ISAPI (Hikvision) | Proprietário, chamado direto | Stream pelo IP e canal, eventos por alertStream com consulta de status como reserva, bitrate por canal, ativação do ONVIF no cadastro. Depois disso, PTZ e perfis da Hikvision seguem pelo `OnvifDriver` |
| Dahua, Bosch e outros | Por ONVIF | Sem código dedicado |

### O que o `OnvifDriver` faz

- `connect()`: `servicesInit()`, heartbeat e cache da URL do perfil PRIMARY, e do SECONDARY quando há
  `secondaryMediaProfileToken`.
- `connectControl()`: só `servicesInit()`, o mapa de serviços que um comando PTZ precisa, sem heartbeat nem
  descoberta de stream.
- `getStreamUrl(type)`: a URL guardada no `connect`; ausente, `ONVIF_STREAM_URL_NOT_CACHED`.
- `movePTZ(command)`: despacha para `absoluteMove`, `relativeMove`, `continuousMove` ou `stop`. O relativo
  aceita passo fixo das setas ou uma translação explícita vinda de plano. O contínuo envia `Timeout` como
  número, para a biblioteca serializar `PT<n>S` e o equipamento parar sozinho. Absoluto e contínuo sem pan e
  tilt mandam só o eixo de zoom.
- `executeHeartbeat()`: mede a latência sobre `deviceInformationInit()` e atualiza `ConnectionState`.
- A URI RTSP devolvida pela câmera recebe a credencial e o host de `ipSocketAddresses.rtsp`, para funcionar
  atrás de NAT, proxy ou túnel.
- `getEncoderConfig(mediaProfileToken?)`: bitrate, codec e resolução do encoder sem abrir stream, com 10 s de
  orçamento. Valor a partir de `MAX_SANE_BITRATE_KBPS` (1 000 000 kbps) é tratado como o sentinela de "sem
  limite" do VBR e trocado por uma estimativa pela resolução; sem resolução, devolve `null`.
- `getNativeAnalytics()`: não implementado.

### Sessão de controle PTZ reaproveitada

Abrir uma sessão ONVIF custa várias chamadas SOAP, e um toque no joystick é um início e uma parada separados
por frações de segundo. Por isso o `PtzDriverPool` mantém a sessão de controle de cada câmera aberta entre
comandos, aberta por `connectControl()` no primeiro uso. A entrada é reaproveitada enquanto as opções de
conexão (hash SHA-256) não mudam e fica válida por 120 s depois do último comando
(`PTZ_DRIVER_IDLE_TTL_MS`). Um comando que falha descarta a sessão, e o próximo abre outra.

### Bitrate e codecs lidos do equipamento

O `DeviceBitrateReader` lê o bitrate que a câmera vai usar, sem abrir stream, e `resolveProvisionedBitrate`
combina as leituras:

| Leitura | Onde no equipamento | Regra |
| --- | --- | --- |
| ONVIF | `GetProfiles`, pelo `OnvifDriver.getEncoderConfig` | Valor base, qualquer câmera ONVIF |
| VAPIX | grupo `Image.I0.RateControl` | Axis: modo MBR, ABR ou VBR; em ABR, o alvo planejado substitui o valor |
| ISAPI | `Streaming/channels/<id>` | Hikvision: `constantBitRate` ou `vbrUpperCap` sempre vence, porque o ONVIF da Hikvision em VBR devolve o sentinela |

Uma câmera é Axis ou Hikvision, então no máximo um enriquecimento se aplica. A leitura é só de consulta e não
bloqueia nada: falha devolve `null` e o valor anterior fica. Na mesma passada, o `CameraVideoCodecProbe` lê
`Properties.Image.Format` da Axis e grava em `Camera.supportedVideoCodecs` os codecs que o vídeo ao vivo
negocia (H.264, H.265 e AV1, este só com o perfil Main declarado); a coluna só é reescrita quando a lista muda.
Quem chama, com que frequência e como o número é usado está em [[Câmeras - Streaming - Banda e bitrate]] e
[[Câmeras - Streaming - Codecs]].

### Credencial codificada uma vez na URL

O `withRtspCredentials` põe exatamente uma credencial na URL, codificada em percent-encoding, e é idempotente.
Sem isso, uma senha com `#`, `?` ou `/` era injetada duas vezes e o MediaMTX recusava a configuração do path.
A URL final que o MediaMTX não aceitaria é recusada antes, com 409 `STREAM_SOURCE_URL_INVALID`, e a URL nunca
entra na mensagem de erro, porque carrega a senha.

### Digest único para VAPIX e ISAPI

O `AxisDigestClient` faz o desafio Digest: primeira chamada, `401` com `WWW-Authenticate`, cálculo MD5 e
reenvio com `Authorization: Digest`. Ele autentica VAPIX e também os clientes ISAPI, a leitura de bitrate ISAPI
e a ativação do ONVIF (`sendXml`); o nome ficou por decisão registrada no código, porque renomear toca uma dúzia
de chamadas.

- `get` e `sendXml` têm timeout de 5 s, e `getBuffer` (imagem) de 8 s.
- `getStream` devolve a resposta em fluxo para o alertStream ISAPI, que não fecha; só a fase de cabeçalho tem
  timeout. Lança `DigestRequestError` com o status, para separar 404 (firmware sem o endpoint) de 401.
- Qualquer 2xx é sucesso; o AxisOS 11 responde `204` no `ptz.cgi`.
- `fetchWsSessionToken` obtém o token de cerca de 15 s que abre o WebSocket de eventos da Axis.

### Uma conexão por equipamento físico

A mesma câmera física é cadastrada uma vez por sistema, e há seis sistemas. Por isso tudo que fala com o
equipamento deduplica por endereço: os clientes de saúde abrem uma conexão por equipamento, com chave no canal
mais o endereço (`health/leases/device-key.util.ts`) e uma lease Redis por chave, e as escritas se repetem para
todas as linhas do mesmo equipamento. A telemetria agrupa pela URL do stream (`device-stream-group.util.ts`),
porque um encoder multicanal tem vários streams atrás do mesmo IP. Mecânica em
[[Câmeras - Saúde e monitoramento - Arquitetura e estratégias]].

## Armadilhas conhecidas

- **Escrita periódica no equipamento derruba o equipamento.** No ACAP do analítico embarcado, um
  `PUT /config` de `source_id` reinicia o pipeline e desliga o producer por cerca de 20 s. Um laço que religa o
  producer e reescreve o `source_id`, rodando em mais de uma instalação, mantém o equipamento reiniciando sem
  fim. Por isso não existe reconciliador periódico: `source_id` e broker só são escritos pelo gesto do
  operador (`BindAnalyticDeviceCommand`, no Sincronizar da instância e no cadastro). O reparo automático
  (`analytics-realtime/analytics-producer-repair.service.ts`) só liga o producer, só dos equipamentos listados
  em `ANALYTICS_OWNED_DEVICE_SOURCE_IDS`, e no máximo uma vez a cada 120 s por câmera. Com a variável vazia,
  nada automático escreve em equipamento. Detalhe do vínculo em [[Analítico]].
- **Seed que aponta para equipamento real vira escritor sem dono.** Valor gravado num equipamento compartilhado
  não pode ser constante versionada; por isso o `source_id` da câmera embarcada do seed vem de
  `SEED_ATMAN_EMBEDDED_SOURCE_ID`, e a senha das câmeras de bancada de `SEED_CAMERA_PASSWORD`.
- **O IP de origem no log do equipamento não identifica o cliente.** Pedido que atravessa o subnet router da
  tailnet chega com o IP do router. Para achar quem escreveu, compare o `source_id` corrente do equipamento
  com o `deviceSourceId` do banco de cada instalação candidata.
- **Conexão por linha multiplica a carga.** Sem a deduplicação por endereço, seis sistemas abririam seis
  conexões VAPIX por câmera, cada uma com ping de 5 s, e o rastreio de posição PTZ (leitura com digest a cada
  750 ms, duas idas e voltas) chegaria a cerca de 16 pedidos por segundo no mesmo equipamento.
- **A biblioteca ONVIF devolve `http://` no `GetStreamUri`.** A sondagem força `rtsp://` antes de gravar.
- **A biblioteca ONVIF preenche `ptz.range` com zeros em todo perfil.** Só uma faixa real de pan ou tilt prova
  PTZ; zoom sozinho não conta.
- **Parâmetro de bitrate na URL atrasa a Axis.** Com `videobitratemode=mbr` e teto na URL, a Axis leva cerca de
  12 s para responder o RTSP e o MediaMTX desiste da fonte. A URL de AV1 sai sem `videobitrate`, e o AV1 fica
  atrás de `STREAM_AV1_ENABLED`, desligado por padrão.

> [!warning] A leitura de bitrate ISAPI não tem prova registrada contra equipamento
> O comentário de `hikvision-rate-control.utils.ts` afirma que não há Hikvision na rede. Há uma de bancada
> ([[Câmeras - Integração com dispositivo - Runbook]]), validada em streaming, saúde e credencial; a leitura de
> bitrate por ISAPI especificamente segue sem validação registrada.

## Glossário

| Termo | O que é |
| --- | --- |
| ONVIF Profile S | Padrão aberto de câmera IP para vídeo, PTZ e eventos, por SOAP sobre HTTP |
| VAPIX | API HTTP proprietária da Axis (`/axis-cgi/...`) |
| ISAPI | API HTTP proprietária da Hikvision (`/ISAPI/...`) |
| ACAP | Aplicação que roda dentro da câmera Axis; o analítico embarcado é uma |
| HTTP Digest | Autenticação em que a senha nunca trafega: cliente e câmera trocam um desafio e um hash MD5 |
| PullPoint | Assinatura ONVIF de eventos em que o cliente pede as mensagens em ciclos de espera longa |
| alertStream | Conexão HTTP da Hikvision que fica aberta entregando eventos em partes |
| Sentinela VBR | Valor 2 147 483 647 (o maior inteiro de 32 bits) que a câmera em bitrate variável devolve no lugar do teto real |
| MBR, ABR, VBR | Modos de controle de taxa da Axis: teto máximo, média alvo e variável |
| Descritor de stream | `ICameraStream`, a URL RTSP final com o codec sugerido, entregue ao MediaMTX |
