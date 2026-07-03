---
tags:
  - attlas
  - sprint-23
  - task
  - streaming
card: a criar no ClickUp
titulo: "[Back] Encerramento robusto de sessões de stream (reaper + lease de viewer)"
frente: Streaming
tamanho: a estimar
status: a planejar
sprint: "[[Attlas - Sprint 23]]"
atualizado: 2026-07-03
---

# Encerramento robusto de sessões de stream (reaper + lease de viewer)

> Tarefa 1. Origem: [[Incidente - vazamento de sessões de stream (banda das câmeras)]]. `ms-cameras` está **parado** no EC2 dev por causa disto. Frente Streaming, mesma área da [[SOFTWARE-1923 - Bitrate histórico + TTFF]].

## Problema

A relay ffmpeg só encerra quando `viewerCount` chega a 0. O contador depende de o front chamar `GET /hls` (abre) e `DELETE /hls` (fecha) em par. Quando o `DELETE` não chega (aba fechada, refresh, queda de rede, videowall recarregando), o contador fica preso acima de 0, a sessão nunca encerra e o ffmpeg fica puxando 1080p da câmera para sempre, saturando o uplink sem entregar para ninguém. No EC2 isso deixou 11 relays órfãs com o mediamtx em 0 paths.

O `StreamSessionRegistry` confia 100% no teardown do cliente e não tem reconciliação com a realidade.

## Objetivo

Garantir que uma sessão de stream só exista enquanto há espectador de verdade, sem depender de um `DELETE` limpo do cliente.

## Proposta

- [ ] **Reaper de reconciliação** (resolve a raiz): worker periódico que consulta o mediamtx e encerra a sessão cujo path está com **0 readers** há N minutos. Fonte de verdade = mediamtx, não o contador em memória. Mata de uma vez a relay órfã e o path fantasma.
- [ ] **Lease com heartbeat de viewer** (prevenção no cliente): o viewer renova um lease periódico; se o sinal para de chegar, o sistema decrementa sozinho. Refresh e queda deixam o lease expirar sem depender do `DELETE`.

O reaper sozinho já resolve o incidente. O lease é a defesa complementar. Ideal fazer os dois.

## Escopo (arquivos)

- `apps/ms-cameras/src/streaming/services/stream-session-registry.service.ts` (contagem/lease)
- `apps/ms-cameras/src/streaming/services/ffmpeg-session.service.ts` (parada/respawn)
- provável worker novo em `streaming/` para o reaper (cron) usando o `MediamtxClient` (leitura de readers por path).

## Critérios de aceite

- [ ] Fechar a aba / dar refresh / cair a rede sem `DELETE` encerra a sessão dentro de N minutos.
- [ ] Nenhuma relay ffmpeg fica ativa com 0 readers no mediamtx além do grace + margem do reaper.
- [ ] Bitrate continua correto (`null` quando de fato não há sessão), sem regressão da telemetria da #577.

## Dependências e riscos

- Depende do `MediamtxClient` (UC-027, já existe desde a #566) para ler readers por path.
- Cuidar de corrida entre grace de 60s, respawn por reconexão e o tick do reaper para não matar sessão legítima recém-aberta.
