---
id: S36-08
tags:
  - attlas
  - task
  - sprint-36
  - cameras
  - streaming
  - realce
  - frontend
titulo: "[Front] Realce automático na GPU com FSR 1 e melhoria visual no player, e o menu de imagem dizendo se o realce está ativo"
frente: Streaming
pr: "#4280, #5913"
status: "Feita. #4280 mergeada em 05/10 às 16h07 e #5913 em 06/10 às 08h48."
sprint: "[[Attlas - Sprint 36]]"
atualizado: 2026-10-07
---

# S36-08 - Câmeras - Streaming - Realce de imagem no player e o indicador do realce automático

A #4280 foi aberta em 22/09 e ficou como rascunho durante a Sprint 34.

## O que se pediu

Melhorar a imagem das câmeras ao vivo no próprio navegador do operador, sem tocar no vídeo que serve de
evidência.

## O que as PRs entregaram

- **#4280**: em estação com GPU, todo player ao vivo recebe sozinho redução de artefato de compressão,
  ampliação com AMD FidelityFX FSR 1 e nitidez. Os motores WebGPU, WebGL2 e CPU são estratégias da mesma
  porta, escolhidas pelo hardware, e nenhum se desliga sozinho. A melhoria visual de tom e cor fica no menu
  de configurações do player, ligada por padrão e lembrando quando o operador a desliga. Captura,
  analítico, leitura de placa e exportação saem sempre do vídeo original.
- **#5913**: a seção "Imagem" do menu de configurações ganha uma linha de estado que diz se o realce
  automático está ativo, em espera ou indisponível, sempre com o motor e a GPU.

## Estado

As duas mergeadas. O report de 05/10 registra também a correção da tela preta com o laço virtual ligado e
das piscadas pretas no Chrome do Linux.

## Relacionado

- [[Câmeras - Streaming - Realce de imagem no cliente]]
