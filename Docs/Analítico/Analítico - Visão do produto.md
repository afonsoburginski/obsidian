---
tags:
  - doc
  - analitico
  - visao
aliases:
  - "Analítico - Embarcado x Servidor"
atualizado: 2026-10-01
---

# Analítico - Visão do produto

O módulo por inteiro, para quem chega. O detalhe de código está em
[[Analítico - Arquitetura e estratégias]] e o caminho do dado em [[Analítico - Fluxos]].

## O que o módulo entrega

| Capacidade | O que é | Quem calcula |
| --- | --- | --- |
| **Laço virtual (VL)** | Região de vídeo que reporta presença como um laço indutivo. Não tem geometria própria: usa as regiões de detecção da câmera | App embarcado; o Attlas publica a ocupação como evento de detector |
| **DAI** | Detecção automática de incidentes (contramão, fluxo parado, congestionamento e outros) por região | App embarcado ATSPM; o Attlas grava o incidente, deduplica e trata |
| **ATSPM** | Métricas de desempenho por região e semafóricas | O app ATSPM calcula na câmera e o Attlas lê; o que o app não responde o Attlas agrega |
| **Tempo de viagem por placa** | Tempo e velocidade média entre câmeras de um Trajeto | Neural Labs lê a placa; o Attlas pareia e mede. Ver [[Neural Labs]] |
| **ACOM** | Não é capacidade, é transporte: a placa que entrega o laço virtual ao controlador legado como contato seco | O próprio app sinaliza a placa. Ver [[Analítico - Vínculo com a ACOM]] |

## Embarcado e servidor: as duas famílias

Toda tela e todo documento dizem o fornecedor quando falam de servidor, para que o servidor da Neural
Labs nunca seja lido como o da Atman.

| | Embarcado (Atman) | Servidor (Neural Labs) |
| --- | --- | --- |
| Onde processa | Dentro da câmera Axis, num app (ACAP) da Atman | No servidor físico do cliente, o NEURAL SERVER |
| Câmeras | Só Axis, conforme a matriz abaixo | Qualquer câmera que o NEURAL SERVER leia |
| O que entrega | Ocupação de região, caixas, incidentes, medidas ATSPM | Leitura de placa |
| Como chega ao Attlas | Quadros no Kafka do equipamento; API HTTP do app; o app de laço disca por TCP | Socket TCP, XML `<infoplate>`, na porta 17000 do `ms-video-analytics` |
| Tipo no código | `EnumCameraAnalyticType` (`VIRTUAL_LOOP`, `ATSPM`) | `EnumServerAnalyticType` (`NEURAL_LABS`), com `EnumAnalyticProvider`, reunidos no `AnalyticTypeCatalog` |
| Na tela | Analítico > Instâncias, mesma página de instância | Idem |

O analítico servidor da Atman, que decodificava e inferia em contêiner próprio, foi descontinuado: rodar
inferência no processo Node saturava o host (580% de CPU num host de 8 vCPU com duas câmeras), e a
decisão de produto passou a ser resolver toda câmera pelo embarcado. O valor `SERVER` de
`EnumCameraAnalyticExecutionMode` e o cadastro de unidade servidor continuam existindo, mas nada
processa câmera nessa forma.

> [!warning] `docs/modules/analitico.md` ainda descreve o servidor Atman como forma de execução
> As seções 2, 4, 6 e o `RF-VL-03` tratam "servidor em contêiner Attlas, qualquer câmera" como regra
> de produto. Não há implementação. A família servidor real é só a Neural Labs (seção 2, parágrafo
> "Duas famílias de analítico", e seções 3.8 e 3.9).

### Cobertura de cada câmera

Cada câmera cai numa de quatro coberturas, cruzando as famílias: embarcado e servidor, só embarcado,
só servidor, nenhum. O lado servidor é a **associação** da câmera à Neural Labs, que nasce quando a
leitura dela gera o vínculo (ver [[Neural Labs - Vínculo de câmeras]]).

