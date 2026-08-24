---
tags:
  - doc
  - ms-cameras
  - cameras
  - banda
  - vms
aliases:
  - "Video Wall - Banda e alertas"
atualizado: 2026-08-24
---

# VMS - Banda e alertas

> Parte do [[VMS]]. **MOD-008 bandwidth-monitoring** (UC-019, UC-030, RF-VW-06, RNF-CAM-12). Canvas: [[08 - MOD-008 bandwidth-monitoring.excalidraw|diagrama]].

Código em `apps/ms-cameras/src/dashboard/bandwidth/`. Sem tabela, worker ou repositório próprios:
MOD-008 é uma **agregação read-time** que reusa telemetria existente.

## Endpoint

`GET /dashboard/bandwidth?cameraIds=<csv-uuid>` → `GetBandwidthSnapshotHandler` →
`BandwidthMonitoringService.buildSnapshot`.

- **Com `cameraIds`** → banda da **sessão** do VMS (só aquelas câmeras).
- **Sem `cameraIds`** → visão de **rede** (todas OPERATIONAL online).
- `cameraIds` é CSV de UUIDs validado (`GetBandwidthQueryDto`). O snapshot **não é org-scoped**: filtra apenas por `cameraIds` (a sessão do VMS é quem restringe o conjunto).

## Payload (`IBandwidthMonitoringPayload`)

`libs/contracts/src/lib/camera/i-bandwidth-monitoring-payload.ts`:

| Campo | Significado |
| --- | --- |
| `totalKbps` | Soma do bitrate das câmeras contabilizadas |
| `cameraCount` | Nº de câmeras somadas |
| `limitKbps` | Limite configurado; `null` = sem limite |
| `usageRatio` | `totalKbps / limitKbps`; `null` se sem limite |
| `alertLevel` | `OK`, `WARNING` ou `CRITICAL` |
| `updatedAt` | ISO 8601 do instante da agregação |
| `provisioned` | `true` = o total vem do bitrate **device-truth**, não de valor estático de cadastro |
| `oldestBitrateUpdatedAt` | ISO 8601 da leitura device-truth mais antiga entre as câmeras somadas; `null` se nenhuma tem leitura. É o indicador de frescor do total |

## Agregação (`bandwidth-monitoring.service.ts`)

1. **Câmeras elegíveis** (BR-BW-003): `lifecycleState = OPERATIONAL`, `deletedAt = null`, opcionalmente `id IN cameraIds`.
2. **Perfil de bitrate** (BR-BW-001): `pickPreferredProfile` escolhe na ordem `BANDWIDTH_ROLE_PREFERENCE` = **SECONDARY, depois PRIMARY**, considerando só perfis ativos com bitrate **usável** (finito, positivo e abaixo do sentinela int-max de VBR, `MAX_SANE_BITRATE_KBPS`). Um SECONDARY com sentinela não derruba a câmera: cai para o PRIMARY.
3. **Online**: reusa o snapshot de health (`CameraHealthSnapshotRepository.findAll()`, MOD-003, ver [[Saúde e monitoramento]]); soma o conjunto `isOnline`.
4. **Soma**: só entram câmeras **online E com perfil usável**; offline ou sem perfil não somam (BR-BW-004).
5. **Frescor**: `oldestBitrateUpdatedAt` = menor `bitrateUpdatedAt` entre as somadas.
6. `usageRatio` e `alertLevel` a partir do total e da config.

## Fonte do bitrate: provisionado device-truth, não medido

> [!info] Mudou em SOFTWARE-2003 Fase 2 (UC-030 / PROJ-008)
> O `bitrateKbps` do perfil **não é mais o valor estático chutado no cadastro**: é lido do próprio
> device (ONVIF/VAPIX, INT-006) pelo coletor que pega carona no ciclo de health (PROJ-008), cacheado em
> `CameraStreamProfile` com refresh de ~6h e datado por `bitrateUpdatedAt`. O snapshot marca isso com
> `provisioned: true`.

Continua valendo a ressalva de natureza: o total é **banda provisionada**, o que o device está
configurado para entregar, e **não banda medida**. Uma câmera online sem tráfego real ainda soma o
bitrate provisionado.

Onde o **bitrate real do mediamtx** (delta de `bytesReceived`) existe hoje, para não confundir os
mecanismos:

- **`AvailabilityWindowSampler`** (`src/health/workers/`, PROJ-006): a cada 5 min lê `/v3/paths/get/<cameraId>-primary` do mediamtx e calcula `(bytesNow − bytesPrev) · 8 / elapsed / 1e6` → `avgBitrateMbps` da janela, para tendência de disponibilidade e dashboard. É o **stream primário**, não a sessão do VMS.
- **`StreamDiagnosticsService`** (`src/streaming/`): lê `bytesReceived` como diagnóstico, não como taxa.
- **Status por câmera** (`ICameraStatusPayload.streamQuality.bitrate`, UC-09/UC-10): também expõe o bitrate **provisionado** do perfil, não o valor medido no mediamtx.

