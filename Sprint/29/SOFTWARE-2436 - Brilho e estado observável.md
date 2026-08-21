---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
card: SOFTWARE-2436
clickup: https://app.clickup.com/t/86ajycf84
titulo: "[Back] Videowall externo: brilho e estado observável"
frente: Videowall externo (NovaStar H9)
tamanho: 2 pts
status: fila da Sprint 28 (to do no ClickUp). Em 14/08 o estado observável ganhou o tipo de ocupação e a origem da projeção.
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-14
---

# SOFTWARE-2436 - Brilho e estado observável

O ajuste de brilho do contrato mais o requisito que faltava: saber o que o Attlas realmente conhece
do equipamento, e com que frescor.

> [!info] Revisão de 14/08: o estado passa a dizer o tipo de ocupação
> Com os dois modos, o estado observável do painel deixa de falar só do espelho: ele diz **o ocupante
> vigente com o tipo**, e na projeção nativa diz também qual cena está na parede e o que a originou, um
> operador, um plano ou uma programação. O brilho não muda, e o brilho agendado deixou de depender de
> capacidade de agenda do equipamento, porque quem conta o tempo passou a ser a plataforma.

## Escopo (1 PR)

Brilho do mural via `screen/brightness` (RF-6). Estado observável do processador: alcançabilidade,
firmware lido, mapa de janelas conhecido e o frescor de cada informação, que é a lacuna de requisito
achada no confronto com o contrato e o pré-requisito do estado vazio honesto na tela. Sem polling
agressivo: um equipamento por cidade, HTTP stateless.

## DoD

Brilho aplicável (ou capacidade não verificada), estado do processador exposto com timestamps de
frescor por informação.

## Dependência

[[SOFTWARE-2433 - Catálogo de capacidades e cliente da Open API|2433]].

## Referências

- [[Videowall externo (NovaStar H9)]], RF-6 e a lacuna "Estado observável do processador".
- [[Attlas - Sprint 28]].
