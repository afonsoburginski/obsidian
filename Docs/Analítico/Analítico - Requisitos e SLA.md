---
tags:
  - doc
  - analitico
atualizado: 2026-08-24
servico: ms-virtual-loop, ms-atspm, ms-connector-virtual-loop, ms-dai (planejados, todos scaffold hoje)
fonte: Anotações sobre Analítico de vídeo.md (notas do user) + attlas-vl-atspm.pdf (squad de Visão Computacional, 10/08) + auditoria de código de 24/08
---

# Analítico - Requisitos e SLA

Regras de negócio das duas fontes de alinhamento, cada uma cruzada com o **código auditado em 24/08**.
Compatibilidade por arquitetura de câmera e regras de desenho de região saíram desta nota e vivem em
[[Analítico - Embarcado x Servidor]], que é onde a distinção importa.

> [!note] IDs de trabalho, não oficiais
> Não existe `docs/modules/analitico.md` no repo. O Analítico é módulo do edital
> (`docs/architecture/modules.md`), categoria Dependente, e é **um dos cinco módulos da tabela sem doc
> de contexto próprio** - os outros quatro são Nobreaks, Emergências, Relatórios e Dashboard global.
> Nove docs de módulo o citam, todos como dependência de terceiros: `cameras`, `alarms`,
> `traffic-model`, `detectors`, `operations-panel`, `selective-priority`, `execution-plans`,
> `simulation` e `controllers` - este último só como módulo vizinho, porque suas mais de
> mil linhas não mencionam ACOM, ATSPM, DAI nem laço virtual uma única vez. Escrever o doc próprio é o
> primeiro card da [[Attlas - Sprint 30]]; até lá, os nomes de regra abaixo são de trabalho.

Legenda: ✅ satisfeito · 🟡 parcial · ❌ nada existe.

## Ciclo de vida do analítico

| Regra | Descrição | Estado auditado |
| --- | --- | --- |
| Entidade Analítico persistida | Um analítico cadastrado numa câmera é uma entidade, não um campo livre | ❌ É a chave `deviceSourceId` dentro de `Camera.analyticsCapabilities Json`, coluna sem shape validado |
| Unicidade do analítico embarcado | Não é possível cadastrar dois analíticos do mesmo tipo embarcados na mesma câmera; analítico servidor é a exceção | ❌ Sem entidade, não há o que restringir |
| Writer do vínculo com o device | A chave que liga o frame do device à câmera precisa ser gravada quando o operador cadastra | ❌ **Nenhum código escreve `deviceSourceId` no banco.** Só o seed e edição manual. Câmera cadastrada pela UI nunca recebe detecção ao vivo - é o defeito mais grave do domínio |
| Healthcheck da conexão analítico-câmera | Estado de saúde consultável pelo operador, não só métrica de infraestrutura | 🟡 Três métricas Prometheus (`frames_total`, `last_frame_timestamp_seconds`, `ws_subscribe_rejected_total`). Nenhuma rota REST, nada em `ICameraStatusPayload`, nenhum evento WS de falha. Device fora devolve região vazia com `warn` no log - indistinguível de "sem região configurada" |
| Listar features e arquitetura da câmera no cadastro | O cadastro oferece só o que aquele modelo suporta | ❌ Ver [[Analítico - Embarcado x Servidor]]: nenhum campo de arquitetura existe |
| Atualização remota do app embarcado | OTA do ACAP pela própria plataforma | ❌ Zero código de gestão de aplicação no device. Só há proxy para `/regions`, `/config` e `/producer` |

## Detecção, incidente e evidência

| Regra | Descrição | Estado auditado |
| --- | --- | --- |
| Ativação de laço | Toggle que ativa o Virtual Loop | ✅ `IVirtualLoopConfig.active` |
| Sub-produtos do ATSPM | Tracker, DAI, TPM e VL embutido como sub-produtos endereçáveis, para exibição e possível licenciamento | ❌ `ms-atspm` é scaffold sem uma linha de spec |
| Contagem de detecções de incidente com dedup | O mesmo incidente pode aparecer várias vezes e precisa ser contado corretamente | ❌ Pior que ausente: o incidente DAI **é lido do frame e descartado**. Serve só para escolher o `kind` do WebSocket. Não vira `CameraEventLog` (`CameraEventCategory.ANALYTICS` tem zero produtores, comentado no próprio código), não vira alarme (`ANLT_SEVERE_CONGESTION` está `generatesAlarm: false` e sem produtor) |
| Qualidade da imagem de evidência | Investigar se a baixa qualidade das imagens do histórico do Attlas 25 vem do lado Attlas ou da câmera | **Pergunta respondida pelo Attlas 26: não existe imagem nenhuma.** O payload Kafka do device carrega só metadado (`labels`, `bboxes`, `ids`, `curr_speeds`), zero pixel. Captura de snapshot JPEG do device **já existe** (`CameraThumbnailService`, VAPIX `axis-cgi/jpg/image.cgi` e ISAPI `/ISAPI/Streaming/channels/<n>/picture`, servida em `GET /cameras/:id/thumbnail`), mas é efêmera e de preview: 320x240, `compression=35`, substream secundário, `max-age=5`, sem persistência e sem vínculo com detecção. Não é "corrigir qualidade" nem partir do zero, é decidir se a evidência reusa esse caminho em resolução cheia com armazenamento - ver [[Attlas - Sprint 30]] |

