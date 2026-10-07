---
id: S36-07
tags:
  - attlas
  - task
  - sprint-36
  - cameras
  - streaming
  - codec
titulo: "[Full] Consumir o AV1 nativo da câmera no ao vivo, com sonda de codec, teto MBR e fallback H.264"
frente: Streaming
pr: "#5879"
status: "Feita. #5879 mergeada em 05/10 às 15h38, com o AV1 atrás de flag desligada por padrão."
sprint: "[[Attlas - Sprint 36]]"
atualizado: 2026-10-07
---

# S36-07 - Câmeras - Streaming - AV1 nativo da câmera no ao vivo

## O que estava errado

A AXIS P1475-LE tem encoder AV1 nativo, e o Attlas só servia H.264 e H.265. A montagem de URL da Axis pedia
banda por um parâmetro que a câmera ignora, e o perfil TERTIARY pedia 720x480, resolução que essa câmera
não tem.

## O que a PR entregou

- AV1 repassado como a câmera codifica, por WebRTC e LL-HLS, sem codificação no backend.
- Ordem de preferência AV1, H.265 e H.264. O player detecta se decodifica AV1 com fluidez, e acima de
  quatro sessões AV1 em software por aba pede H.264.
- A sonda VAPIX grava os codecs que a câmera declara, e câmera sem AV1 serve o próximo codec da lista.
- Teto de banda por MBR só no AV1, fallback para H.264 no mesmo erro em que o H.265 já caía, e TERTIARY em
  640x360.

Medido em 05/10 na câmera da bancada: AV1 1080p com teto de 4000 kbps a 3,58 Mbps, e AV1 720p com teto de
2000 kbps a 1,80 Mbps.

## Estado

Mergeada em 05/10, atrás de `STREAM_AV1_ENABLED`, desligada por padrão: com o MBR na URL a Axis leva cerca
de 12 s para responder o RTSP, contra 1,3 s sem ele, e o media server dá timeout na fonte.

## Relacionado

- [[Câmeras - Streaming - Codecs]]
