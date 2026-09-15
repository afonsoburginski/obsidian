---
stepsCompleted:
  - 1
inputDocuments:
  - "Sprint/33/Validação - as 34 PRs, uma a uma.md"
workflowType: 'pr-review'
targetPR: '#3433'
outputPath: 'Reports/Validação PR 3433 — inferência servidor.md'
date: '2026-09-15'
status: 'in-progress'
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

## Ambiente

Usar o gateway da Dell conforme [[Ambiente de validação — Dell]]. A URL de API não permite, por si só, subir a branch da PR no computador remoto; é preciso que a versão já esteja implantada ou haver acesso de execução na Dell.

