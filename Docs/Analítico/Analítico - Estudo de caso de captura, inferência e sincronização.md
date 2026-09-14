---
tags:
  - doc
  - analitico
  - arquitetura
  - estudo
aliases:
  - "Estudo de caso do analítico servidor"
  - "Arquitetura de captura, inferência e sincronização"
servico: ms-video-analytics, ms-cameras (streaming e analytics-ingestion), web-attlas (analytics-detection)
fonte: medição no EC2 de desenvolvimento em 14/09 (docker stats, docker top, API do MediaMTX, lscpu), leitura do código na develop pós #3328, e a documentação externa listada no fim
atualizado: 2026-09-14
---

# Analítico - Estudo de caso de captura, inferência e sincronização

Este estudo responde a uma pergunta do usuário feita em 14/09: por que o vídeo e o analítico servidor
travam na `ATM-PTZ`, e qual é a arquitetura que gasta menos recurso, detecta bem e põe a caixa no
lugar certo na tela. A resposta tem três camadas - captura, inferência e sincronização - e uma
conclusão que atravessa as três: **hoje o analítico gasta CPU no lugar errado, e a sincronização
está tentando adivinhar um relógio que a câmera já entrega pronto.**

## 1. O que está acontecendo, medido

Box de desenvolvimento em 14/09, com `ATMN – DEMO` (laço virtual) e `ATM-PTZ` (ATSPM) ingeridas em
modo servidor:

| Medida | Valor |
| --- | --- |
| Instância | **t3a.2xlarge** (`i-06e8f8cf75102367e`, us-east-2c): 8 vCPU = 4 núcleos físicos com SMT, AMD EPYC 7571 (Zen 1), só AVX2 - sem AVX-512, sem VNNI; família **burstable** (baseline 40% por vCPU) |
| Carga do host | 15,98 / 14,97 / 14,35 |
| `attlas-ms-video-analytics` | **580% de CPU** (quase 6 dos 8 vCPU), 374 MiB |
| dentro dele: `node main.js` | **581%** |
| dentro dele: `ffmpeg` da PTZ e da DEMO | **1,9% e 1,6%** |
| `attlas-ms-cameras` | 25% |
| `attlas-mediamtx` | 13 a 21%, 154 MiB, zero reinícios, sem OOM |
| Path `analytic-<PTZ>` | 1280x720, H264 baseline, keyframe a cada 15, `rtspTransport: tcp`, `sourceOnDemand: false` |
| Inferência | 10 quadros por segundo por câmera (`VIRTUAL_LOOP_TARGET_FPS=10`), entrada do modelo 640x640, sessão ONNX criada **sem opções** |
| MediaMTX, últimas 2 h | dezenas de `reader is too slow, discarding N frames` no leitor RTSP do analítico (o `ffmpeg` dele não consegue drenar) e 419 `[API] path not found` vindos do `ms-cameras` |

Quatro conclusões saem direto da tabela:

1. **Decodificar é de graça; inferir é o custo.** Os dois `ffmpeg` somam 3,5%. Trocar o caminho do
   vídeo até o analítico não devolve CPU por si só - o que devolve é mudar como e quanto se infere.
2. **O analítico está afogando o resto do box.** Com 6 vCPU tomados por ele, o MediaMTX e o
   `ms-cameras` disputam o que sobra, e é isso que a tela sente como vídeo travando - inclusive na
   própria PTZ e nos tiles do videowall.
3. **A máquina é a errada para a carga.** Uma t3a é burstable: com 0% de idle o dia inteiro ela ou
   paga excedente em `unlimited` ou é estrangulada quando os créditos acabam - e o estrangulamento
   aparece como "trava do nada". Os 16 núcleos que se acreditava ter não existem: são 8 vCPU, todos
   online. A decisão está em [[Infra - a VM do EC2 é t3a.2xlarge, burstable, e não 16 núcleos]].
