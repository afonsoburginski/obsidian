---
tags:
  - doc
  - ms-cameras
  - cameras
  - realtime
aliases:
  - "Status em tempo real - Requisitos e SLA"
atualizado: 2026-08-24
servico: ms-cameras
fonte: apps/ms-cameras/src/cameras/realtime
---

# Status em tempo real - Requisitos e SLA

> Parte de [[Status em tempo real]]. Requisitos: `docs/modules/cameras.md` (seção 8.1, seção 9).

## RF-CAM-04 - Monitoramento real-time

O operador vê o estado corrente da câmera em tempo real. Abaixo, cada atributo do requisito → como é atendido → estado. Payload montado em `camera-status.service.ts`.

| Atributo (RF-CAM-04) | Critério (domínio) | Como é atendido | Estado |
| --- | --- | --- | --- |
| online/offline | Estado de conexão corrente | `connectionStatus` do `operationalSnapshot`; push por `camera:status:update` | Implementado |
| resolução | Resolução atual do stream | `streamQuality.resolution` do `CameraStreamProfile` SECONDARY ativo | Implementado |
| fps | Taxa de quadros | `streamQuality.fps` (`frameRate`, pode ser `null`) | Implementado |
| bitrate | Taxa de bits | `streamQuality.bitrate` (`bitrateKbps`) | Implementado |
| modo de operação | Modo corrente | `operationMode` = `lifecycleState` da câmera | Implementado |
| posição PTZ | Pan/tilt/zoom atuais | `ptz` do snapshot; push ao vivo por `camera:ptz:position` | Implementado |
| estado do IR | IR ligado/desligado | `irStatus` no payload | **Não implementado** (`null`, reservado) |
| presets carregados | Presets nomeados disponíveis | `presets` (id + nome) via `ptzPresets` | Implementado |
| geoposicionamento | Posição no mapa | `location` (`lat`/`lng`) quando definidos | Implementado |

**Canais de entrega:** WebSocket `cameras-status` (`camera:status:snapshot` no assinar; `camera:status:update`, `camera:ptz:position`, `camera:event:new` no push) e REST `GET /api/cameras/:id/status` (sob demanda). Ver [[Status em tempo real - Fluxos]].

## RNF-CAM-01 - Escalabilidade horizontal

| Critério (domínio) | Estado |
| --- | --- |
| A rede de câmeras cresce sem interrupção do serviço nem redesign da plataforma; o realtime entrega o status a todos os operadores conectados independentemente de quantas réplicas o serviço tenha | **Atendido** - ver nota abaixo (corrigido em 24/08; esta linha dizia "em risco / pré-requisito pendente") |

## Nota de escala e latência

- **Latência.** O push é in-process: worker de saúde → EventBus → handler → `emit`. Não há salto por Kafka, então a latência é baixa (limitada pela cadência do worker de saúde, não pelo transporte). O snapshot cacheado no Redis dá o primeiro frame rápido ao assinar; leitura best-effort com fallback ao DB.
- **Escala - resolvido.** O broadcast **cruza réplicas** desde que o `RedisIoAdapter` (`@socket.io/redis-adapter`, CROSS-043) foi ligado em `main.ts` (PR [#1175](https://github.com/atmanadmin/attlas-2026/pull/1175), SOFTWARE-2356, 31/07) - confirmado no código em 24/08. Antes disso, cada pod só conhecia seus próprios sockets e um evento nascido na réplica B não chegava ao cliente ligado na réplica A; com o adapter, `server.to(sala).emit()` alcança qualquer réplica. Detalhe, incluindo a exceção local-only de `camera:health:live`, em [[Status em tempo real - Arquitetura e estratégias]].
- **Pré-requisito atendido.** O Redis do `ms-cameras` está provisionado (não é mais "só config de cache") e o adapter está ligado - RNF-CAM-01 atendido para o canal de status. Contexto histórico do problema em `kubernetes/docs/06-PROBLEMAS-IDENTIFICADOS.md` (Problema 2) - documento pode não refletir a resolução, não conferido nesta passada.

## Relacionados

[[Status em tempo real]] · [[Status em tempo real - Arquitetura e estratégias]] · [[Saúde e monitoramento]] · `kubernetes/docs/06-PROBLEMAS-IDENTIFICADOS.md`
