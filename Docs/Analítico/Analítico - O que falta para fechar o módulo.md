---
tags:
  - doc
  - analitico
  - escopo
aliases:
  - "O que falta para fechar o Analítico"
  - "Analítico - inventário de fechamento"
fonte: edital seção 4.6 (fonte de requisito) confrontado com leitura direta de origin/develop em 09/09/2026 - apps/ms-video-analytics, apps/ms-cameras, apps/ms-detector-history, apps/web-attlas/src/app/modules/analytics*, libs/contracts
atualizado: 2026-09-09
---

# Analítico - O que falta para fechar o módulo

Parte do [[Analítico]]. Esta nota existe para responder uma pergunta só: **o que falta para o módulo
estar fechado**, contra o prazo externo de 18/09. O método é o único que vale aqui: a lista de recursos
do **edital, seção 4.6** (fonte de requisito) confrontada com o que a `develop` tem em 09/09, lido no
código. Onde a nota antiga de requisito discordou do código, o código venceu.

> [!success] O que já está fechado, para ninguém replanejar trabalho entregue
> **Caminho embarcado**: entidade `CameraAnalytic` e `CameraAnalyticRegion` em banco, geometria por
> preset, writer do `deviceSourceId`, compatibilidade por arquitetura, saúde do analítico, incidente
> gravado com janela de dedup, tratamento com SLA e imagem de evidência.
>
> **Analítico servidor** (`ms-video-analytics`, real): ingestão do stream, detecção por frame, ocupação
> de região com histerese, tradução para endereço de detector e publicação em `attlas.detectors.raw`,
> status da frota, pedestre como segundo agente, provisionamento do peso do modelo com ready travado no
> digest, e o mecanismo de escala (posse por lease em Redis, política de saturação).
>
> **Frontend**: quatro abas montadas - `detection` (construída, **desabilitada na barra**), `instances`,
> `incidents` e `metrics`, esta com as três faces (ATSPM, Laço Virtual, Incidentes), barra de sub-abas,
> funil de filtros, avisos e o resumo de exportação.

## Os cinco recursos do edital, um por um

| Recurso (edital 4.6) | Estado em 09/09 | O que falta |
| --- | --- | --- |
| **Visão Geral** - listar câmeras analíticas, stream com overlay, desenhar laço e região, validação ao vivo, histórico de configuração | 🟡 A aba `detection` existe em **modo leitura só**, e está desabilitada na barra de navegação | **Modo edição** (congelar frame, as cinco ferramentas, paleta, descartar e salvar juntos) e **histórico de configuração** com versão, autor, data, motivo e reverter |
| **Analíticos** - cadastro de servidor analítico, estados de conectividade, polling com histórico, coleta de dados, associação de câmeras, **gestão de ACOMs**, **decisão automatizada** | 🟡 A aba `instances` lê a frota real e a saúde; associação câmera-analítico existe | **Intervalo de polling e histórico de disponibilidade** (`IAnalyticInstance` carrega o campo `null`, sem fonte), **ACOM inteiro** (ver abaixo) e **decisão automatizada** alimentando as Estratégias |
| **Incidentes** - detecção automática, classificação e severidade, fluxo de tratamento com SLA, histórico e padrões | ✅ Fila, mapa, detalhe, tratamento, agregados e dedup entregues | Recorrência e correlação de padrão, que o edital pede em "histórico e padrões" |
| **ATSPM** - PCD, AOG, Split Monitor, Yellow/Red, TMC, Approach Delay, Preemption/Priority, relatórios | 🔴 **A tela está pronta e o dado não existe**: 4 das 38 métricas têm produtor | **A capacidade ATSPM**, que é o maior buraco do módulo. Ver a seção própria |
| **Dashboard** - indicadores de videoanalítica, de cobertura analítica, de qualidade, de incidentes e resumo ATSPM | 🔴 **Não existe.** O módulo `analytics` não tem aba nem rota de dashboard | A superfície inteira. Parte dos indicadores de câmera já existe no `cameras-dashboard` e se reusa |

## ATSPM: a tela está pronta, o produtor não existe

É o achado que mais muda o plano. A face ATSPM é a **aba default** de Métricas, tem as 38 métricas em 7
grupos, cartão com miniatura, modal, visibilidade e funil. E `ATSPM_DETECTOR_READERS` responde por
**quatro**: volume, fluxo, ocupação no tempo e headway. As outras 34 desenham cartão vazio, que é o que
"sem dado" tem de parecer - honesto, e vazio.

