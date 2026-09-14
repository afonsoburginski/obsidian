---
tags:
  - attlas
  - sprint-33
  - validacao
  - analitico
aliases:
  - "Sprint 33 - validação das PRs"
  - "Checklist de validação da Sprint 33"
sprint: Sprint 33 (14/9/26 - 20/9/26)
status: "CRIADA em 14/09 quando as 22 tasks fecharam com PR aberta. É a lista de conferência: uma linha por PR, o que tem de funcionar, como provar, e o que só o usuário pode confirmar. Nada aqui está validado ainda."
atualizado: 2026-09-14
---

# Validação - as 34 PRs, uma a uma

Porta de entrada da conferência da [[Attlas - Sprint 33]]. As 22 tasks entregaram **34 PRs**, 7 delas
em stack. Esta nota existe para responder uma pergunta por PR: **ela entrega o valor que o card
pediu, e isso funciona de verdade?**

> [!warning] Nada nesta nota está validado
> Toda linha começa em `a validar`. O estado muda quando alguém rodar, não quando o CI ficar verde -
> CI verde prova que a suíte passa, não que a tela faz o que o card pediu.

## Regras da conferência

1. **Uma PR por vez.** Checkout da branch, subir o que ela precisa, provar, anotar.
2. **Nunca mergear.** O merge é decisão do usuário.
3. **Proibido `nx test`, `nx lint`, `nx build` e `tsc` na máquina local.** PC fraco. O CI é o gate.
4. O `web-attlas` já roda em modo dev no `:4200`. **Nunca subir `nx serve`** - o usuário sobe.
5. Tela se prova com Playwright no `:4200`, não com `curl`. `curl` dá 200 com build quebrado.
6. **EC2 (`aws-attlas-26`) é somente leitura**, a não ser que a PR peça mudança lá.
7. Achado de verdade vira comentário na PR, não nota solta.

## Ambientes

| Ambiente | Onde | Para que serve |
| --- | --- | --- |
| Front local | `:4200`, já no ar | Toda tela |
| Backend local | `npm run infra:up` + o ms que a PR toca | Rota e consumidor |
| EC2 dev | `dev.v2.attlas.atmansystems.com` (Tailscale `ubuntu@100.101.165.32`) | Câmera real, broker de campo |
| CI | 4 runners na VM da sumo | Suíte e build |

## As 34 PRs, em ordem de execução da sprint

### 1. CI e ambiente

| # | PR | O que tem de estar certo | Estado |
| --- | --- | --- | --- |
| 1 | #3402 | A suíte dos projetos da #3328 verde, e os três defeitos de produção que ela guardava corrigidos | a validar |
| 2 | #3431 | Só decisão e procedimento: a VM é t3a.2xlarge burstable, não 16 núcleos | a validar |
| 17 | #3447 | `npm run infra:up` sobe o banco do detector-history, e a face Métricas para de dar 502 | a validar |

### 2. Analítico servidor (stack)

| # | PR | O que tem de estar certo | Estado |
| --- | --- | --- | --- |
| 3 | #3432 | A inferência cabe num orçamento de CPU: `intraOpNumThreads`, teto no Compose | a validar |
| 3 | #3433 | Entrada do modelo medível, e a primeira caixa da câmera de volta | a validar |
| 4 | #3437 | O YOLO puxa RTSP direto da câmera, num perfil só dele | a validar |
| 4 | #3465 | O relay vira exceção; o reconciliador para de abrir path que ninguém lê | a validar |
| 4 | #3482 | A PTZ ganha os dois analíticos com uma decodificação por quadro | a validar |

### 3. Sincronização da caixa (stack)

| # | PR | O que tem de estar certo | Estado |
| --- | --- | --- | --- |
| 5 | #3438 | O front desenha no `captureTime` do quadro quando o transporte reporta um | a validar |
| 5 | #3472 | `useAbsoluteTimestamp` só nos paths do analítico, nunca nos do VMS | a validar |
| 5 | #3489 | O analítico carimba o quadro com o relógio da câmera, lido dos sender reports | a validar |

### 4. VMS (stack)

