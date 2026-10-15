---
tags:
  - doc
  - cameras
  - videowall
  - novastar
  - quito
aliases:
  - "Câmeras - Videowall"
  - "Videowall externo (NovaStar H9)"
  - "Videowall"
  - "00 - Videowall externo (NovaStar H9)"
atualizado: 2026-10-14
banner: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200"
---

# Câmeras - Videowall

## Resumo

O videowall é o painel físico da sala de controle de Quito, comandado por um processador NovaStar H9 que não
é do Attlas e que a plataforma dirige pela Open API do fabricante, direto da consola e por Ethernet, como exige
a cláusula 16.13 do contrato. É um alvo de exibição do [[Câmeras - VMS]], com dois modos: espelho (a tela do
operador na parede) e projeção nativa (uma fonte por câmera de uma cena salva, usada também por plano de
resposta). Nos dois modos a fonte é servida pela plataforma pelo [[Câmeras - Streaming]], e credencial de
câmera nunca vai ao equipamento. No H9 real de Quito, comando, fonte e camada funcionam; o vídeo ainda não
chega ao painel, como explica [[Videowall - Vídeo não chega ao H9]].

## Notas

| Nota | Abra quando |
| --- | --- |
| [[Câmeras - Videowall - Arquitetura e estratégias]] | precisa saber onde está cada peça, as rotas, os tópicos, as tabelas, o transporte do espelho, a escrita no equipamento, o equipamento de Quito, a rede até ele e as armadilhas |
| [[Câmeras - Videowall - Fluxos]] | precisa do passo a passo: cadastrar processador, espelhar, liberar, projetar cena, plano de resposta, grupos, rotação, brilho e leitura de estado |
| [[Câmeras - Videowall - Requisitos e SLA]] | precisa da cláusula 16.13 literal, das obrigações e do que o código entrega, das leituras registradas, da precedência na parede ou de uma variável de ambiente |
| [[Câmeras - Videowall - Como o videowall funciona de ponta a ponta]] | precisa entender o fluxo completo, se o mosaico vai direto ao painel, competição entre computadores, limites de fontes simultâneas |
| [[Câmeras - Videowall - Open API e hardware do H9]] | precisa dos limites de decodificação do card IP, endpoints da Open API com screenshots, specs do chassi, comportamento observado no H9 real |
| [[Câmeras - Videowall - Runbook - Testar se o H9 tenta buscar o vídeo]] | precisa provar ao vivo, com `tcpdump` no servidor, se o H9 tenta buscar o vídeo |

## Explicações para usuário

- [[Videowall - Como funciona]]: as peças, os dois modos e o caminho do
  vídeo até o painel.
- [[Videowall - Vídeo não chega ao H9]]: onde o vídeo para em Quito, como foi
  provado, o que fazer e o que corrigir depois.

## Consulta rápida

- [[Videowall - Endpoints H9]]: rotas do Attlas e da Open API do H9, com os comandos de teste.
- [[Videowall - Credenciais H9]]: endereços, usuários e o acesso ao cluster.

## Diagramas

Nenhum diagrama Excalidraw trata deste subdomínio. As fotos do chassi do H9 de Quito e da acta de entrega
(`Câmeras - Videowall - Painel H9 de Quito.png`) estão embutidas em
[[Câmeras - Videowall - Arquitetura e estratégias]].
