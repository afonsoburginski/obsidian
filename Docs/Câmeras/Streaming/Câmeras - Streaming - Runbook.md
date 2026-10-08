---
tags:
  - doc
  - cameras
  - streaming
  - runbook
  - ms-cameras
aliases:
  - "Runbook - Streaming"
  - "Câmeras - Streaming - Runbook"
atualizado: 2026-10-07
banner: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200"
---

# Câmeras - Streaming - Runbook

Volta para [[Câmeras - Streaming]].

## Resumo

| Pergunta | Seção |
| --- | --- |
| Quais paths estão abertos e com quantos leitores? | Como vejo o estado dos paths no MediaMTX |
| Por que a puxada de uma câmera falhou? | Como sei por que a puxada falhou |
| Quantas conexões RTSP saem para a câmera? | Como sei quantas vezes a câmera está sendo puxada |
| Qual o FPS e o GOP de um path? | Como meço FPS e GOP de um path |
| Como o servidor enxerga um stream? | Como vejo o stream pela visão do servidor |
| O travamento é só do WebRTC? | Como sei se o travamento é só do WebRTC |
| A rota de vídeo do servidor bate com a do `ms-cameras`? | Como confiro a rota de vídeo do servidor |
| As câmeras sumiram todas juntas | Como sei se a rede do host até as câmeras está de pé |

Os comandos rodam no host que roda o compose: o dev.v2 (`ssh aws-attlas-26`) ou o stack local. Acesso aos hosts e
comandos gerais em [[Infraestrutura - Runbook - Comandos]]. Mecanismos em
[[Câmeras - Streaming - Arquitetura e estratégias]]. Comandos direto na câmera (ffprobe, VAPIX, ONVIF, ISAPI) estão
em [[Câmeras - Integração com dispositivo - Runbook]]. A matriz de saturação de ingestão está no runbook do
repositório, `apps/ms-cameras/docs/runbooks/stream-ingest-saturation.md`.

Credencial de câmera nunca vai em comando compartilhado: use `$CRED`. Meça no path do MediaMTX, nunca abrindo uma
puxada nova na câmera.

## Como vejo o estado dos paths no MediaMTX

A imagem do MediaMTX não tem shell nem `wget`, e a 9997 não é publicada no host. A control API se lê de dentro do
container do `ms-cameras`, que está na mesma rede e tem `wget`:

```bash
# paths, disponibilidade, bytes recebidos e leitores; duas leituras com 10 s de intervalo dão a taxa de ingestão
for i in 1 2; do docker exec attlas-ms-cameras wget -qO- http://mediamtx:9997/v3/paths/list \
 | python3 -c 'import json,sys; [print(p["name"], p.get("available"), p.get("inboundBytes"), len(p.get("readers") or [])) for p in json.load(sys.stdin)["items"]]'; sleep 10; done

# sessões de leitura
docker exec attlas-ms-cameras wget -qO- http://mediamtx:9997/v3/webrtc/sessions/list
docker exec attlas-ms-cameras wget -qO- http://mediamtx:9997/v3/hls/sessions/list
```

No stack local, o `docker-compose.override.yml` publica a 9997 em `127.0.0.1`, e basta
`curl -s localhost:9997/v3/paths/list`.

Leitura: `available: true` com leitores é puxada viva; `available: false` sem erro é path ocioso, o normal;
`available` com `readers` vazio além de 30 s é config errada. Ignore o campo `online`, que mente em path sob
demanda.

## Como sei por que a puxada falhou

```bash
docker exec attlas-ms-cameras wget -qO- http://mediamtx:9997/v3/paths/static-sources/get/<path>
```

Leitura: o campo `lastError` traz o erro da puxada enquanto a fonte ainda tenta abrir; o MediaMTX o limpa a cada
nova tentativa (5 s) e ao parar. Recusa RTSP 4xx num path `-h265` ou `-av1` de Axis é o gatilho do fallback para
H.264; 401 e 407 são credencial, não codec.

## Como sei quantas vezes a câmera está sendo puxada

A conexão RTSP vive na rede do container do MediaMTX, então o `ss` do host não a enxerga. Entre na rede do
container:

```bash
PID=$(docker inspect -f '{{.State.Pid}}' attlas-mediamtx)
sudo nsenter -t "$PID" -n ss -tn state established '( dport = :554 )'
```

Leitura: uma conexão por path aberto (câmera, tier e codec). Mais que isso, procure tier, codec, linha de tenant ou
projeção do videowall abrindo paths distintos.

