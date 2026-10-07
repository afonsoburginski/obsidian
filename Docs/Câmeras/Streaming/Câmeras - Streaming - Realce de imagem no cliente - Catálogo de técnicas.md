---
tags:
  - doc
  - ms-cameras
  - streaming
  - web-attlas
  - realce-de-imagem
aliases:
  - "Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas"
  - "Realce de imagem no cliente - Catálogo de técnicas"
  - "Catálogo de técnicas de realce de imagem"
  - "Tecnologias de fabricante para realce de imagem na web"
atualizado: 2026-10-05
---

# Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas

Volta para [[Câmeras - Streaming - Realce de imagem no cliente]], que descreve o código da PR, o desenho
decidido, o desempenho, a aceleração por hardware e a recomendação priorizada.

Esta nota lista tudo o que dá para fazer no navegador da estação do operador para melhorar a imagem da câmera
ao vivo. Cada item segue o mesmo modelo e diz em que situação está. A ordem é fixa: resumo, legenda, como os
custos foram estimados, tecnologias de fabricante, técnicas de imagem e melhoria de quadros.

## 1. Resumo

| Item | Situação | Seção |
| --- | --- | --- |
| AMD FSR 1, ampliação EASU | Decidida, em implementação | 4.1 |
| AMD FSR 1, nitidez RCAS | Implementada na PR | 4.1 |
| AMD FSR 2, FSR 3 e FSR 4 | Não serve | 4.2 |
| NVIDIA Image Scaling (NIS) | Não recomendada agora | 4.3 |
| NVIDIA RTX Video Super Resolution | Fora do alcance do app | 4.4 |
| Intel Video Super Resolution | Fora do alcance do app | 4.5 |
| Microsoft Edge Video Super Resolution | Fora do alcance do app | 4.6 |
| Intel XeSS | Não serve | 4.7 |
| AMD CAS | Não recomendada agora | 4.8 |
| Apple MetalFX | Não serve | 4.9 |
| Snapdragon GSR e Arm ASR | Não recomendada agora e não serve | 4.10 |
| Intel AI Boost (NPU) e WebNN | Proibida, e não existe nesta estação | 4.11 |
| FSR 1 rodando na CPU | RCAS implementada na luma; EASU não recomendada | 4.12 |
| Redução de artefato por sigma de Lee | Implementada na PR | 5.1 |
| Deblocking depois do decodificador | Não recomendada agora | 5.2 |
| Limiar da limpeza guiado pelo QP | Recomendada para a próxima rodada | 5.3 |
| Deband com pontilhado (dither) | Recomendada para a próxima rodada, decisão do dono | 5.4 |
| Faixa e matriz de cor corretas | Recomendada para a próxima rodada | 5.5 |
| Tom e cor pela janela da cena | Implementada na PR | 5.6 |
| Balanço de branco automático | Recomendada para a próxima rodada, decisão do dono | 5.7 |
| Gama e exposição automáticas | Não recomendada agora | 5.8 |
| CLAHE e contraste local | Recomendada para a próxima rodada | 5.9 |
| Dehaze por dark channel prior | Recomendada para a próxima rodada | 5.10 |
| Croma guiado pela luma | Não recomendada agora | 5.11 |
| Unsharp mask e adaptive-sharpen | Não recomendada agora | 5.12 |
| Catmull-Rom com trava anti-halo | Implementada na PR | 5.13 |
| Lanczos e EWA do mpv | Não recomendada agora | 5.14 |
| RAVU | Proibida pela recusa do RAISR | 5.15 |
| NNEDI3, FSRCNNX e outras redes | Proibida | 5.16 |
| Ritmo de quadros pelo `requestVideoFrameCallback` | Implementada na PR | 6.1 |
| Alvo do buffer de jitter | Recomendada para a próxima rodada, decisão do dono | 6.2 |
| Cadência entre câmera e monitor | Recomendada para a próxima rodada | 6.3 |
| Interpolação de quadros | Proibida, proposta ao dono | 6.4 |
| Redução de ruído temporal | Proibida | 6.5 |
| Canvas dessincronizado | Não recomendada agora | 6.6 |

## 2. Legenda de situação

| Situação | O que quer dizer |
| --- | --- |
| Implementada na PR | Existe no código da PR #4280 |
| Decidida, em implementação | O dono decidiu; o código ainda não terminou |
| Recomendada para a próxima rodada | Está na recomendação priorizada da nota canônica (seção 14), com ordem e motivo. Quem decide é o dono |
| Não recomendada agora | Foi avaliada; nesta fase o ganho não paga o custo ou o risco. Fica registrada |
| Não serve | Precisa de dado que o vídeo de câmera não tem, ou não existe para o navegador |
| Fora do alcance do app | Roda no driver ou no sistema, sobre o `<video>`. O app não liga nem desliga |
| Proibida | Inventa ou desloca informação. Não entra na imagem ao vivo (nota canônica, seção 6) |

## 3. Como os custos foram estimados

Nenhum tempo de GPU desta nota foi medido na estação. **Todo número de GPU é estimativa**, com o raciocínio
abaixo. Os tempos de CPU em JavaScript são os medidos na nota canônica (seção 4.2).

