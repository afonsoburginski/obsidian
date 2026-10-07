---
tags:
  - doc
  - analitico
  - escopo
aliases:
  - "O que falta para fechar o Analítico"
  - "Analítico - inventário de fechamento"
  - "Analítico - O que falta para fechar o módulo"
atualizado: 2026-10-07
---

# Analítico - Pendências

Volta para [[Analítico]].

## Resumo

O que falta no [[Analítico]], pelos cinco recursos do edital (seção 4.6), mais a placa ACOM, os defeitos conhecidos e
as divergências da documentação do repositório. O maior buraco é o ATSPM, com sete das oito métricas do edital sem
fonte, seguido do Dashboard, que não existe. A regra de cada item e o que já atende estão em
[[Analítico - Requisitos e SLA]]. As pendências da Neural Labs estão em
[[Analítico - Neural Labs - Arquitetura e estratégias]].

## Visão Geral (tela de Detecção)

| O que falta | Por que importa | Onde |
| --- | --- | --- |
| Histórico e versionamento da configuração: versão, autor, data, motivo e reverter | Requisito do edital; cada gravação vira só um evento de auditoria | `apps/ms-cameras/src/analytics-realtime/camera-regions.audit.ts` (`RF-VG-06`) |
| Mostrar o bloco do laço uma vez por câmera | O laço é configuração da câmera, mas a tela o desenha dentro de cada região, e mexer nele numa muda todas. Falta a decisão do dono | `apps/web-attlas/src/app/modules/analytics-detection/utils/to-detection-blocks.util.ts` |
| Até 4 laços por câmera | Pedido do alinhamento. É mudança de contrato, não constante nova | `IVirtualLoopConfig` (UC-073, `planned`) |
| Saber quem avalia o limiar do incidente | O app tem limiar global no `/config` e não devolve limiar por incidente; a resposta decide se o que a tela grava por incidente surte efeito. Pergunta para o time do embarcado | app ATSPM |

## Analíticos (tela de Instâncias)

| O que falta | Por que importa | Onde |
| --- | --- | --- |
| App de laço por TCP ponta a ponta: gravar o `deviceId` do handshake e empurrar o endereçamento ao conector ao salvar o laço | Até lá o adaptador `virtual-loop-tcp` não passa da sonda, e o vínculo ACOM dessa build fica `UNSUPPORTED` | `apps/ms-cameras/src/analytics-device/adapters/virtual-loop-tcp/`, `PUT /internal/devices/:deviceId/addressing` |
| Consumidor de `attlas.virtual-loop.device-presence` | O conector publica a presença do equipamento e ninguém lê | `apps/ms-connector-virtual-loop/src/devices/device-presence.publisher.ts` |
| Decisão automatizada: a leitura alimentando as Estratégias do Modelo de Tráfego | Requisito do edital, que cruza módulos | (`RF-INST-05`) |
| Atualização remota do app embarcado | Pedido do alinhamento. O Vincular só inicia e reinicia o app; nada instala nem atualiza | `apps/ms-cameras/src/analytics-device/applications/` |
| Decidir se o `ms-acom` sai | É esqueleto sem uso, ainda no `docker-compose.yml` e no `docker/kong.yml` | `apps/ms-acom/` |

## Incidentes

| O que falta | Por que importa | Onde |
| --- | --- | --- |
| Tempo por etapa do tratamento | O SLA do edital pede o tempo de cada etapa. O tratamento guarda só o status atual, a criação e a última mudança, e a face Incidentes aproxima só "até reconhecer" e "até concluir" | `CameraEventTreatment` |
| Recorrência do mesmo incidente | O edital pede "histórico e padrões"; a face Incidentes corta por tipo, local, câmera e hora, mas não aponta o incidente que se repete no mesmo lugar | face Incidentes das Métricas |

## ATSPM (tela de Métricas)

