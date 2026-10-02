---
tags:
  - doc
  - analitico
  - requisitos
aliases:
  - "Anotações sobre Analítico de vídeo"
atualizado: 2026-10-01
---

# Analítico - Requisitos e SLA

As regras de negócio do [[Analítico]] e o estado de cada uma no código da `develop`. A fonte de regra é
`docs/modules/analitico.md` (IDs `RF-*` e `RNF-ANL-*`), que segue o edital seção 4.6; as regras das
notas de alinhamento que o documento não cobre estão no fim. O trabalho que falta está em
[[Analítico - O que falta para fechar o módulo]].

Legenda: **Atende**, **Parcial**, **Falta**.

## Detecção por objeto e incidentes

| Regra | Estado |
| --- | --- |
| `RF-DAI-01` a `RF-DAI-02`: regiões com tipo, classes e limiar | Atende. Polígono em porcentagem, sem conceito de linha; a geometria não é validada no backend além do formato |
| `RF-DAI-03`: oito tipos de incidente com parâmetros | Parcial. O equipamento aceita os parâmetros e não os devolve; quem avalia a condição (o limiar global do app ou o da região) não está confirmado com o time do embarcado |
| `RF-DAI-04`: região acende ao vivo, caixas por canal de tempo real; caixa só de analítico que a entrega; verde é só o sinal de detecção | Atende. Nenhuma cor de região é verde, nem na paleta nem na cor personalizada |
| `RF-DAI-05`: criticidade é do tipo, definida pelo órgão gestor, em quatro níveis | Atende (UC-227) |
| `RF-DAI-06`: não reconhecido, confirmado, em tratamento, resolvido e falso positivo, oferecendo só o que o ciclo permite | Atende no vocabulário e nas transições |
| Edital: tempo por etapa do tratamento para SLA | Falta. `CameraEventTreatment` guarda só o status atual e a última mudança |
| `RF-DAI-07` e `RF-DAI-08`: imagem e vídeo do equipamento, com o objeto destacado | Atende no build ATSPM. O SDCT não tem incidente |
| `RF-DAI-09`: incidentes ao vivo por Sistema | Atende (UC-226) |
| Edital: recorrência e padrões de incidente | Falta |

## Laço virtual

| Regra | Estado |
| --- | --- |
| `RF-VL-01`: sem geometria própria, configuração única por câmera | Atende no dado (`CameraAnalytic.loopConfig`); a tela mostra o bloco do laço em cada região |
| `RF-VL-02` e `RF-VL-04`: cruzamento vira leitura de detector `VIRTUAL_LOOP`, `VEHICLE` ou `PEDESTRIAN` | Atende pelos builds HTTP. O app de laço por TCP não fecha sem endereçamento manual ([[Analítico - Fluxos#Ocupação até o detector]]) |
| `RF-VL-03`: embarcado ou servidor | Parcial. Só o embarcado existe; o servidor Atman descrito na regra não tem implementação |
| `RF-VL-05` e `RF-ACOM-04`: contato seco pela ACOM, o analítico sabe para qual placa sinaliza | Atende. Ver [[Analítico - Vínculo com a ACOM]] |
| O vínculo da região segue o detector quando ele muda de endereço | Atende (CROSS-146) |

## ATSPM

| Regra | Estado |
| --- | --- |
| `RF-ATSPM-03` AOG | Atende pela medida do equipamento (`arrivals_on_green`), só no build ATSPM |
| `RF-ATSPM-01` Split Monitor, `02` Yellow e Red, `04` PCD, `05` Approach Delay, `06` TMC, `07` Preemption, `08` Priority | Falta. Nenhuma das sete tem fonte |
| `RF-ATSPM-09`: legível para exportação | Atende para o que a tela mostra (exportação XLS e PDF) |
| `RF-ATSPM-10`: o cálculo não roda na câmera | Substituída para o build `atspm-http` por decisão do PO (UC-229): o Attlas lê o que o app calcula |
| `RNF-ANL-06`: snapshot da configuração semafórica por ciclo | Falta. O ciclo guarda o id do plano; o snapshot do `ms-controllers` é backup do operador, não por ciclo |
| `RNF-ANL-07`: métrica sem produtor não mostra número | Atende. Cartão sem fonte aparece vazio |

## Visão Geral e unidades analíticas

| Regra | Estado |
| --- | --- |
| `RF-VG-01` a `RF-VG-05` e `RF-VG-07`: uma tela, imagem congelada na edição, salvar e descartar o conjunto, validação ao vivo | Atende na tela de Detecção |
| `RF-VG-06`: histórico e versionamento da configuração, com reverter | Falta |
| `RF-INST-01` a `RF-INST-03`: cadastro, estado e histórico de disponibilidade com intervalo configurável | Atende (`AnalyticInstance`, `AnalyticInstanceAvailability`, `pollingIntervalSeconds`) |
| `RF-INST-04` e `RNF-ANL-01`: uma unidade por câmera e capacidade | Atende (`CameraAnalytic_camera_type_active_unique`) |
| `RF-INST-05`: leitura alimenta decisão automatizada | Falta |
| `RF-INST-06` a `RF-INST-08`: descoberta só lê, vínculo explícito e auditado, tomada exige confirmação | Atende (UC-216, UC-217) |
| `RNF-ANL-03`: escrita no equipamento só por ação explícita | Atende |

## Dashboard

`RF-DASH-01` a `RF-DASH-06`: falta inteiro. O módulo não tem aba nem rota de dashboard.

## Tempo medido por placa

Regras do `docs/modules/analitico.md` seções 3.8 e 3.9, e o estado, em
[[Neural Labs - Tempo de viagem]] e [[Neural Labs - Vínculo de câmeras]].

## Regras das notas de alinhamento

Pedidas nas reuniões de alinhamento do módulo e não escritas no `docs/modules/analitico.md`.

| Regra | Estado |
| --- | --- |
| Associação grupo de movimento e grupo semafórico 1 para 1 | Parcial. `MovementGroup.trafficSignalGroupId` é ordinal sem FK e sem unicidade, então dois grupos podem apontar para o mesmo |
| Um movimento pertence a um grupo de movimento só | Atende (`Movement.movementGroupId` é FK escalar) |
| Até 4 laços por câmera | Falta. `IVirtualLoopConfig` é uma configuração por câmera; a UC-073 segue `planned` |
| Uma ACOM agrega até 4 analíticos | Atende como padrão do equipamento (`analyticSlots`, padrão 4) |
| Várias ACOMs por analítico servidor | Não se aplica: o embarcado guarda um destino só, e não há analítico servidor que sinalize placa |
| Configuração da placa se chama "Periféricos ACOM", com a lógica de saída como configuração avançada | Parcial. A placa é a sub-aba ACOMs do controlador, com a lógica num diálogo próprio |
| Atualização remota do app embarcado | Falta. O Vincular inicia e reinicia o app pela API de aplicações da Axis (`applications/control.cgi`), mas nada instala nem atualiza |
| Contar detecções repetidas do mesmo incidente | Atende pela janela de dedup |
| Qualidade da imagem de evidência | Atende: a imagem vem do app, em 640x360, e o vídeo da gravação da câmera, em 1080p |