## Como meço FPS e GOP de um path

```bash
ffprobe -v error -rtsp_transport tcp -i rtsp://<host>:8554/<cameraId>-<quality> \
  -select_streams v:0 -show_entries frame=pts_time,pict_type,pkt_size -of csv=p=0 -read_intervals '%+20'
```

Leitura: numa Axis o keyframe (`pict_type` `I`) deve vir a cada `round(fps x 0,3)` quadros. O host do dev.v2 não
tem `ffprobe` instalado. A leitura conta como leitor do path: com o path já aberto por um espectador ela não abre
puxada nova; com o path ocioso, ela mesma abre a câmera.

## Como vejo o stream pela visão do servidor

```bash
curl -s "$ATTLAS_API/api/cameras/<id>/stream-diagnostics?quality=<q>&codec=<c>" \
  -H "Authorization: Bearer $TOKEN" -H "System-Id: $SYSTEM_ID"
docker inspect attlas-ms-cameras --format '{{.RestartCount}} {{.State.StartedAt}}'
curl -s localhost:<porta>/metrics -H "Authorization: Bearer $METRICS_SCRAPE_TOKEN" | grep ms_cameras_stream_
```

Leitura: o diagnóstico devolve `OK`, `DEGRADED`, `DOWN` ou `INACTIVE` (significados em
[[Câmeras - Streaming - Fluxos]]). Depois de um deploy, 502 por 4 a 5 minutos é a janela de boot do `ms-cameras`:
não reiniciar. Um 502 `HLS_START_TIMEOUT` com segundo item em `errors` diz por que o MediaMTX não aceitou a config:
`MEDIAMTX_UNREACHABLE`, `MEDIAMTX_API_FORBIDDEN` (confira `MEDIAMTX_API_ALLOWED_IPS`), `MEDIAMTX_CONFIG_REJECTED`
ou `MEDIAMTX_API_ERROR`.

## Como sei se o travamento é só do WebRTC

No navegador, `chrome://webrtc-internals` ou `getStats()` do receiver: `packetsLost`, `freezeCount`, `pliCount` e
`framesDecoded`.

Leitura: perda no transporte UDP de saída é `ingest.bytesReceived` liso no diagnóstico enquanto esses contadores
sobem e `framesDecoded` para cerca de um GOP a cada travada. Buraco no `bytesReceived` aponta para antes do
MediaMTX, e o LL-HLS travaria junto.

## Como confiro a rota de vídeo do servidor

```bash
grep -E '^MEDIAMTX_(WEBRTC|HLS)_BASE_URL' ~/apps/ms-cameras/.env.docker
grep -n -E 'location|proxy_pass' /etc/nginx/sites-available/attlas
```

Leitura: o prefixo de cada base precisa ter um `location` no nginx do host que leve à 8889 (WebRTC) e à 8888
(LL-HLS). No dev.v2 as bases são `https://dev.v2.attlas.atmansystems.com/whep` e `.../mtx-hls`, atendidas por
`location /whep/` e `location /mtx-hls/`; o padrão do repositório é `/live` e `/live-hls`. Base sem rota no nginx
cai no `location /` do SPA, e o WHEP nunca negocia. A configuração completa está em
[[Câmeras - Streaming - Explicação - Como liberar o WebRTC num servidor novo]].

## Como sei se a rede do host até as câmeras está de pé

```bash
tailscale ping 100.77.100.21     # aquario-server, roteador da LAN de câmeras 10.1.1.0/24
```

Leitura: todas as câmeras offline juntas, confira esse caminho primeiro. WebRTC público que nunca conecta depois
de mexer na Tailscale quer dizer que a cadeia `FORWARD` perdeu o salto para `DOCKER`; reponha com
`iptables -A FORWARD -o br-<id> -j DOCKER` e mantenha o `fix-docker-forward.service` habilitado no host.

## O que não funciona

- `docker compose exec mediamtx <comando>`: a imagem não tem shell nem utilitários.
- `curl localhost:9998/metrics`: o MediaMTX está com `metrics: no`.
- `docker exec attlas-ms-cameras ffmpeg ...`: a imagem não tem `ffmpeg`.
- `DELETE /api/cameras/:id/hls`: não existe; o path fecha sozinho 30 s depois do último leitor.
- `ss` no host para contar puxadas RTSP: a conexão está na rede do container.
