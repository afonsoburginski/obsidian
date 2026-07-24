---
tags:
  - attlas
  - sprint-26
  - moc
sprint: Sprint 26 (27/7/26 - 2/8/26)
status: planejamento (iniciado 24/07) - sprint de QA/teste e comparação, sem feature nova. Objetivo = exercitar de ponta a ponta o que entrou nas sprints anteriores (câmeras, dashboard, eventos), achar bugs, e medir/comparar streaming e hardware entre Attlas 25 e 26.
atualizado: 2026-07-24
---

# Attlas - Sprint 26

Sprint de **teste de funcionalidade + comparação de performance**, não de feature nova. Exercitar de ponta a ponta o que foi construído (câmeras, dashboard, eventos) e comparar o streaming/hardware do Attlas 26 com o 25.

## Cards (ClickUp, squad 2)

### Teste e comparação (streaming / hardware)

- **[Teste] Performance do streaming de vídeo: banda, latência e média** (SOFTWARE-2314) - medir banda média por stream, latência (TTFF / glass-to-glass) e média geral sob carga; vira baseline pra comparar com o 25.
- **[Teste] Comparativo Attlas 25 x 26: video wall** - funcionalidades, integração, comportamento, regressões.
- **[Teste] Comparativo Attlas 25 x 26: arquitetura de hardware e streaming** - protocolos (WebRTC/HLS), codecs, topologia de relays, pipeline de mídia e recursos de máquina.

### Teste de funcionalidade (telas)

- **[Teste] Fluxo completo de câmera** (SOFTWARE-2317) - cadastro, validação, assistir (player ao vivo), editar, e comportamento do player em cada etapa.
- **[Teste] Tela de Dashboard de câmeras** - KPIs, gauge, donuts, marcadores do mapa, heatmap, série de uptime, banda, conectividade.
- **[Teste] Tela de Eventos e detalhes** (SOFTWARE-2319) - lista, filtros, stats, timeline pela cadeia do incidente, recorrência, observações, reportar; side card/drawer + página de detalhes.

## Notas de planejamento

- Prefixo dos cards: **[Teste]** (a confirmar; alternativa [QA]).
- Pontos por sprint: campo nativo do ClickUp, preencher à mão (MCP não escreve). Estimativas a definir por card.
- Base do que será testado: tela de Eventos + detalhes (2289/2294/2295, mergeados na #951), dashboard backend (2213-2219, em code review), streaming/WebRTC (fundação CROSS-032/TURN).
