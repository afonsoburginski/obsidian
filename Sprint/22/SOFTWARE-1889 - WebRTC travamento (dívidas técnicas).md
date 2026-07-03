---
tags:
  - attlas
  - sprint-22
  - task
  - streaming
card: SOFTWARE-1889
titulo: "[Back] Dívidas técnicas ms-cameras: persistência de conexão e travamentos no WebRTC"
frente: Streaming
tamanho: Média
pr: 566
pr_url: https://github.com/atmanadmin/attlas-2026/pull/566
branch: cameras/fix/SOFTWARE-1889
status: MERGED
clickup_status: Closed
merged: 2026-06-30
clickup: https://app.clickup.com/t/86aj8fgun
sprint: "[[Attlas - Sprint 22]]"
---

# SOFTWARE-1889 — WebRTC: travamento (dívidas técnicas)

> Tarefa 1 da sprint, trazida da Sprint 21. **PR [#566](https://github.com/atmanadmin/attlas-2026/pull/566) MERGEADA (30/06)** · ClickUp **Closed**. Fix validado local ponta a ponta (mediamtx remuxando RTP no cap de MTU, WebRTC sem STUN, videowall sem colapso).

Câmeras travavam **só no WebRTC** (no HLS puro não). Diagnóstico feito no ambiente (SSH na EC2 `aws-attlas-26` + API do mediamtx, câmera `...001030`).

## Causa real (medida, não teoria)

- **Sem reprocessamento de vídeo.** ffmpeg roda `-c copy` (remux puro), puxa H264 pronto da Axis, mediamtx repacketiza em RTP sem decodificar. Condição do dono (nada de transcode) atendida.
- **Ingest impecável:** ~10 GB com `inboundFramesInError: 0` em 4h30. Perda zero câmera→mediamtx.
- **GOP curto:** keyframe a cada ~0.5s → cada travada dura no máx ~0.5s. Sintoma é perda contínua no egress UDP, não GOP longo.
- **A perda está só no egress WebRTC** (UDP, sem buffer nem retransmissão), amplificada por:
  1. Box de dev sobrecarregado (load 20 em 8 vCPU) → emissor real-time descarta pacote sob CPU starvation.
  2. mediamtx sem TURN nem `webrtcAdditionalHosts`/ICE → mídia só na rota UDP 8189 crua (via túnel Tailscale). Sem relay nem fallback TCP.
- HLS não sofre porque TCP + buffer absorvem os solucos, ao custo da latência (o único motivo de usar WebRTC).

**Decisão:** manter o WebRTC. Travamento é de ambiente/config, não do pipeline. Corrigir SEM transcode.

## Fix entregue (#566)

- [x] mediamtx `udpMaxPayloadSize: 1200` — RTP cabe no MTU 1280 do Tailscale (log: "RTP packets are too big (1460 > 1188), remuxing them into smaller ones").
- [x] Player WHEP sem STUN (`iceServers: []`) + ICE gathering 3s→1s. Acaba o stall por tile que colapsava o videowall.
- [x] `inboundFramesInError` exposto no endpoint de diagnóstico.
- [x] Sem transcode (`-c copy`).
- Não precisou de TURN/coturn nem abrir UDP 8189 no SG: o cap de MTU resolveu a fragmentação. GOP mantido (0.5s).

## Reviews resolvidos

- **Hadson:** timeout, redação de IP no endpoint público, dedup, testes. O endpoint de diagnóstico virou spec própria `UC-027-get-stream-diagnostics`; a leitura do mediamtx foi isolada num `MediamtxClient` (reusado pela T5 / [[SOFTWARE-1923 - Bitrate histórico + TTFF]]).
- **danielGuerra** (commit `3ff909d8c`, gate verde 624 testes / lint 0 / build): interfaces do mediamtx → `streaming/types/`, helper de redação de IP + readers de env (`requireEnv`/`parseEnvInt`) → `streaming/helpers/`, `resolve-stream-type.ts` → `ParseStreamTypePipe` em `streaming/pipes/`.

## Follow-ups (fora do escopo)

- Frontend: FPS na badge é valor configurado, não medido; troca automática de qualidade por banda (RF-VW-06) ainda não existe.
- Streaming público → [[CROSS-032 - Fundação WebRTC público via TURN]] (#597) e [[SOFTWARE-1990 - Streaming público (LL-HLS + watchdog)]] (#630).

## Fontes

- Diagnóstico completo: [[04-Diagnostico-travamento-WebRTC]].
