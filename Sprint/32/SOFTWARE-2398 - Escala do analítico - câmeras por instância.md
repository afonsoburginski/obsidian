---
tags:
  - attlas
  - task
  - sprint-32
  - analitico
card: SOFTWARE-2398
clickup: https://app.clickup.com/t/86aju7cjb
titulo: "[Back] Escala do analítico: câmeras por instância e distribuição"
frente: Analítico
tamanho: 2 pts
status: comprometido na Sprint 32 (7-13/09/26), movido do sem prazo em 25/08 junto com o prazo externo de 18/09. Histórico: fila da Sprint 27 (in progress no ClickUp), SEM PRAZO desde 10/08. PR em draft segue aberta.
sprint: "[[Attlas - Sprint 32]]"
atualizado: 2026-08-25
---

# SOFTWARE-2398 - Escala do analítico - câmeras por instância

Sair de uma câmera para muitas sem descobrir o limite em produção. Fecha o número que o card de
alimentação estimou, agora com o analítico real medido.

## Escopo (1 PR)

Medir o teto real de câmeras por instância com detecção ligada, por resolução e taxa de quadro.
Definir como as câmeras são distribuídas entre instâncias, e o que acontece quando uma instância
cai: quem reassume e em quanto tempo. Declarar o comportamento na saturação, degradar taxa de
quadro, recusar câmera nova ou escalar, porque perder frame em silêncio é o pior caminho. Registrar
o número no card de alimentação, fechando a estimativa com medição.

## Por que só na Sprint 32

Depende do card 5 da [[Attlas - Sprint 31]] (detecção de objetos por frame) para medir com o analítico
real em vez de estimar - não cabia na 31 porque a cadeia inteira precisa estar de pé primeiro.

## DoD

Teto medido, política de distribuição escrita e comportamento na saturação implementado ou
declarado como limitação conhecida.

## Dependência

[[Analítico servidor - Detecção de objetos por frame]] e [[Analítico servidor - Laço virtual e ocupação da região]] (cards 5 e 6 da [[Attlas - Sprint 31]]).

## Referências

- [[Analítico servidor - ADR de alimentação e SPEC do ms-virtual-loop]], fecha o número da estimativa.
- [[Attlas - Sprint 32]] · [[Attlas - Sprint 31]] · [[Attlas - Sprint 27]] (planejamento original do card).
