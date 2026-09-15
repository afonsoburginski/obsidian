---
stepsCompleted:
  - 1
  - 2
inputDocuments:
  - "Sprint/33/Validação - as 34 PRs, uma a uma.md"
workflowType: 'pr-review'
targetPR: '#3433'
outputPath: 'Reports/Validação PR 3433 — inferência servidor.md'
date: '2026-09-15'
status: 'validada parcialmente'
prSize: 'média (222 adições, 51 remoções, 13 arquivos)'
decision: ''
---

# Relatório de validação — PR #3433

**PR**: [Back] Analítico servidor: entrada do modelo medível e a primeira caixa da câmera de volta (fase 2/2)

## Contexto

- Tipo: correção de backend e instrumentação de desempenho.
- Pilha: esta é a fase 2/2; a base é a PR #3432, que limita o orçamento de CPU.
- Valor esperado: configurar o lado da entrada do ONNX por ambiente, distinguir as métricas por tamanho de entrada, reduzir trabalho do letterbox e publicar a primeira caixa quando o relógio de captura é relativo.
- Foco da validação: a configuração incompatível deve falhar no carregamento; uma entrada válida deve produzir a primeira detecção e publicar métricas com o rótulo `model_input`; o teto da fase #3432 deve continuar respeitado.
- Estado inicial: `CHANGES_REQUESTED`. O último commit corrige a validação de shape do ONNX e exige múltiplos de 32; a validação funcional deve verificar esse estado mais recente.

## Resultado da validação

### Ordem de merge

A PR #3433 é a fase 2/2 e tem a #3432 como base. Validar #3433 exercita as duas fases, mas o merge obrigatório é **#3432 primeiro, depois #3433**.

### Provas executadas na Dell

- PR #3432 isolada: imagem construída do commit `8dae1e4108`; o container recebeu o teto real de `3.0` CPUs (`NanoCpus=3000000000`), iniciou com orçamento ONNX `2/1`, respondeu health 200 via Kong e passou 3/3 testes focados de orçamento.
- Build: imagem `ms-video-analytics` construída do commit `f9e3ab63` da #3433, não a imagem `:dev` anterior.
- Fase 1: log do runtime confirmou orçamento `intraOpNumThreads=2`, `interOpNumThreads=1`, execução sequencial e otimização `all`; o container em execução tem teto real de `3.0` CPUs (`NanoCpus=3000000000`).
- Fase 2: modelo ONNX de 12,2 MiB provisionado com metadados válidos; a sessão carregou e o `/api/video-analytics/health/ready` respondeu 200 pelo Kong.
- Configuração inválida: `VIRTUAL_LOOP_MODEL_INPUT_SIZE=500` encerra o processo com `must be divisible by 32`.
- Grafo incompatível: `VIRTUAL_LOOP_MODEL_INPUT_SIZE=416` com o modelo fixo `[1, 3, 640, 640]` é recusado no carregamento, antes de produzir inferência enganosa.
- Testes focados na Dell: 18/18 verdes em `onnx-inference.session.spec.ts` e `frame-publisher.service.spec.ts`, incluindo o primeiro publish com relógio relativo e os três casos de shape.

### Limite desta sessão

Não houve prova com uma câmera real: o serviço de câmeras informou zero alvos e os RTSPs de demonstração da Dell não estavam acessíveis. A regressão da primeira caixa está coberta pelo teste focado; a prova de campo exige um RTSP alcançável e uma região configurada.

## Ambiente

Usar o gateway da Dell conforme [[Ambiente de validação — Dell]]. A URL de API não permite, por si só, subir a branch da PR no computador remoto; é preciso que a versão já esteja implantada ou haver acesso de execução na Dell.

Após a validação, a imagem da #3433 foi restaurada como serviço ativo; o gateway `/api/video-analytics/health/ready` respondeu 200.
