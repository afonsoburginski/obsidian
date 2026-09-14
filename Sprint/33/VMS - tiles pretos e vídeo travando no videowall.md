---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
  - cameras
  - vms
aliases:
  - "Streaming - reaper derruba a sessão local em 20 segundos"
card: SOFTWARE-3179
clickup: https://app.clickup.com/t/86akhp0dc
titulo: "[Full] VMS - tiles pretos, vídeo travando e atraso alto no Monitoramento de Vídeo"
frente: Câmeras
tamanho: 8 pts
pr: "#3439 (fase 1/3), #3469 (fase 2/3), #3487 (fase 3/3), stack #3470"
status: "Fases 1/3 (#3439) e 2/3 (#3469) abertas. A 1/3 é o ciclo de vida da sessão: sessão WHEP viva no path conta como leitor, grace de 20 para 60 segundos, e a espera pelo `ready` para de consultar path já encerrado - os 419 `path not found`. A 2/3 é o codec: `ontrack` prova o caminho da mídia e não o decoder, então a prova virou o primeiro quadro decodado (`readyState` + `videoWidth`, 6 s); sem ele o tile avisa o host e a perna degrada, e no videowall a parede inteira desce para H264 com a sonda demovida junto (o decoder é da máquina). Spec UF-039. Fase 3 (latência e medição glass-to-glass) a abrir."
sprint: "[[Attlas - Sprint 33]]"
estudo: "[[Analítico - Estudo de caso de captura, inferência e sincronização]]"
atualizado: 2026-09-14
---

# VMS - tiles pretos e vídeo travando no videowall

Print de 14/09: visualização "Vista Vincen", 11 posições, 4 tiles pretos, e o vídeo dos demais
travando e chegando com atraso alto. Investigado no EC2 no mesmo dia; contexto completo na seção 4 de
[[Analítico - Estudo de caso de captura, inferência e sincronização]].

## O que a medição descarta e o que aponta

- **Não é o MediaMTX "cheio"**: 154 MiB, 13 a 21% de CPU, zero reinícios, sem OOM.
- **Não é regra da tela de Detecção vazando.** O que a #3328 mudou no player compartilhado foi só a
  leitura do relógio por `getStats` (53 linhas em `media-connection.ts`); nenhum parâmetro de buffer
  ou latência do player mudou, e as estratégias do overlay são injetadas no componente da Detecção,
  não no player.
- **Causa 1, ciclo de vida da sessão.** O `StreamSessionReaperService` roda a cada 5 s e encerra a
  sessão cujo path está sem leitores por mais que o grace: 13 `Reaping orphan session` em 2 h, e os
  419 `[API] path not found` do MediaMTX no mesmo período são o `ms-cameras` procurando paths que
  ele mesmo derrubou. Tile que reconecta nessa janela fica preto.
- **Causa 2, H265 no navegador.** Nove dos onze paths do videowall são `-secondary-h265`. Chrome só
  decodifica HEVC em WebRTC com decoder de hardware (Chrome 136, sem software); máquina sem GPU dá
  tile preto, e o front negocia o codec pela própria capacidade sem provar que o decoder existe.
- **Causa 3, fome de CPU.** O analítico a 580% deixa 2 vCPU para MediaMTX, `ms-cameras` e os outros
  quarenta containers. Tudo atrasa junto.
- **Atraso**, somando: GOP de 15 quadros a 25 fps na câmera (até 0,6 s para começar), o `ffmpeg`
  publicador do `ms-cameras` com `-max_delay 500000` e `-reorder_queue_size 64` (mais 0,5 s), o
  WebRTC do MediaMTX, o jitter buffer do navegador - e, se algum tile cair para HLS, o LL-HLS de
  7 segmentos de 2 s são mais 4 a 6 s. Medir tile a tile qual protocolo está em uso é o primeiro
  passo.

Absorve a task anterior "Streaming - reaper derruba a sessão local em 20 segundos": o mesmo reaper, a
mesma causa, uma PR só.

## O que o card faz

1. Reaper: grace de zero leitores para pelo menos 60 s e **nunca** encerrar enquanto houver sessão
   WHEP ativa daquele path; parar de consultar path que o próprio `ms-cameras` encerrou.
2. Codec: H264 por padrão no videowall; H265 só quando `RTCRtpReceiver.getCapabilities('video')`
   provar decoder de hardware, com fallback automático para H264 se o primeiro quadro não chegar.
3. Latência: `-max_delay` e `-reorder_queue_size` do publicador reduzidos e medidos (o transporte já é
   TCP); keyframe mais curto nos perfis do VMS; e o front sinalizando quando um tile está em HLS.
4. Medição glass-to-glass (relógio na tela filmada) antes e depois, tile a tile, no corpo da PR.

## Dependência

[[Analítico servidor - orçamento de inferência na CPU]]: sem devolver CPU ao box, o resto é
paliativo.

## Critério de aceite

Os 11 tiles de pé por 30 minutos sem tile preto; zero `Reaping orphan session` com o videowall
aberto; atraso glass-to-glass abaixo de 1,5 s no WebRTC.

## Onde olhar

`apps/ms-cameras/src/streaming/workers/stream-session-reaper.service.ts`,
`apps/ms-cameras/src/streaming/services/ffmpeg-session.service.ts`,
`apps/ms-cameras/src/streaming/streaming.controller.ts`,
`apps/web-attlas/src/app/core/shared/components/camera-stream-player/media-connection.ts`,
`docker/mediamtx.yml`.
