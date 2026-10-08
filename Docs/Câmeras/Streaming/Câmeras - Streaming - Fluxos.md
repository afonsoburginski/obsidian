---
tags:
  - doc
  - cameras
  - streaming
  - ms-cameras
aliases:
  - "Streaming - Fluxos e SLA"
  - "Câmeras - Streaming - Fluxos"
atualizado: 2026-10-07
banner: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200"
---

# Câmeras - Streaming - Fluxos

Volta para [[Câmeras - Streaming]].

## Resumo

| Fluxo | Gatilho | Resultado |
| --- | --- | --- |
| Pedir o vídeo de uma câmera | o player abre uma câmera ou o host refaz o pedido | config do path garantida no MediaMTX e as URLs WHEP e LL-HLS na resposta |
| Tocar no player | o player recebe `url` e `hlsUrl` | imagem por WebRTC, ou por LL-HLS quando o WebRTC não serve |
| Fallback de codec no servidor | path H.265 ou AV1 recusado pela câmera Axis | o mesmo path passa a puxar a URL H.264 |
| Remover os paths da câmera | troca de endereço ou soft-delete da câmera | todos os paths da câmera somem do MediaMTX |
| Diagnosticar um stream | operador ou runbook consulta o diagnóstico | estado do path, da ingestão e das sessões, com `StreamHealthStatus` |
| Avisar mudança de conectividade por WebSocket | mudança de conectividade do device | `status.changed` na sala da câmera |

Os mecanismos citados aqui estão em [[Câmeras - Streaming - Arquitetura e estratégias]]; metas, tempos e
variáveis em [[Câmeras - Streaming - Requisitos e SLA]].

## Pedir o vídeo de uma câmera

**Gatilho**: `GET /api/cameras/:id/hls?quality=&codec=` (`streaming.controller.ts`). A rota é `@Public()`; no Kong
é a `ms-cameras-allowlist-hls-session`, sem plugin `jwt`. O serviço garante o path e devolve as URLs; não espera a
câmera.

**Passos**:

1. **Leitura**: `ParseUUIDPipe` no id e `ParseStreamTypePipe` (`pipes/parse-stream-type.pipe.ts`) na qualidade,
   padrão `PRIMARY`. O mesmo pipe serve o endpoint de diagnóstico.
2. **Preferência de codec** (`parseStreamCodecPreference`): `codec` é um codec (`h265`) ou uma lista em ordem de
   preferência (`av1,h265`); ausente vale `H264`.
3. **Teto antes do resolve** (`refuseWhenFull`): com o teto cheio, câmera sem path disponível nem admitido é
   recusada sem ler o banco.
4. **Resolve a fonte** (`CameraStreamSourceResolver.resolve`): cadeia de qualidade, codec servido, credencial,
   parâmetros VAPIX e URL H.264 de reserva. Codec servido diferente do primeiro pedido vai para o log.
5. **H.265 no H.264 disponível** (`joinsOnlineH264`): pedido que resolveu H.265, sem path H.265 disponível e com o
   H.264 da mesma câmera e tier no ar, responde o path H.264 com `codec: 'H264'`, sem tocar em config.
6. **Admite e garante**: `LiveStreamFleet.admit` e `LiveStreamPathService.ensure` (lê antes de escrever).
7. **Resposta** `{ url, hlsUrl, status, quality, codec }`.

**Resultado**:

| Campo | Valor |
| --- | --- |
| `url` | `<MEDIAMTX_WEBRTC_BASE_URL>/<id>-<quality>[-h265\|-av1]/whep` |
| `hlsUrl` | `<MEDIAMTX_HLS_BASE_URL>/<id>-<quality>[-h265\|-av1]/index.m3u8` |
| `status` | `ACTIVE` se o path já está disponível, `STARTING` se este leitor vai abri-lo |
| `quality` | tier servido, que pode ser outro que o pedido (Hikvision colapsa TERTIARY em SECONDARY) |
| `codec` | codec servido: `H264`, `H265` ou `AV1` |

