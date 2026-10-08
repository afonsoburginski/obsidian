---
tags:
  - doc
  - cameras
  - streaming
  - banda
  - ms-cameras
aliases:
  - "VMS - Banda e alertas"
  - "Video Wall - Banda e alertas"
  - "Plano - Banda por câmera (bitrate configurado ONVIF + VAPIX)"
  - "Bitrate medido 24-7 - telemetria always-on"
  - "Banda e bitrate"
  - "Streaming - Banda e bitrate"
  - "Câmeras - Streaming - Banda e bitrate"
atualizado: 2026-10-07
banner: "video streaming network"
---

# Câmeras - Streaming - Banda e bitrate

Volta para [[Câmeras - Streaming]].

## Resumo

O Attlas tem dois números de banda por câmera, e eles nunca se confundem:

| | Banda provisionada | Bitrate medido |
| --- | --- | --- |
| O que é | teto ou alvo que o device está configurado para entregar | bytes que de fato chegaram ao MediaMTX |
| De onde vem | config do encoder lida por ONVIF, VAPIX ou ISAPI | delta do contador de bytes de um path que um espectador já abriu |
| Quando existe | 24/7, relido a cada 6 h | só enquanto alguém assiste à câmera |
| Onde mora | `CameraStreamProfile.bitrateKbps`, `bitrateSource`, `rateControlMode`, `bitrateUpdatedAt` | `CameraAvailabilityWindow.avgBitrateMbps` e `CameraBitrateSample` |
| Custo na câmera | uma requisição leve a cada 6 h | zero: lê bytes que o espectador já fez circular |

Regra que não se negocia: **nunca puxar vídeo só para medir**. A leitura do device em si (drivers ONVIF, VAPIX e
ISAPI) está em [[Câmeras - Integração com dispositivo - Arquitetura e estratégias]]; as telas que mostram os
números estão em [[Câmeras - Dashboard]], [[Câmeras - Saúde e monitoramento]] e [[Câmeras - VMS]].

## Onde está escrito

| Assunto | Spec |
| --- | --- |
| Bitrate medido e TTFF | `apps/ms-cameras/docs/atomic/PROJ-006-bitrate-ttff-telemetry.md` |
| Coletor da banda provisionada | `apps/ms-cameras/docs/atomic/PROJ-008-provisioned-bandwidth-collector.md` |
| Bitrate configurado no device | `apps/ms-cameras/docs/atomic/INT-006-device-configured-bitrate.md` |
| Banda pela verdade do device | `apps/ms-cameras/docs/atomic/UC-030-bandwidth-device-truth.md` |
| Snapshot de banda do VMS | MOD-008, UC-019 |
| Consumo e disponível do dashboard | UC-038 |

## Por que não existe bitrate de câmera ociosa

RTSP é consumo sob demanda: sem cliente, a câmera não codifica nem transmite. A Axis 10.1.1.79 confirma isso por
todos os lados: `streamstatus.cgi` só traz metadados de conexão, `param.cgi` só traz configuração, o catálogo de
eventos só tem um booleano de degradação de ABR, SNMP mede a placa inteira, não há API de monitoramento de rede, o
SDP do `DESCRIBE` não traz banda, e o relatório do device mostrava média de vida de 0,098 Mbps (o encoder parado
entre espectadores).

Puxar vídeo 24/7 por device para ter a série custa, em 13 câmeras, 63,4 Mbps no stream principal, 28,4 Mbps no
sub e 2,6 Mbps em 320x180 a 5 fps, e cresce linear com a frota. Por isso o Attlas não faz.

## Capacidade da câmera (medida em campo, Axis)

- A placa de rede é de 100 Mbps, sem gigabit; o limite de banda do device existe e vem desligado.
- O encoder limita perfis simultâneos com parâmetros distintos (tipicamente 2 a 4 em resolução cheia), não taxa de
  bits; vários clientes do mesmo perfil custam só banda.
- VBR sem teto em 1080p pode picar 10 a 20 Mbps em cena complexa. Banda por codec e bits por pixel de cada tier
  estão em [[Câmeras - Streaming - Codecs]].
