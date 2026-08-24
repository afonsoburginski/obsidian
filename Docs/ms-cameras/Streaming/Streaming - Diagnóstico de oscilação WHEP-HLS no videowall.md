---
tags:
  - doc
  - ms-cameras
  - cameras
  - diagnostico
  - streaming
  - webrtc
  - videowall
aliases:
  - "Diagnóstico de oscilação WHEP-HLS no videowall"
atualizado: 2026-08-24
---

# Streaming - Diagnóstico de oscilação WHEP↔HLS no videowall

Volta para [[Streaming]]. Contexto: [[Streaming - WebRTC e WHEP]], [[Streaming - Diagnóstico de travamento no WebRTC]], [[Streaming - Estratégias de entrega]].

> Achado ao vivo em 24/08, reproduzido no EC2 dev rodando (câmera `...001022`, quality `SECONDARY`): o player do videowall fica preso alternando entre tentar WebRTC (`whep`) e cair pra HLS, sem nunca estabilizar. Ligado à [[Incidentes - Streaming (ms-cameras)]] (saturação de banda) - o próprio loop de reconexão pode ser um dos amplificadores do tráfego que satura a rede.

## O sintoma

No DevTools do videowall (grade 3x3, "9/9" em exibição): chamadas `whep` (POST, 201) intercaladas com `hls?quality=SECONDARY&codec=h265` / `hls?quality=tertiary&codec=h265` (XHR, 204/304), repetindo em ciclo de poucos segundos, indefinidamente, sem o player nunca "resolver" numa fonte estável.

## Confirmado ao vivo no EC2 dev (não é só leitura de código)

No host rodando agora (`aws-attlas-26`, container `attlas-mediamtx`), a câmera `00000000-0000-4000-8000-000000001022`, qualidade `SECONDARY`, estava presa neste exato loop:

- **204 tentativas de sessão WebRTC em 20 minutos** (17:48-18:08 UTC), TODAS fechando na hora com `no stream is available on path '00000000-0000-4000-8000-000000001022-secondary'` - uma sessão nova a cada ~5-6 segundos, sem parar.
- Nenhum processo `ffmpeg` rodando pra essa câmera (`ps aux` vazio) e nenhum path ativo no mediamtx (`/v3/paths/list` sem essa entrada) - ou seja, o relay que alimentaria o WebRTC **não existe mais**.
- O log do `ms-cameras` explica por quê: `StreamSessionReaperService` reapou a sessão (`"Reaping orphan session 00000000-0000-4000-8000-000000001022:SECONDARY: 0 readers no mediamtx por 25s"`) - o reaper (PROJ-007, SOFTWARE-2003 Fase 1) está funcionando exatamente como projetado, matando o relay órfão depois de ~20s sem readers (`STREAM_REAPER_ZERO_READER_GRACE_MS`).
- **O bug não é o reaper.** É o cliente: depois que o reaper mata o relay, o player continua batendo direto no endpoint `whep` do mediamtx (sem passar pelo `ms-cameras`) pra sempre, nunca pede pro backend religar o stream, e nunca desiste/back-off. Resultado: um loop morto e permanente pra essa câmera/qualidade enquanto a página do videowall ficar aberta.

## Causa raiz (mecanismo, achado no código)

Não é uma corrida única - é uma **ressonância entre dois mecanismos de recuperação independentes, sem estado compartilhado**, em `apps/web-attlas`:

