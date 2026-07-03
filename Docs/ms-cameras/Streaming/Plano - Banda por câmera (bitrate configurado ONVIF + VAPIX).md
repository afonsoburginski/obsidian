---
tags:
  - attlas
  - sprint-23
  - plano
  - ms-cameras
  - streaming
  - saude-camera
frente: Streaming / Saúde
decidido: 2026-07-03
status: planejado — implementado na SOFTWARE-2003 (Parte B)
card: SOFTWARE-2003
gancho: "[[SOFTWARE-1923 - Bitrate histórico + TTFF]]"
---

# Plano — Banda por câmera: bitrate configurado (ONVIF/VAPIX) 24/7 + real oportunístico

> Decisão de arquitetura (03/07) para medir banda por câmera **sem puxar vídeo 24/7**, escalável a milhares de câmeras. Substitui/ancora a coleta de bitrate hoje acoplada ao streaming. **Executado como Parte B da [[SOFTWARE-2003 - Ciclo de vida de sessões de streaming e telemetria de banda por câmera]]** (junto com o fix do ciclo de vida das sessões, Parte A). Relacionado: [[Incidente - vazamento de sessões de stream (banda das câmeras)]], [[SOFTWARE-1923 - Bitrate histórico + TTFF]], [[Video Wall - Banda e alertas]], [[00 - Saúde e monitoramento]].

## 1. Problema

- O bitrate hoje só existe **quando há stream ativo**: o sampler (`availability-window-sampler.service.ts`) lê o delta de `bytesReceived` do **mediamtx**, que só tem dados enquanto um ffmpeg relay está puxando o vídeo. Fora disso → `null` 24/7.
- O card de banda do Video Wall (`bandwidth-monitoring.service.ts`) usa o `bitrateKbps` **estático** do perfil no DB (chute, pode estar defasado).
- Puxar vídeo 24/7 só para medir **satura o uplink das câmeras** — foi exatamente o [[Incidente - vazamento de sessões de stream (banda das câmeras)|incidente]] (11 relays órfãs drenando banda).
- Precisamos de uma métrica de banda **por câmera, 24/7, com custo ~zero no device**, para planejar capacidade de milhares de câmeras.

## 2. Pesquisa (VAPIX / ONVIF / RTSP)

**Bitrate real (bytes/s do momento, varia com a cena):** não há API padrão de câmera que reporte o próprio bitrate de saída sem consumir o stream.
- Axis `streamstatus.cgi` lista streams em execução mas **não** traz bitrate (só endereço/protocolo/estado/user-agent).
- ONVIF **não** tem métrica de throughput em tempo real.
- ⇒ bitrate real só medindo o fluxo (mediamtx quando já há stream).

**Bitrate configurado/target/max (quanto a câmera *vai* usar):** barato, 24/7, sem vídeo, nas duas pilhas.

| Fonte | Como | Retorna |
| --- | --- | --- |
| **ONVIF** (universal) | `GetProfiles`/`GetVideoEncoderConfiguration` → `RateControl` | `BitrateLimit` (kbps), `FrameRateLimit`, `EncodingInterval`, `Encoding` (H264/H265), `Resolution` |
| **Axis VAPIX** | `param.cgi?action=list&group=Image.I0.RateControl` | `Mode` (mbr/abr/vbr), `MaxBitrate`, `ABR.TargetBitrate`, `ABR.MaxBitrate` |
| **RTSP SDP** (fallback) | `DESCRIBE` → `b=AS:` | pico anunciado (kbps), sem baixar mídia |

> ⚠️ **Configurado ≠ real.** É o **teto/target** (planejamento de pior caso). Com Zipstream/ABR (Axis) o **médio real** costuma ser bem menor: o `MaxBitrate` (MBR) é o teto; o `ABR.TargetBitrate` é a melhor estimativa de média para planejamento.

## 3. Decisão (03/07)

**Estratégia:** *configurado 24/7 + real oportunístico.* **Fonte do configurado:** *ONVIF primário + VAPIX para enriquecer Axis.*

Duas métricas desacopladas:
1. **Banda provisionada (24/7)** = bitrate **configurado** lido do device (ONVIF universal; VAPIX nas Axis para pegar modo ABR/Zipstream), no healthcheck, **cacheado**. Fonte de verdade para planejamento e para o card de banda do Video Wall.
2. **Banda real (oportunística)** = delta do mediamtx **só quando já há stream ativo** (custo zero). Nunca puxar vídeo só para medir.

## 4. Arquitetura da solução

```
Healthcheck 24/7 (por câmera, já conectado)
   ├─ ONVIF: GetVideoEncoderConfiguration → BitrateLimit (universal)
   └─ Axis:  VAPIX param.cgi RateControl   → Mode + Max/TargetBitrate (enriquece)
        → grava "banda provisionada" (kbps) por perfil, cacheada  ── planejamento + Video Wall
Stream ativo (só quando alguém assiste)
   └─ mediamtx bytesReceived delta → bitrate REAL da janela ─────── monitoramento pontual
```

- A leitura do **configurado** pega carona na conexão que o health worker já mantém → sem nova conexão por câmera. Cache com refresh de baixa frequência (raramente muda).
- O **real** segue como está no sampler, mas **depende** do fix de ciclo de vida ([[SOFTWARE-2003 - Ciclo de vida de sessões de streaming e telemetria de banda por câmera]]) para não haver relays 24/7.