Ou seja: o snapshot de banda do VMS **não** consome `bytesReceived` do mediamtx. Banda medida em tempo
real segue sendo evolução pendente (plugar o sampler na agregação).

> [!success] Confirmado em 24/08 - ressalva acima continua correta, mesmo depois da telemetria always-on de 03/08
> A entrega de [[Bitrate medido 24-7 - telemetria always-on]] (03/08, PR #1318) criou uma série medida
> por device físico via `TelemetryPathReconciler`/`CameraBitrateSample`, mas essa série **não** foi
> plugada neste snapshot - `BandwidthMonitoringService.buildSnapshot()` continua somando só
> `CameraStreamProfile.bitrateKbps` (device-truth provisionado, PROJ-008), sem tocar
> `CameraBitrateSample`/`avgBitrateMbps`. As duas entregas ficaram desconectadas de propósito ou por
> falta de priorização - não há indício de decisão registrada dizendo qual.
>
> Achado adicional na conferência: **o frontend do módulo videowall ainda não consome este endpoint**.
> Não há nenhuma referência a `bandwidth`/`totalKbps`/`alertLevel`/`usageRatio` em
> `apps/web-attlas/src/app/modules/videowall/**` hoje - o chip "Banda: X%" que a UC-019 descreve como
> consumidor não está implementado na tela. O `streamQuality` que existe no `camera-stream-player`
> compartilhado é o rótulo de qualidade do HLS.js (ex. "720p30"), não o bitrate do MOD-008.

## Fronteira com o dashboard de câmeras

O dashboard tem os seus próprios endpoints de banda (`/api/dashboard/bandwidth-consumption`,
`bandwidth-by-area`, `bandwidth-comparison`, série histórica em UC-038, `BandwidthSeriesService`). Eles
**não** são a sessão do VMS: o único ponto compartilhado é a regra de seleção de perfil
(`pickPreferredProfile`), reusada de propósito para o snapshot ao vivo e a série histórica não
divergirem.

> [!info] O dashboard de câmeras já mistura medido + provisionado
> `bandwidth-series.repository.ts` lê tanto os perfis provisionados (`findActiveProfiles` →
> `CameraStreamProfile.bitrateKbps`) quanto as janelas/rollups medidos
> (`CameraAvailabilityWindow`/`CameraAvailabilityDailyRollup.avgBitrateMbps`, PROJ-005/006):
> `bandwidth-series.aggregator.ts` soma o provisionado numa linha "disponível" e processa o medido numa
> linha "consumido". É a prova de que plugar a série medida no snapshot do VMS é viável - só não foi
> feito lá. Consumidor no front: `apps/web-attlas/src/app/modules/cameras-dashboard/`, não o videowall.

Ver as notas do dashboard de câmeras (lote próprio, ainda não escrito no vault - ver
[[Plano - atualização da documentação do vault]]).

## Configuração (`bandwidth.config.ts`)

Lida do ambiente, com defaults seguros:

| Env | Papel | Default |
| --- | --- | --- |
| `NETWORK_BANDWIDTH_LIMIT_KBPS` | Limite de banda; inteiro positivo | `null` (sem limite) |
| `BANDWIDTH_WARNING_RATIO` | Fração do limite que dispara `WARNING`; `0 < r < 1` | `0.8` |

Valor inválido cai no default sem estourar: limite não numérico ou não positivo vira `null`, razão fora
de `(0,1)` vira `0.8`.

## Níveis de alerta (BR-BW-002)

`classifyAlert(usageRatio, warningRatio)`:

| Condição | `alertLevel` |
| --- | --- |
| Sem limite (`usageRatio === null`) | `OK` |
| `usageRatio ≥ 1.0` | `CRITICAL` |
| `warningRatio ≤ usageRatio < 1.0` | `WARNING` |
| `usageRatio < warningRatio` | `OK` |

## RF-VW-06 / RNF-CAM-12: estado

- **Total da sessão + nível de alerta**: backend (este endpoint), sem consumidor no front do videowall ainda (ver callout acima).
- **Consumo por câmera**: o snapshot não traz breakdown; o front usa o status por câmera (`streamQuality.bitrate`, também provisionado) no detalhe.
- **Alerta proativo**: o backend classifica um snapshot pontual (pull); a proatividade (polling, aviso ao aproximar do limite) é do **frontend**. Não há push nem evento de banda no backend.

## Relacionados

[[VMS]] · [[VMS - Arquitetura e estratégias]] · [[VMS - Fluxos]] · [[Plano - Banda por câmera (bitrate configurado ONVIF + VAPIX)]] · [[Bitrate medido 24-7 - telemetria always-on]] · [[Streaming]] · [[Saúde e monitoramento]]