`<quality>` vai em minúsculas na URL. `leaseId` do contrato `IHlsSessionResponse` é `@deprecated` e nunca vem
preenchido.

Quem espera a câmera é o MediaMTX, segurando o POST do WHEP do primeiro leitor até a fonte ficar pronta ou até
`STREAM_SOURCE_START_TIMEOUT_MS`. Não há o que liberar depois: o path fecha sozinho 30 s depois do último leitor, e
não existe `DELETE /hls`. Assim o segundo operador entra na entrega existente, ela só acaba quando o último sai, e
a saída de um nunca derruba os outros.

**Erros**:

| Status | `errorCode` | Detalhe | Quando |
| --- | --- | --- | --- |
| 400 | `INVALID_INPUT` | `field: 'quality'` | qualidade inválida |
| 429 | `RATE_LIMIT_EXCEEDED` | `STREAM_SESSION_CAP_REACHED` | teto de paths cheio |
| 409 | `BUSINESS_RULE_VIOLATION` | `STREAM_PROFILE_NOT_CONFIGURED` | nenhum perfil ativo na cadeia de qualidade; o front ramifica nele |
| 409 | `BUSINESS_RULE_VIOLATION` | `STREAM_SOURCE_URL_INVALID` | a URL da câmera não serve de `source` ao MediaMTX; a URL não entra no erro |
| 502 | `EXTERNAL_SERVICE_ERROR` | `HLS_START_TIMEOUT` | qualquer outra falha no resolve, Prisma incluído; o player repete |
| 502 | `EXTERNAL_SERVICE_ERROR` | `HLS_START_TIMEOUT` e um segundo item com o motivo | falha ao ler ou escrever a config do path |

O motivo do segundo item separa as causas: `MEDIAMTX_UNREACHABLE` (sem resposta), `MEDIAMTX_API_FORBIDDEN` (401
ou 403, a faixa da control API recusa o `ms-cameras`), `MEDIAMTX_CONFIG_REJECTED` (400, config do path recusada)
e `MEDIAMTX_API_ERROR` (outro status). A causa vai ao log com a senha da câmera mascarada.

## Tocar no player

**Gatilho**: o player recebe `url` e `hlsUrl` do pedido acima.

**Passos**:

1. WHEP, exceto se o WHEP daquela câmera e codec falhou nos últimos 60 s. Negociação até 15 s; 404 repetido com
   recuo de 1 s a 5 s por até 60 s.
2. Vigias: ICE `failed` ou `closed`, `disconnected` por 3 s, mídia que não chega em 8 s, faixa `ended` ou stream
   `inactive`, nenhum quadro decodificado 6 s depois da faixa.
3. Perda depois de imagem: segura o último quadro, reconecta o WHEP no lugar (60 s) e avisa o host, que faz um
   único `GET /hls` por episódio. Fazem esse `GET` o videowall do VMS, o detalhe de câmera e a Detecção, nunca
   por timer.
4. LL-HLS quando o WebRTC nunca mostrou imagem ou esgotou o orçamento.
5. Volta ao WebRTC em segundo plano, de 30 s a 300 s, make-before-break.
6. Ao sair, o player só fecha o peer.

**Resultado**: imagem por WebRTC; ou por LL-HLS, com o selo `HLS` na célula.

**Erros**: falha no LL-HLS (erro fatal do hls.js ou 12 s sem quadro) é terminal e mostra o card de erro com
botão de reconectar. No videowall do VMS, tile H.265 ou AV1 que recebe mídia e não decodifica quadro reabre em
H.264, e o codec que falhou deixa de ser pedido até recarregar o app.

## Fallback de codec no servidor

**Gatilho**: um path `-h265` ou `-av1` de câmera Axis que ainda não ficou disponível, com URL H.264 de reserva
pendente.

