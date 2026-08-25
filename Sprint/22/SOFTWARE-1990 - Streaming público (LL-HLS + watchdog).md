---
tags:
  - attlas
  - sprint-22
  - task
  - streaming
card: SOFTWARE-1990
titulo: "[Back] fix: streaming público de câmeras (mediamtx LL-HLS + watchdog WHEP->HLS)"
frente: Streaming
tamanho: Pequena (cross, shared/)
pr: 630
pr_url: https://github.com/atmanadmin/attlas-2026/pull/630
branch: shared/fix/mediamtx-llhls-segment-count
status: "mergeado - PR #630 em 03/07/2026, conferido no GitHub em 25/08"
clickup_status: code review
merged: null
clickup: https://app.clickup.com/t/86ajc10v0
sprint: "[[Attlas - Sprint 22]]"
atualizado: 2026-08-25
---

# SOFTWARE-1990 — Streaming público (LL-HLS + watchdog WHEP→HLS)

> Tarefa 7. **PR [#630](https://github.com/atmanadmin/attlas-2026/pull/630) ABERTA, em code review** · ClickUp **code review**. Follow-up do diagnóstico WebRTC da T1 ([[SOFTWARE-1889 - WebRTC travamento (dívidas técnicas)]]).
> No esboço: "pequeno ajuste de configuração para WebRTC e HLS, para garantir uma quantidade segura de pacotes para que o stream não caia".

O WebRTC público passou a conectar ponta a ponta no dev **sem depender do TURN** ([[CROSS-032 - Fundação WebRTC público via TURN]]).

## Causa raiz (infra do servidor de dev)

A cadeia FORWARD do iptables tinha perdido o jump do Docker por causa do Tailscale, mais a UDP 8189 fechada no Security Group. Corrigida e persistida no box.

## Entregue no repo (#630)

- [x] LL-HLS do mediamtx: **3 → 7 segmentos** (com 3 o muxer HLS morria na hora e derrubava o fallback pra todos).
- [x] Watchdog no player: cai pra HLS em ~8s quando o WebRTC negocia mas a mídia não chega.

## Aberto

- [ ] Review + merge da PR #630.

> [!info] Estado em 25/08 - alinhado com o GitHub
> PR #630 mergeada (última em 03/07/2026). Nenhuma PR desta task está aberta.
> O `status` anterior dizia: "OPEN".
> O `clickup_status` continua "code review" - o ClickUp não é verificável daqui, conferir lá.
