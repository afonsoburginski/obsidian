---
tags:
  - attlas
  - planning
  - sprint-31
  - sprint-32
  - analitico
aliases:
  - "Planning - Sprint 31 e 32"
atualizado: 2026-09-04
---

# Planning - Sprint 31 e 32

## 1. Esta semana, 31/08 a 04/09

**Sprint 31 fechada: 32 pontos, 10 de 10 cards, 10 PRs mergeadas.** Com o que veio fora do plano, 12 PRs
na develop.

- O analítico de vídeo deixou de depender da câmera: roda em container nosso, sobre câmera comum.
- Embarcado e servidor publicam o mesmo evento de ocupação, com uma única regra de presença.
- A ocupação chega no histórico como evento de detector, sem mudança no consumidor.
- A inferência roda só no recorte da região, cerca de um décimo da área, com o custo medido por resolução.
- A aba Métricas do Laço Virtual mostra dado real.
- Cinco serviços previstos viraram um. A develop cai de 28 para 25 microsserviços quando a PR 2530 entrar.

Fora dos 32 pontos: estabilização do streaming, uma falha silenciosa de detecção no embarcado, e
**49 PRs de colegas revisadas, 92 revisões** - metade da semana, que não aparece no board.

## 2. Horas extras de sábado, 05/09

**Cinco PRs minhas encadeadas, quatro aprovadas, uma com correções pedidas.** Nenhuma entra sozinha: o
merge é de baixo para cima.

| Ordem | PR | O que é | Estado |
| --- | --- | --- | --- |
| 1 | 2517 | Mapa de câmeras nas Métricas do Laço Virtual | aprovada |
| 2 | 2518 | Peso do modelo de detecção | aprovada, em conflito |
| 3 | 2528 | Teto de câmeras por instância (`SOFTWARE-2398`) | **correções pedidas**, em conflito |
| 4 | 2529 | Detecção de pedestre | aprovada |
| 5 | 2530 | Remove os scaffolds `ms-atspm`, `ms-dai` e `ms-connector-virtual-loop` | aprovada |

Por que não espera segunda:

1. A 2528 está no meio da pilha: a 2529 e a 2530 não mergeiam antes dela.
2. A 2518 é pré-requisito de medição. Sem ela não se mede o custo de inferência, que é o card 1 da
   Sprint 32.
3. A Sprint 32 é a última semana cheia antes de 18/09. Começar segunda com a pilha aberta é começar com o
   card 1 bloqueado e a prova de campo esperando.
4. O que atrasou não foi estimativa, foi vazão de review: 92 revisões em PRs de colegas.

Sábado: corrigir a 2528, resolver os conflitos, mergear as cinco com CI em cada passo, e fechar o número
do teto de câmeras por instância com o peso real.

## 3. Semana que vem, Sprint 32, 07 a 13/09

Comprometido hoje: 9 pontos, e 2 deles já estão na PR 2528. Sobram **7 pontos na última semana cheia
antes de 18/09**, contra 32 entregues nesta.

**Proposta, 25 pontos:**

| O que entra | Pts |
| --- | --- |
| Prova de campo ponta a ponta, até a linha do tempo do detector (`SOFTWARE-2200`) | 2 |
| Até quatro laços virtuais por câmera (`SOFTWARE-2686`) | 5 |
| Contagem de incidentes na face ATSPM | 2 |
| Endereçamento do controlador virtual no vínculo câmera para detector | 3 |
| Calibração da região em metros | 5 |
| Rastreamento de objeto no pipeline de vídeo | 8 |

Os quatro laços por câmera entram agora porque mexem no mesmo contrato que esta semana publicou - fazer
junto mexe no domínio uma vez; depois seria alterar contrato já consumido por dois serviços.

Os três últimos itens são o que o ATSPM espera: rastreamento e calibração destravam 14 das 38 métricas, e
detector por estágio semafórico destrava 15. Nenhum serviço novo.
