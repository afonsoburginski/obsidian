---
tags:
  - doc
  - cameras
  - dispositivo
  - ms-cameras
aliases:
  - "Câmeras - Integração com dispositivo"
  - "Integração com dispositivo"
  - "00 - Integração com dispositivo"
atualizado: 2026-10-07
banner: "surveillance camera technology"
---

# Câmeras - Integração com dispositivo

## Resumo

É a camada do `ms-cameras` que fala direto com o hardware da câmera, sem connector nem SDK de fabricante: ONVIF
Profile S como padrão, RTSP para o vídeo, VAPIX (Axis) e ISAPI (Hikvision) para o que o ONVIF não alcança. Ela
entrega a URL RTSP de cada perfil, os comandos PTZ, os canais de heartbeat e eventos, o bitrate configurado e os
codecs declarados a [[Câmeras - Streaming]], [[Câmeras - PTZ e presets]], [[Câmeras - Saúde e monitoramento]] e
[[Câmeras - Cadastro]], e não grava vídeo. O código fica em `apps/ms-cameras/src/hardware/`, `health/clients/`,
`health/utils/` e `cameras/utils/`, e a regra de negócio em `docs/modules/cameras.md`, seção 2.

## Notas

| Nota | Abra quando |
| --- | --- |
| [[Câmeras - Integração com dispositivo - Arquitetura e estratégias]] | precisa saber qual protocolo cobre o quê, onde está o driver, a estratégia de stream, o digest e os erros, e por que é assim |
| [[Câmeras - Integração com dispositivo - Fluxos]] | quer o passo a passo de um comando PTZ, da montagem da URL de stream, da sondagem no cadastro, da ativação do ONVIF na Hikvision ou dos canais de saúde |
| [[Câmeras - Integração com dispositivo - Requisitos e SLA]] | precisa do estado de cada requisito do edital, dos timeouts e das variáveis de ambiente |
| [[Câmeras - Integração com dispositivo - Runbook]] | vai testar uma câmera de bancada pelo terminal com ffprobe, VAPIX, ISAPI ou ONVIF |

## Explicações para usuário

Não há explicação para usuário deste subdomínio na raiz do vault.

## Diagramas

| Diagrama | O que mostra |
| --- | --- |
| [[Câmeras - Integração com dispositivo - Diagrama.excalidraw]] | as portas do driver e da estratégia e os protocolos por fabricante; é apoio visual, e quando discorda vale o código e depois a nota |
