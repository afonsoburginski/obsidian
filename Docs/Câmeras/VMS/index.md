---
tags:
  - doc
  - cameras
  - vms
aliases:
  - "Câmeras - VMS"
  - "VMS"
  - "00 - VMS"
  - "00 - Video Wall"
  - "Video Wall (ms-cameras)"
atualizado: 2026-10-07
---

# Câmeras - VMS

## Resumo

O VMS (Video Monitoring System, "Monitoramento de Vídeo" na interface) é o mosaico de vídeos ao vivo que o
Attlas desenha no navegador do operador, dentro do [[Câmeras]]. O `ms-cameras` guarda layouts e cenas, serve o
seletor de câmeras e o snapshot de banda; o `web-attlas` monta o mosaico, roda a rotação, o PTZ por tile e a
tela cheia, e abre cada vídeo pelo [[Câmeras - Streaming]]. O painel físico de Quito é um alvo de exibição do
VMS e tem pasta própria, [[Câmeras - Videowall]].

## Notas

| Nota | Abra quando |
| --- | --- |
| [[Câmeras - VMS - Arquitetura e estratégias]] | precisa saber onde está cada peça, as rotas, o modelo de layout, cena e célula, as permissões, a ativação por alvo, as camadas do frontend, os requisitos atendidos e as armadilhas |
| [[Câmeras - VMS - Fluxos]] | precisa do passo a passo: listar layouts, seletor de câmeras, criar ou editar cena, ativar ou desativar, montar o mosaico e enviar ao painel |

O snapshot de banda da sessão e os níveis de alerta estão em [[Câmeras - Streaming - Banda e bitrate]].

## Explicações para usuário

Nenhuma explicação para usuário trata deste subdomínio. A do painel físico está em [[Câmeras - Videowall]].

## Diagramas

- [[Câmeras - VMS - Diagrama.excalidraw]]: desenho do VMS. Quando o desenho discorda do código, vale o código
  e depois a nota.
