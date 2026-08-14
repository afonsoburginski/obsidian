---
tags:
  - attlas
  - task
  - escalabilidade
  - kubernetes
  - websocket
  - streaming
  - backlog
  - sem-prazo
card: SOFTWARE-2009
clickup: https://app.clickup.com/t/86ajc71x6
titulo: "[Back] ms-cameras: escalabilidade horizontal em Kubernetes (WS, healthcheck, streaming)"
frente: Escalabilidade / Infra
tamanho: a estimar (épico)
status: backlog, sem prazo - mas a fatia 1 saiu por fora, dentro da PR #1175 do SOFTWARE-2356 (31/07) - adapter Redis do Socket.IO em @attlas/core-messaging (CROSS-043), Redis provisionado para o ms-cameras e single-writer por device via lease Redis (PROJ-017). Falta reescopar o que sobrou do épico. Higiene de board em 10/08: home movida da lista da Sprint 23 para a da Sprint 28 (backlog preservado) e localização secundária pendurada na lista da Sprint 27 removida.
lista_clickup: Sprint 23 (6/7/26 - 12/7/26)
sprint: "[[00 - Sem prazo (backlog)]]"
atualizado: 2026-07-31
---

# Escalabilidade horizontal do ms-cameras em Kubernetes

> Tarefa 7. **Épico**, provavelmente quebra em várias atômicas por subsistema. Preparar o `ms-cameras` para rodar com múltiplas réplicas de ponta a ponta. Hoje vários subsistemas assumem instância única (estado in-memory) e quebram ou duplicam trabalho ao escalar.

## Por que quebra sob N réplicas

Estado in-memory por réplica + probes/relays por instância fazem o serviço não ser horizontalmente escalável hoje. O Kubernetes escala pods, mas o serviço não coordena o que cada réplica faz.

## Subsistemas afetados (ponta a ponta)

> [!done] Parte disto já foi entregue em 31/07 pela PR #1175 (card SOFTWARE-2356)
> A validação final do frontend expôs os mesmos problemas e eles foram corrigidos ali, fora deste
> épico. Ver [[Attlas - Sprint 26]] §"Validação final do frontend". O que sobrou aqui precisa ser
> reescopado antes de virar atômica.

### 1. WebSocket (atualização de dados no frontend)
Socket.IO sem adapter compartilhado: cada réplica tem as salas na própria memória, então um cliente na réplica A não recebe evento emitido pela réplica B. Já reproduzido na quito (réplicas novas com 0 conexões, conexões vivas derrubadas no scale).

- [ ] **Funil para o client side consumir websocket** (ponto único/coordenado de conexão).
- [x] **Adapter com Redis** (socket.io Redis adapter) para propagar eventos entre réplicas — feito na #1175 como `CROSS-043`, em `@attlas/core-messaging/socketio`, com o gauge `socketio_redis_adapter_up`.
- [ ] **Lock no Redis para canal websocket** (dono único por canal/sala) — parcial: existe lease por device para o monitor (`PROJ-017`), não por sala de WS.
- [ ] **Shards Redis** (distribuir os canais/carga do pub-sub).
- [x] `redis-cameras` não existe hoje no ambiente - provisionar — provisionado na #1175 (compose + setup-env).

### 2. Healthcheck (probes nas câmeras)
Cada réplica hoje monitoraria TODAS as câmeras (WS Axis / ONVIF PullPoint + ping). Com N réplicas = N x probes batendo em cada câmera. Precisa de ownership/particionamento: cada câmera monitorada por uma única réplica.

- [x] **Resolvido na #1175 (`PROJ-017`)**: lease Redis por device (`cameras:monitor:lease:*`), um monitor cluster-wide por device, handoff ≤15s no deploy e fallback monitor-tudo com log ERROR quando o Redis cai. Também deduplicou a conexão VAPIX que era aberta uma vez por sistema-tenant no mesmo hardware.

### 3. Streaming / pipeline
Relay ffmpeg + mediamtx com estado de sessão e viewer count in-memory por réplica (não compartilhado). Precisa coordenar quem roda a relay de cada câmera e como o viewer count é visto entre réplicas. Liga direto com [[SOFTWARE-2003 - Ciclo de vida de sessões de streaming e telemetria de banda por câmera]] (SOFTWARE-2003).

## Modelo proposto

- [ ] **Pod pai (orquestrador)**: faz a distribuição/particionamento da carga de trabalho (câmeras) entre as réplicas, tanto para healthcheck quanto para streaming.
- [ ] **Mesmo com lock no Redis**, pensar que o trabalho precisa ser escalonado/balanceado entre as réplicas - o lock garante dono único de um recurso, mas não distribui carga sozinho.

## A definir

- [ ] Desenhar a arquitetura ponta a ponta (WS + healthcheck + streaming) sob N réplicas.
- [ ] Estratégia de particionamento de câmeras (consistent hashing? lease por câmera no Redis?).
- [ ] Quebrar em atômicas por subsistema.

## Escopo além do ms-cameras

Mesmo problema de WebSocket vale para `ms-pmv` e `ms-communication-channels`. O adapter Redis + funil podem virar padrão compartilhado.
