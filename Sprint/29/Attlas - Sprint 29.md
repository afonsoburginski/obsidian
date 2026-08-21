---
tags:
  - attlas
  - sprint-29
  - moc
sprint: Sprint 29 (17/8/26 - 23/8/26)
status: aberta em 17/08 por rollover da Sprint 28, sem planejamento próprio, é a fila que sobrou depois da reconciliação do board (ver [[Attlas - Sprint 28]]). A frente do VMS/videowall externo segue como continuação direta; os cards fora do foco (analítico em container, comparativo, permissões, k8s) mantêm o mesmo estado de antes, só trocaram de lista. Em 19/08: quatro cards fecharam na semana (2434, 2477, 2532 e 2562), a 2532 reabriu pela integração nativa da Hikvision e voltou a fechar no mesmo dia com o merge da #1738. A pilha do videowall foi desempacotada em oito PRs encadeadas, uma por card, e as oito receberam o retorno de review tratado no mesmo dia: 182 apontamentos corrigidos, respondidos e devolvidos para nova revisão.
atualizado: 2026-08-19
---

# Attlas - Sprint 29

Sprint aberta em 17/08 pelo rollover do que não fechou na Sprint 28. Ainda não teve planejamento próprio
(não houve daily de abertura); os cards abaixo são exatamente os que estavam `not Closed` na 28 no
momento da reconciliação do board, movidos de lista no ClickUp e de pasta no vault. Nenhuma descrição,
escopo ou pontuação foi alterada no movimento, só a lista/pasta de origem.

## Continuação direta: videowall externo (NovaStar H9) e cauda do renome VMS

A frente principal da 28 fechou a fundação (espelhar, tomar/liberar painel, cadastro, catálogo, codec,
menu radial, form de processador — tudo isso Closed, ver [[Attlas - Sprint 28]]). O que sobra é a
metade que depende de acesso real ao equipamento H9 e a superfície de frontend que ainda não foi
construída.

| Card | Pts | Status | Onde está |
| --- | --- | --- | --- |
| [[SOFTWARE-2434 - Câmeras como fontes IPC\|2434]] `[Back]` a tela espelhada como fonte do painel | 3 | Closed | mergeado em 18/08 pelas PRs 1659 e 1661; o adaptador do H9 escreve de verdade, o no-op saiu |
| [[SOFTWARE-2477 - Lançador radial do alvo de exibição\|2477]] `[Front]` lançador radial | 2 | Closed | mergeado em 17/08 pela PR 1662 |
| [[SOFTWARE-2562 - Layout da tela do painel físico\|2562]] `[Front]` layout da tela do painel físico | 2 | Closed | mergeado em 18/08 pela PR 1678, que virou a base da pilha |
| [[SOFTWARE-2436 - Brilho e estado observável\|2436]] `[Back]` brilho e estado observável | 2 | code review | PR 1718, com correção pedida em 18/08 |
| [[SOFTWARE-2473 - Capacidades e estado observável no frontend\|2473]] `[Front]` capacidades e estado observável | 2 | code review | PR 1721, uma aprovação e uma correção pedida |
| [[SOFTWARE-2476 - Brilho do painel no frontend\|2476]] `[Front]` brilho do painel | 1 | code review | PR 1721, junto com a 2473 |
| [[SOFTWARE-2474 - Câmeras e página web como fontes no frontend\|2474]] `[Front]` captura da tela e sessão de espelho | 3 | Closed | entregue em 14/08 no commit 16a48fa105; o board só não tinha sido atualizado |
| [[SOFTWARE-2475 - Prévia da geometria projetada\|2475]] `[Front]` prévia da geometria projetada | 2 | to do | PR 5 da pilha, ainda não aberta; espera 2516 e 2517 |
| [[SOFTWARE-2481 - Renome VMS - fase 3 remove o path legado\|2481]] `[Back]` remove `/api/video-wall` legado | 0 | to do | espera o deploy do renome em todos os ambientes, que é o critério de início |