## Geometria e presets

| Regra | Descrição | Estado auditado |
| --- | --- | --- |
| Persistência da geometria de região | A região desenhada precisa existir em algum lugar nosso | ❌ Nenhum arquivo de schema Prisma do `ms-cameras` tem model de região. É proxy HTTP direto pro device, sem escrita local |
| Presets com snapshot de região | Câmera PTZ com mais de um preset guarda um conjunto de regiões por preset, e o operador desenha sobre o frame congelado daquele preset | 🟡 `CameraPtzPreset` não tem nenhuma relação com região ou imagem, e o front desenha um SVG sobre o `<video>` ao vivo. Mas o pixel já é buscável: `CameraThumbnailService` faz snapshot JPEG sob demanda em Axis e Hikvision. Falta persistir o frame por preset e ligá-lo à geometria; hoje mover a câmera de preset invalida a geometria em silêncio |

## ATSPM e grupos semafóricos

| Regra | Descrição | Estado auditado |
| --- | --- | --- |
| Associação grupo de movimento ↔ grupo semafórico | Relação 1 para 1, garantida no cadastro | 🟡 O campo existe (`MovementGroup.trafficSignalGroupId`), mas é `SmallInt` ordinal `[1,8]`, **não é FK**, e não há unique nenhuma - nem no banco, nem no domínio, nem no DTO. Hoje a cardinalidade real é N:1 |
| Um movimento pertence a um único grupo de movimento | - | ✅ `Movement.movementGroupId` é FK escalar nullable: estruturalmente impossível estar em dois. Decidir se vira `NOT NULL` |
| Snapshot da configuração do grupo semafórico | Guardar como a configuração estava no momento em que a métrica foi calculada | ❌ Nenhum snapshot, versão ou vigência de configuração semafórica em nenhum `ms-*`. O parente mais próximo é `ControllerCycle` (`ms-detector-history`), que guarda o **id** do plano, não o conteúdo - se o plano for editado, a leitura histórica passa a mentir |

## ACOM: cardinalidade, nomenclatura e atuação

| Regra | Descrição | Estado auditado |
| --- | --- | --- |
| ACOM ↔ Controlador é 1:1 | Motivo físico: a placa está cabeada a um único controlador. A possibilidade de uma ACOM apontar para controladores diferentes tem que sair | ❌ Hoje é **N:N** via `AcomAssociation`, unique `(acomId, slot, channel)` sem `controllerId` - a mesma placa comporta até 64 associações (slot 1-8 x canal 1-8), cada uma com o seu `controllerId` |
| Remover a feature de associações | Consequência direta do 1:1 | ❌ Feature inteira presente e testada: cerca de 10 arquivos a deletar, 15 a tocar, 4 docs a reescrever |
| Uma ACOM agrega até 4 analíticos | - | ❌ Não existe relação ACOM ↔ analítico. Nenhum limite de 4 em lugar nenhum (`maxOutputs` vai até 4096) |
| Cada analítico tem até 4 laços por câmera | - | ❌ Requisito decidido (não é decisão em aberto), mas **contradiz o contrato atual**, que é laço único por câmera. Card próprio no sem prazo: [[Analítico - Suportar até 4 laços virtuais por câmera]] - ver [[Analítico - Embarcado x Servidor]] |
| Analítico servidor alimenta várias ACOMs | Limitação do sistema a manter como regra | ❌ Não existe a relação |
| Nomenclatura "Periféricos ACOM" | A configuração se chama assim na interface, e a lógica de saída vira configuração avançada dentro dela | ❌ **Não existe tela nenhuma de ACOM no `web-attlas`** (zero referências). O i18n tem 18 linhas, sem nenhuma string de formulário. A lógica de saída já existe no backend (`IAcomOutput.logic`, AND/OR/inversão) e nunca foi exposta |
| Atuação: fechar o contato seco | O laço virtual detecta e a placa atua | ❌ **Falta o caller.** `setDeviceParameters` tem um único chamador em produção, e é propagação de CRUD, não atuação. Nenhum consumer Kafka no `AcomModule` |

## Ver também

- [[Analítico]] · [[Analítico - Embarcado x Servidor]] · [[Analítico - Arquitetura e estratégias]] · [[Analítico - Fluxos]]
- [[Attlas - Sprint 30]] · [[PTZ e presets - Requisitos e SLA]] · [[ms-cameras]]
