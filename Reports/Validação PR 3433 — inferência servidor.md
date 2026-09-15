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
status: 'reclassificada — arquitetura corrigida'
prSize: 'média (222 adições, 51 remoções, 13 arquivos)'
decision: ''
---

# Relatório de validação — PR #3433

**PR**: [Back] Analítico servidor: entrada do modelo medível e a primeira caixa da câmera de volta (fase 2/2)

## Contexto corrigido

- A premissa de inferência local foi corrigida em 15/09/2026: `ms-video-analytics` **não decodifica RTSP nem executa ONNX**.
- Ele recebe os resultados normalizados do analítico embarcado e do analítico servidor externo. Este último é outra máquina e não está acessível nesta sessão.
- Portanto orçamento de CPU, modelo ONNX, letterbox e teste RTSP local não são critérios de aceite do fluxo real; os registros abaixo permanecem apenas como evidência de que o caminho experimental chegou a executar, não como validação funcional do produto.
- Bounding boxes são publicação de overlay: o produtor servidor publica `attlas.virtual-loop.frame-detections` e `ms-cameras` somente encaminha o evento para a tela. A demo de laço virtual não publica caixas; as ATMN PTZ e as câmeras explicitamente habilitadas podem publicar.

## Resultado da validação

### Ordem de merge

A PR #3433 é a fase 2/2 e tem a #3432 como base. Validar #3433 exercita as duas fases, mas o merge obrigatório é **#3432 primeiro, depois #3433**.

### Evidência histórica — não é critério de aceite

- PR #3432 isolada: imagem construída do commit `8dae1e4108`; o container recebeu o teto real de `3.0` CPUs (`NanoCpus=3000000000`), iniciou com orçamento ONNX `2/1`, respondeu health 200 via Kong e passou 3/3 testes focados de orçamento.
- Build: imagem `ms-video-analytics` construída do commit `f9e3ab63` da #3433, não a imagem `:dev` anterior.
- Fase 1: log do runtime confirmou orçamento `intraOpNumThreads=2`, `interOpNumThreads=1`, execução sequencial e otimização `all`; o container em execução tem teto real de `3.0` CPUs (`NanoCpus=3000000000`).
- Fase 2: modelo ONNX de 12,2 MiB provisionado com metadados válidos; a sessão carregou e o `/api/video-analytics/health/ready` respondeu 200 pelo Kong.
- Configuração inválida: `VIRTUAL_LOOP_MODEL_INPUT_SIZE=500` encerra o processo com `must be divisible by 32`.
- Grafo incompatível: `VIRTUAL_LOOP_MODEL_INPUT_SIZE=416` com o modelo fixo `[1, 3, 640, 640]` é recusado no carregamento, antes de produzir inferência enganosa.
- Testes focados na Dell: 18/18 verdes em `onnx-inference.session.spec.ts` e `frame-publisher.service.spec.ts`, incluindo o primeiro publish com relógio relativo e os três casos de shape.
- Fluxo RTSP e ONNX foram exercitados numa base isolada, mas **não representam o fluxo de produção** após a correção arquitetural acima.

### Regra operacional vigente

- Não subir nem dimensionar `ms-video-analytics` para processamento de vídeo local.
- Para validar o fluxo real, usar uma ATMN PTZ — por exemplo `10.1.1.80` — com o analítico servidor externo ativo e observar o evento normalizado/overlay.
- A câmera demo é somente laço virtual; `boundingBoxes=false` é uma capacidade explícita da câmera, não uma dedução por IP nem apenas por ARTPEC.

## Ambiente

Usar o gateway da Dell conforme [[Ambiente de validação — Dell]]. A URL de API não permite, por si só, subir a branch da PR no computador remoto; é preciso que a versão já esteja implantada ou haver acesso de execução na Dell.

O gateway foi corrigido na Dell: `ms-organization` e suas dependências foram iniciados e ligados à rede da pilha. `POST /api/organization/auth/login` deixou de responder `502` e passou a atingir o serviço (`400` para corpo vazio, como esperado).

O front está compilado na Dell e acessível no Mac em `http://127.0.0.1:4200/#/auth/login` por túnel SSH; o processamento não roda no Mac.

### EC2 dev — desligamento

A instância `i-06e8f8cf75102367e` (`dev.v2`, `3.15.199.101`) foi identificada, mas SSH/SSM/AWS CLI
não estavam acessíveis nesta sessão. O user confirmou que já desligou o analítico no EC2. A regra
segura é parar somente `ms-video-analytics` (não a instância inteira), preservando Kong, `ms-cameras`,
Kafka e as câmeras.

### Decisão sobre o merge

As PRs #3432/#3433 continuam abertas. A revisão confirmou que elas ainda inicializam `ffmpeg` e
`onnxruntime-node` no `ms-video-analytics`, incompatível com a arquitetura receiver-only corrigida.
Não foram mergeadas para não colocar processamento local de vídeo em produção. O patch de capacidade
de bounding boxes foi publicado em `codex/bounding-box-capability-v2` para o agente da Dell buscar;
as PRs precisam ser reescritas/removidas dessa inferência antes do merge.

### Validação adicional na Dell

- O branch `codex/bounding-box-capability-v2` foi validado na Dell no commit `f364b59e3d`.
- `ms-cameras`: 17/17 testes focados verdes (capacidade de bounding boxes e fontes do laço virtual).
- `ms-video-analytics`: 12/12 testes focados verdes (encaminhamento e supressão do overlay).
- O shell autenticado do `web-attlas` abriu no Mac via túnel para a Dell em
  `http://127.0.0.1:4200/#/analytics/detection`. A tela mostrou “Nenhuma câmera com analítico”
  porque a pilha isolada do F2 não compartilha as câmeras/analíticas do tenant autenticado; o
  bootstrap do front e o gateway estão funcionando.
