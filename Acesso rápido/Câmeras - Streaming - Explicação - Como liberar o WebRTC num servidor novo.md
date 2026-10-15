---
tags:
  - doc
  - cameras
  - streaming
  - explicacao
aliases:
  - "Câmeras - Streaming - Explicação - Como liberar o WebRTC num servidor novo"
  - "Portas e configuração do WebRTC"
atualizado: 2026-10-07
---

# Câmeras - Streaming - Explicação - Como liberar o WebRTC num servidor novo

Volta para [[Câmeras - Streaming]].

## Resumo

O vídeo ao vivo das câmeras chega ao navegador por WebRTC, servido pelo MediaMTX, com atraso abaixo de 1 s. Num
servidor novo, isso exige três coisas: o firewall deixa entrar o 443 (TCP) e o 8189 (UDP); o MediaMTX anuncia o
IP público do servidor; e o nginx do servidor encaminha duas rotas de vídeo para o MediaMTX. Sem essas três, o
vídeo cai na reserva (HLS), com alguns segundos de atraso, ou não abre. Os caminhos de arquivo abaixo são os da
instalação em Docker Compose na pasta `~` do usuário `ubuntu`.

## Como o vídeo chega ao navegador, num exemplo

Servidor com o domínio `attlas.exemplo.gov.br` e o IP público `203.0.113.10`. O operador abre uma câmera:

1. O navegador pede à API onde tocar a câmera e recebe o endereço `/live/<câmera>-secondary/whep`.
2. O navegador negocia a conexão em `https://attlas.exemplo.gov.br/live/<câmera>-secondary/whep`. O nginx recebe
   no 443 e repassa ao MediaMTX na porta 8889.
3. O MediaMTX responde dizendo "mande o vídeo para `203.0.113.10`, porta 8189 UDP".
4. O vídeo sai do MediaMTX direto para o navegador por UDP 8189, sem passar pelo nginx.

Se o passo 4 falha (porta 8189 fechada ou IP anunciado errado), o player tenta a reserva:
`https://attlas.exemplo.gov.br/live-hls/<câmera>-secondary/index.m3u8`, que o nginx repassa ao MediaMTX na porta
8888. A imagem aparece, alguns segundos atrasada, com o selo `HLS` na célula.

## 1. Firewall de entrada

**Onde:** no firewall do provedor. Na AWS: EC2, Security Groups, grupo da instância, Inbound rules.

| Porta | Protocolo | Para quê |
| --- | --- | --- |
| 443 | TCP | Site, API e a negociação da conexão de vídeo (HTTPS) |
| 8189 | UDP | O vídeo ao vivo (mídia do WebRTC) |

Não abrir para fora:

| Porta | Por quê |
| --- | --- |
| 8888 e 8889 | o navegador chega a elas pelo 443, através do nginx |
| 9997 | API do MediaMTX; devolve a senha das câmeras |
| 8554 | RTSP do videowall; o compose a publica no host, mas ela não é para a internet |
| 3478, 5349 e 49160 a 49200 | portas de TURN, que não são usadas |

**Saída:** o servidor precisa alcançar as câmeras em **554/TCP** (RTSP).

## 2. MediaMTX: anunciar o IP público

**Onde:** `~/docker-compose.override.yml`, no serviço `mediamtx`:

```yaml
services:
  mediamtx:
    environment:
      MTX_WEBRTCADDITIONALHOSTS: "<IP público do servidor>"
```

Nunca um IP de VPN (Tailscale, WireGuard): com ele o navegador tenta o caminho da VPN e o vídeo trava.

**Aplicar:**

```bash
docker compose up -d --no-deps mediamtx
```

## 3. MediaMTX: portas publicadas

**Onde:** `~/docker-compose.yml`, serviço `mediamtx`, em `ports`. Já vem assim no compose do projeto:

```yaml
    ports:
      - '8888:8888'
      - '8889:8889'
      - '8189:8189/udp'
      - '8554:8554'
```

O `~/docker/mediamtx.yml` também já vem pronto (`webrtcLocalUDPAddress: :8189` e `udpMaxPayloadSize: 1200`); não
precisa mudar.

