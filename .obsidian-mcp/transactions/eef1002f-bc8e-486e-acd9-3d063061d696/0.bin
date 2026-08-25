---
tags:
  - attlas
  - task
  - backlog
  - sem-prazo
  - analitico
card: SOFTWARE-2398
clickup: https://app.clickup.com/t/86aju7cjb
titulo: "[Back] Escala do analítico: câmeras por instância e distribuição"
frente: Analítico em container
tamanho: 2 pts
status: SEM PRAZO desde 10/08 (frente do analítico despriorizada; a Sprint 27 fechou sem entrega e a 28 foi para VMS e videowall externo). PR em draft segue aberta. Histórico: fila da Sprint 27 (in progress no ClickUp). Validado contra a develop em 03/08. PR aberta em draft: [#1351](https://github.com/atmanadmin/attlas-2026/pull/1351).
sprint: "[[00 - Sem prazo (backlog)]]"
atualizado: 2026-08-10
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

## Validação 03/08

Card conferido contra a develop e permanece válido, sem ajuste de escopo. Depende inteiramente dos
números que saem da detecção e da ocupação para medir com carga real, não estimada.

## DoD

Teto medido, política de distribuição escrita e comportamento na saturação implementado ou
declarado como limitação conhecida.

## Dependência

[[SOFTWARE-2395 - Analítico em container - detecção por frame|2395]] e [[SOFTWARE-2396 - Analítico em container - laço virtual e ocupação|2396]].

## Referências

- [[SOFTWARE-2385 - Alimentação de vídeo do analítico em container|2385]], fecha o número da estimativa.
- [[Attlas - Sprint 27]].
