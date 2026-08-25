---
tags:
  - attlas
  - sprint-23
  - task
  - streaming
  - saude-camera
card: SOFTWARE-2003
clickup: https://app.clickup.com/t/86ajc6un8
titulo: "[Back] Streaming de câmeras: ciclo de vida de sessões e telemetria de consumo de banda por câmera (ONVIF/VAPIX)"
frente: Streaming / Saúde
tamanho: a estimar
status: em teste — F3 adaptativo/codec mergeada na develop via #656 (08/07); faltam F4, confirmação em device e provisionamento
sprint: "[[Attlas - Sprint 24]]"
atualizado: 2026-07-13
---

# Ciclo de vida de sessões de streaming e telemetria de banda por câmera

> Task grande, **três fases**. Origem: [[Incidente - vazamento de sessões de stream (banda das câmeras)]] — `ms-cameras` está **parado** no EC2 dev por causa disto. Mesma área da [[SOFTWARE-1923 - Bitrate histórico + TTFF]].
>
> - **Fase 1** — fix do ciclo de vida das sessões (reaper + lease).
> - **Fase 2** — telemetria de banda por câmera pelo bitrate **configurado** (ONVIF/VAPIX 24/7 + real oportunístico). Passo a passo: [[Plano - Banda por câmera (bitrate configurado ONVIF + VAPIX)]].
> - **Fase 3** — validação de escalabilidade e consumo de banda (1000+ câmeras, muitos usuários).

## Objetivo

Uma sessão de stream só existe enquanto há espectador de verdade (sem depender do `DELETE` do cliente), a banda por câmera é medida 24/7 sem puxar vídeo, e o conjunto é **comprovadamente escalável** para milhares de câmeras e muitos usuários concorrentes.

## Fase 1 — Ciclo de vida de sessões (reaper + lease)

Problema: a relay ffmpeg só encerra quando `viewerCount` chega a 0. O contador depende de o front chamar `GET /hls` (abre) e `DELETE /hls` (fecha) em par. Quando o `DELETE` não chega (aba fechada, refresh, queda de rede, videowall recarregando), o contador fica preso acima de 0, a sessão nunca encerra e o ffmpeg fica puxando 1080p da câmera para sempre, saturando o uplink sem entregar para ninguém. No EC2 isso deixou 11 relays órfãs com o mediamtx em 0 paths. O `StreamSessionRegistry` confia 100% no teardown do cliente e não reconcilia com a realidade do mediamtx.

- [ ] **Reaper de reconciliação** (resolve a raiz): worker periódico que consulta o mediamtx e encerra a sessão cujo path está com **0 readers** há N minutos. Fonte de verdade = mediamtx, não o contador em memória. Mata de uma vez a relay órfã e o path fantasma.
- [ ] **Lease com heartbeat de viewer** (prevenção no cliente): o viewer renova um lease periódico; se o sinal para de chegar, o sistema decrementa sozinho. Refresh e queda deixam o lease expirar sem depender do `DELETE`.

O reaper sozinho já resolve o incidente. O lease é a defesa complementar. Ideal fazer os dois.

## Fase 2 — Telemetria de banda por câmera (bitrate configurado)

Desacoplar a medição de banda do streaming (hoje o bitrate só existe com stream ativo, via mediamtx). Duas métricas:

- [ ] **Provisionada (24/7):** ler o bitrate **configurado** do device no healthcheck — **ONVIF** `GetVideoEncoderConfiguration → RateControl.BitrateLimit` (universal) + **VAPIX** `param.cgi RateControl` para enriquecer Axis (modo ABR/Zipstream, target/max). Cacheada, refresh ~6h, best-effort. Vira a fonte de verdade do card de banda do Video Wall (substitui o `bitrateKbps` estático do perfil).
- [ ] **Real (oportunística):** manter o delta do mediamtx **só quando já há stream ativo** (custo zero). A Fase 1 garante que não haja relay 24/7 puxando vídeo só para medir.

Detalhamento (driver ONVIF, helper VAPIX, migration, contratos, testes) no passo a passo: [[Plano - Banda por câmera (bitrate configurado ONVIF + VAPIX)]] §5.

## Fase 3 — Validação de escalabilidade e consumo de banda

Provar que as Fases 1+2 escalam para **1000+ câmeras e muitos usuários concorrentes** sem saturar banda. É fase de medição/benchmark, não de feature nova.