1. **`MediaConnection`** (`core/shared/components/camera-stream-player/media-connection.ts`) - `load()` sempre tenta WHEP primeiro e zera `hlsFallbackTried` a cada chamada (linha ~157-185); `onWhepFailure()` cai pra HLS só uma vez por `load()` (linha ~283); não existe nenhum backoff/memória de "WHEP acabou de falhar aqui" entre chamadas de `load()`.
2. **`VideowallStreamSessionStore`** (`modules/videowall/pages/videowall/videowall-stream-session.store.ts`) - o monitor de saúde do player (`camera-stream-player.component.ts`, `startHealthMonitor`/`sampleHealth`) amostra a cada 2,5s e já considera "struggling" depois de só ~5s (2 ticks), **sem warm-up** após uma reconexão; isso dispara `adaptiveDowngrade`/`adaptiveUpgrade`, que abre **uma sessão nova** (`switchTo()`) com uma URL WHEP nova.
3. Como a conexão já está em HLS (`isHls === true`) quando o passo adaptativo chega, `switchSource()` não consegue fazer troca "seamless" (exige `!isHls`) e cai em `load()` puro - reabrindo WHEP do zero, sem lembrar que acabou de falhar.

O ciclo: WHEP falha (ICE não fecha) → 8-10s de watchdog → cai pra HLS → monitor de saúde sem warm-up lê a reconexão como "struggling" ou depois "smooth" → dispara passo adaptativo → sessão nova força `load()` → WHEP de novo → repete. Os tempos batem exatamente com o padrão visto no Network tab (várias chamadas `whep` em poucos segundos, intercaladas com HLS).

Específico do **videowall**: `camera-detail.page.ts` nunca liga `adaptiveDowngrade`/`adaptiveUpgrade` a nada; só `videowall.page.ts` faz isso via `sessions.adaptiveDowngrade/adaptiveUpgrade`. Fora do videowall (visualização de uma câmera só) o sintoma não deveria aparecer.

## Por que isso pode estar alimentando a saturação de banda

Ver [[Incidentes - Streaming (ms-cameras)]] (seção "Infraestrutura + ms-cameras - saturação de banda"): no episódio de 11:50-12:15 UTC de 24/08, o mediamtx registrou **1062 eventos de sessão em 35 minutos** e **130 sessões WebRTC do mesmo cliente**. Parte relevante desse volume pode não ser "várias câmeras sendo abertas uma vez" - pode ser este mesmo loop de reconexão rodando em paralelo em várias tiles do videowall ao mesmo tempo, cada uma reabrindo WHEP a cada poucos segundos. Os dois problemas se alimentam: rede degradada faz WHEP falhar mais → loop de reconexão gera mais tráfego de sessão → mais carga na mesma interface → rede degrada mais.

## Correções candidatas (não implementadas, só diagnóstico)

- [ ] Dar ao `MediaConnection` memória de "WHEP falhou recentemente para esta câmera/qualidade" com backoff exponencial, independente de quem chama `load()`.
- [ ] Dar um período de warm-up ao monitor de saúde do player depois de qualquer transição para `playing` (hoje só existe timer pro handoff, não pro monitor de saúde em si).
- [ ] Permitir troca de tier "seamless" mesmo vindo de HLS quando o motivo é o stepper adaptativo (não forçar reabrir WHEP se a rede acabou de provar que WHEP não fecha).
- [ ] Fechar a sessão WHEP explicitamente no teardown (capturar o header `Location` da resposta e mandar `DELETE`), em vez de depender só do timeout de ICE do mediamtx - hoje o cliente nunca faz isso (`destroyPc()` só fecha o `RTCPeerConnection` local).

## Ligado a

- [[Incidentes - Streaming (ms-cameras)]] - possível amplificador do episódio de saturação de banda de 24/08.
- [[Streaming - Saturação de banda de saída sob carga concorrente]] - task sem prazo que relaciona os dois achados.
- [[Streaming - Diagnóstico de travamento no WebRTC]] - diagnóstico irmão (perda de pacote/travamento uma vez que o WebRTC já está conectado; este aqui é sobre nunca conseguir ficar conectado).
- `apps/ms-cameras/docs/atomic/PROJ-007-stream-session-reaper.md` - o reaper que está funcionando certo (não é a causa).
- `apps/web-attlas/docs/modules/cameras/atomic/UF-020-camera-detail-primary-stream.md` - doc do player, desatualizada (anterior ao watchdog de fallback e ao stepper adaptativo).