| O que falta | Por que importa | Onde |
| --- | --- | --- |
| Fonte para Split Monitor, Yellow e Red, PCD, Approach Delay, TMC, Preemption e Priority | Só o AOG vem, e só do app ATSPM. Split Monitor sai só de `controller_cycle` no `ms-detector-history`; as métricas de chegada pedem o mapa estágio para grupo de movimento do Modelo de Tráfego; o TMC pede a classe na leitura de detector, que `IDetectorRawEvent` não carrega | (`RF-ATSPM-01` a `08`) |
| Snapshot da configuração semafórica por ciclo | Precondição de Split Monitor, AOG e Approach Delay. O produtor é o `ms-controllers` | (`RNF-ANL-06`) |
| Mais de um vínculo por câmera nas Métricas | As duas faces leem só `bindings[0]` e não dizem que há outros | `apps/web-attlas/src/app/modules/analytics-metrics/services/virtual-loop-metrics.service.ts`, `apps/web-attlas/src/app/modules/analytics-metrics/services/atspm-metrics.http-source.ts` |

## Dashboard

| O que falta | Por que importa | Onde |
| --- | --- | --- |
| O recurso inteiro | Recurso do edital sem aba nem rota. Pode reusar o que o dashboard de Câmeras já calcula para o parque | (`RF-DASH-01` a `06`) |

## Placa ACOM

| O que falta | Por que importa | Onde |
| --- | --- | --- |
| A composição do ACOM dizer de qual analítico lê as regiões | `regionsOf` lê as regiões da câmera sem o analítico; numa câmera com dois analíticos a chave do vínculo pode não casar | `apps/ms-controllers/src/integration/cameras/cameras.http-client.ts` |
| O `web-attlas` ler `videoUnavailable` da resposta da aba ACOM | Com o `ms-cameras` fora, a linha aparece como "Compatível, sem vínculo" | `libs/contracts/src/lib/acom/i-controller-acoms-response.ts` |
| Desligar o destino no app de laço | Nenhuma fonte documenta como; ao soltar o vínculo, o equipamento fica como está | `apps/ms-cameras/src/analytics-device/adapters/virtual-loop-tcp/virtual-loop-acom.mapper.ts` |
| Ressincronização periódica do vínculo | Retrato perdido depois do teto de repetição só se recupera na próxima escrita da placa | `apps/ms-video-analytics/src/acom-link/` |

## Defeitos e decisões abertas

| O que falta | Por que importa | Onde |
| --- | --- | --- |
| Atraso do acendimento na DEMO | Cerca de 1,5 s dos 2 s ficam dentro do app SDCT, que publica em lotes. Só cai com mudança no app ou atrasando o vídeo para casar com a região; a escolha é do dono | app SDCT |

## Documentação do repositório

| O que falta | Por que importa | Onde |
| --- | --- | --- |
| Tirar o servidor Atman das regras de produto | O documento do módulo ainda descreve "servidor em contêiner Attlas, qualquer câmera" como forma de execução, e nada a implementa | `docs/modules/analitico.md` seções 3.2, 4 e 6 |
| Corrigir a referência do descritor de capacidade | O código do `ms-cameras` e o `SPEC.md` do `ms-connector-virtual-loop` citam um ID que, na `develop`, é de outro assunto | CROSS-119 (`CROSS-119-camera-controller-capacity-gate.md`) |
| Desduplicar IDs de spec | Dois arquivos com o mesmo ID quebram a rastreabilidade | `docs/specs/cross-service/`: CROSS-120 (transporte TCP do laço e eco de comando de subárea), CROSS-149 (medição LPR e exercício de validação da Neural Labs), CROSS-157 (registro de builds e estado de condição de plano) |
| Atualizar a pendência do id da lógica de saída | A spec dá como pendente gravar o `analytic_id` do app na lógica da placa, mas o `acomLogicToDevice` do `ms-controllers` já traduz o id | CROSS-168 seção 11 |
| Aprovar a spec da fiação derivada do vínculo | O código que deriva a entrada de detector da fiação a partir do vínculo está na `develop`, e a spec segue `draft` | `apps/ms-controllers/docs/atomic/` (UC-184) |

## Glossário

| Termo | O que é |
| --- | --- |
| Handshake | A primeira troca do app de laço com o conector, em que ele anuncia o `deviceId` |
| Retrato da placa | O estado inteiro da placa ACOM que o `ms-controllers` manda a cada escrita |
| `controller_cycle` | Tabela de ciclos do controlador no `ms-detector-history` |
| Snapshot por ciclo | Cópia da configuração semafórica vigente em cada ciclo |
