---
tags:
  - doc
  - ms-cameras
  - dispositivo
aliases:
  - "Carga desnecessária nas câmeras - reconciler do analítico e conexões duplicadas"
  - "Integração com dispositivo - Arquitetura e estratégias"
atualizado: 2026-10-01
---

# Câmeras - Integração com dispositivo - Arquitetura e estratégias

Parte da [[Câmeras - Integração com dispositivo]]. Caminhos relativos a `apps/ms-cameras/src/`.

## Mapa de código

| Peça | Arquivo | Papel |
| --- | --- | --- |
| Porta do driver | `hardware/drivers/i-camera-driver.interface.ts` | `ICameraDriver`, com estado: connect, disconnect, status, URL do stream, PTZ, analítico, `getEncoderConfig` opcional |
| Factory | `hardware/drivers/camera-driver.factory.ts` | Resolve o driver por `ProtocolType` |
| Driver ONVIF | `hardware/drivers/onvif/onvif.driver.ts` | Única implementação de `ICameraDriver`, ONVIF Profile S genérico sobre `@atmanadmin/node-onvif-ts` |
| Porta da estratégia | `hardware/communication/i-camera-communication-strategy.interface.ts` | `ICameraCommunicationStrategy`, sem estado: `supports()` e `buildLiveStreamDescriptor()` |
| Seletor e estratégias | `hardware/communication/camera-communication-strategy.selector.ts`, `strategies/{rtsp,onvif,isapi}-camera-communication.strategy.ts` | Montam o descritor de stream por protocolo |
| URL RTSP | `hardware/communication/strategies/helpers/rtsp-source-url.helper.ts`, `rtsp-defaults.constants.ts` | Fonte única de montagem e normalização da URL (default `rtsp://host:554/stream1`) |
| Enums e tipos | `hardware/enums/`, `hardware/types/` | `ProtocolType` (`ONVIF`, `ISAPI`, `RTSP`, `PROPRIETARY`), `StreamType`, `ConnectionState`, comandos PTZ, `ICameraStream`, `IDeviceBitrateConfig` |
| PTZ e zoom VAPIX | `cameras/utils/vapix-ptz.utils.ts`, `vapix-zoom.utils.ts` | Comandos Axis em `/axis-cgi/com/ptz.cgi` |
| Digest | `health/utils/digest-auth.utils.ts` (`AxisDigestClient`) | HTTP Digest, usado por VAPIX e ISAPI |
| Clientes de saúde | `health/clients/axis-ws.client.ts`, `onvif-pullpoint.client.ts`, `hikvision-alert-stream.client.ts`, `hikvision-isapi-heartbeat.client.ts` | WebSocket de eventos Axis, PullPoint ONVIF, alertStream e poll ISAPI |
| Bitrate configurado | `health/device-bitrate.reader.ts`, `health/utils/resolve-provisioned-bitrate.ts`, `axis-rate-control.utils.ts`, `hikvision-rate-control.utils.ts` | Lê o teto ou alvo configurado no equipamento |
| Sondagem | `cameras/services/camera-credential-probe.service.ts`, `hikvision-isapi-probe.util.ts`, `hikvision-onvif-provisioning.util.ts` | Descoberta no cadastro, fallback ISAPI, ativação do ONVIF na Hikvision |
| Inventário de perfis | `cameras/services/camera-onvif-media-profile.reader.ts`, `camera-isapi-media-profile.reader.ts` | Leitura ONVIF com fallback ISAPI para `CameraMediaProfile` |
| Credenciais | `database/schema/camera/camera_credential.prisma` | Usuário e senha 1:1 por câmera |

## Duas portas, dois padrões

| Porta | Padrão | Natureza | Quem escolhe |
| --- | --- | --- | --- |
| `ICameraDriver` | Adapter mais Factory | Com estado: abre conexão, mede status, executa PTZ, lê o encoder | `CameraDriverFactory` |
| `ICameraCommunicationStrategy` | Strategy | Sem estado: só monta o descritor de stream | `CameraCommunicationStrategySelector` |

