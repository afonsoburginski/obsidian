---
tags:
  - doc
  - cameras
  - videowall
  - quito
aliases:
  - "Videowall H9 Quito - Teste de streaming"
atualizado: 2026-10-14
---

# Videowall H9 Quito - Teste de streaming

Comandos para abrir no `ffplay` o stream que o videowall entrega ao H9. Diagnóstico em
[[Videowall H9 Quito - Diagnóstico]]. Credenciais em [[Videowall H9 Quito - Credenciais]].

## Qualquer espelhamento

O final do endereço (`videowall-mirror-<id>`) muda a cada espelhamento. Com a tela espelhando, estes comandos
buscam o caminho no ar e já abrem o vídeo.

Pela internet:

```bash
P=$(ssh ec2-attlas 'PATH=$HOME/bin:$PATH kubectl --context kind-attlas -n attlas-dev exec deploy/ms-cameras -- wget -qO- "http://mediamtx:9997/v3/paths/list?itemsPerPage=1000"' | python3 -c "import sys,json; print(next(i['name'] for i in json.load(sys.stdin)['items'] if i['name'].startswith('videowall-mirror-') and i['ready']))"); ffplay -rtsp_transport tcp "rtsp://videowall-h9-reader:b-dmbYRLAQnXPS-FeK4lKDhVz5LKWvBw@3.15.199.101:554/$P"
```

Pela VPN de Quito:

```bash
sudo wg-quick up /home/afonso/.config/wireguard/wg-quito.conf
P=$(ssh ec2-attlas 'PATH=$HOME/bin:$PATH kubectl --context kind-attlas -n attlas-dev exec deploy/ms-cameras -- wget -qO- "http://mediamtx:9997/v3/paths/list?itemsPerPage=1000"' | python3 -c "import sys,json; print(next(i['name'] for i in json.load(sys.stdin)['items'] if i['name'].startswith('videowall-mirror-') and i['ready']))"); ffplay -rtsp_transport tcp "rtsp://videowall-h9-reader:b-dmbYRLAQnXPS-FeK4lKDhVz5LKWvBw@192.168.10.11:554/$P"
```

O MediaMTX entrega RTSP só por TCP, por isso o `-rtsp_transport tcp`.

> [!warning] O MediaMTX guarda caminhos de espelhamentos antigos
> A lista tem caminhos `videowall-mirror-*` que não estão mais no ar e vem paginada em 100 itens. Por isso o
> comando pede `itemsPerPage=1000` e escolhe só o caminho com `ready`.
