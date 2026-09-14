---
tags:
  - attlas
  - sprint-33
  - moc
  - analitico
aliases:
  - "Attlas - Sprint 33"
  - "Sprint 33 - o que entrega"
sprint: Sprint 33 (14/9/26 - 20/9/26)
status: "CRIADA em 09/09 como a semana do prazo externo de 18/09. REPLANEJADA em 12/09 depois do merge da #3328 (console do Analítico consolidado): virou sprint de acabamento, com os gaps levantados na própria PR. AMPLIADA em 14/09 com o estudo de caso do analítico servidor e do vídeo, a pedido do usuário: 22 tasks, uma nota e uma PR cada, 90 pts, em ordem de execução. FECHADA em 14/09 à noite: as 22 tasks têm PR aberta, 7 delas em stack registrada no GitHub, num total de 31 PRs. Nenhuma mergeada - o merge é do usuário."
atualizado: 2026-09-14
---

# Sprint 33 - o que entrega

Porta de entrada da semana de **14 a 20/09**. O prazo externo do módulo Analítico é **18/09**,
quinta-feira desta janela, e a PR #3328 (console do Analítico consolidado) entrou na develop em 12/09
à noite: a tela de Detecção desenha no instante que a imagem mostra, com caixa por objeto, laço verde
quando ocupado e salvamento funcionando. Esta sprint é para fechar o que sobrou e o que o estudo de
caso de 14/09 apontou.

> [!danger] Não é semana de desenvolvimento cheio, é a semana da entrega
> Três dias úteis antes do prazo. O que entra aqui é o que faz a entrega parecer entrega, não escopo
> novo: devolver CPU ao box, sincronizar a caixa pelo relógio da câmera, e o videowall de pé.

## O que foi encontrado, e como se resolve

Cada bullet é um tópico; a task correspondente está na tabela abaixo e o detalhe, com medições e
fontes, em [[Analítico - Estudo de caso de captura, inferência e sincronização]].

- **A VM não tem 16 núcleos.** É uma **t3a.2xlarge**: 8 vCPU (4 núcleos AMD Zen 1 com SMT), 32 GiB,
  todos os 8 online, nenhum a habilitar - e é **burstable**, com baseline de 40% por vCPU. Com 0% de
  idle o dia inteiro, ou está pagando excedente em `unlimited` ou está sendo estrangulada por crédito.
  Resolver: redimensionar para computação (`c7a.4xlarge` ou `c7i.4xlarge`, 16 vCPU com AVX-512 e VNNI).
- **O analítico servidor consome o box inteiro.** `ms-video-analytics` a **580% de CPU**; dentro
  dele o `node` a 581% e os dois `ffmpeg` a 3,5% - inferir é o custo, decodificar é de graça. Sessão
  ONNX sem opções (pool do tamanho do host), 10 quadros/s por câmera, pré-processamento em laço
  JavaScript. Resolver: `intraOpNumThreads: 2`, `cpus: 3.0`, 5 fps, entrada 416 com recorte pela
  região, quadro quadrado saindo do `ffmpeg`.
- **O YOLO passa pelo relay do MediaMTX.** Recebe o perfil SECONDARY (PTZ: 1280x720 a 25 fps), 4× os
  pixels e 5× os quadros que usa. Resolver: puxar **direto da câmera** num perfil de analítico (Axis
  por URL, Hikvision pelo terceiro stream), reaproveitando o `CameraStreamSourceResolver`; o ganho
  decisivo é receber os RTCP Sender Reports da câmera - o relógio dela.
- **A sincronização estima dos dois lados.** Resolver: o mesmo relógio nas duas pontas - o analítico
  carimba o quadro com o NTP da câmera, o MediaMTX repassa com `useAbsoluteTimestamp: true` só nos
  paths do analítico, o navegador lê `captureTime` do `requestVideoFrameCallback`. Isolado na tela de
  Detecção.
- **A ATM-PTZ só tem ATSPM.** Sem embarcado, tudo nela é servidor. Resolver: os dois analíticos ao
  mesmo tempo, com uma decodificação e uma inferência por quadro servindo os dois, depois do orçamento
  de CPU.
