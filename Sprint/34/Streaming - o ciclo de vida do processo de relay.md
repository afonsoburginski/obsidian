---
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - streaming
titulo: "[Back] Streaming - o processo de relay morre quando mandam morrer, e órfão não sobrevive ao boot"
frente: Streaming
tamanho: 5 pts
pr: "#4071, #4072, #4074"
status: "Feita. #4071 e #4072 mergeadas em 22/09, #4074 mergeada em 23/09."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
---

# Streaming - o ciclo de vida do processo de relay

A causa raiz do vazamento reproduzido na bancada em 21/09, medição e detalhe em
[[Registro - implementação do plano de vazamento de publicador em 21 de setembro]].

## O que estava errado

`proc.killed` em Node vira verdadeiro no envio do sinal, não na morte do processo. Como o SIGKILL de
reserva era condicionado a esse campo, ele nunca disparava, e um `ffmpeg` que ignorasse o SIGTERM
ficava vivo puxando a câmera. Foi medido: processo vivo por 17 minutos com o media server em zero
caminhos, socket para a câmera ainda estabelecido e o processo parado em espera de futex.

Somado a isso, o contêiner não tinha um PID 1 de verdade, então o SIGTERM do orquestrador não chegava
ao node, e nada varria no boot as relays que a execução anterior deixou para trás.

## O que muda

O escalonamento para SIGKILL passa a depender da morte observada e o desligamento aguarda os kills
(#4071). O Dockerfile ganha `tini` e `exec`, para o sinal chegar ao processo certo (#4072). No boot,
uma varredura encerra as relays sobreviventes, reconhecidas por cinco predicados lidos de `/proc`,
sem tocar em processo de terceiro (#4074).

## O que tem de valer no fim

Derrubar o serviço não deixa `ffmpeg` vivo, e subir de novo não encontra nenhum de pé.

## Como entrou

As três estão na develop. O `killWithSigkillFallback` decide pela saída real (`exitCode` e
`signalCode`), e o `onApplicationShutdown` aguarda os kills dentro de `SHUTDOWN_KILL_BUDGET_MS`
(8s). O Dockerfile do `ms-cameras` sobe com `ENTRYPOINT ["/sbin/tini", "-g", "--"]` e `exec node`. A
varredura de boot roda no `onApplicationBootstrap`, antes de o HTTP abrir, mata com SIGTERM e, depois
de `ORPHAN_FFMPEG_SIGKILL_GRACE_MS` (2s), SIGKILL, e conta cada morte em
`ms_cameras_stream_orphan_relays_killed_total`. Uma varredura que falha não impede o serviço de
subir: a relay que ficou é encontrada no boot seguinte.

## Relacionado

- [[Plano - Streaming sem vazamento de publicador]], o plano de 18/09 que esta semana executa.
- [[Streaming - a sessão, a adoção e a reconciliação com o media server]], a rede de segurança que vem em cima disto.
