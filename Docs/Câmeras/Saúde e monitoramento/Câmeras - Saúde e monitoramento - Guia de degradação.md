---
tags:
  - doc
  - ms-cameras
  - saude
aliases:
  - "Guia de degradação"
  - "Atman - Saúde da câmera e degradação"
  - "Saúde e monitoramento - Guia de degradação"
atualizado: 2026-10-01
---

# Câmeras - Saúde e monitoramento - Guia de degradação

PDF com identidade da Atman que explica, para público misto, quando uma câmera é Online, Degradada ou
Offline, com os limites do código e exemplos, mais um resumo das demais funcionalidades do módulo. Índice:
[[Câmeras - Saúde e monitoramento]].

![[Câmeras - Saúde e monitoramento - Guia de degradação.pdf]]

## A regra em quatro linhas

- **Estável**: todos os últimos 10 pings responderam e a última resposta levou menos de 300 ms.
- **Parcialmente instável**: nada perdido, mas a última resposta levou 300 ms ou mais.
- **Instável**: pelo menos 1 ping perdido (3 s sem pong) nos últimos 10, com os 2 mais recentes respondidos.
- **Offline**: a conexão caiu, ou um dos 2 pings mais recentes ficou sem resposta.

Na tela, Estável é Online, Parcialmente instável e Instável são Degradada, e Offline segue Offline. Na janela
de 5 min, sem batida é Offline, uma ou duas batidas é Online e latência média de 300 ms ou mais é Degradada.
O SLA é a fração de janelas Online sobre o total, com meta de 99%.

A matemática (nota Q, histerese, janela) está em [[Câmeras - Saúde e monitoramento - Arquitetura e estratégias]], e os
comportamentos do código que fogem da regra acima (ONVIF medindo o long-poll, Hikvision e ONVIF sem estado
Instável, ping perdido gravado como online no histórico) em
[[Câmeras - Saúde e monitoramento - Arquitetura e estratégias#Armadilhas conhecidas]].
