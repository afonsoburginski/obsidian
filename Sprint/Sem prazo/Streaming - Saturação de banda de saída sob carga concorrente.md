---
tags:
  - attlas
  - task
  - backlog
  - sem-prazo
  - streaming
  - ms-cameras
card: a criar no ClickUp
titulo: "[Back] Saturação de banda de saída da EC2 sob carga concorrente de streaming (mediamtx)"
frente: Streaming
tamanho: a estimar
status: "SEM PRAZO desde 24/08. Achado ao investigar instabilidade de câmeras relatada pelo usuário; causa raiz confirmada via dados de healthcheck no banco (CameraAvailabilityWindow) + sar do host + logs do mediamtx. Backlog de correção documentado, sem card ClickUp ainda."
sprint: "[[00 - Sem prazo (backlog)]]"
atualizado: 2026-08-24
---

# Saturação de banda de saída da EC2 sob carga concorrente de streaming (mediamtx)

> Investigação completa, causa raiz, números reais e diagramas em [[Incidentes - Streaming (ms-cameras)]] (seção "Responsabilidade: Infraestrutura + ms-cameras (Streaming)").

## Achado

Dados de healthcheck persistidos em `CameraAvailabilityWindow` confirmam que, das 11:50 às 12:15 UTC de 24/08, TODAS as câmeras da rede dev ficaram `DEGRADED` simultaneamente (latência 145ms → 800-1300ms), coincidindo com um salto de ~150x no tráfego de saída (`ens5`) do host EC2. Causa: pico de visualização concorrente (múltiplas sessões WebRTC + múltiplas variantes de qualidade ABR publicadas por câmera ao mesmo tempo) saturando a mesma interface de rede que carrega o tráfego fino de healthcheck.

## Achado relacionado que agrava o mesmo problema

[[Streaming - Diagnóstico de oscilação WHEP-HLS no videowall]] - reproduzido ao vivo no mesmo EC2 dev em 24/08: o player do videowall entra num loop de reconexão WebRTC (WHEP) que nunca estabiliza quando a rede degrada, gerando tráfego de sessão extra continuamente. Isso pode explicar boa parte dos 1062 eventos de sessão / 130 sessões WebRTC vistos no episódio de saturação - **o fix de um pode reduzir a gravidade do outro**: corrigir o backoff do WHEP reduz o tráfego de retry durante qualquer degradação de rede, e resolver a saturação de banda reduz a chance de o WHEP falhar e entrar no loop.

## Por que importa

Isso é exatamente o risco que a Fase 3 da [[SOFTWARE-2003 - Ciclo de vida de sessões de streaming e telemetria de banda por câmera]] ("validação de escalabilidade... sem saturar banda") deveria cobrir, e ainda não tem critério de aceite comprovado. O incidente é evidência ao vivo, numa escala pequena (14 câmeras, poucos viewers), de que o sistema não tem nenhum limite/QoS entre tráfego de vídeo e tráfego de controle (healthcheck) na mesma interface, e que o próprio mecanismo de recuperação de conexão (WHEP↔HLS) pode amplificar o problema em vez de absorvê-lo.

## O que precisa mudar (candidatos, não fechado)

- Limitar/negociar variantes de qualidade (ABR) publicadas por câmera sob demanda, não sempre as três (secondary/tertiary/tertiary-h265).
- Isolar/priorizar o tráfego de healthcheck do tráfego de vídeo (QoS na interface, ou rota dedicada).
- Corrigir o backoff do `MediaConnection` (ver [[Streaming - Diagnóstico de oscilação WHEP-HLS no videowall]]) antes de qualquer coisa - é a correção mais barata e reduz o tráfego de retry independente da causa de fundo.
- Rodar de fato a Fase 3 da SOFTWARE-2003, usando este episódio como caso de teste real (reproduzir N viewers x M câmeras e medir o ponto de saturação).
- Alerta automático sobre `avgLatencyMs` agregado da rede (já gravado em `CameraAvailabilityWindow`), pra não depender de relato manual do usuário.

## Por que ficou sem prazo

É investigação/achado, não spec fechada - falta decidir a estratégia de mitigação (limitar variantes vs. QoS vs. backoff do player vs. os três) antes de virar card com DoD.

## Encosta em

- [[Incidentes - Streaming (ms-cameras)]] - investigação completa, diagramas e evidências da saturação de banda.
- [[Streaming - Diagnóstico de oscilação WHEP-HLS no videowall]] - achado relacionado, mesmo dia, mesmo ambiente.
- [[SOFTWARE-2003 - Ciclo de vida de sessões de streaming e telemetria de banda por câmera]] - Fase 3.
- [[Streaming - Arquitetura]], [[Streaming - Diagnóstico de travamento no WebRTC]].
