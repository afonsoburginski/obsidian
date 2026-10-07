---
id: S35-10
tags:
  - attlas
  - task
  - sprint-35
  - analitico
  - deteccao
  - issues
titulo: "[Full] Desfazer da Detecção por passo, camada Interseções desenhada e busca de câmeras com um botão de limpar"
frente: Detecção
pr: "#5143, #5147, #5163"
issues: "#4691, #4690, #4954"
status: "Feita. #5143 mergeada em 29/09 às 13h49, #5147 às 13h51 e #5163 às 14h31; as três issues fechadas no mesmo dia."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-10 - Analítico - Detecção - Desfazer por passo, camada Interseções e um só botão de limpar

Três issues da tela de Detecção, uma PR cada.

## O que estava errado

- **#4690**: o "Desfazer" do modo de edição apagava a região inteira. Ele não tinha histórico e tirava o
  último vértice qualquer que fosse o último gesto; com menos de quatro vértices a forma sumia, e o Salvar
  seguinte removia a região do equipamento.
- **#4954**: a opção "Interseções" do mapa do painel de câmeras não desenhava nenhum marcador. As
  interseções eram derivadas da lista de câmeras pelo campo `topologyElement`, que o `ms-cameras`
  declarava no contrato e nunca preenchia.
- **#4691**: a busca "Buscar câmera ou cruzamento" mostrava dois botões de limpar, o do navegador e o do
  design system.

## O que as PRs entregaram

- **#5147**: uma pilha de passos por região. Cada arrasto, vértice, giro ou limpeza grava um passo, o
  Desfazer devolve a forma anterior ao último passo e nunca remove região.
- **#5163**: o `GET /api/cameras` preenche `topologyElement` com uma consulta por página ao
  `ms-traffic-model`, e a Detecção desenha as interseções da organização, inclusive as que não têm câmera.
- **#5143**: o "x" nativo do navegador fica escondido nesse campo, nas abas Streaming e Lista.

## Estado

As três mergeadas e as três issues fechadas em 29/09.