- **A embarcada 101 tem ocupação descartada** por falta de detector vinculado à região, aqui e no
  EC2. Resolver: decidir vínculo por padrão ou aviso na tela.
- **Região, cor e nome não persistem.** A cor nunca sai do navegador (o contrato não tem o campo); em
  câmera embarcada o device é a fonte e devolve o que guardar. Resolver: campo de apresentação
  persistido pelo `ms-cameras` para os dois modos, `stroke` opcional no contrato, round-trip testado.
- **VMS com tiles pretos.** Não é o MediaMTX cheio. É o reaper derrubando sessão com zero leitores
  (13 em 2 h; os 419 `path not found` são o próprio `ms-cameras` procurando o que derrubou), H265
  servido ao Chrome (só decodifica HEVC com hardware; 9 dos 11 paths são `-secondary-h265`) e a fome
  de CPU. Resolver: grace ≥ 60 s e nunca encerrar com WHEP ativo, H264 por padrão, CPU de volta.
- **VMS com atraso alto.** Não veio da Detecção: a #3328 só adicionou leitura de relógio no player,
  nenhum buffer mudou. Soma GOP de 15, `-max_delay 500000` e `reorder_queue_size 64` no publicador,
  WebRTC, e HLS de 7 segmentos de 2 s se o tile cair para HLS. Resolver: medir tile a tile, reduzir os
  buffers do publicador, keyframe mais curto, sinalizar tile em HLS; meta abaixo de 1,5 s.
- **"Reaproveitar a conexão como CDN"** já é o modelo: um `ffmpeg` por câmera e perfil publica no
  MediaMTX, N espectadores leem por WHEP. O que falha é a sessão por espectador. Resolver: sessão por
  câmera e perfil; escala por origem mais réplicas de leitura do MediaMTX.
- **Cloudflare como CDN: não para o núcleo.** Cluster por cliente, câmeras e operadores na mesma rede,
  gargalo local. Só para espectador remoto (Stream WHEP: US$ 1 por mil minutos, só H.264, sem RTSP;
  SFU: US$ 0,05/GB após 1 TB; 10 operadores × 11 tiles × 8 h/dia ≈ 18 TB/mês ≈ US$ 900).
- **Broker do embarcado.** As caixas da 101 não apareciam porque o device publica em `vitoria` e o
  local consumia `dev`; o EC2 já estava certo pela ponte. Resolver: broker por ambiente no
  `.env.example` e aviso no console; e o consumidor local que acumula atraso.
- **CI sem teste unitário.** Nenhum workflow chama `nx test`; a #3328 entrou com ~1900 linhas de spec
  nunca executadas. Resolver: job no `ci-pr` e `ci-develop`. É a primeira task.
- **Dívidas menores da #3328**: nome `cuboid` mentindo (+ UF-053), `ANOMALY_CLASS_CODES` fora do
  catálogo i18n, 15 peças da Detecção sem spec, `findById` recompondo a frota, 403 do resolver com
  timeout morto, contadores `OPEN`/`DETECTED`, `infra:up` incompleto, miniatura poluindo o console,
  quinze miniaturas nas Métricas, paridade i18n, overlay da ACOM duplicado.

## As tasks, em ordem de execução

