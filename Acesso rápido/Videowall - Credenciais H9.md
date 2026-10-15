---
tags:
  - doc
  - cameras
  - videowall
  - quito
aliases:
  - "Videowall - Credenciais H9"
  - "Videowall H9 Quito - Credenciais"
atualizado: 2026-10-14
---

# Videowall - Credenciais H9
Endpoints em [[Videowall - Endpoints H9]]. Por que o vídeo não chega:
[[Videowall - Vídeo não chega ao H9]].

## H9

- **Controlador (Open API):** `10.200.1.52:8000`
- **Interface web:** `http://10.200.1.52`
- **ProjectId (pId):** `YzFk`
- **secrets:** `Y2Y2MmUy`
- **Usuário web:** `attlas`
- **Senha web:** `atman26`
- **Placa que puxa o vídeo:** INPUT 7, `H_2xRJ45 IP`, 16x 200W
- **Canvas:** 4992x2808, offset x=2290 y=1075

## Stream do videowall

- **Usuário RTSP:** `videowall-h9-reader`
- **Senha RTSP:** `b-dmbYRLAQnXPS-FeK4lKDhVz5LKWvBw`
- **Padrão, pela VPN de Quito:** `192.168.10.16:554`
- **Pela internet:** `3.15.199.101:554`
- **Caminho:** `videowall-mirror-<id>`, novo a cada espelhamento

## Attlas

- **dev.v2:** `https://dev.v2.attlas.atmansystems.com`
- **Login master:** `admin@atmansystems.com` / `change-me` (rota em [[Videowall - Endpoints H9#Login (pega o token)]])
- **System-Id:** `6c277280-b369-49a5-bbb9-72a5d5fcf789` (sistema `atman`)
- **Processador:** **H9 Quito**, `375be424-47af-449e-a10a-81e156696a3e`

## Acesso ao cluster

```bash
ssh ec2-attlas
export PATH=$HOME/bin:$PATH
kubectl --context kind-attlas -n attlas-dev get pods | grep ms-cameras
kubectl --context kind-attlas -n attlas-dev exec -it deploy/ms-cameras -- sh
```

Banco: pod `db-cameras-0`, usuário `cameras_user`, base `attlas_cameras`.

Relay RTSP (`aws-attlas-develop`): `ssh -i ~/.ssh/id_ed25519_aws_attlas ubuntu@100.95.150.89`.
