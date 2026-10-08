---
tags:
  - doc
  - cameras
  - dispositivo
  - runbook
  - ms-cameras
aliases:
  - "Runbook - câmeras reais para teste"
  - "Câmeras reais - conexão para testes"
  - "Runbook - teste de câmera por terminal (ffmpeg e ONVIF)"
  - "ffmpeg-onvif-camera-testing"
  - "Consultar câmera Hikvision via ISAPI"
  - "ISAPI Hikvision"
  - "Consultar câmera Hikvision"
  - "Runbook - câmeras reais e teste por terminal"
atualizado: 2026-10-07
banner: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=1200"
---

# Câmeras - Integração com dispositivo - Runbook

Volta para [[Câmeras - Integração com dispositivo]].

## Resumo

Comandos para interrogar as câmeras de bancada direto do terminal, sem passar pelo Attlas, e responder se o
problema está na câmera ou no nosso código. O diagnóstico do vídeo como a plataforma o vê (MediaMTX, sessões, fps
no path) está em [[Câmeras - Streaming - Runbook]]; o ACAP do analítico embarcado, em
[[Analítico - Runbook - Embarcado]]; o uso geral de `tailscale`, `nc`, `tcpdump` e `nsenter`, em
[[Infraestrutura - Runbook - Comandos]].