## Matriz de compatibilidade do embarcado

| Arquitetura da câmera | App de laço virtual | App ATSPM |
| --- | --- | --- |
| Não Axis | Não | Não |
| Axis ARTPEC 7 | Sim | Não |
| Axis ARTPEC 8 e 9 | Sim, sozinho | Sim, sozinho (já entrega o laço) |

A arquitetura é **descoberta pelo backend**, nunca escolhida no cadastro, e arquitetura não identificada
recusa o embarcado (fail-closed). Código em
`apps/ms-cameras/src/cameras/analytics/analytics-compatibility.matrix.ts`.

> [!warning] A bancada contraria a exclusão do ARTPEC 8/9
> A EMBEDDED 080 roda o app ATSPM e o app de laço ao mesmo tempo. A regra vale para o que o Attlas
> oferece no cadastro; o que está instalado no aparelho fica como está.

## Os cinco recursos do edital

Visão Geral (configurar a câmera: a tela de Detecção), Analíticos (as unidades e seus vínculos: a tela
de Instâncias), Incidentes, ATSPM (a tela de Métricas) e Dashboard (não existe). O estado de cada um
está em [[Analítico - O que falta para fechar o módulo]].

## Com o que o módulo se relaciona

| Módulo | Relação |
| --- | --- |
| [[Cameras]] | A câmera, a credencial e o stream. O pipeline embarcado mora dentro do `ms-cameras` |
| [[PTZ e presets]] | A geometria pertence a um preset |
| Detectores | A ocupação vira leitura de detector `VIRTUAL_LOOP` no `ms-detector-history`, igual ao laço físico |
| Controladores | A placa ACOM e a fiação de cada saída são do `ms-controllers` |
| Modelo de Tráfego | A faixa e o detector a que a região se liga; os Trajetos do tempo de viagem |
| Alarmes | Incidente DAI de tipo de catálogo vira alarme no domínio `analytics` |
| Prioridade Seletiva | Lê a ocupação de região para o avistamento de veículo prioritário |
| Notificações | A mudança de tratamento do incidente notifica (`cameras.incident.treatmentChanged`) |

## Decisões que desenham o módulo

| Decisão | Por quê |
| --- | --- |
| O analítico é entidade de banco (`CameraAnalytic`), não flag no JSON da câmera | Flag não tem tipo, unicidade nem região |
| Um analítico ativo por câmera e tipo (`CameraAnalytic_camera_type_active_unique`) | Dois do mesmo tipo publicam a mesma detecção duas vezes |
| Incidente é evento contável com janela de dedup por câmera, região e tipo | O incidente fica de pé por muitos quadros; sem janela, a contagem não significa nada |
| A geometria pertence a um preset | Mover o preset faria a geometria apontar para outro pedaço da via em silêncio |
| "Equipamento caiu" e "ninguém configurou" são estados diferentes | São duas ações diferentes para o operador |
| A fila de incidentes é o log de eventos filtrado (`CameraEventLog`, categoria `ANALYTICS`) | Duas implementações do mesmo assunto divergem |
| A tela de Detecção é o único lugar que escreve região, laço e configuração | Duas superfícies de escrita divergem; o detalhe da câmera só lê |
| Escrita no equipamento só por ação explícita do operador (`RNF-ANL-03`) | O equipamento é compartilhado entre ambientes e toda regravação reinicia o pipeline dele |
| A ocupação tem um contrato só, publicado na transição, com histerese | O consumidor não precisa saber de que build veio, e o controlador lê como laço físico |
| As medidas ATSPM do build `atspm-http` são lidas do equipamento (UC-229) | Decisão do PO: não recalcular no Attlas o que a câmera já calcula |
| Na Neural Labs, é o dado que associa a câmera | A câmera passa a ser da Neural Labs quando a primeira leitura dela gera o vínculo |