| # | PR | O que tem de estar certo | Estado |
| --- | --- | --- | --- |
| 6 | #3439 | O reaper para de derrubar o tile que está entrando; sessão WHEP conta como leitor | a validar |
| 6 | #3469 | Prova do decoder no cliente, e queda automática para H264 | a validar |
| 6 | #3487 | Keyframe por tempo, buffer por transporte, e o tile dizendo quando caiu para HLS | a validar |

### 5. Entrega de vídeo (stack)

| # | PR | O que tem de estar certo | Estado |
| --- | --- | --- | --- |
| 7 | #3440 | O modelo de fan-out que já existe, o caminho de escala, e a decisão sobre CDN | a validar |
| 7 | #3480 | Sessão por câmera e perfil: o segundo espectador entra na existente | a validar |

### 6. Detecção

| # | PR | O que tem de estar certo | Estado |
| --- | --- | --- | --- |
| 8 | #3441 | Cor e nome da região sobrevivem ao reload | a validar |
| 9 | #3443 | A câmera embarcada endereça um detector, e a tela diz quando não há | a validar |
| 12 | #3444 | O nome da peça descreve o que ela desenha; UF-053 com o contrato do relógio | a validar |
| 13 | #3452 | Uma lista só de classes de objeto, no contrato e nos quatro idiomas | a validar |
| 19 | #3476 | O erro da caixa em frenagem e conversão, aferido contra o teto de 400 ms | a validar |

### 7. Specs da Detecção (stack)

| # | PR | O que tem de estar certo | Estado |
| --- | --- | --- | --- |
| 10 | #3464 | UF-057 e a suíte dos seis utilitários puros | a validar |
| 10 | #3474 | UF-058, serviços e estratégias de cabeça, e o fim do apagamento de região no salvamento | a validar |
| 10 | #3492 | UF-059, as cinco peças de superfície, e os dois defeitos que a suíte guardava | a validar |

### 8. Analítico embarcado (stack)

| # | PR | O que tem de estar certo | Estado |
| --- | --- | --- | --- |
| 11 | #3471 | Broker certo por ambiente, e a tela avisando quando a câmera não publica nele | a validar |
| 11 | #3490 | O consumidor salta o atraso em vez de caminhar por ele | a validar |

### 9. Laço virtual e ACOM (stack)

| # | PR | O que tem de estar certo | Estado |
| --- | --- | --- | --- |
| 16 | #3462 | O overlay compartilhado aceita a geometria e a pintura da ACOM | a validar |
| 16 | #3478 | A ACOM desenha pelo compartilhado, e a cópia sai do repo | a validar |

### 10. Resto

| # | PR | O que tem de estar certo | Estado |
| --- | --- | --- | --- |
| 14 | #3453 | 503 quando o resolver de permissões não responde, e um nome só para o timeout | a validar |
| 15 | #3460 | Ler uma unidade de analítico sem compor a frota inteira | a validar |
| 18 | #3459 | A face que sai fica montada, e a lateral abre na lista | a validar |
| 20 | #3451 | Miniatura fora do ar para de ser pedida a cada montagem | a validar |
| 21 | #3449 | Contadores `OPEN` e `DETECTED` na fila de incidentes | a validar |
| 22 | #3461 | Paridade dos slices de tradução nas quatro locales | a validar |

## As três pendências que não são de PR nenhuma

1. **O EC2 continua com os quatro blocos da Detecção desabilitados.** O SQL está pronto em
   `ec2-analytics-enable-all.sql`, na raiz do repo. Detalhe em
   [[Registro - os quatro blocos de configuração da Detecção no EC2 em 14 de setembro]].
2. **Os story points não foram para o campo nativo do ClickUp.** Precisa de token REST pessoal.
3. **A fila de CI tem 4 runners para a empresa toda.** Check vermelho pode ser fila, não defeito.

## Ver também

[[Prompt - validar as 34 PRs em duas sessões]] ·
[[Prompt - continuar a validação das PRs da Sprint 33]] · [[Attlas - Sprint 33]] ·
[[Analítico - Estudo de caso de captura, inferência e sincronização]] ·
[[Registro - os quatro blocos de configuração da Detecção no EC2 em 14 de setembro]] ·
[[Analítico]]
