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
status: "Reclassificada em 15/09/2026: ms-video-analytics é receptor/encaminhador de eventos do analítico embarcado e do analítico servidor externo; não deve decodificar RTSP nem executar ONNX. A capacidade de bounding box é explícita por câmera (`boundingBoxes=false` para a demo; ATMN PTZ pode publicar). PRs #3432/#3433 seguem abertas para merge após CI, mas a validação ONNX/CPU abaixo é histórica e não é critério do fluxo real."
sprint: "[[Attlas - Sprint 33]]"
estudo: "[[Analítico - Estudo de caso de captura, inferência e sincronização]]"
atualizado: 2026-09-14
---

# Analítico servidor - orçamento de inferência na CPU

Contexto completo, medições e fontes em
[[Analítico - Estudo de caso de captura, inferência e sincronização]] (seções 1 e 2, decisão 3.2).

Correção de arquitetura: a inferência pertence ao analítico servidor externo. `ms-video-analytics`
recebe os eventos normalizados e não deve abrir RTSP, carregar ONNX ou fazer pré-processamento local.
Os números de CPU/ONNX registrados abaixo são evidência de um experimento antigo, não um requisito para
o deploy atual.

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

## Critério de aceite histórico (arquivado)

Analítico abaixo de 200% de CPU com as duas câmeras ingeridas, carga do host abaixo de 8, zero
`reader is too slow` no MediaMTX em 30 minutos, e os números de antes e depois. Esse critério não se
aplica enquanto a inferência estiver fora deste serviço.

## Estado operacional vigente

- O produtor externo publica as detecções; o Attlas encaminha o evento para o overlay.
- A demo é laço virtual sem bounding boxes. ATMN PTZ (por exemplo `10.1.1.80`) é a câmera de teste
  para o overlay quando o analítico externo estiver ativo.
- O front roda na Dell e fica visível no Mac em `http://127.0.0.1:4200/#/organization`.
- O Kong da Dell foi reparado ao ligar `ms-organization` + Postgres + Redis na rede da stack; login
  deixou de retornar 502.

## Onde olhar

`apps/ms-video-analytics/src/detection/onnx-inference.runtime.ts`, `detection.config.ts`,
`stream-ingestion/stream-ingestion.service.ts`, `frame-detection.service.ts`, `docker-compose.yml`.