- Com Zipstream ou ABR, o médio real fica bem abaixo do `MaxBitrate`; o `ABR.TargetBitrate` é a melhor estimativa
  de média para planejamento.

## Banda provisionada

`apps/ms-cameras/src/health/workers/provisioned-bandwidth-collector.service.ts` faz um passe no boot e outro a cada
`CAMERA_BITRATE_REFRESH_HOURS` (6), para as câmeras `OPERATIONAL` e `TESTING`, pegando carona nas credenciais do
ciclo de saúde. O `DeviceBitrateReader` combina ONVIF (universal), VAPIX `Image.I0.RateControl` (Axis: modo e, em
ABR, o alvo) e ISAPI (Hikvision: `constantBitRate` ou `vbrUpperCap`, que vence). Falha não derruba o heartbeat.
Quando o valor muda, o dashboard recebe o sinal `BANDWIDTH`.

O mesmo passe atualiza, nas Axis, os codecs que o encoder declara (`Camera.supportedVideoCodecs`), descritos em
[[Câmeras - Streaming - Codecs]].

**Sentinela de VBR**: câmera VBR sem teto reporta `2147483647` kbps. Todo consumidor descarta esse valor
(`MAX_SANE_BITRATE_KBPS`, `plausibleBitrateMbps` em `apps/ms-cameras/src/health/availability/availability.aggregator.ts`),
e a escolha de perfil cai para o próximo perfil usável em vez de derrubar a câmera.

## Bitrate medido

`apps/ms-cameras/src/health/workers/availability-window-sampler.service.ts`, a cada 5 min, com lease fixo de uma
réplica (a linha de base de bytes vive em memória e precisa ficar quente):

1. Agrupa as linhas de câmera por device físico (`groupByDeviceStream`, pela `streamUrl`), porque a mesma câmera
   existe uma vez por tenant.
2. Faz uma leitura de `/v3/paths/list` para o fleet inteiro (`LivePublisherProbe.readFleet`, em
   `apps/ms-cameras/src/streaming/services/live-publisher-probe.service.ts`), somando bytes e leitores de todos os
   paths disponíveis da câmera.
3. Por device: com leitor e linha de base válida, **real** = delta de bytes x 8 / tempo / 1e6 (exige pelo menos
   meia janela decorrida; contador que voltou, como depois de um restart, dá `null`). Sem leitor, o valor da janela
   é o **provisionado** do device. Device com todas as linhas `OFFLINE` fica `null`.
4. Grava o mesmo valor em todas as linhas do device em `CameraAvailabilityWindow.avgBitrateMbps`; só as leituras
   reais vão para `CameraBitrateSample` (retenção `CAMERA_BITRATE_SAMPLE_RETENTION_HOURS`, 48).
   `cameras_bitrate_window_samples_total{source}` conta `real`, `provisioned`, `none` e `persist_error`, uma vez
   por device.
5. Anuncia a janela ao canal ao vivo só quando ela muda (estado, latência ao milissegundo ou bitrate a 0,1 Mbps).

O card de saúde também mostra um bitrate instantâneo (duas leituras do contador com 400 ms de intervalo, cache de
5 s), descrito em [[Câmeras - Saúde e monitoramento - Arquitetura e estratégias]].

## Snapshot de banda do VMS

`GET /api/dashboard/bandwidth?cameraIds=<csv-uuid>` (`apps/ms-cameras/src/dashboard/bandwidth/bandwidth.controller.ts`,
`@RequireSystemDuty()`) chama `BandwidthMonitoringService.buildSnapshot` (`bandwidth-monitoring.service.ts`). É
agregação de leitura, sem tabela nem worker próprios:

1. Lê as câmeras `OPERATIONAL`, não deletadas, opcionalmente `id IN cameraIds`. Sem `cameraIds` é a rede inteira,
   sem filtro de sistema nem de organização.
2. Escolhe um perfil por câmera (`pickPreferredProfile`, `bandwidth-profile-selection.ts`): SECONDARY, depois
   PRIMARY, só perfis ativos com bitrate usável.
3. Soma só câmeras online pelo snapshot de saúde (`CameraHealthSnapshotRepository`) e com perfil usável.
4. Calcula `usageRatio = totalKbps / limitKbps` e `alertLevel`: sem limite é `OK`; `>= 1.0` é `CRITICAL`;
   `>= BANDWIDTH_WARNING_RATIO` é `WARNING`.

