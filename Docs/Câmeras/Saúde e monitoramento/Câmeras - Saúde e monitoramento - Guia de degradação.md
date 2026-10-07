---
tags:
  - doc
  - cameras
  - saude
aliases:
  - "Câmeras - Saúde e monitoramento - Guia de degradação"
  - "Guia de degradação"
  - "Atman - Saúde da câmera e degradação"
  - "Saúde e monitoramento - Guia de degradação"
atualizado: 2026-10-07
---

# Câmeras - Saúde e monitoramento - Guia de degradação

Volta para [[Câmeras - Saúde e monitoramento]].

## Resumo

Esta nota acompanha o PDF com identidade da Atman que explica, para público misto, quando uma câmera é
Online, Degradada ou Offline, com os limites do código e exemplos, mais um resumo das demais funcionalidades
do módulo. Abaixo estão a regra em quatro linhas, o que a tela mostra e o PDF.

## A regra em quatro linhas

| Estado | Quando |
| --- | --- |
| Estável | Todos os últimos 10 pings responderam e a última resposta levou menos de 300 ms |
| Parcialmente instável | Nada perdido, mas a última resposta levou 300 ms ou mais |
| Instável | Pelo menos 1 ping perdido (3 s sem pong) nos últimos 10, com os 2 mais recentes respondidos |
| Offline | A conexão caiu, ou um dos 2 pings mais recentes ficou sem resposta |

## O que a tela mostra

| Estado do equipamento | Estado na tela |
| --- | --- |
| Estável | Online |
| Parcialmente instável | Degradada |
| Instável | Degradada |
| Offline | Offline |

Na janela de 5 minutos, janela sem batida é Offline, uma ou duas batidas com a maioria respondida é Online e
latência média de 300 ms ou mais é Degradada. O SLA é a fração de janelas Online sobre o total, com meta de
99%.

A matemática (nota Q, histerese, janela) está em
[[Câmeras - Saúde e monitoramento - Arquitetura e estratégias#Evaluator]], e os comportamentos do código que
fogem da regra acima (ONVIF medindo o long-poll, Hikvision e ONVIF sem estado Instável, ping perdido gravado
como online no histórico) estão em
[[Câmeras - Saúde e monitoramento - Arquitetura e estratégias#Armadilhas conhecidas]].

## O PDF

![[Câmeras - Saúde e monitoramento - Guia de degradação.pdf]]

## Glossário

| Termo | O que é |
| --- | --- |
| Ping | Mensagem de teste que o Attlas envia à câmera Axis a cada 5 segundos; a resposta é o pong |
| Batida | Qualquer prova de vida da câmera: pong, resposta ao long-poll ONVIF ou evento Hikvision |
| Janela | Intervalo de 5 minutos que recebe um único estado: Online, Degradada ou Offline |
| SLA | Porcentagem das janelas do período em que a câmera esteve Online |
