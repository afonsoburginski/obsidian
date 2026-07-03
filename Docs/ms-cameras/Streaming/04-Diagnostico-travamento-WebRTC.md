---
tags:
  - doc
  - streaming
  - cameras
  - webrtc
  - diagnostico
---

# 04 - Diagnóstico do travamento no WebRTC

Volta para [[00 - Streaming]]. Contexto: [[03-WebRTC-WHEP]] e [[02-HLS]].

PR de investigação: `#566` (cameras/fix/SOFTWARE-1889), em andamento, instrumentação read-only.

> **Validado no ambiente de dev (EC2 + API do mediamtx, câmera ...001030).** Confirmado:
> o WebRTC NÃO reprocessa vídeo (ffmpeg `-c copy`, H264 direto da Axis, mediamtx só
> repacketiza). Ingest impecável (zero frames em erro em ~10 GB). O GOP é curto, keyframe
> a cada 0,5s, então a recuperação por keyframe é rápida e o sintoma é perda CONTÍNUA no
> egress UDP, e não GOP longo. Os dois grandes amplificadores dessa perda no ambiente são:
> (1) o box de dev sobrecarregado, load 20 em 8 vCPU, que faz o emissor de tempo real
> descartar pacote, e (2) o mediamtx sem TURN e sem hosts ICE adicionais, com a mídia só na
> rota UDP crua via Tailscale. Ou seja, o travamento é de ambiente e configuração, corrigível
> sem transcodificar. A seção 4 abaixo (recuperação por GOP) descreve o mecanismo geral; aqui
> o GOP curto já não é o gargalo.

## O sintoma

A imagem trava por alguns segundos e depois volta de uma vez, de forma frequente, **só no
WebRTC**. No HLS puro o mesmo vídeo não trava. Esse contraste é a peça mais importante do
diagnóstico, e não um detalhe.

## O raciocínio que isola a causa

O mesmo vídeo entra **uma única vez** via RTSP no mediamtx e sai por dois caminhos: WebRTC e
HLS. A câmera, a rede até o servidor e o ffmpeg são **comuns aos dois caminhos**.

Logo, se o travamento aparece em um caminho mas não no outro, a causa **não pode** estar na
parte comum (câmera ou ffmpeg). Se estivesse, o HLS travaria junto. A causa está
necessariamente no que é exclusivo do caminho que trava: o **transporte de saída do WebRTC**.

Isso já elimina metade das hipóteses sem precisar medir nada.

## A causa raiz

O travamento é a combinação de quatro fatos, todos do lado WebRTC:

1. **Mídia por UDP, sem retransmissão.** O vídeo do WebRTC trafega por UDP (porta 8189).
   Pacote perdido não é reenviado a tempo. No HLS, que é TCP, o pacote perdido é retransmitido
   e o player nunca vê a perda.

2. **Sem buffer.** WebRTC é tempo real, o player segura quase nada. O HLS segura vários
   segundos (`maxBufferLength: 60`, `liveSyncDurationCount: 3`), o que absorve qualquer atraso
   ou perda pontual.

3. **Perda corrompe o quadro de referência.** Vídeo H.264/H.265 é feito de keyframes
   (completos) e quadros intermediários (que só descrevem a diferença em relação aos
   anteriores). Quando um pacote de um quadro de referência se perde, todos os quadros
   seguintes que dependem dele ficam corrompidos. A imagem congela.

4. **A recuperação demora um GOP inteiro.** O decoder só consegue se recuperar no próximo
   keyframe. O mediamtx até pede um keyframe ao publisher (PLI) quando detecta perda, mas o
   **ffmpeg roda em modo copy e não gera keyframe sob demanda**, só repassa o que a câmera
   mandar. Então o tempo de tela travada é igual ao tempo até o próximo keyframe agendado, ou
   seja, o tamanho do GOP da câmera. Câmera com GOP de 2s trava 2s, GOP de 4s trava 4s. Isso
   explica o "trava e volta de uma vez" do sintoma.

Resumindo numa frase: **perda de pacote no caminho UDP do WebRTC, que o HLS esconde com TCP e
buffer, mas que no WebRTC congela a imagem até o próximo keyframe porque não há retransmissão,
nem buffer, nem keyframe sob demanda.**

## O que agrava o caminho de mídia

- **Sem servidor TURN, só STUN público.** Não há relay de reserva nem fallback de mídia sobre
  TCP quando a rota UDP é ruim.
- **Porta UDP de mídia (8189) bloqueada fora da Tailscale** no dev. Quem conecta, conecta por
  um túnel WireGuard, que reduz a MTU. Pacote de mídia dimensionado para MTU de 1500 pode ser
  fragmentado ou descartado no túnel, gerando exatamente a perda que congela a imagem.

## Como medir e confirmar (PR 566)

A instrumentação é read-only e não muda o comportamento do pipeline. Serve para transformar o
raciocínio acima em números e apontar de que lado vem a perda.

1. **Endpoint `GET /api/cameras/:id/stream-diagnostics?quality=PRIMARY`**
   (`stream-diagnostics.service.ts`). Consolida a visão server-side:
   - `ingest`: lado RTSP do mediamtx, `bytesReceived` deve subir suave e contínuo.
   - `webrtc.sessions[]`: lado de saída por sessão, com `bytesSent`, candidatos ICE local e
     remoto, e estado da conexão.
   - `session`: visão do próprio `ms-cameras` (status, codec, espectadores, tentativas de
     reconexão).

2. **Métricas Prometheus do mediamtx na porta 9998** (`metrics: yes` no `mediamtx.yml`).
   Expõem por sessão WebRTC os pacotes RTP enviados, NACK e PLI (pedidos de keyframe).

3. **`getStats()` no navegador**, do outro lado da conexão: `packetsLost`, `freezeCount`,
   `pliCount`, `framesDecoded`.

### Leitura esperada se a hipótese estiver certa

- `ingest.bytesReceived` sobe suave e sem buracos (a câmera e o ffmpeg estão saudáveis).
- No navegador, `packetsLost` sobe, `freezeCount` sobe, e `framesDecoded` fica parado por
  cerca de um GOP a cada travada, enquanto `pliCount` sobe (o cliente pediu keyframe).

Esse padrão fixa a perda no **egress / transporte UDP**, e não na origem. Se em vez disso o
`ingest.bytesReceived` tivesse buracos, a perda estaria antes do mediamtx (câmera ou RTSP), e
o HLS também travaria. Não é o caso.

## Direções de correção (depois de medir)

Não implementadas ainda, ficam para a mitigação:

- **GOP curto e fixo** para todas as câmeras (não só Axis), reduzindo o tempo de recuperação.
  Onde a câmera não permite, considerar transcodificar com keyframe frequente, abrindo mão de
  parte do custo zero de CPU do modo copy.
- **Servidor TURN** para ter relay e fallback de mídia sobre TCP em redes ruins.
- **Ajuste de MTU / payload do WebRTC** para o caminho via Tailscale, evitando fragmentação.
- Liberar a porta UDP de mídia onde fizer sentido, para não depender só da Tailscale.

## Em uma linha para o report

O travamento é perda de pacote no transporte UDP de saída do WebRTC, que o HLS esconde com
TCP e buffer; sem retransmissão, sem buffer e sem keyframe sob demanda (ffmpeg em copy), a
imagem fica congelada até o próximo keyframe da câmera. O PR 566 instrumenta para confirmar os
números antes de corrigir.