O payload `IBandwidthMonitoringPayload` (`libs/contracts/src/lib/camera/i-bandwidth-monitoring-payload.ts`) traz
`totalKbps`, `cameraCount`, `limitKbps`, `usageRatio`, `alertLevel`, `updatedAt`, `provisioned: true` e
`oldestBitrateUpdatedAt` (frescor do total). O número é **banda provisionada**, não medida.

| Variável (`bandwidth.config.ts`) | Padrão | Efeito |
| --- | --- | --- |
| `NETWORK_BANDWIDTH_LIMIT_KBPS` | vazio, sem limite | limite de banda; inválido vira sem limite |
| `BANDWIDTH_WARNING_RATIO` | `0.8` | fração que dispara `WARNING`; fora de `(0,1)` vira `0.8` |

> [!warning] O consumo em tempo real do VMS está só no backend
> O requisito (RF-VW-06, RNF-CAM-12) pede consumo em tempo real por câmera e total da sessão do VMS, com alerta
> proativo ao se aproximar do limite. O snapshot traz só o total provisionado e o nível de alerta, sem breakdown
> por câmera nem push, e **nenhuma tela consome `GET /api/dashboard/bandwidth`**: não há chip de banda no VMS. O piso
> de taxa de bits do videowall (RNF-CAM-18) também espera este número e não é checado.

## Consumo e disponível do dashboard de câmeras

`bandwidth-consumption`, `bandwidth-by-area` e `bandwidth-comparison` (`bandwidth-series.service.ts`,
`aggregation/bandwidth-series.aggregator.ts`, em `apps/ms-cameras/src/dashboard/bandwidth/`) têm duas linhas:

- **Disponível**: soma do provisionado, um perfil por câmera pela mesma `pickPreferredProfile`. É valor único do
  período (o perfil não tem histórico), por isso a linha é plana.
- **Consumido**: `avgBitrateMbps` das janelas (dentro da retenção fina) ou dos rollups diários, **só o medido**.
  Como a coluna não diz se o valor é real ou provisionado, `excludeProvisionedFallback` anula a linha que bate com
  um provisionado atual da câmera dentro de uma tolerância curta. Sem isso, câmera ociosa e online somaria o
  próprio disponível no consumido e a utilização tenderia a 100%.

A mesma definição vale para série, totais, fatias por área e comparação. KPIs de banda contam só câmeras
`OPERATIONAL` e `TESTING`.

## Armadilhas

- **O contador de bytes do MediaMTX tem dois nomes**: `inboundBytes` é o atual e `bytesReceived` está
  `deprecated`. O leitor único com fallback é `helpers/mediamtx-inbound-bytes.helper.ts`; ler só o antigo zeraria a
  série em silêncio num upgrade.
- **Rollup diário mistura real e provisionado**: acima da retenção fina, o consumido vem do rollup, cuja média já
  mistura os dois, e a heurística de exclusão deixa de pegar qualquer coisa.
- **Provisionado é teto, não consumo**: câmera online sem espectador soma o provisionado inteiro no snapshot do
  VMS.

## Pendências

| O que falta | Por que importa | Onde |
| --- | --- | --- |
| Coluna `source: REAL \| PROVISIONED` nas janelas e nos rollups | substitui a heurística de tolerância pela correção durável | `CameraAvailabilityWindow`, rollups diários |
| Tela que consome o snapshot de banda do VMS | o requisito de consumo em tempo real não chega ao operador | VMS no `web-attlas` |

## Glossário

| Termo | O que é |
| --- | --- |
| Banda provisionada | O que o encoder está configurado para entregar, lido do device |
| Bitrate medido | O que chegou ao MediaMTX, pelo delta do contador de bytes |
| VBR, MBR, ABR, CBR | Modos de controle de taxa: variável, máximo, médio ao longo de dias e constante |
| Zipstream | Compressão da Axis que reduz banda fora da área de interesse |
| Rollup | Agregado diário das janelas de 5 min, usado acima da retenção fina |
| Retenção fina | Período em que as janelas de 5 min ficam guardadas uma a uma |
