---
id: S35-24
tags:
  - attlas
  - task
  - sprint-35
  - cameras
  - videowall
  - frontend
titulo: "[Front] Rotação automática dos grupos salvos no painel do videowall"
frente: Videowall
pr: "#5429"
status: "Feita. #5429 mergeada em 30/09 às 18h45."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-24 - Câmeras - Videowall - Rotação dos grupos salvos no painel

## O que estava errado

Na tela do painel, o botão "Rotação" do card "Projetar no painel" ficava sempre desabilitado, com a dica
"Recurso do painel físico ainda não disponível". Estava fixo assim no template.

## O que a PR entregou

- "Rotação" abre o mesmo diálogo da tela de Monitoramento de Vídeo, com os grupos salvos do painel, tempo
  por grupo e repetição contínua.
- A cada troca o navegador do operador aplica o grupo na parede com a mesma chamada do "Aplicar", sem
  endpoint novo.
- O cabeçalho mostra o tempo até a próxima troca, com Pausar, Retomar e Parar. Com menos de dois grupos
  salvos o botão fica desabilitado.
- A rotação para sozinha quando um plano de resposta ou uma programação assume o painel, quando o
  operador troca de sistema, depois de três grupos recusados em seguida, e ao retirar do painel ou trocar
  o layout.

## Estado

Mergeada em 30/09.

## Relacionado

- [[Câmeras - Videowall - Fluxos]]
