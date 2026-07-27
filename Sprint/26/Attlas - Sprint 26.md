---
tags:
  - attlas
  - sprint-26
  - moc
sprint: Sprint 26 (27/7/26 - 2/8/26)
status: em andamento (27/07) - comparativo Attlas 25x26 pausado (voltou pro backlog); foco agora é só QA manual de listagem/cadastro antes do QA dedicado entrar no time (~03/08).
atualizado: 2026-07-27
---

# Attlas - Sprint 26

Sprint de **teste de funcionalidade + comparação de performance**, não de feature nova. Exercitar de ponta a ponta o que foi construído (câmeras, dashboard, eventos) e comparar o streaming/hardware do Attlas 26 com o 25.

**Atualização 27/07**: o comparativo Attlas 25x26 (streaming/hardware, video wall) foi pausado — volta
depois. Foco desta semana é validação manual de dados (front x banco) na listagem e no cadastro,
porque um QA dedicado entra no time semana que vem e essa validação vira insumo do repasse pra ele.

## Cards (ClickUp, squad 2)

### Teste e comparação (streaming / hardware) — pausado, backlog

- **[Teste] Performance do streaming de vídeo: banda, latência e média** (SOFTWARE-2314) - medir banda média por stream, latência (TTFF / glass-to-glass) e média geral sob carga; vira baseline pra comparar com o 25.
- **[Teste] Comparativo Attlas 25 x 26: video wall** (SOFTWARE-2315) - funcionalidades, integração, comportamento, regressões.
- **[Teste] Comparativo Attlas 25 x 26: arquitetura de hardware e streaming** (SOFTWARE-2316) - protocolos (WebRTC/HLS), codecs, topologia de relays, pipeline de mídia e recursos de máquina.

### QA de funcionalidade (telas) — ativo

- [[SOFTWARE-2317 - Fluxo E2E de cadastro de câmera]] - cadastro, validação de credenciais, assistir (player ao vivo), editar. **Validado 27/07** — ver relatório [[SOFTWARE-2317-cadastro-e2e-validation]] (3 bugs corrigidos + 1 doc corrigida no ms-cameras).
- **[QA] Tela de Dashboard de câmeras** (SOFTWARE-2318) - KPIs, gauge, donuts, marcadores do mapa, heatmap, série de uptime, banda, conectividade. Ainda não validado.
- **[QA] Tela de Eventos e detalhes** (SOFTWARE-2319) - lista, filtros, stats, timeline pela cadeia do incidente, recorrência, observações, reportar; side card/drawer + página de detalhes. Ainda não validado.

## Notas de planejamento

- Prefixo dos cards ativos: **[QA]** (era **[Teste]**, renomeado em 27/07 junto com o rescopo).
- Pontos por sprint: campo nativo do ClickUp, preencher à mão (MCP não escreve). Estimativas a definir por card.
- Base do que será testado: tela de Eventos + detalhes (2289/2294/2295, mergeados na #951), dashboard backend (2213-2219, em code review), streaming/WebRTC (fundação CROSS-032/TURN).
- Achado transversal na validação de 2317: Kafka local não sobe nesta máquina (`cp-kafka` possivelmente
  emulado em arm64/Colima) — bloqueia login real via `ms-organization`. Vai provavelmente afetar a
  validação de 2318/2319 também se depender de login real; ver `local_dev_machine_setup` (memória do
  Claude) pro contorno usado (JWT assinado manualmente para testar via API).
