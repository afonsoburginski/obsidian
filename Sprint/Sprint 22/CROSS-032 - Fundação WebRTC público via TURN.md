---
tags:
  - attlas
  - sprint-22
  - task
  - streaming
card: CROSS-032
titulo: "feat: public WebRTC streaming foundation via TURN"
frente: Streaming
tamanho: Média
pr: 597
pr_url: https://github.com/atmanadmin/attlas-2026/pull/597
branch: shared/feat/public-webrtc-turn
status: MERGED
clickup_status: "—"
merged: 2026-07-01
sprint: "[[Attlas - Sprint 22]]"
---

# CROSS-032 — Fundação de WebRTC público via TURN

> **PR [#597](https://github.com/atmanadmin/attlas-2026/pull/597) MERGEADA (01/07)**. Follow-up do [[SOFTWARE-1889 - WebRTC travamento (dívidas técnicas)]] (#566). Sem task própria no ClickUp — é fundação versionada e **INERTE até deploy**.

Decisão do dono (01/07): o streaming vai ser exposto à internet pública, mas só consome quem já está logado no Attlas (sem stream anônimo).

## Entregue (#597, inerte)

- Serviço `coturn` no `docker-compose.yml` (relay TURN sobre TLS 5349 pra furar firewall corporativo, faixa de relay 49160-49200, nega peers privados).
- `docker/turnserver.conf` + `docker/mediamtx.yml` com `webrtcAdditionalHosts` e `webrtcICEServers2` dirigidos por env do servidor (credenciais nunca versionadas).
- Spec `docs/specs/cross-service/CROSS-032-public-webrtc-turn.md` com runbook.

## Follow-ups travados no runbook (não feitos)

- [ ] Auth do stream (URL WHEP assinada e curta validada pelo mediamtx, reusa permissões).
- [ ] Abrir portas no SG da AWS (8189/udp, 3478, 5349, 49160-49200/udp) — **NÃO abrir enquanto a auth não estiver pronta**.
- [ ] Certificado TLS no coturn.
- [ ] Ligar os ICE servers no player (frontend) + deploy.

## Nota

Na prática o streaming público passou a funcionar sem depender do TURN (ver [[SOFTWARE-1990 - Streaming público (LL-HLS + watchdog)]]). A fundação TURN fica como reserva para quem está atrás de firewall corporativo que bloqueia UDP.
