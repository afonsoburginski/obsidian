---
tags:
  - doc
  - infra
  - attlas
  - runbook
  - cameras
  - hikvision
aliases:
  - "ISAPI Hikvision"
  - "Consultar câmera Hikvision"
atualizado: 2026-08-14
---

# Consultar câmera Hikvision via ISAPI

Runbook dos comandos para interrogar uma câmera Hikvision direto da linha de comando, sem passar pelo
Attlas. Serve para responder "o problema é a câmera ou o nosso código" em campo, e foi o que permitiu
diagnosticar a câmera de testes `192.168.210.80` em 14/08/2026.

## Por que ISAPI e não ONVIF

ONVIF é o padrão de mercado e a Hikvision suporta, mas **vem desabilitado de fábrica** em boa parte dos
modelos. Quando está desligado, `http://<ip>/onvif/device_service` responde `404 Not Found` e qualquer
ferramenta ONVIF falha, mesmo com a credencial correta. ISAPI é a API proprietária da Hikvision, sempre
ativa, e autentica por HTTP Digest com o mesmo usuário e senha do painel web.

A pegadinha do diagnóstico é essa: ONVIF falhando com credencial válida parece problema de credencial ou
de rede. O teste que separa os casos é bater no ISAPI. Se o ISAPI responde, a câmera está de pé, a
credencial está certa e o que falta é habilitar o ONVIF no dispositivo, em
*Configuration → Network → Advanced Settings → Integration Protocol*.

## Comandos

Todos usam `--digest`, que é obrigatório. O usuário e a senha são os mesmos do painel web da câmera.

**Identidade do dispositivo** (modelo, firmware, serial, MAC). É o primeiro comando a rodar, porque
responder aqui já prova que a credencial é válida:

```bash
curl -sS --digest -u admin:SENHA http://192.168.210.80/ISAPI/System/deviceInfo
```

**Canais de vídeo configurados** (resolução, codec, bitrate, framerate de cada stream). O canal `101` é o
principal e o `102` é o secundário; a URL RTSP correspondente é
`rtsp://<ip>:554/Streaming/Channels/<canal>`:

```bash
curl -sS --digest -u admin:SENHA http://192.168.210.80/ISAPI/Streaming/channels
curl -sS --digest -u admin:SENHA http://192.168.210.80/ISAPI/Streaming/channels/102
```

**Status do dispositivo** (uptime, CPU, memória). É o endpoint mais leve e é o que o `ms-cameras` usa como
heartbeat para câmera Hikvision:

```bash
curl -sS --digest -u admin:SENHA http://192.168.210.80/ISAPI/System/status
```

**Suporte a PTZ.** Vale conhecer porque a interface web da Hikvision desenha o bloco de PTZ com setas,
zoom e 24 presets em praticamente todo modelo, inclusive nos fixos, então a tela não serve como prova de
que existe motor. Quem responde de verdade é o firmware:

```bash
curl -sS --digest -u admin:SENHA http://192.168.210.80/ISAPI/PTZCtrl/channels/1/capabilities
```

Uma câmera fixa responde `Invalid Operation` com `<subStatusCode>notSupport</subStatusCode>`. Uma câmera
com PTZ real devolve as faixas de pan, tilt e zoom.

**Verificar se o ONVIF está ligado ou desligado.** Não precisa de credencial, o código de status já diz:
`404` é ONVIF desabilitado, `401` é ONVIF ativo pedindo autenticação:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://192.168.210.80/onvif/device_service
```

**Confirmar que o vídeo realmente sai.** Fecha o diagnóstico provando o RTSP fora do Attlas:

```bash
ffprobe -rtsp_transport tcp -i "rtsp://admin:SENHA@192.168.210.80:554/Streaming/Channels/101" \
  -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1
```

## Como o Attlas usa isso

O `ms-cameras` trata o caso de ONVIF desabilitado em dois pontos, ambos reusando o mesmo cliente HTTP
Digest interno:

1. **Validação de credencial no cadastro.** Quando o ONVIF devolve `404`, o serviço cai para o ISAPI:
   confirma a credencial em `/ISAPI/System/deviceInfo` e lê os perfis de vídeo em
   `/ISAPI/Streaming/channels`. Sem os perfis, a câmera seria salva sem nenhum stream configurado e o
   player responderia `409` ao pedir o vídeo.
2. **Heartbeat de saúde.** A câmera passa a ser monitorada por um canal próprio de polling em
   `/ISAPI/System/status`, em vez do WebSocket VAPIX da Axis ou da subscrição ONVIF, que não funcionariam
   nela.

O roteamento é decidido pelo fabricante cadastrado: Axis usa o WebSocket VAPIX, Hikvision usa o polling
ISAPI, e qualquer outro fabricante usa ONVIF. Entrou na PR #1592.

## Relacionados

[[Runbook - teste de câmera por terminal (ffmpeg e ONVIF)]] cobre o equivalente para as câmeras Axis, por
VAPIX e ONVIF. [[Runbook - câmeras reais para teste]] tem o inventário das câmeras disponíveis.

[[Acessos SSH - Infra Attlas]]