| Pergunta | Seção |
| --- | --- |
| Quais são as câmeras de bancada e como alcanço cada uma? | [[#Como alcanço as câmeras de bancada]] |
| Como preparo as variáveis da sessão sem expor a senha? | [[#Como preparo as variáveis da sessão]] |
| A câmera entrega vídeo por RTSP, e em que codec? | [[#Como sei se a câmera entrega vídeo por RTSP]] |
| Como assisto, gravo ou tiro um quadro do RTSP? | [[#Como assisto, gravo ou tiro um quadro do RTSP]] |
| Qual é o fps real do stream? | [[#Como meço o fps real do stream]] |
| Qual é a identidade, os codecs e o controle de taxa de uma Axis? | [[#Como leio identidade, codecs e controle de taxa de uma Axis]] |
| Como tiro um quadro ou leio apps e log de uma Axis sem SSH? | [[#Como tiro um quadro e leio apps e log de uma Axis]] |
| Como movo a PTZ da Axis por VAPIX? | [[#Como movo a PTZ da Axis por VAPIX]] |
| A Hikvision está de pé, e o ONVIF dela está ligado? | [[#Como sei se uma Hikvision está de pé e se o ONVIF está ligado]] |
| Que canais, bitrate e contas ONVIF a Hikvision tem? | [[#Como leio canais, bitrate e contas ONVIF da Hikvision]] |
| A Hikvision tem PTZ de verdade? | [[#Como sei se uma Hikvision tem PTZ de verdade]] |
| Como consulto e movo uma câmera por ONVIF? | [[#Como consulto e movo uma câmera por ONVIF]] |
| Qual container está abrindo conexões com uma câmera? | [[#Como sei qual container está falando com uma câmera]] |

## Como alcanço as câmeras de bancada

| Câmera | IP | Modelo | O que tem | Usuário |
| --- | --- | --- | --- | --- |
| ATM-PTZ | `10.1.1.79` | AXIS Q6135-LE | PTZ mecânico; perfis `profile_1_h264` e `profile0`, ambos 1080p H.264 | `root` |
| ATMN - DEMO | `10.1.1.78` | AXIS M1135 Mk II | Câmera fixa com zoom digital; roda o app `atman_traffic_edge_sdct` | `root` |
| ATMN - EMBEDDED 080 | `10.1.1.80` | AXIS P1475-LE | Câmera fixa com o ACAP `atman_traffic_edge_atspm` (analítico embarcado) | `root` |
| HKV | `192.168.210.80` | Hikvision DS-2CD1023G0E-I, firmware V5.7.12 | Câmera fixa; ONVIF desligado de fábrica | `admin` |

- As três Axis são as do seed de desenvolvimento (`apps/ms-cameras/src/database/seed.ts`), num único sistema; a
  Hikvision não está no seed e se cadastra pela tela.
- As quatro usam a mesma senha, guardada em `SEED_CAMERA_PASSWORD` no `apps/ms-cameras/.env` local.
- Gestão (ONVIF, VAPIX, ISAPI) na porta 80, que é o padrão do campo de porta no cadastro; RTSP na 554, resolvido
  pela sondagem. O campo de porta só importa atrás de NAT ou redirecionamento de porta.
- A rede `10.1.1.x` chega pela tailnet, roteada pelo subnet router `aquario-server`. A Hikvision está na rede
  local, fora da tailnet.

```bash
tailscale ping 10.1.1.79
nc -vz 10.1.1.79 80
nc -vz 10.1.1.79 554
```

**Leitura do resultado.** Uma linha `pong from` mostra que a tailnet alcança o destino; sem resposta, confira se
o `aquario-server` está online na tailnet. `succeeded` no `nc`
mostra a porta aberta; `timed out` aponta rede ou rota, e `refused` aponta o serviço da câmera desligado naquela
porta. Faça esse teste antes de reportar bug de conectividade.

## Como preparo as variáveis da sessão

```bash
REPO="<caminho do attlas-2026>"
CAM=10.1.1.79                       # troque pela câmera do teste
SENHA=$(grep '^SEED_CAMERA_PASSWORD=' "$REPO/apps/ms-cameras/.env" | cut -d= -f2-)
CRED="root:$SENHA"                  # na Hikvision: CRED="admin:$SENHA"
RTSP="rtsp://$CRED@$CAM:554/axis-media/media.amp"
export CAM SENHA
```

**Leitura do resultado.** `echo ${#SENHA}` maior que zero confirma que a senha foi lida sem imprimi-la. Senha com
`#`, `?`, `/` ou `@` precisa ir em percent-encoding dentro da URL RTSP; no `curl -u` ela vai como está. Na
Hikvision, o canal principal é `101` e o secundário `102`:
`rtsp://$CRED@192.168.210.80:554/Streaming/Channels/101`.

## Como sei se a câmera entrega vídeo por RTSP

```bash
ffprobe -v error -rtsp_transport tcp -i "$RTSP" -show_streams -show_format
```

**Leitura do resultado.** `codec_name` (`h264`, `hevc`, `av1`), `width`, `height` e `avg_frame_rate` descrevem o
stream. `401 Unauthorized` é credencial errada; `Connection refused` é a porta 554 fechada; `Connection timed out`
é rede ou tailnet. TCP é mais estável que UDP pela VPN. Cada comando abre uma puxada nova na câmera, fora da
plataforma.

## Como assisto, gravo ou tiro um quadro do RTSP

```bash
# assistir ao vivo
ffplay -rtsp_transport tcp -fflags nobuffer "$RTSP"

# gravar 10 s sem recodificar e tirar um quadro
ffmpeg -rtsp_transport tcp -i "$RTSP" -t 10 -c copy /tmp/cam.mp4
ffmpeg -rtsp_transport tcp -i "$RTSP" -frames:v 1 -q:v 2 /tmp/cam.jpg

# perfil reduzido pela própria URL, como o Attlas pede à Axis
ffplay -rtsp_transport tcp "rtsp://$CRED@$CAM:554/axis-media/media.amp?resolution=1280x720&videocodec=h264"
```

**Leitura do resultado.** Janela com vídeo, arquivo `/tmp/cam.mp4` de cerca de 10 s e `/tmp/cam.jpg` legível
provam que a câmera entrega o stream. Se a URL com `resolution` falha e a URL sem parâmetro funciona, a câmera não
expõe aquela resolução.

## Como meço o fps real do stream

```bash
ffmpeg -rtsp_transport tcp -i "$RTSP" -an -f null - 2>&1 | grep -E "fps|frame="
```

**Leitura do resultado.** A linha `frame= ... fps=` mostra o ritmo de decodificação; ele deve ficar perto do
`avg_frame_rate` do `ffprobe`. Valor bem abaixo com CPU folgada indica a câmera ou a rede entregando menos quadros.

## Como leio identidade, codecs e controle de taxa de uma Axis

```bash
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/param.cgi?action=list&group=Brand"
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/param.cgi?action=list&group=Properties.System"
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/param.cgi?action=list&group=Properties.Image"
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/param.cgi?action=list&group=Image.I0.RateControl"
```

**Leitura do resultado.** `Brand.ProdFullName` dá o modelo, e `Properties.System` o firmware e o número de série.
`Properties.Image.Format` lista os codecs que o encoder declara; o Attlas só considera AV1 quando
`Properties.Image.AV1.Profiles` contém `main`. Em `Image.I0.RateControl`, `Mode` diz MBR, ABR ou VBR, e
`TargetBitrate` ou `MaxBitrate` dão o valor que o Attlas lê como bitrate configurado. `401` é credencial errada.

## Como tiro um quadro e leio apps e log de uma Axis

```bash
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/jpg/image.cgi?resolution=1920x1080" -o /tmp/snap.jpg
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/applications/list.cgi"
curl -s --digest -u "$CRED" "http://$CAM/axis-cgi/systemlog.cgi"
```

**Leitura do resultado.** `/tmp/snap.jpg` legível prova sensor e encoder funcionando sem RTSP. A lista de apps
mostra cada ACAP com `Status="Running"` ou `Stopped`. O log do sistema mostra reinícios de pipeline e erros do
ACAP, sem precisar de SSH.

## Como movo a PTZ da Axis por VAPIX

Só na `10.1.1.79`. Movimento contínuo sem a parada deixa a câmera girando: mande sempre o stop.

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

**Leitura do resultado.** `query=position` devolve `pan=`, `tilt=` e `zoom=` em graus e na escala de 1 a 9999,
as mesmas unidades que o preset do Attlas guarda. Os comandos de movimento respondem vazio com `204` no AxisOS 11;
corpo com `Error` indica parâmetro fora de `query=limits`. Se o comando funciona aqui e falha pelo Attlas, o
problema está do nosso lado.

## Como sei se uma Hikvision está de pé e se o ONVIF está ligado

ONVIF desligado responde 404 em `/onvif/device_service` mesmo com a credencial certa, o que parece problema de
credencial ou de rede. O ISAPI, sempre ativo e com o mesmo usuário do painel web, separa os casos.

```bash
HKV=192.168.210.80
CRED="admin:$SENHA"
curl -s -o /dev/null -w "%{http_code}\n" "http://$HKV/onvif/device_service"
curl -s --digest -u "$CRED" "http://$HKV/ISAPI/System/deviceInfo"
curl -s --digest -u "$CRED" "http://$HKV/ISAPI/System/status"
```

**Leitura do resultado.** O primeiro comando, sem credencial, devolve `404` com ONVIF desligado e `401` com ONVIF
ligado pedindo autenticação. `deviceInfo` com `<model>` e `<serialNumber>` prova a câmera de pé e a credencial
válida; nesse caso falta só ligar o ONVIF, o que o cadastro do Attlas faz sozinho. À mão, fica em Configuration,
Network, Advanced Settings, Integration Protocol. `System/status` é a mesma consulta que o `ms-cameras` usa como
heartbeat de reserva.

## Como leio canais, bitrate e contas ONVIF da Hikvision

```bash
curl -s --digest -u "$CRED" "http://$HKV/ISAPI/Streaming/channels"
curl -s --digest -u "$CRED" "http://$HKV/ISAPI/Streaming/channels/101"
curl -s --digest -u "$CRED" "http://$HKV/ISAPI/System/Network/Integrate"
curl -s --digest -u "$CRED" "http://$HKV/ISAPI/Security/ONVIF/users"
```

**Leitura do resultado.** Em `channels/101`, `videoQualityControlType` diz CBR ou VBR, e `constantBitRate` ou
`vbrUpperCap` é o valor que o leitor de bitrate ISAPI usa. `Network/Integrate` mostra o bloco
`<ONVIF><enable>`. `Security/ONVIF/users` lista as contas ONVIF, que são separadas das contas web: ONVIF ligado
sem conta ali não autentica ninguém.

## Como sei se uma Hikvision tem PTZ de verdade

```bash
curl -s --digest -u "$CRED" "http://$HKV/ISAPI/PTZCtrl/channels/1/capabilities"
```

**Leitura do resultado.** Câmera fixa responde `Invalid Operation` com `subStatusCode` `notSupport`. A interface
web da Hikvision desenha setas, zoom e presets em quase todo modelo, inclusive nos fixos; a tela não prova que há
motor, e este endpoint prova.

## Como consulto e movo uma câmera por ONVIF

Vale para qualquer fabricante com ONVIF ligado. Requer `pip install onvif-zeep` e as variáveis `CAM` e `SENHA`
exportadas.

```python
import os, time
from onvif import ONVIFCamera

cam = ONVIFCamera(os.environ["CAM"], 80, "root", os.environ["SENHA"])
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
time.sleep(1)
ptz.Stop({"ProfileToken": token})
```

```bash
onvif-cli --host "$CAM" --port 80 -u root -a "$SENHA"
# dentro do prompt: cmd devicemgmt GetDeviceInformation
# dentro do prompt: cmd media GetProfiles
```

**Leitura do resultado.** `GetDeviceInformation` devolve fabricante, modelo e firmware. `GetProfiles` lista os
tokens que o Attlas grava como `mediaProfileToken`. A URI de `GetStreamUri` pode vir com `http://`; o Attlas a
troca por `rtsp://`. Se o `ContinuousMove` funciona aqui e o PTZ falha pelo Attlas, confira o
`mediaProfileToken` do perfil PRIMARY e a porta ONVIF cadastrada.

## Como sei qual container está falando com uma câmera

O SNAT do Docker esconde a origem na interface da tailnet, então a captura precisa ser feita na bridge, antes da
tradução de endereço.

```bash
sudo tcpdump -i br-<bridge> -nn -q "host $CAM"
docker network inspect <rede> --format '{{range .Containers}}{{.IPv4Address}} {{.Name}}{{println}}{{end}}'

PID=$(docker inspect -f '{{.State.Pid}}' attlas-ms-cameras)
sudo nsenter -t "$PID" -n ss -tn state established
```

**Leitura do resultado.** O `tcpdump` mostra o IP do container de origem, e o `docker network inspect` traduz o IP
para o nome. O `ss` dentro do namespace do `attlas-ms-cameras` lista as conexões abertas por ele. Payload de 6
bytes com resposta de 2 bytes na porta 80 é o ping e pong do WebSocket de eventos da Axis, não HTTP. O esperado
é uma conexão por câmera física, por mais sistemas que a tenham cadastrada.
