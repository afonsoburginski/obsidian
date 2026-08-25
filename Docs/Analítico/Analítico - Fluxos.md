---
tags:
  - doc
  - analitico
atualizado: 2026-08-24
servico: ms-virtual-loop, ms-connector-virtual-loop (planejados, scaffold hoje)
fonte: attlas-vl-atspm.pdf (squad de Visão Computacional, 10/08) + decisões preservadas das 14 PRs fechadas da Sprint 27 + auditoria de código de 24/08
---

# Analítico - Fluxos

Parte do [[Analítico]]. Fluxo de decisão ao cadastrar câmera/analítico (fonte: PDF do squad de CV) e os
três pipelines de dado (fonte: código atual mais o planejamento da Sprint 27, ver
[[Analítico - Arquitetura e estratégias]]).

> [!info] O fluxo de cadastro é a aplicação prática da matriz de compatibilidade
> Cada bifurcação abaixo sai de uma linha da matriz de [[Analítico - Embarcado x Servidor]], que é a nota
> que explica **por que** a opção existe ou não para aquele modelo de câmera. Aqui está só a ordem das
> perguntas; a regra em si mora lá.

## Fluxo de decisão ao cadastrar câmera

| # | Passo |
| --- | --- |
| 1 | Primeira pergunta: a câmera é Axis? Se não, tudo se resolve em servidor, sem nenhum app embarcado |
| 2 | Se for Axis, o fluxo depende do modelo do processador |
| 3 | Pra toda câmera Axis, o Attlas verifica o que já está instalado nela antes de oferecer qualquer opção |
| 4 | App já instalado: aviso ao operador de que não é necessário vincular a um servidor |
| 5 | App não instalado: oferece só as opções compatíveis com aquele modelo |

### Processador antigo (ARTPEC 7)

| Capacidade | Já instalado | Opções |
| --- | --- | --- |
| Virtual Loop | Sim | Aviso, sem vínculo a servidor |
| Virtual Loop | Não | Instalar o app na câmera, ou vincular a servidor analítico de VL |
| ATSPM | - | O app não roda nesse processador. Única opção é vincular a servidor analítico de ATSPM |

### Processador novo (ARTPEC 8/9)

| Capacidade | Já instalado | Opções |
| --- | --- | --- |
| Virtual Loop | Sim | Aviso, sem vínculo a servidor |
| Virtual Loop | Não | Instalar o app, vincular a servidor de VL, ou pegar o VL embutido via ATSPM (app ou servidor) |
| ATSPM | Sim | Aviso, sem vínculo a servidor |
| ATSPM | Não | Instalar o app, ou vincular a servidor de ATSPM |

**Restrição**: o app de VL e o app de ATSPM nunca rodam juntos na mesma câmera. Pra ter os dois
embarcados, instala-se só o ATSPM, que já entrega o VL embutido.

### Câmera não-Axis

Sem app embarcado, tudo em servidor, desdobrado conforme a necessidade:

| Necessidade | Opções |
| --- | --- |
| Só Virtual Loop | Vincular a servidor de VL (região pequena e padronizada), ou servidor de ATSPM com VL embutido (região grande com linha) |
| Só ATSPM | Vincular a servidor de ATSPM (região arbitrária) |
| Os dois | Um único servidor de ATSPM cobre tudo de uma vez, ou dois vínculos separados (servidor de VL mais servidor de ATSPM) |

## Pipeline embarcado (real hoje)

| # | Passo | Estado |
| --- | --- | --- |
| 0 | **No cadastro, o vínculo `deviceSourceId` é gravado na câmera** | ❌ **não acontece** - ver a lacuna abaixo |
| 1 | Câmera Axis com o app ATMAN Traffic Edge instalado | Real |
| 2 | `ms-cameras` fala com o app via proxy HTTP com autenticação digest, pra ler e escrever região e configuração de laço | Real |
| 3 | No save de região, o `ms-cameras` carimba o `source_id` no device (`PUT /config`) e religa o producer | Real, mas carimba o valor que leu do banco |
| 4 | O device publica a detecção num tópico próprio, num broker separado do resto da plataforma | Real |
| 5 | O consumidor do `ms-cameras` lê esse tópico e faz o vínculo entre o identificador do device e a câmera | Real, mas só acha a câmera se o passo 0 tiver acontecido |
| 6 | Retransmite pro frontend via WebSocket, que desenha o overlay ao vivo | Real |

