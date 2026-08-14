---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
card: SOFTWARE-2435
clickup: https://app.clickup.com/t/86ajycf5k
titulo: "[Back] Videowall externo: layout, janelas e presets"
frente: Videowall externo (NovaStar H9)
tamanho: 3 pts
status: entregue na PR #1453, mergeada em 12/08, mas com conteúdo diferente do título. O que entrou foi a porta do alvo de exibição, o seletor, a factory e o adaptador do browser, mais o `target` na ativação de cena. Camadas e presets no equipamento não entraram, e deixaram de fazer sentido com o replanejamento de 13/08. Em 14/08 marcado para reabrir e reescopar: volta como as camadas derivadas da cena, sem preset.
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-14
---

# SOFTWARE-2435 - Layout, janelas e presets

> [!warning] O que este card entregou não é o que o título diz
> Verificado nos arquivos da PR #1453 em 13/08. O merge levou
> `video-wall-display-target.interface.ts`, o seletor, a factory, o adaptador `browser-session`, o DTO e o
> `target` em `ISetVideoWallSceneActiveRequest`. **Nenhuma chamada a `layer/*` ou `preset/*` foi
> escrita**, e nenhum arquivo em `targets/novastar-h9/` existe. O card entregou a costura do strategy, que
> é trabalho real e continua válido inteiro, e não a composição do mural.
>
> Com o replanejamento de 13/08 ([[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)|2201]]) a
> parte que faltava **deixou de ser desejada**: a plataforma não compõe mais a parede. Então o card fica
> como entregue, e o que sobrou dele não vira dívida, vira escopo retirado. A atômica `INT-014` foi
> deletada.

> [!info] Revisão de 14/08: precisa ser reaberto e reescopado
> O card foi fechado com a PR #1453, que entregou a porta do alvo de exibição, e o resto do escopo dele
> morreu no replanejamento de 13/08. Com a cláusula 16.13 citada, metade volta: as **camadas do painel
> derivadas da geometria da cena projetada**, uma por célula não vazia, calculadas pela plataforma. O que
> não volta é preset no equipamento, que continua fora do escopo por decisão de domínio, nem editor de
> janela à mão.

O Attlas passa a compor o mural: janelas, fontes e cenas aplicadas no hardware.

## Escopo (1 PR)

Comandar a composição via `layer/add`, `layer/delete`, `layer/list`, `layer/setInfo` e
`layer/changeSource` (criar, remover e reposicionar janelas, trocar a câmera de uma janela) e os
presets via `preset/create`, `preset/load` e `preset/read` (salvar, listar e aplicar cena com troca
instantânea). O modelo de cena, layout e célula que já existe no mosaico descreve qual câmera em qual
posição e é a fonte natural do que empurrar ao processador; o mapeamento cena Attlas para preset do
H9 fica persistido.

## DoD

Cena do Attlas aplicada como preset no processador (ou respondendo capacidade não verificada quando o
path ainda for presumido), com o mapeamento persistido.

## Dependência

[[SOFTWARE-2434 - Câmeras como fontes IPC|2434]].

## Referências

- [[Videowall externo (NovaStar H9)]], RF-3 e RF-4 e o catálogo mapeado ao contrato.
- [[Attlas - Sprint 28]].
