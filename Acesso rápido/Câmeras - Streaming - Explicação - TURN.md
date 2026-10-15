---
tags:
  - doc
  - cameras
  - streaming
  - webrtc
  - turn
  - explicacao
aliases:
  - "Câmeras - Streaming - Explicação - TURN"
  - "O que é TURN"
  - "coturn"
atualizado: 2026-10-14
---

# Câmeras - Streaming - Explicação - TURN

Volta para [[Câmeras - Streaming - Arquitetura e estratégias]]

## Resposta curta

1. **TURN é um servidor que repassa o vídeo WebRTC** quando o navegador do operador não consegue receber direto do mediamtx.
2. **Sem ele, quem está atrás de rede que bloqueia UDP** (corporativa, hotel, 4G com NAT restritivo) não vê vídeo. Na rede do cliente ou com UDP liberado, o TURN não é usado.
3. **No Attlas o TURN é o `coturn`.** Ele roda no dev, mas hoje ninguém usa: o player abre o WebRTC sem servidor ICE (`iceServers: []` em `media-connection.ts`).
4. **Ligar para o público tem ordem:** primeiro autenticar o stream (WHEP com token), depois abrir as portas. Antes disso, quem tiver o UUID da câmera assiste sem login. Regra da spec CROSS-063, que ainda está em `draft`.

## Como funciona

| Caminho | Quando acontece | Banda no servidor |
|---|---|---|
| Direto (navegador e mediamtx, UDP 8189) | rede permite UDP; caso normal | só no mediamtx |
| STUN | navegador atrás de NAT descobre o próprio IP público e segue direto | quase zero no coturn |
| TURN relay UDP (3478) | NAT ou firewall impede o direto | todo o vídeo passa pelo coturn |
| TURN sobre TLS (5349) | rede só libera TCP | todo o vídeo passa pelo coturn, com mais latência |

O navegador tenta os caminhos nessa ordem e usa o primeiro que conecta (ICE). TURN é o último recurso.

## Peças no Attlas

| Peça | Papel |
|---|---|
| `coturn` (`coturn/coturn:4.6.2`, `network_mode: host`) | servidor STUN e TURN |
| `docker/turnserver.conf` | config versionada, sem segredo: portas, faixa de relay 49160 a 49200, cota de 40 sessões, 6 Mbps por sessão |
| `MTX_WEBRTCICESERVERS2` no mediamtx | lista de STUN e TURN que o mediamtx entrega ao navegador |
| Player (`media-connection.ts`) | precisa usar os servidores ICE da resposta WHEP; hoje não usa |

## Estado atual

| Ambiente | Situação |
|---|---|
| dev (EC2) | `attlas-coturn` rodando, escutando 3478 só no IP do Tailscale; não exposto ao público |
| Quito | não instalado; guia em [[Câmeras - Streaming - Runbook - TURN coturn em Quito]] |

> [!warning] Antes de ligar
> - Player não lê servidores ICE: TURN configurado não chega ao navegador.
> - `turnserver.conf` nega peers em redes privadas (10/8, 172.16/12, 100.64/10); o relay pode não alcançar o mediamtx.
> - Cota de 40 sessões a ~1,3 Mbps cada: um coturn atende poucos operadores remotos com grid grande.
> Lista em [[Câmeras - Streaming - Pendências]].

## Glossário

| Termo | Significado |
|---|---|
| ICE | Processo do WebRTC que testa caminhos e escolhe o primeiro que funciona |
| STUN | Pergunta ao servidor "qual meu IP público"; não repassa vídeo |
| TURN | Servidor que repassa o vídeo inteiro quando não há caminho direto |
| WHEP | HTTP que inicia a sessão WebRTC entre navegador e mediamtx |
