---
tags:
  - attlas
  - sprint-23
  - cameras
  - streaming
card: SOFTWARE-2023-F3
branch: cameras/feat/SOFTWARE-2023-F3
atualizado: 2026-07-08
status: PR #656 MERGEADA em develop (08/07, commit b5d3c3b)
---

# SOFTWARE-2023-F3 - Streaming adaptativo + correcoes F1/F2/F3

Origem: teste da Fase 3 da [[SOFTWARE-2003 - Ciclo de vida de sessões de streaming e telemetria de banda por câmera]] no EC2 dev. A Fase 1 (reaper) passou limpa, mas a validacao expos que o streaming fica preso em 1080p e a banda device-truth nao chega no card. Este card junta a correcao da logica adaptativa (resolucao e codec automaticos) com os achados F1, F2, F3.

## Investigacao (o que estava errado)

- **Perfis de stream so nascem no `seed.ts`.** Nao ha descoberta/provisionamento em runtime. Das 12 cameras OPERATIONAL no dev, so a ATMN DEMO tem 3 perfis (PRIMARY/SECONDARY/TERTIARY); todas as SNL tem so PRIMARY.
- **Camera 1027 (a mais problematica):** so perfil PRIMARY, 1920x1080, H264, `bitrateKbps=2147483647` (VBR, lixo pre-fix). Sem SECONDARY/TERTIARY.
- **Raiz do "tudo 1080p":** o `QUALITY_FALLBACK_CHAIN` do resolver faz `SECONDARY -> [SECONDARY, PRIMARY]`. Como quase nao existe SECONDARY, todo pedido de qualidade menor cai pro PRIMARY (1080p). O frontend ate pede `quality=secondary` (visto nos logs), mas o backend serve o main. Nao havia escada de resolucao.
- **Codec automatico ja existia** em parte: o resolver escolhe `codec = profile.codec ?? camera.videoCodec ?? H264` e o `FfmpegSessionService` faz fallback H265 -> H264 no start. Isso foi mantido.

## O que foi implementado (PR)

### Resolucao adaptativa (o "estilo Netflix") - resolver
`camera-stream-source.resolver.ts`. Nova escada por tier: `SECONDARY = 1280x720`, `TERTIARY = 720x480` (PRIMARY = nativa do device). Quando uma qualidade menor e pedida mas o perfil casado e de resolucao maior (fallback, o caso comum) ou o perfil nao declara resolucao, o resolver pede ao device a resolucao menor (Axis VAPIX `resolution=`) em vez de servir o 1080p. A `resolvedQuality` passa a ser a PEDIDA, entao o sub-stream vira um path proprio no mediamtx (`cameraId-secondary`) e uma relay propria compartilhada entre viewers, em vez de reusar a relay 1080p do PRIMARY.

### F1 - banda device-truth chega no card
`bandwidth-monitoring.service.ts`. O card do Video Wall somava so o perfil SECONDARY (device-truth caia no PRIMARY). Agora escolhe na ordem `SECONDARY -> PRIMARY`, entao o card reflete o device-truth mesmo em cameras sem SECONDARY.

### F2 - VBR nao envenena mais e nao some
- Driver ONVIF (`onvif.driver.ts` + `estimate-bitrate.util.ts`): quando o encoder reporta o sentinela int-max de VBR (sem teto), em vez de descartar, estima o bitrate pela resolucao/codec (`bitrate ~ w*h*fps*bpp`, H265 ~metade do H264) e marca `BitrateSource.ESTIMATED` + `RateControlMode.VBR`. Sem resolucao, volta null (mantem o anterior).
- Card (`bandwidth-monitoring.service.ts`): guard read-time ignora valores absurdos (>= 1 Gbps), protegendo a soma das linhas antigas ainda nao recolhidas.
- Novo enum `BitrateSource.ESTIMATED` em `@attlas/contracts` (aditivo).

