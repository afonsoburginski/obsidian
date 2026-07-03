---
tags:
  - attlas
  - sprint-23
  - task
  - streaming
card: SOFTWARE-2003
clickup: https://app.clickup.com/t/86ajc6un8
titulo: "[Back] Streaming: encerramento robusto de sessoes (reaper + lease de viewer)"
frente: Streaming
tamanho: a estimar
status: a planejar
sprint: "[[Attlas - Sprint 23]]"
atualizado: 2026-07-03
---

# Encerramento robusto de sessões de stream (reaper + lease de viewer)

> Tarefa 1. Origem: [[Incidente - vazamento de sessões de stream (banda das câmeras)]]. `ms-cameras` está **parado** no EC2 dev por causa disto. Frente Streaming, mesma área da [[SOFTWARE-1923 - Bitrate histórico + TTFF]].
>
> **Escopo ampliado (03/07):** esta task cobre **duas frentes** — **(A)** o fix do ciclo de vida das sessões (reaper + lease) e **(B)** a nova estratégia de banda por câmera (bitrate **configurado** via ONVIF/VAPIX 24/7 + real oportunístico). Plano completo e passo a passo: [[Plano - Banda por câmera (bitrate configurado ONVIF + VAPIX)]].

## Problema

A relay ffmpeg só encerra quando `viewerCount` chega a 0. O contador depende de o front chamar `GET /hls` (abre) e `DELETE /hls` (fecha) em par. Quando o `DELETE` não chega (aba fechada, refresh, queda de rede, videowall recarregando), o contador fica preso acima de 0, a sessão nunca encerra e o ffmpeg fica puxando 1080p da câmera para sempre, saturando o uplink sem entregar para ninguém. No EC2 isso deixou 11 relays órfãs com o mediamtx em 0 paths.

O `StreamSessionRegistry` confia 100% no teardown do cliente e não tem reconciliação com a realidade.

## Objetivo

Garantir que uma sessão de stream só exista enquanto há espectador de verdade, sem depender de um `DELETE` limpo do cliente.

## Parte A — Reaper + lease (fix do ciclo de vida)

- [ ] **Reaper de reconciliação** (resolve a raiz): worker periódico que consulta o mediamtx e encerra a sessão cujo path está com **0 readers** há N minutos. Fonte de verdade = mediamtx, não o contador em memória. Mata de uma vez a relay órfã e o path fantasma.
- [ ] **Lease com heartbeat de viewer** (prevenção no cliente): o viewer renova um lease periódico; se o sinal para de chegar, o sistema decrementa sozinho. Refresh e queda deixam o lease expirar sem depender do `DELETE`.

O reaper sozinho já resolve o incidente. O lease é a defesa complementar. Ideal fazer os dois.

## Parte B — Banda por câmera (bitrate configurado)

Desacoplar a medição de banda do streaming (hoje o bitrate só existe com stream ativo, via mediamtx). Duas métricas:

- [ ] **Provisionada (24/7):** ler o bitrate **configurado** do device no healthcheck — **ONVIF** `GetVideoEncoderConfiguration → RateControl.BitrateLimit` (universal) + **VAPIX** `param.cgi RateControl` para enriquecer Axis (modo ABR/Zipstream, target/max). Cacheado, refresh ~6h, best-effort. Vira a fonte de verdade do card de banda do Video Wall (substitui o `bitrateKbps` estático do perfil).
- [ ] **Real (oportunística):** manter o delta do mediamtx **só quando já há stream ativo** (custo zero). A Parte A garante que não haja relay 24/7 puxando vídeo só para medir.

Detalhamento (driver ONVIF, helper VAPIX, migration, contratos, testes) no passo a passo: [[Plano - Banda por câmera (bitrate configurado ONVIF + VAPIX)]] §5.

## Escopo (arquivos)

**Parte A (sessões):**
- `apps/ms-cameras/src/streaming/services/stream-session-registry.service.ts` (contagem/lease)
- `apps/ms-cameras/src/streaming/services/ffmpeg-session.service.ts` (parada/respawn)
- provável worker novo em `streaming/` para o reaper (cron) usando o `MediamtxClient` (leitura de readers por path).

**Parte B (banda):**
- `hardware/drivers/onvif/onvif.driver.ts` (+ `hardware/drivers/i-camera-driver.interface.ts`) — `getEncoderConfig()`
- helper VAPIX RateControl com `AxisDigestClient` em `cameras/utils/` ou `health/utils/`
- `health/workers/camera-health.worker.ts` / `camera-health-bootstrap.service.ts` — coleta + refresh
- migration `database/schema/stream/camera_stream_profile.prisma` (`bitrateSource`, `rateControlMode`, `bitrateUpdatedAt`)
- `dashboard/bandwidth/bandwidth-monitoring.service.ts` — usar valor device-truth

## Critérios de aceite

**Parte A:**
- [ ] Fechar a aba / dar refresh / cair a rede sem `DELETE` encerra a sessão dentro de N minutos.
- [ ] Nenhuma relay ffmpeg fica ativa com 0 readers no mediamtx além do grace + margem do reaper.
- [ ] Bitrate **real** continua correto (`null` quando de fato não há sessão), sem regressão da telemetria da #577.

**Parte B:**
- [ ] A **banda provisionada** por câmera é lida do device (ONVIF; VAPIX nas Axis) no healthcheck, cacheada, e o card de banda do Video Wall usa esse valor (não o `bitrateKbps` estático).
- [ ] Nenhuma leitura de banda puxa vídeo; o real só aparece quando há sessão ativa.
- [ ] Leitura best-effort: falha de ONVIF/VAPIX não derruba o heartbeat.

## Dependências e riscos

- Parte A depende do `MediamtxClient` (UC-027, já existe desde a #566) para ler readers por path.
- Parte B usa o media service do ONVIF (`@atmanadmin/node-onvif-ts`, precedente `mediaGetProfiles` em `camera-credential-probe.service.ts`) e o `AxisDigestClient` (já existem).
- Cuidar de corrida entre grace de 60s, respawn por reconexão e o tick do reaper para não matar sessão legítima recém-aberta.
- Parte B: provisionado é teto/target (não o real). Com Zipstream/ABR o médio real é menor — guardar `rateControlMode` para planejar com o `ABR.TargetBitrate` quando houver.