- [ ] **Sem viewer, banda de vídeo ~0:** com N câmeras OPERATIONAL e 0 espectadores, 0 relays ffmpeg ativas (reaper limpou tudo) e NetIO de vídeo desprezível. Reproduz o cenário do incidente e prova que não volta.
- [ ] **Custo da telemetria em escala:** banda provisionada = 1 request leve ONVIF/VAPIX por câmera a cada ~6h, sem pull de vídeo. Medir CPU/rede/req-rate do `ms-cameras` com N câmeras e confirmar crescimento linear e barato.
- [ ] **Reuso de relay entre viewers:** M espectadores no mesmo path reusam **uma** relay ffmpeg (attach/`incrementViewers`), não 1 processo por viewer. Validar sob concorrência.
- [ ] **Reaper não vira gargalo:** o tick com N sessões tem custo limitado — avaliar `/v3/paths/list` (1 chamada) vs. N `paths/get`. Medir a latência do tick com N sessões.
- [ ] **Critérios numéricos + observabilidade:** definir limites (ex.: relays ativas = nº de paths com reader; telemetria < X req/s agregado; tick do reaper < Y ms) e comprovar via Prometheus/Grafana/Loki (process count, NetIO, mediamtx paths/readers).

Alimenta e antecede a [[SOFTWARE-2009 - Escalabilidade horizontal do ms-cameras em Kubernetes]] (estado de sessão / viewer count por réplica).

## Escopo (arquivos)

**Fase 1 (sessões):**
- `apps/ms-cameras/src/streaming/services/stream-session-registry.service.ts` (contagem/lease)
- `apps/ms-cameras/src/streaming/services/ffmpeg-session.service.ts` (parada/respawn)
- worker novo em `streaming/` para o reaper (cron) usando o `MediamtxClient` (leitura de readers por path)

**Fase 2 (banda):**
- `hardware/drivers/onvif/onvif.driver.ts` (+ `hardware/drivers/i-camera-driver.interface.ts`) — `getEncoderConfig()`
- helper VAPIX RateControl com `AxisDigestClient` em `cameras/utils/` ou `health/utils/`
- `health/workers/camera-health.worker.ts` / `camera-health-bootstrap.service.ts` — coleta + refresh
- migration `database/schema/stream/camera_stream_profile.prisma` (`bitrateSource`, `rateControlMode`, `bitrateUpdatedAt`)
- `dashboard/bandwidth/bandwidth-monitoring.service.ts` — usar valor device-truth

**Fase 3 (validação):**
- scripts de carga sintética (N câmeras / M viewers) + dashboards/queries de observabilidade; documento de resultados com os números de aceite. Sem código de produção novo além de métricas/instrumentação.

## Critérios de aceite

**Fase 1:**
- [ ] Fechar a aba / dar refresh / cair a rede sem `DELETE` encerra a sessão dentro de N minutos.
- [ ] Nenhuma relay ffmpeg fica ativa com 0 readers no mediamtx além do grace + margem do reaper.
- [ ] Bitrate **real** continua correto (`null` quando de fato não há sessão), sem regressão da telemetria da SOFTWARE-1923.

**Fase 2:**
- [ ] A **banda provisionada** por câmera é lida do device (ONVIF; VAPIX nas Axis) no healthcheck, cacheada, e o card de banda do Video Wall usa esse valor (não o `bitrateKbps` estático).
- [ ] Nenhuma leitura de banda puxa vídeo; o real só aparece quando há sessão ativa.
- [ ] Leitura best-effort: falha de ONVIF/VAPIX não derruba o heartbeat.

**Fase 3:**
- [ ] Com N≈1000 câmeras e 0 viewers: 0 relays ativas e banda de vídeo ~0, comprovado por métricas.
- [ ] Custo da telemetria de banda medido e linear em N; nenhum pull de vídeo para medir.
- [ ] Reuso de relay por múltiplos viewers comprovado; tick do reaper dentro do limite definido.

## Dependências e riscos

- Fase 1 depende do `MediamtxClient` (UC-027, já existe desde a #566) para ler readers por path.
- Fase 2 usa o media service do ONVIF (`@atmanadmin/node-onvif-ts`, precedente `mediaGetProfiles` em `camera-credential-probe.service.ts`) e o `AxisDigestClient` (já existem).
- Cuidar de corrida entre grace de 60s, respawn por reconexão e o tick do reaper para não matar sessão legítima recém-aberta.
- Fase 2: provisionado é teto/target (não o real). Com Zipstream/ABR o médio real é menor — guardar `rateControlMode` para planejar com o `ABR.TargetBitrate` quando houver.
- Fase 3: o estado de sessão in-memory por réplica limita a validação a 1 réplica; escala horizontal real depende da [[SOFTWARE-2009 - Escalabilidade horizontal do ms-cameras em Kubernetes]].
