---
id: S34-21
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - vms
  - frontend
titulo: "[Front] Câmeras - barra de ações do Monitoramento de Vídeo e barra de abas do módulo"
frente: Câmeras
tamanho: 5 pts
pr: "#4172"
issues: "#1872, #1934"
status: "Feita. PR #4172 mergeada na develop em 22/09, às 22h26, fechando as issues 1872 e 1934."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
aliases:
  - "Câmeras - barra de ações do Monitoramento e barra de abas"
---

# S34-21 - Câmeras - Monitoramento - Barra de ações do Monitoramento e barra de abas

Duas correções na mesma faixa de tela: a barra de ações do Monitoramento de Vídeo e a barra de abas do
módulo logo acima dela. A 1872 estava escopada como dependente de conferir o protótipo vigente, e a
1934 como a mesma causa de recorte que a #4147 corrigiu no cartão do painel. Fecha as duas.

## O que estava errado

A barra de ações dizia "Salvar" e "Descartar", os dois com contorno, no fim do grupo de controles,
quando o protótipo pede "Salvar Grupo" e "Cancelar", com destaque primário e negativo, antes do
seletor de grade e do ícone de tela cheia. Na barra de abas, o grupo era centralizado dentro de um
contêiner rolável: quando as abas não cabiam, metade do excedente ia para um deslocamento negativo que
nenhuma barra de rolagem alcança, e "Dispositivos" abria como "ositivos" sem volta.

## O que muda

"Salvar Grupo" e "Cancelar" abrem o grupo de ações, na ordem do protótipo, e o menu de reticências
passa a colapsar o par por último, para ele continuar à vista enquanto houver espaço. Cancelar uma
visualização ainda não salva já devolvia a grade vazia na develop; a PR só cobriu isso com teste, e o
diálogo de confirmação continua no caminho. A barra de abas passa a centralizar por margem automática
na primeira e na última aba, que colapsa quando falta espaço, e ganha um chevron em cada borda, visível
só enquanto aquele lado esconde abas, com um gradiente mostrando o rótulo continuando por baixo. A aba
corrente entra na área visível ao abrir o módulo.

## O que tem de valer no fim

A barra do Monitoramento de Vídeo segue o protótipo nos rótulos, no destaque e na ordem, e nenhuma aba
do módulo fica cortada sem caminho para chegar até ela.

## Relacionado

- [[S34-33 - Câmeras - Issues - As issues abertas do módulo]], a frente em que esta task entra.
- [[S34-10 - Câmeras - Videowall - Título e bordas cortados no painel]], o outro recorte corrigido nesta semana.
