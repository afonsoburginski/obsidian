---
tags:
  - sprint
  - attlas
  - cameras
  - hikvision
aliases:
  - "SOFTWARE-2532"
card: SOFTWARE-2532
clickup: https://app.clickup.com/t/86ak1k6t9
titulo: "[Back] Hikvision - telemetria/status incorretos e sem preview (ONVIF desabilitado de fábrica)"
status: em code review. Fechou em 17/08 pela parte 1 e reabriu em 19/08 quando a parte 2 subiu. Só fecha quando a [#1738](https://github.com/atmanadmin/attlas-2026/pull/1738) mergear.
sprint: "[[Attlas - Sprint 29]]"
atualizado: 2026-08-19
---

# SOFTWARE-2532 - Hikvision: telemetria/status incorretos e sem preview

[ClickUp](https://app.clickup.com/t/86ak1k6t9) · Sprint 29 · squad 2 · code review

## Problema

Integração com câmera Hikvision não está 100% funcional hoje:

- Telemetria/health não reflete o estado real: aparece **offline** mesmo com vídeo ativo (stream
  funcionando).
- Não gera **pré-visualização** (thumbnail/preview) da câmera.
- ONVIF vem **desabilitado de fábrica** na Hikvision (*Configuration → Network → Advanced Settings →
  Integration Protocol*) e precisa ser habilitado no dispositivo. Hoje o `ms-cameras` já cai para ISAPI
  (`/ISAPI/System/status`) como heartbeat quando ONVIF falha, mas isso não está cobrindo status/preview
  corretamente.

## Entrega em duas partes

A primeira PR tratou o sintoma e fechou o card; a segunda foi atrás da causa e reabriu. Preferi acoplar à
2532 em vez de abrir card novo, porque é o mesmo problema, a Hikvision nascer mais rasa que a Axis.

**Parte 1, telemetria e preview.** [#1666](https://github.com/atmanadmin/attlas-2026/pull/1666), mergeada
em 17/08. Tolerância de falha no poll ISAPI, para a câmera parar de aparecer offline com stream ativo, e
preview servido pelo canal ISAPI.

**Parte 2, integração nativa.** [#1738](https://github.com/atmanadmin/attlas-2026/pull/1738), aberta em
18/08, em code review. Fecha as três lacunas de origem:

- **Cadastro**: o probe de credencial liga o ONVIF pelo ISAPI e garante a conta que o `GetProfiles` exige,
  depois refaz a leitura. A câmera nasce com os perfis de mídia persistidos no mesmo formato de qualquer
  device ONVIF. A ativação é idempotente e best-effort de propósito: falhar em ligar o ONVIF não impede o
  cadastro, o caminho ISAPI sozinho basta para operar.
- **Eventos**: o canal de saúde deixa de ser poll de liveness e passa a ler o `alertStream`, que é push e
  carrega movimento, adulteração e acesso indevido, traduzidos para a taxonomia canônica `cameras.events.*`,
  de modo que nada a jusante conhece o fabricante.
- **Protocolo**: existe agora protocolo ISAPI e a estratégia de comunicação correspondente, para firmware
  que siga com o ONVIF desligado.

De carona, e valendo para todas as câmeras e não só as Hikvision: a leitura do snapshot de saúde passou a
considerar a idade da linha e reporta OFFLINE passada a janela de frescor. O snapshot é last-write-wins, e
uma câmera que parava de ser monitorada seguia declarando STABLE indefinidamente. É a mudança de maior raio
da PR e foi sinalizada ao revisor no corpo dela.

Specs: `INT-018` (provisionamento ISAPI), `INT-019` (alertStream), `INT-020` (ativação automática do ONVIF),
em `apps/ms-cameras/docs/atomic/`.

## Relacionados

[[Consultar câmera Hikvision via ISAPI]], runbook de diagnóstico (deviceInfo, channels, status, PTZ
capabilities, teste ONVIF ligado/desligado, RTSP via ffprobe).

[[Saúde e monitoramento - Arquitetura e estratégias]] · [[Attlas - Sprint 29]]
