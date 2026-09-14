---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
  - cameras
  - vms
card: SOFTWARE-3180
clickup: https://app.clickup.com/t/86akhp1t3
titulo: "[Full] Entrega de vídeo - uma publicação por câmera para N espectadores, réplicas do MediaMTX, e a decisão sobre CDN"
frente: Câmeras
tamanho: 5 pts
pr: "#3440 (fase 1/2), #3480 (fase 2/2)"
status: "Fase 1/2 na PR #3440: `docs/architecture/video-delivery.md` com o fan-out que já existe, o caminho de escala (origem mais réplicas de leitura) e a decisão da CDN com os números que a reabrem; `RNF-CAM-20` no módulo Câmeras. Fase 2/2 na PR #3480: lease de espectador por câmera e perfil (UC-078, renumerada de UC-029 por colisão) - `GET /hls` devolve `leaseId`, o `DELETE` que o nomeia libera aquela lease, e a sessão só encerra quando a última sai; release repetido ou de lease nunca concedida virou no-op. Ponta a ponta nos sete gateways do `web-attlas`. Heartbeat de lease avaliado e recusado: quem expira o espectador sumido é o reaper (PROJ-007). `RNF-CAM-21` no módulo Câmeras."
sprint: "[[Attlas - Sprint 33]]"
estudo: "[[Analítico - Estudo de caso de captura, inferência e sincronização]]"
atualizado: 2026-09-14
---

# Entrega de vídeo - sessão compartilhada, réplicas e a pergunta da CDN

Contexto e fontes na seção 4 de
[[Analítico - Estudo de caso de captura, inferência e sincronização]].

## O que já existe e o que falta

O fan-out que o usuário pediu **já é o modelo do servidor**: o `ms-cameras` sobe um `ffmpeg` por
(câmera, qualidade, codec) que puxa a câmera com `-c copy` e publica no MediaMTX, e N espectadores
leem esse mesmo path por WHEP. O que falha é o modelo de **sessão** em volta: a sessão é por
espectador (`GET /hls`, `DELETE /hls`, `viewerCount`), o reaper decide pela contagem de leitores, e
cada espectador novo paga a negociação e o risco do churn.

## O que o card faz

- Sessão de stream passa a ser **por câmera e perfil**, com os espectadores só se anexando ao path
  existente; o `ms-cameras` mantém uma lease por path e o reaper trabalha sobre ela.
- Escala documentada do MediaMTX: **origem mais réplicas de leitura** atrás do balanceador do cluster
  (L7 com sessão fixa para WebRTC; `webrtcLocalUDPAddress` desligado e STUN nas réplicas), preparado
  no compose e no Helm para ligar quando os espectadores simultâneos passarem de umas centenas por
  cluster.
- Teste de carga: 50 espectadores WHEP num path, medindo CPU do MediaMTX e do `ms-cameras`.

## A decisão sobre CDN, registrada

**Não para o núcleo.** O Attlas roda num cluster por cliente, com câmeras e operadores na rede do
próprio cliente; uma borda pública adiciona salto, custo e dependência sem tocar no gargalo, que é
local (CPU do box e ciclo de vida de sessão). Cloudflare só entra se surgir o requisito de
espectador remoto pela internet, e aí com números claros:

- Stream com WHIP/WHEP: US$ 1 por mil minutos entregues, H.264 (não H.265), não aceita RTSP - seria
  uma publicação WHIP por câmera saindo do MediaMTX (GStreamer `whipsink`).
- Realtime SFU: US$ 0,05 por GB depois de 1 TB por mês.
- Exemplo: 11 tiles a 1,5 Mbps por operador são 7,4 GB por hora; dez operadores em oito horas por dia
  dão cerca de 18 TB por mês, na casa de US$ 900 mensais só de saída.

## Critério de aceite

Um path no MediaMTX por câmera e perfil independentemente do número de espectadores; 50 espectadores
WHEP no mesmo path sem degradar o primeiro; a decisão da CDN escrita no `docs/modules/cameras.md`
com as condições que a reabrem.
