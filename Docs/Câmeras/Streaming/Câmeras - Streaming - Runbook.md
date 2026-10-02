---
tags:
  - doc
  - ms-cameras
  - streaming
  - runbook
atualizado: 2026-10-01
aliases:
  - "Runbook - Streaming"
---

# Câmeras - Streaming - Runbook

Volta para [[Câmeras - Streaming]]. Comandos para diagnosticar vídeo ao vivo no host que roda o compose (dev.v2 por
`ssh aws-attlas-26`, ou o stack local). Mecanismos em [[Câmeras - Streaming - Arquitetura e estratégias]]. Comandos
direto na câmera (ffprobe, VAPIX, ONVIF, ISAPI) estão em
[[Câmeras - Integração com dispositivo - Runbook]]. O runbook do repositório,
`apps/ms-cameras/docs/runbooks/stream-ingest-saturation.md`, tem a matriz de saturação de ingestão.

Credencial de câmera nunca vai em comando compartilhado: use `$CRED`. Meça no path do MediaMTX, nunca
abrindo uma puxada nova na câmera.

## Estado do MediaMTX

A 9997 não é publicada no host; os comandos rodam dentro do container.

```bash
# paths, bytes recebidos e leitores; rodar duas vezes com 10 s de intervalo dá a taxa de ingestão
for i in 1 2; do docker compose exec -T mediamtx wget -qO- localhost:9997/v3/paths/list \
 | python3 -c 'import json,sys; [print(p["name"], p.get("available"), p.get("inboundBytes"), len(p.get("readers") or [])) for p in json.load(sys.stdin)["items"]]'; sleep 10; done

# por que a puxada falhou: campo lastError
docker compose exec mediamtx wget -qO- localhost:9997/v3/paths/static-sources/get/<path>

# sessões de leitura
docker compose exec mediamtx wget -qO- localhost:9997/v3/webrtc/sessions/list
docker compose exec mediamtx wget -qO- localhost:9997/v3/hls/sessions/list
```

Leitura: `available: true` com leitores é puxada viva; `available: false` sem erro é path ocioso, o normal;
`available` com `readers` vazio além de 30 s é config errada. Ignore o campo `online`.

## Quantas vezes a câmera está sendo puxada

```bash
ss -tn state established '( dport = :554 )'
```

Aceite: uma sessão por path aberto (câmera, tier e codec). Mais que isso, procure tier, codec, tenant ou
projeção do videowall abrindo paths distintos.

## FPS e GOP no path, sem decodificar

```bash
ffprobe -v error -rtsp_transport tcp -i rtsp://localhost:8554/<cameraId>-<quality> \
  -select_streams v:0 -show_entries frame=pts_time,pict_type,pkt_size -of csv=p=0 -read_intervals '%+20'
```

Numa Axis o keyframe deve vir a cada `round(fps x 0,3)` quadros.

## Visão do servidor e saúde do serviço

```bash
curl -s "$ATTLAS_API/api/cameras/<id>/stream-diagnostics?quality=<q>&codec=<c>" \
  -H "Authorization: Bearer $TOKEN" -H "System-Id: $SYSTEM_ID"
docker inspect attlas-ms-cameras --format '{{.RestartCount}} {{.State.StartedAt}}'
curl -s localhost:<porta>/metrics -H "Authorization: Bearer $METRICS_SCRAPE_TOKEN" | grep ms_cameras_stream_
```

Depois de um deploy, 502 por 4 a 5 minutos é a janela de boot do `ms-cameras`: não reiniciar.

## Travamento só no WebRTC

No navegador, `chrome://webrtc-internals` ou `getStats()` do receiver: `packetsLost`, `freezeCount`,
`pliCount` e `framesDecoded`. Perda no transporte UDP de saída é `ingest.bytesReceived` liso no diagnóstico
enquanto esses contadores sobem e `framesDecoded` para cerca de um GOP a cada travada. Buraco no
`bytesReceived` aponta para antes do MediaMTX, e o LL-HLS travaria junto.

## Rede do host

```bash
tailscale ping 100.77.100.21     # aquario-server, roteador da LAN de câmeras 10.1.1.0/24
```

Todas as câmeras offline juntas: confira esse caminho primeiro. WebRTC público que nunca conecta depois de
mexer na Tailscale: a cadeia `FORWARD` perdeu o salto para `DOCKER`; reponha com
`iptables -A FORWARD -o br-<id> -j DOCKER` e mantenha o `fix-docker-forward.service` habilitado no host.

## O que não funciona mais

- `curl localhost:9998/metrics`: o MediaMTX está com `metrics: no`.
- `docker exec attlas-ms-cameras ffmpeg ...`: a imagem não tem `ffmpeg`.
- `DELETE /api/cameras/:id/hls` e URLs `/whep` ou `/mtx-hls` absolutas: o caminho é `/live` e `/live-hls`.
