---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
card: SOFTWARE-3177
clickup: https://app.clickup.com/t/86akhnqh6
titulo: "[Full] Analítico servidor - o YOLO puxa a câmera direto, num perfil de analítico, e a PTZ ganha os dois analíticos"
frente: Analítico
tamanho: 8 pts
pr: "#3437 (fase 1/3), #3465 (fase 2/3), #3482 (fase 3/3)"
status: "Stack de 3 fases aberta e registrada (#3437, #3465, #3482 - stack #3466). A fase 1 entrega o perfil de analítico por fabricante (Axis por URL, Hikvision pelo terceiro stream, `null` para quem não tem o que dar), o método no `CameraStreamSourceResolver` e a rota interna servindo a URL direta com o relay como fallback, revertendo a opção 1 rejeitada na CROSS-074 com o custo registrado na INT-001 seções 3.1 e 11. A fase 2 fecha o outro lado: o alvo carrega `relayed`, o `VirtualLoopPathReconciler` só mantém `analytic-*` para quem ainda depende do relay (sem migration, ausente significa relay), a capacidade `analyticRelayOnly` devolve uma câmera ao relay sem deploy, e o `ffmpeg` do analítico ganha `-fflags nobuffer -flags low_delay` com o `h264profile=baseline` de volta na URL da Axis. A fase 3 põe a PTZ com os dois analíticos: as rotas de região e laço passam a aceitar `analyticType` e a resolução vive num lugar só (`ConfiguredAnalyticResolver`), porque resolver por precedência jogava toda região no analítico ATSPM e deixava o Laço Virtual sem nenhuma - e analítico sem região não entra em `listTargets` (DD-7), então a tela mostrava a câmera configurada e ela não contava nada. O GET de regiões por preset também pedia a linha EMBEDDED e respondia vazio em toda câmera servidor, que é justamente a PTZ. Uma decodificação e uma inferência por quadro ficam provadas por teste, e `held`/`targets` passam a contar câmeras como o `fleet` e o `cap` ao lado. Specs da stack em `status: implemented`. Falta medir a CPU do analítico antes e depois de ligar o segundo, no EC2, depois da SOFTWARE-3176 aplicada."
sprint: "[[Attlas - Sprint 33]]"
estudo: "[[Analítico - Estudo de caso de captura, inferência e sincronização]]"
atualizado: 2026-09-14
---

# Analítico servidor - captura direta da câmera com perfil de analítico

Contexto e fontes em [[Analítico - Estudo de caso de captura, inferência e sincronização]] (decisão
3.1). Hoje o `ms-cameras` cria um path `analytic-<câmera>` no MediaMTX que puxa o perfil SECONDARY
(na PTZ, 1280x720 a 25 fps) e o `ffmpeg` do analítico lê desse relay: quatro vezes os pixels e cinco
vezes os quadros que o modelo usa, mais um salto de rede e de processo, e sem acesso ao relógio da
câmera.

## O que o card faz

- `/internal/virtual-loop/sources` passa a devolver no `streamUrl` a **URL direta da câmera num perfil
  de analítico**, montada pelo `CameraStreamSourceResolver` (que já monta URL com credencial e já
  reconhece `/axis-media/media.amp` como redimensionável por URL):
  - Axis: `axis-media/media.amp?resolution=640x360&fps=5&compression=30&videocodec=h264&videokeyframeinterval=5`.
  - Hikvision: terceiro stream `/Streaming/Channels/<canal>03`, configurado via ISAPI para 640x360 a
    5 fps; o sub-stream fica para o VMS.
- O `VirtualLoopPathReconciler` deixa de criar `analytic-*` por padrão e mantém o relay como
  **fallback** por câmera (flag na capacidade), para equipamento que não aceite mais um cliente RTSP.
- O `ffmpeg` do analítico ganha `-fflags nobuffer -flags low_delay` e recebe o quadro já na
  resolução do modelo; a credencial na URL continua redigida nos logs (`redactUrlCredentials`).
- **A `ATM-PTZ` passa a ter Analíticos Avançados e Laço Virtual ao mesmo tempo, os dois pelo
  servidor** (ela não tem embarcado), com região e vínculo de detector para cada um, como a DEMO já
  tem para o laço. Ponto a provar: **uma decodificação e uma inferência por quadro** servindo os dois
  analíticos - o `FrameDetectionService` já roda uma inferência por quadro decodificado e o
  `CameraOwnershipService` já registra que decodificação duplicada custaria um segundo `ffmpeg`.

## Dependência

[[Analítico servidor - orçamento de inferência na CPU]] antes: ligar mais um analítico numa caixa a
580% não faz sentido.

## Critério de aceite

`ffmpeg` do analítico recebendo 640x360 a 5 fps direto do IP da câmera (visível em `docker top`);
nenhum path `analytic-*` no MediaMTX para câmera Axis; PTZ contando no laço e respondendo nas
Métricas com os dois analíticos; CPU do analítico medida antes e depois de ligar o segundo.

## Onde olhar

`apps/ms-cameras/src/analytics-ingestion/virtual-loop-path.reconciler.ts`,
`apps/ms-cameras/src/analytics-ingestion/virtual-loop-sources.service.ts`,
`apps/ms-cameras/src/streaming/services/camera-stream-source.resolver.ts`,
`apps/ms-video-analytics/src/stream-ingestion/stream-ingestion.service.ts`.
