# Estratégia adaptativa de codec/protocolo/qualidade - pesquisa (2026)

Pesquisa a fundo (104 agentes, 22 fontes, 25 afirmações verificadas de forma adversarial:
20 confirmadas, 5 refutadas) sobre servir o melhor codec/protocolo/qualidade automaticamente
num player web de videowall ao vivo, estilo YouTube, para o stack Attlas (mediamtx + ffmpeg
relay + player Angular).

## Veredito curto

O caminho é **WebRTC/WHEP-first com H.264 como base universal de passthrough e H.265/HEVC
usado de forma OPORTUNÍSTICA por cliente** - que é essencialmente o stack que o Attlas já roda.
H.265 e AV1 NÃO substituem o H.264 no player; eles complementam onde o cliente decoda. A peça
que falta é a **negociação automática em runtime** + as **3 tiers vindo de substreams nativos
da câmera** (não de transcode no servidor).

## Status: IMPLEMENTADO (2026-07-07, PR #656)

A peça que faltava (negociação automática em runtime) foi implementada como INT-008, em cima da
base que já existia (WHEP-first, ladder de resolução por substream). O que foi entregue:

- **Cliente** (`StreamCodecService`, web-attlas): sonda `MediaCapabilities.decodingInfo` (webrtc +
  media-source) e `RTCRtpReceiver.getCapabilities`; só pede H265 quando `supported && smooth &&
  powerEfficient`. Cacheado por carga. Os 3 hosts (videowall, camera-detail, side-detail) abrem a
  sessão com o codec negociado.
- **Backend** (ms-cameras): sessão/relay chaveada por `(cameraId, quality, codec)` — H264 e H265
  coexistem, path mediamtx `<cameraId>-<quality>[-h265]`; o resolver injeta `videocodec` por request
  com fallback H264 no mesmo path. Regra de ouro mantida: detectar, nunca assumir, sempre com H264.
- Specs: `apps/ms-cameras/docs/atomic/INT-008-codec-negotiation.md` e `MOD-004` (§13).
- As 3 tiers por substream nativo (Axis `resolution=`, Hikvision canal) já estavam no F3.

O que fica de fora (coerente com o veredito): AV1 no caminho ao vivo (WHEP não negocia AV1) e
transcode no servidor (mediamtx é passthrough).

## Matriz de decode nos browsers (verificado)

- **H.264**: único universal (~99.9%, obrigatório em WebRTC por RFC 7742). É a base, sempre.
- **H.265/HEVC**: **hardware-gated em todo lugar, sem fallback de software.**
  - **Novidade importante (refuta o senso comum)**: HEVC **agora negocia em WebRTC** - Chrome
    136+ (2025) habilitou por padrão em desktop/Android/WebView - MAS só com decode por hardware.
  - Em HLS/fMP4: Safari nativo; Chrome/Edge com HW (Edge/Firefox no Windows exigem a extensão HEVC da MS).
  - Ou seja: H.265 no player é real, mas **detectar-então-usar, nunca assumir**.
- **AV1**: decode quase universal em desktop Chrome/Edge/Firefox (software dav1d, ~91% das sessões),
  mas Safari só com hardware (M3+/iPhone 15 Pro+). **AV1 NÃO existe em WebRTC** (WHIP/WHEP do
  Cloudflare = VP9/VP8/H264). AV1 é caminho de VOD/HLS, não de ao vivo.

## Detecção automática (como fazer)

- **`MediaCapabilities.decodingInfo({ type })`** com `type` = `'webrtc'` | `'media-source'` | `'file'`
  → sonda o caminho WebRTC SEPARADAMENTE do HLS/MSE (é exatamente a divergência crítica). Retorna
  `{ supported, smooth, powerEfficient }` - dá pra rejeitar config que dropa frame ou drena bateria.
- **`RTCRtpReceiver.getCapabilities('video')`** → codecs recebíveis antes da negociação SDP.
- **Padrão**: iterar do mais preferido pro menos (ex.: H265 1080p → ... → H264), parar no primeiro
  `smooth && powerEfficient`. Ambas as APIs reportam suporte PROVÁVEL, não garantia → **sempre manter
  fallback H.264**. (`hls.js` é MSE, então `'media-source'` é o proxy correto pro caminho HLS.)

## Restrição dura: mediamtx NÃO transcoda

mediamtx é **proxy/conversor de protocolo, não transcoder** (passthrough `-c copy`). Ele NÃO gera
as 3 renditions nem converte H265→H264. Isso exige:
- **ffmpeg/GStreamer por stream** (custo de CPU que briga com a escala de muitas tiles), OU
- **substreams nativos da câmera** (Axis VAPIX `resolution=` / Hikvision canais 101/102) - **o
  caminho mais barato de ABR, e é o que o resolver do Attlas JÁ faz**.

