---
tags:
  - attlas
  - sprint-22
  - saude-camera
  - contexto
frente: Saúde
sprint: "[[Attlas - Sprint 22]]"
---

# Saúde da Câmera — regras de negócio e contratos

> Contexto compartilhado das Tarefas 4, 5 e 6. Objetivo final: `GET /api/cameras/:id/health?period=7d|30d|90d` → `ICameraHealthMetrics`, que alimenta a aba inteira do Figma.
> Tasks: [[SOFTWARE-1922 - Janelas de 5 min + latência + rollup 90d]] · [[SOFTWARE-1923 - Bitrate histórico + TTFF]] · [[SOFTWARE-1924 - getHealthMetrics + série + SLA]]

A "Saúde da Câmera" aparece como aba na página de detalhe e como modal aberto pela InfoCam no videowall (tabs "Informações Gerais" | "Saúde da Câmera"). Mesmo backend nos dois.

## Regras de negócio (planilha lida)

- **Disponibilidade medida em janelas de 5 minutos.** Cada janela classifica a câmera em 1 de 3 estados: **Online / Degradada / Offline**. Barras por dia (7d) / semana (30d) e os totais do período são a composição dessas janelas. A unidade NÃO é rollup diário.
- **SLA = % do tempo Online sobre o período.** Só Online conta; Degradada e Offline reduzem. Ex 7d: Online 152.0h = 90.5% → "SLA descumprido 90.50%".
- **Meta de SLA = 99.0%** (env `CAMERA_SLA_TARGET_PERCENT`, mesma para todas). Desvio = Online% − meta (90.5 − 99.0 = −8.5%).
- **Uptime é métrica SEPARADA do SLA** (card com (i), reachability). Resolvido no #578: `uptimePercent` = número do SLA (Online%); `reachabilityPercent` (opcional) = (Online + Degradada) / total, para o card Uptime. Adição em vez de rename para não quebrar o build do web-attlas (mock consome `uptimePercent`); rename `uptimePercent` → `slaOnlinePercent` fica como follow-up coordenado com o front.
- **Mapa 4 estados → 3:** STABLE → Online; PARTIALLY_UNSTABLE + UNSTABLE → Degradada; OFFLINE → Offline. Janela vazia/faltante conta como **Offline**.

## Contratos (já existem, não redesenhar)

- `i-camera-health-metrics.ts` → `ICameraHealthMetrics` (payload completo)
- `i-camera-bitrate-latency-sample.ts` (série do gráfico)
- `i-camera-availability-slice.ts` (online/degradada/offline: horas + %)
- `i-camera-daily-availability.ts` (barras empilhadas por dia)
- `camera-health-period.type.ts` (`'7d' | '30d' | '90d'`)

Atenção à ordem de rotas estáticas vs `:id` (ParseUUIDPipe).

## Fontes de verdade

- **Figma** "Módulo - Cameras", aba "Saúde da Câmera": 7 dias por hora no node `1218-344565`; 30 dias por semana no node `1630-391504`.
- **Planilha** "saúde de câmeras no videowall": `backend/sheet saude de cameras no videowall.png` no repo.
- **Contratos** em `libs/contracts/src/lib/camera/`.
