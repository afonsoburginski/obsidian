---
tags:
  - doc
  - attlas
  - plano
atualizado: 2026-08-24
status: TODOS os lotes de conteúdo executados em 24/08 (0 revisado, 1 a 8 feitos, 9 removido a pedido). Domínio Dashboard de câmeras criado do zero. Lote 10 (web-attlas geral) segue aberto e não escopado. O plano vira registro de método e de lições, não mais fila de trabalho.
---

# Plano - atualização da documentação do vault

As notas de domínio do `ms-cameras` foram escritas em **03/07** e o código andou muito desde então. Este
plano nasceu em 31/07 para dizer **quais notas estavam defasadas, com que evidência, e em que ordem
consertar**. Em 24/08 a fila inteira foi executada; o que sobra aqui é o **método** (reutilizável na
próxima defasagem) e as **lições** que cada rodada deixou.

## Método (para não virar achismo)

Três medidas objetivas, aplicadas contra `origin/develop`:

1. **Data da nota x commits no código que ela descreve**: `git log --since=<data da nota>` restrito aos
   caminhos citados pela nota. Muito commit em caminho descrito pela nota = nota provavelmente defasada.
2. **Referência morta**: todo caminho de repo citado entre backticks testado com `exists()`.
3. **Termo do código sem menção no vault**: rota, domínio ou campo que existe hoje e não aparece em nota
   nenhuma. É o sinal mais forte, porque indica assunto **inexistente**, não só desatualizado.

Na rodada de 24/08 entrou uma quarta medida, que se provou a mais produtiva: **auditar o código com
pergunta fechada e aceitar "NÃO EXISTE" como resposta válida**. Perguntar "existe healthcheck do
analítico?" e receber "não, só três métricas Prometheus" vale mais que ler a nota antiga e presumir.

## Estado por assunto (24/08)

