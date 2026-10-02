---
tags:
  - doc
  - ms-cameras
  - streaming
  - web-attlas
  - realce-de-imagem
aliases:
  - "Realce de imagem no cliente - Arquitetura e estratégias"
  - "Realce de imagem no cliente"
  - "Otimização de imagem no player"
  - "Pesquisa - realce de imagem no cliente"
  - "Pesquisa - melhoria de imagem e upscale"
  - "Streaming - Realce de imagem no cliente"
atualizado: 2026-10-01
---

# Câmeras - Streaming - Realce de imagem no cliente

Volta para [[Câmeras - Streaming]].

> [!important] Regra: realce de imagem é sempre client-side
> Todo realce, upscale, nitidez ou limpeza de imagem de câmera roda no navegador da estação do operador,
> nunca no servidor e nunca na câmera. O vídeo que atravessa a rede, o MediaMTX e o `ms-cameras` não muda.
> Tem de funcionar com GPU e também só com CPU (a estação de referência é um Intel Core 7 150U com o WebGL
> de hardware desligado).

> [!warning] Nada disto está na develop
> O desenho vive na PR #4280 (branch `cameras/feat/NO-CARD-client-video-enhancement`), aberta em draft, que
> **não deve ser mergeada**. Na develop não existem `apps/web-attlas/src/app/core/shared/video-enhancement/`,
> a spec `UF-044-camera-player-client-image-enhancement` (as `UF-044` da develop são de outros módulos) nem
> o RNF-CAM-22 em `docs/modules/cameras.md`, que vai até o RNF-CAM-21. Falta rodar a suíte do `web-attlas`
> e a validação A/B numa estação com GPU e numa só com CPU.

## Por que no cliente

- **No servidor custa desempenho sempre**: filtro exige decodificar, processar e recodificar cada stream,
  CPU ou GPU dedicada crescendo linear com a frota, latência somada no caminho que a INT-024 enxugou e mais
  banda. Contradiz o passthrough do MediaMTX e o ABR por substream. Servidor só faz sentido em gravação ou
  quadro exportado, sem tempo real e com o original ao lado.
- **Na câmera** é onde a imagem ganha informação de verdade (Imaging do ONVIF, WDR, bitrate do PRIMARY,
  substream certo para o tamanho do tile), mas é configuração de equipamento, não realce de player. O GOP
  e o FPS dinâmicos do Zipstream não são compatíveis com o GOP fixo de 300 ms.
- **Risco forense**: super-resolução por rede neural inventa detalhe plausível (placa com caractere errado
  e nítido). Filtro clássico com limite explícito só redistribui o que existe. A Microsoft desaconselha o
  VSR dela para prova legal ou forense.
- A ordem de passes que TVs e players adotam é limpar na resolução original, ampliar e dar nitidez por
  último.

## O que o operador vê

- Botão **Realçar imagem** na barra de controles de qualquer player ao vivo; é o primeiro a ir para o menu
  de mais opções quando a barra estreita. Com realce ativo, o badge ao vivo mostra "· Realce".
- Sem nenhum motor disponível, o botão não aparece; falta de realce nunca vira erro.
- Quando a estação não comporta, o realce se desliga sozinho e o tooltip diz "Realce pausado para preservar
  o desempenho".

## Arquitetura (na PR)

Módulo `apps/web-attlas/src/app/core/shared/video-enhancement/`, em camadas com dependência para dentro:

- **domain**, TypeScript puro: `FrameBudgetGovernor` (máquina de estados do nível), `resolveEnhancementPlan`,
  filtros de luma e limites em `constants/`.
- **application**: `VideoEnhancementService` (fachada), `EnhancementSession` (laço de quadros de um
  player), `PlayerEnhancementBinding` (ciclo de vida por player), portas `I*Port` e `InjectionToken`.
- **infrastructure**: detecção de capacidade, pressão de CPU, fábrica de motores (carrega por `import()`
  dinâmico só quando alguém liga o realce), motor WebGL2 e motor em worker.
- **Raiz de composição**: `provideVideoEnhancement()` no `app-module`; sem ela a estação é tratada como sem
  motor.

**Motor GPU (WebGL2)**, três passes: redução de artefato na resolução do stream (filtro sigma de Lee 3x3
guiado pela luma BT.709); ampliação Catmull-Rom com trava anti-halo, só com a tela pelo menos 10% maior que
o stream, até 2x por eixo e 2560x1440; nitidez RCAS (FSR 1 da AMD, MIT). O CAS foi descartado porque espera
luz linear e superafia vídeo em gamma. Até 4 players; um contexto WebGL por player (o Chromium derruba o
mais antigo acima de 16).

**Motor CPU (worker)**: só sem WebGL2 de hardware e com pelo menos 8 threads. `new VideoFrame(video)`
transferido ao worker, só a luma, desenho num `OffscreenCanvas` transferido, na resolução do stream e sem
ampliar, teto de 720p, 1 player por vez; quadro não devolvido em 1 s derruba o motor daquele player. O
fallback do Chrome para SwiftShader foi removido, então WebGL sem GPU não é caminho.

**Governador**: janelas de 30 quadros; desce um nível (completo, leve, desligado) quando o p90 do
processamento passa de 8% do intervalo entre quadros por player na GPU ou 20% na CPU, quando menos de 95%
dos quadros saem realçados ou quando o navegador descarta mais de 1 quadro. Desligado, tenta de novo em
10 s, 30 s, 90 s, até 5 min. Compute Pressure `serious` limita ao leve e `critical` desliga (só com a
janela em foco). Com a tela até metade do stream em cada eixo o realce fica em espera: num mosaico 4x4 em
1080p cada célula tem cerca de 480x270 e a própria redução já filtra bloco e ruído.

**Evidência**: captura de tela, analítico, ANPR e exportação saem sempre do `<video>` original; o canvas
realçado é só exibição por cima. Fora da imagem ao vivo: super-resolução neural, inverse tone mapping,
redução de ruído temporal (arrasta veículo) e grão sintético.

## Validação A/B

Mesmo mosaico, realce ligado e desligado. Passa se não sobem `framesDropped`, `freezeCount` e o tempo médio
de decode (`totalDecodeTime` sobre `framesDecoded`), se o `presentedFrames` do `requestVideoFrameCallback`
não abre lacuna, se não aparecem Long Animation Frames acima de 50 ms e se o `inboundBytes` do MediaMTX não
muda. Qualidade offline: VMAF NEG e CAMBI contra gravação de bitrate mais alto; o erro de OCR em recortes
de placa nunca pode subir.

## Pendências sem decisão

Kernels de luma em WebAssembly SIMD (poderiam liberar 1080p na CPU); `MediaStreamTrackProcessor` no WebRTC;
limiar de redução de artefato proporcional ao QP recebido; deband e dither ordenado; um contexto WebGL único
para o mosaico. Custos de EASU, RCAS e `VideoFrame` a 1080p em WebGL não estão publicados: medir na
máquina alvo.
