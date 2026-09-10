---
tags:
  - doc
  - attlas
  - registro
aliases:
  - "Movimentação da develop em 05 e 07/09"
  - "A develop no sábado 05 e na segunda 07 de setembro"
  - "A develop em 05 e 07 de setembro"
  - "Registro - janela de 05 e 07-09"
fonte: git log sobre origin/develop e gh pr list --state merged em atmanadmin/attlas-2026, janelas locais de 05/09 e 07/09, lidos em 09/09/2026
atualizado: 2026-09-09
---

# Registro - movimentação da develop em 05 e 07 de setembro

**82 PRs mergeadas em dois dias**: 42 no sábado 05/09 e 40 na segunda 07/09. Domingo 06/09 teve zero.
Esta nota condensa o que entrou, para não precisar reler o histórico do repositório quando algo do meu
lado parar de compilar ou uma tela mudar de lugar sem eu ter tocado nela.

Não é registro de sprint - a minha semana está em [[Attlas - Sprint 31]] (fechada em 05/09) e
[[Attlas - Sprint 32]]. Aqui é o que as **outras frentes** puseram na develop na mesma janela, e o que
disso me alcança.

## Volume

| Dia | PRs | Na develop | Dentro de pilha |
| --- | --- | --- | --- |
| Sábado 05/09 | 42 | 40 | 2 |
| Domingo 06/09 | 0 | 0 | 0 |
| Segunda 07/09 | 40 | 28 | 12 |

Sábado foi quase todo Modelo de Tráfego: 20 PRs de backend (Daniel Zanotelli), 11 de frontend (Daniel
Faria), 5 minhas, 3 de Simulação (Sarah) e 2 de planos de execução (Will). Segunda distribuiu: 16 de
relatórios (Ricardo), 8 de Simulação (Sarah), 8 de spec do `ms-simulation` (Guilherme), 6 do Painel de
Operações (Lucas) e 2 minhas.

## O que me alcança direto

Mudou debaixo do `web-attlas`, e vale para qualquer tela que eu escrever daqui para frente:

| O que subiu para camada compartilhada | Onde foi parar | Quem levou |
| --- | --- | --- |
| Stack de mapa do `traffic-model`, sem mudança de desenho | `core/map` | `SOFTWARE-3037`, PRs #2911 e #2913 |
| Diagrama Espaço x Tempo, em três passos: modelagem de banda, perda do nome do host na i18n e nos ids, e capacidade por família de escrita | `core/shared` | PRs #2908, #2909 e #2923, mais o contrato de capacidades (#2912) e a navegação por instante (#2930) |
| Tira de abas segmentadas, e o board de agendamento inteiro reusando `layoutCalendarLanes` | `core/shared` | PRs #2780 e #2781 |

Consequência prática: **antes de escrever componente de mapa, de aba segmentada ou de calendário no
Analítico, olhar `core/map` e `core/shared` primeiro.** Parte do que eu portaria do `attlas-design`
agora existe em casa.

Mais quatro fatos que atravessam frente:

