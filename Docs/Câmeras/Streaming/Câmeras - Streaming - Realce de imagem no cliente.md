---
tags:
  - doc
  - cameras
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
atualizado: 2026-10-07
banner: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200"
---

# Câmeras - Streaming - Realce de imagem no cliente

Volta para [[Câmeras - Streaming]]. Esta nota diz o que o Attlas faz com a imagem no navegador e por quê. O
detalhe de cada técnica, inclusive das que o Attlas não usa, está em
[[Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas]]. O que só a câmera faz está em
[[Câmeras - Streaming - Qualidade de imagem na câmera]].

## Resumo

| Pergunta | Resposta |
| --- | --- |
| O que é | Um tratamento de exibição no player de câmera ao vivo: limpa o artefato de compressão, amplia o stream até o tamanho do quadro na tela, dá nitidez e, se o operador quiser, corrige tom e cor |
| Onde roda | Só no navegador da estação. A câmera, o MediaMTX, a banda e a latência não mudam, e captura de tela, analítico e exportação saem do `<video>` original |
| Como liga | A fidelidade (redução de artefato, ampliação EASU e nitidez RCAS do FSR 1) é automática com GPU de hardware, sem botão. O tom e cor é o item "Melhoria visual" do menu de configurações, ligado por padrão e lembrado no navegador |
| Em que hardware | WebGPU de hardware (até 8 players), WebGL2 de hardware (até 4) ou CPU com 8 threads ou mais (1 player, só tom e cor). Sem nenhum dos três, o item não aparece |
| Na estação de referência | Intel Core 7 150U com Chrome no Linux: sem flags, motor CPU só com tom e cor; com as flags de Vulkan, motor WebGPU com fidelidade automática ([[#Como ligar a aceleração por hardware numa estação Linux com Intel]]) |
| Sob carga ou falha | Nunca desliga sozinho: o governador desce até o nível leve, e o motor que falha é recriado ou trocado pelo próximo da cadeia |
| O que falta | A validação A/B numa estação com GPU e numa só com CPU, e os [[#Próximos passos]] |

![[Câmeras - Streaming - Realce de imagem no cliente - Antes e depois.png]]

*Quadro real da câmera da rua, em 720p. Da esquerda para a direita: original; só redução de artefato e
nitidez; com tom e cor.*

> [!warning] O terceiro quadro é mais forte que o código
> O terceiro quadro usa uma calibração de tom e cor mais forte que a do código: nele, o contraste da luma sobe 19% e
> a saturação média sobe 38%, com o brilho médio praticamente igual. Com os valores em uso ([[#Tom e cor]]), o
> ganho de cor máximo é de cerca de 1,18 vez, e o efeito na tela é menor.

## Decisões

| Decisão | O que vale | Por quê |
| --- | --- | --- |
| Lugar do realce | Só no navegador da estação, com GPU e também só com CPU | No servidor, cada stream seria decodificado, filtrado e recodificado: o custo cresce com a frota, soma latência, gasta banda e quebra o passthrough do MediaMTX. Na câmera, a melhora é configuração de equipamento e mexe no analítico |
| Tipo de filtro | Só filtro determinístico: média condicional, tabela monotônica de tom, ganho de cor que preserva o matiz, ampliação limitada aos vizinhos e nitidez por contraste | Redistribui a informação que o quadro já tem, sem inventar detalhe que pareça real, como uma placa nítida com a letra errada |
| Ordem dos passes | Limpar, corrigir tom e cor, ampliar, dar nitidez | A ordem de TVs e players: a nitidez por último não amplifica o artefato, e limpeza e tom rodam na resolução do stream, que é a mais barata |
| Fidelidade | Automática com motor de hardware, sem botão | É só exibição: o canvas fica por cima do `<video>`, que segue intacto e é a fonte de toda captura, análise e exportação |
| Tom e cor | Item "Melhoria visual", ligado por padrão; desligado pelo operador, fica desligado até ele ligar de novo | Muda a aparência da cena, então é escolha do operador |
| Calibração do tom e cor | Sutil: esticamento máximo de 1,15 vez, curva S com peso 0,08, ganho de cor 1,03 com vibrance 0,15 | A imagem parece mais limpa e com cor viva, sem cara de filtro |
| Transparência | Sem selo no badge ao vivo. A linha de estado do menu diz se o realce automático roda, em qual motor e em qual GPU | O ENFSI pede que toda operação adaptativa seja descrita junto da imagem original ([ENFSI](https://enfsi.eu/wp-content/uploads/2017/06/Best-Practice-Manual-for-Forensic-Image-and-Video-Enhancement.pdf)) |
| Carga | Nada desliga sozinho: o nível leve é o piso, e sem vaga o player mostra o vídeo nativo até a vaga liberar | Realce que some e volta parece defeito |
| Motor CPU | Só tom e cor, nos dois níveis | Redução de artefato e nitidez custam cerca de 25 ms cada em 720p contra a fatia de 8 ms por quadro |
| WebGPU e compositor | WebGPU só quando o WebGL2 da mesma estação é de hardware e não é ANGLE sobre OpenGL | Com o compositor em software ou em OpenGL, o canvas WebGPU cai preto de tempos em tempos. Medido: 7 de 14 capturas pretas com o compositor em software; 1 em cada 4 a 5 com ANGLE sobre OpenGL |
| Super-resolução por IA | Decidida como camada só de exibição, com selo de imagem gerada por IA, em estação que sustente o tempo real. Sem código; entra em PR própria | Nunca é fonte de captura, análise, ANPR ou exportação ([[Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas#Super-resolução por IA como camada de exibição\|catálogo]]) |
| O que não entra na imagem | Ver [[#O que não entra na imagem]] | Inventa ou desloca informação |

## Onde está no código

Os caminhos da tabela são relativos a `apps/web-attlas/src/app/core/shared/video-enhancement/`, salvo quando
começam por `apps/`, `libs/` ou `docs/`.

| Caminho | Papel |
| --- | --- |
| `video-enhancement.providers.ts` | Registra as estratégias de motor, a fonte de pressão da CPU e a preferência; entra no `app-module` |
| `application/video-enhancement.service.ts` | Fachada que o player conhece: motores e escolha do operador |
| `application/enhancement-engine-supervisor.ts` | Escolhe o motor, reserva a vaga, recria o motor que falha e põe a estratégia em quarentena |
| `application/enhancement-session.ts` | Uma sessão por player: laço de quadros, medidas e tamanho na tela |
| `application/player-enhancement-binding.ts` | Uma sessão por `<video>` ligado, isolando do componente a troca de vídeo |
| `domain/frame-budget-governor.ts` | Escolhe entre o nível completo e o leve |
| `domain/utils/resolve-enhancement-plan.util.ts` | Quais passes rodam, em que resolução |
| `domain/constants/enhancement-plan.constants.ts` | Perfis de passes por motor, parâmetros de tom e cor e limites da ampliação |
| `domain/constants/enhancement-tone.constants.ts` | Janela de tom, ombro e pé |
| `domain/constants/enhancement-governor.constants.ts` | Fatias do orçamento por tipo de GPU e por medida de tempo |
| `domain/constants/enhancement-session.constants.ts` | Vagas por motor, corte de 8 threads e tolerância de 500 ms do plano vazio |
| `domain/constants/enhancement-hardware.constants.ts` | Padrão de renderizador de software e tabelas de fabricante e classe de GPU |
| `infrastructure/webgpu/` | Motor WebGPU, com os shaders WGSL em `constants/webgpu-shaders.constants.ts` |
| `infrastructure/webgl2/` | Motor WebGL2, com os shaders GLSL em `constants/enhancement-shaders.constants.ts` |
| `infrastructure/cpu/` | Motor CPU: `video-enhancement.worker.ts` e `yuv-enhancement-pipeline.ts` |
| `infrastructure/browser-enhancement-preference.adapter.ts` | Escolha do tom e cor no `localStorage`, chave `web-attlas:cameras:player-tone-and-color`, valores `on` e `off`; storage bloqueado responde ligado |
| `apps/web-attlas/src/app/core/shared/components/camera-stream-player/` | O player: host do canvas e o menu de configurações com a seção "Imagem" |
| `libs/contracts/src/lib/i18n/locales/<locale>/cameras.json` | Textos, chaves `camera.detail.stream.enhancement.*` |
| `apps/web-attlas/docs/modules/cameras/atomic/UF-044-camera-player-client-image-enhancement.md` | Spec da tela (UF-044) |
| `docs/modules/cameras.md` | Regra de negócio do realce (RNF-CAM-22) |

## Cadeia de motores

Na primeira vez que um player entra em `playing`, o supervisor pergunta a cada motor, em ordem, se a estação o
comporta. O resultado vale para o app inteiro até a página recarregar. Cada motor é carregado por `import()`
dinâmico só quando a primeira sessão dele começa, então os shaders e o worker ficam fora dos bundles até lá.

```widget
src: _widgets/diagrams/streaming-motor-de-realce.html
```

| Motor | Condição exata no código | Vagas | Fidelidade automática |
| --- | --- | --- | --- |
| WebGPU | `navigator.gpu.requestAdapter({ powerPreference: 'high-performance' })` devolve um adaptador que não é fallback (`adapter.info.isFallbackAdapter` ou `adapter.isFallbackAdapter`) e cujo nome não casa com o padrão de software. Além disso, o WebGL2 da estação é de hardware e o renderizador dele não é ANGLE sobre OpenGL | 8 | sim |
| WebGL2 | `getContext('webgl2', { failIfMajorPerformanceCaveat: true })` devolve contexto, e o renderizador de `WEBGL_debug_renderer_info` não casa com `SOFTWARE_RENDERER_PATTERN` (swiftshader, llvmpipe, softpipe, lavapipe, software, basic render ou warp, sem diferenciar maiúscula) | 4 | sim |
| CPU | Existem `Worker`, `VideoFrame`, `OffscreenCanvas` e `transferControlToOffscreen`, e `navigator.hardwareConcurrency` é 8 ou mais, o mesmo corte que o Google Meet usa para efeitos no dispositivo ([Google Meet](https://support.google.com/meet/answer/10058482)) | 1 | não: só atende player com tom e cor ligado |
| Nenhum | Nada acima | 0 | - |

**WebGL de software é recusado de propósito.** SwiftShader, llvmpipe, softpipe, lavapipe e WARP desenham na CPU
fingindo ser GPU, e o motor CPU foi feito para esse caso. As duas checagens são necessárias: a partir do Chrome 141 o
fallback automático para SwiftShader não existe e, sem GPU, `getContext('webgl2')` devolve `null`; mas quem força o
SwiftShader com `--use-angle=swiftshader` recebe um contexto que não aciona o `failIfMajorPerformanceCaveat`.

**Motivo de cada recusa.** O supervisor guarda por que cada motor ficou de fora (`probeFailures`):
`API_MISSING`, `NO_ADAPTER`, `FALLBACK_ADAPTER`, `NO_CONTEXT`, `SOFTWARE_RENDERER`, `SOFTWARE_COMPOSITOR`,
`GL_INTEROP_COMPOSITOR`, `INSUFFICIENT_THREADS`, `PROBE_TIMEOUT` ou `PROBE_ERROR`.

**Perfil de hardware.** A detecção monta o perfil com motor, fabricante, classe da GPU (integrada, dedicada ou
desconhecida), arquitetura e rótulo do renderizador. No WebGPU a fonte é o `adapter.info` (por exemplo `intel` e
`gen-12lp`); no WebGL2, o renderizador desmascarado. A classe calibra o governador, e motor e fabricante aparecem no
menu, como "GPU Intel (WebGPU)".

## Motores

| Item | WebGPU | WebGL2 | CPU |
| --- | --- | --- | --- |
| Quando é usado | Adaptador de hardware e compositor na GPU | WebGL2 de hardware, com o WebGPU recusado | Sem GPU de hardware, com o item "Melhoria visual" ligado |
| Vagas | 8 players | 4 players | 1 player |
| Fidelidade automática | Sim | Sim | Não |
| Entrada do quadro | `importExternalTexture` do `<video>`, sem cópia; `copyExternalImageToTexture` quando a importação falta ou é recusada | `texImage2D` aloca a textura quando o tamanho muda, e `texSubImage2D` envia cada quadro direto do `<video>`, sem passar pela CPU | `new VideoFrame(video)`, transferido ao worker sem cópia; no worker, `copyTo` para um buffer reaproveitado. São duas cópias por quadro: a leitura e a montagem do quadro realçado |
| Passes | WGSL, fragment shader; intermediários em `rgba16float` reaproveitados; pipelines compilados na montagem por `createRenderPipelineAsync`, então shader que não compila falha a criação e não o quadro | GLSL ES 3.00, fragment shader; dois framebuffers `RGBA8` alternados, e o último passe desenha no canvas | JavaScript no worker, sobre os planos I420, I420A, I422, I444 ou NV12 |
| Saída | Canvas `webgpu` no formato de `getPreferredCanvasFormat()`, opaco | Canvas WebGL2 com `desynchronized: false` | `VideoFrame` novo desenhado num `OffscreenCanvas` transferido do canvas do player. Nunca amplia: o compositor do navegador estica |
| Medida de tempo | `timestamp-query` no início do primeiro passe e no fim do último, quando o adaptador oferece; senão, relógio do JavaScript | `EXT_disjoint_timer_query_webgl2`: consulta `TIME_ELAPSED_EXT` lida alguns quadros depois e descartada quando a GPU marca o intervalo como disjunto; senão, relógio do JavaScript | Relógio do JavaScript |
| Janela de tom | Cópia de 64x36 do quadro desenhada pela GPU e lida com `mapAsync` fora do laço de quadros, a cada 4 quadros | Cópia de 64x36 lida por canvas 2D (`getImageData`), a cada 4 quadros | Histograma da luma com uma amostra a cada 2 colunas e 2 linhas, a cada 4 quadros. A faixa nominal vem de `VideoFrame.colorSpace.fullRange` |
| Teto de stream | Nenhum | Nenhum | 921.600 pixels (1280x720). Acima, espera: percorrer um quadro 1080p em JavaScript custa de 10 a 20 ms num desktop |
| Falha que derruba o motor | `GPUDevice.lost`, evento `uncapturederror`, quadro ilegível, quadro que não termina em 1 s | Contexto perdido (`webglcontextlost`), quadro ilegível (vídeo de outra origem sem CORS) | Worker que falha, quadro que não volta em 1 s, quadro ilegível, formato de pixel sem plano de luma |
| Timeouts | Adaptador 3 s, device 3 s, pipelines 5 s, quadro 1 s | - | Quadro 1 s |
| Recurso por player | Um `GPUDevice` | Um contexto WebGL2. Acima de 16 na página, o Chromium derruba o mais antigo | Um worker |
| Código | `infrastructure/webgpu/` | `infrastructure/webgl2/` | `infrastructure/cpu/` |

**Custo medido no motor CPU**, em 720p na estação de referência (Intel Core 7 150U, 12 threads), em JavaScript
já aquecido:

| Passe | Custo por quadro |
| --- | --- |
| Redução de artefato | 24 ms |
| Nitidez | 25 ms |
| Tom e cor | 4,4 ms |
| Fatia do realce na CPU a 25 fps | 8 ms |

Só o tom e cor cabe na fatia, e por isso o perfil da CPU roda só ele. A redução de artefato e a nitidez existem no
worker, na luma, e o perfil não as liga. Numa estação só com CPU o player recebe H.264, porque o Chrome só decodifica
H.265 com hardware ([[Câmeras - Streaming - Codecs]]).

### APIs do navegador que o realce usa

| API | Papel no realce | Documentação oficial |
| --- | --- | --- |
| WebGPU | Motor WebGPU: adaptador, device, pipelines, `importExternalTexture`, `timestamp-query`, `mapAsync` | [W3C WebGPU](https://www.w3.org/TR/webgpu/) · [W3C WebGPU, GPUAdapterInfo](https://www.w3.org/TR/webgpu/#gpuadapterinfo) · [MDN WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) |
| WGSL | Linguagem dos shaders do WebGPU | [W3C WGSL](https://www.w3.org/TR/WGSL/) |
| WebGL2 | Motor WebGL2 | [Especificação WebGL 2.0](https://registry.khronos.org/webgl/specs/latest/2.0/) · [MDN WebGL2RenderingContext](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext) |
| GLSL ES 3.00 | Linguagem dos shaders do WebGL2 | [Especificação GLSL ES 3.00 (PDF)](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf) |
| `failIfMajorPerformanceCaveat` | Recusa contexto WebGL lento demais | [Especificação WebGL 1.0, atributos de contexto](https://registry.khronos.org/webgl/specs/latest/1.0/) · [MDN getContext](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext) |
| `WEBGL_debug_renderer_info` | Nome do renderizador, para recusar software e achar o fabricante | [Khronos](https://registry.khronos.org/webgl/extensions/WEBGL_debug_renderer_info/) · [MDN](https://developer.mozilla.org/en-US/docs/Web/API/WEBGL_debug_renderer_info) |
| `WEBGL_lose_context` e `webglcontextlost` | Libera o contexto de teste; contexto perdido conta como falha do motor | [Khronos](https://registry.khronos.org/webgl/extensions/WEBGL_lose_context/) · [MDN webglcontextlost](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event) |
| `texImage2D` e `texSubImage2D` | Quadro do `<video>` como textura no WebGL2 | [MDN texImage2D](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texImage2D) · [MDN texSubImage2D](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texSubImage2D) |
| `EXT_disjoint_timer_query_webgl2` | Tempo de GPU dos passes no WebGL2 | [Khronos](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/) |
| Canvas 2D `getImageData` | Leitura da cópia de 64x36 para a janela de tom no WebGL2 | [MDN getImageData](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData) · [HTML, canvas](https://html.spec.whatwg.org/multipage/canvas.html) |
| Web Worker | Os filtros da CPU rodam fora da thread da tela | [HTML, Workers](https://html.spec.whatwg.org/multipage/workers.html) · [MDN, objetos transferíveis](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects) · [Angular, web workers](https://angular.dev/ecosystem/web-workers) |
| WebCodecs `VideoFrame` | Captura o quadro e o transfere ao worker sem cópia; `copyTo` lê os pixels | [W3C WebCodecs](https://www.w3.org/TR/webcodecs/) · [MDN VideoFrame](https://developer.mozilla.org/en-US/docs/Web/API/VideoFrame) · [MDN copyTo](https://developer.mozilla.org/en-US/docs/Web/API/VideoFrame/copyTo) |
| `OffscreenCanvas` | O canvas do player é entregue ao worker, que desenha nele direto | [MDN transferControlToOffscreen](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen) · [MDN OffscreenCanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvasRenderingContext2D) |
| `navigator.hardwareConcurrency` | Corte de 8 threads do motor CPU | [HTML](https://html.spec.whatwg.org/multipage/workers.html#dom-navigator-hardwareconcurrency) · [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/hardwareConcurrency) |
| `requestVideoFrameCallback` | O laço de realce processa um quadro por aviso, um por vez | [WICG](https://wicg.github.io/video-rvfc/) · [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback) |
| `getVideoPlaybackQuality` | Contador de quadros descartados pelo navegador, que o governador lê | [W3C](https://w3c.github.io/media-playback-quality/) · [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/getVideoPlaybackQuality) |
| Compute Pressure (`PressureObserver`) | `serious` e `critical` limitam ao nível leve | [W3C](https://www.w3.org/TR/compute-pressure/) · [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Compute_Pressure_API) · [Chrome](https://developer.chrome.com/docs/web-platform/compute-pressure) |
| `ResizeObserver` e `devicePixelRatio` | Tamanho real do quadro na tela, em pixels físicos: decide ampliação, espera e tamanho do canvas | [W3C ResizeObserver](https://www.w3.org/TR/resize-observer/) · [MDN ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) · [MDN devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio) |
| `import()` dinâmico | O motor só baixa quando a primeira sessão dele começa | [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) |
| Signals do Angular | Estado do item, do nível, do perfil de hardware e da capacidade detectada | [Angular](https://angular.dev/guide/signals) |

## Os passes de imagem

São quatro, sempre nesta ordem. Cada um no mesmo modelo: o que faz, como o Attlas faz, quando roda e onde fica o
detalhe do algoritmo.

### Redução de artefato

| | |
| --- | --- |
| **O que faz** | Alisa o chuvisco de compressão e o contorno fantasma em área lisa, sem borrar a borda dos objetos |
| **Como o Attlas faz** | Filtro sigma de Lee 3x3 em RGB, decidido pela luma BT.709: vizinho com luma a até 0,035 (escala de 0 a 1) da luma do centro entra na média; o resto é borda e fica fora |
| **Resolução** | Do stream |
| **Quando roda** | Nível completo, nos motores WebGPU e WebGL2 |
| **Algoritmo e custo** | [[Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas#Redução de artefato por sigma de Lee\|catálogo]] |

### Tom e cor

| | |
| --- | --- |
| **O que faz** | Devolve o contraste que a câmera perde com névoa, contraluz ou exposição baixa, e a cor apagada, sem estourar a cor que já é forte |
| **Janela de tom** | O histograma da luma dá a faixa que a cena usa, deixando de fora 0,5% das amostras de cada lado. A janela nunca estica a faixa mais que 1,15 vez (`TONE_MAX_STRETCH`), porque cena escura ou chapada esticada além disso só aumenta o ruído. É medida a cada 4 quadros e suavizada: cada medida move a janela 10% da diferença (`TONE_WINDOW_SMOOTHING`), para a imagem não pulsar quando um farol cruza a cena |
| **Curva** | A luma é esticada da janela para a faixa nominal (16 a 235 em faixa limitada) e dobrada por uma curva S de `smoothstep` com peso 0,08 (`ENHANCEMENT_CONTRAST`). A curva é monotônica: nenhum nível troca de lugar com outro |
| **Pontas suaves** | Acima de 0,9 (`TONE_SHOULDER_KNEE`) e abaixo de 0,08 (`TONE_TOE_KNEE`), o que a janela empurraria para fora da faixa volta para dentro por um ombro e um pé de Hermite cúbico monotônico, com inclinação de saída de no máximo 3 (`TONE_KNEE_MAX_SLOPE`). Um nível que a câmera não deixou no branco nunca vira branco, e o reflexo de sol em vidro e cromado guarda a gradação. Com a janela cheia, a curva é a identidade |
| **Cor** | Cada cor se afasta do cinza por um ganho de `1,03 x (1 + 0,15 x (1 - m))` (`ENHANCEMENT_SATURATION` e `ENHANCEMENT_VIBRANCE`), em que `m` é a saturação da própria cor, de 0 a 1. Cor apagada ganha até cerca de 1,18 vez; cor forte ganha 1,03 vez. Cb e Cr sobem pelo mesmo fator, então o matiz não muda, e a cor que sairia da faixa válida volta na mesma direção, sem corte por canal |
| **Resolução** | Do stream |
| **Quando roda** | Com o item "Melhoria visual" ligado, nos dois níveis e nos três motores. Na CPU, por tabelas sobre Y, Cb e Cr; na GPU, num shader sobre RGB, em que multiplicar RGB menos a luma multiplica Cb e Cr pelo mesmo fator |
| **Algoritmo e custo** | [[Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas#Tom e cor pela janela da cena\|catálogo]] |

### Ampliação

| | |
| --- | --- |
| **O que faz** | Leva o stream ao tamanho real do quadro na tela, para o navegador não esticar com o filtro simples dele |
| **Como o Attlas faz** | EASU do FSR 1 da AMD (licença MIT), portado do `ffx_fsr1.h` no caminho de 32 bits, com as aproximações de recíproco e de raiz inversa do `ffx_a.h`. Lê os 12 texels um a um em vez de `textureGather`, com o mesmo resultado |
| **Quando roda** | Só quando a tela é pelo menos 10% maior que o stream (`UPSCALE_MIN_RATIO`), com fator máximo de 2 por eixo e saída de no máximo 2560x1440 em pixels totais, não por eixo. Acima disso, o compositor do navegador escala |
| **Motores** | WebGPU e WebGL2. A CPU nunca amplia |
| **Algoritmo e custo** | [[Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas#AMD FidelityFX FSR 1, EASU e RCAS\|catálogo]] |

### Nitidez

| | |
| --- | --- |
| **O que faz** | Aumenta o contraste nas bordas sem estourar o branco ou o preto e reforçando menos o ruído |
| **Como o Attlas faz** | RCAS do FSR 1 em cruz de 5 amostras, amortecido onde o centro parece ruído. Força de 1 stop (0,5) no nível completo e 2 stops (0,25) no leve |
| **Resolução** | Da tela, como último passe |
| **Quando roda** | Sempre que há sessão nos motores WebGPU e WebGL2 |
| **Por que não o CAS** | O quadro decodificado chega em gamma. O RCAS foi feito para entrada perceptual, e o CAS, que espera luz linear, exagera a nitidez nessa entrada |
| **Algoritmo e custo** | [[Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas#AMD FidelityFX FSR 1, EASU e RCAS\|catálogo]] |

### Quais passes rodam em cada caso

| Motor e nível | Redução de artefato | Tom e cor | Ampliação | Nitidez |
| --- | --- | --- | --- | --- |
| WebGPU ou WebGL2, completo | sim | com o item ligado | quando cabe | 1 stop |
| WebGPU ou WebGL2, leve | não | com o item ligado | quando cabe | 2 stops |
| CPU, completo | não | com o item ligado | não | não |
| CPU, leve | não | com o item ligado | não | não |

**Espera** (nenhum passe; o vídeo aparece como veio):

- o quadro na tela ocupa até metade do stream em cada eixo (`DOWNSCALE_STANDBY_RATIO`). Num mosaico 4x4 em 1080p
  cada célula tem cerca de 480x270, e a própria redução de tamanho já filtra bloco e ruído;
- o motor é CPU e o stream passa de 1280x720;
- ainda não chegou quadro.

**Sem piscar.** O canvas entra e sai com esmaecimento de 160 ms (`ENHANCEMENT_FADE_MS`). Um plano que fica vazio por
um instante (resize, um quadro estranho) mantém o anterior por 500 ms (`ENHANCEMENT_STANDBY_GRACE_MS`) antes de dar
lugar ao vídeo original. O canvas herda o `object-fit` do host, que o CSS do player mantém igual ao do `<video>`:
`cover` na célula, `contain` em tela cheia.

## Governador e níveis

O `FrameBudgetGovernor` olha janelas de 30 quadros e escolhe entre dois níveis, **completo** e **leve**. O leve é o
piso: o governador nunca desliga o realce.

| Situação na janela | O que acontece |
| --- | --- |
| O processamento no percentil 90 passa da fatia do intervalo entre quadros (a fatia multiplica a mediana do intervalo da janela) | A janela conta acima do orçamento |
| Menos de 95% dos quadros apresentados saíram realçados | A janela conta acima do orçamento |
| O navegador descartou mais de 1 quadro na janela | A janela conta acima do orçamento |
| 2 janelas seguidas acima do orçamento | Desce do completo para o leve e conta uma falha. No leve, nada muda |
| `5 x (falhas + 1)` janelas seguidas com folga (processamento até metade da fatia e nenhum descarte) | Sobe do leve para o completo. Folga sustentada no completo zera as falhas |
| Compute Pressure `serious` ou `critical` | Teto no nível leve, sem esperar a janela fechar |

Nível inicial: completo nos motores de GPU; leve na CPU, onde os dois níveis são iguais.

**Fatia do orçamento** (`GPU_BUDGET_RATIO`, aplicada por `gpuGovernorConfigFor`), em porcentagem do intervalo entre
quadros e em milissegundos a 25 fps:

| Medida de tempo | GPU integrada (Intel, Apple, Adreno, Mali, APU AMD) | GPU dedicada (NVIDIA, Radeon RX, Intel Arc) | Desconhecida |
| --- | --- | --- | --- |
| Timer da GPU (`timestamp-query`, `EXT_disjoint_timer_query_webgl2`) | 15% (6 ms) | 10% (4 ms) | 12% (4,8 ms) |
| Relógio do JavaScript | 35% (14 ms) | 25% (10 ms) | 30% (12 ms) |
| Motor CPU | 20% (8 ms) | - | - |

O relógio do JavaScript leva a fatia mais folgada porque mede também o envio do quadro, que o ANGLE sobre Vulkan numa
GPU integrada Intel segura por vários milissegundos. Na CPU a fatia é menor porque, sem GPU, o decode e o compositor
do navegador também rodam na CPU.

**Compute Pressure sem foco.** O Chrome só entrega leitura de pressão quando a janela tem o foco do sistema, está em
picture-in-picture ou captura mídia. Numa tela de videowall sem foco o sinal some, e quem decide é o governador por
quadro.

## Falhas e recuperação

Nenhuma falha de motor chega ao player como exceção, e nenhuma desliga o realce. O tom e cor continua ligado durante a
recuperação.

| Falha | Motivo tipado | Resultado |
| --- | --- | --- |
| Estação sem motor | Motivo de cada motor em `probeFailures` | Sem item, vídeo original |
| Detecção de um motor que não responde em 5 s (`ENGINE_PROBE_TIMEOUT_MS`) | `PROBE_TIMEOUT` | Motor fora da cadeia |
| Adaptador WebGPU fallback ou de software | `FALLBACK_ADAPTER`, `SOFTWARE_RENDERER` | Motor fora da cadeia |
| Contexto negado ou shader que não compila | `CONTEXT_UNAVAILABLE` | Quarentena e próximo motor |
| Motor que não fica pronto em 15 s (`ENGINE_CREATE_TIMEOUT_MS`) | `TIMED_OUT` | Quarentena e próximo motor; o motor que chega depois é descartado |
| Contexto WebGL ou `GPUDevice` perdido durante o uso | `CONTEXT_LOST` | Recria uma vez; se falhar de novo, quarentena e próximo motor |
| Erro de validação do WebGPU (`uncapturederror`) | `CONTEXT_UNAVAILABLE` | Recria uma vez; de novo, quarentena |
| Quadro da GPU que não termina em 1 s | `TIMED_OUT` | Recria uma vez; de novo, quarentena |
| Quadro que não pode ser lido (vídeo de outra origem sem CORS) | `FRAME_UNREADABLE` | Recria uma vez; de novo, quarentena |
| Formato de pixel sem plano de luma | `UNSUPPORTED_PIXEL_FORMAT` | Recria uma vez; de novo, quarentena |
| Worker que falha | `WORKER_FAILED` | Recria uma vez; de novo, quarentena |
| Quadro que não volta do worker em 1 s | `TIMED_OUT` | Recria o worker uma vez; de novo, quarentena |

**Quarentena.** O motor fica fora por `min(300 s, 30 s x 2^(falhas - 1))`: 30 s, 60 s, 120 s, 240 s e 300 s em
diante (`ENGINE_QUARANTINE_BASE_MS`, `ENGINE_QUARANTINE_BACKOFF_FACTOR`, `ENGINE_QUARANTINE_MAX_MS`). Ao fim dela, o
player volta para o motor melhor.

**Fim da sessão.** Fechar o player, ou o player sair de `playing`, encerra o worker, libera o contexto, remove o
canvas e devolve a vaga.

## O que o operador vê

- O menu de configurações (engrenagem, ao lado da tela cheia) tem a seção "Imagem". A engrenagem aparece também em
  câmera sem escolha de resolução, só com essa seção.
- Na seção, uma linha de estado (`role="status"`) diz se o realce automático roda e em qual motor e GPU, com ponto
  verde só quando ativo. Estados: ativo, em espera sem ganho no tamanho, aguardando vaga, nova tentativa, iniciando,
  entra quando o vídeo tocar, e sem realce automático na estação (só CPU, só tom e cor).
- Abaixo, o item "Melhoria visual" (`role="menuitemcheckbox"`) liga e desliga o tom e cor. O estado ligado vem do
  `aria-checked`; a frase de estado fica no `aria-description` e no `title`.
- O badge ao vivo não anuncia o realce.
- Sem vaga, o player mostra o vídeo nativo, sem aviso, e entra sozinho quando a vaga libera, na ordem de chegada.
- O realce nunca mostra aviso de erro.
- **Evidência**: captura de tela, analítico, ANPR e exportação saem sempre do `<video>` original. O canvas realçado é
  só exibição.

## O que não entra na imagem

O princípio é um só: o realce redistribui a informação que o quadro já tem e não acrescenta nenhuma. O detalhe de cada
item está no catálogo.

| Técnica | Situação | Por quê |
| --- | --- | --- |
| Super-resolução por rede neural | Proibida na imagem tratada; decidida só como camada de exibição com selo, sem código | A rede prevê detalhe a partir de imagens de treino, e numa placa isso troca B por 8 e S por 5 ([[Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas#Super-resolução por IA como camada de exibição\|catálogo]]) |
| Reconstrução por banco de padrões | Proibida | Cola detalhe aprendido de outras imagens ([[Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas#Reconstrução por banco de padrões\|catálogo]]) |
| Inverse tone mapping | Proibido | Inventa brilho em realce e sombra que o sensor não registrou ([[Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas#Inverse tone mapping\|catálogo]]) |
| Redução de ruído temporal | Proibida | Mistura quadros e deixa rastro atrás do veículo ([[Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas#Redução de ruído temporal\|catálogo]]) |
| Grão sintético | Proibido | Textura aleatória que a câmera não gravou ([[Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas#Grão sintético\|catálogo]]) |
| Interpolação de quadros | Fora do código; a spec não a cita, e a recomendação ao dono é incluí-la nas proibições | Mostra o veículo numa posição e num instante que a câmera nunca gravou ([[Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas#Interpolação de quadros\|catálogo]]) |
| Balanço de branco, brilho e gama manuais | Fora do código | O contraste vem da medida da cena, não de um controle do operador. O balanço de branco automático com teto está nos [[#Próximos passos]] |
| CSS `filter` | Não usado | Aplica brilho, contraste e saturação fixos, sem medir a cena, e não amplia nem dá nitidez ([MDN CSS filter](https://developer.mozilla.org/en-US/docs/Web/CSS/filter)) |

> [!warning] A regra de negócio ainda fecha a porta da IA
> A spec da tela registra a decisão de liberar a super-resolução por IA como camada de exibição com selo. A regra de
> negócio em `docs/modules/cameras.md` ainda diz que super-resolução generativa não entra na imagem ao vivo. A regra
> precisa ser atualizada antes da implementação.

## Desempenho e aceleração por hardware

Os tempos de GPU desta seção são estimativa na Iris Xe da estação, pelo método do
[[Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas#Como os custos foram estimados|catálogo]].

### Onde o tempo vai

| Ponto | Como está no código | O que ainda dá para ganhar |
| --- | --- | --- |
| Entrada do quadro na GPU | WebGL2 copia o quadro do `<video>` para a textura com `texSubImage2D`. WebGPU usa `importExternalTexture`, sem cópia | Nada no WebGPU. A textura importada de um `<video>` expira quando é usada num bind group ou ao fim da tarefa de JavaScript; a de um `VideoFrame` dura até o quadro ser fechado. `copyExternalImageToTexture` faz cópia e só vale quando a textura precisa durar mais |
| Leitura de volta para a CPU | WebGL2 lê 64x36 pixels por `getImageData` a cada 4 quadros, o que obriga a GPU a terminar o que estava fazendo e mandar o dado de volta (a MDN chama isso de "finish mais ida e volta"). WebGPU lê com `mapAsync`, que não trava | Histograma e janela de tom num compute shader no WebGPU, sem sair da GPU; no WebGL2, leitura por buffer de pixels com `fenceSync`, assíncrona ([[#Próximos passos\|item 2]]) |
| Número de passes | Quatro passes, cada um lendo e escrevendo uma imagem inteira. Só de memória, o piso é de 0,12 a 0,18 ms em 720p e de 0,28 a 0,42 ms em 1080p por passe | Fundir a redução de artefato com o tom e cor num passe na resolução do stream, e o EASU com o RCAS num compute shader que guarda o bloco e a borda de 1 pixel na memória do grupo (item 4) |
| Resolução | Limpeza e tom na resolução do stream, ampliação uma vez, nitidez por último | Nada |
| Precisão | WebGPU guarda os intermediários em `rgba16float`. O recurso `shader-f16` é detectado e não é pedido ao device | Meia precisão pelo `shader-f16` (Chrome 120). O FSR 1 e o NIS têm caminho oficial em meia precisão (item 4) |
| Medida de tempo | `timestamp-query` no WebGPU e `EXT_disjoint_timer_query_webgl2` no WebGL2; sem eles, relógio do JavaScript com fatia mais folgada | No Chrome o `timestamp-query` vem arredondado a 100 µs, a menos que a flag de recursos de desenvolvedor esteja ligada; 100 µs bastam para fatias de 4 a 6 ms |
| Contextos | Um contexto WebGL2 e um `GPUDevice` por player. Acima de 16 contextos WebGL na página, o Chromium derruba o mais antigo ("Too many active WebGL contexts") | Um `GPUDevice` para todos os players configura quantos canvas forem precisos e tira o motivo técnico do teto de vagas; o orçamento continua valendo. Device perdido derruba todos de uma vez, então a recuperação recria o device e reata os canvas (item 3) |
| Compute ou fragment | Todos os passes são fragment shader, que serve para filtro por pixel que lê vizinhos pelo cache de textura | Compute shader para histograma com atômicos, para filtro que reaproveita leitura entre pixels vizinhos (EASU, NIS) e para passes fundidos. O NIS só existe em compute. Não há guia oficial do W3C nem do Chrome sobre essa escolha; é o padrão dos SDKs da AMD e da NVIDIA |
| CPU com WebAssembly SIMD | Filtros em JavaScript | SIMD de 128 bits, ligado por padrão a partir do Chrome 91. Para os filtros da luma, estimativa de 2 a 4 vezes mais rápido (item 7) |
| CPU com várias threads | Um worker por player | WebAssembly com threads exige isolamento de origem no app inteiro (`Cross-Origin-Opener-Policy: same-origin` e `Cross-Origin-Embedder-Policy: require-corp`), o que obriga todo recurso de terceiro, como os tiles do mapa, a responder com CORP ou CORS. A saída sem esse custo é dividir o quadro entre 2 a 4 workers comuns, com buffers transferidos (item 7) |
| `MediaStreamTrackProcessor` | O quadro sai do `<video>` | Entrega os quadros do WebRTC como `VideoFrame`, direto da faixa. A spec expõe só em worker dedicado; o Chrome expõe também na janela, fora da spec; o Safari 18 tem; o Firefox não. Prioridade baixa: o `<video>` continua necessário para a evidência, e duas fontes de quadro podem sair de passo |
| Compute Pressure | `serious` e `critical` limitam ao nível leve | Chrome 125, só a fonte `cpu`, e só com foco do sistema ([[#Governador e níveis]]) |
| Long Animation Frames | Não é lido pelo código | Chrome 123: quadro de animação acima de 50 ms. É a régua da [[#Validação]] |

### WebGPU no Chrome do Linux

- O Chrome 144 começou a ligar o WebGPU no Linux por padrão, primeiro em GPU Intel Gen12 ou mais nova, com AMD e
  NVIDIA no plano. Nessa arquitetura, o WebGPU usa Vulkan e o resto do Chromium fica no OpenGL. A tabela do grupo do
  WebGPU registra Intel Gen12 ou mais nova a partir do 144 e NVIDIA (driver 535.183.01 ou mais novo) no Wayland a
  partir do 147. As outras GPUs dependem de flag.
- A página de dicas do Chrome ainda chama o Linux de experimental e manda ligar `#enable-unsafe-webgpu` e
  `#enable-vulkan`. Ela é mais antiga que o anúncio do 144.
- **Na estação de referência o padrão não vale**, mesmo sendo Gen12 (Iris Xe, `gen-12lp`, Mesa ANV, Chrome 150): sem
  flag, não há adaptador WebGPU e o WebGL2 é de software, então o realce fica no motor CPU. A causa não está
  confirmada; como o Chrome não cai mais sozinho no SwiftShader para WebGL, vale conferir em `chrome://gpu` a linha de
  comando com que o Chrome está sendo aberto.
- Com `--enable-unsafe-webgpu` sozinho, aparece só o adaptador de reserva por software (`google`, `swiftshader`), que o
  motor WebGPU recusa. Com as flags da seção seguinte, aparecem WebGL2 de hardware (ANGLE sobre Vulkan) e WebGPU de
  hardware (`intel`, `gen-12lp`), e o realce roda no WebGPU.
- Com ANGLE sobre OpenGL, o Chrome compõe a página em GL e leva o WebGPU, que roda em Vulkan, por interop GL. O motor
  WebGPU recusa esse caso (`GL_INTEROP_COMPOSITOR`), e o WebGL2 assume com os mesmos passes.
- O `adapter.info` é síncrono a partir do Chrome 127. O `isFallbackAdapter` foi para dentro do `GPUAdapterInfo` no
  Chrome 136, e o atributo antigo, no `GPUAdapter`, foi descontinuado no 138. O motor lê os dois.

### Como ligar a aceleração por hardware numa estação Linux com Intel

1. **Conferir o básico.** Em `chrome://settings/system`, "Usar aceleração de gráficos quando disponível" ligado. Em
   estação gerenciada, a política `HardwareAccelerationModeEnabled` não pode estar em falso. Essa política só desliga
   a aceleração; não liga nada.
2. **Ligar as flags.** As quatro abaixo são as que funcionaram na estação de referência. No GNOME com Wayland, somar
   `--ozone-platform=x11`: no Wayland o Vulkan da composição falha a cada quadro de vídeo
   (`SharedImageManager::ProduceSkia ... CompoundImageBacking`).

   | Flag de linha de comando | Entrada em `chrome://flags` | O que faz |
   | --- | --- | --- |
   | `--use-angle=vulkan` | não confirmada | Faz o ANGLE, a camada que leva o WebGL até a GPU, usar Vulkan em vez de OpenGL. Na estação de referência, o caminho por OpenGL não inicializa |
   | `--enable-features=Vulkan` | `#enable-vulkan` | Liga o Vulkan na pilha de GPU do Chrome |
   | `--enable-unsafe-webgpu` | `#enable-unsafe-webgpu` | Desliga a lista de bloqueio de adaptadores do WebGPU, e o Chrome passa a expor o WebGPU em configuração que ainda não validou. Sozinha, só entrega o adaptador de software |
   | `--ignore-gpu-blocklist` | `#ignore-gpu-blocklist` | Ignora a lista de GPUs que o Chrome manda para software |

   Se o processo de GPU travar com o Vulkan ligado, a correção relatada no grupo do WebGPU é somar `VulkanFromANGLE`
   e `DefaultANGLEVulkan` ao `--enable-features`. A receita do grupo para GPU fora do padrão também força
   `--ozone-platform=x11`.
3. **Decode de vídeo por hardware (VA-API).** Sem ele, o H.264 é decodificado na CPU e disputa com o realce, e o
   player fica em H.264, porque o Chrome só decodifica H.265 com hardware. A documentação do Chromium liga o decode
   com a feature `AcceleratedVideoDecodeLinuxZeroCopyGL` e, no caminho Vulkan, soma `VaapiIgnoreDriverChecks` às
   features do Vulkan. O nome muda entre versões: segundo o ArchWiki, era `VaapiVideoDecodeLinuxGL` até o Chromium
   130 e passou a `AcceleratedVideoDecodeLinuxGL` no 131. A própria documentação diz que VA-API no Linux não tem
   suporte oficial. **Não testado na estação de referência.**
4. **Juntar tudo numa linha.** O Chrome só lê o último `--enable-features` da linha de comando, então as features vão
   todas separadas por vírgula num só. Exemplo, a conferir na versão em uso:

   ```bash
   google-chrome \
     --ozone-platform=x11 \
     --use-angle=vulkan \
     --enable-features=Vulkan,VulkanFromANGLE,DefaultANGLEVulkan,AcceleratedVideoDecodeLinuxZeroCopyGL,VaapiIgnoreDriverChecks \
     --enable-unsafe-webgpu \
     --ignore-gpu-blocklist
   ```

5. **Deixar fixo.** Três jeitos: pelo `chrome://flags`, que grava no perfil e vale para as flags que têm entrada lá;
   pela linha `Exec=` de um atalho `.desktop` (em `~/.local/share/applications/` para um usuário, ou uma cópia do
   `google-chrome.desktop` do sistema); ou por um script que abre o Chrome. O `chrome-flags.conf` é convenção do
   pacote do Arch, não do Chrome oficial. A política gerenciada do Chrome no Linux fica em
   `/etc/opt/chrome/policies/managed/`.
6. **Conferir.** Em `chrome://gpu`: "WebGL: Hardware accelerated", "WebGPU: Hardware accelerated" e "Video Decode:
   Hardware accelerated", e, para codecs, "Video Acceleration Information". No sistema, `vainfo` lista os perfis de
   decode da GPU. No player, a linha de estado do menu deve dizer "Realce automático ativo, GPU Intel (WebGPU)". O
   `chrome://media-internals` mostra qual decodificador o player usou.

> [!caution] Flags que tiram trava
> `--enable-unsafe-webgpu` e `--ignore-gpu-blocklist` desligam proteções que o Chrome mantém para driver não
> validado. O risco é travar o processo de GPU ou desenhar errado. Valem para estação controlada, com o modelo de
> máquina e o driver conferidos, e não para qualquer máquina.

## Próximos passos

Ordem sugerida para o dono decidir. Ganho, custo e risco em três níveis: baixo, médio e alto. O detalhe de cada técnica
está no [[Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas|catálogo]].

| # | O que | Ganho | Custo | Risco | Como está hoje |
| --- | --- | --- | --- | --- | --- |
| 1 | Configurar as estações: aceleração por hardware ligada (WebGPU, WebGL2 e decode VA-API) e super-resolução do driver desligada nas estações Windows | Alto: tira a estação do motor CPU e liga a fidelidade automática e o H.265 | Baixo: configuração, sem código | Médio: flags que tiram trava do Chrome | Configuração por estação ([[#Como ligar a aceleração por hardware numa estação Linux com Intel]]) |
| 2 | Histograma e janela de tom na GPU, sem leitura de volta | Médio: acaba a sincronização entre GPU e CPU a cada 4 quadros | Baixo | Baixo | O WebGPU já lê com `mapAsync`, sem travar; o WebGL2 lê com `getImageData` |
| 3 | Um `GPUDevice` para todos os players | Alto em mosaico e videowall | Médio | Médio: device perdido derruba todos os players | O timer de GPU já existe nos dois motores; o device é um por player |
| 4 | Menos passes e meia precisão: limpeza com tom e cor num passe, EASU com RCAS num compute, `shader-f16` | Médio: menos banda de memória, que limita a GPU integrada | Médio | Baixo | Quatro passes separados; `shader-f16` detectado e não usado |
| 5 | Faixa e matriz de cor corretas por câmera, com valor manual que vence a detecção | Alto onde acontece: é cor errada, não falta de realce | Baixo | Baixo a médio: detecção errada piora câmera certa | Só a CPU lê `fullRange`, para a janela de tom |
| 6 | Limiar da limpeza guiado pelo QP do WebRTC | Médio | Baixo | Baixo | Limiar fixo em 0,035 |
| 7 | Motor CPU em WebAssembly SIMD, com o quadro dividido entre workers, para o sigma de Lee e o RCAS. O EASU fica fora da CPU | Alto na estação só CPU: a fidelidade, que hoje não roda nela, pode passar a caber perto dos 8 ms | Médio a alto | Baixo | Sigma de Lee e RCAS em JavaScript na luma, desligados |
| 8 | Deband com pontilhado de meio nível, sem grão, e tom calculado em ponto flutuante | Médio em céu, asfalto e cena noturna | Baixo | Médio: limiar alto apaga detalhe, e o pontilhado fica ao lado da proibição de grão | Sem código |
| 9 | Balanço de branco automático com teto de ganho e mudança lenta | Médio | Baixo | Médio: mexe na cor de semáforo e de veículo | Sem código |
| 10 | Movimento regular: monitor da estação em frequência múltipla do fps da frota, e alvo do buffer de jitter só na câmera que engasga | Médio | Baixo | Baixo na imagem; atraso maior no PTZ | Sem código |
| 11 | Contraste local (CLAHE leve na luma), só no WebGPU | Médio a alto em contraluz e sombra | Médio | Médio: ruído e cintilação | Sem código |
| 12 | Dehaze condicional por dark channel prior, só com névoa medida e de dia | Alto em neblina, nulo no resto | Alto | Alto: carro branco, céu e noite | Sem código |

**Por que nesta ordem.**

- O item 1 vem antes de tudo: sem aceleração ligada, a estação Linux de referência fica no motor CPU e o resto não
  chega a valer.
- Os itens 2 a 4 são a base de desempenho do motor WebGPU. São baratos e não mudam a imagem.
- Os itens 5 e 6 corrigem e calibram sem acrescentar nada à imagem.
- O item 7 é o único que melhora a estação sem GPU.
- Os itens 8 e 9 mexem em textura e cor, e por isso pedem decisão do dono.
- O item 10 é configuração.
- Os itens 11 e 12 são os mais caros e os de maior risco de artefato.

**Fora da lista, de propósito.**

- Upscale na NPU pela WebNN: a estação não tem NPU, e o Chrome no Linux não chega a NPU nenhuma.
- EASU na CPU: de 17 a 55 ms por quadro mesmo com WebAssembly SIMD e 4 workers.
- NIS, GSR, Lanczos e EWA: fazem o papel do EASU, que já está no código.
- RAVU, interpolação de quadros e redução de ruído temporal: proibidos.
- `MediaStreamTrackProcessor` e croma guiado pela luma: ganho pequeno para o custo de hoje.

**Decidido, fora da ordem.** Super-resolução por IA como camada só de exibição, com selo, em PR própria, com modelo
de licença aberta carregado sob demanda ([[#O que não entra na imagem]]).

**Ideia registrada, sem código.** Usar o realce também na imagem e no vídeo de incidente guardados no servidor, só na
exibição, com o arquivo guardado intacto. A sessão hoje exige um `<video>` tocando com `requestVideoFrameCallback`, e
precisaria aceitar imagem estática e `<video>` comum.

## Validação

> [!warning] Validação pendente
> Os testes obrigatórios da spec ainda não estão marcados como escritos e verdes, e a validação numa estação com GPU
> e numa só com CPU não foi feita.

**Validação A/B**: o mesmo mosaico, com as mesmas câmeras, com o realce ligado e desligado. Passa se não sobem
`framesDropped`, `freezeCount` e o tempo médio de decode (`totalDecodeTime` sobre `framesDecoded`), se o
`presentedFrames` do `requestVideoFrameCallback` não abre lacuna, se não aparece Long Animation Frame acima de 50 ms e
se o `inboundBytes` do MediaMTX para a câmera fica igual.

**Qualidade offline**: VMAF NEG e CAMBI contra gravação de bitrate mais alto. O erro de OCR em recortes de placa nunca
pode subir com o realce.

**Medidas que faltam**: o custo da ampliação, da nitidez e do `VideoFrame` em 1080p na máquina alvo, que não está
publicado, e o tempo real de GPU dos passes na Iris Xe, que o timer dos motores já permite ler.

## Documentação oficial

Os links das APIs do navegador estão em [[#APIs do navegador que o realce usa]]. Os de cada técnica, fabricante,
WebNN e melhoria de quadros estão no item dela no
[[Câmeras - Streaming - Realce de imagem no cliente - Catálogo de técnicas|catálogo]].

**WebGPU e GPU no navegador**

- [MDN importExternalTexture](https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/importExternalTexture) · [MDN copyExternalImageToTexture](https://developer.mozilla.org/en-US/docs/Web/API/GPUQueue/copyExternalImageToTexture) · [WebGPU Fundamentals, vídeo como textura externa](https://webgpufundamentals.org/webgpu/lessons/webgpu-textures-external-video.html) · [WebGPU Fundamentals, vários canvas](https://webgpufundamentals.org/webgpu/lessons/webgpu-multiple-canvases.html)
- Chrome, novidades do WebGPU: [113](https://developer.chrome.com/blog/new-in-webgpu-113) · [120](https://developer.chrome.com/blog/new-in-webgpu-120) · [127](https://developer.chrome.com/blog/new-in-webgpu-127) · [138](https://developer.chrome.com/blog/new-in-webgpu-138) · [144](https://developer.chrome.com/blog/new-in-webgpu-144)
- [Chrome, recursos de desenvolvedor do WebGPU](https://developer.chrome.com/docs/web-platform/webgpu/developer-features) · [Chrome, dicas de WebGPU](https://developer.chrome.com/docs/web-platform/webgpu/troubleshooting-tips)
- [gpuweb, estado das implementações](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status) · [gpuweb, issue 5022 (Vulkan no Linux)](https://github.com/gpuweb/gpuweb/issues/5022)
- [MDN, boas práticas de WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) · [Chromium, limite de contextos WebGL](https://issues.chromium.org/issues/40543269)

**Linux e aceleração por hardware**

- [Chromium, VA-API](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/vaapi.md)
- [Chromium, SwiftShader](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/gpu/swiftshader.md) · [repositório SwiftShader](https://swiftshader.googlesource.com/SwiftShader) · [blink-dev, fim do fallback automático para SwiftShader](https://groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM)
- [Chromium, políticas no Linux](https://www.chromium.org/administrators/linux-quick-start/) · [Chrome Enterprise, HardwareAccelerationModeEnabled](https://chromeenterprise.google/policies/#HardwareAccelerationModeEnabled)

**CPU**

- [V8, WebAssembly SIMD](https://v8.dev/features/simd) · [web.dev, COOP e COEP](https://web.dev/articles/coop-coep)
- [Chrome, insertable streams](https://developer.chrome.com/docs/capabilities/web-apis/mediastreamtrack-insertable-media-processing) · [W3C mediacapture-transform](https://w3c.github.io/mediacapture-transform/) · [MDN MediaStreamTrackProcessor](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrackProcessor)
- [WebAssembly, recursos](https://webassembly.org/features/) · [proposta SIMD](https://github.com/WebAssembly/simd)

**Validação e prova**

- [W3C WebRTC Stats](https://w3c.github.io/webrtc-stats/) · [MDN RTCInboundRtpStreamStats](https://developer.mozilla.org/en-US/docs/Web/API/RTCInboundRtpStreamStats)
- [W3C Long Animation Frames](https://w3c.github.io/long-animation-frames/) · [Chrome, Long Animation Frames](https://developer.chrome.com/docs/web-platform/long-animation-frames)
- [Netflix VMAF NEG](https://github.com/Netflix/vmaf/blob/master/resource/doc/models_v0.md) · [Netflix CAMBI](https://github.com/Netflix/vmaf/blob/master/resource/doc/cambi.md)
- [ENFSI, realce forense de imagem e vídeo](https://enfsi.eu/wp-content/uploads/2017/06/Best-Practice-Manual-for-Forensic-Image-and-Video-Enhancement.pdf)

## Glossário

| Termo | O que é |
| --- | --- |
| Fidelidade e melhoria | Fidelidade é redução de artefato, ampliação e nitidez, automáticas com GPU. Melhoria é o tom e cor, ligado pelo item do menu |
| Motor | O jeito de calcular o realce na estação: WebGPU, WebGL2 ou CPU |
| Vaga | Lugar de um player num motor. Sem vaga, o player mostra o vídeo nativo |
| Quarentena | Tempo em que um motor que falhou fica fora da cadeia antes de ser tentado de novo |
| Fatia do orçamento | Parte do intervalo entre quadros que o realce pode gastar por quadro |
| Luma | O brilho de cada pixel, sem a cor. É onde o olho percebe detalhe e nitidez |
| BT.709 | Padrão de vídeo HD que define como calcular a luma a partir de RGB (0,2126 R + 0,7152 G + 0,0722 B) |
| Cb e Cr | Os dois canais de cor do vídeo (diferença para azul e para vermelho); com a luma, formam o YUV |
| Faixa limitada e faixa cheia | Brilho de 16 a 235 e cor de 16 a 240, ou brilho e cor de 0 a 255; muita câmera IP manda faixa cheia |
| Histograma | Contagem de quantos pixels têm cada nível de brilho |
| LUT (tabela) | Resposta pronta para cada valor de entrada: aplicar é uma consulta, não uma conta |
| Vibrance | Saturação que favorece as cores apagadas e mexe pouco nas já fortes |
| Shader | Pequeno programa que roda na GPU, uma vez por pixel |
| Compute shader | Programa da GPU que calcula sobre dados em vez de desenhar pixel, com memória dividida entre threads vizinhas |
| Framebuffer | Imagem intermediária na GPU, onde um passe escreve e o próximo lê |
| Adaptador | A GPU que o WebGPU encontrou. O de reserva (fallback) é de software |
| Compositor | A parte do navegador que monta a página na tela e estica o vídeo quando não há realce |
| Thread principal | A thread que desenha a interface; trabalho pesado nela trava a tela |
| p90 | O valor abaixo do qual ficam 90% das medidas da janela |
| Artefato de compressão | Bloco, chuvisco e contorno fantasma que a compressão do vídeo cria |
| QP | Parâmetro de quantização do codec: quanto maior, mais o quadro foi comprimido |
| VA-API | Interface do Linux para decodificar vídeo na GPU |
| Flag | Opção do Chrome que liga ou desliga um recurso fora do padrão |
