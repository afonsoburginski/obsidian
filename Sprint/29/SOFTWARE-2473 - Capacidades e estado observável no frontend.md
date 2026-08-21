---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
  - frontend
card: SOFTWARE-2473
clickup: https://app.clickup.com/t/86ajyp9mk
titulo: "[Front] Videowall externo: capacidades e estado observável do painel"
frente: Videowall externo (NovaStar H9)
tamanho: 2 pts
status: code review na [PR #1721](https://github.com/atmanadmin/attlas-2026/pull/1721), empilhada sobre a #1720, com a 2476 junto. Teve aprovação do rezendelc e correção pedida pelo otavioassis em 18/08. Conferido em 19/08: o serviço do frontend já tem `setBrightness` chamando a rota de brilho desde o redesenho, mas os controles na tela estão com `zDisabled` fixo e título de motivo, chamando uma rota que ainda não existe no backend. É esse par morto que este card vem ligar.
pr: "[#1758](https://github.com/atmanadmin/attlas-2026/pull/1758)"
sprint: "[[Attlas - Sprint 29]]"
atualizado: 2026-08-19
---

# SOFTWARE-2473 - Capacidades e estado observável no frontend

> [!warning] Superfície revisada em 13/08: a rota de configuração morreu
> A rota `/cameras/vms/videowall` com abas virou um **dialog compartilhado** aberto pelo lançador radial
> sobre o mosaico, com quatro views: espelhar, processador, brilho e estado. Este card passa a entregar a view de estado dentro do dialog, com o espelho vigente (dono e início) no lugar do mapa de janelas. Spec: `UF-026`.

Aba de estado: alcance do equipamento, firmware efetivamente lido dele, janelas que ele reporta e desde
quando cada informação é válida. Mais o catálogo de capacidades com a procedência de cada uma.

A regra que governa a aba inteira é uma frase do requisito: informação que não pode ser lida aparece como
desconhecida, nunca como valor inventado.

## Desconhecido tem três formas, e a tela distingue as três

| Situação | O que a tela diz |
| --- | --- |
| nunca foi lido | desconhecido, sem idade |
| foi lido antes e agora não responde | desconhecido, com a hora da última leitura válida |
| o equipamento respondeu que não sabe | não informado pelo equipamento |

O terceiro é o mais fácil de errar. Um equipamento que responde sem trazer o firmware é diferente de um
equipamento que não responde, e colapsar os dois apagaria a informação de que o equipamento está no ar. Em
nenhum dos três a tela preenche com traço, zero ou valor de exemplo.

## Outros dois pontos

**A recusa por capacidade não verificada é informação, não defeito.** Severidade de aviso, não de erro,
nomeando a capacidade que falta. Pintar de vermelho sugeriria falha da plataforma, quando o que houve foi
a plataforma se recusando a arriscar a parede da sala de controle.

**O firmware é exibido, não comparado.** O mínimo aceitável não existe ainda, porque a leitura do chassi em
31/07 saiu ambígua entre duas versões com o dígito do meio ilegível na foto. A comparação entra em card
próprio quando o mínimo for conhecido, e o lugar dela já fica preparado.

Leitura sob demanda e por releitura explícita. Nada de varredura periódica: são um equipamento por cidade
e uma chamada por gesto de operador, e um intervalo no frontend multiplicaria isso por aba aberta.

## DoD

As três formas de desconhecido visualmente distintas, nenhum literal de preenchimento, catálogo com
procedência, e nenhum caminho da API do fornecedor no código do frontend.

## Dependência

[[SOFTWARE-2437 - Tela do processador de videowall|2437]],
[[SOFTWARE-2433 - Catálogo de capacidades e cliente da Open API|2433]] e
[[SOFTWARE-2436 - Brilho e estado observável|2436]].

## Referências

- [[Attlas - Sprint 28]], seção da frente de frontend do videowall.