## WASM HEVC: descartado

Decoder HEVC em WASM não sustenta tempo real num videowall multi-tile (1 stream 1080p ~2.5x
realtime no Apple Silicon; congela em CPU fraca). Usar HW decode ou cair pro H.264 - nunca WASM.

## Protocolo: WebRTC vs LL-HLS

WebRTC/WHEP ganha pra sub-segundo (~500ms medido num estudo 2026 sobre EXATAMENTE o stack
RTSP→mediamtx→WHEP; HLS puro 6-18s, LL-HLS 2-5s). WebRTC primário, **LL-HLS como fallback**
(já implementado). Selecionar por cliente: WebRTC se conecta e decoda; senão LL-HLS.

## O que YouTube/Twitch realmente fazem

Não usam H265 na entrega web (royalties + suporte). Twitch Enhanced Broadcasting = H.264 + HEVC
no ingest, **não AV1** ("hyper-conscious de compatibilidade de device"). YouTube = VP9/AV1 no VOD.
Calibra a expectativa: **H.265 é ganho de eficiência oportunístico, não o codec único do player.**

## Arquitetura recomendada pro Attlas

1. **Base**: manter WebRTC/WHEP-first + H.264 passthrough universal (o que já existe).
2. **Negociação de codec (novo)**: no player, `decodingInfo(type:'webrtc')` + `getCapabilities()`
   → se HEVC com HW disponível (Chrome 136+ HW, Safari), pedir H265 no WHEP; senão H.264. Fallback
   H.264 sempre. O backend precisa expor a variante H265 do relay (a câmera já entrega H265).
3. **ABR das 3 tiers (novo, barato)**: via **substreams nativos da câmera** (o resolver já mapeia
   qualidade→resolução VAPIX/canal Hikvision). NÃO transcodar no servidor. Troca de tier client-driven
   entre paths/sessões do mediamtx (mediamtx não faz simulcast/SVC numa sessão só - a confirmar).
4. **AV1**: fora do caminho ao vivo.
5. **Protocolo**: WebRTC primário, LL-HLS fallback (já feito).

### Plano faseado
- **F1 - Detecção**: implementar a sonda de capacidade no player (decodingInfo/getCapabilities),
  logar o que cada cliente suporta. Sem mudar entrega ainda (observabilidade).
- **F2 - Codec negotiation H264/H265**: backend expõe relay H265 por câmera (passthrough, a câmera
  já entrega); player pede H265 quando `smooth && powerEfficient`, senão H264. Fallback robusto.
- **F3 - ABR por substream**: formalizar as 3 tiers como substreams nativos; troca client-driven por
  saúde do stream (já existe a base adaptativa 720p↔480p).
- **F4 (opcional)**: LL-HLS+HEVC pra Safari; AV1 só se houver caminho de VOD.

## Riscos / o que NÃO fazer

- NÃO assumir H265 (hardware-gated) - sempre detectar + fallback H264.
- NÃO transcodar no servidor pra ABR (mata a escala) - usar substream da câmera.
- NÃO usar WASM HEVC num videowall.
- NÃO colocar AV1 no caminho ao vivo (não existe em WebRTC; sem ganho de latência).

## Perguntas em aberto (a validar na implementação)

1. Safari negocia/decoda HEVC **em WebRTC** (não só HLS)? Confirmado Chrome 136+; Safari/WHEP em aberto.
2. Custo real de CPU de um transcode H265→H264 por stream no host do ms-cameras (se precisar) - quantas
   tiles um nó aguenta. Número que dimensiona o videowall.
3. Axis/Hikvision emitem múltiplos substreams nativos pras 3 tiers (evita transcode no servidor)?
4. mediamtx suporta simulcast/SVC numa sessão WHEP, ou a troca de rendition é client-driven entre paths?

## Refutado (não confiar)

"AV1+HEVC cobre 99.73%", "HEVC só Safari", "HEVC incompatível com WebRTC", "AV1 CPU encode inviável
30min/2s", "WASM HEVC 60fps realtime". (A landscape muda rápido - revalidar a matriz na implementação.)

## Fontes principais

MDN (Video_codecs, decodingInfo, getCapabilities), chromestatus 5153479456456704 (HEVC WebRTC
Chrome 136), W3C Media Capabilities, mediamtx README, MDPI Computers 15(1):62 (2026, stack
RTSP→mediamtx→WHEP ~500ms), Cloudflare Stream AV1 blog, privaloops/hevc.js, RFC 7742.