Regra de fronteira, comentada nos dois contratos: o que é só streaming fica atrás da estratégia, o que tem
estado fica atrás do driver. Isolar o protocolo atrás de contrato é o que permite integrar fabricante novo
sem tocar em streaming, PTZ e saúde (RF-INT-05). Na prática o `OnvifDriver` genérico cobre qualquer câmera
Profile S, e adaptador dedicado só entra quando o ONVIF não basta: recurso que ele não expõe (zoom Axis em
câmera fixa) ou firmware que chega com ONVIF desligado (Hikvision, INT-018 a INT-020).

## Protocolos

| Protocolo | Estado | Como |
| --- | --- | --- |
| ONVIF Profile S | Obrigatório e preferido (RNF-CAM-02) | `OnvifDriver`; PTZ por `ContinuousMove`, `AbsoluteMove`, `RelativeMove` e `Stop`; bitrate configurado por `getEncoderConfig` |
| RTSP e RTSPS | Streaming | Sem driver; `RtspCameraCommunicationStrategy` só monta a URL |
| VAPIX (Axis) | Proprietário, chamado direto | Zoom em câmera fixa, PTZ absoluto em unidades nativas, eventos por WebSocket, posição PTZ, `RateControl` do bitrate; fora do par factory e driver |
| ISAPI (Hikvision) | Proprietário, chamado direto | Firmware sai de fábrica com `/onvif/device_service` respondendo 404; a estratégia ISAPI monta o stream pelo IP e canal; saúde por alertStream com poll de `GET /ISAPI/System/status` como fallback; bitrate em `Streaming/channels/<id>`. No cadastro o ONVIF é ligado no equipamento (INT-020) e PTZ e perfis seguem pelo `OnvifDriver` |
| Dahua, Bosch e outros | Via ONVIF | Sem adaptador dedicado |
| `PROPRIETARY` como driver | Não implementado | A factory lança `PROPRIETARY_PROTOCOL_NOT_SUPPORTED`; o registro de drivers por fabricante (`INT-004-proprietary-registry.md`) não existe |

## Factory

| `ProtocolType` | Resultado |
| --- | --- |
| `ONVIF` | `new OnvifDriver(options.onvif)`; sem `options.onvif`, `ONVIF_OPTIONS_REQUIRED` |
| `RTSP` | `RTSP_HAS_NO_DRIVER` (usar a estratégia) |
| `PROPRIETARY` | `PROPRIETARY_PROTOCOL_NOT_SUPPORTED` |
| qualquer outro, inclusive `ISAPI` | `UNSUPPORTED_CAMERA_PROTOCOL` |

`ISAPI` cair no default nunca é exercitado: a Hikvision usa o `OnvifDriver` para tudo que tem estado depois
que o cadastro liga o ONVIF, e o ISAPI só entra pela estratégia de streaming e pelos clientes de saúde.

### `OnvifDriver`

- `connect()`: `servicesInit()`, heartbeat, e guarda a URL do PRIMARY (e do SECONDARY se houver
  `secondaryMediaProfileToken`).
- `getStreamUrl(type)`: a URL guardada no connect; ausente, `ONVIF_STREAM_URL_NOT_CACHED`.
- `movePTZ(command)`: despacha para `absoluteMove`, `relativeMove`, `continuousMove` ou `stop`. O contínuo
  manda `Timeout` como número, para a biblioteca serializar `PT<n>S` e o equipamento parar sozinho.
- `executeHeartbeat()`: latência medida sobre `deviceInformationInit()`; atualiza `ConnectionState`.
- A URI RTSP devolvida pela câmera recebe credenciais e o host de `ipSocketAddresses.rtsp` (NAT, proxy, túnel).
- `getEncoderConfig(mediaProfileToken?)`: bitrate, encoding e resolução do encoder sem abrir stream; o
  sentinela "sem limite" do VBR é substituído por estimativa pela resolução (`estimate-bitrate.util.ts`, teto
  `MAX_SANE_BITRATE_KBPS` de 1.000.000 kbps).