4. **O analítico está tão apertado que perde quadros do próprio alimento.** O `reader is too slow`
   é o MediaMTX descartando quadros porque o leitor (o `ffmpeg` do analítico, num container sem
   CPU livre) não os consome a tempo. A detecção fica irregular por causa disso, antes de qualquer
   problema de sincronização.

## 2. Por que a inferência custa isso

O modelo é um detector de objetos da família YOLO, treinado em COCO, com peso de 12,8 MB (porte de
YOLOv8n), executado pelo `onnxruntime-node` na CPU. Cada quadro passa por quatro etapas, e três delas
estão mal dimensionadas:

- **Pool de threads sem limite.** `InferenceSession.create(weight)` sem opções deixa o onnxruntime
  criar um pool intra-op do tamanho do host. Com as duas câmeras inferindo ao mesmo tempo são duas
  chamadas disputando os mesmos núcleos, e em Zen 1 com SMT o que se paga é troca de contexto. A
  documentação do runtime recomenda dimensionar o pool explicitamente quando há sessões ou chamadas
  concorrentes, e existe até pool global para evitar exatamente essa disputa.
- **Frequência alta demais.** Dez quadros por segundo por câmera são vinte inferências por segundo.
  O Frigate, que é a referência de detecção em CPU no mundo de NVR, usa **cinco** por padrão e
  documenta que subir disso "consome mais CPU sem ganho para o rastreamento". O analítico embarcado
  da própria linha amostra a cada 300 ms (3,3 por segundo) e a ocupação fecha.
- **Pré-processamento em JavaScript.** O `letterboxToTensor` monta um `Float32Array` de 640×640×3
  (1,2 milhão de floats) num laço no event loop, por quadro. O `ffmpeg` já escala para 640x360 e
  poderia entregar o quadro no formato final.
- **NMS quadrática e síncrona**, defendida só pelo teto de candidatos.

Duas saídas que parecem óbvias **não servem aqui**: OpenVINO (a CPU é AMD, e o binding Node do
onnxruntime não tem esse execution provider) e quantização INT8 como bala de prata (o ganho grande
depende de VNNI/AVX-512, que esta CPU não tem; em AVX2 puro o onnxruntime avisa de saturação e ganho
incerto - é para **medir**, não para assumir).

## 3. A arquitetura alvo

### 3.1 Captura: o analítico puxa direto da câmera, num perfil só dele

Hoje o `ms-cameras` cria no MediaMTX um path `analytic-<câmera>` que puxa o perfil SECONDARY da
câmera, e o `ffmpeg` do analítico lê desse path. O perfil SECONDARY da PTZ é 1280x720 a 25 fps: o
analítico recebe quatro vezes os pixels que vai usar e cinco vezes os quadros.

A decisão é que **o analítico puxa RTSP direto do equipamento, num perfil dedicado ao analítico**,
sem passar pelo MediaMTX:

- **Axis**: a própria URL escolhe o perfil, sem mexer na câmera:
  `rtsp://<ip>/axis-media/media.amp?resolution=640x360&fps=5&compression=30&videocodec=h264&videokeyframeinterval=5`.
  A câmera escala e limita o fps em hardware; o que chega ao `ffmpeg` já é o quadro do modelo.
- **Hikvision**: o terceiro stream (`/Streaming/Channels/103`; o ID é canal × 100 + tipo, 1 principal,
  2 sub, 3 terceiro) configurado via ISAPI para 640x360 a 5 fps, deixando o sub-stream para o VMS.
- O `CameraStreamSourceResolver` do `ms-cameras` já monta a URL direta da câmera com credencial e já
  entende que `/axis-media/media.amp` é "redimensionável por URL" (`DOWNSCALABLE_STREAM_PATHS`). A
  mudança é o `/internal/virtual-loop/sources` devolver essa URL de analítico no `streamUrl` em vez
  do relay, e o reconciler deixar de criar o path `analytic-*` - mantendo o relay como **fallback**
  para câmera que não aceite mais um cliente RTSP (o limite de clientes unicast é por modelo e não
  está documentado; conferir por câmera).
