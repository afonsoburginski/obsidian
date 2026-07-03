---
tags:
  - doc
  - cameras
  - ms-cameras
  - realtime
servico: ms-cameras
fonte: apps/ms-cameras/src/cameras/realtime
atualizado: 2026-07-03
---

# Status em tempo real — Requisitos e SLA

> Parte de [[Status em tempo real (push)]]. Requisitos: `docs/modules/cameras.md` (§8.1, §9).

## RF-CAM-04 — Monitoramento real-time

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

## RNF-CAM-01 — Escalabilidade horizontal

| Critério (domínio) | Estado |
| --- | --- |
| A rede de câmeras cresce sem interrupção do serviço nem redesign da plataforma; o realtime entrega o status a todos os operadores conectados independentemente de quantas réplicas o serviço tenha | **Em risco / pré-requisito pendente** — ver nota abaixo |

## Nota de escala e latência

- **Latência.** O push é in-process: worker de saúde → EventBus → handler → `emit`. Não há salto por Kafka, então a latência é baixa (limitada pela cadência do worker de saúde, não pelo transporte). O snapshot cacheado no Redis dá o primeiro frame rápido ao assinar; leitura best-effort com fallback ao DB.
- **Escala (regra dura).** O broadcast **não cruza réplicas**: cada pod só conhece seus próprios sockets e `server.to(sala).emit()` roda em um pod só. Com o `ms-cameras` já configurado para escalar (KEDA), um evento nascido na réplica B não chega ao cliente ligado na réplica A. Enquanto há 1 réplica não aparece; ao escalar, aparece.
- **Pré-requisito para escalar com segurança.** Ligar o **adapter Redis do Socket.IO** (`@socket.io/redis-adapter` via `IoAdapter` custom no `main.ts`) e, antes, **provisionar o Redis do `ms-cameras`** (hoje só config de cache). Só então o RNF-CAM-01 é atendido para o canal de status. Contexto, teste no cluster e plano completo em [[06-PROBLEMAS-IDENTIFICADOS]] (Problema 2).

## Relacionados

[[Status em tempo real (push)]] · [[Status em tempo real - Arquitetura e estratégias]] · [[00 - Saúde e monitoramento]] · [[06-PROBLEMAS-IDENTIFICADOS]]
