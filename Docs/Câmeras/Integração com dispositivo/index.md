---
tags:
  - doc
  - ms-cameras
  - dispositivo
aliases:
  - "Câmeras - Integração com dispositivo"
  - "Integração com dispositivo"
  - "00 - Integração com dispositivo"
atualizado: 2026-10-01
---

# Câmeras - Integração com dispositivo

A camada do [[Câmeras]] que fala com o hardware da câmera: ONVIF Profile S como padrão, RTSP para o
stream, VAPIX (Axis) e ISAPI (Hikvision) para o que o ONVIF não alcança. O próprio `ms-cameras` é o ponto de
integração, sem connector dedicado nem SDK de fabricante no meio. Entrega ao resto do serviço o descritor de
stream (URL RTSP), os comandos PTZ, os canais de heartbeat e eventos e o bitrate configurado no equipamento;
não grava vídeo, que é do gravador externo (RF-INT-01). Código em `apps/ms-cameras/src/hardware/`, mais os
clientes em `health/clients/` e `health/utils/` e os utilitários VAPIX em `cameras/utils/`. Regra de negócio
em `docs/modules/cameras.md` seção 2 (RNF-CAM-02, RF-INT-05). Diagrama:
[[Câmeras - Integração com dispositivo - Diagrama.excalidraw|diagrama]].

## Notas deste domínio

- [[Câmeras - Integração com dispositivo - Arquitetura e estratégias]] - driver e estratégia, protocolos, descritor de
  stream, bitrate configurado, digest, credenciais, erros e timeouts, armadilhas.
- [[Câmeras - Integração com dispositivo - Fluxos]] - PTZ por ONVIF e por VAPIX, descritor de stream, sondagem,
  canais de saúde, ativação do ONVIF na Hikvision.
- [[Câmeras - Integração com dispositivo - Requisitos e SLA]] - RF-INT-05, RNF-CAM-02, RF-CAM-03, fallbacks e
  timeouts.
- [[Câmeras - Integração com dispositivo - Runbook]] - câmeras de bancada, como alcançá-las e os comandos de
  ffmpeg, VAPIX, ISAPI e ONVIF.
- [[Câmeras - Integração com dispositivo - Diagrama.excalidraw]] - desenho, apoio visual; vale o código, depois a nota.

## Relacionados

[[Câmeras]] · [[Câmeras - Cadastro]] · [[Câmeras - Saúde e monitoramento]] · [[Câmeras - Streaming]] · [[Câmeras - PTZ e presets]]
