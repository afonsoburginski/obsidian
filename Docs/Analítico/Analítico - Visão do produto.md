---
tags:
  - doc
  - analitico
  - visao
aliases:
  - "Analítico - Embarcado x Servidor"
atualizado: 2026-10-07
---

# Analítico - Visão do produto

Volta para [[Analítico]].

## Resumo

O Analítico transforma o vídeo das câmeras em dado de tráfego: laço virtual, detecção automática de incidentes
(DAI), métricas de desempenho semafórico (ATSPM) e tempo de viagem por leitura de placa. O processamento roda fora
do Attlas, no app embarcado da Atman dentro da câmera Axis ou no NEURAL SERVER da Neural Labs; o Attlas configura,
recebe, guarda e mostra. A regra de negócio do repositório está em `docs/modules/analitico.md`, que segue o edital
seção 4.6. Onde cada peça mora está em [[Analítico - Arquitetura e estratégias]].

## O que faz

### Capacidades

| Capacidade | O que é | Quem calcula |
| --- | --- | --- |
| Laço virtual | Região de vídeo que reporta presença como um laço indutivo. Não tem geometria própria: usa as regiões de detecção da câmera | O app embarcado; o Attlas publica a ocupação como leitura de detector |
| DAI | Detecção automática de incidentes por região, em oito tipos (contramão, veículo parado no trânsito, veículo lento, violação de região, congestionamento, tempo parado excedido, obstrução na via e animal na via) | O app ATSPM; o Attlas grava o incidente, deduplica e trata |
| ATSPM | Métricas de desempenho por região e semafóricas | O app ATSPM calcula na câmera e o Attlas lê; o que o app não responde o Attlas agrega |
| Tempo de viagem por placa | Tempo e velocidade média entre câmeras de um Trajeto | A Neural Labs lê a placa; o Attlas pareia e mede. Ver [[Analítico - Neural Labs]] |
| ACOM | Não é capacidade, é transporte: a placa que entrega o laço virtual ao controlador legado como contato seco | O próprio app sinaliza a placa. Ver [[Analítico - Vínculo com a ACOM]] |

### Embarcado e servidor: as duas famílias

Toda tela e todo documento dizem o fornecedor quando falam de servidor, para que o servidor da Neural Labs nunca
seja lido como o da Atman.

| | Embarcado (Atman) | Servidor (Neural Labs) |
| --- | --- | --- |
| Onde processa | Dentro da câmera Axis, num app (ACAP) da Atman | No servidor físico do cliente, o NEURAL SERVER |
| Câmeras | Só Axis, conforme a matriz abaixo | Qualquer câmera que o NEURAL SERVER leia |
| O que entrega | Ocupação de região, caixas, incidentes, medidas ATSPM | Leitura de placa |
| Como chega ao Attlas | Quadros no Kafka do equipamento, API HTTP do app, ou o app de laço discando por TCP | Socket TCP com XML `<infoplate>`, na porta 17000 do `ms-video-analytics` |
| Tipo no código | `EnumCameraAnalyticType` (`VIRTUAL_LOOP`, `ATSPM`) | `EnumServerAnalyticType` (`NEURAL_LABS`) |
| Na tela | Analítico, aba Instâncias | A mesma aba e a mesma página de instância |

