---
tags:
  - doc
  - analitico
atualizado: 2026-08-12
servico: ms-virtual-loop, ms-connector-virtual-loop (planejados, scaffold hoje)
fonte: attlas-vl-atspm.pdf (squad de Visão Computacional, 10/08) + 14 PRs em draft da Sprint 27
---

# Analítico - Fluxos

Parte do [[Analítico]]. Fluxo de decisão ao cadastrar câmera/analítico (fonte: PDF do squad de CV) e os
três pipelines de dado (fonte: código atual mais o planejamento da Sprint 27, ver
[[Analítico - Arquitetura e estratégias]]).

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

| # | Passo |
| --- | --- |
| 1 | Câmera Axis com o app ATMAN Traffic Edge instalado |
| 2 | `ms-cameras` fala com o app via proxy HTTP com autenticação digest, pra ler e escrever região e configuração de laço |
| 3 | O device publica a detecção num tópico próprio, num broker separado do resto da plataforma |
| 4 | O consumidor do `ms-cameras` lê esse tópico e faz o vínculo entre o identificador do device e a câmera |
| 5 | Retransmite pro frontend via WebSocket, que desenha o overlay ao vivo |

## Pipeline servidor (especificado na Sprint 27, nada mergeado)

| # | Passo |
| --- | --- |
| 1 | `ms-virtual-loop` consome o substream de menor resolução do relay que o `ms-cameras` já mantém |
| 2 | Decodifica com `ffmpeg`, detecta veículo por frame com um motor de inferência embutido |
| 3 | Projeta a ocupação da região a partir das detecções, com uma janela de histerese antes de confirmar mudança de estado |
| 4 | Publica a ocupação, referenciada por câmera e região |
| 5 | `ms-connector-virtual-loop` traduz esse endereço pro endereço de detector físico equivalente, usando o vínculo cadastrado no `ms-cameras` |
| 6 | Republica no mesmo formato que o caminho físico usa, e a partir daí segue o mesmo cano até `ms-detector-history` |

Sem vínculo cadastrado, o connector descarta o evento e não inventa endereço.

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

## Ver também

- [[Analítico]] · [[Analítico - Requisitos e SLA]] · [[Analítico - Arquitetura e estratégias]]
- [[VMS - Fluxos]] (padrão de nota usado aqui) · [[ms-cameras]]
