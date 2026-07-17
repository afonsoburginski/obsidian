---
tags:
  - attlas
  - sprint-24
  - card
card: SOFTWARE-2134
sprint: Sprint 24 (13/7/26 - 19/7/26)
status: FEITO - PR #790 MERGED na develop em 15/7/26. Aprovado por rezendelc + danielGuerra. A 1a fatia do analítico ao vivo está entregue.
atualizado: 2026-07-17
conclusao: "100% (merged na develop)"
---

# SOFTWARE-2134 - Analítico de vídeo ao vivo (detecção + bounding boxes)

Primeira fatia **funcionando de ponta a ponta** da integração do laço virtual por vídeo: o analítico embarcado da câmera detecta os objetos, o backend consome esse fluxo e o frontend mostra em tempo real, no player, as regiões acendendo e as caixas (bounding boxes) sobre os veículos.

Funcionamento detalhado (fluxograma + decisões técnicas): **[[SOFTWARE-2134 - Decisão técnica e fluxo (analítico ao vivo)]]**.

## O que foi entregue (PR #790)

- **Backend (ms-cameras)**: gateway WebSocket novo (`/cameras-analytics`) que o front já esperava, emitindo `camera:analytics:detection` (região ocupada) e `camera:analytics:frame` (bounding boxes por objeto). Um consumer lê o stream per-frame que o device publica e casa a detecção com a câmera pelo `source_id` do device e a região pela ordem estável do `/regions` (não pela posição no frame, que o device varia). Rota liberada no Kong.
- **Frontend (web-attlas)**: na aba Analíticos, as bounding boxes desenhadas sobre o vídeo (cor por classe - carro/ônibus/moto), o destaque das regiões ocupadas e um **log de detecções em tempo real**. Segue o esquema do attlas 25 (posição em % sobre a área visível do vídeo).
- **Contratos**: `IAnalyticsFrameEvent` / `IAnalyticsDetectionBox` em `@attlas/contracts`.
- **Seed**: câmera de teste do analítico (10.11.20.101) com `deviceSourceId` pra casar a detecção.

## Rodada de review (15/7)

O rezendelc pediu ajustes no front (`CHANGES_REQUESTED`), todos no overlay de analíticos. Resolvidos e commitados (`refactor: extrai cores e magic numbers do overlay para constantes/tokens`), respondidos nas threads:

- **Cores das bounding boxes viram tokens do design system.** Antes eram hex soltos no `types.ts` (`#2563eb` etc.); agora são tokens `--base-analytics-*` no `theme.css` (light + dark) e um mapa de consts em arquivo próprio (`analytics-box-colors.constants.ts`) que aponta pros tokens.
- **Magic numbers viram constantes importadas.** Os números de tuning da interpolação/sync (delays, EMA, janelas) saíram de estáticos e literais inline pra um arquivo dedicado (`camera-analytics-overlay.constants.ts`).
- **`types.ts` ficou só com interfaces** (respeita a regra de uma declaração por arquivo).
- **Varredura dos CSS do PR:** troquei um `150ms ease` cru por `var(--motion-fast)` e o `--primary-foreground` pelo semântico `--base-primary-foreground` no painel.
- Gate ok de novo: `nx lint web-attlas` 0 erros e `nx build web-attlas` passando.

## Estado atual

- PR **#790 MERGED** na `develop` em **15/7/26** (16:35 UTC). Aprovada por **rezendelc** e **danielGuerra**. A fatia do analítico ao vivo ponta-a-ponta está na develop.
- Build + lint (0 erros) em contracts, ms-cameras e web-attlas.
- Sistema **rodando local** (ms-cameras, ms-organization, ms-dai, ms-virtual-loop, Kong, mediamtx). Validado ao vivo com o device real 10.11.20.101 (producer ligado, stream per-frame chegando, caixas acompanhando os carros). A câmera pode estar offline em alguns momentos - sem detecção nesses períodos, o que é esperado.

## Quanto já concluímos

**~90%.** O escopo desta task (a fatia do analítico ao vivo ponta-a-ponta) está **implementado e validado**: backend consumindo o stream + WebSocket, contratos, seed e o overlay + log no front. Diff da PR: ~1.5k linhas em 33 arquivos. O que falta é só o **fim do fluxo de review** (aprovação do rezendelc + merge na develop). As frentes de laço (CRUD/provisionamento no device, ms-virtual-loop/dai/acom) **não contam aqui** - são task/branch separada.

## Aprendizados / armadilhas (debug do dia)

- O device **não alcança** o host local (rota one-way via tailscale), então ele não faz push pra cá. O jeito que funcionou: **consumir o stream `traffic-motion-detection.detections` direto do broker de dev** (plaintext, alcançável) onde o device publica. Parametrizar essa fonte por env é follow-up.
- Ligar o producer do device exige `POST /producer?enable=true` (sem o `enable` dá 422).
- O array `regions[]` do frame **omite regiões vazias e varia a ordem** - casar por `region_id`, nunca pela posição.
- "Sempre verde" pode ser **real**: região do tamanho da faixa em rua movimentada tem carro em quase todo frame. Blink por veículo exige laço fino e provisionado no device.

## Fora desta PR (frentes seguintes)

- Config/desenho dos laços indo pro device (CRUD + provisionamento) e os microsserviços ms-virtual-loop / ms-dai / ms-acom estão numa linha separada com specs SDD (branch própria), a reconciliar com os contratos da develop.
- Alinhar as regiões do front com as do device (front carregar as regiões do device em vez do localStorage).