> [!danger] Lacuna: o passo 0 não existe em código
> **Nenhum código escreve `analyticsCapabilities.deviceSourceId` no banco.** Só o seed e edição manual do
> registro. Todo o resto do pipeline lê essa chave: o controller de regiões para montar o alvo do device,
> o provisioner para comparar com o `source_id` que o device reporta, e o consumer para montar o mapa de
> binding - que pula a câmera sem a chave.
>
> Consequência: **câmera cadastrada pela UI nunca entra no binding do consumer, logo nunca recebe
> detecção ao vivo**. O frame chega do device, não casa com câmera nenhuma e é descartado em silêncio -
> sem erro na tela, sem log de falha para o operador. O embarcado funciona só para as câmeras que o seed
> criou. Detalhe da cadeia em [[Analítico - Arquitetura e estratégias]]; o conserto é card comprometido
> da [[Attlas - Sprint 30]].

## Pipeline servidor (desenho preservado; spec renasce na Sprint 31)

| # | Passo |
| --- | --- |
| 1 | `ms-virtual-loop` consome o **relay que o `ms-cameras` já mantém**, no substream de menor resolução - nunca a câmera direto, pra não expor a credencial dela a mais um processo |
| 2 | Decodifica com `ffmpeg` em processo filho, e detecta veículo por frame com inferência nativa embutida no próprio processo Node (não é serviço Python separado) |
| 3 | Projeta a ocupação da região a partir das detecções, com uma janela de histerese antes de confirmar mudança de estado |
| 4 | Publica em `attlas.analytics.region-occupancy` com `IRegionOccupancyEvent` - ocupação referenciada por `cameraId` e `regionIndex` |
| 5 | `ms-connector-virtual-loop` traduz `(cameraId, regionIndex)` para `(controllerId, detectorIndex)`, usando o vínculo cadastrado no `ms-cameras` |
| 6 | Republica em `attlas.detectors.raw`, o mesmo tópico do caminho físico, e a partir daí segue o mesmo cano até `ms-detector-history` |

Sem vínculo cadastrado, o connector **descarta o evento e nunca inventa endereço**.

O contrato do passo 4 é o mesmo que o caminho embarcado passa a publicar (PR #1354): é ele que impede o
domínio de rachar em dois pipelines com formatos diferentes. Ver
[[Analítico - Embarcado x Servidor]], seção "O que NÃO pode mudar".

> [!note] O sumidouro do passo 6 já está pronto
> `ms-detector-history` aceita esse evento **sem nenhuma mudança**: `detection.service.ts` já deriva a
> identidade com `deriveDetectorId({ controllerId, index })`, e os contratos de detector
> (`IDetectorRawEvent`, `DetectorTechnology.VIRTUAL_LOOP`, `DETECTOR_SAMPLE_DURATION_MS`) todos existem. O
> que falta é tudo **antes** do sumidouro: os passos 1 a 5 são 100% markdown em PR draft hoje.

## Pipeline ACOM e detector físico (real hoje, outro domínio)

| # | Passo |
| --- | --- |
| 1 | Laço físico, ou laço virtual atuando via placa ACOM, entrega presença ao controlador como contato seco |
| 2 | `ms-controllers` detecta o fechamento de ciclo e publica o evento de ciclo completo |
| 3 | O connector do protocolo do controlador publica a leitura bruta do detector |
| 4 | `ms-detector-history` persiste a série e calcula falhas |

**Regra que impede contagem duplicada**: se o mesmo endereço de detector já tem vínculo de câmera
registrado (pipeline anterior), esse endereço não pode ao mesmo tempo ser lido como presença física por
este pipeline.

> [!warning] Falta o caller, e a falha cai no vazio
> Os passos 1 e 2 pressupõem alguém que fecha o contato seco a partir do laço virtual, e esse caller não
> existe: não há nenhum consumer Kafka no `AcomModule`. E a falha que o passo 4 calcula é publicada em
> `attlas.detectors.fault`, que tem produtor real e **nenhum consumidor** - o `ms-alarms`, designado por
> `docs/modules/detectors.md`, não assina o tópico.

## Ver também

- [[Analítico]] · [[Analítico - Embarcado x Servidor]] · [[Analítico - Requisitos e SLA]] · [[Analítico - Arquitetura e estratégias]]
- [[Attlas - Sprint 30]] (onde as lacunas acima viraram card)
- [[VMS - Fluxos]] (padrão de nota usado aqui) · [[ms-cameras]]