> [!important] O dado que falta já está no `ms-detector-history`, e isso derruba a estimativa antiga
> A conta de "ATSPM é serviço novo" está errada. As duas séries que o ATSPM correlaciona **já vivem no
> mesmo serviço e no mesmo banco**:
>
> - `detection_record` - amostras de detecção de 100 ms, particionada.
> - `controller_cycle` - uma linha por ciclo fechado de controlador virtual, com `startedAt`/`endedAt`,
>   `cycleTime`, `duration`, **`stageTimes[]`** (tempo medido de cada estágio), `trafficPlanId`,
>   `offset`, `coordinated` e `missedCycles`.
>
> Com isso, ATSPM é **módulo de agregação dentro do `ms-detector-history`**, não deployable novo. É a
> mesma leitura que a face do Laço Virtual já faz, com o ciclo entrando no join.

O que cada métrica do edital exige, na ordem do mais barato para o mais caro:

| Métrica do edital | O que exige além do que existe |
| --- | --- |
| **Split Monitor** | Só `controller_cycle`: `stageTimes` medido contra o tempo alocado. É a mais barata, e não sai de dentro do serviço |
| **Yellow/Red Actuations** | Chegada (`detection_record`) dentro da janela de amarelo e vermelho do estágio, derivada do início do ciclo mais o acumulado de `stageTimes` |
| **AOG e PCD** | O mesmo, mais **qual estágio serve qual grupo de movimento** - a relação vive no Modelo de Tráfego (`MovementGroup.trafficSignalGroupId`, hoje ordinal sem FK e sem unique) |
| **Approach Delay** | Ocupação e volume por aproximação, sobre a mesma correlação do AOG |
| **TMC** (contagem classificada de movimento) | **Classe do objeto no evento de detector.** O analítico classifica, mas o evento raw publicado não carrega classe - é mudança de contrato |
| **Preemption e Priority** | Correlação com os eventos do `ms-selective-priority`, que existem |
| **Relatórios de desempenho** | É o `ms-reports`, cujo domínio entrou em contracts em 07/09. Cross-módulo, não é tela do Analítico |

> [!warning] ATSPM tem três definições diferentes no projeto, e ninguém reconciliou
> - **O edital (4.6)** define ATSPM por **oito métricas nomeadas**: PCD, AOG, Split Monitor, Yellow/Red
>   Actuations, TMC, Approach Delay, Preemption e Priority, mais relatórios de desempenho.
> - **`docs/modules/analitico.md`**, fonte de verdade de regra de negócio no repo (auditoria de 24-25/08),
>   define ATSPM como **pacote de quatro funcionalidades**: Tracker, DAI, TPM e o Virtual Loop embutido,
>   e diz explicitamente que o detalhe funcional de Tracker e TPM **não está estabelecido**.
> - **O frontend** já implementou a face com **38 métricas em 7 grupos**, portadas do `attlas-design`.
>
> As três não divergem por acaso: a do edital é o produto, a do doc de módulo é como o fornecedor do app
> embarcado empacota, e a do front é o protótipo. **Decidir qual vale é pré-requisito de construir o
> ATSPM**, porque cada uma implica um backend diferente.

> [!danger] Precondição de correção que ninguém orçou: não existe snapshot da configuração semafórica
> `controller_cycle` guarda o **id** do plano (`trafficPlanId`), não o conteúdo. Se o plano for editado, a
> leitura histórica passa a comparar o medido contra um alocado que já não é aquele - e Split Monitor,
> AOG e Approach Delay são exatamente comparações contra o alocado. **Sem snapshot por ciclo, a métrica
> mente com cara de precisa.** É requisito, não refino, e o produtor do snapshot é o `ms-controllers`.

## ACOM: é a atuação, e ela não existe

O ACOM é o que faz o laço virtual **valer algo** para o controlador legado: converte a detecção em
contato seco. O edital põe isso dentro do recurso "Analíticos", como gestão de dispositivo associado, com
controlador, câmera fonte, **mapeamento de canal** (qual laço corresponde a qual entrada) e status de
operação.

No código, em 09/09:

