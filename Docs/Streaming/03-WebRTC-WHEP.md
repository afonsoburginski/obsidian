---
tags:
  - doc
  - streaming
  - cameras
  - webrtc
---

# 03 - WebRTC (WHEP)

Volta para [[00 - Indice]].

WebRTC é o caminho **primário**, escolhido pela latência sub-segundo, que é o que operação ao
vivo e PTZ precisam. WHEP (WebRTC-HTTP Egress Protocol) é só o jeito padronizado de iniciar a
sessão: o navegador faz um POST com sua oferta SDP e recebe a resposta do mediamtx.

## Como a conexão é montada

`camera-stream-player.component.ts`, método `initWhep`.

1. O navegador cria um `RTCPeerConnection` com **apenas STUN público**
   (`stun:stun.l.google.com:19302`), sem TURN.
2. Adiciona um transceiver de vídeo `recvonly` e cria a oferta SDP.
3. O mediamtx **não suporta Trickle ICE**, então o player espera o ICE gathering terminar
   (junta todos os candidatos locais) antes de mandar a oferta, com timeout de 3s.
4. POST da oferta para a URL `/whep`, recebe a resposta SDP, aplica como remote description.
5. Quando a faixa de vídeo chega (`ontrack`), liga no elemento de vídeo e marca como tocando.

URL montada pelo backend:

```
http://<mediamtx-webrtc>/<cameraId>-<quality>/whep
```

## Onde o vídeo de fato trafega

A negociação acima é HTTP na porta 8889. Mas o **vídeo em si trafega por UDP na porta 8189**
(`webrtcLocalUDPAddress` no mediamtx), direto entre navegador e mediamtx via ICE. É esse
caminho UDP que é frágil, ver mais abaixo.

## Tratamento de queda

`oniceconnectionstatechange`:

- `failed` ou `closed`: cai para o HLS na hora (`onWhepFailure`).
- `disconnected`: o Chrome pode ficar 30s nesse estado antes de virar `failed`. O player
  encurta isso: se continuar `disconnected` por 3s, já força a queda para o HLS. Útil quando
  o servidor fecha a sessão (ex. ffmpeg reconectando).

A queda para o HLS acontece **uma vez**. Depois disso, nova falha é terminal e o player mostra
erro com botão de retry.

## Limitações desta montagem (relevantes para o travamento)

- **Sem TURN.** Só STUN público. STUN só descobre o endereço público; não retransmite mídia.
  Quando não há rota UDP direta possível, não há relay de reserva. Sem TURN também não há
  fallback para mídia sobre TCP.
- **Porta UDP de mídia (8189) bloqueada fora da Tailscale** no ambiente de dev (regra do
  Security Group na AWS). Quem não está na Tailscale nem conecta o WebRTC e já cai no HLS.
  Quem está na Tailscale conecta, mas a mídia vai por um túnel WireGuard, que tem
  particularidades de MTU.
- **Sem buffer e sem retransmissão.** É a natureza do tempo real: pacote perdido é pacote
  perdido. Não há o que reenviar dentro da janela útil, nem buffer para segurar enquanto isso.
- **ffmpeg em modo copy não gera keyframe sob demanda.** Quando há perda, o mediamtx pede um
  keyframe (PLI) ao publisher, mas o ffmpeg em copy só repassa o que a câmera mandar. Então a
  imagem só desentrava quando chega o próximo keyframe agendado da câmera.

Essas quatro coisas juntas são a causa raiz do travamento. O detalhamento e como medir estão
em [[04-Diagnostico-travamento-WebRTC]].

## Por que ainda assim WebRTC é o primário

Latência. HLS tem segundos de atraso por causa da segmentação e do buffer. Para acompanhar
trânsito ao vivo e controlar PTZ com resposta imediata, esse atraso é inaceitável. O WebRTC
entrega sub-segundo. A estratégia certa não é abandonar o WebRTC, é tornar o caminho de mídia
robusto (TURN, GOP curto, recuperação de perda).
