---
tags:
  - doc
  - ms-cameras
  - cameras
  - attlas
  - dispositivo
  - referencia
aliases:
  - "Câmeras reais - conexão para testes"
atualizado: 2026-08-24
---

# Runbook - câmeras reais para teste

Referência rápida pra cadastrar/testar câmeras reais (não-seed) manualmente pelo `web-attlas`.
Fonte: topologia de produção no EC2 (`attlas_cameras`, ver memória do Claude
`project_ec2_prod_camera_topology`) e `apps/ms-cameras/src/database/seed.ts` para as câmeras validadas
em campo (Hikvision e analítico).

## ATM-PTZ

- **Nome**: ATM-PTZ
- **Modelo**: AXIS Q6135-LE
- **IP**: `10.1.1.79`
- **Porta**: `80` (ONVIF/VAPIX - management/cadastro) - é o default do campo de porta
  no cadastro, então pode deixar em branco.
- **RTSP**: porta `554` (aberta na mesma rota; resolvido automaticamente via ONVIF,
  não precisa digitar em lugar nenhum do cadastro).
- **Credenciais**: `root` / `Sinales123`
- **Acesso**: só alcançável via **tailnet** (rota `tailscale0`) - precisa estar na
  malha Tailscale pra chegar nela (direto ou via subnet router `aquario-server`).
- **Capacidades**: PTZ ativo (`ptz=true`), sem analítico embarcado.

## DEMO (AXIS M1135)

- **IP**: `10.0.0.79`
- **Porta**: `80` (mesma lógica do ATM-PTZ acima)
- Inconsistência conhecida: o `streamUrl` dos profiles às vezes aponta pra
  `10.1.1.78` em vez de `10.0.0.79` - não é bug do cadastro, é dado antigo.

## HKV (Hikvision, ONVIF desligado de fábrica) - chegada de agosto

- **Nome no seed**: `HKV – 192.168.210.80`
- **Modelo**: Hikvision DS-2CD1023G0E-I | **Firmware**: V5.7.12 | **MAC**: `98:f1:12:ba:19:40`
- **IP**: `192.168.210.80` (rede local - não é tailnet nem VPN como as Axis acima)
- **Porta**: `80` (ISAPI/management)
- **RTSP**: canais nativos Hikvision - `rtsp://192.168.210.80:554/Streaming/Channels/101`
  (primário) e `.../102` (secundário)
- **Credenciais**: `admin` / `Sinales123`
- **Particularidade**: `/onvif/device_service` responde 404 de fábrica - `GET /ISAPI/System/status`
  responde normalmente com a mesma credencial (via digest). Cadastro/health/stream passam por ISAPI
  (`IsapiCameraCommunicationStrategy`, `HikvisionIsapiHeartbeatClient`/`HikvisionAlertStreamClient`);
  no fluxo de validação de credenciais o ONVIF é **ativado automaticamente** (INT-020), depois do que
  PTZ e perfis de mídia passam a usar o `OnvifDriver` comum como qualquer outra câmera.
- Validado em campo em 14/08/2026 (ISAPI) e 18/08/2026 (ativação do ONVIF) - ver
  [[Integração com dispositivo - Fluxos]] fluxo 6.

## Câmera do analítico embarcado (ATMN - Analítico)

- **IP**: `10.11.20.101` (AXIS/ATMAN Traffic Edge)
- **Porta**: `80`
- Só alcançável via subnet router `aquario-server` (rota pra `10.11.x.x`).
- Confirmado em 24/08 contra o código (`analytics-realtime/atman-device-provisioner.service.spec.ts`,
  `docs/atomic/PROJ-014-analytics-producer-reconciler.md`): continua sendo o **único** device com o
  ACAP ATMAN Traffic Edge - não há segunda câmera com analítico embarcado no seed nem nos docs
  atômicos. Esse device não vive no seed do `ms-cameras` de propósito (ver PROJ-014: o seed antigo
  cadastrava um `deviceSourceId` fixo e cada instância virava um writer automático do device
  compartilhado).

## Notas gerais

- ATM-PTZ e DEMO usam porta 80 pro management (ONVIF/VAPIX) - é o
  default do campo de porta, então na prática raramente precisa digitar algo
  diferente de vazio/80 pra elas. O campo existe pra quando a porta REALMENTE
  for diferente (câmera atrás de NAT/port-forward, por exemplo). A Hikvision também usa porta 80,
  mas fala ISAPI nela, não VAPIX.
- Sem acesso à tailnet (ou ao aquario-server, pras redes atrás dele), as câmeras Axis e a do
  analítico não respondem - antes de reportar bug de conectividade, checar `tailscale ping`
  primeiro. A Hikvision é rede local (não depende de tailnet).