- Os 80 arquivos de `ms-controllers/src/acom/` são reais: CRUD, TCP, codec, pollers.
- **Falta o caller.** `setDeviceParameters` tem um chamador só em produção, e é propagação de CRUD, não
  atuação. O `AcomModule` não tem consumer Kafka nenhum, então a transição de ocupação que o
  `ms-video-analytics` publica não fecha contato em lugar nenhum.
- **A cardinalidade contradiz o requisito**: hoje é N:N via `AcomAssociation` (até 64 associações por
  placa), e o requisito é 1:1 com o controlador, porque a placa está cabeada a um só.
- **Não existe relação ACOM-analítico**, nem o limite de 4 analíticos por placa.
- **Não existe tela**: zero referência a ACOM no `web-attlas`. O i18n tem 18 linhas e nenhum campo de
  formulário. A lógica de saída (`IAcomOutput.logic`, AND/OR/inversão) existe no backend e nunca foi
  exposta.

> [!important] Metade do ACOM não é escopo deste módulo, e a fonte de verdade do repo é explícita
> `docs/modules/analitico.md`, `RF-ACOM-02`: *"o cadastro, o monitoramento de conectividade e o ciclo de
> vida da propria placa ACOM pertencem ao modulo Controladores e vivem em `ms-controllers`. A fronteira
> de dominio de Analitico com ACOM termina em 'um cruzamento pode ser entregue como contato seco'"*.
>
> O edital põe a gestão de ACOMs dentro do recurso "Analíticos", e o doc de módulo põe em Controladores.
> **A divergência é real e precisa de decisão**, mas ela muda quem faz, não se é feito: pelo doc de
> módulo, o que o Analítico deve é **o caller** - a transição de ocupação que fecha o contato. A
> cardinalidade 1:1, o mapeamento de canal e a tela de Periféricos ACOM são do módulo Controladores, de
> outra squad.

Card existente: [[SOFTWARE-2392 - Recorte da atuação via ACOM (docs-only)|SOFTWARE-2392]], 2 pts,
**docs-only**, e ele já nomeia essa decisão de ownership. A implementação do caller não tem card.

## Buracos menores, mas que contam como "falta"

- **A aba Detecção está desabilitada na barra**, com a rota montada. Ligar não é flag: o que falta é o
  modo edição, e a costura já está no código (`canEdit` e a saída `edit`).
- **A `UF-046` do namespace `analytics` é citada no código e não existe como arquivo.** O guard de
  aterrissagem da Detecção referencia `UF-046`, e `apps/web-attlas/docs/modules/analytics/` tem só
  `UF-042`, `UF-044`, `UF-045` e o `PORT-PLAN-atspm-face.md`. É violação de rastreabilidade do SDD, e
  também significa que o ID que o plano de port do ATSPM reservou foi consumido por outra fatia.
- **O doc de módulo existe, com outro nome e outro recorte de recurso.** É
  `docs/modules/analitico.md`, 482 linhas, e ele **não** organiza o módulo pelos cinco recursos do
  edital: os dele são DAI, Virtual Loop, ATSPM e ACOM, com requisitos `RF-DAI-*`, `RF-VL-*`,
  `RF-ATSPM-*` e `RF-ACOM-*`. **Visão Geral e Dashboard não têm seção nenhuma lá**, e é isso que precisa
  ser reconciliado - não criar o arquivo.
- **Exportar não tem endpoint.** A tela diz isso na cara, com o resumo do que o arquivo levaria. O
  destino natural é o `ms-reports`.
- **Quatro laços por câmera**: `IVirtualLoopConfig` segue documentado como configuração única por câmera.
  Card [[SOFTWARE-2686 - Suportar até quatro laços virtuais por câmera|SOFTWARE-2686]], 5 pts.
- **Teto de câmeras por instância**: o mecanismo entrou em 05/09, o número não.
  `VIRTUAL_LOOP_MAX_CAMERAS_PER_INSTANCE` fica sem default até alguém medir. Card `SOFTWARE-2398`.
- **Prova de campo ponta a ponta**: card `SOFTWARE-2200`, e a descrição dele está defasada (manda o
  `ms-connector-virtual-loop` traduzir endereço, e esse serviço foi removido em 05/09).
- **OTA do app embarcado**: zero código de gestão de aplicação no device. O edital não pede OTA no 4.6, as
  notas de alinhamento pedem. Fica registrado como requisito de nota, não de edital.

## A conta, sem maquiar

