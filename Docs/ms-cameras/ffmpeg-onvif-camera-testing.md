# Teste de câmeras via terminal — ffmpeg, RTSP, ONVIF/VAPIX

Comandos de referência pra testar as câmeras Axis do Attlas direto do terminal:
vídeo (ffmpeg/ffprobe), snapshot, ONVIF e PTZ. As câmeras são Axis, então o jeito
mais simples de PTZ/snapshot é a API VAPIX (HTTP); ONVIF fica como alternativa padrão.

## Câmeras (via VPN/tailnet)

| Câmera | IP (tailnet) | Modelo | PTZ | Login |
|---|---|---|---|---|
| PTZ | `10.1.1.79` | AXIS Q6135-LE | mecânica (pan/tilt/zoom) | `root` / `Sinales123` |
| Demo | `10.0.0.79` | AXIS M1135 Mk II | digital (sem mecânica) | `root` / `Sinales123` |

> Reachability: os IPs `10.1.1.x` chegam pela tailnet (rota `tailscale0`). Confirme com
> `ping 10.1.1.79` e `nc -vz 10.1.1.79 80` / `nc -vz 10.1.1.79 554` antes de testar.

Defina uma vez por sessão pra encurtar:

```bash
CAM=10.1.1.79            # PTZ; troque por 10.0.0.79 para a demo
CRED=root:Sinales123
RTSP="rtsp://$CRED@$CAM:554/axis-media/media.amp"
```

## Vídeo — ffmpeg / ffprobe

```bash
# Inspecionar o stream (codec, resolução, fps) sem abrir janela
ffprobe -v error -rtsp_transport tcp -i "$RTSP" -show_streams -show_format

# Assistir ao vivo (força TCP: mais estável que UDP na VPN)
ffplay -rtsp_transport tcp -fflags nobuffer "$RTSP"

# Gravar 10s sem re-encodar (cópia direta)
ffmpeg -rtsp_transport tcp -i "$RTSP" -t 10 -c copy /tmp/cam.mp4

# 1 frame de snapshot
ffmpeg -rtsp_transport tcp -i "$RTSP" -frames:v 1 -q:v 2 /tmp/cam.jpg

# Sub-stream com resolução/codec forçados (VAPIX no path RTSP)
ffplay -rtsp_transport tcp \
  "rtsp://$CRED@$CAM:554/axis-media/media.amp?resolution=1280x720&videocodec=h264"
```

Medir fps/latência real (útil pra bater com a badge do player):

```bash
ffmpeg -rtsp_transport tcp -i "$RTSP" -an -f null - 2>&1 | grep -E "fps|frame="
```

## Snapshot e info — VAPIX (Axis, HTTP)

```bash
# Snapshot JPEG
curl -su $CRED "http://$CAM/axis-cgi/jpg/image.cgi?resolution=1920x1080" -o /tmp/snap.jpg

# Infos do device (modelo, firmware, serial)
curl -su $CRED "http://$CAM/axis-cgi/param.cgi?action=list&group=Brand"
curl -su $CRED "http://$CAM/axis-cgi/param.cgi?action=list&group=Properties.System"

# Listar resoluções/codecs disponíveis
curl -su $CRED "http://$CAM/axis-cgi/param.cgi?action=list&group=Image"
```

## PTZ — VAPIX (só a Q6135-LE 10.1.1.79)

```bash
PTZ="http://$CRED@10.1.1.79/axis-cgi/com/ptz.cgi"

# Posição/estado atual
curl -s "$PTZ?query=position"
curl -s "$PTZ?query=limits"

# Movimento contínuo (velocidade -100..100). SEMPRE parar depois.
curl -s "$PTZ?continuouspantiltmove=40,0"     # pan direita
curl -s "$PTZ?continuouspantiltmove=-40,0"    # pan esquerda
curl -s "$PTZ?continuouspantiltmove=0,30"     # tilt cima
curl -s "$PTZ?continuouspantiltmove=0,0"      # PARAR pan/tilt
curl -s "$PTZ?continuouszoommove=50"          # zoom in
curl -s "$PTZ?continuouszoommove=0"           # PARAR zoom

# Movimento absoluto / relativo
curl -s "$PTZ?pan=10&tilt=-5&zoom=2000"
curl -s "$PTZ?rpan=5&rtilt=0"

# Presets do servidor
curl -s "$PTZ?query=presetposall"
curl -s "$PTZ?gotoserverpresetno=1"
curl -s "$PTZ?gotoserverpresetname=Home"
```

> Dica: um pan contínuo sem o `...=0,0` de parada deixa a câmera girando. Sempre
> mande o stop logo após testar o movimento.

## ONVIF (padrão, alternativa ao VAPIX)

Endpoint do device service Axis: `http://10.1.1.79/onvif/device_service`.
Jeito prático com Python (`pip install onvif-zeep`):

```python
from onvif import ONVIFCamera
cam = ONVIFCamera("10.1.1.79", 80, "root", "Sinales123")

dev = cam.create_devicemgmt_service()
print(dev.GetDeviceInformation())           # modelo, firmware, serial

media = cam.create_media_service()
profiles = media.GetProfiles()
token = profiles[0].token
print([p.token for p in profiles])          # profile_1_h264, profile0, ...
print(media.GetStreamUri({
    "StreamSetup": {"Stream": "RTP-Unicast", "Transport": {"Protocol": "RTSP"}},
    "ProfileToken": token,
}))

# PTZ contínuo + stop
ptz = cam.create_ptz_service()
ptz.ContinuousMove({"ProfileToken": token,
                    "Velocity": {"PanTilt": {"x": 0.4, "y": 0.0}}})
import time; time.sleep(1)
ptz.Stop({"ProfileToken": token})
```

CLI rápida (`pip install onvif-zeep`, vem com o `onvif-cli`):

```bash
onvif-cli --host 10.1.1.79 --port 80 -u root -a Sinales123
# > cmd devicemgmt GetDeviceInformation
# > cmd media GetProfiles
```

## Onde isso vive no Attlas

- Seed local (dev): `apps/ms-cameras/src/database/seed.ts` — define estas câmeras
  (demo 10.1.1.78, PTZ 10.1.1.79) com os mesmos RTSP/tokens ONVIF.
- Produção (EC2): a PTZ (10.1.1.79) está OPERATIONAL nos 6 sistemas-tenant; profiles
  PRIMARY `profile_1_h264` (1080p) e SECONDARY `profile0`. O player puxa via WHEP
  (mediamtx) com fallback HLS; o ms-cameras roda o relay ffmpeg RTSP→mediamtx.
