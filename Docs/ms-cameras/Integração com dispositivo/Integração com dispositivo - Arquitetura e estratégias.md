---
tags:
  - doc
  - ms-cameras
  - cameras
  - dispositivo
  - hardware
atualizado: 2026-08-24
---

# Integração com dispositivo - Arquitetura e estratégias

> Padrões centrais do adaptador multi-protocolo. Índice: [[Integração com dispositivo]]. Diagrama: [[02 - MOD-002 multi-protocol-adapter.excalidraw|diagrama]].

## Duas portas, dois padrões

A integração separa **operação stateful** de **construção stateless de URL** em dois contratos TS distintos:

| Porta | Contrato | Padrão | Natureza | Quem escolhe |
| --- | --- | --- | --- | --- |
| Driver | `ICameraDriver` (`hardware/drivers/i-camera-driver.interface.ts`) | **Adapter** + **Factory** | Stateful - abre conexão, mantém status, executa PTZ, lê bitrate configurado | `CameraDriverFactory` |
| Comunicação | `ICameraCommunicationStrategy` (`hardware/communication/i-camera-communication-strategy.interface.ts`) | **Strategy** | Stateless - só monta o descritor de stream | `CameraCommunicationStrategySelector` |

Regra de fronteira (comentada em ambos os contratos): **streaming-only vive atrás da estratégia; operação com estado vive atrás do driver**. RTSP, por não ter estado, **não tem driver** - pedir `createDriver(RTSP)` lança `RTSP_HAS_NO_DRIVER`. ISAPI (Hikvision) segue a mesma lógica só que sem erro dedicado - ver seção "Factory" abaixo.

## Factory - driver por protocolo

`CameraDriverFactory.createDriver(protocol, options?)` (`hardware/drivers/camera-driver.factory.ts`) despacha por `ProtocolType`:

| `ProtocolType` | Resultado |
| --- | --- |
| `ONVIF` | `new OnvifDriver(options.onvif)`; sem `options.onvif` → lança `ONVIF_OPTIONS_REQUIRED` |
| `RTSP` | Lança `RTSP_HAS_NO_DRIVER` (usar a estratégia) |
| `PROPRIETARY` | Lança `PROPRIETARY_PROTOCOL_NOT_SUPPORTED` - **registry não implementado** |
| _default_ (inclusive `ISAPI`) | Lança `UNSUPPORTED_CAMERA_PROTOCOL` |

`ISAPI` não tem `case` próprio no switch - cai no `default` genérico, ao contrário de `RTSP` (que ganhou um erro dedicado `RTSP_HAS_NO_DRIVER` pela mesma razão de não ter driver). Na prática isso nunca é exercitado: a Hikvision usa o `OnvifDriver` comum para tudo que é stateful (PTZ, perfis de mídia) depois que o cadastro **ativa o ONVIF automaticamente** no device (INT-020 - a firmware sai de fábrica com o ONVIF desligado). ISAPI só entra pela estratégia de comunicação (streaming) e pelos clients de saúde, nunca pela factory.

Hoje **só `OnvifDriver` implementa `ICameraDriver`**. A extensão prevista: implementar a interface em `hardware/drivers/<vendor>/`, registrar via `ProprietaryDriverRegistry` (`INT-004`) e rotear por `manufacturer.code` - ainda não existe (cabeçalho de `i-camera-driver.interface.ts` e `camera-driver.factory.ts`).

### `OnvifDriver` (Profile S)

- **`connect()`**: `servicesInit()` → `executeHeartbeat()` → cacheia URL do stream `PRIMARY` (e `SECONDARY` se houver `secondaryMediaProfileToken`).
- **`getStreamUrl(type)`**: devolve a URL cacheada no connect; se ausente → `ONVIF_STREAM_URL_NOT_CACHED`.
- **`movePTZ(command)`**: despacha por `PTZCommandType` para `absoluteMove`/`relativeMove`/`continuousMove`/`stop` da lib. `CONTINUOUS` popula eixos condicionalmente e passa `Timeout` numérico (auto-stop ONVIF - a lib serializa `PT<n>S` só se for `number`; detalhe crítico comentado no código).
- **`executeHeartbeat()`**: mede latência (`ChronometerUtils` sobre `deviceInformationInit()`), atualiza `ICameraStatus` (`ConnectionState` CONNECTED/ERROR).
- **`buildRewrittenRtspUri()`**: a URI RTSP devolvida pela câmera tem credenciais injetadas e o host trocado por `ipSocketAddresses.rtsp` (NAT/proxy/túnel).
- **`getEncoderConfig(mediaProfileToken?)`** (INT-006, agosto): método **opcional** do contrato - lê `mediaGetProfiles()` e devolve o bitrate/encoding/resolução configurados no encoder, sem abrir stream. Sentinela "sem limite" do VBR (bitrate ≥ teto seguro) é tratado estimando pela resolução em vez de propagar o valor absurdo. Base universal do bitrate configurado (ver seção própria abaixo).
- **`getNativeAnalytics()`**: **não implementado** - lança `ONVIF_NATIVE_ANALYTICS_NOT_IMPLEMENTED`.

