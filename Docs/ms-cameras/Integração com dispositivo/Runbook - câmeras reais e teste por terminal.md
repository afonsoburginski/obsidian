---
tags:
  - doc
  - ms-cameras
  - dispositivo
  - runbook
aliases:
  - "Runbook - câmeras reais para teste"
  - "Câmeras reais - conexão para testes"
  - "Runbook - teste de câmera por terminal (ffmpeg e ONVIF)"
  - "ffmpeg-onvif-camera-testing"
  - "Consultar câmera Hikvision via ISAPI"
  - "ISAPI Hikvision"
  - "Consultar câmera Hikvision"
atualizado: 2026-10-01
---

# Runbook - câmeras reais e teste por terminal

Parte da [[Integração com dispositivo]]. As câmeras reais de bancada e os comandos para interrogá-las direto
do terminal, sem passar pelo Attlas, para responder se o problema é a câmera ou o nosso código. Diagnóstico
do vídeo como a plataforma o vê (MediaMTX, sessões, FPS no path) fica em [[Runbook - Streaming]]; o ACAP do
analítico embarcado, em [[Runbook - analítico embarcado]].

## Câmeras de bancada

| Câmera | IP | Modelo | O que tem | Login |
| --- | --- | --- | --- | --- |
| ATM-PTZ | `10.1.1.79` | AXIS Q6135-LE | PTZ mecânico; perfis `profile_1_h264` e `profile0`, ambos 1080p H264 | `root` / `Sinales123` |
| ATMN - DEMO | `10.1.1.78` | AXIS M1135 Mk II | Câmera fixa com zoom digital; roda o app `atman_traffic_edge_sdct` | `root` / `Sinales123` |
| ATMN - EMBEDDED 080 | `10.1.1.80` | AXIS P1475-LE | Câmera fixa com o ACAP `atman_traffic_edge_atspm` (analítico embarcado) | `root` / `Sinales123` |
| HKV | `192.168.210.80` | Hikvision DS-2CD1023G0E-I, firmware V5.7.12 | Câmera fixa; ONVIF desligado de fábrica | `admin` / `Sinales123` |

- As três Axis são as do seed de desenvolvimento (`apps/ms-cameras/src/database/seed.ts`), num único sistema;
  a Hikvision não está no seed e se cadastra pela tela.
- Porta 80 para gestão (ONVIF, VAPIX, ISAPI), que é o default do campo de porta no cadastro; RTSP na 554,
  resolvido pela sondagem, sem digitar nada. O campo de porta só importa atrás de NAT ou port-forward.
- A rede `10.1.1.x` chega pela tailnet, roteada pelo subnet router `aquario-server`. Antes de reportar bug de
  conectividade, confira `tailscale ping` e `nc -vz <ip> 80` e `nc -vz <ip> 554`. A Hikvision está na rede
  local, fora da tailnet.

Variáveis por sessão, para não repetir credencial nos comandos:

```bash
CAM=10.1.1.79                 # troque pela câmera do teste
CRED='root:Sinales123'        # 'admin:Sinales123' na Hikvision
RTSP="rtsp://$CRED@$CAM:554/axis-media/media.amp"
```

## Vídeo por RTSP (ffprobe e ffmpeg)

Cada comando abre uma puxada nova na câmera, fora da plataforma.

```bash
# codec, resolução e fps, sem abrir janela (TCP é mais estável que UDP na VPN)
ffprobe -v error -rtsp_transport tcp -i "$RTSP" -show_streams -show_format

# assistir ao vivo
ffplay -rtsp_transport tcp -fflags nobuffer "$RTSP"

# gravar 10 s sem recodificar e tirar um quadro
ffmpeg -rtsp_transport tcp -i "$RTSP" -t 10 -c copy /tmp/cam.mp4
ffmpeg -rtsp_transport tcp -i "$RTSP" -frames:v 1 -q:v 2 /tmp/cam.jpg

# perfil reduzido pela própria URL, como o provisionamento faz na Axis
ffplay -rtsp_transport tcp "rtsp://$CRED@$CAM:554/axis-media/media.amp?resolution=1280x720&videocodec=h264"

# fps real do stream
ffmpeg -rtsp_transport tcp -i "$RTSP" -an -f null - 2>&1 | grep -E "fps|frame="
```

Na Hikvision o canal principal é `101` e o secundário `102`:
`rtsp://$CRED@192.168.210.80:554/Streaming/Channels/101`.

## Axis por VAPIX

```bash
# quadro JPEG
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/jpg/image.cgi?resolution=1920x1080" -o /tmp/snap.jpg

# identidade, propriedades e resoluções e codecs disponíveis
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/param.cgi?action=list&group=Brand"
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/param.cgi?action=list&group=Properties.System"
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/param.cgi?action=list&group=Image"

# apps instalados e log do sistema (sem SSH)
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/applications/list.cgi"
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/systemlog.cgi"
```

PTZ, só na `10.1.1.79`. Movimento contínuo sem a parada deixa a câmera girando: mande sempre o stop.

