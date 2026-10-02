---
tags:
  - doc
  - ms-cameras
  - cameras
  - vms
aliases:
  - "VMS"
  - "00 - VMS"
  - "00 - Video Wall"
  - "Video Wall (ms-cameras)"
atualizado: 2026-10-01
---

# VMS

O VMS (Video Monitoring System, "Monitoramento de Vídeo" na interface) é o mosaico de feeds ao vivo que o
Attlas desenha no navegador do operador, submódulo do [[ms-cameras]]. O backend (MOD-006, em
`apps/ms-cameras/src/video-wall/`) guarda layouts e cenas, serve o picker de câmeras e o snapshot de banda;
o front (`apps/web-attlas/src/app/modules/videowall/`) monta o mosaico, roda a rotação, o PTZ inline e a tela
cheia, e abre cada tile pelo [[Streaming]]. O painel físico de Quito é um alvo de exibição do VMS, com notas
próprias em [[Videowall externo (NovaStar H9)]].

## Notas deste domínio

- [[VMS - Arquitetura e estratégias]] - nomenclatura e o que continua dizendo video-wall, modelo layout, cena e célula, escopo e permissões, rotas, ativação por alvo, frontend em camadas, requisitos e estado.
- [[VMS - Fluxos]] - listar layouts, picker, criar e ativar cena, montar o mosaico e erros.
- [[Streaming - Banda e bitrate]] - o snapshot de banda da sessão (MOD-008) e os níveis de alerta.
