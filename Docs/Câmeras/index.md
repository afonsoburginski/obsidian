---
tags:
  - doc
  - cameras
aliases:
  - "Câmeras"
  - "ms-cameras"
  - "ms-cameras - visão geral"
  - "Diagramas do ms-cameras"
10|atualizado: 2026-10-07
banner: "surveillance camera technology"
banner_y: 0.3
servico: ms-cameras
fonte: apps/ms-cameras
---

# Câmeras

## Resumo

Módulo Câmeras (CCTV) do Attlas: o ciclo de vida das câmeras IP da rede de trânsito, do cadastro técnico ao
monitoramento de saúde, controle PTZ, vídeo ao vivo, VMS, videowall externo, dashboard e log de eventos e
incidentes. O backend inteiro é o `ms-cameras`, que fala direto com o hardware; a câmera captura e transmite,
a gravação é do NVR externo e a analítica de vídeo é do domínio [[Analítico]]. A visão técnica comum a todos os
subdomínios está em [[Câmeras - Arquitetura e estratégias]].

## Subdomínios

| Subdomínio | O que faz | Abra quando |
| --- | --- | --- |
| [[Câmeras - Cadastro]] | Cadastro em lote com sondagem, listagem, edição, quatro estados, substituição, remoção lógica, marcas e modelos | a dúvida é sobre criar, editar, trocar ou remover câmera, ou sobre o estado de cadastro |
| [[Câmeras - Integração com dispositivo]] | Conversa com o equipamento por ONVIF, RTSP, VAPIX e ISAPI | uma marca ou modelo não responde, ou a sondagem falha |
| [[Câmeras - Saúde e monitoramento]] | Monitoramento 24 horas, janelas de 5 min, rollup de 90 dias, métricas por câmera e status em tempo real | a câmera aparece offline, instável ou degradada, ou um número de disponibilidade parece errado |
| [[Câmeras - Streaming]] | Vídeo ao vivo pelo MediaMTX sob demanda, WebRTC e LL-HLS, codecs, banda e bitrate | o vídeo não abre, trava, atrasa ou a banda parece errada |
| [[Câmeras - PTZ e presets]] | Comandos PTZ, presets, automações e o PTZ vindo de plano de execução | a câmera não se move, o preset falha ou a automação não roda |
| [[Câmeras - VMS]] | Layouts e cenas do mosaico, ativação e escopo por organização | a dúvida é sobre o mosaico de vídeo da tela VMS |
| [[Câmeras - Videowall]] | Videowall externo NovaStar H9: processador, espelho de tela, grupos, brilho e estado do painel | o vídeo não chega ao painel físico |
| [[Câmeras - Dashboard]] | Agregação por período e escopo: KPIs, conectividade, distribuição, heatmap, mapa, uptime, banda e push ao vivo | um card do dashboard mostra número inesperado ou não atualiza |
| [[Câmeras - Eventos, incidentes e alarmes]] | Log de eventos, correlação em incidente, emissão de alarme, observações e reporte manual | um evento não aparece, um incidente não abre ou um alarme não sai |

## Notas da raiz do domínio

| Nota | Abra quando |
| --- | --- |
| [[Câmeras - Arquitetura e estratégias]] | precisa do mapa do `ms-cameras` inteiro: bootstrap, autenticação, rotas por grupo, rotas internas, WebSocket, tópicos Kafka, banco e integrações externas |

## Explicações para usuário

| Explicação | Abra quando |
| --- | --- |
| [[Câmeras - Cadastro - Explicação - Estados de cadastro]] | alguém pergunta o que significam Em estoque, Em testes, Em campo e Operativa |
| [[Câmeras - Dashboard - Explicação - Como cada número é calculado]] | alguém pergunta de onde vem um número dos cards de banda ou de conectividade |
| [[Câmeras - Streaming - Explicação - Como liberar o WebRTC num servidor novo]] | um servidor novo não entrega vídeo por WebRTC |
| [[Câmeras - Videowall - Explicação - Vídeo não chega ao painel H9]] | o painel NovaStar H9 fica sem vídeo |

## Diagramas

Cada desenho mora na pasta do subdomínio que ele descreve. O código vale mais que a nota, e a nota vale mais
que o desenho.

| Desenho | O que mostra |
| --- | --- |
| [[Câmeras - Diagrama.excalidraw\|Geral]] | O `ms-cameras` inteiro e suas dependências |
| [[Câmeras - Cadastro - Diagrama.excalidraw\|Cadastro]] | Cadastro e ciclo de vida |
| [[Câmeras - Integração com dispositivo - Diagrama.excalidraw\|Integração com dispositivo]] | Drivers e estratégias por protocolo |
| [[Câmeras - Saúde e monitoramento - Diagrama.excalidraw\|Saúde e monitoramento]] | Monitoramento e janelas de disponibilidade |
| [[Câmeras - Streaming - Diagrama - Pipeline HLS.excalidraw\|Streaming: pipeline]] | Caminho do vídeo da câmera ao navegador |
| [[Câmeras - Streaming - Diagrama - Estratégia de codec.excalidraw\|Streaming: codec]] | Tratamento de cada codec |
| [[Câmeras - Streaming - Diagrama - Banda e bitrate.excalidraw\|Streaming: banda]] | Banda provisionada e bitrate medido |
| [[Câmeras - PTZ e presets - Diagrama.excalidraw\|PTZ e presets]] | Comandos PTZ, presets e automações |
| [[Câmeras - VMS - Diagrama.excalidraw\|VMS]] | Layouts, cenas e ativação |
| [[Câmeras - Eventos, incidentes e alarmes - Diagrama.excalidraw\|Eventos]] | Log, correlação e alarme |

> [!warning] Desenhos com um caminho de vídeo que não existe
> O Geral, o Pipeline HLS e o Estratégia de codec ainda põem um ffmpeg entre a câmera e o MediaMTX. Nenhum
> processo de vídeo roda no `ms-cameras`: o MediaMTX abre o RTSP da câmera sob demanda (ver
> [[Câmeras - Streaming]]). Dashboard e Videowall não têm desenho.
