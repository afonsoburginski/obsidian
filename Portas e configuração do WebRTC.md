# Portas e configuração do WebRTC

O vídeo ao vivo das câmeras chega ao navegador por WebRTC, servido pelo MediaMTX. No servidor novo:
duas portas abertas e quatro arquivos configurados. Os caminhos abaixo são os do servidor atual (pasta
`~` do usuário `ubuntu`, com o Attlas em Docker Compose).

## 1. Firewall de entrada

**Onde:** no firewall do provedor. Na AWS: EC2 > Security Groups > grupo da instância > Inbound rules.

| Porta | Protocolo | Para quê |
| --- | --- | --- |
| 443 | TCP | Site, API e a negociação da conexão de vídeo (HTTPS) |
| 8189 | UDP | O vídeo ao vivo (mídia do WebRTC) |

Não abrir para fora: 8888 e 8889 (o navegador chega a elas pelo 443), 9997 (API do MediaMTX, devolve a
senha das câmeras), 8554 e as portas de TURN (3478, 5349, 49160 a 49200), que não são usadas.

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

**Aplicar:** `docker compose up -d --no-deps mediamtx`

## 3. MediaMTX: publicar a porta do vídeo

**Onde:** `~/docker-compose.yml`, serviço `mediamtx`, em `ports`. Já vem assim no compose do projeto:

```yaml
    ports:
      - '8888:8888'
      - '8889:8889'
      - '8189:8189/udp'
```

O `~/docker/mediamtx.yml` também já vem pronto (`webrtcLocalUDPAddress: :8189` e
`udpMaxPayloadSize: 1200`); não precisa mudar.

## 4. Nginx: as duas rotas de vídeo

**Onde:** `/etc/nginx/sites-available/attlas`, dentro do bloco `server { ... }` do domínio:

```nginx
location /whep/ {
    proxy_pass         http://127.0.0.1:8889/;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering    off;
    proxy_read_timeout 300s;
}

location /mtx-hls/ {
    proxy_pass         http://127.0.0.1:8888/;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_redirect     / /mtx-hls/;
    proxy_buffering    off;
    proxy_read_timeout 300s;
}
```

**Aplicar:** `sudo nginx -t && sudo systemctl reload nginx`

## 5. ms-cameras: apontar para as rotas

**Onde:** `~/apps/ms-cameras/.env.docker`:

```env
MEDIAMTX_WEBRTC_BASE_URL=https://<domínio>/whep
MEDIAMTX_HLS_BASE_URL=https://<domínio>/mtx-hls
```

**Aplicar:** `docker compose up -d --force-recreate ms-cameras`

## 6. Testar

- Abrir uma câmera no Attlas. Imagem com menos de 1 s de atraso: WebRTC funcionando.
- Imagem com alguns segundos de atraso: caiu na reserva (HLS). A UDP 8189 está bloqueada (item 1) ou o
  IP anunciado está errado (item 2).
- No Chrome, `chrome://webrtc-internals` mostra a conexão como `connected` quando está tudo certo.
