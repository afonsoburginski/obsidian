---
tags:
  - doc
  - ms-cameras
  - cameras
  - vms
aliases:
  - "Câmeras - VMS"
  - "VMS"
  - "00 - VMS"
  - "00 - Video Wall"
  - "Video Wall (ms-cameras)"
atualizado: 2026-10-01
---

# Câmeras - VMS

O VMS (Video Monitoring System, "Monitoramento de Vídeo" na interface) é o mosaico de feeds ao vivo que o
Attlas desenha no navegador do operador, submódulo do [[Câmeras]]. O backend (MOD-006, em
`apps/ms-cameras/src/video-wall/`) guarda layouts e cenas, serve o picker de câmeras e o snapshot de banda;
o front (`apps/web-attlas/src/app/modules/videowall/`) monta o mosaico, roda a rotação, o PTZ inline e a tela
cheia, e abre cada tile pelo [[Câmeras - Streaming]]. O painel físico de Quito é um alvo de exibição do VMS, com notas
próprias em [[Câmeras - Videowall]].

## Notas deste domínio

- [[Câmeras - VMS - Arquitetura e estratégias]] - nomenclatura e o que continua dizendo video-wall, modelo layout, cena e célula, escopo e permissões, rotas, ativação por alvo, frontend em camadas, requisitos e estado.
- [[Câmeras - VMS - Fluxos]] - listar layouts, picker, criar e ativar cena, montar o mosaico e erros.
- [[Câmeras - Streaming - Banda e bitrate]] - o snapshot de banda da sessão (MOD-008) e os níveis de alerta.
- [[Câmeras - VMS - Diagrama.excalidraw]] - desenho, apoio visual; vale o código, depois a nota.
