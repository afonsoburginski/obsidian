---
tags:
  - attlas
  - sprint-23
  - task
  - escalabilidade
  - kubernetes
  - websocket
  - streaming
card: SOFTWARE-2009
clickup: https://app.clickup.com/t/86ajc71x6
titulo: "[Back] ms-cameras: escalabilidade horizontal em Kubernetes (WS, healthcheck, streaming)"
frente: Escalabilidade / Infra
tamanho: a estimar (épico)
status: Sprint 24 ataca a fatia 1 (redis-cameras + Socket.IO Redis adapter + WS scoping MOD-011 4.2)
sprint: "[[Attlas - Sprint 24]]"
atualizado: 2026-07-13
---

# Escalabilidade horizontal do ms-cameras em Kubernetes

> Tarefa 7. **Épico**, provavelmente quebra em várias atômicas por subsistema. Preparar o `ms-cameras` para rodar com múltiplas réplicas de ponta a ponta. Hoje vários subsistemas assumem instância única (estado in-memory) e quebram ou duplicam trabalho ao escalar.

## Por que quebra sob N réplicas

Estado in-memory por réplica + probes/relays por instância fazem o serviço não ser horizontalmente escalável hoje. O Kubernetes escala pods, mas o serviço não coordena o que cada réplica faz.

## Subsistemas afetados (ponta a ponta)

### 1. WebSocket (atualização de dados no frontend)
Socket.IO sem adapter compartilhado: cada réplica tem as salas na própria memória, então um cliente na réplica A não recebe evento emitido pela réplica B. Já reproduzido na quito (réplicas novas com 0 conexões, conexões vivas derrubadas no scale).

- [ ] **Funil para o client side consumir websocket** (ponto único/coordenado de conexão).
- [ ] **Adapter com Redis** (socket.io Redis adapter) para propagar eventos entre réplicas.
- [ ] **Lock no Redis para canal websocket** (dono único por canal/sala).
- [ ] **Shards Redis** (distribuir os canais/carga do pub-sub).
- [ ] `redis-cameras` não existe hoje no ambiente - provisionar.

### 2. Healthcheck (probes nas câmeras)
Cada réplica hoje monitoraria TODAS as câmeras (WS Axis / ONVIF PullPoint + ping). Com N réplicas = N x probes batendo em cada câmera. Precisa de ownership/particionamento: cada câmera monitorada por uma única réplica.

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
