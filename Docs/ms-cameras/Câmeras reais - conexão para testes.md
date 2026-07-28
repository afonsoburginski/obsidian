---
tags:
  - attlas
  - cameras
  - referencia
atualizado: 2026-07-28
---

# Câmeras reais - conexão para testes manuais

Referência rápida pra cadastrar/testar câmeras reais (não-seed) manualmente pelo `web-attlas`.
Fonte: topologia de produção no EC2 (`attlas_cameras`, ver memória do Claude
`project_ec2_prod_camera_topology`).

## ATM-PTZ

- **Nome**: ATM-PTZ
- **Modelo**: AXIS Q6135-LE
- **IP**: `10.1.1.79`
- **Porta**: `80` (ONVIF/VAPIX - management/cadastro) — é o default do campo de porta
  no cadastro, então pode deixar em branco.
- **RTSP**: porta `554` (aberta na mesma rota; resolvido automaticamente via ONVIF,
  não precisa digitar em lugar nenhum do cadastro).
- **Credenciais**: `root` / `Sinales123`
- **Acesso**: só alcançável via **tailnet** (rota `tailscale0`) — precisa estar na
  malha Tailscale pra chegar nela (direto ou via subnet router `aquario-server`).
- **Capacidades**: PTZ ativo (`ptz=true`), sem analítico embarcado.

## DEMO (AXIS M1135)

- **IP**: `10.0.0.79`
- **Porta**: `80` (mesma lógica do ATM-PTZ acima)
- Inconsistência conhecida: o `streamUrl` dos profiles às vezes aponta pra
  `10.1.1.78` em vez de `10.0.0.79` — não é bug do cadastro, é dado antigo.

## Câmera do analítico embarcado (ATMN – Analítico)

- **IP**: `10.11.20.101` (AXIS/ATMAN Traffic Edge)
- **Porta**: `80`
- Só alcançável via subnet router `aquario-server` (rota pra `10.11.x.x`).

## Notas gerais

- Todas essas câmeras usam porta 80 pro management (ONVIF/VAPIX) — é o
  default do campo de porta, então na prática raramente precisa digitar algo
  diferente de vazio/80 pra elas. O campo existe pra quando a porta REALMENTE
  for diferente (câmera atrás de NAT/port-forward, por exemplo).
- Sem acesso à tailnet (ou ao aquario-server, pras redes atrás dele), nenhuma
  dessas câmeras responde — antes de reportar bug de conectividade, checar
  `tailscale ping` primeiro.
