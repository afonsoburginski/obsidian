---
id: S38-07
tags:
  - attlas
  - task
  - sprint-38
  - cameras
  - streaming
  - infraestrutura
titulo: "[Infra] mediamtx do dev com reserva de CPU pelo uso medido e os paths sem fonte explicados"
frente: Streaming
tamanho: 2
pr: "-"
status: "Planejada em 15/10. Sem PR."
sprint: "[[Attlas - Sprint 38]]"
atualizado: 2026-10-15
---

# S38-07 - Câmeras - Streaming - Reserva de CPU do mediamtx pelo uso medido

## O que está errado

| Sinal | Medido em 15/10 |
| --- | --- |
| CPU | 557 m em uso, 1500 m reservados; limite de memória 1 GiB, 218 MiB em uso |
| Paths | 204 configurados, 24 prontos, 24 leitores |
| WebRTC | 2 sessões com `reader is too slow`, até 437 quadros descartados em 1 segundo |

A reserva sobra quase três vezes o uso e prende 30% da reserva de CPU do nó, que faz falta no deploy
([[S38-06 - Infraestrutura - Ambientes - Deploy do ambiente inteiro sem derrubar as sondas|S38-06]]).

O `reader is too slow` é o player que não acompanha o envio, ou seja, rede ou máquina de quem assiste. Não
foi confirmado qual das duas.

## O que a task entrega

- Uso de CPU do mediamtx medido num dia de uso normal, com pico, e a reserva ajustada a ele no GitOps.
- Os 180 paths não prontos explicados: se são sob demanda sem leitor (esperado) ou câmeras sem fonte.
- Se os descartes de quadro se repetirem, um runbook curto de como ler o `reader is too slow`, em
  [[Câmeras - Streaming - Arquitetura e estratégias]].

## Estado

Planejada. Um commit no GitOps.