Os dois tipos se reúnem no `AnalyticTypeCatalog` de `@attlas/contracts`, com o fornecedor em `EnumAnalyticProvider`.
O analítico servidor da Atman, que inferia em contêiner do Attlas, está descontinuado (o motivo está em
[[Analítico - Arquitetura e estratégias#Por que é assim]]). O valor `SERVER` de `EnumCameraAnalyticExecutionMode` e
o cadastro de unidade servidor continuam existindo, mas nada processa câmera nessa forma.

> [!warning] `docs/modules/analitico.md` ainda trata o servidor Atman como forma de execução
> A seção 2 registra a descontinuação, mas as seções 3.2 (`RF-VL-03`), 4 e 6 ainda descrevem "servidor em
> contêiner Attlas, qualquer câmera" como regra de produto. A família servidor real é só a Neural Labs (seções 3.8 e
> 3.9).

### Cobertura de cada câmera

Cada câmera cai numa de quatro coberturas, cruzando as famílias: embarcado e servidor, só embarcado, só servidor,
nenhum. O lado servidor é a **associação** da câmera à Neural Labs, que nasce quando a leitura dela gera o vínculo
(ver [[Analítico - Neural Labs - Vínculo de câmeras]]).

### Matriz de compatibilidade do embarcado

| Arquitetura da câmera | App de laço virtual | App ATSPM |
| --- | --- | --- |
| Não Axis | Não | Não |
| Axis ARTPEC 7 | Sim | Não |
| Axis ARTPEC 8 e 9 | Sim, sozinho | Sim, sozinho (já entrega o laço) |
| Arquitetura não identificada | Não | Não |

A arquitetura é **descoberta pelo backend**, nunca escolhida no cadastro, e arquitetura não identificada recusa o
embarcado. O código está em `apps/ms-cameras/src/cameras/analytics/analytics-compatibility.matrix.ts`.

> [!warning] A bancada contraria a exclusão do ARTPEC 8 e 9
> A EMBEDDED 080 roda o app ATSPM e o app de laço ao mesmo tempo. A regra vale para o que o Attlas oferece no
> cadastro; o que está instalado no aparelho fica como está.

### Os cinco recursos do edital

| Recurso do edital | Tela no `web-attlas` |
| --- | --- |
| Visão Geral | Analítico, aba Detecção: configurar a câmera |
| Analíticos | Analítico, aba Instâncias: as unidades e seus vínculos |
| Incidentes | Analítico, aba Incidentes |
| ATSPM | Analítico, aba Métricas |
| Dashboard | Não existe |

O estado de cada recurso está em [[Analítico - Requisitos e SLA]] e o que falta, em [[Analítico - Pendências]].

## Para quem

| Quem | O que faz no módulo |
| --- | --- |
| Operador do centro de controle | Desenha regiões e laço na Detecção, trata incidentes na fila e lê as Métricas |
| Órgão gestor | Define a criticidade de cada tipo de incidente, por Sistema |
| Quem instala e mantém o parque | Registra unidades analíticas, vincula o equipamento e cadastra o servidor da Neural Labs |
| Controlador semafórico legado | Recebe o laço virtual como contato seco, pela placa ACOM |

O acesso segue três permissões: `cameras.analyticsRegion:configure` (região, laço e vínculo região-detector, por
câmera), `analytics.instances:manage` (unidades, Vincular, descoberta e criticidade) e `analytics.incidents:treat`
(tratar incidente).

## Com o que se relaciona

| Módulo | Relação |
| --- | --- |
| [[Câmeras - Cadastro]] | A câmera, a credencial e o stream. O pipeline embarcado mora dentro do `ms-cameras` |
| [[Câmeras - PTZ e presets]] | A geometria pertence a um preset |
| [[Câmeras - Eventos, incidentes e alarmes]] | O incidente é uma linha do log de eventos da câmera, com o tratamento dela |
| Detectores | A ocupação vira leitura de detector `VIRTUAL_LOOP` no `ms-detector-history`, igual ao laço físico |
| Controladores | A placa ACOM e a fiação de cada saída são do `ms-controllers` |
| Modelo de Tráfego | A faixa e o detector a que a região se liga; os Trajetos do tempo de viagem |
| Alarmes | Incidente de congestionamento, contramão ou veículo parado no trânsito vira alarme no domínio `analytics` |
| Prioridade Seletiva | Lê a ocupação de região para o avistamento de veículo prioritário |
| Notificações | A mudança de tratamento do incidente notifica (`cameras.incident.treatmentChanged`) |

## Glossário

| Termo | O que é |
| --- | --- |
| Laço virtual | Região de vídeo que se comporta como um laço indutivo enterrado na via |
| DAI | Detecção automática de incidentes |
| ATSPM | Métricas automatizadas de desempenho semafórico |
| ACAP | Formato de app instalável na câmera Axis |
| ARTPEC | Família de processadores da Axis |
| NEURAL SERVER | O servidor de leitura de placas da Neural Labs, instalado no cliente |
| Contato seco | Saída elétrica liga e desliga, que o controlador lê como lê um laço físico |
| Trajeto | Sequência de câmeras do Modelo de Tráfego entre as quais se mede o tempo de viagem |
