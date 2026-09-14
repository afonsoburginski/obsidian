---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
card: SOFTWARE-3178
clickup: https://app.clickup.com/t/86akhnwh3
titulo: "[Full] Detecção - a caixa presa ao tempo de captura do quadro, com o relógio da câmera nas duas pontas"
frente: Analítico
tamanho: 8 pts
pr: "#3438 (fase 1/3), #3472 (fase 2/3), #3489 (fase 3/3), stack #3473"
status: "Fases 1/3 (#3438) e 2/3 (#3472) abertas. A 1/3 faz o overlay ler `captureTime` do `requestVideoFrameCallback` e usá-lo como cabeça, caindo na estimativa de hoje quando o transporte não reporta. A 2/3 escreve `useAbsoluteTimestamp` no caminho `analytic-<cameraId>` do media server, e só nele: campo por caminho, nunca em `pathDefaults`, com o risco da issue 5355 do MediaMTX documentado na INT-023 (a v1.18.2 que o repo fixa é anterior à correção do gortsplib PR 1099, de 05/07/2026), recuo manual por env e recuo automático por câmera quando o caminho fica duas passadas sem ficar pronto. Nasce desligada de propósito: quem consome o carimbo absoluto é a fase 3, o analítico carimbando cada quadro com o NTP da câmera lido dos sender reports do RTSP direto, ainda a abrir."
sprint: "[[Attlas - Sprint 33]]"
estudo: "[[Analítico - Estudo de caso de captura, inferência e sincronização]]"
atualizado: 2026-09-14
---

# Detecção - sincronização exata da caixa com o vídeo

O pedido: a caixa acompanhar o veículo exatamente, suave, **sem afetar o streaming nas outras
telas**. Hoje os dois lados estimam: o front lê o relógio do vídeo por `getStats` (que devolve
`estimatedPlayoutTimestamp` nulo nesta máquina e cai em `Date.now() - jitterBufferDelay - rtt/2`) e
traduz os carimbos do device pelo menor atraso observado. Razoável, nunca exato.

Desenho decidido em [[Analítico - Estudo de caso de captura, inferência e sincronização]] (decisão
3.3): **o mesmo relógio, o da câmera, nas duas pontas.**

## O que o card faz

1. **Analítico carimba cada quadro com o tempo de captura da câmera**, lido dos RTCP Sender Reports
   do RTSP direto (par NTP + RTP, obrigatório pela ONVIF). Spike com duas opções: GStreamer
   (`rtspsrc ntp-sync=true` até um `appsink`) ou cliente RTSP leve que leia os SR e mapeie o RTP
   timestamp de cada quadro. Se o modelo Axis oferecer a extensão RTP com NTP por quadro (VAPIX
   ONVIF Replay Extension), é o caminho mais preciso.
2. **MediaMTX repassa o relógio da câmera ao WebRTC**: `useAbsoluteTimestamp: true` nos paths que a
   tela de Detecção consome, para o RTCP SR do WebRTC carregar o NTP da fonte em vez do relógio do
   servidor.
3. **O front lê `captureTime`** de cada quadro apresentado em `requestVideoFrameCallback` e faz dele a
   cabeça do overlay - sem lead, sem skew, sem predição. `rtpTimestamp` como segundo plano se o
   MediaMTX preservar o RTP timestamp da fonte (não transcodifica; verificar).
4. Suavização por filtro (alfa-beta) só sobre o que sobrar de tremor do próprio analítico.

## Risco que o spike tem de fechar antes

Issue #5355 do MediaMTX: com `useAbsoluteTimestamp` ligado e fonte sem SR, ele descarta pacotes.
Provar com Axis e Hikvision antes de ligar em qualquer path.

## Restrição dura

Nada aqui muda o player das outras telas. `useAbsoluteTimestamp` vai só nos paths do analítico, e a
leitura de `captureTime` vive no módulo `analytics-detection`.

## Dependência

[[Analítico servidor - captura direta da câmera com perfil de analítico]]: é o RTSP direto que traz os
SR da câmera para o analítico.

## Critério de aceite

Caixa sobre o veículo em avenida com fluxo real, gravado antes e depois; diferença entre `captureTime`
do quadro e carimbo da detecção desenhada abaixo de um quadro do analítico.