## 4. Nginx: as rotas de vídeo

**Onde:** `/etc/nginx/sites-available/attlas`, dentro do bloco `server { ... }` do domínio, antes do
`location /` que serve o site.

```nginx
location /live/ {
    proxy_pass         http://127.0.0.1:8889/;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering    off;
    proxy_read_timeout 300s;
}

location /live-hls/ {
    proxy_pass         http://127.0.0.1:8888/;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_redirect     / /live-hls/;
    proxy_buffering    off;
    proxy_read_timeout 300s;
}
```

O `proxy_redirect` devolve o prefixo `/live-hls/` aos redirecionamentos que o MediaMTX responde. A rota `/live/`
também recebe a tela que o console publica no espelho do videowall.

Se o servidor usa o espelho do videowall, o painel lê a tela espelhada por uma terceira rota, que injeta o usuário
leitor do espelho. O navegador nunca recebe essa credencial:

```nginx
location /mirror-playback/ {
    proxy_pass         http://127.0.0.1:8889/;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header Authorization     "Basic <usuário:senha do leitor do espelho, em base64>";
    proxy_buffering    off;
    proxy_read_timeout 300s;
}
```

O valor em base64 sai das variáveis `VIDEOWALL_MIRROR_READER_USERNAME` e `VIDEOWALL_MIRROR_READER_PASSWORD` do
`~/.env`. Se a credencial mudar, recalcule:

```bash
set -a; . ~/.env; set +a
printf '%s:%s' "$VIDEOWALL_MIRROR_READER_USERNAME" "$VIDEOWALL_MIRROR_READER_PASSWORD" | base64 -w0
```

**Aplicar:**

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 5. ms-cameras: conferir as rotas

**Onde:** `~/apps/ms-cameras/.env.docker`. O padrão do projeto já aponta para as rotas do passo 4:

```env
MEDIAMTX_WEBRTC_BASE_URL=/live
MEDIAMTX_HLS_BASE_URL=/live-hls
```

O nome da rota pode ser outro, desde que a variável e o `location` do nginx usem o mesmo prefixo. O dev.v2 usa
`/whep/` e `/mtx-hls/` no nginx, com a variável escrita como endereço completo:

```env
MEDIAMTX_WEBRTC_BASE_URL=https://dev.v2.attlas.atmansystems.com/whep
MEDIAMTX_HLS_BASE_URL=https://dev.v2.attlas.atmansystems.com/mtx-hls
```

Variável sem rota correspondente no nginx faz o pedido cair no site, e o vídeo nunca abre.

**Aplicar:**

```bash
docker compose up -d --force-recreate ms-cameras
```

## 6. Testar

- Abrir uma câmera no Attlas. Imagem com menos de 1 s de atraso: WebRTC funcionando.
- Imagem com alguns segundos de atraso e o selo `HLS` na célula: caiu na reserva. A UDP 8189 está bloqueada
  (passo 1) ou o IP anunciado está errado (passo 2).
- Câmera que não abre nem pela reserva: confira se a variável do passo 5 e a rota do passo 4 usam o mesmo prefixo.
- No Chrome, `chrome://webrtc-internals` mostra a conexão como `connected` quando está tudo certo.

Diagnóstico mais fundo em [[Câmeras - Streaming - Runbook]].

## Glossário

| Termo | O que é |
| --- | --- |
| WebRTC | Tecnologia do navegador para receber vídeo ao vivo com atraso abaixo de 1 s |
| MediaMTX | Servidor de vídeo do Attlas: puxa a câmera e entrega o vídeo aos navegadores |
| HLS | Vídeo entregue em pedaços por HTTP; mais tolerante a rede ruim, com alguns segundos de atraso |
| UDP | Tipo de tráfego de rede usado pelo vídeo do WebRTC; não passa pelo nginx |
| IP anunciado | O endereço que o MediaMTX informa ao navegador para receber o vídeo |
| Security Group | O firewall da instância na AWS |
| Espelho do videowall | Tela do console de um operador projetada no painel do videowall |
