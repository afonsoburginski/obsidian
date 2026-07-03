---
tags: [doc, cameras, ms-cameras, video-wall]
---

# Video Wall — Banda e alertas

> Parte do [[00 - Video Wall]] — **MOD-008 bandwidth-monitoring** (UC-019 / RF-VW-06 / RNF-CAM-12). Canvas: [[08 - MOD-008 bandwidth-monitoring.excalidraw|diagrama]].

Código em `apps/ms-cameras/src/dashboard/bandwidth/`. Sem tabela, worker ou repositório novos: MOD-008 é uma **agregação read-time** que reusa telemetria existente.

## Endpoint

`GET /dashboard/bandwidth?cameraIds=<csv-uuid>` → `GetBandwidthSnapshotHandler` → `BandwidthMonitoringService.buildSnapshot`.

- **Com `cameraIds`** → banda da **sessão** do Video Wall (só aquelas câmeras).
- **Sem `cameraIds`** → visão de **rede** (todas OPERATIONAL online).
- `cameraIds` é CSV de UUIDs validado (`GetBandwidthQueryDto`). O snapshot **não é org-scoped** — filtra apenas por `cameraIds` (a sessão do Video Wall é quem restringe o conjunto).

## Payload (`IBandwidthMonitoringPayload`)

`libs/contracts/src/lib/camera/i-bandwidth-monitoring-payload.ts`:

| Campo | Significado |
| --- | --- |
| `totalKbps` | Soma do bitrate das câmeras contabilizadas |
| `cameraCount` | Nº de câmeras somadas |
| `limitKbps` | Limite configurado; `null` = sem limite |
| `usageRatio` | `totalKbps / limitKbps`; `null` se sem limite |
| `alertLevel` | `OK` \| `WARNING` \| `CRITICAL` |
| `updatedAt` | ISO 8601 do instante da agregação |

## Agregação (`bandwidth-monitoring.service.ts`)

1. **Câmeras elegíveis** (BR-BW-003): `lifecycleState = OPERATIONAL`, `deletedAt = null`, opcionalmente `id IN cameraIds`.
2. **Bitrate por câmera** (BR-BW-001): `bitrateKbps` do perfil **SECONDARY ativo** (`CameraStreamProfile`, `take 1`).
3. **Online**: reusa o snapshot de health (`CameraHealthSnapshotRepository.findAll()`, MOD-003 → [[00 - Saúde e monitoramento]]); soma o conjunto `isOnline`.
4. **Soma**: só entram câmeras **online E com perfil secundário**; offline ou sem secundário não somam (BR-BW-004).
5. `usageRatio` e `alertLevel` a partir do total e da config.

## Fonte do bitrate — ressalva importante

> [!warning] O total usa o bitrate **estático do perfil**, não o bitrate real do mediamtx
> A implementação atual de MOD-008 soma o `bitrateKbps` **configurado** no perfil SECONDARY de cada câmera (`CameraStreamProfile`), confirmado no código e no próprio contrato (`IBandwidthMonitoringPayload`: *"soma do bitrateKbps SECONDARY das câmeras online"*). É um **consumo planejado/estimado**, não medido. Uma câmera online sem tráfego real ainda soma o bitrate do perfil.

Onde o **bitrate real do mediamtx** (delta de `bytesReceived`) de fato existe hoje, para não confundir os dois mecanismos:

- **`AvailabilityWindowSampler`** (`src/health/workers/`, PROJ-006): a cada 5 min lê `/v3/paths/get/<cameraId>-primary` do mediamtx e calcula `(bytesNow − bytesPrev) · 8 / elapsed / 1e6` → `avgBitrateMbps` da janela, para tendência de disponibilidade/dashboard. É o **stream primário**, não a sessão do Video Wall. Ver [[00 - Streaming]] / [[00 - Saúde e monitoramento]].
- **`StreamDiagnosticsService`** (`src/streaming/`): lê `bytesReceived` como diagnóstico (não como taxa).
- **Status por câmera** (`ICameraStatusPayload.streamQuality.bitrate`, UC-09/UC-10): também expõe o `bitrateKbps` **estático** do perfil secundário, não o valor do mediamtx.

Ou seja: o snapshot de banda do Video Wall **não** consome `bytesReceived` do mediamtx. Se o requisito for banda medida em tempo real, é evolução pendente (plugar o sampler/telemetria mediamtx na agregação).

## Configuração (`bandwidth.config.ts`)

Lida do ambiente, com defaults seguros:

| Env | Papel | Default |
| --- | --- | --- |
| `NETWORK_BANDWIDTH_LIMIT_KBPS` | Limite de banda; inteiro positivo | `null` (sem limite) |
| `BANDWIDTH_WARNING_RATIO` | Fração do limite que dispara `WARNING`; `0 < r < 1` | `0.8` |

## Níveis de alerta (BR-BW-002)

`classifyAlert(usageRatio, warningRatio)`:

| Condição | `alertLevel` |
| --- | --- |
| Sem limite (`usageRatio === null`) | `OK` |
| `usageRatio ≥ 1.0` | `CRITICAL` |
| `warningRatio ≤ usageRatio < 1.0` | `WARNING` |
| `usageRatio < warningRatio` | `OK` |

## RF-VW-06 / RNF-CAM-12 — estado

- **Total da sessão + nível de alerta**: backend (este endpoint).
- **Consumo por câmera**: o backend não devolve breakdown por câmera no snapshot; o frontend usa o status por câmera (`streamQuality.bitrate`, também estático) para o detalhe.
- **Alerta proativo**: o backend classifica um snapshot pontual (pull); a proatividade (polling/aviso ao aproximar do limite) é do **frontend** — não há push/evento de banda no backend.

## Relacionados

[[00 - Video Wall]] · [[Video Wall - Arquitetura e estratégias]] · [[Video Wall - Requisitos e SLA]] · [[00 - Streaming]] · [[00 - Saúde e monitoramento]]
</content>
