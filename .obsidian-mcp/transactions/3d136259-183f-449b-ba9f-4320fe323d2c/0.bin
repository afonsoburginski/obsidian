---
tags:
  - doc
  - analitico
atualizado: 2026-08-12
servico: ms-virtual-loop, ms-connector-virtual-loop, ms-atspm, ms-dai (planejados, todos scaffold hoje)
fonte: código atual + 14 PRs em draft da Sprint 27 (#1342 a #1357) + notas do user + PDF do squad de CV
---

# Analítico - Arquitetura e estratégias

Parte do [[Analítico]]. Diagnóstico do que existe de fato, o achado de uma rodada de planejamento anterior
que nunca foi mergeada, e a proposta de topologia de serviço.

## O que existe de fato hoje

### Caminho embarcado (`ms-cameras/src/analytics-realtime/`)

É o único lugar do monorepo onde o analítico de vídeo roda de verdade. O device é o aplicativo Axis "ATMAN
Traffic Edge ATSPM", falado em `/local/atman_traffic_edge_atspm/api`. O serviço não persiste nada em
banco: cada leitura e escrita de região ou configuração de laço é um proxy HTTP com autenticação digest
direto pra câmera (`GET/PUT /regions`, `PUT /config`). Um WebSocket (namespace `/cameras-analytics`)
retransmite a detecção ao vivo pro front, e um consumidor Kafka lê o tópico `traffic-motion-detection.detections`,
publicado pelo próprio device num broker separado do resto da plataforma - esse tópico nunca foi
catalogado nas constantes centrais de tópicos do sistema.

O vínculo entre câmera e analítico é hoje só um campo `Json` livre (`analyticsCapabilities`), de onde o
código lê por convenção a chave `deviceSourceId`. Não existe entidade "Analítico" persistida, nem coluna
de arquitetura de processador na câmera ou no fabricante.

### Aba Analíticos no frontend

`apps/web-attlas/src/app/modules/cameras/analytics/` e os componentes `camera-analytics-*` implementam o
desenho de região (DAI) e a configuração do Virtual Loop sobre o vídeo ao vivo, com overlay de bounding
box em tempo real (dead reckoning e interpolação a 60fps). Entregue pelo PR #766 e uma sequência de
follow-ups que migraram a persistência de `localStorage` para chamada HTTP real contra `ms-cameras`. A
spec `UF-033-camera-analytics-draw.md` continua descrevendo a feature como "front-only, mock em
localStorage" - texto desatualizado, ver a seção de dívida técnica abaixo.

### ACOM

Já foi portada de fato para dentro de `ms-controllers/src/acom/` (CRUD, comunicação TCP, tempo real), não
mora no serviço reservado `ms-acom`, que nunca teve uma linha de domínio escrita. A decisão de portar está
registrada como DD-20 no SPEC do `ms-controllers`.

### Série do detector do lado do controlador

`ms-detector-history` persiste a série de detector físico e virtual **do lado do equipamento de campo**
(via ACOM/contato seco ou nativo do controlador), não o pipeline de vídeo em si. É um domínio vizinho, não
o mesmo pipeline.

## O achado que muda o plano: Sprint 27 já especificou boa parte disso

Enquanto este documento estava sendo escrito, apareceu a confirmação de que a Sprint 27 (03 a 09/08) já
produziu **14 PRs em draft**, nenhuma mergeada, especificando o servidor de Virtual Loop com bastante
detalhe. A sprint fechou sem entrega de código, e a frente voltou a ficar sem prazo.

> [!warning] Nada disso está em `develop`
> As 14 PRs (#1342 a #1357) seguem abertas em draft. Nenhuma tem código de produção, só spec/ADR em
> markdown. Antes de desenhar algo novo pro servidor de VL, o primeiro passo é destravar e mergear esta
> cadeia.

Decisões já fechadas nessas PRs:

- **Fonte do vídeo do analítico em container** (ADR, PR #1342): consome o relay que o `ms-cameras` já
  mantém pro operador assistir ao vivo, pedindo o substream de menor resolução disponível. Não lê a câmera
  direto (evitaria expor a credencial da câmera a mais um processo) e não usa Kafka para vídeo.
- **Stack e escopo do `ms-virtual-loop`** (SPEC, PR #1343): NestJS, com `ffmpeg` como processo filho pra
  decodificação e uma biblioteca de inferência nativa embutida no processo Node, não um serviço Python
  separado. O serviço ingere o stream, detecta veículo por frame, lê a geometria da região do `ms-cameras`
  (que continua dono dela) e publica a ocupação da região. Não persiste série histórica, não fala com o
  controlador, não decide atuação em hardware.
- **`ms-connector-virtual-loop` só traduz endereço** (PR #1345): consome a ocupação publicada pelo
  `ms-virtual-loop`, resolve pra qual detector físico aquela câmera e região correspondem, e republica no
  mesmo tópico de detecção bruta que o caminho físico usa. Não reimplementa a lógica de reconciliação de
  janela do caminho físico, porque o problema que ela resolve (buffer de leitura de equipamento por
  polling) não existe do lado do vídeo.
- **Vínculo entre região de câmera e endereço de detector** (PR #1352, dentro de `ms-cameras`): modelo novo
  que garante que um endereço de detector físico nunca é referenciado por duas regiões ao mesmo tempo -
  regra de unicidade diferente da unicidade de analítico embarcado (ver [[Analítico - Requisitos e SLA]]),
  granularidade diferente.
- **Invariante contra contagem duplicada** (PRs #1345 e #1356, no recorte de atuação por ACOM): se o laço
  virtual algum dia atuar também via ACOM na entrada do controlador, o endereço que já tem vínculo de
  câmera registrado não pode ao mesmo tempo ser publicado como presença física pelo caminho antigo, senão
  o histórico conta o mesmo veículo duas vezes.
- **Correção da spec `UF-033` já escrita, nunca mergeada** (PR #1355): reescreve exatamente o texto
  desatualizado do frontend e corrige a terminologia morta (`deviceAnalyticId` para `deviceSourceId`).
  Confirmado por leitura direta de `develop`: o texto antigo ainda está lá, o conserto existe só nesta PR
  draft.

Achados de dívida técnica que a própria Sprint 27 registrou e nunca corrigiu em código:

- Um bug de derivação invertida no consumidor do device (`kind` trocado), encontrado em 03/08, sem PR de
  correção.
- O reconciliador que reativava automaticamente o produtor de stream do device (quando ele sobe desligado
  após reinício de energia) foi revertido em 29/07 por causar loop de reboot no equipamento, e nunca teve
  sucessor.
- O tópico de falha do detector não tem nenhum consumidor real hoje, apesar da documentação de detectores
  descrever `ms-alarms` como assinante dele.

## Proposta de modelagem da compatibilidade de câmera

O pedido de negócio é claro: precisamos de um jeito de decidir, dada uma câmera cadastrada, quais features
de analítico ela pode oferecer. A proposta é separar dois tipos de dado:

- **Fato de hardware, estável**: a arquitetura do processador da câmera (sem Axis, ARTPEC 7, ARTPEC 8/9) e
  a tabela de compatibilidade dela com cada forma de execução (ver [[Analítico - Requisitos e SLA]]). Isso
  não muda com decisão de produto, é físico. Modelado como um enum de arquitetura mais uma tabela de
  compatibilidade, no mesmo espírito de outras constantes estáticas de domínio já usadas no repo (limites
  do laço lógico do controlador, por exemplo).
- **Decisão de produto, que pode mudar**: como o Attlas agrupa e licencia essas features como sub-produtos
  (ver [[Analítico - Requisitos e SLA]]). Isso é redesenho, não fato de hardware.

## Proposta de topologia de serviço

| Serviço | Proposta | Por quê |
| --- | --- | --- |
| `ms-cameras` | Mantém e cresce | Continua dono da geometria de região e do vínculo com o analítico embarcado. Ganha, do trabalho já especificado na Sprint 27, o vínculo região-endereço de detector e a publicação de ocupação também pelo caminho embarcado |
| `ms-virtual-loop` | Mantém, escopo já fechado | É o servidor de Virtual Loop em si, não uma camada de configuração em volta de um processamento que ficaria em outro lugar. Falta destravar e mergear |
| `ms-connector-virtual-loop` | Mantém, escopo já fechado | Só traduz endereço, não é candidato a descontinuar como pareceria antes de achar a spec em draft |
| `ms-atspm` | Mantém, redefine do zero | Único dos serviços de produto sem nenhum planejamento anterior. Escopo: métricas avançadas de fato, associação com grupo semafórico e snapshot |
| `ms-dai` | Mantém, escopo pendente | Fica em aberto se processa incidentes de forma independente ou se vira sub-produto do ATSPM, exibido por ele |
| `ms-acom` | Descontinuar | Substituído por completo por `ms-controllers/src/acom/` |

## Roadmap sugerido

1. Destravar e mergear a cadeia de PRs da Sprint 27, que já cobre a fundação do servidor de VL.
2. Entidade "Analítico" com unicidade de cadastro e healthcheck, granularidade diferente do vínculo de
   endereço de detector que a Sprint 27 já resolveu.
3. `ms-atspm` real, incluindo a associação com grupo semafórico e o snapshot de configuração.
4. Decisão e implementação de `ms-dai`.
5. ACOM refinado dentro de Controladores, com a nomenclatura e as cardinalidades de
   [[Analítico - Requisitos e SLA]].
6. Presets com snapshot de região.

## Ver também

- [[Analítico]] · [[Analítico - Requisitos e SLA]] · [[Analítico - Fluxos]]
- [[VMS - Arquitetura e estratégias]] (padrão de nota usado aqui) · [[ms-cameras]]
