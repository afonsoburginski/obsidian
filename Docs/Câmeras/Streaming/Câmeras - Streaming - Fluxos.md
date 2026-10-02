---
tags:
  - doc
  - ms-cameras
  - cameras
  - streaming
atualizado: 2026-10-02
aliases:
  - "Streaming - Fluxos e SLA"
---

# Câmeras - Streaming - Fluxos

Volta para [[Câmeras - Streaming]]. Os mecanismos citados aqui estão em [[Câmeras - Streaming - Arquitetura e estratégias]],
e as metas, medições e variáveis de ambiente em [[Câmeras - Streaming - Requisitos e SLA]].
Fonte: `apps/ms-cameras/src/streaming/` (`streaming.controller.ts`, `services/live-stream-path.service.ts`,
`services/live-stream-fleet.service.ts`, `workers/live-stream-path-watcher.service.ts`,
`services/stream-ttff-recorder.service.ts`, `services/stream-diagnostics.service.ts`).

## `GET /api/cameras/:id/hls?quality=&codec=`

`@Public()`, rota Kong `ms-cameras-allowlist-hls-session` sem plugin `jwt`. Garante o path e devolve as
URLs; não espera a câmera.

1. **Parse**: `ParseUUIDPipe` no id e `ParseStreamTypePipe` (`pipes/parse-stream-type.pipe.ts`) na
   qualidade, padrão `PRIMARY`; valor inválido vira 400 `INVALID_INPUT` com `field: 'quality'`. O mesmo
   pipe serve o endpoint de diagnóstico.
2. **Codec efetivo** (`negotiateEffectiveCodec`): `H264` ou `H265`; analítico embarcado ativo força `H264`.
3. **Teto antes do resolve** (`refuseWhenFull`): teto cheio e câmera sem path disponível nem admitido
   responde 429 `RATE_LIMIT_EXCEEDED`, detalhe `STREAM_SESSION_CAP_REACHED`.
4. **Resolve a fonte**: cadeia de qualidade, VAPIX e URL H264 de reserva. `DomainException` sai intacta
   (409 `BUSINESS_RULE_VIOLATION`, detalhe `STREAM_PROFILE_NOT_CONFIGURED`, em que o front ramifica);
   qualquer outra falha, Prisma incluído, vira 502 `EXTERNAL_SERVICE_ERROR` com detalhe
   `HLS_START_TIMEOUT`, que o player repete.
5. **H265 no H264 disponível**: responde o path H264 com `codec: 'H264'`, sem tocar em config.
6. **Admite e garante**: `LiveStreamFleet.admit` e `LiveStreamPathService.ensure` (read-before-write).
   Falha na escrita, com o MediaMTX fora incluído, vira o mesmo 502.
7. **Resposta** `{ url, hlsUrl, status, quality, codec }`:
   - `url`: `<MEDIAMTX_WEBRTC_BASE_URL>/<id>-<quality>[-h265]/whep`.
   - `hlsUrl`: `<MEDIAMTX_HLS_BASE_URL>/<id>-<quality>[-h265]/index.m3u8`.
   - `status`: `ACTIVE` se o path já está disponível, `STARTING` se este leitor vai abri-lo.
   - `quality` e `codec` servidos; `<quality>` vai em minúsculas na URL.
   - `leaseId` do contrato `IHlsSessionResponse` é `@deprecated` e nunca vem preenchido.

Quem espera a câmera é o MediaMTX, segurando o POST do WHEP do primeiro leitor até a fonte ficar pronta
ou até `STREAM_SOURCE_START_TIMEOUT_MS`. Não há o que liberar depois: o path fecha sozinho 30 s depois do
último leitor, e não existe `DELETE /hls`. É assim que se cumpre o RNF-CAM-21: o segundo operador entra na
entrega existente, ela só acaba quando o último sai, e a saída de um nunca derruba os outros.

## Fluxo do player

1. `GET .../hls`, recebe `url` e `hlsUrl`.
2. WHEP, exceto se o WHEP daquela câmera e codec falhou nos últimos 60 s. Negociação até 15 s; 404
   repetido por até 60 s.
3. Vigias: ICE `failed`/`closed`, `disconnected` por 3 s, mídia que não chega em 8 s, faixa `ended` ou
   stream `inactive`, nenhum quadro decodificado 6 s depois da faixa.
4. Perda depois de imagem: segura o último quadro, reconecta o WHEP no lugar (60 s) e avisa o host, que
   faz um único `GET /hls` por episódio. Fazem esse `GET` o videowall do VMS, o detalhe de câmera e a
   Detecção, nunca por timer.
5. LL-HLS quando o WebRTC nunca mostrou imagem ou esgotou o orçamento; falha no LL-HLS é terminal, com
   botão de reconectar.
6. Volta ao WebRTC em segundo plano, de 30 s a 300 s, make-before-break.
7. Ao sair, o player só fecha o peer.

## Eventos WebSocket (`streaming.gateway.ts`)

Namespace `cameras-stream`, path `/api/cameras/stream/realtime` (rota própria no Kong). O cliente entra na
sala `camera:<id>` com `camera.join` (`{ cameraId }`) e sai com `camera.leave`, sob `WsAuthGuard`. Única
emissão: `status.changed` (`cameraId, status`), na mudança de conectividade do device. Nenhum cliente do
`web-attlas` assina esse namespace; o front usa `/api/cameras/status/realtime` e
`/api/cameras/analytics/realtime`.

## Diagnóstico do stream (UC-027)

`GET /api/cameras/:id/stream-diagnostics?quality=&codec=` (`stream-diagnostics.controller.ts`),
autenticado e escopado pelo `System-Id`, devolve a config do path, a ingestão (`bytesReceived`,
`framesInError`, leitores) e as sessões WebRTC com IPs mascarados (`redactAddress`), mais um
`StreamHealthStatus` separado da alcançabilidade do device:

| Status | Significado |
| --- | --- |
| `OK` | path disponível, ingestão limpa e, havendo sessões WebRTC, ao menos uma com peer estabelecido |
| `DEGRADED` | path disponível com quadros em erro na ingestão, ou nenhuma sessão WebRTC com peer estabelecido |
| `DOWN` | path indisponível com erro na puxada (`lastError` da fonte) |
| `INACTIVE` | path indisponível sem erro: ninguém assistindo, o normal entre espectadores |

É o que impede um stream travado de aparecer como "Estável".
