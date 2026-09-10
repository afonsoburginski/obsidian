---
tags:
  - attlas
  - sprint-33
  - moc
  - analitico
aliases:
  - "Attlas - Sprint 33"
  - "Sprint 33 - o que entrega"
sprint: Sprint 33 (14/9/26 - 20/9/26)
status: "CRIADA em 09/09 durante o replanejamento da frente do analítico. É a semana do PRAZO EXTERNO de 18/09 (front e backend), que cai na quinta-feira desta janela - não é semana de desenvolvimento cheio. Carrega o resíduo declarado da Sprint 32 (15 pts em 4 tasks, sendo o ATSPM Split Monitor e Yellow/Red os dois primeiros) mais a entrega em si. NÃO tem lista no ClickUp ainda, e isso é deliberado: a lista se cria quando a Sprint 32 fechar e o resíduo real for conhecido, porque três das quatro tasks são condicionais ao que a 32 entregar."
atualizado: 2026-09-09
---

# Sprint 33 - o que entrega

Porta de entrada da semana de **14 a 20/09**, e ela tem uma particularidade que decide tudo: **o prazo
externo do módulo Analítico é 18/09**, quinta-feira desta janela. Front e backend.

> [!danger] Não é semana de desenvolvimento cheio, é a semana da entrega
> Três dias úteis antes do prazo (14, 15, 16, 17 e a manhã do 18). O que entra aqui é resíduo declarado e
> o que faz a entrega parecer entrega, não escopo novo. Qualquer coisa que escorregue da
> [[Attlas - Sprint 32]] **come esta semana**, e a primeira a ceder lá é a prova de campo, que é justamente
> o que demonstra o módulo.

## O que a semana carrega

| # | Task | Pts | O que exige |
| --- | --- | --- | --- |
| 1 | `[Back] ATSPM: Split Monitor sobre o ciclo do controlador` | 5 | Só `controller_cycle`: `stageTimes` medido contra o alocado. Não sai do `ms-detector-history` e não precisa de join externo - é a métrica ATSPM mais barata que existe |
| 2 | `[Back] ATSPM: Yellow e Red Actuations` | 3 | Chegada (`detection_record`) dentro da janela de amarelo e vermelho do estágio, derivada do início do ciclo mais o acumulado de `stageTimes` |
| 3 | `[Front] A face ATSPM lê os dois grupos novos` | 2 | `ATSPM_DETECTOR_READERS` sai de 4 para 6 leituras, e os cartões correspondentes saem do vazio |
| 4 | `[Back] Histórico e versionamento da configuração analítica` | 5 | Requisito do edital ("versionamento, autor, data, motivo, reverter"). Só se sobrar semana |

**15 pts numa semana que também tem a entrega.** As tasks 1 a 3 dependem da `MOD-003` aprovada, que é a
PR 2 da Sprint 32 ([`SOFTWARE-3052`](https://app.clickup.com/t/86akffm9z)), e a 1 e a 2 dependem de a
definição de ATSPM ter sido decidida na PR 1 ([`SOFTWARE-3051`](https://app.clickup.com/t/86akffm6d)) -
hoje há três definições diferentes no projeto.

## O que a semana NÃO entrega, e é o maior bloco

Os **90 pts** do inventário de fechamento, dos quais 16 são do módulo Controladores e não meus:
ACOM (o caller da atuação, mais a cardinalidade e a tela, que são de Controladores), o Dashboard do
Analítico, a decisão automatizada alimentando as Estratégias, as métricas ATSPM que exigem o mapa
estágio-grupo de movimento e classe no evento (AOG, PCD, Approach Delay, TMC), o snapshot da configuração
semafórica por ciclo, o polling com histórico de disponibilidade, recorrência de incidente, exportação
via `ms-reports` e o OTA do app embarcado.

Item por item, com pontos e o motivo de cada um estar fora, em
[[Analítico - O que falta para fechar o módulo]].

> [!important] O que a entrega de 18/09 é, dito sem maquiar
> **A cadeia do Laço Virtual, ponta a ponta, demonstrável em campo**, com a Detecção configurável pela
> tela, Instâncias e Incidentes no ar, e as Métricas do Laço Virtual servidas por dado real. O ATSPM
> entrega 6 das 38 métricas no melhor caso, e o resto continua como cartão vazio honesto.
>
> **O que não vai estar lá**: atuação (nenhum controlador legado recebe presença por ACOM) e o Dashboard
> do módulo. As duas coisas têm dono e motivo, e nenhuma delas cabia em um dev nas três sprints.

## Por que não tem lista no ClickUp ainda

Deliberado. Três das quatro tasks são condicionais ao que a Sprint 32 entregar, e o vault é onde se
planeja - o ClickUp é publicação para o gestor. A lista `Sprint 33 (14/9/26 - 20/9/26)` se cria quando a
32 fechar e o resíduo real for conhecido, no mesmo passe em que os cards saem daqui.

## Ver também

[[Analítico - O que falta para fechar o módulo]] · [[Attlas - Sprint 32]] · [[Attlas - Sprint 31]] ·
[[Analítico]] · [[Sprints - índice raiz]]