- O `ffmpeg` do analítico entrega o quadro **pronto para o modelo**: `-vf fps=5,scale=...:force_original_aspect_ratio=decrease,pad=W:H:(ow-iw)/2:(oh-ih)/2:color=#727272`, com
  `-fflags nobuffer -flags low_delay -rtsp_transport tcp`, e o JavaScript só normaliza.

O que se ganha: menos um salto de rede e de processo, quadro na resolução e no ritmo certos (o
decode cai ainda mais), o MediaMTX fica só para quem assiste, e - o mais importante para a seção 3.3 -
o analítico passa a receber os **RTCP Sender Reports da própria câmera**, que trazem o relógio NTP dela.

O MediaMTX continua indispensável para o VMS: uma publicação por câmera e N leitores WebRTC é
exatamente o fan-out que ele faz bem.

### 3.2 Inferência: um orçamento, não um default

- Sessão única compartilhada, criada com `intraOpNumThreads: 2`, `interOpNumThreads: 1`,
  `executionMode: 'sequential'`, `graphOptimizationLevel: 'all'`, e `cpus: 3.0` no compose para o
  serviço não poder afogar o MediaMTX e o `ms-cameras`. Com mais câmeras, escalar por shard
  (`VIRTUAL_LOOP_SHARD_COUNT` já existe), nunca por threads.
- `VIRTUAL_LOOP_TARGET_FPS` de 10 para **5**, medindo a ocupação do laço em 5 e em 3,3.
- Recorte pela região já existe (`cropFor`); com o recorte, a entrada do modelo pode cair para 416
  ou 320 sem perder o veículo - medir o mAP das classes de veículo nas duas câmeras antes de fixar.
- INT8 estático **só depois de medir** nesta CPU (AVX2 sem VNNI). Se a frota crescer ou o box mudar,
  uma instância com AVX-512 e VNNI (família c6i/c7i) ou GPU muda a conta e reabre a decisão.
- Detectar a 5 fps e **rastrear** entre detecções (o `iou-track-assigner` já existe; ByteTrack custa
  cerca de 0,4 ms por quadro) mantém a identidade dos objetos; a suavidade visual é trabalho do front,
  que já interpola.

Ordem de grandeza esperada nesta caixa: YOLOv8n a 640 em FP32 custa entre 100 e 150 ms por inferência
em 2 threads de Zen 1; a 5 fps por câmera são 10 inferências por segundo, cerca de 1 a 1,5 núcleo com
duas câmeras, e a metade disso a 416. Números a confirmar pela métrica `inferenceDuration` do próprio
serviço.

### 3.3 Sincronização: o mesmo relógio nas duas pontas, sem adivinhação

O que a #3328 faz hoje é estimar: o front lê o relógio do vídeo por `hls.playingDate` (HLS) ou por
`getStats` (WebRTC), que nesta máquina devolve `estimatedPlayoutTimestamp` **nulo** e cai em
`Date.now() - jitterBufferDelay - rtt/2`; do outro lado, os carimbos do device são traduzidos para o
relógio do navegador pelo menor atraso observado. Funciona razoavelmente e nunca vai ser exato,
porque os dois lados estão estimando.

O desenho correto usa o relógio que a câmera já publica:

1. **O analítico carimba cada quadro com o tempo de captura da câmera**, obtido dos RTCP Sender
   Reports do RTSP direto (par NTP + RTP; a especificação ONVIF obriga o equipamento a mandá-los, e
   Axis e Hikvision mandam). O `ffmpeg` não expõe isso por quadro no pipe de `rawvideo`, então a
   entrada é um spike com duas opções: GStreamer (`rtspsrc ntp-sync=true` entrega o PTS já no domínio
   NTP para um `appsink`) ou um cliente RTSP leve que leia os SR e mapeie o RTP timestamp de cada
   quadro. Axis ainda oferece a extensão de cabeçalho RTP com NTP por quadro (VAPIX ONVIF Replay
   Extension), que é o caminho mais preciso se estiver disponível no modelo.
