---
tags:
  - doc
  - ms-cameras
  - cameras
  - dispositivo
aliases:
  - "ffmpeg-onvif-camera-testing"
atualizado: 2026-08-24
---

# Runbook - teste de câmera por terminal (ffmpeg e ONVIF)

Comandos de referência pra testar as câmeras do Attlas direto do terminal: vídeo (ffmpeg/ffprobe),
snapshot, ONVIF, ISAPI e PTZ. As duas câmeras Axis abaixo são o caso mais comum, então o jeito mais
simples de PTZ/snapshot nelas é a API VAPIX (HTTP); ONVIF fica como alternativa padrão. Desde agosto
existe também uma Hikvision real de teste (ONVIF desligado de fábrica) - seção própria no fim.

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

## Vídeo - ffmpeg / ffprobe

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

## Snapshot e info - VAPIX (Axis, HTTP)

```bash
# Snapshot JPEG
curl -su $CRED "http://$CAM/axis-cgi/jpg/image.cgi?resolution=1920x1080" -o /tmp/snap.jpg

# Infos do device (modelo, firmware, serial)
curl -su $CRED "http://$CAM/axis-cgi/param.cgi?action=list&group=Brand"
curl -su $CRED "http://$CAM/axis-cgi/param.cgi?action=list&group=Properties.System"

# Listar resoluções/codecs disponíveis
curl -su $CRED "http://$CAM/axis-cgi/param.cgi?action=list&group=Image"
```

## PTZ - VAPIX (só a Q6135-LE 10.1.1.79)

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

## Hikvision (ISAPI, ONVIF desligado de fábrica) - chegada de agosto

Câmera real de teste: `192.168.210.80` (rede local, não tailnet), `admin` / `Sinales123`,
DS-2CD1023G0E-I firmware V5.7.12 - ver [[Runbook - câmeras reais para teste]]. `/onvif/device_service`
responde 404 até alguém ativar o ONVIF (manualmente ou via INT-020 no cadastro).

```bash
HKV=192.168.210.80
HKVCRED=admin:Sinales123

# RTSP - canal principal (101) e sub-stream (102)
ffprobe -v error -rtsp_transport tcp \
  -i "rtsp://$HKVCRED@$HKV:554/Streaming/Channels/101" -show_streams -show_format

# Status do device via ISAPI (o mesmo endpoint que o poll de saúde usa) - curl resolve o
# desafio Digest sozinho com --digest
curl -s --digest -u $HKVCRED "http://$HKV/ISAPI/System/status"
curl -s --digest -u $HKVCRED "http://$HKV/ISAPI/System/deviceInfo"

# Bitrate configurado do canal (o que o INT-006/PROJ-008 lê)
curl -s --digest -u $HKVCRED "http://$HKV/ISAPI/Streaming/channels/101"

# Estado do ONVIF (bloco <ONVIF><enable>) - fica false até alguém ativar
curl -s --digest -u $HKVCRED "http://$HKV/ISAPI/System/Network/Integrate"
```

Depois que o ONVIF estiver ativo (`<enable>true</enable>` na resposta acima), o mesmo bloco de
comandos ONVIF/Python da seção anterior funciona nela como em qualquer outra câmera Profile S -
troque o IP e a credencial.

## Onde isso vive no Attlas

- Seed local (dev): `apps/ms-cameras/src/database/seed.ts` - define as câmeras Axis (demo
  10.1.1.78, PTZ 10.1.1.79) e a Hikvision (`upsertHikvisionCamera`, 192.168.210.80) com os mesmos
  RTSP/tokens/credenciais usados aqui.
- Produção (EC2): a PTZ (10.1.1.79) está OPERATIONAL nos 6 sistemas-tenant; profiles
  PRIMARY `profile_1_h264` (1080p) e SECONDARY `profile0`. O player puxa via WHEP
  (mediamtx) com fallback HLS; o ms-cameras roda o relay ffmpeg RTSP→mediamtx.
