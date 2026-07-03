---
tags:
  - attlas
  - sprint-22
  - task
  - saude-camera
  - streaming
card: SOFTWARE-1923
titulo: "[Back] Saúde da Câmera: bitrate histórico + TTFF"
frente: Saúde
tamanho: Média
pr: 577
pr_url: https://github.com/atmanadmin/attlas-2026/pull/577
branch: cameras/feat/SOFTWARE-1923
status: OPEN
clickup_status: code review
merged: null
clickup: https://app.clickup.com/t/86aj9aw6n
sprint: "[[Attlas - Sprint 22]]"
---

# SOFTWARE-1923 — Bitrate histórico + TTFF

> Tarefa 5. **PR [#577](https://github.com/atmanadmin/attlas-2026/pull/577) ABERTA, em code review** — única task da sprint ainda não fechada · ClickUp **code review**. Spec PROJ-006.
> Contexto: [[Saúde da Câmera - regras de negócio e contratos]]. Empilhada sobre #566 + #576.

Telemetria que ainda não era coletada ao longo do tempo. Sob a regra de reuso: **bitrate NÃO ganha tabela nem cron próprios** — vive na mesma janela de 5 min da [[SOFTWARE-1922 - Janelas de 5 min + latência + rollup 90d]].

## Entregue (#577)

- [x] `avgBitrateMbps` + `currentBitrateMbps` + `bitrateLatencyTimeSeries`.
  - bitrate na MESMA janela de 5 min (`avgBitrateMbps` em `CameraAvailabilityWindow` + rollup), pelo mesmo cron. Série bitrate × latência sem join.
  - Fonte: taxa real medida pelo delta de bytes do mediamtx (via `MediamtxClient` da UC-027, #566), não o `bitrateKbps` estático do perfil.
- [x] `ttffMs` (time to first frame / "Abertura do stream"): instrumentado em `streaming/ffmpeg-session.service` (`waitForStreamReady`) e persistido por sessão em `CameraTtffSample`.
- [x] Migration Prisma: coluna `avgBitrateMbps` na janela da T4 + tabela `CameraTtffSample`.
- [x] Testes (suíte completa do projeto verde).

## Fix de produção anexado: "status Estável com stream travado"

Câmera aparecia "Operacional/Estável" enquanto o stream travava (dev.v2, SNL 10.11.5.102 / id ...001027). Causa: `connectionStatus` só pontua latência/perda do ping ao device (VAPIX WS / ONVIF), sem nenhum sinal de vídeo. O travamento em si já fora resolvido no #566 — isto é lacuna de observabilidade. Decisão (com o dono): manter `connectionStatus` device-only e expor um sinal de stream separado.

- [x] Novo enum `StreamHealthStatus` (`OK` | `DEGRADED` | `DOWN` | `INACTIVE`) em `streaming/types/`, desacoplado de `CameraConnectionStatus`.
- [x] Campo `streamStatus` derivado no `IStreamDiagnostics` (UC-027): path pronto e limpo → OK; path ausente com sessão rastreada → DOWN; sem sessão e sem path → INACTIVE; `framesInError > 0` / reconectando / viewers sem peer → DEGRADED.
- [x] Spec UC-027 atualizada (BR-DIAG-004) + 7 testes unitários (5 caminhos). Gate verde: 668 testes, lint 0, build ok.

## A fazer hoje (dentro desta PR)

- [ ] **Filtro de busca por "uptime" na saúde de câmeras** — vai entrar aqui na #577 (não é próxima sprint).
- [x] Resolver merge conflict da #577 contra `develop` (feito 03/07: conflito em `PROJ-005-availability-window-sampler.md`, "índice único"; merge commitado `ad5fd9de2` e pushado; CI rodando).
- [ ] Review + merge da PR #577.
