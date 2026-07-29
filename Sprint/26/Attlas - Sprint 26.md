---
tags:
  - attlas
  - sprint-26
  - moc
sprint: Sprint 26 (27/7/26 - 2/8/26)
status: leva de QA (2317+2318+2319) fechada em 29/07 — 2319 fechada no ClickUp (0 bugs de código), #1138 e #1139 APROVADAS, #1120/#1121 aguardando review, #1137 (2317) levou changes-requested com 5 bloqueantes e todos foram corrigidos no mesmo dia (3 suítes quebradas + migration do índice único parcial da BR-CRUD-009 + tradução do P2002 + bug de porta no coletor de banda), aguardando re-review. Comparativo Attlas 25x26 pausado (voltou pro backlog).
atualizado: 2026-07-29
---

# Attlas - Sprint 26

Sprint de **teste de funcionalidade + comparação de performance**, não de feature nova. Exercitar de ponta a ponta o que foi construído (câmeras, dashboard, eventos) e comparar o streaming/hardware do Attlas 26 com o 25.

**Atualização 27/07**: o comparativo Attlas 25x26 (streaming/hardware, video wall) foi pausado — volta
depois. Foco desta semana é validação manual de dados (front x banco) na listagem e no cadastro,
porque um QA dedicado entra no time semana que vem e essa validação vira insumo do repasse pra ele.

## Cards (ClickUp, squad 2)

### Teste e comparação (streaming / hardware) — pausado, backlog

- [[SOFTWARE-2314 - Performance do streaming de vídeo]] - medir banda média por stream, latência (TTFF / glass-to-glass) e média geral sob carga; vira baseline pra comparar com o 25.
- [[SOFTWARE-2315 - Comparativo Attlas 25x26 - video wall]] - funcionalidades, integração, comportamento, regressões.
- [[SOFTWARE-2316 - Comparativo Attlas 25x26 - arquitetura de hardware e streaming]] - protocolos (WebRTC/HLS), codecs, topologia de relays, pipeline de mídia e recursos de máquina.

### QA de funcionalidade (telas) — ativo

- [[SOFTWARE-2317 - Fluxo E2E de cadastro de câmera]] - cadastro, validação de credenciais, assistir (player ao vivo), editar. **Validado 27/07** — ver relatório [[SOFTWARE-2317-cadastro-e2e-validation]] (3 bugs corrigidos + 1 doc corrigida no ms-cameras).
- [[SOFTWARE-2318 - Dashboard de câmeras - validação E2E de dados]] - KPIs, gauge, donuts, marcadores do mapa, heatmap, série de uptime, banda, conectividade. **Validado 27/07** — ver relatório [[SOFTWARE-2318-dashboard-e2e-validation]] (0 bugs de código, 1 doc corrigida — 6 specs com rota errada). O front já estava ligado ao backend real desde 25/07 ([[SOFTWARE-2326 - Integração do dashboard de câmeras com o backend real|SOFTWARE-2326]], PR #1058, Closed) — falta só o clique-a-clique visual (Kong do dev defasado da develop).
- [[SOFTWARE-2319 - Eventos de câmeras - validação E2E de dados]] - lista, filtros, stats, timeline pela cadeia do incidente, recorrência, observações, reportar; side card/drawer + página de detalhes. **Validado 27/07, card fechado no ClickUp em 29/07** — ver relatório [[SOFTWARE-2319-eventos-e2e-validation]] (0 bugs de código).

### Clique-a-clique (28/07) — cards novos

O clique-a-clique pelas 3 telas (pendência dos 3 cards acima) rodou em 28/07 no EC2 `dev.v2`. Achados
que não cabiam no escopo de 2317/2318/2319 viraram 2 cards novos, mesmo prefixo `[QA]`, mesma lista:

- [QA] Painel de operações — câmeras sem geolocalização somem sem aviso ([SOFTWARE-2355](https://app.clickup.com/t/86ajr3feu), PR [#1120](https://github.com/atmanadmin/attlas-2026/pull/1120), CI verde) — spec (`UF-004`) já previa descartar câmera sem coordenada válida, mas o `console.warn` exigido nunca foi implementado; corrigido + bug de `catchError` que apagava a camada inteira numa falha parcial.
- [QA] Tela de eventos — filtro por dispositivo, período todo e rótulo de comparação ([SOFTWARE-2356](https://app.clickup.com/t/86ajr3ffz), PR [#1121](https://github.com/atmanadmin/attlas-2026/pull/1121), CI verde) — 3 gaps de UI, não bugs de dado (ver [[SOFTWARE-2319 - Eventos de câmeras - validação E2E de dados]]). CI falhou uma vez por flake de infra (testcontainer do `ms-traffic-model` inacessível, nada a ver com o diff) — rerun resolveu.
- [QA] Dashboard sem largura limite em telas ultra-wide ([SOFTWARE-2357](https://app.clickup.com/t/86ajr4e0z), PR [#1139](https://github.com/atmanadmin/attlas-2026/pull/1139), CI verde) — ver [[SOFTWARE-2318 - Dashboard de câmeras - validação E2E de dados]]. Branch antiga (cortada antes da #1058 mergear a mesma conversão de mock→real do dashboard); mesclada com a develop em 29/07 mantendo a versão já mergeada + removida uma rota Kong duplicada (`/api/dashboard/kpis` definida duas vezes) achada na mesclagem.

### Estado das PRs em 29/07

| Card | PR | CI | Review |
| --- | --- | --- | --- |
| 2317 | [#1137](https://github.com/atmanadmin/attlas-2026/pull/1137) | verde | changes-requested → 5 bloqueantes corrigidos, aguardando re-review |
| 2318 | [#1138](https://github.com/atmanadmin/attlas-2026/pull/1138) | verde | **aprovada** |
| 2319 | — | — | card fechado, 0 bugs de código |
| 2355 | [#1120](https://github.com/atmanadmin/attlas-2026/pull/1120) | verde | aguardando |
| 2356 | [#1121](https://github.com/atmanadmin/attlas-2026/pull/1121) | verde | aguardando |
| 2357 | [#1139](https://github.com/atmanadmin/attlas-2026/pull/1139) | verde | **aprovada** |

Detalhe dos achados de 2317/2318/2319 ficou direto nas notas de cada card (seções "Achados do
clique-a-clique" e, no 2317, "Review da PR #1137").

**Follow-ups em aberto** (🟡 não-impeditivos do review do #1137, candidatos a card): reativação de
câmera soft-deleted não limpa `CameraStreamProfile`/PTZ/snapshot da encarnação anterior (pode
aparecer online antes do primeiro heartbeat); autocomplete de interseção no cadastro é inoperável
por teclado.

## Notas de planejamento

- Prefixo dos cards ativos: **[QA]** (era **[Teste]**, renomeado em 27/07 junto com o rescopo).
- Pontos por sprint: campo nativo do ClickUp, preencher à mão (MCP não escreve). Estimativas a definir por card.
- Base do que será testado: tela de Eventos + detalhes (2289/2294/2295, mergeados na #951), dashboard backend (2213-2219, em code review), streaming/WebRTC (fundação CROSS-032/TURN).
- Achado transversal na validação de 2317: Kafka local não sobe nesta máquina (`cp-kafka` possivelmente
  emulado em arm64/Colima) — bloqueia login real via `ms-organization`. Vai provavelmente afetar a
  validação de 2318/2319 também se depender de login real; ver `local_dev_machine_setup` (memória do
  Claude) pro contorno usado (JWT assinado manualmente para testar via API).