| Assunto | Notas | Estado |
| --- | --- | --- |
| Cameras | 4 | **Feito.** Topologia de produção, `media-profiles` (UC-031), escopo por `systemId` completo, PR #1137 (IP duplicado + reativação de soft-deleted). Achado forte: o cadastro passou a provisionar `CameraStreamProfile` e `CameraCredential` inline (SOFTWARE-2226), o que as 3 notas negavam - RF-CAM-06 promovido de Parcial para Implementado |
| Eventos, incidentes e alarmes | 4 | **Feito.** O domínio inteiro mudou de `src/cameras/` para `src/events/` (11/07) e nenhuma nota sabia. Superfície cross-câmera nova (`/cameras/events*`, stats, timeline, recorrência, observações, reportar), model `CameraEventObservation`, RF-INC-01 virou Implementado. Gap achado e registrado: reporte manual sem guarda de idempotência |
| Saúde e monitoramento | 8 | **Feito** (dedupe por device físico, contradição do adapter Redis). Pendente de forma: consolidar as 8 notas em duas famílias de nome |
| Streaming | 10 | **Feito** (fixes de 19/08, cross-refs de INT-008, telemetria always-on). Pendente de decisão: fundir ou manter `Streaming - Arquitetura` x `Streaming - Estratégias de entrega` |
| Dashboard de câmeras | **3, novas** | **Criado do zero.** 7 controllers, 16 rotas REST + 1 canal WS, **zero tabela Prisma própria** - todo widget é agregação read-time sobre Saúde, Eventos e Integração |
| Analítico | **5** | **Reescrito.** Ver seção própria abaixo |
| Integração com dispositivo | 6 | **Feito.** Gap real fechado: integração nativa Hikvision via ISAPI (PR #1738) não estava em nota nenhuma |
| PTZ e presets | 4 | Sem mudança desde 31/07 (0 commits no código) |
| VMS e videowall externo | 5 | **Feito**, revisado duas vezes (22/08 e 24/08) |
| CI-CD e acessos | 2 | **Feito.** Runner do sumo cresceu para 32 vCPU / 40 GiB; a integração deixou de ser serializada e virou semáforo de até 3 vagas |
| Kubernetes | - | **Removido do vault em 24/08 a pedido do user** (9 notas para a trash do MCP, recuperável). O repo `Developer/kubernetes` segue como fonte de verdade fora daqui |

## A rodada do Analítico (24/08)

Foi a maior da série e teve método próprio: três auditorias de código em paralelo (embarcado, servidor,
ACOM/ATSPM) antes de escrever uma linha. O resultado mudou o plano da frente inteira, não só a
documentação - ver [[Attlas - Sprint 30]].

Notas: [[Analítico]], [[Analítico - Embarcado x Servidor]] (nova, é a central),
[[Analítico - Requisitos e SLA]], [[Analítico - Arquitetura e estratégias]], [[Analítico - Fluxos]].

Três achados que só apareceram porque a pergunta foi fechada:

1. **`deviceSourceId` não tem writer no banco** - câmera cadastrada pela UI nunca recebe detecção ao
   vivo. O analítico embarcado está "entregue desde 15/07" e funciona só para as câmeras do seed.
2. **Não existe imagem de evidência de detecção de origem nenhuma** no Attlas 26 - o payload do device é
   100% metadado. A pergunta original das notas de alinhamento ("a baixa qualidade vem do Attlas ou da
   câmera?") não se aplica: é escolher a fonte, não corrigir qualidade.
3. **Colisão de ID em `CROSS-043`** - três atômicas já mergeadas citavam o ID como a decisão do adapter
   Redis, e uma PR em draft criava o mesmo ID para o ADR de alimentação de vídeo. Resolvida no fim do dia
   pelo fechamento daquela PR no reescopo do analítico; sobrou a duplicação de `CROSS-032`, que ia de
   carona nela e virou card.

## Lote 10 - web-attlas geral (aberto em 22/08, ainda não escopado)

Único lote que sobra. O vault documenta o `ms-cameras` a fundo, mas não tem domínio para o `web-attlas`
além do que mora dentro de `ms-cameras/VMS/`. O padrão de camadas página/store/serviço que a PR #1884
aplicou ao VMS vem do módulo de alarmes, então provavelmente vale para o `web-attlas` inteiro - mas isso
não foi verificado, só suposto a partir de um exemplo.

Antes de escrever nota, rodar as quatro medidas do método sobre `apps/web-attlas/`, e decidir se cabe uma
pasta `Docs/web-attlas/` paralela a `ms-cameras/` ou se cada domínio de front fica dentro do domínio de
backend que serve, seguindo o precedente do VMS. Não fazer de improviso dentro de outro trabalho.

## Regras de execução (valem para a próxima rodada)

- **Código é fonte de verdade.** Nota que discorda do código é bug da nota. Regra de negócio vem de
  `docs/modules/` e do edital, não do código.
- Cada afirmação sai de um arquivo lido, com caminho citado. Sem "provavelmente" e sem herdar afirmação
  da versão antiga da nota.
- Divergência entre contrato e implementação vira **callout explícito**, não é escondida.
- Toda nota tocada recebe `atualizado:` no frontmatter.
- Renome de nota mantém `aliases` com o nome antigo, e os wikilinks que apontavam para ela são reescritos
  no mesmo lote.
- **3 a 4 notas por assunto**: `index.md` (não repete conteúdo das filhas), Arquitetura e estratégias,
  Fluxos, mais uma temática quando o assunto pedir. O Analítico ganhou a quinta
  ([[Analítico - Embarcado x Servidor]]) porque a distinção era o assunto.
- Não tocar em [[Edital - Attlas nova definição de módulos]] nem reescrever `Reports/` antigos: são
  registro histórico.

## Lições acumuladas

- **31/07**: nota de 03/07 com 40+ commits no caminho que descreve está defasada por construção, não por
  azar.
- **22/08**: um lote "FEITO" não é permanente. Sprint que entrega rápido pede revisão a cada 2-3 semanas.
- **24/08, manhã**: `index.md` atualizado **não** significa que as notas de faceta da mesma pasta também
  estão. No VMS, o índice foi a 22/08 e as três facetas ficaram em 31/07. Conferir as duas coisas juntas.
- **24/08, manhã**: achado registrado numa nota de incidente não se propaga sozinho para a nota de
  arquitetura do domínio. A dedupe de conexão VAPIX ficou três semanas documentada só no incidente.
- **24/08, tarde**: auditar antes de escrever muda o plano, não só o texto. Os três achados do analítico
  acima teriam passado despercebidos numa revisão que partisse da nota antiga.

## Pendências de forma que sobraram

- **Diagramas/**: 10 excalidraw. O repo tem **duas MOD-004** (`hls-streaming-pipeline` e `ptz-presets`) e
  o vault espelha a colisão; faltam diagramas de MOD-005 e MOD-009 a MOD-014. Renumeração é trabalho de
  repo, não de vault. O Analítico também não tem canvas nenhum.
- **IDs de spec ambíguos no repo**: três UC-019, dois UC-011, UC-015 e UC-018, mais a colisão de
  `CROSS-043` achada em 24/08. Ao citar spec nas notas, usar id mais slug.
- **Consolidação de nomes em Saúde**: duas famílias ("Saúde e monitoramento - X" e "Status em tempo real -
  X") para o mesmo domínio.
- **Verificação de 24/08 rodada e fechada.** A rodada criou 11 notas (1 do Analítico, 3 do Dashboard, a
  da Sprint 30 e 6 de card) e removeu 9 (Kubernetes). Uma passada de verificação em cinco dimensões
  (wikilinks, frontmatter, estilo, fatos contra o código, contradições entre notas) achou 16 defeitos
  confirmados, todos corrigidos: dois `aliases` poluídos com nomes de tag, um frontmatter com YAML
  inválido, dois `updated:` defasados em doc do repo, 22 travessões e 3 símbolos de seção em prosa nova,
  e **dois erros factuais de peso** - a afirmação de que não existia captura de snapshot no repo (existe:
  `CameraThumbnailService`) e a de que o bug de `kind` tinha impacto zero (o campo é renderizado no log
  ao vivo da aba Analíticos). Zero link quebrado e zero frontmatter inválido ao fim.
- **Lição da verificação**: auditoria de código feita por agente também erra por varredura incompleta.
  As duas afirmações falsas acima nasceram de um grep que concluiu "não existe" cedo demais. Afirmação
  categórica de ausência ("não existe em lugar nenhum do repo") merece segunda passada antes de virar
  premissa de decisão de escopo - as duas viraram, e uma delas dimensionava um card em 5 pontos.