### F3 - reaper observavel por metrica
`streaming.metrics.ts` + reaper. Novas metricas Prometheus: `ms_cameras_stream_reaper_reaped_total` (counter) e `ms_cameras_stream_sessions_active` (gauge). Antes reaps so apareciam em log.

### Negociacao de codec (INT-008, 2026-07-07)
Fecha a peca que faltava da pesquisa de codec ([[codec-protocol-adaptive-strategy-research]]): servir H265 aos clientes que decodam por hardware e H264 como base universal, sempre com fallback. Cliente novo `StreamCodecService` (web-attlas) sonda `MediaCapabilities.decodingInfo` (webrtc + media-source) + `RTCRtpReceiver.getCapabilities` e so pede H265 quando `smooth && powerEfficient`; os 3 hosts (videowall, camera-detail, side-detail) abrem a sessao com o codec negociado. Backend: sessao/relay chaveada por `(cameraId, quality, codec)` (helper `stream-codec.helper.ts`), path mediamtx `-h265`, resolver injeta `videocodec` por request, fallback H264 no mesmo path. Reaper/diagnostics/availability-sampler passaram a construir o path pela variante. Specs `INT-008-codec-negotiation.md` + `MOD-004` (§13).

## Merge com develop (2026-07-07)
A PR estava com conflito em 5 arquivos (develop avancou em cima dos mesmos): `live-media-registry.service.ts`, `camera-detail.page.ts/.html`, `videowall.page.ts`, `UF-014`. Resolucao combinando os dois lados: fan-out do registry (SOFTWARE-2023) + pin/unpin (develop) convivem; videowall junta os metodos de ABR (F3) com o `reconcileStreamSessions` de rotacao (develop); camera-detail mantem o codec e adota a limpeza de dead code do develop (remocao de `frameRate`/`safeMode`/`notifications`). Push feito, PR voltou a MERGEABLE.

## Gate

- ms-cameras: 784 testes verdes (4 skip pre-existentes), lint 0 erros, build ok.
- contracts: build + lint + test ok.
- Node 22.22.1.

## O que ainda precisa de validacao em device / follow-up

- **A escada de resolucao precisa ser confirmada com camera Axis real** no dev: comprovar que `resolution=1280x720/640x360` via VAPIX reduz de fato a banda e o player exibe o sub-stream. Testes unitarios cobrem a montagem da URL, nao o comportamento do device.
- **F4 (respawn de start-timeout):** camera que falha o start entra em respawn de ffmpeg fora do registry (limitado a 10 tentativas, sem leak de banda, mas invisivel ao reaper) e GETs concorrentes criam loops duplicados. Nao entrou neste PR. Corrigir cancelando a reconexao quando o start inicial falha + dedup no caminho de falha. Investigar por que a ATMN DEMO nao transmite no dev.
- **Provisionamento device-truth dos perfis (mais correto que a escada fixa):** enumerar os perfis reais do device via ONVIF `getProfileList` (resolucao/codec/bitrate por perfil) e provisionar SECONDARY/TERTIARY no banco, best-effort e aditivo (o resolver ja consome esses perfis). A escada fixa deste PR resolve o 1080p ja; o provisionamento por device-truth e a evolucao. Fica como proximo passo.
- **Scrub das linhas `bitrateKbps=2147483647`:** o guard read-time e o refresh (que agora grava o estimado) resolvem na pratica; um backfill unico limparia o residuo de imediato.

## Referencias

- Relatorio da Fase 3 (validacao no EC2 dev): [[SOFTWARE-2003-fase3-validation]] (movido do repo para o vault)
- Pesquisa de codec/protocolo/qualidade: [[codec-protocol-adaptive-strategy-research]]
- Spec da negociacao de codec: `apps/ms-cameras/docs/atomic/INT-008-codec-negotiation.md`
- [[SOFTWARE-2003 - Ciclo de vida de sessões de streaming e telemetria de banda por câmera]]
- [[SOFTWARE-2009 - Escalabilidade horizontal do ms-cameras em Kubernetes]] (separada, k8s; F4 e provisionamento nao dependem dela)
