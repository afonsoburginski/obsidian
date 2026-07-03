---
tags: [doc, cameras, ms-cameras, hardware]
---

# Integração com dispositivo — Arquitetura e estratégias

> Padrões centrais do adaptador multi-protocolo. Índice: [[00 - Integração com dispositivo]]. Diagrama: [[02 - MOD-002 multi-protocol-adapter.excalidraw|diagrama]].

## Duas portas, dois padrões

A integração separa **operação stateful** de **construção stateless de URL** em dois contratos TS distintos:

| Porta | Contrato | Padrão | Natureza | Quem escolhe |
| --- | --- | --- | --- | --- |
| Driver | `ICameraDriver` (`hardware/drivers/i-camera-driver.interface.ts`) | **Adapter** + **Factory** | Stateful — abre conexão, mantém status, executa PTZ | `CameraDriverFactory` |
| Comunicação | `ICameraCommunicationStrategy` (`hardware/communication/i-camera-communication-strategy.interface.ts`) | **Strategy** | Stateless — só monta o descritor de stream | `CameraCommunicationStrategySelector` |

Regra de fronteira (comentada em ambos os contratos): **streaming-only vive atrás da estratégia; operação com estado vive atrás do driver**. RTSP, por não ter estado, **não tem driver** — pedir `createDriver(RTSP)` lança `RTSP_HAS_NO_DRIVER`.

## Factory — driver por protocolo

`CameraDriverFactory.createDriver(protocol, options?)` (`hardware/drivers/camera-driver.factory.ts`) despacha por `ProtocolType`:

| `ProtocolType` | Resultado |
| --- | --- |
| `ONVIF` | `new OnvifDriver(options.onvif)`; sem `options.onvif` → lança `ONVIF_OPTIONS_REQUIRED` |
| `RTSP` | Lança `RTSP_HAS_NO_DRIVER` (usar a estratégia) |
| `PROPRIETARY` | Lança `PROPRIETARY_PROTOCOL_NOT_SUPPORTED` — **registry não implementado** |
| _default_ | Lança `UNSUPPORTED_CAMERA_PROTOCOL` |

Hoje **só `OnvifDriver` implementa `ICameraDriver`**. A extensão prevista: implementar a interface em `hardware/drivers/<vendor>/`, registrar via `ProprietaryDriverRegistry` (`INT-004`) e rotear por `manufacturer.code` — ainda não existe (cabeçalho de `i-camera-driver.interface.ts` e `camera-driver.factory.ts`).

### `OnvifDriver` (Profile S)

- **`connect()`**: `servicesInit()` → `executeHeartbeat()` → cacheia URL do stream `PRIMARY` (e `SECONDARY` se houver `secondaryMediaProfileToken`).
- **`getStreamUrl(type)`**: devolve a URL cacheada no connect; se ausente → `ONVIF_STREAM_URL_NOT_CACHED`.
- **`movePTZ(command)`**: despacha por `PTZCommandType` para `absoluteMove`/`relativeMove`/`continuousMove`/`stop` da lib. `CONTINUOUS` popula eixos condicionalmente e passa `Timeout` numérico (auto-stop ONVIF — a lib serializa `PT<n>S` só se for `number`; detalhe crítico comentado no código).
- **`executeHeartbeat()`**: mede latência (`ChronometerUtils` sobre `deviceInformationInit()`), atualiza `ICameraStatus` (`ConnectionState` CONNECTED/ERROR).
- **`buildRewrittenRtspUri()`**: a URI RTSP devolvida pela câmera tem credenciais injetadas e o host trocado por `ipSocketAddresses.rtsp` (NAT/proxy/túnel).
- **`getNativeAnalytics()`**: **não implementado** — lança `ONVIF_NATIVE_ANALYTICS_NOT_IMPLEMENTED`.

Lib: `@atmanadmin/node-onvif-ts` (`OnvifDevice`). Opções: `IOnvifConnectionOptions` (`hardware/types/onvif-connection-options.interface.ts`) — `ipSocketAddresses.{onvif,rtsp}`, user/pass, `mediaProfileToken` (+ secundário opcional).

## Strategy — descritor de stream por protocolo

`CameraCommunicationStrategySelector.select(protocol)` (`camera-communication-strategy.selector.ts`) percorre as estratégias registradas e retorna a primeira cujo `supports(protocol)` é `true`; nenhuma → `UNSUPPORTED_CAMERA_COMMUNICATION_PROTOCOL`.

Registro (ordem, disjunta hoje): `[rtsp, onvif]` em `camera-communication-strategies.provider.ts` sob o token `CAMERA_COMMUNICATION_STRATEGIES_TOKEN`; módulo `communication.module.ts` exporta só o selector.

| Estratégia | `supports()` | `buildLiveStreamDescriptor()` |
| --- | --- | --- |
| `RtspCameraCommunicationStrategy` | `RTSP` ou `RTSPS` | Usa `primaryStreamUrl` se houver (normalizada); senão monta `rtsp(s)://ip:porta/stream1` a partir de `ipAddress`+`primaryStreamPort`. Valida porta 1..65535 |
| `OnvifCameraCommunicationStrategy` | `ONVIF` | **Exige `primaryStreamUrl` já populada** (descoberta em runtime pelo `OnvifDriver.connect`); senão → `ONVIF_STREAM_URL_NOT_DISCOVERED`. Devolve o descritor com `protocol: 'RTSP'` |

