---
tags:
  - attlas
  - task
  - backlog
  - sem-prazo
  - streaming
  - ms-cameras
card: SOFTWARE-2687
clickup: https://app.clickup.com/t/86ak5e33b
titulo: "[Back] Saturação de banda de saída da EC2 sob carga concorrente de streaming (mediamtx)"
frente: Streaming
tamanho: a estimar
status: "SAIU DO SEM PRAZO em 29/08: comprometido para sábado 30/08 em hora extra, decisão do report de 28/08. A execução, com os requisitos levantados contra o código, mora em [[SOFTWARE-2687 - Tráfego na origem, isolamento do controle e linha de base de carga]]. Esta nota fica como o registro do achado. Histórico: SEM PRAZO desde 24/08. Achado ao investigar instabilidade de câmeras relatada pelo usuário; causa raiz confirmada via dados de healthcheck no banco (CameraAvailabilityWindow) + sar do host + logs do mediamtx. Card criado no ClickUp em 24/08, na lista da Sprint 30 (vigente), status backlog; sem pontos (tamanho ainda a estimar)."
sprint: "[[00 - Sem prazo (backlog)]]"
atualizado: 2026-08-29
---

# Saturação de banda de saída da EC2 sob carga concorrente de streaming (mediamtx)

> Investigação completa, causa raiz, números reais e diagramas em [[Incidentes - Streaming (ms-cameras)]] (seção "Responsabilidade: Infraestrutura + ms-cameras (Streaming)").

> [!success] Saiu do sem prazo em 29/08, tem data
> O trabalho ficou com data marcada, sábado 30/08 em hora extra. O plano de execução, com os
> requisitos levantados contra o código e o recorte de PR única, está em
> [[SOFTWARE-2687 - Tráfego na origem, isolamento do controle e linha de base de carga]]. Esta nota
> permanece como o registro do achado de 24/08 e das propostas daquele momento.

## Achado

Dados de healthcheck persistidos em `CameraAvailabilityWindow` confirmam que, das 11:50 às 12:15 UTC de 24/08, TODAS as câmeras da rede dev ficaram `DEGRADED` simultaneamente (latência 145ms → 800-1300ms), coincidindo com um salto de ~150x no tráfego de saída (`ens5`) do host EC2. Causa: pico de visualização concorrente (múltiplas sessões WebRTC + múltiplas variantes de qualidade ABR publicadas por câmera ao mesmo tempo) saturando a mesma interface de rede que carrega o tráfego fino de healthcheck.

> [!warning] Estado em 29/08: a parte "múltiplas variantes ABR por câmera" desta frase está errada
> A leitura de código de 27/08, reconfirmada em 29/08, mostra que o player pede uma qualidade por vez
> e o backend cria uma sessão por combinação de câmera, qualidade e codec. Não existe leque para três
> variantes. O fan-out real na origem tem outras quatro fontes, levantadas em
> [[SOFTWARE-2687 - Tráfego na origem, isolamento do controle e linha de base de carga]]: uma relay por
> linha de sistema em vez de por câmera física, relays separadas para H264 e H265, a projeção do
> videowall puxando direto da câmera em nível PRIMARY, e a sobreposição de 10 segundos durante a troca
> de nível. O restante da frase, sobre a saturação da interface compartilhada, continua correto.


## Achado relacionado que agrava o mesmo problema

[[Streaming - Diagnóstico de oscilação WHEP-HLS no videowall]] - reproduzido ao vivo no mesmo EC2 dev em 24/08: o player do videowall entra num loop de reconexão WebRTC (WHEP) que nunca estabiliza quando a rede degrada, gerando tráfego de sessão extra continuamente. Isso pode explicar boa parte dos 1062 eventos de sessão / 130 sessões WebRTC vistos no episódio de saturação - **o fix de um pode reduzir a gravidade do outro**: corrigir o backoff do WHEP reduz o tráfego de retry durante qualquer degradação de rede, e resolver a saturação de banda reduz a chance de o WHEP falhar e entrar no loop.

## Por que importa

Isso é exatamente o risco que a Fase 3 da [[SOFTWARE-2003 - Ciclo de vida de sessões de streaming e telemetria de banda por câmera]] ("validação de escalabilidade... sem saturar banda") deveria cobrir, e ainda não tem critério de aceite comprovado. O incidente é evidência ao vivo, numa escala pequena (14 câmeras, poucos viewers), de que o sistema não tem nenhum limite/QoS entre tráfego de vídeo e tráfego de controle (healthcheck) na mesma interface, e que o próprio mecanismo de recuperação de conexão (WHEP↔HLS) pode amplificar o problema em vez de absorvê-lo.

## O que precisa mudar (propostas com priorização, 27/08)

### P0 - Correções de código (sem mudar infra)

- **Backoff WHEP no player** (30 min): `MediaConnection` guarda `lastWhepFailure` com TTL 60s; se WHEP falhou recentemente, pula direto para HLS. Elimina o loop de reconexão que amplifica tráfego.
- **Warm-up no monitor de saúde** (15 min): após transição para `playing`, ignorar os primeiros 10s do monitor antes de considerar "struggling". Evita `switchTo()` desnecessário.

### P1 - Limites no servidor

- **Limite de sessões por câmera** (15 min): `MAX_SESSIONS_PER_CAMERA = 5` (env), erro 429 quando excede. Previne que videowall sature.
- **Limpeza de rollup diário** (5 min): adicionar delete em `CameraAvailabilityDailyRollup` com `date < NOW() - 90 days`. Previne crescimento indefinido.

### P2 - Otimizações de tráfego

- ~~**ABR sob demanda**~~: descartado em 27/08 e reconfirmado em 29/08. Já é sob demanda, uma
  qualidade por vez. O ganho de tráfego existe, mas vem dos quatro multiplicadores do callout acima.
- ~~**QoS healthcheck** com `tc`~~: descartado em 27/08. O `fq_codel` já está ativo na interface e o
  gargalo apontado é o crédito de rede da instância `t3a.2xlarge`, que disciplina de fila não contorna.

### P3 - Observabilidade

- **Alerta automático** (1h): query periódica em `CameraAvailabilityWindow` para `avgLatencyMs > 500` em >50% das câmeras. Detecção proativa.

## Por que ficou sem prazo

É investigação/achado, não spec fechada - falta decidir a estratégia de mitigação (limitar variantes vs. QoS vs. backoff do player vs. os três) antes de virar card com DoD. **Atualização 27/08**: propostas priorizadas acima; P0 e P1 são rápidos (<1h total) e devem ser implementados antes de qualquer carga real. **Atualização 29/08**: P0 e P1 saíram na PR #2246; o que restou ganhou data e virou [[SOFTWARE-2687 - Tráfego na origem, isolamento do controle e linha de base de carga]].

## Encosta em

- [[Incidentes - Streaming (ms-cameras)]] - investigação completa, diagramas e evidências da saturação de banda.
- [[Streaming - Diagnóstico de oscilação WHEP-HLS no videowall]] - achado relacionado, mesmo dia, mesmo ambiente.
- [[SOFTWARE-2003 - Ciclo de vida de sessões de streaming e telemetria de banda por câmera]] - Fase 3.
- [[Streaming - Arquitetura]], [[Streaming - Diagnóstico de travamento no WebRTC]].
