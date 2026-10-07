---
id: S35-23
tags:
  - attlas
  - task
  - sprint-35
  - cameras
  - cadastro
titulo: "[Full] Substituição de câmera pelo estoque e bugs do cadastro, edição e lista de câmeras"
frente: Cadastro
pr: "#5420"
status: "Feita. #5420 mergeada em 30/09 às 15h34."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-23 - Câmeras - Cadastro - Substituição pelo estoque e os bugs do cadastro, edição e lista

## O que estava errado

A substituição de câmera nunca chegou a funcionar: o diálogo mandava um corpo que o endpoint recusava, então
toda confirmação voltava 400, e o diálogo lia o erro do lugar errado e mostrava sempre o texto genérico. A
investigação achou outros defeitos no módulo: a lista repetia ou pulava câmera entre páginas, a edição com
porta diferente de 80 travava o Salvar, e a importação em lote passava do lote de 50 do backend.

## O que a PR entregou

- **Substituição só pelo estoque.** A aba "Nova câmera" saiu, porque cadastraria uma câmera sem
  credencial nem stream. O motivo vai para a auditoria, e a câmera nova assume o estado da antiga. Antiga
  fora do campo responde 422, nova fora do estoque 409, e nova de outro Sistema 404.
- **Lista**: o id desempata toda ordenação, câmeras que nunca conectaram ficam por último em "Última
  conexão", excluir a última câmera da última página volta à anterior, e o filtro "Hoje" começa à
  meia-noite local.
- **Edição e cadastro**: host e porta vão separados, IP duplicado marca o campo, falha de conexão não
  aparece como credencial inválida, e a importação respeita o lote de 50.

## Estado

Mergeada em 30/09.

## Relacionado

- [[Câmeras - Cadastro - Fluxos]]