Ponto-chave: a estratégia ONVIF **não faz descoberta**; ela reaproveita a URL que o driver ONVIF já resolveu e gravou no registro da câmera. O output é sempre RTSP.

## Descritor de stream / URL RTSP

`ICameraStream` (`hardware/types/camera-stream.interface.ts`) é o contrato entregue ao streaming:

```
{ protocol: 'RTSP'; sourceUrl: string; suggestedCodec: string; metadata?: { cameraId } }
```

Entrada: `ICameraStreamSource` (`camera-stream-source.interface.ts`) — protocolo, IP, codec, URL/porta primárias, cameraId.

Montagem em `RtspSourceUrl` (`helpers/rtsp-source-url.helper.ts`), fonte única para as estratégias:

- **`build({ipAddress, port, secure})`** → `rtsp://host:554/stream1` (defaults em `rtsp-defaults.constants.ts`: `PORT=554`, `PATH=/stream1`, `SECURE_SCHEME=rtsps`). IPv6 é colchetado na autoridade.
- **`normalize(raw)`** → mantém `rtsp/rtsps/http/https` como estão; prefixa `rtsp://` quando não há esquema. (Algumas Axis expõem HTTP em campos "rtsp" do SDK; `GetStreamUri(RTSP)` devolve `rtsp://` real.)

Independentemente do protocolo de entrada (ONVIF ou RTSP), o descritor final é **sempre RTSP** — é o denominador comum que o pipeline de [[00 - Streaming\|Streaming]] (ffmpeg → mediamtx) consome.

## Digest auth Axis (VAPIX)

`AxisDigestClient` (`health/utils/digest-auth.utils.ts`) — HTTP Digest RFC 7616, única porta para endpoints VAPIX:

- `get` / `getBuffer`: faz probe → recebe `401` + `WWW-Authenticate` → calcula MD5 (`ha1`/`ha2`/`response`) → reenvia com `Authorization: Digest …`.
- Trata **qualquer 2xx** como sucesso (AxisOS ≥ 11 devolve `204 No Content` no `ptz.cgi`; tratá-lo como falha gerava 502 fantasma).
- `fetchWsSessionToken`: obtém token wssession (válido ~15 s) para abrir o WebSocket de eventos.
- Timeouts: 5 s (texto) / 8 s (buffer, ex. `image.cgi`).

Credenciais: `CameraCredential` (`database/schema/camera/camera_credential.prisma`) — user/pass **texto puro**, 1:1 com `Camera`; ONVIF/VAPIX convertem em digest no handshake e o acesso é restrito por VPN. Integração com auth gateway (`ICameraCredentialProvider` / `CAMERA_CREDENTIAL_PROVIDER`) é **TODO** — provider ainda não implementado.

## Por que isolar protocolos atrás de contratos TS

RF-INT-05 (novo fabricante **sem** desenvolvimento específico de protocolo) e RNF-CAM-02 (ONVIF obrigatório, resto fallback): o par porta + factory/selector permite adicionar um fabricante implementando um contrato e registrando, **sem tocar** nos consumidores (streaming/PTZ/saúde). Na prática hoje isso é entregue pelo **`OnvifDriver` genérico** cobrindo qualquer câmera Profile S; adaptadores dedicados só entram para expor recursos que o ONVIF não cobre (ex. zoom Axis em câmera fixa, `AutoFlip`). Ver [[Integração com dispositivo - Requisitos e SLA]] para o estado por requisito.

## Erros e timeouts

`DomainException` (`@attlas/core-common`) — nunca `Error`/`HttpException` cru. Códigos estáveis (`errorCode` não é traduzido):

| Código | Origem | Quando |
| --- | --- | --- |
| `CAMERA_UNREACHABLE` | `ExternalServiceException` | Timeout/falha de I/O no driver ONVIF ou VAPIX (PtzService `runWithTimeout` / catch) |
| `ONVIF_OPTIONS_REQUIRED` | `InvalidInputException` | `createDriver(ONVIF)` sem `options.onvif` |
| `RTSP_HAS_NO_DRIVER` | `InvalidInputException` | `createDriver(RTSP)` |
| `PROPRIETARY_PROTOCOL_NOT_SUPPORTED` | `InvalidInputException` | `createDriver(PROPRIETARY)` |
| `ONVIF_STREAM_URL_NOT_CACHED` / `_NOT_DISCOVERED` | `InvalidInputException` | Stream URL pedida antes do `connect()` (driver / estratégia) |
| `ONVIF_NATIVE_ANALYTICS_NOT_IMPLEMENTED` | `BusinessRuleViolationException` | `getNativeAnalytics()` |
| `UNSUPPORTED_CAMERA_COMMUNICATION_PROTOCOL` | `InvalidInputException` | Selector sem estratégia para o protocolo |

Timeouts (env → default): ONVIF connect `ONVIF_CONNECT_TIMEOUT_MS`→5 s, comando `ONVIF_COMMAND_TIMEOUT_MS`→4 s (PtzService); RTSP porta `RTSP_DEFAULT_PORT`→554; digest 5 s/8 s; probe de credenciais 10 s.
</content>
