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
status: "ATUALIZADA em 16/09 com a rodada de provas de tela: #3480, #3459 e #3451 provados no navegador, #3438 medido no caminho real (captureTime ausente), #3452 varrido sem código cru. Achados novos viram commit na branch shared/chore/NO-CARD-sprint33-validation (a16696a4fb, 32b0c9f190 e 1ed0101375 fecham os parâmetros do incidente). O ACAP da EMBEDDED 080 voltou em 0.7.0 - o 503 das 14h38 era a atualização. Nada mergeado - o merge é do usuário."
atualizado: 2026-09-16
---

# Validação - as 34 PRs, uma a uma

> **Objetivo desta nota e da PR [#3596](https://github.com/atmanadmin/attlas-2026/pull/3596)**: validar
> e testar, um por um, **tudo o que a Sprint 33 entregou**. Não é feature nova - é a bateria de testes
> da sprint inteira, num lugar só.

Porta de entrada da conferência da [[Attlas - Sprint 33]]. As 22 tasks entregaram **34 PRs**, 7 delas
em stack. Esta nota existe para responder uma pergunta por PR: **ela entrega o valor que o card
pediu, e isso funciona de verdade?**

> [!info] 15/09 - as 34 já estão em `develop`, a validação virou uma PR só
> O usuário decidiu mergear tudo primeiro (PR intermediária
> [#3573](https://github.com/atmanadmin/attlas-2026/pull/3573), merge commits preservados, sem
> squash) em vez de esperar a validação. As 34 branches de origem foram deletadas depois do merge -
> **não existe mais checkout por PR**. A validação e qualquer ajuste acontecem em
> [**#3596**](https://github.com/atmanadmin/attlas-2026/pull/3596) (`shared/chore/NO-CARD-sprint33-validation`).
> Checklist espelhado no repo em `docs/planning/sprint33-validation-checklist.md`.

> [!danger] Correção de arquitetura em 15/09, e a remoção de 16/09
> A DD-1 do `SPEC-ms-video-analytics` (inferência ONNX/ffmpeg embutida no serviço) foi **revogada** -
> 580%+ de CPU num host de 8 vCPU derrubava a instância. Em **16/09 a decisão virou remoção**: o modo
> SERVER inteiro saiu do `ms-video-analytics` (commit `71d57f274b`), que ficou esqueleto em standby.
> Só o analítico **embarcado** existe. Ver [[Analítico - Embarcado x Servidor]].
>
> As PRs do bloco "Analítico servidor" **não foram fechadas** - regra que muda não é motivo para
> fechar PR. Elas estão mergeadas e o que elas entregavam foi resolvido por remoção.

## Regras da conferência (vigente: tudo na #3596)

1. **Uma vez só, tudo em `develop` / na #3596.** Validar é rodar e ler contra a branch da #3596.
2. **Nunca mergear a #3596.** O merge é decisão do usuário.
3. **Proibido `nx test`, `nx lint`, `nx build` e `tsc` na máquina local.** PC fraco. O CI é o gate.
4. **Nunca subir nem derrubar o `nx serve web-attlas`** - o front é do usuário.
5. Tela se prova com Playwright no `:4200`, não com `curl`. `curl` dá 200 com build quebrado.
6. **EC2 (`aws-attlas-26`) é somente leitura**, a não ser que o item peça mudança lá.
7. **Achado de verdade vira commit na #3596**, referenciando o que o motivou.

## Ambientes

| Ambiente | Onde | Para que serve |
| --- | --- | --- |
| Front local | `:4200`, subido pelo usuário | Toda tela |
| Backend local | `ms-cameras` :3300, `ms-organization` :3001, containers de infra | Rota e consumidor |
| EC2 dev | `dev.v2.attlas.atmansystems.com` | Câmera real, broker de campo |
| CI | 4 runners na VM da sumo | Suíte e build |

## As 34 PRs, em ordem de execução da sprint

Legenda: **SIM** = entrega o que prometeu · **PARCIAL** = entrega com ressalva · **LEITURA** = provado
por código, falta tela · **REMOÇÃO** = resolvido porque o que ela servia saiu do produto.

### 1. CI e ambiente

| # | PR | O que tem de estar certo | Estado |
| --- | --- | --- | --- |
| 1 | #3402 | A suíte dos projetos da #3328 verde, e os três defeitos de produção que ela guardava corrigidos | a validar |
| 2 | #3431 | Só decisão e procedimento: a VM é t3a.2xlarge burstable, não 16 núcleos | a validar |
| 17 | #3447 | `npm run infra:up` sobe o banco do detector-history, e a face Métricas para de dar 502 | **SIM** (comentado: de-serviço reais atrás do profile `full`) |

### 2. Analítico servidor (stack) - ler contra a remoção de 16/09

| # | PR | O que tem de estar certo | Estado |
| --- | --- | --- | --- |
| 3 | #3432 | A inferência cabe num orçamento de CPU | **REMOÇÃO** (modo SERVER saiu em `71d57f274b`) |
| 3 | #3433 | Entrada do modelo medível, e a primeira caixa da câmera de volta | **REMOÇÃO** |
| 4 | #3437 | O YOLO puxa RTSP direto da câmera, num perfil só dele | **SIM** (sem achado) |
| 4 | #3465 | O relay vira exceção; o reconciliador para de abrir path que ninguém lê | **SIM** (sem achado) |
| 4 | #3482 | A PTZ ganha os dois analíticos com uma decodificação por quadro | **PARCIAL** (comentado: `cachedRegions` não filtrava por analítico) |

### 3. Sincronização da caixa (stack)

| # | PR | O que tem de estar certo | Estado |
| --- | --- | --- | --- |
| 5 | #3438 | O front desenha no `captureTime` do quadro quando o transporte reporta um | **PARCIAL** - medido em 16/09: `captureTime` **não existe** no caminho real (ver abaixo) |
| 5 | #3472 | `useAbsoluteTimestamp` só nos paths do analítico, nunca nos do VMS | a validar |
| 5 | #3489 | O analítico carimba o quadro com o relógio da câmera, lido dos sender reports | a validar |

### 4. VMS (stack)

| # | PR | O que tem de estar certo | Estado |
| --- | --- | --- | --- |
| 6 | #3439 | O reaper para de derrubar o tile que está entrando; sessão WHEP conta como leitor | **SIM** (sem achado) |
| 6 | #3469 | Prova do decoder no cliente, e queda automática para H264 | **SIM** (sem achado) |
| 6 | #3487 | Keyframe por tempo, buffer por transporte, e o tile dizendo quando caiu para HLS | a validar |

### 5. Entrega de vídeo (stack)

| # | PR | O que tem de estar certo | Estado |
| --- | --- | --- | --- |
| 7 | #3440 | O modelo de fan-out que já existe, o caminho de escala, e a decisão sobre CDN | a validar |
| 7 | #3480 | Sessão por câmera e perfil: o segundo espectador entra na existente | **SIM - provado na tela em 16/09** |

### 6. Detecção

| # | PR | O que tem de estar certo | Estado |
| --- | --- | --- | --- |
| 8 | #3441 | Cor e nome da região sobrevivem ao reload | **SIM** (comentado: fix de spread + validação de enum faltando) |
| 9 | #3443 | A câmera embarcada endereça um detector, e a tela diz quando não há | **SIM** (sem achado) |
| 12 | #3444 | O nome da peça descreve o que ela desenha; UF-053 com o contrato do relógio | a validar |
| 13 | #3452 | Uma lista só de classes de objeto, no contrato e nos quatro idiomas | **SIM - varredura de tela em 16/09 sem nenhum código cru** |
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
| 16 | #3462 | O overlay compartilhado aceita a geometria e a pintura da ACOM | **LEITURA** - cartão e modal importam o mesmo `acomVirtualLoops`; falta dado de ACOM na bancada |
| 16 | #3478 | A ACOM desenha pelo compartilhado, e a cópia sai do repo | **LEITURA** - `controller-acom-loop-overlay/` não existe mais no repo |

### 10. Resto

| # | PR | O que tem de estar certo | Estado |
| --- | --- | --- | --- |
| 14 | #3453 | 503 quando o resolver de permissões não responde, e um nome só para o timeout | a validar |
| 15 | #3460 | Ler uma unidade de analítico sem compor a frota inteira | a validar |
| 18 | #3459 | A face que sai fica montada, e a lateral abre na lista | **SIM - provado na tela em 16/09** |
| 20 | #3451 | Miniatura fora do ar para de ser pedida a cada montagem | **SIM - provado na tela em 16/09** |
| 21 | #3449 | Contadores `OPEN` e `DETECTED` na fila de incidentes | **PARCIAL** (`statusCounts` não é lido em lugar nenhum) |
| 22 | #3461 | Paridade dos slices de tradução nas quatro locales | a validar |

## Como cada prova de tela de 16/09 foi feita

- **#3480** - `ATMN - EMBEDDED 080` aberta em duas abas do mesmo navegador (a segunda aba exige login
  próprio, a sessão não atravessa aba). Com as duas tocando: **um** path no mediamtx
  (`...000101-secondary`), **um** processo `ffmpeg`, **dois** leitores WHEP. Fechada a primeira aba, o
  path continua `ready`, o relay continua um e o `<video>` da segunda segue andando (1280x720,
  `readyState` 4, `currentTime` avançando 2 s em 2 s). O leitor que saiu some da lista do mediamtx
  cerca de 20 s depois - é a renegociação do media server, não a lease.
- **#3459** - a face `app-atspm-panel` recebeu uma marca no elemento DOM antes da troca de aba; depois
  de ir para Laço Virtual a **mesma marca** continua no DOM com `metrics-panel--hidden`, e a face de
  Incidentes (nunca visitada) não existe. Na entrada da tela, **zero** requisições de miniatura - a
  lateral abre na lista.
- **#3451** - miniatura da `ATMN - DEMO` interceptada com 502. Depois da falha o `<img>` dela some da
  tela (as outras duas continuam), e navegar para Dispositivos e voltar **não** repete o pedido
  (uma única requisição no log de rede, dentro da janela de 5 min).
- **#3452** - varredura de todo o texto do DOM da Detecção: nenhum código cru (`stones`,
  `traffic_light`, `feline`) e nenhuma chave de tradução vazada.
- **#3438** - medido no `requestVideoFrameCallback` do WebRTC do analítico embarcado: **`captureTime`
  não vem** (a chave nem existe na metadata; só `receiveTime` e `rtpTimestamp`), em 8 quadros
  seguidos. O fallback da PR está correto (`typeof !== 'number'` cobre `undefined`), então nada
  quebra - mas **o ganho da PR é inerte nesta topologia**: o relay `ffmpeg` no meio não repassa o
  sender report que o navegador usaria para resolver o instante de captura. É o que as fases 2 e 3
  (#3472 e #3489) precisam resolver para o `captureTime` existir.

## Achados novos de 16/09 (viraram commit)

1. **Sessão de stream cujo relay morre sem espectador ficava `ACTIVE` com o processo morto**
   (commit `8a7a13568c`). O `ffmpeg` que sai dentro da janela de grace não reconectava (sem lease) e
   também não encerrava: o próximo `GET` anexava na entrada, cancelava o grace e recebia a URL WHEP
   sem respawn - tile preto até o reaper agir 60 s depois. Junto, duas linhas de endurecimento no
   registry: `create` desarma o grace da entrada que substitui, e o callback do grace zera
   `state.graceTimer`. Ver [[Streaming - Arquitetura]].
2. **Os parâmetros do incidente não atravessavam o device** (commit `a16696a4fb`): a grafia
   snake_case do equipamento nunca era traduzida para o camelCase do contrato, nas duas pontas.
3. **O silêncio do equipamento apagava o parâmetro do incidente** (commit `32b0c9f190`). A grafia era
   uma perna só: o ACAP 0.7.0 responde cada condição com `enable` e `event_classes` e **nenhum
   parâmetro**, então a leitura crua zerava o que a tela mostra com a câmera online e o cache
   respondia com ela offline. O merge do `withStoredPresentation` passa a completar com a linha
   guardada o que o device não reporta, sem inventar condição que ele não reporta.
4. **Classe de incidente vazia lê como "Todas as classes da região"** (commit `1ed0101375`).
   `event_classes` vazio é a configuração mais ampla possível, não uma lacuna - chave nova
   `analytics.detection.value.allRegionClasses` nas quatro locales.

Detalhe dos três em [[Detecção - os parâmetros do incidente não atravessavam o device]]. A rodada de
provas de tela de 16/09 ficou registrada no commit `a19c97f672`.

## Pendências que não são de PR nenhuma

1. **O EC2 continua com os quatro blocos da Detecção desabilitados.** SQL pronto em
   `ec2-analytics-enable-all.sql`, e **não deve ser aplicado**. Detalhe em
   [[Registro - os quatro blocos de configuração da Detecção no EC2 em 14 de setembro]].
2. **Os story points não foram para o campo nativo do ClickUp.** Precisa de token REST pessoal.
3. **A fila de CI tem 4 runners para a empresa toda.** Check vermelho pode ser fila, não defeito.
4. **Métricas e incidentes não chegam por WebSocket** - confirmado na tela em 16/09: na tela de
   Métricas o navegador abre só o socket do Vite e o `api/cameras/status/realtime`, e em 25 s parado
   não sai **nenhuma** chamada nova (não é polling, é carga única). Não existe gateway análogo ao
   `CameraStatusGateway` para métrica nem para incidente, e nenhuma spec pede. Se o requisito é real,
   é spec nova.
5. **O ACAP do analítico embarcado da `10.1.1.80` voltou, em 0.7.0** (resolvida). O 503 das 14h38
   em `/local/atman_traffic_edge_atspm/api/*` com a porta 2001 recusando era a **atualização de
   0.6.0 para 0.7.0 em curso**, não queda: `GET /axis-cgi/applications/list.cgi` no fim da tarde
   responde `atman_traffic_edge_atspm` 0.7.0 `Running`, e a tela de Detecção voltou a mostrar vídeo,
   caixas e os incidentes conforme o device. Sobra uma **pergunta em aberto**: o device 0.7.0 não
   reporta limiar por incidente, só limiar global na `config`, então falta saber se quem avalia a
   condição é o aparelho ou o Attlas - é o que decide se a tela configura algo que surte efeito. Ver
   [[Analítico - Embarcado x Servidor]].

## Ver também

[[Attlas - Sprint 33]] ·
[[Analítico - Embarcado x Servidor]] ·
[[Registro - os quatro blocos de configuração da Detecção no EC2 em 14 de setembro]] ·
[[Analítico]]
