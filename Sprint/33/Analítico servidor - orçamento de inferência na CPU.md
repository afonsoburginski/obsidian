---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
aliases:
  - "Analítico servidor - custo de CPU no EC2 e a PTZ com os dois analíticos"
card: SOFTWARE-3176
clickup: https://app.clickup.com/t/86akhneha
titulo: "[Back] Analítico servidor - a inferência passa a caber num orçamento de CPU"
frente: Analítico
tamanho: 5 pts
pr: "#3432 (fase 1/2) e #3433 (fase 2/2), stack #3434"
status: "Stack #3434 aberta. Fase 1: sessão ONNX com `intraOpNumThreads` 2, `interOpNumThreads` 1, execução sequencial e otimização total; `VIRTUAL_LOOP_TARGET_FPS` de 10 para 5; `cpus: 3.0` no Compose; INT-002 ganha a seção 4.2 com a medição de 580%. Fase 2: `VIRTUAL_LOOP_MODEL_INPUT_SIZE` para medir 416 contra 640, rótulo `model_input` no histograma, letterbox mais barato, e o defeito que a suíte apontava - o teto de intervalo lia 'nunca publicou' como 'publicou em zero' e engolia a primeira caixa de cada câmera. Suíte do serviço inteira verde (21 suítes, 217 testes). Os números do depois exigem o deploy."
sprint: "[[Attlas - Sprint 33]]"
estudo: "[[Analítico - Estudo de caso de captura, inferência e sincronização]]"
atualizado: 2026-09-14
---

# Analítico servidor - orçamento de inferência na CPU

Contexto completo, medições e fontes em
[[Analítico - Estudo de caso de captura, inferência e sincronização]] (seções 1 e 2, decisão 3.2).

Resumo do que foi medido: `attlas-ms-video-analytics` a **580% de CPU** num box de 8 vCPU (4 núcleos
Zen 1, só AVX2), carga 15; dentro dele `node main.js` a 581% e os dois `ffmpeg` a 1,9% e 1,6%. A
sessão ONNX é criada sem opções (pool de threads do tamanho do host), com 10 quadros por segundo por
câmera e o pré-processamento em laço JavaScript.

## O que o card faz

1. `InferenceSession.create(weight, { intraOpNumThreads: 2, interOpNumThreads: 1, executionMode: 'sequential', graphOptimizationLevel: 'all' })`,
   uma sessão só, compartilhada.
2. `cpus: 3.0` no bloco do `ms-video-analytics` do compose, para o analítico não afogar o MediaMTX e o
   `ms-cameras`.
3. `VIRTUAL_LOOP_TARGET_FPS` de 10 para 5 por padrão, medindo a ocupação do laço em 5 e em 3,3.
4. Com o recorte pela região já existente, entrada do modelo em 416 medida contra 640 nas duas câmeras
   (mAP das classes de veículo); fica no menor que não perde veículo.
5. `ffmpeg` entrega o quadro já quadrado (`scale` com `force_original_aspect_ratio=decrease` mais
   `pad`), e o JavaScript só normaliza.
6. INT8 estático fica registrado como medição posterior: nesta CPU sem VNNI o ganho é incerto.

## Critério de aceite

Analítico abaixo de 200% de CPU com as duas câmeras ingeridas, carga do host abaixo de 8, zero
`reader is too slow` no MediaMTX em 30 minutos, e os números de antes e depois (métrica
`inferenceDuration` e `docker stats`) no corpo da PR.

## Onde olhar

`apps/ms-video-analytics/src/detection/onnx-inference.runtime.ts`, `detection.config.ts`,
`stream-ingestion/stream-ingestion.service.ts`, `frame-detection.service.ts`, `docker-compose.yml`.
