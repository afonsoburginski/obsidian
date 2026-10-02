---
tags:
  - doc
  - ms-cameras
  - diagrama
aliases:
  - "Diagramas do ms-cameras"
atualizado: 2026-10-01
---

# Diagramas do ms-cameras

Desenhos do Excalidraw dos módulos do [[ms-cameras]]. O texto de cada módulo mora nas notas do domínio; o
desenho é apoio visual, e quando os dois divergem vale o código, depois a nota.

> [!warning] Desenhos que descrevem caminho que não existe mais
> O de pipeline de streaming HLS mostra o HLS gerado e servido do disco pelo `ms-cameras`, que saiu: o
> MediaMTX puxa a câmera sob demanda e serve WebRTC e LL-HLS (ver [[Streaming]]). O de estratégia de codec e
> o de visão geral ainda põem o ffmpeg entre a câmera e o MediaMTX, o que também não existe mais.

## Notas deste domínio

- [[Diagrama - visão geral do módulo de câmeras.excalidraw]]
- [[Diagrama - MOD-001 cadastro de câmeras.excalidraw]] ([[Cameras]])
- [[Diagrama - MOD-002 adaptador multiprotocolo.excalidraw]] ([[Integração com dispositivo]])
- [[Diagrama - MOD-003 saúde da câmera.excalidraw]] ([[Saúde e monitoramento]])
- [[Diagrama - MOD-004 PTZ e presets.excalidraw]] ([[PTZ e presets]])
- [[Diagrama - MOD-004 pipeline de streaming HLS.excalidraw]] ([[Streaming]])
- [[Diagrama - estratégia de codec do streaming.excalidraw]] ([[Streaming]])
- [[Diagrama - MOD-006 VMS.excalidraw]] ([[VMS]])
- [[Diagrama - MOD-007 eventos de câmera.excalidraw]] ([[Eventos, incidentes e alarmes]])
- [[Diagrama - MOD-008 monitoramento de banda.excalidraw]] ([[Streaming - Banda e bitrate]])

O dashboard de câmeras (MOD-013) não tem desenho.