- **`@attlas/contracts` ganhou o domínio `reports`** (#2768), com chaves de permissão próprias (#2770).
- **A spec de object storage foi renumerada de `CROSS-089` para `CROSS-095`** (Newton, 05/09).
  Referência antiga a `CROSS-089` em nota ou spec minha está morta.
- **O monorepo tem 25 microsserviços**, não 27 nem 28 - a contagem já estava errada antes, e foi
  corrigida nos documentos canônicos junto da remoção dos três scaffolds do analítico (minha #2530).
- **Regra de banco nova**: o marcador `prisma-unsupported` tem escopo de **uma linha**, e migration
  aplicada não se edita (#2929).

Um defeito de `core/shared` foi corrigido no meio disso, pela minha #2918: o `ModulePage` escondia o
slot `[pageActions]` junto com o título, então **qualquer** tela sem título perdia as ações em silêncio.

## Módulo de Relatórios: 16 PRs, e só a base chegou na develop

Ricardo mergeou 16 PRs na segunda, e a distinção importa: **12 foram dentro da própria pilha** -
catálogo (#2797), geração sob demanda (#2798), histórico de descargas (#2799), programações (#2801),
preferências (#2802), modelo e tela do designer (#2803 e #2804), shell do módulo (#2795), relógio real
(#2805), revelação no menu (#2806), modelo de fonte de dados (#2796, no sábado) e a exportação da lista
do monitoramento de alarmes por diálogo (#2807).

**Na develop chegaram 4**: a spec de fase 0 do SDD (#2767), o domínio em contracts (#2768) e as duas
promoções para `core/shared` (#2780 e #2781). Em 09/09 **não existe**
`apps/web-attlas/src/app/modules/reports` na develop, e o módulo não aparece no menu de lá.

## Modelo de Tráfego: a onda de de-mock

O front do `traffic-model` parou de inventar dado. Onze PRs do Daniel Faria no sábado, todas com a
mesma forma: a ficha lia mock ou derivava valor do próprio id, e passou a ler fonte real.

- Fichas de **Área/Subárea** (#2894), **Percurso** (#2898), **Interseção** (#2901), **Subsistema**
  (#2899), o tempo percorrido do **Trajeto** (#2900) e as câmeras da aba Vias (#2882).
- O **estado da Via** parou de ser sorteado a partir do id (#2889), e a Via sem leitura passou a
  afundar nas duas direções da ordenação em vez de subir (#2896).
- A regra do **grau de saturação** ficou num lugar só (#2897, `RF-MAP-06`) - é o assunto de
  [[Grau de saturação não é ATSPM]]. A ausência de Junção parou de viajar como o glifo de travessão
  (#2886).

No backend, Daniel Zanotelli fechou uma sequência de UCs de escrita e listagem (UC-089 a UC-096):
prévia de impacto da exclusão de Via, confirmação de cascata de Área, escopo operacional gateando o
create de Via e Percurso, eventos por Faixa e de traçado na escrita de Via, associação e dissociação de
Dispositivo, filtros multivalor em Pontos de Medição, o interruptor mestre de tempo real do Subsistema,
e a recusa de endereço de Detector que o Controlador prova não ter (`BR-DET-011`). Também removeu
contratos e tópicos sem leitor (#2792) - vale conferir se algum era meu.

## Simulação: a fronteira reescrita contra a ASM medida

Guilherme reescreveu as fases 4 a 7 da spec do `ms-simulation` contra a **API real da ASM**, depois de
medir o provedor em vez de presumir: ciclo do Run e serialização do `request_map` (#2772), resultados e
comparação contra as métricas que a ASM de fato serve (#2773), aprovação e o bloqueio do GEH (#2774) e
a fronteira inteira (#2771). O catálogo de métricas foi de 32 para 41, a segurança viária saiu dele, e
as três atômicas da fase 8 nasceram no mesmo dia.

O padrão que me interessa aqui é o método, não o conteúdo: **spec escrita contra medição do provedor,
com o que ele não entrega declarado no texto**. É o mesmo buraco que o meu card de escala tem hoje, com
o teto de câmeras por instância sem número.

Sarah entregou o front de Simulação na mesma janela (diagrama do cenário, detalhe do estudo roteando
por tipo, base do estudo virando escolha, filtro Tipo na listagem, passo 2 do assistente alinhado ao
protótipo), e é dela o trabalho de subir o diagrama Espaço x Tempo para `core/shared`.

## Painel de Operações e o resto

Lucas trouxe o Painel de Operações para a linguagem de mapa compartilhada (#2913), com hidratação por
viewport desenhando travessia e detector (#2920), camadas e filtros (#2928), planos em execução e as
duas ocorrências no trilho de widgets (#2925) e a padronização do arrasto e da identidade dos popups
(#2921). O croqui passou a abrir vídeo ao vivo por cima.

Will fechou as lacunas de front dos planos de execução que não dependiam de ninguém (#2872) e a decisão
da condicional com alvo dinâmico e execução simulada (#2857).

Ainda: Felipe fechou a auditoria e a notificação do `ms-controllers` (redação de campo sensível em
profundidade, auditor único no lugar do par diff-ou-skip, interceptor do consumer Kafka, `PROJ-014`), e
Guilherme fechou os 20 achados do review do `ms-selective-priority`, com teste de integração da
`PROJ-001` contra Postgres real.

## Ver também

[[Attlas - Sprint 31]] · [[Attlas - Sprint 32]] · [[Analítico]] · [[Grau de saturação não é ATSPM]] ·
[[Docs - índice raiz]]