**Passos**:

1. A cada 5 s, o watcher lê `GET /v3/paths/static-sources/get/<path>` desses paths.
2. `lastError` com recusa RTSP 4xx da câmera, menos 401 e 407, decide o fallback. Timeout, DNS e conexão recusada
   não decidem nada.
3. `LiveStreamPathService.fallBackToH264` reescreve a config do path com a URL H.264. Path com leitor adia a
   escrita (`DEFERRED`), e o fallback fica pendente para a próxima tentativa.

**Resultado**: o path segue chamado `-h265` ou `-av1`, e a câmera passa a entregar H.264 nele. A resposta do
`GET /hls` segue dizendo o codec pedido.

**Erros**: câmera que não devolve 4xx reconhecível deixa o path tentando abrir; quem cobre esse caso é o player,
pelo quadro que não decodifica.

## Remover os paths da câmera

**Gatilho**: `CameraOriginChangedEvent` (troca de endereço) ou `CameraDeletedEvent` (soft-delete), eventos
internos do CQRS do `ms-cameras` (`handlers/`).

**Passos**:

1. Lista a config de paths do MediaMTX (`GET /v3/config/paths/list`).
2. Apaga cada path cujo nome começa pelo `cameraId` (`DELETE /v3/config/paths/delete/<path>`).

**Resultado**: o MediaMTX fecha as fontes e os leitores desses paths. Na troca de endereço o player reconecta, e o
`GET /hls` refeito configura o endereço novo. No soft-delete, quem assistia cai com erro terminal.

**Erros**: com o MediaMTX fora do ar nada é apagado, e o handler registra um aviso no log sem repetir. Na troca de
endereço, o próximo `GET /hls` reescreve a config quando o path estiver sem leitor; no soft-delete, os paths ficam
até o próximo restart do MediaMTX.

## Diagnosticar um stream

**Gatilho**: `GET /api/cameras/:id/stream-diagnostics?quality=&codec=` (`stream-diagnostics.controller.ts`),
autenticado e escopado pelo `System-Id`.

**Passos**:

1. Lê no MediaMTX a config do path, a fonte (`lastError`), o estado do path e as sessões WebRTC.
2. Mascara os IPs das sessões (`redactAddress`).
3. Calcula o `StreamHealthStatus`, separado da alcançabilidade do device.

**Resultado**: config do path, ingestão (`bytesReceived`, `framesInError`, leitores), sessões WebRTC e o estado:

| Status | Significado |
| --- | --- |
| `OK` | path disponível, ingestão limpa e, havendo sessões WebRTC, ao menos uma com peer estabelecido |
| `DEGRADED` | path disponível com quadros em erro na ingestão, ou nenhuma sessão WebRTC com peer estabelecido |
| `DOWN` | path indisponível com erro na puxada (`lastError` da fonte) |
| `INACTIVE` | path indisponível sem erro: ninguém assistindo, o normal entre espectadores |

É o que impede um stream travado de aparecer como "Estável".

**Erros**: qualidade inválida dá 400 `INVALID_INPUT`, como no pedido de vídeo.

## Avisar mudança de conectividade por WebSocket

**Gatilho**: mudança de conectividade do device.

**Passos**:

1. O cliente conecta no namespace `cameras-stream`, path `/api/cameras/stream/realtime` (rota própria no Kong),
   sob `WsAuthGuard`.
2. Entra na sala `camera:<id>` com `camera.join` (`{ cameraId }`) e sai com `camera.leave`.
3. O gateway (`streaming.gateway.ts`) emite `status.changed` (`cameraId`, `status`) para a sala.

**Resultado**: única emissão do namespace. Nenhum cliente do `web-attlas` assina esse namespace; o front usa
`/api/cameras/status/realtime` e `/api/cameras/analytics/realtime`.

**Erros**: conexão sem token válido é recusada pelo `WsAuthGuard`.
