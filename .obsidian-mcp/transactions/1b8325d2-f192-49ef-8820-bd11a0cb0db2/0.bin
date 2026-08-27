---
tags:
  - doc
  - attlas
  - ci
  - infra
aliases:
  - "Infra de CI"
  - "Trabalho de CI sem card"
atualizado: 2026-08-19
---

# Infraestrutura de CI, o trabalho que nunca teve card

Nota criada em 19/08 depois de uma auditoria que comparou todas as minhas pull requests mergeadas com o
board, do início do projeto até hoje. Cento e vinte e nove PRs entraram na develop entre 15/04 e 18/08, e
dezesseis delas não citam card nenhum. A maior parte é infraestrutura de CI e de deploy, atacada em
rodadas sucessivas ao longo de quatro meses, sempre com o mesmo sintoma: integração ou deploy vermelho
em pull request que não tinha nada de errado. É trabalho real, mergeado, e que era invisível para quem
lê o ClickUp.

Esta nota existe para essa frente parar de ser invisível. Em 19/08 as dezesseis viraram seis cards
retroativos, todos fechados e cada um na lista da sprint em que o trabalho aconteceu. Nenhum recebeu
pontuação, de propósito: o trabalho não foi planejado naquelas sprints e pontuá-lo agora distorceria a
medida delas.

| Card | Sprint | PRs |
| --- | --- | --- |
| SOFTWARE-2583 código de verificação no convite | 17 | 209 |
| SOFTWARE-2582 pipeline de CI e CD | 20 | 202, 257, 332, 449, 456, 461, 472 |
| SOFTWARE-2584 migrations com coluna anulável | 19 | 334 |
| SOFTWARE-2585 streaming público | 22 | 630 |
| SOFTWARE-2579 fila de testes de integração | 29 | 1017, 1038, 1142, 1727, 1737 |
| SOFTWARE-2580 boot resiliente do consumidor Kafka | 29 | 1670 |

A 2579 mora na Sprint 29 porque foi onde a frente encerrou, mas o trabalho dela atravessa as Sprints 25,
26 e 29. A lista indica a conclusão, não o período inteiro.

## As pull requests de julho e agosto

| PR | Data | Frente | O que resolveu |
| --- | --- | --- | --- |
| [#630](https://github.com/atmanadmin/attlas-2026/pull/630) | 03/07 | streaming público (SOFTWARE-2581) | contagem de segmentos do LL-HLS no mediamtx e watchdog da transição de WHEP para HLS |
| [#1017](https://github.com/atmanadmin/attlas-2026/pull/1017) | 24/07 | fila do CI (SOFTWARE-2579) | correção da cacheabilidade do NX e serialização da integração |
| [#1038](https://github.com/atmanadmin/attlas-2026/pull/1038) | 24/07 | fila do CI (SOFTWARE-2579) | fila da integração sem cancelamento e higiene automática dos runners |
| [#1142](https://github.com/atmanadmin/attlas-2026/pull/1142) | 29/07 | fila do CI (SOFTWARE-2579) | higiene do runner, tetos de disco e a cópia durável no bucket |
| [#1670](https://github.com/atmanadmin/attlas-2026/pull/1670) | 18/08 | resiliência de boot (SOFTWARE-2580) | consumidor Kafka deixa de derrubar o processo inteiro em quatro serviços |
| [#1727](https://github.com/atmanadmin/attlas-2026/pull/1727) | 18/08 | fila do CI (SOFTWARE-2579) | vaga liberada pela morte do processo dono, não por guarda de tempo |
| [#1737](https://github.com/atmanadmin/attlas-2026/pull/1737) | 18/08 | fila do CI (SOFTWARE-2579) | teto de inotify e contenção de containers vazados na máquina de runners |

## Por que a fila do CI voltou quatro vezes

Cada rodada corrigiu uma causa e descobriu a seguinte, porque todas produzem o mesmo sintoma, integração
vermelha em pull request que não tem nada de errado.

1. **Cache e concorrência** (24/07). O NX servia resultado velho e duas integrações rodavam ao mesmo
   tempo na mesma máquina, disputando porta e banco.
2. **Cancelamento e sujeira** (24/07). Job cancelado deixava container e volume para trás, e o disco
   enchia até quebrar a próxima execução.
3. **Disco e durabilidade** (29/07). O teto de disco local passou a ser cache com limite, e o bucket
   virou a cópia durável. Quota no bucket quebra o CI, então o limite mora no disco.
4. **Vaga com dono morto** (18/08). A vaga era devolvida por idade, com guarda de setenta minutos acima
   do timeout de sessenta do job. Job cancelado pelo GitHub nunca roda o hook de conclusão, então a vaga
   ficava com dono morto e a fila inteira parava até a guarda vencer. Passou a ser liberada quando o
   processo dono deixa de existir.
5. **Limite de inotify** (18/08). O container de mediamtx morria no boot por falta de instância de
   inotify, logo depois de imprimir a linha que o testcontainers usa como sinal de pronto, e a suíte
   rodava inteira contra um container morto. O teto padrão do kernel é 128 por usuário e estourava porque
   a máquina acumulava centenas de containers vazados, já que o testcontainers reusa um reaper único por
   máquina que só é podado quando a última conexão cai, o que nunca acontece em CI contínuo.

## As pull requests de maio e junho

Mesma frente, fase anterior, toda coberta pela SOFTWARE-2582 com exceção das duas últimas linhas.

| PR | Data | O que resolveu |
| --- | --- | --- |
| [#202](https://github.com/atmanadmin/attlas-2026/pull/202) | 21/05 | CI e CD passaram a rodar apenas em push na develop, o gatilho era largo demais |
| [#257](https://github.com/atmanadmin/attlas-2026/pull/257) | 28/05 | runs cancelados no meio por concorrência, mais os testes unitários do serviço de câmeras quebrados |
| [#332](https://github.com/atmanadmin/attlas-2026/pull/332) | 08/06 | remoção do hook de pre-push que rodava teste unitário na máquina do desenvolvedor |
| [#449](https://github.com/atmanadmin/attlas-2026/pull/449) | 16/06 | deploys agendados desativados no workflow |
| [#456](https://github.com/atmanadmin/attlas-2026/pull/456) | 17/06 | correção do build no fluxo de deploy |
| [#461](https://github.com/atmanadmin/attlas-2026/pull/461) | 17/06 | resumo de cache legível nos workflows de lint e integração |
| [#472](https://github.com/atmanadmin/attlas-2026/pull/472) | 18/06 | deploy passou a rodar nos runners self-hosted |
| [#209](https://github.com/atmanadmin/attlas-2026/pull/209) | 21/05 | fora da frente de CI: código de verificação no e-mail de convite (SOFTWARE-2583) |
| [#334](https://github.com/atmanadmin/attlas-2026/pull/334) | 09/06 | fora da frente de CI: migration com coluna anulável e rollback (SOFTWARE-2584) |

## O que ficou pendente

- Nenhum dos quatro serviços da [#1670](https://github.com/atmanadmin/attlas-2026/pull/1670) ganhou
  healthcheck que enxergue o consumidor. Eles se declaram prontos para receber tráfego com o consumidor
  caído, e resolver exige alterar o healthcheck de cada um.
- O teto de inotify está levantado em runtime na máquina de runners. O arquivo de sysctl versionado e o
  reaper entraram na PR, mas só valem para máquina nova ou reinício.

## Relacionados

[[Attlas - Sprint 29]] · [[Convenções de escrita]]