## 5. Passo a passo do planejamento

1. **ONVIF driver** — `apps/ms-cameras/src/hardware/drivers/onvif/onvif.driver.ts`: novo método `getEncoderConfig()` que lê `services.media.getVideoEncoderConfiguration` (ou o `VideoEncoderConfiguration` do profile já obtido via `mediaGetProfiles`, precedente em `camera-credential-probe.service.ts`) → `{ bitrateLimitKbps, frameRateLimit, encoding, width, height, rateControlType }`. Adicionar à interface `ICameraDriver` (`hardware/drivers/i-camera-driver.interface.ts`) como opcional.
2. **VAPIX (Axis)** — helper em `cameras/utils/` (ou `health/utils/`) usando `AxisDigestClient` (já existe): `GET /axis-cgi/param.cgi?action=list&group=Image.I0.RateControl` → parse `Mode` + `MaxBitrate` + `ABR.TargetBitrate`. Só quando fabricante = Axis (URL `/axis-media/` ou manufacturer). Enriquece o valor ONVIF com o modo (ABR/Zipstream) e o target.
3. **Coleta no healthcheck** — em `health/workers/camera-health.worker.ts` (ou um pequeno serviço chamado pelo `camera-health-bootstrap.service.ts`): ao conectar e depois em refresh periódico (env `CAMERA_BITRATE_REFRESH_HOURS`, default 6h), resolver a banda provisionada (ONVIF → VAPIX) e persistir. Best-effort (falha não derruba o heartbeat).
4. **Persistência** — migration Prisma em `database/schema/stream/camera_stream_profile.prisma`: manter `bitrateKbps` (agora = provisionado device-truth) e adicionar `bitrateSource` (`ONVIF`|`VAPIX`|`SDP`|`MANUAL`), `rateControlMode` (`MBR`|`ABR`|`VBR`|null) e `bitrateUpdatedAt`. Repo de update dedicado (upsert por `(cameraId, role)`), sem tocar no fluxo de CRUD.
5. **Banda do Video Wall** — `dashboard/bandwidth/bandwidth-monitoring.service.ts`: já soma `profile.bitrateKbps`; passa a somar o valor **device-truth** (agora fresco) e expõe `bitrateSource`/`updatedAt` para o front distinguir "provisionado" de "medido". (Remove o callout de "estático" do [[Video Wall - Banda e alertas]].)
6. **Bitrate real (oportunístico)** — sem mudança no `availability-window-sampler.service.ts` além de deixar explícito no contrato que `avgBitrateMbps` = **real** (só com stream) e a banda provisionada é campo separado. Pré-requisito operacional: [[SOFTWARE-2003 - Ciclo de vida de sessões de streaming e telemetria de banda por câmera]].
7. **Contratos** (`libs/contracts`) — adicionar `provisionedBitrateKbps` + `bitrateSource` ao payload de banda / health metrics; `avgBitrateMbps` continua sendo o real. `errorCode` novo se a leitura ONVIF falhar de forma dura (senão best-effort → null).
8. **Testes + gate** — unit do parser VAPIX e do mapeamento ONVIF; do refresh (cache + best-effort); do bandwidth service usando device-truth. Rodar suíte completa do `ms-cameras` (`nx test/lint/build`), 0 lint.

## 6. Requisitos e trade-offs

- Atende **RF-VW-06** (monitoramento de banda) e **RNF-CAM-12** (alertas por câmera/sessão) com número device-truth, e **RNF-CAM-01** (escala): custo por câmera = 1 request leve a cada ~6h.
- **Trade-off aceito:** provisionado é teto/target, não consumo real. Para pior caso de rede é o número certo; o real fica como sinal pontual via mediamtx. Zipstream/ABR faz o médio real ser menor que o teto — por isso guardamos `rateControlMode` (planejar com `ABR.TargetBitrate` quando houver).

## 7. Decisões em aberto

- Qual perfil ONVIF ler quando há vários (usar o `mediaProfileToken` já configurado no `CameraStreamProfile`).
- Cadência de refresh (6h default) e se dispara também em mudança de config detectada.
- Câmeras que reportam configurado errado → validar contra `b=AS:` do SDP como sanity check (fallback do passo 2/7).

## 8. Referências

- Código: `streaming/services/availability-window-sampler.service.ts` (sampler atual), `dashboard/bandwidth/bandwidth-monitoring.service.ts`, `hardware/drivers/onvif/onvif.driver.ts`, `cameras/services/camera-credential-probe.service.ts` (precedente `mediaGetProfiles`), `health/utils/digest-auth.utils.ts` (`AxisDigestClient`).
- Axis: [Rate control](https://developer.axis.com/vapix/network-video/rate-control/) · [Stream status API](https://developer.axis.com/vapix/network-video/stream-status-api/) · [Bitrate control (white paper)](https://www.axis.com/dam/public/bf/08/ac/bitrate-control-for-ip-video-en-US-394475.pdf).
- ONVIF: [Media Service Spec](https://www.onvif.org/specs/srv/media/ONVIF-Media-Service-Spec.pdf) (GetVideoEncoderConfiguration / RateControl.BitrateLimit).
- RTSP/SDP: [RFC 2326](https://www.ietf.org/rfc/rfc2326.txt) · [b=AS bandwidth modifier](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-rtsp/bc1826f8-8c7b-43c5-ac09-938caddea1c2).