| # | Task (1 task = 1 PR) | Natureza | Pts | Estado |
| --- | --- | --- | --- | --- |
| 1 | [[CI - job de teste unitário e suíte dos projetos da 3328\|CI ganha job de teste unitário, e a suíte da #3328 volta ao verde]] | `[Infra]` | 5 | PR #3402 (só a suíte; job de CI revertido) |
| 2 | [[Infra - a VM do EC2 é t3a.2xlarge, burstable, e não 16 núcleos\|A VM é uma t3a.2xlarge burstable: redimensionar para o analítico rodar 24/7]] | `[Infra]` | 2 | PR #3431 aberta |
| 3 | [[Analítico servidor - orçamento de inferência na CPU\|Analítico servidor: a inferência passa a caber num orçamento de CPU]] | `[Back]` | 5 | stack #3434: #3432 + #3433 |
| 4 | [[Analítico servidor - captura direta da câmera com perfil de analítico\|Analítico servidor: o YOLO puxa a câmera direto, e a PTZ ganha os dois analíticos]] | `[Full]` | 8 | stack #3436: #3437 + #3465 + #3482 |
| 5 | [[Detecção - sincronização exata da caixa com o vídeo\|Detecção: caixa presa ao tempo de captura do quadro, relógio da câmera nas duas pontas]] | `[Full]` | 8 | stack #3473: #3438 + #3472 + #3489 |
| 6 | [[VMS - tiles pretos e vídeo travando no videowall\|VMS: tiles pretos, vídeo travando e atraso alto no videowall]] | `[Full]` | 8 | stack #3470: #3439 + #3469 + #3487 |
| 7 | [[Entrega de vídeo - sessão compartilhada, réplicas e a pergunta da CDN\|Entrega de vídeo: sessão por câmera e perfil, réplicas do MediaMTX, decisão sobre CDN]] | `[Full]` | 5 | stack #3481: #3440 + #3480 |
| 8 | [[Detecção - cor e nome da região não persistem\|Detecção: alterar região, cor e nome não persiste]] | `[Full]` | 3 | PR #3441 |
| 9 | [[Detecção - ocupação da câmera embarcada sem detector vinculado\|Ocupação da câmera embarcada descartada por falta de detector vinculado]] | `[Full]` | 3 | PR #3443 |
| 10 | [[Detecção - specs dos componentes, utilitários e serviços novos\|Specs dos 15 componentes, utilitários e serviços novos da Detecção]] | `[Front]` | 8 | stack #3475: #3464 + #3474 + #3492 |
| 11 | [[Analítico embarcado - broker por ambiente e consumidor sem atraso\|Broker certo por ambiente e consumidor que não acumula atraso]] | `[Infra]` | 5 | stack #3491: #3471 + #3490 |
| 12 | [[Detecção - renomear a caixa e atualizar a UF-053 do relógio\|Renomear a caixa e atualizar a UF-053 do relógio]] | `[Front]` | 2 | PR #3444 |
| 13 | [[Detecção - uma lista só de classes de objeto nos quatro idiomas\|Uma lista só de classes de objeto, nos quatro idiomas]] | `[Front]` | 3 | PR #3452 |
| 14 | [[Permissões - 403 do resolver fora e o timeout que ninguém lê\|403 quando o resolver está fora, e o timeout que ninguém lê]] | `[Back]` | 3 | PR #3453 |
| 15 | [[Instâncias - ler uma unidade sem compor a frota\|Ler uma unidade de analítico sem compor a frota inteira]] | `[Back]` | 5 | PR #3460 |
| 16 | [[Laço virtual - consolidar o overlay e apagar a cópia da ACOM\|Consolidar o overlay do laço e apagar a cópia da ACOM]] | `[Front]` | 5 | stack #3479: #3462 + #3478 |
| 17 | [[Ambiente - infra up volta a subir a infraestrutura inteira\|`infra:up` volta a subir a infraestrutura inteira]] | `[Infra]` | 2 | PR #3447 |
| 18 | [[Métricas do Laço Virtual - quinze miniaturas por visita\|Métricas do Laço Virtual paga quinze miniaturas por visita]] | `[Front]` | 3 | PR #3459 |
| 19 | [[Detecção - aferir a predição em frenagem e conversão\|Aferir a predição do overlay em frenagem e conversão]] | `[Front]` | 3 | PR #3476 |
| 20 | [[Câmeras - miniatura fora do ar para de poluir o console\|Miniatura fora do ar para de poluir o console]] | `[Front]` | 2 | PR #3451 |
| 21 | [[Incidentes - contadores OPEN e DETECTED na fila\|Contadores `OPEN` e `DETECTED` na fila de incidentes]] | `[Full]` | 1 | PR #3449 |
| 22 | [[i18n - paridade das quatro locales do Analítico\|Paridade das quatro locales depois das chaves novas]] | `[Front]` | 1 | PR #3461 |

**90 pts em 22 tasks.** Cada linha é uma nota própria e uma PR própria. Os itens que se
complementam entraram juntos: o 403 do resolver com o timeout que ninguém lê, o broker com o atraso do
consumidor, o renome da caixa com a UF-053, e o reaper de sessão dentro da task do videowall.

A ordem: o 1 primeiro, porque sem ele nada tem rede de proteção; o 2 porque decide em que máquina o
resto roda; do 3 ao 7 é a frente do analítico servidor e do vídeo na ordem que o estudo fixou -
devolver CPU, puxar a câmera direto, sincronizar pelo relógio da câmera, e só então o videowall e o
modelo de entrega, porque os três primeiros são pré-requisito dos dois últimos.

## O que já está entregue pela #3328 e não volta para esta sprint

- Caixas interpoladas e presas ao relógio de apresentação do vídeo, pintadas no frame callback do
  próprio player.
- Caixa plana com cantoneiras, fiel ao retângulo reportado mais uma margem pequena para cobrir o
  veículo inteiro; a extrusão isométrica foi implementada e retirada (sem pose vinda do analítico, lê
  como caixa torta).
- Nome da classe no idioma ativo, em etiqueta legível sobre a imagem.
- Carimbo do device lido no relógio do navegador, o que tirou cerca de 600 ms de extrapolação da conta.
- Laço virtual em verde enquanto ocupado, com seta de direção e número no centróide.
- Editar mantém a região existente em vez de abrir uma nova; tela cheia leva a superfície inteira;
  barra e badges sobem e descem com os controles nativos do player.
- Imagem parada em alta resolução, e clique em qualquer parte do cartão da lateral seleciona a câmera.
- Salvar região e laço voltou a funcionar (o `ms-cameras` em container não alcançava o resolver de
  permissões), e as caixas voltaram a aparecer na `ATMN - EMBEDDED 101` (broker de campo).

## O plano original de 09/09, resíduo da Sprint 32

Continua valendo como escopo condicional, depois das tasks acima:

| # | Task | Pts | O que exige |
| --- | --- | --- | --- |
| A | `[Back] ATSPM: Split Monitor sobre o ciclo do controlador` | 5 | Só `controller_cycle`: `stageTimes` medido contra o alocado; não sai do `ms-detector-history` |
| B | `[Back] ATSPM: Yellow e Red Actuations` | 3 | Chegada dentro da janela de amarelo e vermelho do estágio, derivada do início do ciclo mais o acumulado de `stageTimes` |
| C | `[Front] A face ATSPM lê os dois grupos novos` | 2 | `ATSPM_DETECTOR_READERS` de 4 para 6 leituras |
| D | `[Back] Histórico e versionamento da configuração analítica` | 5 | Requisito do edital; só se sobrar semana |

## O que a semana NÃO entrega

Os 90 pts do inventário de fechamento (ACOM, Dashboard do Analítico, decisão automatizada, métricas
ATSPM que exigem o mapa estágio-grupo, snapshot da configuração semafórica, recorrência de incidente,
exportação e OTA do embarcado), item por item em [[Analítico - O que falta para fechar o módulo]].

> [!important] O que a entrega de 18/09 é
> A cadeia do Laço Virtual ponta a ponta, demonstrável em campo, com a Detecção configurável pela tela,
> Instâncias e Incidentes no ar e as Métricas do Laço Virtual com dado real. O ATSPM entrega 6 das 38
> métricas no melhor caso.

## A conferência

As 22 tasks fecharam com PR aberta; **nenhuma foi validada ainda**. A lista de conferência, uma linha
por PR com o que tem de funcionar e como provar, está em [[Validação - as 34 PRs, uma a uma]].

## Ver também

[[Validação - as 34 PRs, uma a uma]] ·
[[Analítico - Estudo de caso de captura, inferência e sincronização]] ·
[[Detecção do Analítico - gaps para polir]] · [[Analítico - O que falta para fechar o módulo]] ·
[[Attlas - Sprint 32]] · [[Analítico]] · [[Sprints - índice raiz]]