Lib: `@atmanadmin/node-onvif-ts` (`OnvifDevice`). Opções: `IOnvifConnectionOptions` (`hardware/types/onvif-connection-options.interface.ts`) - `ipSocketAddresses.{onvif,rtsp}`, user/pass, `mediaProfileToken` (+ secundário opcional).

## Strategy - descritor de stream por protocolo

`CameraCommunicationStrategySelector.select(protocol)` (`camera-communication-strategy.selector.ts`) percorre as estratégias registradas e retorna a primeira cujo `supports(protocol)` é `true`; nenhuma → `UNSUPPORTED_CAMERA_COMMUNICATION_PROTOCOL`.

Registro (ordem, disjunta hoje): `[rtsp, onvif, isapi]` em `camera-communication-strategies.provider.ts` sob o token `CAMERA_COMMUNICATION_STRATEGIES_TOKEN`; módulo `communication.module.ts` exporta só o selector.

| Estratégia | `supports()` | `buildLiveStreamDescriptor()` |
| --- | --- | --- |
| `RtspCameraCommunicationStrategy` | `RTSP` ou `RTSPS` | Usa `primaryStreamUrl` se houver (normalizada); senão monta `rtsp(s)://ip:porta/stream1` a partir de `ipAddress`+`primaryStreamPort`. Valida porta 1..65535 |
| `OnvifCameraCommunicationStrategy` | `ONVIF` | **Exige `primaryStreamUrl` já populada** (descoberta em runtime pelo `OnvifDriver.connect`); senão → `ONVIF_STREAM_URL_NOT_DISCOVERED`. Devolve o descritor com `protocol: 'RTSP'` |
| `IsapiCameraCommunicationStrategy` (agosto, PR #1738 - INT-018) | `ISAPI` | Usa `primaryStreamUrl` se já registrada; senão monta a URL a partir do IP + canal principal Hikvision (`hikvisionChannelPath`, helper do domínio de Streaming). **Não** anexa parâmetros de codec/resolução na URL - a Hikvision configura isso via ISAPI e ignora query params (INT-007). Ao contrário da estratégia ONVIF, não depende de descoberta SOAP prévia - por isso funciona mesmo com `/onvif/device_service` respondendo 404 |

Ponto-chave: nenhuma estratégia faz descoberta de verdade além da ONVIF (que reaproveita a URL que o driver ONVIF já resolveu). RTSP e ISAPI constroem a URL a partir de dados já conhecidos (IP, porta, canal). O output é sempre RTSP.

## Descritor de stream / URL RTSP

`ICameraStream` (`hardware/types/camera-stream.interface.ts`) é o contrato entregue ao streaming:

```
{ protocol: 'RTSP'; sourceUrl: string; suggestedCodec: string; metadata?: { cameraId } }
```

Entrada: `ICameraStreamSource` (`camera-stream-source.interface.ts`) - protocolo, IP, codec, URL/porta primárias, cameraId.

Montagem em `RtspSourceUrl` (`helpers/rtsp-source-url.helper.ts`), fonte única para as três estratégias (RTSP, ONVIF, ISAPI):

- **`build({ipAddress, port, secure})`** → `rtsp://host:554/stream1` (defaults em `rtsp-defaults.constants.ts`: `PORT=554`, `PATH=/stream1`, `SECURE_SCHEME=rtsps`). IPv6 é colchetado na autoridade.
- **`normalize(raw)`** → mantém `rtsp/rtsps/http/https` como estão; prefixa `rtsp://` quando não há esquema. (Algumas Axis expõem HTTP em campos "rtsp" do SDK; `GetStreamUri(RTSP)` devolve `rtsp://` real.)

Independentemente do protocolo de entrada (ONVIF, RTSP ou ISAPI), o descritor final é **sempre RTSP** - é o denominador comum que o pipeline de [[Streaming\|Streaming]] (ffmpeg → mediamtx) consome.

## Bitrate configurado (device-truth)

INT-006/PROJ-008 - lê o bitrate **configurado** no device (o teto/target que a câmera vai usar), não o consumo instantâneo (esse vem do mediamtx via PROJ-006, camada de Streaming). Orquestrado por `DeviceBitrateReader` (`health/device-bitrate.reader.ts`), chamado pelo coletor periódico (`health/workers/provisioned-bandwidth-collector.service.ts`, domínio de Saúde); tipo de saída `IDeviceBitrateConfig` (`hardware/types/device-bitrate-config.interface.ts`).

Três fontes, combinadas por `resolveProvisionedBitrate` (`health/utils/resolve-provisioned-bitrate.ts`):

| Fonte | Onde | Papel |
| --- | --- | --- |
| ONVIF `getEncoderConfig` | `OnvifDriver` (universal) | Valor-base - funciona em qualquer câmera ONVIF |
| VAPIX `Image.I0.RateControl` | `health/utils/axis-rate-control.utils.ts` (`readAxisRateControl`) | Enriquece Axis: modo (MBR/ABR/VBR) e, se ABR, substitui o bitrate pelo target planejado |
| ISAPI `Streaming/channels/<id>` | `health/utils/hikvision-rate-control.utils.ts` (`readHikvisionRateControl`) | Enriquece Hikvision: modo e `constantBitRate`/`vbrUpperCap`, que sempre vence o valor final (ONVIF em Hikvision VBR costuma reportar o sentinela int-max) |

Uma câmera é Axis **ou** Hikvision, nunca as duas - no máximo um enriquecimento é aplicado. Read-only e best-effort: qualquer falha devolve `null` e o coletor mantém o valor em cache.

> [!warning] Achado de código - comentário desatualizado em `hikvision-rate-control.utils.ts`
> O comentário do arquivo diz "NOT VALIDATED AGAINST A DEVICE: no Hikvision camera exists on the
> network yet" - verdadeiro quando o reader foi escrito (03/08), mas defasado desde meados de agosto:
> `database/seed.ts` cadastra uma Hikvision real (DS-2CD1023G0E-I, `192.168.210.80`), com streaming,
> saúde e credencial validados em campo em 14/08 e 18/08 (ver [[Runbook - câmeras reais para teste]]).
> Não fica claro se a leitura de bitrate ISAPI especificamente já foi exercitada contra esse device -
> vale conferir/atualizar o comentário na próxima vez que alguém tocar o arquivo.

## Digest auth (VAPIX + ISAPI)

`AxisDigestClient` (`health/utils/digest-auth.utils.ts`) - HTTP Digest RFC 7616, cliente único e genérico, hoje reusado bem além do VAPIX:

- `get` / `getBuffer`: faz probe → recebe `401` + `WWW-Authenticate` → calcula MD5 (`ha1`/`ha2`/`response`) → reenvia com `Authorization: Digest …`.
- `getStream` (agosto, INT-019 seção 2): mesmo handshake, mas devolve a resposta como stream em vez de esperar o corpo terminar - necessário para o alertStream ISAPI da Hikvision, que é uma conexão HTTP que nunca fecha. Lança `DigestRequestError` (carrega o status) para o caller distinguir 404 (endpoint ausente na firmware) de 401 (credencial rejeitada).
- Trata **qualquer 2xx** como sucesso (AxisOS ≥ 11 devolve `204 No Content` no `ptz.cgi`; tratá-lo como falha gerava 502 fantasma).
- `fetchWsSessionToken`: obtém token wssession (válido ~15 s) para abrir o WebSocket de eventos Axis.
- Timeouts: 5 s (texto) / 8 s (buffer, ex. `image.cgi`).

Apesar do nome, o mesmo cliente autentica os dois clients ISAPI da Hikvision (`hikvision-isapi-heartbeat.client.ts`, `hikvision-alert-stream.client.ts`) e a leitura de bitrate ISAPI - o próprio código documenta a decisão ("`AxisDigestClient` is reused despite the name... renaming it touches 12 call sites and is deliberately deferred"). É a mesma nuance de nomenclatura que a estratégia ISAPI, só que já registrada no código-fonte em vez de precisar de callout aqui.

Credenciais: `CameraCredential` (`database/schema/camera/camera_credential.prisma`) - user/pass **texto puro**, 1:1 com `Camera`; ONVIF/VAPIX/ISAPI convertem em digest no handshake e o acesso é restrito por VPN. Integração com auth gateway (`ICameraCredentialProvider` / `CAMERA_CREDENTIAL_PROVIDER`) é **TODO** - provider ainda não implementado.

> [!info] Dedupe de conexão por device físico - documentado no domínio de Saúde
> Os clients desta camada (`axis-ws.client.ts`, `onvif-pullpoint.client.ts` e os dois clients ISAPI
> acima) não abrem mais uma conexão por linha de `Camera`: há dedupe por device físico e, sob N
> réplicas, um lease Redis por device (`health/leases/`) garantindo um único monitor cluster-wide.
> Mecânica, números e histórico do fix ficam em
> [[Saúde e monitoramento - Arquitetura e estratégias]] seção "Worker" - não duplicado aqui porque já
> foi revisado no mesmo dia (24/08) contra o código. Este domínio só aponta que os clients dedupados
> são os mesmos que ele documenta.

## Por que isolar protocolos atrás de contratos TS

RF-INT-05 (novo fabricante **sem** desenvolvimento específico de protocolo) e RNF-CAM-02 (ONVIF obrigatório, resto fallback): o par porta + factory/selector permite adicionar um fabricante implementando um contrato e registrando, **sem tocar** nos consumidores (streaming/PTZ/saúde). Na prática hoje isso é entregue pelo **`OnvifDriver` genérico** cobrindo qualquer câmera Profile S; adaptadores dedicados entram quando o ONVIF não é suficiente - seja para expor um recurso que ele não cobre (zoom Axis em câmera fixa, `AutoFlip`), seja porque a firmware chega com ONVIF desligado e HTTP proprietário é o único caminho até ele ser ativado (Hikvision/ISAPI, INT-018 a INT-020). Ver [[Integração com dispositivo - Requisitos e SLA]] para o estado por requisito.

## Erros e timeouts

`DomainException` (`@attlas/core-common`) - nunca `Error`/`HttpException` cru. Códigos estáveis (`errorCode` não é traduzido):

| Código | Origem | Quando |
| --- | --- | --- |
| `CAMERA_UNREACHABLE` | `ExternalServiceException` | Timeout/falha de I/O no driver ONVIF ou VAPIX (PtzService `runWithTimeout` / catch) |
| `ONVIF_OPTIONS_REQUIRED` | `InvalidInputException` | `createDriver(ONVIF)` sem `options.onvif` |
| `RTSP_HAS_NO_DRIVER` | `InvalidInputException` | `createDriver(RTSP)` |
| `PROPRIETARY_PROTOCOL_NOT_SUPPORTED` | `InvalidInputException` | `createDriver(PROPRIETARY)` |
| `UNSUPPORTED_CAMERA_PROTOCOL` | `InvalidInputException` | `createDriver(ISAPI)` ou qualquer protocolo sem `case` na factory |
| `ONVIF_STREAM_URL_NOT_CACHED` / `_NOT_DISCOVERED` | `InvalidInputException` | Stream URL pedida antes do `connect()` (driver / estratégia) |
| `ONVIF_NATIVE_ANALYTICS_NOT_IMPLEMENTED` | `BusinessRuleViolationException` | `getNativeAnalytics()` |
| `UNSUPPORTED_CAMERA_COMMUNICATION_PROTOCOL` | `InvalidInputException` | Selector sem estratégia para o protocolo |

Timeouts (env → default): ONVIF connect `ONVIF_CONNECT_TIMEOUT_MS`→5 s, comando `ONVIF_COMMAND_TIMEOUT_MS`→4 s (PtzService); RTSP porta `RTSP_DEFAULT_PORT`→554; digest 5 s/8 s; probe de credenciais 10 s; poll ISAPI `HIKVISION_ISAPI_POLL_INTERVAL_MS`→15 s (tolerância `HIKVISION_ISAPI_FAILURE_TOLERANCE`→2 falhas consecutivas); alertStream ISAPI `HIKVISION_ALERT_STREAM_CONNECT_TIMEOUT_MS`→8 s e janela de inatividade `HIKVISION_ALERT_STREAM_IDLE_TIMEOUT_MS`→30 s.