| Base | Valor | Fonte |
| --- | --- | --- |
| GPU da estação | Intel Graphics (Iris Xe), 96 unidades de execução, até 1,3 GHz | [Intel ARK, Core 7 150U](https://www.intel.com/content/www/us/en/products/sku/236795/intel-core-7-processor-150u-12m-cache-up-to-5-40-ghz/specifications.html) |
| Cálculo da GPU | Cerca de 2 TFLOPS em FP32: 96 unidades x 8 pistas x 2 operações por FMA x 1,3 GHz | estimativa |
| Memória | 2 canais, até DDR5 ou LPDDR5 a 5200 MT/s, dividida com a CPU. Pico teórico de cerca de 83 GB/s | Intel ARK; o pico é conta nossa |
| Custo publicado do FSR 1 | EASU mais RCAS em saída 4K: até 1,0 ms na faixa "mainstream" (RX 5700 XT, RTX 2060 SUPER). Em saída 1440p: até 0,5 ms | [AMD GPUOpen, FSR 1](https://gpuopen.com/fidelityfx-superresolution/) |
| Distância entre essas placas e a Iris Xe | De 4 a 5 vezes mais cálculo em FP32 | estimativa, pelas fichas públicas das placas |
| CPU em JavaScript, 720p, nesta estação | Redução de artefato 24 ms, nitidez 25 ms, tom e cor 4,4 ms | medido, nota canônica |
| Ganho do WebAssembly SIMD | De 1,7 a 4,5 vezes sobre WebAssembly sem SIMD, em modelos de ML; cerca de 2,5 vezes no MediaPipe | [TensorFlow.js](https://blog.tensorflow.org/2020/09/supercharging-tensorflowjs-webassembly.html) · [V8, SIMD](https://v8.dev/features/simd) |

Quatro regras saem dessa base:

1. **Filtro pesado escala pelo cálculo.** O EASU mais o RCAS custam na Iris Xe de 4 a 5 vezes o tempo da placa
   "mainstream" na mesma saída: **cerca de 1,0 a 1,3 ms em saída 1080p e 1,8 a 2,2 ms em saída 1440p**.
2. **Filtro simples escala pela memória.** Um passe de tela cheia lê uma imagem e escreve outra. Em RGBA de 8
   bits, isso move cerca de 7 MB por quadro em 720p e 17 MB em 1080p. Com 40 a 60 GB/s efetivos (metade a dois
   terços do pico), são de 0,12 a 0,18 ms em 720p e de 0,28 a 0,42 ms em 1080p, só de memória. Um filtro 3x3
   fica perto desse piso, porque o cache de textura absorve as leituras vizinhas: **cerca de 0,15 a 0,3 ms em
   720p e 0,3 a 0,6 ms em 1080p por passe**.
3. **A GPU integrada divide energia com a CPU.** Num chip de 15 W com a CPU ocupada, o relógio da GPU cai. Os
   números acima são o melhor caso. O número real só sai com `timestamp-query` na própria estação (nota
   canônica, seção 13).
4. **WebAssembly SIMD, estimativa de 2 a 4 vezes sobre o JavaScript atual.** Os ganhos publicados vão de 1,7 a
   4,5 vezes sobre WebAssembly comum, e WebAssembly comum não foi mais rápido que JavaScript num quadro Full
   HD no teste do [webrtcHacks](https://webrtchacks.com/video-frame-processing-on-the-web-webassembly-webgpu-webgl-webcodecs-webnn-and-webtransport/)
   (de 10 a 20 ms em JavaScript, cerca de 25 ms em WebAssembly com duas cópias). Não há número publicado de
   filtro de imagem de 8 bits com SIMD no navegador.

## 4. Tecnologias de fabricante e o que dá para usar na web

Cada tecnologia no mesmo modelo: situação, o que faz, algoritmo, licença, entrada, onde roda, se dá para usar
na web, custo e referência oficial.

### 4.1 AMD FidelityFX FSR 1 (EASU e RCAS)

| | |
| --- | --- |
| **Situação** | EASU: decidida, em implementação, como a ampliação dos motores WebGPU e WebGL2. RCAS: implementada na PR, como a nitidez (nota canônica, seção 5.4) |
| **O que faz** | Amplia um quadro só, sem dados de outros quadros, preservando borda (EASU), e depois dá nitidez sem estourar o sinal (RCAS) |
| **Algoritmo** | EASU lê 12 pixels em cruz em volta do ponto. Mede a direção e o comprimento da borda pela diferença de brilho e estica um núcleo próximo de Lanczos de raio 2 ao longo dela, de 1 na horizontal e na vertical até raiz de 2 na diagonal. O resultado fica preso entre o mínimo e o máximo dos 2x2 pixels mais próximos, o que corta o halo. RCAS lê 5 pixels em cruz e escolhe a maior nitidez que não tira o resultado da faixa de 0 a 1. A força é em stops: 0 é o máximo e cada stop corta a nitidez pela metade. A opção `FSR_RCAS_DENOISE` amortece a nitidez onde o centro parece ruído |
| **Licença** | MIT, AMD, 2021 |
| **Entrada** | Um quadro, já sem serrilhado, em espaço perceptual (gamma, como para tela sRGB), sem banding e sem ruído alto. A AMD manda aplicar depois do tom e antes de grão e interface. Escala de 1x a 4x em área; os modos de referência são 1,3x, 1,5x, 1,7x e 2,0x por eixo |
| **Onde roda** | Qualquer GPU: Intel, AMD e NVIDIA. O código vem em HLSL e GLSL, com caminho em meia precisão |
| **Dá para usar na web?** | Sim. É espacial: não precisa de vetor de movimento, profundidade nem jitter. Existem portes da comunidade em WebGL e em WebGPU. A entrada que ele pede (sem banding, sem ruído) é o que a limpeza e o tom e cor entregam antes dele |
| **Custo** | Publicado, EASU mais RCAS em saída 4K: até 0,4 ms (RX 6800 XT, RTX 3080), 0,6 ms (RX 6700 XT, RTX 3060 Ti) e 1,0 ms (RX 5700 XT, RTX 2060 SUPER). Na Iris Xe, estimativa de 1,0 a 1,3 ms em saída 1080p e de 1,8 a 2,2 ms em 1440p (seção 3) |
| **Referência oficial** | [GitHub FidelityFX-FSR](https://github.com/GPUOpen-Effects/FidelityFX-FSR) · [licença](https://github.com/GPUOpen-Effects/FidelityFX-FSR/blob/master/license.txt) · [ffx_fsr1.h](https://github.com/GPUOpen-Effects/FidelityFX-FSR/blob/master/ffx-fsr/ffx_fsr1.h) · [AMD GPUOpen, FSR 1](https://gpuopen.com/fidelityfx-superresolution/) · portes: [web-fsr (WebGL)](https://github.com/Hajime-san/web-fsr), [pmndrs/upscaler (WebGPU)](https://github.com/pmndrs/upscaler) |

### 4.2 AMD FSR 2, FSR 3 e FSR 4

| | |
| --- | --- |
| **Situação** | Não serve |
| **O que faz** | FSR 2 e FSR 3 ampliam juntando vários quadros (temporal). O FSR 3 também gera quadros. O FSR 4 é a versão com aprendizado de máquina |
| **Algoritmo** | Reprojeta os quadros anteriores pelos vetores de movimento e pela profundidade, e acumula detalhe com o jitter da câmera do jogo. O FSR 4 troca essa acumulação por uma rede neural |
| **Licença** | FSR 2 e FSR 3: MIT. FSR 4: DLL assinada no FidelityFX SDK 2.0 |
| **Entrada** | FSR 2: cor, profundidade e vetores de movimento na resolução de render, máscara reativa opcional e jitter. FSR 3 com geração de quadro: vetores de movimento, profundidade, fluxo óptico e máscaras. FSR 4: só placas RDNA 4, DirectX 12 no Windows |
| **Onde roda** | Motores de jogo em DirectX 11, DirectX 12 e Vulkan |
| **Dá para usar na web?** | Não. O vídeo da câmera chega pronto: não tem profundidade, vetor de movimento de motor de jogo nem jitter. O FSR 4 é rede neural (proibida) e não existe no navegador. Gerar quadro inventa quadro (seção 6.4) |
| **Custo** | Não se aplica |
| **Referência oficial** | [AMD GPUOpen, FSR 2](https://gpuopen.com/fidelityfx-super-resolution-2/) · [AMD GPUOpen, FSR 3](https://gpuopen.com/fidelityfx-super-resolution-3/) · [AMD GPUOpen, FSR 4](https://gpuopen.com/learn/amd-fsr4-gpuopen-release/) |

### 4.3 NVIDIA Image Scaling (NIS)

| | |
| --- | --- |
| **Situação** | Não recomendada agora |
| **O que faz** | Amplia um quadro só e dá nitidez, como o FSR 1 |
| **Algoritmo** | Filtro de escala de 6 toques combinado com 4 filtros direcionais (0, 45, 90 e 135 graus) e nitidez adaptativa, com tabela de coeficientes em 64 fases. Tem também uma nitidez sozinha, o NVSharpen |
| **Licença** | MIT |
| **Entrada** | Um quadro, sRGB de tela em 0 a 1, depois do tom. Tem modos para HDR PQ e para luz linear |
| **Onde roda** | Qualquer GPU: o próprio SDK tem perfis para NVIDIA, AMD e Intel. Só em compute shader (HLSL e GLSL), com caminho em meia precisão |
| **Dá para usar na web?** | No WebGPU, sim, portando o compute shader para WGSL. No WebGL2, só reescrevendo como fragment shader. Não achei porte pronto. Fica de fora porque faz o mesmo papel do EASU, que já foi decidido e roda nos dois motores de GPU |
| **Custo** | Não publicado. Estimativa: da mesma ordem do EASU mais RCAS |
| **Referência oficial** | [GitHub NVIDIAImageScaling](https://github.com/NVIDIAGameWorks/NVIDIAImageScaling) · [NIS_Scaler.h](https://github.com/NVIDIAGameWorks/NVIDIAImageScaling/blob/main/NIS/NIS_Scaler.h) |

### 4.4 NVIDIA RTX Video Super Resolution

| | |
| --- | --- |
| **Situação** | Fora do alcance do app. Recomendação para o dono decidir: deixar desligado nas estações de operação (seção 14 da nota canônica, item 1) |
| **O que faz** | Rede neural no driver da NVIDIA que amplia e limpa o vídeo que o navegador toca. Segundo a NVIDIA, a rede "prevê o resíduo" de detalhe na resolução final e soma a uma ampliação comum. O RTX Video HDR, do mesmo pacote, converte SDR em HDR, que é inverse tone mapping |
| **Algoritmo** | Rede neural fechada; o detalhe não é publicado |
| **Licença** | Proprietária, parte do driver |
| **Entrada** | O vídeo apresentado pelo `<video>`. A FAQ da NVIDIA fala de entrada de 360p a 1440p |
| **Onde roda** | Chrome 110.0.5481.105 ou mais novo e Edge 110.0.1587.56 ou mais novo, no Windows, com placa RTX e a opção ligada no painel do driver. O Chromium aciona a extensão da NVIDIA no processador de vídeo do Direct3D 11, no caminho que apresenta o `<video>` na tela (`ui/gl/swap_chain_presenter.cc`), e não aciona na bateria |
| **Dá para usar na web?** | Não. Não há API: é do driver. O quadro que o app lê do `<video>` para realçar (WebGL `texImage2D`, WebGPU `importExternalTexture`, `VideoFrame`) não passa por esse caminho de apresentação. Pelo desenho do Chromium, o canvas realçado não recebe o VSR, mas o `<video>` original, quando visível, recebe. Não há fonte oficial que diga isso com todas as letras. A captura e o analítico leem o quadro decodificado e não são afetados; o operador, que lê placa na tela, é |
| **Custo** | Do driver, fora do orçamento do app |
| **Referência oficial** | [NVIDIA, RTX Video Super Resolution](https://blogs.nvidia.com/blog/rtx-video-super-resolution) · [NVIDIA, RTX Video FAQ](https://nvidia.custhelp.com/app/answers/detail/a_id/5448/~/rtx-video-faq) · [Chromium, swap_chain_presenter.cc](https://chromium.googlesource.com/chromium/src/+/main/ui/gl/swap_chain_presenter.cc) |

### 4.5 Intel Video Super Resolution

| | |
| --- | --- |
| **Situação** | Fora do alcance do app |
| **O que faz** | Ampliação no driver da Intel sobre o `<video>` |
| **Algoritmo** | Não publicado pela Intel |
| **Licença** | Proprietária, parte do driver |
| **Entrada** | O vídeo apresentado pelo `<video>` |
| **Onde roda** | Windows, pelo mesmo caminho do processador de vídeo do Direct3D 11 que o Chromium usa para a NVIDIA. Fontes secundárias falam de GPU Intel a partir da Xe da 11ª geração e Chrome e Edge 110; não achei página da Intel. **No Linux não existe**, porque o caminho é Direct3D 11 |
| **Dá para usar na web?** | Não. Não há API |
| **Custo** | Do driver |
| **Referência oficial** | [Chromium, swap_chain_presenter.cc](https://chromium.googlesource.com/chromium/src/+/main/ui/gl/swap_chain_presenter.cc) |

### 4.6 Microsoft Edge Video Super Resolution

| | |
| --- | --- |
| **Situação** | Fora do alcance do app. Mesma recomendação do item 4.4 |
| **O que faz** | Rede neural do Edge que amplia vídeo abaixo de 720p |
| **Algoritmo** | Rede neural sobre ONNX Runtime e DirectML |
| **Licença** | Proprietária, parte do Edge |
| **Entrada** | Vídeo sem DRM, maior que 192 px nos dois lados e tocando abaixo de 720p |
| **Onde roda** | Windows, fora da bateria, com GPU RTX 20, 30 ou 40 ou Radeon RX 5700 a RX 7800 |
| **Dá para usar na web?** | Não. Não há API. A página da Microsoft sobre a API de super-resolução de vídeo do Windows (outro produto, que roda na NPU ou na CPU) manda não usar quando o vídeo fiel é crítico, "como em imagem médica, prova legal ou forense, ou verificação de identidade", e avisa de "detalhe enganoso" |
| **Custo** | Do navegador, fora do orçamento do app |
| **Referência oficial** | [Microsoft Edge, Video Super Resolution](https://blogs.windows.com/msedgedev/2023/03/08/video-super-resolution-in-microsoft-edge/) · [Microsoft Learn, Video Super Resolution](https://learn.microsoft.com/en-us/windows/ai/apis/video-super-resolution) |

### 4.7 Intel XeSS

| | |
| --- | --- |
| **Situação** | Não serve |
| **O que faz** | Ampliação temporal com rede neural. O XeSS 3 também gera vários quadros |
| **Algoritmo** | Rede neural que acumula detalhe de vários quadros reprojetados |
| **Licença** | Intel Simplified Software License: só binário, sem modificação |
| **Entrada** | Jitter, cor, vetores de movimento e profundidade |
| **Onde roda** | DirectX 12, DirectX 11 (placas Arc) e Vulkan 1.1 |
| **Dá para usar na web?** | Não. Precisa de dados de jogo, é binário nativo sem caminho para o navegador e é rede neural |
| **Custo** | Não se aplica |
| **Referência oficial** | [GitHub intel/xess](https://github.com/intel/xess) · [licença](https://github.com/intel/xess/blob/main/LICENSE.txt) · [Intel, guia do XeSS-SR](https://www.intel.com/content/www/us/en/developer/articles/technical/xess-sr-developer-guide.html) |

### 4.8 AMD FidelityFX CAS

| | |
| --- | --- |
| **Situação** | Não recomendada agora. A nitidez é o RCAS |
| **O que faz** | Nitidez adaptativa de baixo custo, com ampliação opcional até 4 vezes a área |
| **Algoritmo** | Lê uma cruz de 5 pixels (9 com a opção de diagonais) e afia menos onde o contraste local já é alto |
| **Licença** | MIT |
| **Entrada** | Luz linear. O próprio cabeçalho diz que o filtro "não funciona bem" em sRGB ou gamma 2.2 |
| **Onde roda** | Qualquer GPU |
| **Dá para usar na web?** | Dá para portar como fragment shader, mas o vídeo decodificado chega em gamma. Converter para luz linear em cada leitura multiplica o custo por 15, ou por 36 com ampliação, segundo o cabeçalho. O RCAS foi feito para entrada em gamma |
| **Custo** | 5 leituras só nitidez; de 12 a 16 com ampliação. Tempo não publicado |
| **Referência oficial** | [GitHub FidelityFX-CAS](https://github.com/GPUOpen-Effects/FidelityFX-CAS) · [ffx_cas.h](https://github.com/GPUOpen-Effects/FidelityFX-CAS/blob/master/ffx-cas/ffx_cas.h) |

### 4.9 Apple MetalFX

| | |
| --- | --- |
| **Situação** | Não serve |
| **O que faz** | Escaladores espacial, temporal e temporal com redução de ruído, e interpolação de quadros a partir do Metal 4 |
| **Algoritmo** | Fechado. O temporal usa movimento, profundidade e jitter |
| **Licença** | Proprietária, parte do sistema da Apple |
| **Entrada** | Texturas do Metal, com movimento e profundidade no modo temporal |
| **Onde roda** | Só Metal, macOS e iOS |
| **Dá para usar na web?** | Não. O Safari tem WebGPU, mas não expõe o MetalFX. Não achei declaração da Apple em nenhum sentido |
| **Custo** | Não se aplica |
| **Referência oficial** | [Apple, MetalFX](https://developer.apple.com/documentation/metalfx) |

### 4.10 Snapdragon GSR e Arm ASR

| | |
| --- | --- |
| **Situação** | GSR: não recomendada agora. Arm ASR: não serve |
| **O que faz** | GSR: ampliação espacial com nitidez em um passe, feita para GPU de celular. Arm ASR: ampliação temporal |
| **Algoritmo** | GSR: filtro de 12 toques parecido com Lanczos mais nitidez adaptativa, com 15 leituras de textura. Arm ASR: derivado do FSR 2 |
| **Licença** | GSR: BSD 3-Clause. Arm ASR: MIT |
| **Entrada** | GSR: um quadro. Arm ASR: vetores de movimento e profundidade |
| **Onde roda** | Qualquer GPU |
| **Dá para usar na web?** | GSR: dá para portar, mas faz o mesmo papel do EASU. Arm ASR: não, pelo mesmo motivo do FSR 2 |
| **Custo** | Não publicado em milissegundos |
| **Referência oficial** | [GitHub snapdragon-gsr](https://github.com/SnapdragonGameStudios/snapdragon-gsr) · [GitHub arm/accuracy-super-resolution](https://github.com/arm/accuracy-super-resolution) |

### 4.11 Intel AI Boost (NPU) e WebNN

| | |
| --- | --- |
| **Situação** | Proibida na imagem ao vivo, porque é super-resolução neural. Também não existe nesta estação |
| **O que faz** | O artigo da Intel amplia vídeo com a rede BSRGAN na NPU de um "processador Intel Core Ultra" e promete levar 360p ou menos a 1080p e até 4K |
| **Algoritmo** | BSRGAN, que tem a mesma arquitetura da ESRGAN, uma rede adversária generativa treinada para reconstruir imagem degradada. Convertida para OpenVINO, com pesos comprimidos em 4 bits e inferência assíncrona |
| **Licença** | Não se aplica: é exemplo de uso do OpenVINO |
| **Entrada** | Um quadro por vez, com tamanho fixo definido na conversão do modelo |
| **Onde roda** | **Esta estação não tem NPU.** A ficha ARK do Core 7 150U (Raptor Lake, 2 núcleos P e 8 núcleos E, 12 threads) não lista NPU nem Intel AI Boost. Lista o Intel Gaussian & Neural Accelerator 3.0 e o DL Boost na CPU, que não são NPU. A NPU aparece na linha Intel Core Ultra (Séries 1, 2 e 3: Meteor Lake, Lunar Lake e Arrow Lake, Panther Lake); o campo se confere no ARK de cada modelo |
| **Dá para usar na web?** | Só pela WebNN, e não no Linux. A WebNN é W3C Candidate Recommendation Draft (10/09/2026). A API não escolhe mais o dispositivo: há só a dica `powerPreference`, e o navegador decide entre CPU, GPU e NPU. No Chrome está em origin trial do 146 ao 148, com a flag `chrome://flags/#web-machine-learning-neural-network`. Por sistema: Windows 11 24H2 ou mais novo usa o Windows ML, que chega à NPU da Intel pelo OpenVINO (a Microsoft pede Arrow Lake ou mais novo e diz que GPU e NPU estão em prévia, fora de produção); macOS com Apple Silicon usa o Core ML; **Linux e ChromeOS rodam só na CPU** (TFLite com XNNPACK). O ONNX Runtime Web pede NPU pela WebNN, mas depende do mesmo caminho |
| **Custo** | Publicado: "cerca de 5 quadros processados por segundo", sem resolução nem consumo. Não é tempo real para câmera a 25 ou 30 fps |
| **Risco forense** | Rede adversária generativa cria textura plausível, que é o caso proibido. Nenhum fabricante usa a palavra "alucinar"; a NVIDIA fala em "prever o resíduo" e a Microsoft avisa de "detalhe enganoso" (item 4.6) |
| **Uso permitido?** | Recomendação para o dono decidir, sem reabrir a proibição: o único uso que não esbarra na regra fica fora da imagem ao vivo, numa imagem parada de incidente, por ação explícita do operador, com a marca "gerada por IA, não é prova" e nunca em recorte de placa ou rosto. "Só exibição" ao vivo não resolve, porque o operador lê placa na tela e registra o que leu. Na estação Linux de referência nem isso tem caminho |
| **Referência oficial** | [Intel, AI upscaling na NPU](https://www.intel.com/content/www/us/en/developer/articles/technical/enhance-ai-upscaling-with-intel-ai-boost-npu.html) · [Intel ARK, Core 7 150U](https://www.intel.com/content/www/us/en/products/sku/236795/intel-core-7-processor-150u-12m-cache-up-to-5-40-ghz/specifications.html) · [W3C WebNN](https://www.w3.org/TR/webnn/) · [blink-dev, origin trial da WebNN](https://groups.google.com/a/chromium.org/g/blink-dev/c/5CWKSChYo98/m/xMw0U5NkAAAJ) · [WebNN, back-ends por sistema](https://webnn.io/en/api-reference/browser-compatibility/api) · [Microsoft Learn, WebNN](https://learn.microsoft.com/en-us/windows/ai/directml/webnn-overview) · [Microsoft Learn, provedores do Windows ML](https://learn.microsoft.com/en-us/windows/ai/new-windows-ml/supported-execution-providers) · [ONNX Runtime Web, WebNN](https://onnxruntime.ai/docs/tutorials/web/ep-webnn.html) |

### 4.12 FSR 1 rodando na CPU

| | |
| --- | --- |
| **Situação** | RCAS: implementada na PR, só na luma (é a nitidez do motor CPU). EASU na CPU: não recomendada |
| **O que faz** | Levaria a ampliação e a nitidez do FSR 1 para a estação sem GPU |
| **Algoritmo** | O mesmo do item 4.1. O código da AMD tem uma camada de portabilidade com modo CPU (`A_CPU` no `ffx_a.h`), que o exemplo oficial usa só para calcular as constantes. Não achei porte de CPU pronto, nem em JavaScript nem em WebAssembly |
| **Licença** | MIT |
| **Entrada** | O plano de luma do `VideoFrame` que o worker já lê |
| **Onde roda** | Worker do motor CPU, em JavaScript ou WebAssembly SIMD |
| **Dá para usar na web?** | RCAS: já roda. EASU: dá para portar, mas não cabe no orçamento |
| **Custo do RCAS** | Medido em JavaScript: 25 ms por quadro 720p. Com WebAssembly SIMD, estimativa de 6 a 13 ms. Com o quadro dividido entre 2 a 4 workers, estimativa de 1,5 a 6 ms de tempo por quadro |
| **Custo do EASU** | Por pixel de saída, cerca de 12 leituras e algumas centenas de operações (de 300 a 500, contagem aproximada a partir do código), contra 9 leituras e poucas dezenas de operações do filtro sigma de Lee, que custa 24 ms. Estimativa só na luma, de 5 a 8 vezes o Lee por pixel. Ampliar 720p para 1080p dá 2,25 vezes mais pixels. Resultado: **de 270 a 430 ms em JavaScript, de 70 a 220 ms com WebAssembly SIMD e de 17 a 55 ms em 4 workers** |
| **Cabe nos 8 ms?** | RCAS: só com WebAssembly SIMD e o quadro dividido em workers; junto do tom e cor (4,4 ms), fica no limite. EASU: não cabe em nenhum cenário. Dividir em workers baixa o tempo por quadro, não o gasto total de CPU, e o orçamento de 8 ms existe porque o decode e o compositor também rodam na CPU. Ampliar na CPU ainda aumenta em 2,25 vezes o `VideoFrame` que volta para a tela |
| **Referência oficial** | [ffx_a.h](https://github.com/GPUOpen-Effects/FidelityFX-FSR/blob/master/ffx-fsr/ffx_a.h) · [ffx_fsr1.h](https://github.com/GPUOpen-Effects/FidelityFX-FSR/blob/master/ffx-fsr/ffx_fsr1.h) · [V8, SIMD](https://v8.dev/features/simd) |

## 5. Técnicas de imagem

Cada técnica no mesmo modelo: situação, o que faz, algoritmo, ganho visual, onde roda, custo, risco de
artefato, quando usar e referência oficial. Os custos de GPU são estimativa na Iris Xe (seção 3).

### 5.1 Redução de artefato por sigma de Lee

| | |
| --- | --- |
| **Situação** | Implementada na PR |
| **O que faz** | Alisa o chuvisco de compressão (mosquito) e o contorno fantasma em área lisa, sem borrar borda |
| **Algoritmo** | Descrito na nota canônica, seção 5.1 |
| **Ganho visual** | Médio em bitrate baixo, pequeno em imagem boa |
| **Onde roda** | WebGPU, WebGL2 e CPU (só luma) |
| **Custo** | GPU: cerca de 0,15 a 0,3 ms em 720p e 0,3 a 0,6 ms em 1080p (estimativa). CPU: 24 ms em 720p, medido |
| **Risco de artefato** | Baixo. Com limiar alto, apaga textura fina |
| **Quando usar** | Nível completo |
| **Referência oficial** | [Lee, 1983, filtro sigma](https://doi.org/10.1016/0734-189X(83)90047-6) |

### 5.2 Deblocking depois do decodificador

| | |
| --- | --- |
| **Situação** | Não recomendada agora. Reavaliar depois do limiar guiado pelo QP (seção 5.3) |
| **O que faz** | Suaviza a borda de bloco que sobra quando a câmera comprime demais |
| **Algoritmo** | O decodificador já roda o filtro de deblocking do H.264 e, no H.265, o deblocking mais o SAO (desvio por faixa ou por classe de borda, contra ringing). O que sobra é bloco em bitrate muito baixo. Os filtros clássicos de pós-processamento são do FFmpeg: `deblock` (detecção de borda com limiares, bloco 8), `spp`, `fspp` e `pp7` (DCT do bloco, limiar nos coeficientes, DCT inversa e média de vários deslocamentos) e `uspp` (recodifica cada deslocamento). Eles usam o QP de cada quadro quando o decodificador entrega |
| **Ganho visual** | Pequeno a médio, só em câmera com bitrate muito baixo |
| **Onde roda** | WebGPU e WebGL2: um passe na grade de bloco, na resolução do stream. CPU: não cabe junto dos outros passes |
| **Custo** | Versão de borda de bloco: como um 3x3, 0,15 a 0,3 ms em 720p e 0,3 a 0,6 ms em 1080p. Versão por DCT deslocada: várias vezes isso. Estimativa |
| **Risco de artefato** | Borra textura real que coincide com a grade, e cintila entre quadros porque o limiar é por quadro |
| **Quando usar** | Só com QP alto medido. O navegador não entrega o QP de cada quadro: a WebCodecs não tem esse campo, e o WebRTC só dá a soma (seção 5.3) |
| **Referência oficial** | [ITU-T H.264](https://www.itu.int/rec/T-REC-H.264) · [ITU-T H.265](https://www.itu.int/rec/T-REC-H.265) · [List e outros, deblocking do H.264 (DOI)](https://doi.org/10.1109/TCSVT.2003.815175) · [Sullivan e outros, visão geral do HEVC (DOI)](https://doi.org/10.1109/TCSVT.2012.2221191) · [FFmpeg, filtros](https://ffmpeg.org/ffmpeg-filters.html) |

### 5.3 Limiar da limpeza guiado pelo QP

| | |
| --- | --- |
| **Situação** | Recomendada para a próxima rodada (item 6). Já constava como pendência sem decisão |
| **O que faz** | Limpa mais quando a câmera comprime mais e menos quando a imagem está boa |
| **Algoritmo** | O `getStats()` do WebRTC tem `qpSum` no `inbound-rtp`: a soma do QP dos quadros decodificados, com a contagem em `framesDecoded`. A diferença entre duas leituras dá o QP médio da janela (no H.264, de 0 a 51). Esse QP médio escolhe o limiar do sigma de Lee, hoje fixo em 0,035 na GPU e 9 na CPU. A tabela entre QP e limiar se calibra contra gravação de referência |
| **Ganho visual** | Médio: menos chuvisco em câmera ruim, mais textura preservada em câmera boa |
| **Onde roda** | Os três motores. Só no WebRTC; o LL-HLS não tem `getStats()` |
| **Custo** | Uma leitura de `getStats()` por janela; nenhum custo por quadro |
| **Risco de artefato** | Baixo. O QP é média da janela, não de cada quadro. Detectar em tempo de execução se o navegador entrega o campo, porque a MDN não o marca como Baseline |
| **Quando usar** | Sempre que o campo existir, no nível completo |
| **Referência oficial** | [W3C WebRTC Stats, qpSum](https://www.w3.org/TR/webrtc-stats/) · [MDN qpSum](https://developer.mozilla.org/en-US/docs/Web/API/RTCInboundRtpStreamStats/qpSum) · [W3C WebCodecs](https://www.w3.org/TR/webcodecs/) |

### 5.4 Deband com pontilhado (dither)

| | |
| --- | --- |
| **Situação** | Recomendada para a próxima rodada (item 8), decisão do dono por ficar ao lado da proibição de grão sintético |
| **O que faz** | Tira as faixas de cor (banding) de céu, asfalto, parede e cena noturna, que a compressão cria em degradê |
| **Algoritmo** | O deband do libplacebo, o mesmo do mpv: em cada iteração sorteia um ângulo e uma distância dentro de um raio, lê 4 pixels em cruz a essa distância e tira a média. Se o pixel difere da média menos que o limiar, vira a média; se difere mais, é detalhe e fica. Padrão do libplacebo: 1 iteração, limiar 3,0, raio 16, grão 4,0. Aqui o grão fica em zero; só se pontilha a saída, com ruído azul de no máximo meio nível de 8 bits, que é o padrão de pontilhado do libplacebo |
| **Ganho visual** | Médio, em céu e em cena escura. Também cobre um efeito do próprio realce: esticar o tom até 1,5 vez sobre um quadro de 8 bits deixa níveis vazios no histograma, e em degradê isso pode virar faixa. Fazer o tom em ponto flutuante e pontilhar só na saída evita isso |
| **Onde roda** | WebGPU e WebGL2, na resolução do stream, antes da ampliação. CPU: não cabe |
| **Custo** | Como um 3x3: 0,15 a 0,3 ms em 720p e 0,3 a 0,6 ms em 1080p (estimativa) |
| **Risco de artefato** | Limiar alto apaga detalhe real de baixo contraste, como faixa de pintura gasta. O pontilhado é ruído, ainda que de meio nível e invisível a olho nu, e por isso a decisão é do dono. Medir com CAMBI antes e depois |
| **Quando usar** | Nível completo, com limiar baixo |
| **Referência oficial** | [libplacebo, parâmetros do deband](https://github.com/haasn/libplacebo/blob/master/src/include/libplacebo/shaders/sampling.h) · [libplacebo, pontilhado](https://github.com/haasn/libplacebo/blob/master/src/include/libplacebo/shaders/dithering.h) · [manual do mpv, deband](https://mpv.io/manual/stable/) · [Netflix CAMBI](https://github.com/Netflix/vmaf/blob/master/resource/doc/cambi.md) |

### 5.5 Faixa e matriz de cor corretas

| | |
| --- | --- |
| **Situação** | Recomendada para a próxima rodada (item 5) |
| **O que faz** | Corrige a cor quando o navegador interpreta o vídeo da câmera com a faixa ou a matriz errada |
| **Algoritmo** | O H.264 diz no VUI se o vídeo é de faixa cheia (0 a 255) ou limitada (16 a 235) e qual matriz usar (BT.601 ou BT.709). Câmera que manda faixa cheia marcada como limitada, ou sem marca, sai com preto e branco cortados e contraste demais. O contrário sai lavado, com preto levantado. Matriz trocada desloca o matiz, mais nos vermelhos e verdes. A WebCodecs deixa ler o que o navegador entendeu em `VideoFrame.colorSpace` (`primaries`, `transfer`, `matrix`, `fullRange`). Matriz trocada se desfaz com uma conta 3x3 sobre RGB. Faixa cheia lida como limitada corta o sinal antes do RGB, então na GPU só se corrige em parte; no motor CPU, que lê os planos YUV crus, basta montar o quadro de saída com a faixa certa |
| **Ganho visual** | Alto onde acontece: é cor errada, não falta de realce. Primeiro é preciso medir quantas câmeras da frota têm o problema |
| **Onde roda** | WebGPU e WebGL2: uma conta 3x3 mais desvio, embutida no passe de tom e cor. CPU: o espaço de cor do `VideoFrame` de saída |
| **Custo** | Praticamente zero: entra num passe que já existe |
| **Risco de artefato** | Detecção errada piora uma câmera que estava certa. Precisa de valor manual por câmera para vencer a detecção |
| **Quando usar** | Sempre, em todos os níveis, inclusive fora do realce, porque é correção de leitura e não realce |
| **Referência oficial** | [W3C WebCodecs, VideoColorSpace](https://www.w3.org/TR/webcodecs/) · [ITU-T H.264, VUI](https://www.itu.int/rec/T-REC-H.264) |

### 5.6 Tom e cor pela janela da cena

| | |
| --- | --- |
| **Situação** | Implementada na PR |
| **O que faz** | Estica o contraste à faixa que a cena usa e dá saturação com vibrance |
| **Algoritmo** | Descrito na nota canônica, seção 5.2 |
| **Ganho visual** | Alto em névoa, contraluz e exposição baixa |
| **Onde roda** | Os três motores |
| **Custo** | GPU: um passe, 0,15 a 0,3 ms em 720p (estimativa). CPU: 4,4 ms em 720p, medido. Na GPU, a medida da janela lê 64x36 pixels de volta para a CPU a cada 4 quadros; a nota canônica, seção 13, explica por que isso sai caro e como evitar |
| **Risco de artefato** | Baixo: curva monotônica, matiz preservado, esticamento limitado a 1,5 vez |
| **Quando usar** | Na PR, nos níveis completo e leve. No desenho decidido, só quando o operador liga o botão de melhoria, na GPU e na CPU (nota canônica, seção 11) |
| **Referência oficial** | Nota canônica, seção 5.2 |

### 5.7 Balanço de branco automático

| | |
| --- | --- |
| **Situação** | Recomendada para a próxima rodada (item 9), decisão do dono por mexer na cor de semáforo e de veículo |
| **O que faz** | Tira a dominante de cor da imagem, como o azulado de câmera barata ou o laranja de lâmpada de sódio |
| **Algoritmo** | Família de Minkowski: estima a cor da luz pela média dos canais elevada a uma potência p e divide cada canal por ela. Com p igual a 1 é o gray world (a média da cena é cinza); com p infinito é o white patch (o mais claro é branco); com p igual a 6 é o shades of gray, que deu o melhor resultado no artigo original. O gray edge faz a mesma conta sobre a derivada da imagem, que sofre menos com cena de uma cor só. As variantes robustas usam só pixels quase cinza (Huo e outros, 2006) e excluem pixels estourados. Aqui: estimar numa cópia pequena do quadro, limitar o ganho de cada canal (por exemplo, a 10%) e mudar devagar, como a janela de tom |
| **Ganho visual** | Médio: cor de veículo e de sinalização mais próxima do real em câmera com dominante |
| **Onde roda** | WebGPU e WebGL2: três ganhos no passe de tom e cor. CPU: aproximação em Cb e Cr dentro da tabela de cor que já existe, remontada só quando o ganho muda |
| **Custo** | Praticamente zero por quadro. A medida usa a mesma cópia pequena da janela de tom |
| **Risco de artefato** | Cena de uma cor só (ônibus vermelho tomando o quadro, gramado) engana o gray world. À noite, luz de sódio é quase monocromática e a correção puxa azul demais. O risco forense é real: a cor do semáforo e a cor do veículo são informação. Por isso o ganho tem teto e a decisão é do dono |
| **Quando usar** | Só quando a dominante medida passa de um limiar, e nunca à noite sem teto de ganho |
| **Referência oficial** | [Buchsbaum, 1980, gray world (DOI)](https://doi.org/10.1016/0016-0032(80)90058-7) · [Finlayson e Trezzi, 2004, shades of gray (DOI)](https://doi.org/10.2352/CIC.2004.12.1.art00008) · [van de Weijer, Gevers e Gijsenij, 2007, gray edge (DOI)](https://doi.org/10.1109/TIP.2007.901808) · [Huo e outros, 2006, pontos cinza (DOI)](https://doi.org/10.1109/TCE.2006.1649677) |

### 5.8 Gama e exposição automáticas

| | |
| --- | --- |
| **Situação** | Não recomendada agora |
| **O que faz** | Clareia os meios-tons de cena escura com uma curva de gama escolhida pelo histograma |
| **Algoritmo** | AGCWD (Huang, Cheng e Chiu, 2013): pondera o histograma, acumula e usa o acumulado para escolher a gama de cada nível. Vira uma tabela de 256 entradas |
| **Ganho visual** | Pequeno além do que a janela de tom já faz |
| **Onde roda** | Os três motores, embutida na tabela de tom |
| **Custo** | Praticamente zero |
| **Risco de artefato** | Clareia ruído em área escura, e a noite passa a parecer dia, o que não é "mais real" |
| **Quando usar** | Só se a validação mostrar cena escura que a janela de tom não resolve |
| **Referência oficial** | [Huang, Cheng e Chiu, 2013, AGCWD (DOI)](https://doi.org/10.1109/TIP.2012.2226047) |

### 5.9 CLAHE e contraste local

| | |
| --- | --- |
| **Situação** | Recomendada para a próxima rodada (item 11) |
| **O que faz** | Dá contraste por região: mostra o carro na sombra do viaduto e a placa contra o sol sem estourar o resto |
| **Algoritmo** | Divide o quadro em blocos (8x8 é o padrão do OpenCV), monta o histograma de cada bloco, corta as barras acima de um limite e redistribui o excesso, e transforma o acumulado de cada bloco em tabela. Cada pixel mistura as tabelas dos 4 blocos mais próximos, para não aparecer a grade. Aqui: só na luma, com limite de corte baixo e com os histogramas mudando devagar entre quadros |
| **Ganho visual** | Médio a alto em contraluz, túnel e sombra forte |
| **Onde roda** | WebGPU: histograma por bloco em compute shader, com atômicos na memória do grupo. WebGL2: só com truques caros ou leitura de volta. CPU: não cabe (4 consultas de tabela e 3 misturas por pixel, estimativa de 8 a 12 ms em JavaScript em 720p, pela proporção do tom e cor) |
| **Custo** | Publicado: cerca de 9,6 ms em 1080p numa GPU Apple A11, em Metal. Estimativa na Iris Xe, de 2 a 4 vezes mais forte que a A11: de 1 a 2 ms em 720p e de 2,5 a 5 ms em 1080p. Montar o histograma a cada 2 pixels em cada eixo corta a primeira etapa por 4 |
| **Risco de artefato** | Aumenta ruído e bloco em área lisa, cintila entre quadros se o histograma muda rápido e altera a relação de brilho entre regiões. Não inventa detalhe, mas não é tão neutro quanto a janela de tom global |
| **Quando usar** | Nível completo, no WebGPU, com a força como a do tom e cor |
| **Referência oficial** | [Pizer e outros, 1987, AHE (DOI)](https://doi.org/10.1016/S0734-189X(87)80186-X) · Zuiderveld, "Contrast Limited Adaptive Histogram Equalization", Graphics Gems IV, 1994, p. 474 a 485 · [OpenCV, CLAHE](https://docs.opencv.org/4.x/d6/db6/classcv_1_1CLAHE.html) · [Accelerated-CLAHE, tempos em Metal](https://github.com/YuAo/Accelerated-CLAHE) |

### 5.10 Dehaze por dark channel prior

| | |
| --- | --- |
| **Situação** | Recomendada para a próxima rodada (item 12, o último) |
| **O que faz** | Tira névoa, neblina e chuva fina, devolvendo contraste e cor ao fundo da cena |
| **Algoritmo** | Em imagem sem névoa, quase todo pedaço tem algum pixel com um canal perto de zero (o canal escuro). A névoa levanta esse canal. Passos: canal escuro (mínimo de R, G e B, depois mínimo num bloco de 15x15); luz do céu A pelos 0,1% mais claros do canal escuro; transmissão `t = 1 - 0,95 x escuro(I / A)`; refino de `t` com filtro guiado; recuperação `J = (I - A) / max(t; 0,1) + A`. O filtro guiado rápido calcula em resolução reduzida e é mais de 10 vezes mais rápido com redução de 4 |
| **Ganho visual** | Alto em manhã de neblina e chuva; nulo no resto |
| **Onde roda** | WebGPU e WebGL2: canal escuro e filtro guiado em um quarto da resolução, recuperação num passe em tela cheia. CPU: não cabe, porque precisa de RGB e o motor CPU trabalha em YUV |
| **Custo** | Estimativa: de 0,5 a 1 ms em 720p e de 0,8 a 1,5 ms em 1080p (um passe cheio e uma dúzia de passes pequenos) |
| **Risco de artefato** | Alto. O próprio artigo diz que a regra falha em objeto parecido com a luz do céu, como carro branco e parede clara. À noite, com farol e poste, sai do modelo. Divisão por `t` pequeno aumenta ruído. A luz do céu mudando entre quadros faz a imagem pulsar |
| **Quando usar** | Só quando a cena mede névoa (canal escuro médio alto), de dia, com A e `t` mudando devagar |
| **Referência oficial** | [He, Sun e Tang, dark channel prior (DOI)](https://doi.org/10.1109/TPAMI.2010.168) · [He, Sun e Tang, filtro guiado (DOI)](https://doi.org/10.1109/TPAMI.2012.213) · [He e Sun, filtro guiado rápido](https://arxiv.org/abs/1505.00996) |

### 5.11 Croma guiado pela luma

| | |
| --- | --- |
| **Situação** | Não recomendada agora |
| **O que faz** | Reconstrói a cor em resolução cheia usando a borda da luma, contra a cor que "vaza" na borda de carro vermelho, placa e semáforo |
| **Algoritmo** | Upsampling bilateral conjunto (Kopf e outros, 2007): cada amostra de cor pesa pela distância e pela semelhança da luma. Variantes do mpv: KrigBilateral (krigagem com 8 vizinhos, resolve um sistema 8x8 por pixel) e CfL (regressão da cor sobre a luma, como a predição de croma do AV1) |
| **Ganho visual** | Pequeno a médio, em borda saturada |
| **Onde roda** | Não há caminho bom. No WebGPU e no WebGL2, o navegador já entrega o quadro em RGB, com a cor ampliada por ele; os planos de cor não são acessíveis sem cópia. No motor CPU os planos existem, mas o quadro volta em I420 e o navegador amplia a cor de novo |
| **Custo** | KrigBilateral: o autor compara ao FSRCNNX e diz que não serve para 4K em tempo real em GPU comum. CfL: não publicado |
| **Risco de artefato** | Halo de cor onde a borda da luma e a da cor não coincidem, e cor falsa em texto cinza |
| **Quando usar** | Só se um dia o navegador expuser os planos do quadro na GPU |
| **Referência oficial** | [Kopf e outros, 2007, upsampling bilateral conjunto (DOI)](https://doi.org/10.1145/1275808.1276497) · [KrigBilateral](https://gist.github.com/igv/a015fc885d5c22e6891820ad89555637) · [CfL para mpv](https://github.com/Artoriuz/glsl-chroma-from-luma-prediction) |

### 5.12 Unsharp mask e adaptive-sharpen

| | |
| --- | --- |
| **Situação** | Não recomendada agora. A nitidez é o RCAS (seção 4.1) |
| **O que faz** | Outras formas de nitidez |
| **Algoritmo** | Unsharp mask: subtrai uma versão borrada e soma a diferença. O `unsharp` do FFmpeg usa matriz 5x5 na luma, força 1,0, sem limiar; editores de foto acrescentam um limiar abaixo do qual nada é afiado. Adaptive-sharpen (bacondither, para mpv): afia mais a borda pouco nítida e menos a borda já nítida e a área lisa |
| **Ganho visual** | Unsharp: igual ou pior que o RCAS, com halo. Adaptive-sharpen: parecido com o RCAS, mais caro |
| **Onde roda** | Os dois motores de GPU. CPU: o unsharp custaria o mesmo que a nitidez atual |
| **Custo** | Unsharp 5x5: cerca de 0,3 a 0,6 ms em 1080p. Adaptive-sharpen: várias vezes isso. Estimativa |
| **Risco de artefato** | Halo e ruído reforçado. O RCAS evita os dois por construção |
| **Quando usar** | Não se aplica |
| **Referência oficial** | [FFmpeg, unsharp](https://ffmpeg.org/ffmpeg-filters.html) · [Adaptive-sharpen](https://github.com/bacondither/Adaptive-sharpen) |

### 5.13 Catmull-Rom com trava anti-halo

| | |
| --- | --- |
| **Situação** | Implementada na PR. Decidido trocar pelo EASU (seção 4.1) |
| **O que faz** | Amplia o stream até o tamanho do quadro na tela |
| **Algoritmo** | Descrito na nota canônica, seção 5.3 |
| **Ganho visual** | Médio sobre o bilinear do compositor |
| **Onde roda** | WebGL2 |
| **Custo** | 9 leituras bilineares por pixel de saída: cerca de 0,3 a 0,5 ms em saída 1080p (estimativa) |
| **Risco de artefato** | Baixo, com a trava |
| **Quando usar** | Até o EASU entrar |
| **Referência oficial** | [Catmull-Rom em 9 leituras](https://vec3.ca/bicubic-filtering-in-fewer-taps/) |

### 5.14 Lanczos e EWA do mpv

| | |
| --- | --- |
| **Situação** | Não recomendada agora |
| **O que faz** | Escaladores clássicos de alta qualidade dos players de referência |
| **Algoritmo** | `lanczos`: sinc janelado, raio 3, separável em dois passes. `ewa_lanczos`: jinc janelado em disco (EWA), raio 3,2383, que é o terceiro zero da jinc; não é separável e lê cerca de 33 amostras por pixel. `ewa_lanczossharp`: o mesmo com o raio encolhido 0,98125. O mpv também tem `spline36` e `catmull_rom`, a trava `scale-antiring` e ampliação em luz linear ou sigmoidal |
| **Ganho visual** | Pouco acima do Catmull-Rom; abaixo do EASU em borda inclinada, porque não segue a direção da borda |
| **Onde roda** | WebGPU e WebGL2 |
| **Custo** | Lanczos separável: cerca de 0,5 a 1 ms em saída 1080p. EWA: cerca de 1,5 a 3 ms em saída 1080p, acima do EASU. Estimativa pela contagem de leituras |
| **Risco de artefato** | Ringing em borda forte, que pede a trava anti-halo |
| **Quando usar** | Não se aplica: o EASU foi decidido |
| **Referência oficial** | [libplacebo, filtros](https://github.com/haasn/libplacebo/blob/master/src/filters.c) · [manual do mpv](https://mpv.io/manual/stable/) |

### 5.15 RAVU

| | |
| --- | --- |
| **Situação** | Proibida pela mesma recusa que a spec da PR aplica ao RAISR, por ser filtro aprendido. Nota para o dono: cada pixel de saída é combinação linear de pixels de entrada, então o risco de inventar estrutura é bem menor que o de rede neural. Reabrir só por decisão dele |
| **O que faz** | Ampliação 2x com filtros treinados (ravu, ravu-lite) ou em qualquer fator (ravu-zoom), para mpv |
| **Algoritmo** | Inspirado no RAISR do Google: classifica cada pixel pelo ângulo, pela força e pela coerência do gradiente e aplica o filtro linear aprendido para aquela classe. No RAISR, cada classe tem um filtro de 9x9 ou 11x11 |
| **Ganho visual** | Bom em borda, segundo o autor; não há comparação publicada com o EASU |
| **Onde roda** | WebGPU e WebGL2 |
| **Custo** | O ravu-zoom renderiza na resolução final e o autor avisa que é bem mais lento. Tempo não publicado |
| **Risco de artefato** | Os filtros vêm de imagens de treino, não da câmera |
| **Quando usar** | Não se aplica |
| **Referência oficial** | [mpv-prescalers (RAVU)](https://github.com/bjin/mpv-prescalers) · [Romano, Isidoro e Milanfar, RAISR](https://arxiv.org/abs/1606.01299) |

### 5.16 NNEDI3, FSRCNNX e outras redes

| | |
| --- | --- |
| **Situação** | Proibida |
| **O que faz** | Ampliação por rede neural, em shaders do mpv |
| **Algoritmo** | NNEDI3: rede neural que interpola na direção da borda. FSRCNNX: rede convolucional de super-resolução |
| **Ganho visual** | Alto em aparência |
| **Onde roda** | WebGPU e WebGL2 |
| **Custo** | Alto |
| **Risco de artefato** | Detalhe plausível que a câmera não capturou (nota canônica, seção 6) |
| **Quando usar** | Não se aplica |
| **Referência oficial** | [mpv-prescalers](https://github.com/bjin/mpv-prescalers) |

## 6. Melhoria de quadros

Mesmo modelo da seção 5. O que é seguro: mostrar cada quadro real uma vez, na hora certa, sem inventar
quadro e sem misturar quadros.

### 6.1 Ritmo de quadros pelo `requestVideoFrameCallback`

| | |
| --- | --- |
| **Situação** | Implementada na PR |
| **O que faz** | Realça cada quadro uma vez, no ritmo em que o navegador apresenta o vídeo |
| **Algoritmo** | O aviso dispara a cada quadro apresentado, no menor ritmo entre o do vídeo e o da tela (25 fps num monitor de 60 Hz avisa 25 vezes por segundo). Os metadados trazem `mediaTime`, que identifica o quadro, e `presentedFrames`, a contagem de quadros apresentados: salto maior que 1 entre dois avisos quer dizer quadro mostrado sem realce. No WebRTC vêm também `captureTime`, `receiveTime` e `rtpTimestamp` |
| **Ganho visual** | É o que impede o realce de atrasar ou repetir quadro |
| **Onde roda** | Os três motores |
| **Custo** | Nenhum além do realce |
| **Risco de artefato** | Nenhum: não muda quando o quadro aparece |
| **Quando usar** | Sempre |
| **Referência oficial** | [WICG requestVideoFrameCallback](https://wicg.github.io/video-rvfc/) · [web.dev, requestVideoFrameCallback](https://web.dev/articles/requestvideoframecallback-rvfc) |

### 6.2 Alvo do buffer de jitter

| | |
| --- | --- |
| **Situação** | Recomendada para a próxima rodada (item 10), decisão do dono por trocar atraso por fluidez |
| **O que faz** | Pede ao WebRTC para segurar os quadros um pouco mais antes de mostrar. Em rede instável, o vídeo para de engasgar |
| **Algoritmo** | `RTCRtpReceiver.jitterBufferTarget`, em milissegundos, de 0 a 4000. É uma dica: o navegador influencia o buffer, não o fixa. Com áudio e vídeo sincronizados, vale o maior dos dois alvos. Substitui o antigo `playoutDelayHint` |
| **Ganho visual** | Médio em câmera com engasgo de rede; nulo em rede boa |
| **Onde roda** | Chrome 123 no desktop, pelo anúncio de envio. Só no WebRTC; o LL-HLS tem buffer próprio |
| **Custo** | Nenhum processamento. O custo é o atraso pedido |
| **Risco de artefato** | Nenhum na imagem: não inventa nem descarta quadro. O risco é operacional: atraso maior durante PTZ |
| **Quando usar** | Por câmera, quando `freezeCount` e `totalFreezesDuration` sobem ou o atraso médio do buffer (`jitterBufferDelay` dividido por `jitterBufferEmittedCount`) oscila. Nunca durante PTZ |
| **Referência oficial** | [W3C webrtc-extensions, jitterBufferTarget](https://w3c.github.io/webrtc-extensions/#dom-rtcrtpreceiver-jitterbuffertarget) · [MDN jitterBufferTarget](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpReceiver/jitterBufferTarget) · [blink-dev, anúncio de envio](https://www.mail-archive.com/blink-dev@chromium.org/msg09297.html) · [W3C WebRTC Stats](https://www.w3.org/TR/webrtc-stats/) |

### 6.3 Cadência entre câmera e monitor

| | |
| --- | --- |
| **Situação** | Recomendada para a próxima rodada (item 10), como configuração da estação, sem código |
| **O que faz** | Faz cada quadro da câmera ficar o mesmo tempo na tela, para o movimento do veículo sair regular |
| **Algoritmo** | Um monitor de 60 Hz atualiza a cada 16,7 ms. Um quadro de 25 fps dura 40 ms, que dá 2,4 atualizações: o navegador alterna quadros de 2 e 3 atualizações (33 ms e 50 ms), e o movimento sai irregular. Com o monitor da estação em 50 Hz ou 100 Hz para frota de 25 fps, ou em 60 Hz para frota de 30 fps, cada quadro dura o mesmo número de atualizações. A conta para 25 fps é nossa; o mpv descreve o mesmo efeito para 24 fps em 60 Hz |
| **Ganho visual** | Médio em movimento lateral e em panorâmica de PTZ |
| **Onde roda** | Configuração de tela do sistema da estação |
| **Custo** | Nenhum |
| **Risco de artefato** | Nenhum. Mosaico com câmeras de fps diferentes só fica regular para uma das frequências |
| **Quando usar** | Na instalação de cada estação, pelo fps predominante da frota |
| **Referência oficial** | [mpv, sincronização com a tela](https://github.com/mpv-player/mpv/wiki/Display-synchronization) |

### 6.4 Interpolação de quadros

| | |
| --- | --- |
| **Situação** | Proibida pelo princípio de não inventar informação. A spec da PR não a cita pelo nome; recomendação ao dono: incluir na lista de proibições |
| **O que faz** | Cria um quadro novo entre dois reais, para o movimento parecer mais fluido. É o "motion smoothing" das TVs |
| **Algoritmo** | Estima o fluxo óptico entre dois quadros e desenha um quadro intermediário ao longo dele (NVIDIA FRUC, MEMC de TV, redes como a RIFE) |
| **Ganho visual** | Alto em aparência de fluidez |
| **Onde roda** | GPU |
| **Custo** | Alto, e soma pelo menos um quadro de atraso, porque precisa do próximo quadro |
| **Risco de artefato** | O quadro criado mostra o veículo numa posição e num instante que a câmera nunca gravou. Em avanço de sinal ou colisão, isso vira prova falsa. A literatura forense trata quadro interpolado como falsificação detectável de taxa de quadros, e o SWGDE pede que interpolação seja documentada como técnica de clarificação |
| **Quando usar** | Não se aplica |
| **Referência oficial** | [NVIDIA, guia do FRUC](https://docs.nvidia.com/video-technologies/optical-flow-sdk/nvfruc-programming-guide/index.html) · [detecção de interpolação de quadros (arXiv)](https://arxiv.org/abs/2103.13674) · [SWGDE, análise forense de vídeo](https://www.swgde.org/documents/published-complete-listing/18-v-001-best-practices-for-digital-forensic-video-analysis/) · [ENFSI, realce forense de imagem e vídeo](https://enfsi.eu/wp-content/uploads/2017/06/Best-Practice-Manual-for-Forensic-Image-and-Video-Enhancement.pdf) |

### 6.5 Redução de ruído temporal

| | |
| --- | --- |
| **Situação** | Proibida (spec da PR) |
| **O que faz** | Mistura o quadro atual com os anteriores para tirar ruído |
| **Algoritmo** | Média ponderada ao longo do tempo, com ou sem compensação de movimento (no FFmpeg, `hqdn3d`, `atadenoise`, `tmix`) |
| **Ganho visual** | Alto em cena parada e escura |
| **Onde roda** | Qualquer motor |
| **Custo** | Baixo a médio |
| **Risco de artefato** | Em objeto que se move, a mistura deixa um rastro que some aos poucos atrás do veículo ("ghosting"). Com compensação de movimento, o rastro diminui, mas volta quando a estimativa erra, o que acontece justo em placa, farol e chuva. O que é seguro é a limpeza espacial de um quadro só, que já está na PR (seção 5.1) |
| **Quando usar** | Não se aplica |
| **Referência oficial** | [FFmpeg, filtros](https://ffmpeg.org/ffmpeg-filters.html) · [USPTO, patente 8.743.287, rastro na filtragem temporal](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8743287) |

### 6.6 Canvas dessincronizado

| | |
| --- | --- |
| **Situação** | Não recomendada agora |
| **O que faz** | O atributo `desynchronized` no canvas 2D, WebGL ou WebGL2 pula a fila do compositor e mostra o desenho mais cedo |
| **Algoritmo** | Desenho direto na tela, sem esperar a composição da página |
| **Ganho visual** | Menos atraso entre o quadro e a tela |
| **Onde roda** | Canvas 2D, WebGL e WebGL2 |
| **Custo** | Nenhum |
| **Risco de artefato** | Pode rasgar a imagem (tearing) e não admite elemento da página por cima de canvas translúcido. O player desenha selo e controles por cima do canvas |
| **Quando usar** | Não se aplica ao player atual |
| **Referência oficial** | [Chrome, canvas de baixa latência](https://developer.chrome.com/blog/desynchronized) |