- `getNativeAnalytics()`: não implementado, `ONVIF_NATIVE_ANALYTICS_NOT_IMPLEMENTED`.

## Estratégias e descritor de stream

Registro em `camera-communication-strategies.provider.ts`, na ordem `[rtsp, onvif, isapi]` (protocolos
disjuntos); o seletor devolve a primeira cujo `supports()` casa, senão
`UNSUPPORTED_CAMERA_COMMUNICATION_PROTOCOL`.

| Estratégia | `supports()` | Descritor |
| --- | --- | --- |
| RTSP | `RTSP`, `RTSPS` | `primaryStreamUrl` normalizada, ou `rtsp(s)://ip:porta/stream1`; porta 1 a 65535 |
| ONVIF | `ONVIF` | Exige `primaryStreamUrl` já descoberta, senão `ONVIF_STREAM_URL_NOT_DISCOVERED` |
| ISAPI | `ISAPI` | `primaryStreamUrl` registrada ou a URL do canal principal Hikvision; não anexa parâmetros de codec na URL, porque a Hikvision os ignora (INT-007) |

O descritor é sempre RTSP: `ICameraStream { protocol: 'RTSP', sourceUrl, suggestedCodec, metadata? }`. É o
que o [[Câmeras - Streaming]] entrega ao MediaMTX, que puxa a câmera sob demanda (INT-027). `RtspSourceUrl.normalize`
mantém `rtsp`, `rtsps`, `http` e `https` e prefixa `rtsp://` sem esquema; IPv6 vai entre colchetes.

## Bitrate configurado

Do lado do equipamento, o `DeviceBitrateReader` (`health/device-bitrate.reader.ts`) lê o bitrate que a
câmera vai usar, sem abrir stream, e `resolveProvisionedBitrate` combina as leituras:

| Leitura | Onde no equipamento | Regra |
| --- | --- | --- |
| ONVIF | `GetProfiles`, pelo `OnvifDriver.getEncoderConfig` | Valor base, qualquer câmera ONVIF |
| VAPIX | `param.cgi` grupo `Image.I0.RateControl` (`axis-rate-control.utils.ts`) | Axis: modo (MBR, ABR, VBR); em ABR o alvo planejado substitui o valor |
| ISAPI | `Streaming/channels/<id>` (`hikvision-rate-control.utils.ts`) | Hikvision: `constantBitRate` ou `vbrUpperCap` sempre vence, porque o ONVIF da Hikvision VBR reporta o sentinela |

Uma câmera é Axis ou Hikvision, então no máximo um enriquecimento se aplica. Somente leitura e best-effort:
falha devolve `null`. Quem chama, com que frequência, o sentinela VBR e como o número é usado:
[[Câmeras - Streaming - Banda e bitrate]].

> [!warning] Comentário do código diz que a leitura ISAPI nunca foi validada
> `hikvision-rate-control.utils.ts` afirma que não há Hikvision na rede. Há uma de bancada
> ([[Câmeras - Integração com dispositivo - Runbook]]),
> validada em streaming, saúde e credencial; a leitura de bitrate ISAPI especificamente segue sem prova
> registrada contra ela.

## Digest e credenciais

`AxisDigestClient` faz o desafio Digest (probe, `401` com `WWW-Authenticate`, MD5, reenvio com
`Authorization: Digest`). Autentica VAPIX e também os dois clientes ISAPI e a leitura de bitrate ISAPI; o
nome ficou por decisão registrada no código (renomear toca uma dúzia de chamadas).

- `get` e `getBuffer` com timeouts de 5 s (texto) e 8 s (buffer, como `image.cgi`).
- `getStream` devolve a resposta em fluxo, para o alertStream ISAPI, que nunca fecha; lança
  `DigestRequestError` com o status para distinguir 404 (firmware sem o endpoint) de 401.
- Qualquer 2xx é sucesso (AxisOS 11 responde `204` no `ptz.cgi`).
- `fetchWsSessionToken`: token de cerca de 15 s para abrir o WebSocket de eventos Axis.