```bash
PTZ="http://10.1.1.79/axis-cgi/com/ptz.cgi"
curl -s --digest -u "$CRED" "$PTZ?query=position"
curl -s --digest -u "$CRED" "$PTZ?query=limits"
curl -s --digest -u "$CRED" "$PTZ?continuouspantiltmove=40,0"   # pan para a direita
curl -s --digest -u "$CRED" "$PTZ?continuouspantiltmove=0,0"    # parar pan e tilt
curl -s --digest -u "$CRED" "$PTZ?continuouszoommove=50"        # zoom
curl -s --digest -u "$CRED" "$PTZ?continuouszoommove=0"         # parar zoom
curl -s --digest -u "$CRED" "$PTZ?pan=10&tilt=-5&zoom=2000"     # absoluto, unidades nativas
curl -s --digest -u "$CRED" "$PTZ?rpan=5&rtilt=0"               # relativo
curl -s --digest -u "$CRED" "$PTZ?query=presetposall"
curl -s --digest -u "$CRED" "$PTZ?gotoserverpresetno=1"
```

## Hikvision por ISAPI

ONVIF desligado responde 404 em `/onvif/device_service` mesmo com credencial certa, o que parece problema de
credencial ou de rede. O teste que separa os casos é o ISAPI, sempre ativo, por HTTP Digest com o mesmo
usuário do painel web: se ele responde, a câmera está de pé, a credencial é válida e falta só ligar o ONVIF
(o cadastro do Attlas liga sozinho, INT-020; à mão, em Configuration, Network, Advanced Settings, Integration
Protocol).

```bash
HKV=192.168.210.80

# ONVIF ligado ou não, sem credencial: 404 desligado, 401 ligado pedindo autenticação
curl -s -o /dev/null -w "%{http_code}\n" "http://$HKV/onvif/device_service"

# identidade (prova a credencial), status (o heartbeat de reserva do ms-cameras)
curl -s --digest -u "$CRED" "http://$HKV/ISAPI/System/deviceInfo"
curl -s --digest -u "$CRED" "http://$HKV/ISAPI/System/status"

# canais de vídeo e bitrate configurado (o que o leitor de bitrate ISAPI lê)
curl -s --digest -u "$CRED" "http://$HKV/ISAPI/Streaming/channels"
curl -s --digest -u "$CRED" "http://$HKV/ISAPI/Streaming/channels/101"

# bloco <ONVIF><enable> e contas ONVIF, que são uma lista separada das contas web
curl -s --digest -u "$CRED" "http://$HKV/ISAPI/System/Network/Integrate"
curl -s --digest -u "$CRED" "http://$HKV/ISAPI/Security/ONVIF/users"

# PTZ real: câmera fixa responde Invalid Operation com subStatusCode notSupport
curl -s --digest -u "$CRED" "http://$HKV/ISAPI/PTZCtrl/channels/1/capabilities"
```

A interface web da Hikvision desenha setas, zoom e presets em quase todo modelo, inclusive nos fixos; a tela
não prova que há motor, o `PTZCtrl/.../capabilities` prova.

## ONVIF (qualquer fabricante com ONVIF ligado)

Com `pip install onvif-zeep`:

```python
from onvif import ONVIFCamera
cam = ONVIFCamera("10.1.1.79", 80, "root", "<senha>")

print(cam.create_devicemgmt_service().GetDeviceInformation())

media = cam.create_media_service()
profiles = media.GetProfiles()
token = profiles[0].token
print([p.token for p in profiles])
print(media.GetStreamUri({
    "StreamSetup": {"Stream": "RTP-Unicast", "Transport": {"Protocol": "RTSP"}},
    "ProfileToken": token,
}))

ptz = cam.create_ptz_service()
ptz.ContinuousMove({"ProfileToken": token, "Velocity": {"PanTilt": {"x": 0.4, "y": 0.0}}})
import time; time.sleep(1)
ptz.Stop({"ProfileToken": token})
```

Interativo: `onvif-cli --host 10.1.1.79 --port 80 -u root -a <senha>`, depois
`cmd devicemgmt GetDeviceInformation` e `cmd media GetProfiles`.

## Quem está falando com a câmera

O SNAT do Docker esconde a origem na interface da tailnet. Para saber qual container abre conexões com uma
câmera:

```bash
# origem antes do SNAT: mostra o IP do container
sudo tcpdump -i br-<bridge> -nn -q "host $CAM"
docker network inspect <rede> --format '{{range .Containers}}{{.IPv4Address}} {{.Name}}{{println}}{{end}}'

# conexões abertas pelo container, de dentro do namespace de rede dele
PID=$(docker inspect -f '{{.State.Pid}}' attlas-ms-cameras)
sudo nsenter -t $PID -n ss -tn state established
```

Payload de 6 bytes com resposta de 2 bytes na porta 80 é PING e PONG do WebSocket de eventos Axis, não HTTP.
Esperado: uma conexão por câmera física, por mais sistemas que a tenham cadastrada.