2. **O MediaMTX repassa o relógio da câmera para o WebRTC** com `useAbsoluteTimestamp: true` no path
   do VMS: a documentação diz que assim ele preserva os timestamps absolutos da fonte e os envia em
   RTCP SR para o WebRTC, em vez de trocar pelo relógio do servidor (que é o default, e é o motivo de
   hoje o front não ter um relógio confiável).
3. **O navegador lê `captureTime` de cada quadro apresentado** em `requestVideoFrameCallback`: para
   fonte remota, a especificação define `captureTime` como o tempo de captura estimado pelo RTP
   timestamp mais a sincronização via RTCP SR - o mesmo par que o analítico usou. A cabeça do overlay
   vira `captureTime`, sem lead, sem skew, sem predição. `rtpTimestamp` fica como segundo plano caso o
   MediaMTX preserve o RTP timestamp da fonte (ele não transcodifica; é verificar).

Riscos declarados: o MediaMTX tem issue aberta (#5355) em que, com `useAbsoluteTimestamp` ligado e
uma fonte que não manda SR, ele descarta pacotes - o spike tem de provar com Axis e Hikvision antes de
ligar em produção. E tudo isso fica **restrito à tela de Detecção e aos paths do analítico**: o
player das outras telas não muda.

## 4. O videowall entra na mesma conta

O usuário reportou tiles pretos e vídeo travando no Monitoramento de Vídeo. O que a medição diz:

- **Não é o MediaMTX "cheio"**: 154 MiB, 13 a 21% de CPU, zero reinícios, sem OOM.
- O modelo de entrega já é um fan-out: o `ms-cameras` sobe **um** `ffmpeg` por (câmera, qualidade,
  codec) que puxa a câmera com `-c copy` e publica no MediaMTX; N espectadores leem por WHEP. Isto é
  o "reaproveitar a conexão como uma CDN" que o usuário pediu - já existe no servidor; o que falha é
  o ciclo de vida da sessão em volta dele.
- **Três causas prováveis, em ordem**: (1) o `StreamSessionReaperService` derruba a sessão com zero
  leitores por mais de um grace curto (13 `Reaping orphan session` em 2 h) e o WHEP seguinte acha
  path inexistente - os 419 `path not found` são esse churn; (2) variante **H265** servida ao
  navegador: Chrome só decodifica HEVC em WebRTC com hardware, sem decoder por software, então numa
  máquina sem GPU o tile fica preto; (3) a fome de CPU causada pelo analítico, que atrasa o MediaMTX e
  o `ms-cameras` para todo mundo.

E a pergunta da CDN, decidida: **não para o núcleo do produto.** O Attlas roda num cluster por
cliente, com câmeras e operadores na rede do próprio cliente; passar o vídeo por uma borda pública
adiciona salto, custo e dependência sem resolver o gargalo, que é local. Quando os espectadores
simultâneos passarem de umas centenas por cluster, o caminho documentado do MediaMTX é
**origem mais réplicas de leitura** atrás do balanceador do cluster (L7 com sessão fixa para WebRTC).
Cloudflare entra só se surgir o requisito de espectador remoto pela internet: Stream com
WHIP/WHEP cobra US$ 1 por mil minutos entregues, aceita H.264 (não H.265) e não aceita RTSP direto -
seria uma publicação WHIP por câmera saindo do MediaMTX; o Realtime SFU cobra US$ 0,05 por GB depois
de 1 TB. Um videowall de 11 tiles a 1,5 Mbps por operador são 7,4 GB por hora; dez operadores em oito
horas por dia dão cerca de 18 TB por mês, na casa de US$ 900 mensais só de saída.

## 5. O que vira PR

| Ordem | Task | O que prova |
| --- | --- | --- |
| 1 | [[Analítico servidor - orçamento de inferência na CPU]] | analítico abaixo de 200% com duas câmeras; carga do host abaixo de 8 |
| 2 | [[Analítico servidor - captura direta da câmera com perfil de analítico]] | `ffmpeg` recebendo 640x360 a 5 fps direto da câmera; PTZ com os dois analíticos pelo servidor |
| 3 | [[Detecção - sincronização exata da caixa com o vídeo]] | caixa presa ao `captureTime` do quadro, sem estimativa |
| 4 | [[VMS - tiles pretos e vídeo travando no videowall]] | 11 tiles de pé por 30 minutos sem tile preto |
| 5 | [[Entrega de vídeo - sessão compartilhada, réplicas e a pergunta da CDN]] | modelo de sessão por câmera e perfil, e a decisão da CDN registrada |

## Fontes

- Axis, Video streaming API (parâmetros `resolution`, `compression`, `streamprofile`, `camera`): https://developer.axis.com/vapix/network-video/video-streaming/
- Axis, RTSP Adjustable Live Stream (`fps`, `videokeyframeinterval`, `videomaxbitrate`, `videozstrength` ajustáveis em stream ativo): https://developer.axis.com/vapix/network-video/rtsp-adjustable-live-stream/
- Axis, ONVIF Replay Extension (extensão RTP com NTP por quadro): https://developer.axis.com/vapix/network-video/onvif-replay-extension/
- Hikvision ISAPI, `rtsp://<host>/ISAPI/Streaming/channels/<ID>` (ID = canal × 100 + tipo): http://enpinfo.hikvision.com/unzip/20201110210551_77443_doc/GUID-515FF2B5-5E01-4F03-8B81-4CA5BD621965.html
- ONVIF Streaming Specification (RTCP SR obrigatório, par NTP + RTP): https://www.onvif.org/specs/stream/ONVIF-Streaming-Spec.pdf
- ONNX Runtime, Thread management: https://onnxruntime.ai/docs/performance/tune-performance/threading.html
- ONNX Runtime, SessionOptions da API JavaScript: https://onnxruntime.ai/docs/api/js/interfaces/InferenceSession.SessionOptions.html
- ONNX Runtime, Quantization (estático para CNN; VNNI; saturação em AVX2): https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html
- ONNX Runtime, execution providers do binding Node (CPU, CUDA, TensorRT, DML, WebGPU; sem OpenVINO): https://onnxruntime.ai/docs/get-started/with-javascript/node.html
- Ultralytics, OpenVINO on CPU (só Intel; ganhos FP32/FP16/INT8): https://academy.ultralytics.com/courses/yolo-in-production/openvino-on-cpu
- Ultralytics, Track (ByteTrack, BoT-SORT): https://docs.ultralytics.com/modes/track
- Frigate, Camera setup e High CPU usage (5 fps por padrão; detectar no sub-stream): https://docs.frigate.video/frigate/camera_setup/ e https://docs.frigate.video/troubleshooting/cpu/
- WICG, `requestVideoFrameCallback` (`captureTime`, `receiveTime`, `rtpTimestamp`): https://wicg.github.io/video-rvfc/
- MDN, `HTMLVideoElement.requestVideoFrameCallback()`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback
- MediaMTX, Route absolute timestamps (`useAbsoluteTimestamp`): https://mediamtx.org/docs/features/absolute-timestamps
- MediaMTX, issue #5355 (SR não recebidos com `useAbsoluteTimestamp`): https://github.com/bluenviron/mediamtx/issues/5355
- MediaMTX, Scalability (origem e réplicas de leitura): https://mediamtx.org/docs/features/scalability
- MediaMTX, discussão #2119 (RTSP para WHIP da Cloudflare via GStreamer `whipsink`): https://github.com/bluenviron/mediamtx/discussions/2119
- Chrome, H265 em WebRTC (Chrome 136, só com decoder de hardware): https://chromestatus.com/feature/5153479456456704
- Cloudflare Stream, WebRTC WHIP/WHEP (codecs, latência, US$ 1 por mil minutos): https://developers.cloudflare.com/stream/webrtc-beta/
- Cloudflare Realtime SFU, preço (US$ 0,05 por GB após 1 TB): https://developers.cloudflare.com/realtime/sfu/pricing