`CameraCredential` guarda usuário e senha em texto puro, 1:1 com a câmera; o acesso aos equipamentos é
restrito por VPN. O provedor de credencial do gateway de autenticação (`CAMERA_CREDENTIAL_PROVIDER`) é TODO.

## Conexão por equipamento físico

Os clientes de saúde abrem uma conexão por equipamento, não por linha `Camera`: a chave do device é o canal
mais o endereço (`health/leases/device-key.util.ts`), e uma lease Redis por chave garante um único monitor no
cluster. As escritas abrem em leque para todas as linhas do mesmo equipamento. Mecânica em
[[Câmeras - Saúde e monitoramento - Arquitetura e estratégias]].

## Erros e timeouts

`DomainException` de `@attlas/core-common`, nunca `Error` cru.

| Código | Exceção | Quando |
| --- | --- | --- |
| `CAMERA_UNREACHABLE` | `ExternalServiceException` | Timeout ou falha de I/O no ONVIF ou VAPIX |
| `ONVIF_OPTIONS_REQUIRED`, `RTSP_HAS_NO_DRIVER`, `PROPRIETARY_PROTOCOL_NOT_SUPPORTED`, `UNSUPPORTED_CAMERA_PROTOCOL` | `InvalidInputException` | Factory |
| `ONVIF_STREAM_URL_NOT_CACHED`, `ONVIF_STREAM_URL_NOT_DISCOVERED` | `InvalidInputException` | URL pedida antes da descoberta |
| `ONVIF_NATIVE_ANALYTICS_NOT_IMPLEMENTED` | `BusinessRuleViolationException` | `getNativeAnalytics()` |
| `UNSUPPORTED_CAMERA_COMMUNICATION_PROTOCOL` | `InvalidInputException` | Seletor sem estratégia |

Timeouts: tabela completa em [[Câmeras - Integração com dispositivo - Requisitos e SLA]].

## Armadilhas conhecidas

- **Escrita periódica no equipamento derruba o equipamento.** No ACAP do analítico embarcado, um `PUT /config`
  de `source_id` reinicia o pipeline e desliga o producer por cerca de 20 s. Um laço que religa o producer e
  reescreve o `source_id`, rodando em mais de uma instalação, mantém o equipamento reiniciando para sempre.
  Por isso não existe reconciliador periódico: o `source_id` e o broker só são escritos pelo gesto do
  operador (`BindAnalyticDeviceCommand`, UC-216, no Sincronizar da instância e no cadastro), e o reparo
  automático (`analytics-realtime/analytics-producer-repair.service.ts`, INT-026) só liga o producer, só dos
  equipamentos declarados em `ANALYTICS_OWNED_DEVICE_SOURCE_IDS`, no máximo uma vez a cada 120 s por câmera.
  Com a env vazia, nada automático escreve em equipamento. Detalhe do vínculo em [[Analítico]].
- **Seed que aponta para equipamento real vira escritor sem dono.** Valor gravado num equipamento compartilhado
  não pode ser constante versionada; por isso o `source_id` da câmera embarcada do seed vem de
  `SEED_ATMAN_EMBEDDED_SOURCE_ID`.
- **O IP de origem no log do equipamento não identifica o cliente.** Pedido que atravessa o subnet router da
  tailnet chega com o IP do router (SNAT). Para achar quem escreveu, compare o `source_id` corrente do
  equipamento com o `deviceSourceId` do banco de cada instalação candidata.
- **Uma linha por tenant multiplica a carga no equipamento.** Como a mesma câmera física é cadastrada uma vez
  por sistema, tudo que fala com o equipamento precisa deduplicar por endereço; sem isso, seis sistemas
  abriam seis conexões VAPIX por câmera, cada uma com ping de 5 s, e o rastreio de posição PTZ (fetch digest a
  cada 750 ms, dois round-trips) chegava a cerca de 16 pedidos por segundo no mesmo equipamento.
- **A biblioteca ONVIF devolve `http://` no `GetStreamUri`.** A sondagem força `rtsp://` antes de gravar.
- **A biblioteca ONVIF preenche `ptz.range` com zeros.** Só faixa real de pan ou tilt prova PTZ.