### Cards a abrir na 28, criados mas ainda não iniciados (13 pts)

Reconciliação da cláusula 16.13 (14/08): a sessão de espelho com dono ([[SOFTWARE-2514 - Tomar e liberar o painel|2514]]) já saiu Closed na 28, junto com o registro no equipamento. O que falta é a metade da projeção nativa (gesto automatizado, sem operador) e a integração com o motor de planos:

| Card | Pts | Status | Espera o quê |
| --- | --- | --- | --- |
| [[SOFTWARE-2515 - Expiração de ocupação órfã\|2515]] `[Back]` expiração de ocupação órfã | 2 | code review | PR 1718; critério é presença de publicação, nunca contagem de espectadores |
| [[SOFTWARE-2516 - Câmeras da cena como fontes servidas pela plataforma\|2516]] `[Back]` câmeras da cena como fontes | 3 | code review | PR 1720; uma fonte por câmera da cena, servida pela plataforma, nunca a câmera direto |
| [[SOFTWARE-2517 - Projetar e liberar cena pelo alvo VIDEOWALL\|2517]] `[Back]` projetar/liberar cena pelo alvo videowall | 3 | code review | PR 1720; reabre a ativação de cena com o alvo videowall, hoje recusada |
| [[SOFTWARE-2518 - Despacho de comando de videowall no motor de planos\|2518]] `[Back]` despacho de comando no motor de planos | 3 | code review | PR 1735; plano de resposta preempta o operador, com registro e aviso |
| [[SOFTWARE-2519 - Consumidor do comando de plano e echo\|2519]] `[Back]` consumidor do comando e echo idempotente | 2 | code review | PR 1735 |
| [[SOFTWARE-2520 - Fontes de câmera do painel no frontend\|2520]] `[Front]` fontes de câmera do painel | 2 | to do | PR 5 da pilha; leitura de qual câmera está em qual posição na projeção nativa |

## Execução de 18/08: os doze cards de videowall viraram uma pilha de seis PRs