Estimativa pela tabela do time (1 = menos de 2h, 2 = 2-4h, 3 = 4-8h, 5 = 1-2d, 8 = 2-3d, 13 = 4-5d).
Onde o card existe, o número é o **repontuado**, não o antigo.

| Frente | Card | Pts | Quando |
| --- | --- | --- | --- |
| Reconciliar `docs/modules/analitico.md` com o edital: Visão Geral e Dashboard como recurso, e a definição de ATSPM | sem card | 3 | Sprint 32 |
| `UF-046`, `UF-047` e `MOD-003`, as specs que faltam | sem card | 2 | Sprint 32 |
| Métricas abre na face que tem dado | sem card | 1 | Sprint 32 |
| Detecção em modo edição, em três PRs, e a aba sai de desabilitada | sem card | 9 | Sprint 32 |
| Até 4 laços por câmera, contrato e tela | `SOFTWARE-2686` (era 5) | 8 | Sprint 32 |
| Teto medido de câmeras por instância | `SOFTWARE-2398` | 2 | Sprint 32 |
| Prova de campo ponta a ponta, e as correções dela | `SOFTWARE-2200` (era 2) | 5 | Sprint 32 |
| ATSPM: Split Monitor sobre o ciclo | sem card | 5 | Sprint 33, semana do prazo |
| ATSPM: Yellow e Red Actuations | sem card | 3 | Sprint 33 |
| A face ATSPM lendo os dois grupos novos | sem card | 2 | Sprint 33 |
| Histórico e versionamento da configuração analítica | sem card | 5 | Sprint 33, se sobrar semana |
| **ACOM**: cardinalidade 1:1 e remoção da feature de associações | sem card | 5 | **Depois do prazo, e é do módulo Controladores** (`RF-ACOM-02`) |
| **ACOM**: mapeamento de canal do laço para entrada de contato seco | sem card | 3 | **Depois do prazo, e é do módulo Controladores** |
| **ACOM**: o consumer que fecha o contato na transição de ocupação, que **é** do Analítico | sem card (o docs-only é `SOFTWARE-2392`) | 8 | **Depois do prazo** - precisa de placa na bancada |
| **ACOM**: tela de Periféricos ACOM, que não existe | sem card | 8 | **Depois do prazo, e é do módulo Controladores** |
| **Dashboard do Analítico** (5º recurso do edital) | sem card | 8 | **Depois do prazo** - reusa parte do `cameras-dashboard` |
| ATSPM: AOG, PCD, Approach Delay e TMC | sem card | 13 | **Depois do prazo** - exige o mapa estágio-grupo de movimento e classe no evento |
| Snapshot da configuração semafórica por ciclo | sem card | 8 | **Depois do prazo** - produtor é o `ms-controllers`, outra squad |
| Decisão automatizada alimentando as Estratégias | sem card | 13 | **Depois do prazo** - cross-módulo com o Modelo de Tráfego |
| Polling configurável e histórico de disponibilidade do servidor analítico | sem card | 3 | **Depois do prazo** |
| Recorrência e padrões de incidente | sem card | 3 | **Depois do prazo** |
| Exportar métricas, via `ms-reports` | sem card | 5 | **Depois do prazo** - cross-módulo |
| OTA do app embarcado | sem card | 13 | **Depois do prazo** - requisito de nota, não do edital 4.6 |

**Fecha em 30 pts na Sprint 32, 15 na semana do prazo, e 90 pts depois dele**, e destes 90 são 16 do módulo Controladores, não meus. Os 90 são de quatro a seis
semanas de um dev, e é isso que separa "o Laço Virtual entregue e demonstrável" de "o módulo Analítico do
edital fechado".

**Fechar o módulo inteiro até 18/09 com um dev não é possível.** O que é possível é entregar a cadeia do
Laço Virtual fechada, demonstrável em campo, com a Detecção configurável pela tela e a face ATSPM saindo
do vazio nos grupos que o dado de hoje sustenta. O recorte proposto está em [[Attlas - Sprint 32]], e a
decisão de o que entra é do user.

## Ver também

[[Analítico]] · [[Analítico - Embarcado x Servidor]] · [[Analítico - Requisitos e SLA]] ·
[[Analítico - Tela de Métricas no web-attlas]] · [[Analítico - Frontend do attlas-design]] ·
[[Attlas - Sprint 32]] · [[Grau de saturação não é ATSPM]]
