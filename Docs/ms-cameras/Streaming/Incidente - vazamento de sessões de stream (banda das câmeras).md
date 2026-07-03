---
tags:
  - attlas
  - sprint-23
  - incidente
  - ms-cameras
  - streaming
frente: Streaming
ambiente: EC2 dev (dev.v2.attlas.atmansystems.com)
host: ip-172-31-46-250
status: mitigado (ms-cameras parado)
gancho: "[[SOFTWARE-1923 - Bitrate histórico + TTFF]]"
atualizado: 2026-07-03
---

# Incidente - vazamento de sessões de stream drenando a banda das câmeras

> Achado ao validar o ambiente em dev (03/07). As relays ffmpeg ficavam puxando vídeo full-rate das câmeras 24/7 sem entregar para ninguém, saturando o uplink das câmeras. Mitigado parando o `ms-cameras`. A causa raiz é o ciclo de vida das sessões de stream, área da [[SOFTWARE-1923 - Bitrate histórico + TTFF]].

## TL;DR

- Havia **11 processos ffmpeg** puxando RTSP 1080p H264 contínuo das câmeras SNL (`10.11.x.x`) e republicando em `rtsp://mediamtx:8554/<cameraId>-primary`.
- Ao mesmo tempo o **mediamtx reportava 0 paths ativos** (`/v3/paths/list` = `itemCount:0`). Ou seja: as relays sugavam banda das câmeras e **não entregavam stream para ninguém**. Sessões órfãs.
- O culpado **não** é o healthcheck (ping WS/ONVIF é leve). É **vazamento de contagem de viewer** no `StreamSessionRegistry`.
- Mitigação aplicada: `docker stop attlas-ms-cameras`. Fica **parado** por decisão do dono até termos o fix.

## Estado atual (03/07)

- `attlas-ms-cameras`: **PARADO** (`Exited 137`). Deixar assim.
- Verificado pós-parada: 0 processos ffmpeg, 0 conexões TCP para qualquer câmera (`10.11.x.x` e `10.0.0.79`), health worker ONVIF encerrado junto.
- Religar quando houver fix: `ssh aws-attlas-26 'docker start attlas-ms-cameras'`.

## Sintomas observados

- Load average alto no host (média de 15 min em torno de 8).
- 11 relays ffmpeg de longa duração (algumas de 11:37, outras reiniciadas em bloco às 14:20-14:21 = churn de reconexão).
- Logs do `ms-cameras`: `GET`/`DELETE /api/cameras/<id>/hls?quality=secondary` repetidos (abre/fecha de viewer), mais `DELETE` do que `GET` na janela, indicando contagem dessincronizada.
- `NetIO` do `ms-cameras` em 22 GB recebidos ao longo do uptime (puxando vídeo das câmeras).

## Investigação (o que foi verificado)

1. `docker ps`: `attlas-ms-cameras` e `attlas-mediamtx` no ar há 17h.
2. `ps aux | grep ffmpeg`: 11 relays, cada uma com `-i rtsp://root:***@10.11.x.x:554/axis-media/... -c copy -f rtsp rtsp://mediamtx:8554/<id>-primary`.
3. `curl http://localhost:9997/v3/paths/list`: **0 paths** (API respondendo, porta mapeada). Incoerência com 11 publishers ativos.
4. DB `attlas_cameras`: 11 câmeras SNL `OPERATIONAL` em `10.11.x.x` + `ATMN – DEMO` (`10.0.0.79`) + 2 STOCK de teste.
5. Câmera do loop de reconexão: `ATMN – DEMO` (`10.0.0.79`, id `...000010`), `EHOSTUNREACH` do EC2 mas marcada `OPERATIONAL`, então o health worker ONVIF retentava para sempre (attempt 854, backoff no teto ~73s). Ruído, não a causa da banda.

## Causa raiz

Vazamento de **contagem de viewer** no `StreamSessionRegistry` (`apps/ms-cameras/src/streaming/services/stream-session-registry.service.ts`).

- A relay ffmpeg só encerra quando `viewerCount` chega a 0: `decrementViewers` agenda o grace de 60s (`HLS_SESSION_GRACE_MS`) e só então o `FfmpegSessionService` para o processo.
- O contador depende de o front chamar `GET /hls` (abre e incrementa) **e** `DELETE /hls` (decrementa) em par.
- Quando o `DELETE` não chega (aba fechada, refresh, queda de rede, videowall recarregando as câmeras), o `viewerCount` fica preso acima de 0. O grace nunca arma, a sessão nunca encerra e o ffmpeg fica **puxando 1080p da câmera para sempre**.
- O `exit handler` do ffmpeg só respawna se `viewerCount > 0`, então o viewer fantasma também explica o churn de reconexão das 14:20-14:21.
- O registry confia 100% no teardown do cliente e não tem reconciliação com a realidade do mediamtx. É best-effort sem rede de segurança.

## O que NÃO era o problema

- **Healthcheck**: `CameraHealthWorker` abre WS Axis / ONVIF PullPoint por câmera e faz ping a cada 5s. Tráfego leve, não é banda de vídeo.
- **Redis**: `redis-cameras` não existe no EC2, então writes de status de câmera falham (best-effort, DB é fonte de verdade). Já conhecido, não é a causa. Ver [[SOFTWARE-1889 - WebRTC travamento (dívidas técnicas)]].

## Correção proposta (backlog)

Desacoplar o encerramento da sessão do `DELETE` do cliente:

- [ ] **Reaper de reconciliação**: worker periódico que encerra sessão cujo path no mediamtx está com **0 readers** há N minutos. Fonte de verdade = mediamtx, não o contador em memória. Resolve os dois sintomas (relay órfã + path fantasma) de uma vez.
- [ ] e/ou **lease com heartbeat de viewer**: o viewer renova um lease periódico; expirou, decrementa sozinho. Refresh e queda de rede deixam o lease morrer sem depender de um `DELETE` limpo.
- Escopo: `streaming/stream-session-registry.service.ts` + `streaming/services/ffmpeg-session.service.ts`. Cai na frente Streaming, próxima da [[SOFTWARE-1923 - Bitrate histórico + TTFF]].

## Ligado a

- [[SOFTWARE-1923 - Bitrate histórico + TTFF]] (área do ciclo de vida das sessões e do sampler de bitrate).
- [[Attlas - Sprint 23]].
- [[Plano - Banda por câmera (bitrate configurado ONVIF + VAPIX)]] — decisão de arquitetura (03/07): medir banda por bitrate **configurado** do device (ONVIF/VAPIX) 24/7 + real oportunístico, em vez de puxar vídeo.
- [[SOFTWARE-2003 - Ciclo de vida de sessões de streaming e telemetria de banda por câmera]] — o fix do ciclo de vida (reaper/lease) que este incidente exige.
- [[Próxima sprint - candidatos]].