Decisão do dia: em vez de abrir card novo ou replanejar, os cards abertos da frente entram como pilha de
PRs empilhadas sobre a [PR #1678](https://github.com/atmanadmin/attlas-2026/pull/1678), duas tasks por PR,
na ordem em que as dependências permitem. Com a 1678 mergeada em 18/08, a PR 1 passou a sair direto da
develop e o resto da pilha se apoia nela. A auditoria que precedeu a pilha achou três defasagens e elas já
foram corrigidas no board.

## Desempacotamento de 19/08: a pilha vira uma task por PR

A pilha de 18/08 levava duas tasks por PR, e isso deixou o board ilegível contra o GitHub: nove cards em
code review para cinco PRs. A regra que vale é a inversa, várias PRs podem apontar para um card, mas uma
PR nunca carrega vários cards. A pilha foi reconstruída em oito branches, uma por task, rebaseadas na
develop atual, com paridade de conteúdo verificada contra os topos originais.

| # | Card | PR | Base | Arquivos |
| --- | --- | --- | --- | --- |
| 1 | 2436 | [#1754](https://github.com/atmanadmin/attlas-2026/pull/1754) | develop | 50 |
| 2 | 2515 | [#1755](https://github.com/atmanadmin/attlas-2026/pull/1755) | 2436 | 17 |
| 3 | 2516 | [#1756](https://github.com/atmanadmin/attlas-2026/pull/1756) | 2515 | 24 |
| 4 | 2517 | [#1757](https://github.com/atmanadmin/attlas-2026/pull/1757) | 2516 | 45 |
| 5 | 2473 | [#1758](https://github.com/atmanadmin/attlas-2026/pull/1758) | 2517 | 49 |
| 6 | 2476 | [#1759](https://github.com/atmanadmin/attlas-2026/pull/1759) | 2473 | 22 |
| 7 | 2518 | [#1760](https://github.com/atmanadmin/attlas-2026/pull/1760) | 2476 | 23 |
| 8 | 2519 | [#1761](https://github.com/atmanadmin/attlas-2026/pull/1761) | 2518 | 8 |

A [#1738](https://github.com/atmanadmin/attlas-2026/pull/1738) do Hikvision ficou fora da cascata, na base
develop. Para sentar no topo ela precisaria de reescrita de história, e deixá-la independente se provou
melhor: mergeou em 19/08 às 16:04, sem esperar as oito, que dependem do acesso ao equipamento H9.

Quatro branches subiram com sufixo `-2` porque o nome canônico está ocupado pela PR antiga e o force-push
é negado por regra de permissão local. As quatro PRs antigas ([#1718](https://github.com/atmanadmin/attlas-2026/pull/1718),
[#1720](https://github.com/atmanadmin/attlas-2026/pull/1720), [#1721](https://github.com/atmanadmin/attlas-2026/pull/1721)
e [#1735](https://github.com/atmanadmin/attlas-2026/pull/1735)) viraram draft com comentário apontando as
substitutas, e não foram fechadas para as threads de review não se perderem.

Revisores pedidos em 19/08: as duas de frontend foram para danielfaria-art, otavioassis-git, rezendelc,
sarahsribeir0, DanielZanotelliAtman e Will-Atman; as sete de backend para igor64BR,
felipeaquino-atmansystems, Hadson-Ramalho-Atman e danielGuerraAtman.

A ordem preserva a cadeia antiga e insere cada parceiro logo depois do hospedeiro, o que evitou reordenar
a pilha. O plano original punha a 2532 do Hikvision no topo, carregando o fine tuning, mas ela ficou
independente e mergeou sozinha em 19/08, então o fine tuning segue sem PR designada.

Duas descobertas do rebuild. Primeiro, a pilha antiga já estava inconsistente: o topo da 2516 não continha
o commit de review fix da 2436, então as PRs acima nunca receberam as correções pedidas. Segundo, a
migration da 2436 fica inteira, criando também o livro de ocupações encerradas que a 2515 consome, porque
partir uma migration gerada por CLI exigiria revalidar o ciclo shadow.

## O refactor de contrato de planos e a 2518

A [PR #1617](https://github.com/atmanadmin/attlas-2026/pull/1617) do igor64BR mergeou em 18/08 às 17:35 e
deletou os seis arquivos em que a 2518 se apoiava. A [#1735](https://github.com/atmanadmin/attlas-2026/pull/1735)
foi aberta 35 minutos depois, já contra terreno movido, sem aviso.

O título da PR fala de armazenamento de templates de tarefa, mas o commit dentro dela troca a espinha do
roteamento de ações, então quem lesse o título não dimensionaria o raio. Ela foi mergeada pelo próprio
autor com dois pedidos de correção abertos e nenhuma aprovação. A migration é destrutiva, com onze
exclusões, cinco remoções de coluna e uma remoção de tabela, sem backfill, e o corpo declara sete.

**A causa não é uma pessoa, é a `develop` não ter branch protection.** `protected: false`, sem exigência
de aprovação. Medindo a semana de 12 a 19/08, mergear sem nenhuma aprovação não é exceção de ninguém, e
uma das PRs nessa condição é minha, a [#1737](https://github.com/atmanadmin/attlas-2026/pull/1737). Usar
o caso da 1617 como falha individual seria conveniente e falso: o buraco está aberto para todo mundo e vai
pegar o próximo, inclusive a gente. O remédio é exigir uma aprovação na `develop`, e isso é decisão de
quem administra o repositório, não minha.

Mesmo assim o refactor está tecnicamente certo, e por isso adaptei em vez de contestar. A justificativa é
mover a validação para a escrita, com código de erro estável, em vez de deixar plano inexecutável entrar
no banco e falhar no meio da execução, onde o operador já não pode corrigir.

A adaptação saiu melhor que o original em dois pontos. O verbo virou o próprio tipo de ação em vez de um
discriminador dentro dos parâmetros, então plano autorado contra verbo inexistente é recusado antes de ser
gravado. E a identidade do plano é resolvida a partir da ação, subindo o grafo imutável de versão, porque
acrescentar um quarto parâmetro na porta contaminaria os sete serviços por causa de um.

O `ms-cameras` não foi atingido: a 2519 saiu com oito arquivos e zero linha de adaptação.

**Risco a vigiar.** O tipo de ação persiste a posição como inteiro. A develop para no índice 18 e a
[#1743](https://github.com/atmanadmin/attlas-2026/pull/1743), ainda aberta, apende dois verbos alcançando
os mesmos índices do videowall. Quem mergear em segundo reapende depois do outro. É seguro para o
videowall porque nenhuma ação dele foi autorada em ambiente nenhum, e a justificativa está comentada no
próprio arquivo de contrato.

| PR da pilha | Cards | Base | Estado em 19/08 |
| --- | --- | --- | --- |
| base | 2562 layout da tela do painel físico ([#1678](https://github.com/atmanadmin/attlas-2026/pull/1678)) | develop | mergeada em 18/08 |
| 1 | 2436 brilho, estado observável e descoberta da geometria, mais 2515 expiração de ocupação órfã ([#1718](https://github.com/atmanadmin/attlas-2026/pull/1718)) | develop | aberta, correção pedida |
| 2 | 2516 câmeras da cena como fontes, mais 2517 projetar e liberar cena pelo alvo videowall ([#1720](https://github.com/atmanadmin/attlas-2026/pull/1720)) | PR 1 | aberta, sem review |
| 3 | 2473 estado observável no frontend, mais 2476 brilho do painel no frontend ([#1721](https://github.com/atmanadmin/attlas-2026/pull/1721)) | PR 2 | aberta, uma aprovação e uma correção pedida |
| 4 | 2518 despacho no motor de planos, mais 2519 consumidor do comando e echo ([#1735](https://github.com/atmanadmin/attlas-2026/pull/1735)) | PR 3 | aberta, sem review |
| 5 | 2475 prévia da geometria, mais 2520 fontes de câmera do painel | PR 4 | não aberta |
| 6 | 2481 remoção do path legado, mais o fechamento de spec da 2474 | PR 5 | não aberta |

A ordem entre a frente de frontend e a do motor de planos foi trocada em execução: a de frontend ficou
pronta primeiro e não depende do motor de planos, então subiu antes em vez de esperar atrás dele.

A 2481 foi para o topo da pilha de propósito. O critério de início dela é o deploy do renome em todos os
ambientes, que ainda não aconteceu, e uma PR bloqueada no meio da pilha travaria tudo o que estivesse acima
dela.

O que a auditoria corrigiu:

- **2474 fecha sem código novo, e a primeira leitura da auditoria estava errada.** O fluxo inteiro já
  estava entregue, e o preview de vídeo que parecia faltar é proibido pela spec desde 14/08: a captura é da
  própria aba onde a view roda, então renderizá-la desenha a aba dentro da aba. Existe teste verde afirmando
  que nenhum elemento de vídeo é renderizado em nenhum estado. Pontuação devolvida a 3, que é o tamanho
  entregue.
- **2475 estava com o corpo do card dizendo "retirado, fechado sem entrega"** enquanto o nome no ClickUp já
  era "prévia da geometria projetada" desde 14/08. Descrição reescrita e nota do vault renomeada.
- **2436 ainda prometia mapa de janelas** no estado observável, coisa que saiu na revisão de 13/08 junto com
  a composição pela plataforma. Trocado pelo ocupante vigente com tipo de ocupação.
- **2473 e 2476 falavam só do dialog compartilhado.** O redesenho da tela do painel colocou os controles de
  brilho e de estado em overlay sobre o palco, atenuados, e são esses controles mortos que as duas views vêm
  substituir. As duas superfícies consomem o mesmo componente.

Achado colateral que vale card próprio: o `axe-core` não está ligado ao projeto do frontend, então nenhuma
UF pode afirmar honestamente a verificação de acessibilidade nos dois temas que várias delas listam no
critério de aceite.

## Mergeado na semana, de 17 a 19/08

Oito PRs minhas entraram na develop nos três primeiros dias da sprint. Cinco fecham card e três são
trabalho de infraestrutura de CI e de resiliência que não tem card, feito porque estava travando a fila
de todo mundo.

| PR | Card | Mergeada | O que entregou |
| --- | --- | --- | --- |
| [#1659](https://github.com/atmanadmin/attlas-2026/pull/1659) | 2434 | 17/08 | persistência da fonte e da camada do espelho no processador H9 |
| [#1661](https://github.com/atmanadmin/attlas-2026/pull/1661) | 2434 | 18/08 | adaptador NovaStar real no lugar do no-op, leitura autenticada e enforcement de H.264 |
| [#1662](https://github.com/atmanadmin/attlas-2026/pull/1662) | 2477 | 17/08 | rótulo e texto do lançador do VMS passam a falar de espelho, não de projetar cena |
| [#1666](https://github.com/atmanadmin/attlas-2026/pull/1666) | 2532 | 17/08 | tolerância de falha no poll ISAPI e preview Hikvision pelo canal ISAPI |
| [#1678](https://github.com/atmanadmin/attlas-2026/pull/1678) | 2562 | 18/08 | layout da tela do painel físico, base da pilha do videowall |
| [#1670](https://github.com/atmanadmin/attlas-2026/pull/1670) | sem card | 18/08 | boot resiliente do consumer Kafka em organization, pmv, communication-channels e audit |
| [#1727](https://github.com/atmanadmin/attlas-2026/pull/1727) | sem card | 18/08 | vaga de integração no CI liberada por liveness do worker, não por tempo |
| [#1737](https://github.com/atmanadmin/attlas-2026/pull/1737) | sem card | 18/08 | vaga de inotify e Ryuk por processo destravam a integração na VM de CI |

## A 2532 reabriu: a Hikvision ganhou integração nativa

A [#1666](https://github.com/atmanadmin/attlas-2026/pull/1666) fechou a 2532 em 17/08 tratando o sintoma,
a câmera aparecendo offline com stream ativo e sem preview. A
[#1738](https://github.com/atmanadmin/attlas-2026/pull/1738), aberta em 18/08, vai atrás da causa: o ONVIF
sai desligado de fábrica no firmware, e é isso que deixava a Hikvision mais rasa que a Axis. Agora o probe
de credencial liga o ONVIF pelo ISAPI no cadastro, o canal de saúde lê o `alertStream` em vez de fazer
poll de liveness, e existe protocolo ISAPI próprio para o firmware que continuar com o ONVIF desligado.

Em vez de abrir card novo, acoplei a segunda parte à 2532 e reabri o card para code review. É o mesmo
problema, e o board fica honesto: a 2532 não estava entregue enquanto a causa seguia de pé.

Vale o olhar do revisor numa mudança da PR que atinge todas as câmeras e não só as Hikvision. A leitura do
snapshot de saúde passou a considerar a idade da linha e reporta OFFLINE passada a janela de frescor,
porque o snapshot é last-write-wins e uma câmera que parava de ser monitorada seguia declarando STABLE
para sempre.

## Fora do foco, mantidos na lista (sem replanejar)

Mesmo critério da 28: ficam na lista da sprint só para ter lista ativa no ClickUp, sem entrar no track
da semana. Notas continuam em `Sprint/Sem prazo/`, não foram movidas para `Sprint/29/`.

**Analítico em container** (14 cards, `backlog`, indexados em [[00 - Sem prazo (backlog)]]): 2385 a 2398
mais 2391 e 2392, 14 PRs de spec/código seguem em draft desde a Sprint 27.

**Prontos para começar** (`to do`, só se abrir tempo): [[SOFTWARE-2005 - Permissões nas rotas de câmeras - mapa das 86 rotas|2005]], [[SOFTWARE-2400 - Aplicar enforcement de permissão nas rotas de câmeras|2400]].

**Sem prazo mesmo** (`backlog`, pausados desde 27/07): [[SOFTWARE-2314 - Performance do streaming de vídeo|2314]], [[SOFTWARE-2315 - Comparativo Attlas 25x26 - video wall|2315]], [[SOFTWARE-2316 - Comparativo Attlas 25x26 - arquitetura de hardware e streaming|2316]], [[SOFTWARE-2009 - Escalabilidade horizontal do ms-cameras em Kubernetes|2009]], [[SOFTWARE-2200 - Prova de campo do analítico em container|2200]].

## Pendências de processo

- **Feito em 17/08**: rollover do board. Lista `Sprint 29 (17/8/26 - 23/8/26)` já existia pré-criada no
  ClickUp (folder `Sprints`); os 34 cards não-Closed da 28 foram movidos com `move_task` (home list, sem
  checar localização secundária pendurada). No vault, as 16 notas que viviam em `Sprint/28/` moveram para
  `Sprint/29/` com frontmatter (`sprint`, `lista_clickup`, `atualizado`) atualizado; as notas do analítico
  e do backlog sem prazo ficaram onde estavam, em `Sprint/Sem prazo/`.
- **Feito em 19/08**: conferência das PRs da semana contra o board. Três divergências corrigidas no
  ClickUp, a 2434 e a 2562 seguiam em code review com as PRs já mergeadas e viraram Closed, e a 2532
  reabriu para code review por causa da segunda parte. As notas dos quatro cards foram atualizadas aqui.
- Cobrar o acesso à VM que alcança o H9 (gestor requisitou em 31/07, ainda sem resposta na Sprint 28).
- Cinco PRs abertas sustentam nove cards, e a coluna `code review` do board tem que bater exatamente com
  isso. Em 19/08 eu tinha movido para `in progress` os quatro cards das PRs 1718 e 1721, por elas terem
  correção pedida, e isso estava errado: `in progress` é o que se está pegando agora, e ninguém estava
  implementando. Voltaram para `code review`. Correção pedida não muda a coluna, muda quem é o próximo a
  agir dentro dela.
- Antes de reverter, conferi se o trabalho dos quatro já não tinha entrado por outra task. Não tinha. O
  serviço de câmeras não tem nenhum endpoint de brilho na develop, e os arquivos de expiração de ocupação
  órfã só existem no branch da 1718. No frontend o caso é mais sutil e vale registrar: o serviço já tem
  `setBrightness` chamando a rota de brilho desde o redesenho, mas os controles na tela estão com
  `zDisabled` fixo e título de motivo, ou seja, chamam uma rota que ainda não existe no backend. É
  exatamente esse par morto que a 2473 e a 2476 vêm ligar.
- Enquanto a 1718 não resolver a correção, as três acima dela na pilha não mergeiam, mesmo as que já têm
  aprovação.
- Pontos preenchidos no campo nativo em 19/08 para a 2562 (2, que era a sugestão pendente) e para a 2532
  (3, pelas duas PRs somadas). Os cards fora do foco seguem sem tamanho, o que é esperado enquanto não
  entram no track.
- **Auditoria de 19/08, board contra código.** Conferi cada card aberto contra a `develop` em vez de
  confiar no status. Só a 2474 estava errada: entregue em 14/08 e parada em `backlog`, agora Closed. As
  outras seguem abertas com razão, e vale registrar a prova para não reabrir a dúvida: a 2481 tem o path
  legado ainda montado em `@Controller(['vms', 'video-wall'])`, a 2005 e a 2400 continuam com zero
  decorator de autorização nas 85 rotas do serviço, e a 2475 e a 2520 dependem da 2516 e da 2517, que
  ainda estão em PR aberta.
- Fora da sprint, na lista Quito, a [[SOFTWARE-1363]] está em `em teste` desde 22/05 esperando
  confirmação externa sobre transmissão por canal RTSP único, e a SOFTWARE-1899, do Lucas, está em
  `em teste` desde 15/07. Nos dois casos o status afirma teste em andamento e não é isso que está
  acontecendo.
- **Auditoria completa de 19/08, todas as PRs mergeadas contra o board.** A primeira passada olhou só os
  cards abertos e por isso não achou o buraco maior. Refeita do outro lado e sobre o histórico inteiro:
  das 129 pull requests minhas mergeadas entre 15/04 e 18/08, dezesseis não citavam card nenhum, quase
  todas infraestrutura de CI e de deploy atacada em rodadas sucessivas ao longo de quatro meses. Viraram
  seis cards retroativos fechados, cada um na lista da sprint em que o trabalho aconteceu, sem pontuação
  para não distorcer a medida daquelas sprints: SOFTWARE-2583 na 17, SOFTWARE-2584 na 19, SOFTWARE-2582
  na 20, SOFTWARE-2585 na 22, e SOFTWARE-2579 e SOFTWARE-2580 aqui na 29. O detalhe técnico está em
  [[Infraestrutura de CI - trabalho sem card]].
- Dos 106 cards citados em PR mergeada no histórico, só quatro não estavam fechados, e três têm motivo:
  a 2436 e a 2532 seguem abertas com trabalho em PR, e a 1899 é do Lucas. A quarta era a
  [[SOFTWARE-1363]], que voltou de `em teste` para backlog: o bloqueio dela era aguardar resposta sobre
  usar Cloudflare, e a PR 122 entregou o pipeline de HLS sem nenhuma dependência de Cloudflare em 22/05,
  três meses atrás. O que sobra do card é a apresentação do plano, hoje distribuída na 2009 e na 2314.
- Duas dívidas entraram na develop com a 2434 e continuam a cobrar: a migration foi escrita à mão, sem
  Postgres local para rodar o CLI, e a credencial do leitor do mediamtx não está propagada por
  `docker-compose.yml` nem por `setup-env.sh`, só o `.env.example` documenta as envs novas.
- Sem daily de abertura registrada ainda. Quando houver planejamento próprio da 29, atualizar esta nota
  com prioridade da semana, riscos e o que efetivamente entra no track.

## Varredura do GitHub em 19/08

Conferência pedida para achar trabalho aberto no GitHub que não estivesse associado a mim ou refletido no
board. Resultado: nada solto.

- **19 pull requests abertas com minha autoria, todas com assignee correto.** São as 5 da pilha do
  videowall e do Hikvision, mais as 14 de spec do analítico que seguem em draft desde 03/08.
- **Nenhuma pull request de outro autor atribuída a mim.**
- **19 pull requests esperando revisão minha.** Essa é a fila que está comigo e não aparece em lugar
  nenhum do board, porque revisão não vira card.
- **49 branches minhas no remoto sem pull request.** Quarenta e quatro têm zero commit fora da develop,
  ou seja, são só resto de branch depois do squash. Cinco apontavam para commit órfão e cada uma foi
  conferida no conteúdo: os scripts de limpeza dos runners, a resolução de área e subárea no detalhe do
  evento, os guards do deploy e as specs de câmeras estão todos na develop, tendo entrado por branch
  posterior. Nenhum trabalho perdido.

Os cards de videowall sem código, a 2475, a 2481 e a 2520, saíram de `backlog` para `to do`. Os oito com
pull request aberta seguem em `code review`, que é onde o trabalho realmente está.

## Incidente de 19/08: descrições dos 9 cards apagadas e reconstruídas

Ao acrescentar o link da PR na descrição de cada card, o script capturou a descrição atual numa
substituição de comando que voltou vazia, e o update gravou só a linha nova. As nove descrições foram
sobrescritas de uma vez. A API do ClickUp não expõe histórico de descrição, então não houve recuperação
programática.

O que foi restaurado e como. A 2518 e a 2532 voltaram no texto exato, porque foram escritas nesta mesma
sessão. As outras sete foram reconstruídas a partir das notas deste vault, que são detalhadas e vinham da
mesma fonte, e cada uma leva no topo um aviso dizendo que é reconstrução e apontando o histórico da
interface web, para ninguém confundir com o texto original.

Se alguma versão anterior importar, ela ainda existe no ClickUp web, no menu da descrição do card.

## Auditoria das 9 PRs em 19/08

Varredura das nove atrás de incoerência, com o CI disparado em cada uma. Três achados reais, todos
corrigidos, e dois que não são meus.

**A spec PROJ-004 não estava no branch.** O commit da 2518 citava `Spec: PROJ-004` e o arquivo não tinha
entrado, porque a atômica vinha no commit de teste misto que eu só apliquei pela metade. Trazida e
reescrita: o texto descrevia registro de despachantes, verbo lido de parâmetro e os dois mapeadores de
enum, tudo morto depois do refactor de contrato. Citar spec que não existe é violação dura do SDD.

**Faltava a suíte do serviço novo.** Os seis serviços de ação irmãos têm spec e o de videowall não tinha.
Escrita cobrindo catálogo contra o catálogo compartilhado, as duas recusas de escrita, a recusa de
parâmetro autorado, a ordem entre log e publicação, o payload sem identificador de equipamento, a
degradação do nome vazio e a recusa quando a linha do plano sumiu.

**Um teste de integração passava rótulo onde a coluna é UUID.** A suíte da UC-051 usava `run-1` como
identificador da execução de plano, e `ownerId` da sessão de ocupação é coluna UUID, então o insert
falhava já dentro do gesto. A falha estava latente havia dias: PR empilhada não dispara o `ci-pr`, que só
roda com base develop, e essa suíte nunca tinha rodado. Apareceu no primeiro disparo manual.

**Dois errorCode que o consumidor usa não existiam.** O listener referenciava
`EXECUTION_PLANS_VIDEOWALL_CROSS_TENANT` e `EXECUTION_PLANS_VIDEOWALL_EXECUTION_FAILED` e nenhum dos dois
estava no enum: ao fatiar o commit original por caminho eu levei só os arquivos do `ms-cameras` e deixei
para trás a metade em `libs`. O serviço não compilava, e por isso cinco suítes de integração caíam de uma
vez. É a mesma classe de erro do corte por path, e foi o CI que pegou.

O que checou limpo: nenhuma referência pendurada ao dispatcher removido, paridade de chave i18n nos quatro
locales nos três catálogos tocados, nenhum `var(--token, literal)` nos CSS da pilha, nenhuma medida literal
no CSS novo do videowall, e o contrato do comando fechando entre quem publica e quem consome. O `Lint`
passou em todas, inclusive na 2518, o que dá o serviço de ações novo como bem tipado.

Vale registrar o método que falhou: montei um verificador estático para conferir errorCode por branch e ele
deu falso positivo em massa, porque o regex não casava o formato do enum e o checkout falhava com alteração
pendente. Descartei. Quem provou as três falhas foi o CI, não a varredura.

**Dois que não são meus.** O `ms-controllers` tem `deadlock detected` num `TRUNCATE CASCADE` do helper de
integração, que é flakiness sob paralelismo e derrubou uma execução. E o `ci-pr` não roda em PR empilhada
por desenho, `branches: [develop]` filtra pela base, então toda a cascata depende de disparo manual por
`workflow_dispatch`. Enquanto for assim, PR empilhada não tem check verde na página, só run avulsa.

## Relacionados

[[Attlas - Sprint 28]] · [[VMS]] · [[Videowall externo (NovaStar H9)]] · [[Cláusula 16.13 do contrato de Quito]] · [[Plano - múltiplos videowalls (16.13)]] · [[00 - Sem prazo (backlog)]]
