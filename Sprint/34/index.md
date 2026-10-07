---
tags:
  - attlas
  - sprint-34
  - moc
  - ms-cameras
  - streaming
  - videowall
  - anpr
  - analitico
  - controladores
aliases:
  - "Attlas - Sprint 34"
  - "Sprint 34 - o que entrega"
sprint: Sprint 34 (21/9/26 - 27/9/26)
status: "ABERTA em 21/09, domingo, quando a validação das telas de stream (detalhe de dispositivo, VMS e Detecções) reproduziu ao vivo o vazamento de publicador que o plano de 18/09 já descrevia. A semana começou pelo backend de streaming e não por escopo novo. AMPLIADA em 22/09, a pedido do dono, com a frente das issues abertas do módulo de câmeras e com a integração do NEURAL SERVER, o ANPR do cliente. ORGANIZADA em 22/09: 21 PRs abertas, 15 tasks com nota própria, 44 pts. AMPLIADA ainda em 22/09 com a quarta frente, o vínculo da região do analítico com o detector, relatado pelo dono e diagnosticado no mesmo dia. ATUALIZADA em 23/09, à tarde, contra o GitHub: as 20 PRs da tabela original mergeadas e as 14 PRs que corriam fora dela viraram tasks, então a tabela passou a 29 tasks e 106 pts, com 28 tasks feitas. Só a integração do NEURAL SERVER segue aberta, como projeto. Das 28 issues do rótulo cameras levantadas em 22/09, 27 estão fechadas. No mesmo dia o CI trocou os 14 runners fixos por um runner scale set e desligou a integração, fora do plano. Em 26/09, à noite, entraram a #4862 (lentidão do dev.v2 pelo stream de alarmes preso na borda), a #4887 (Neural Labs sem tela própria, placa ACOM no campo Detector e Sincronizar na linha de Instâncias) e a #4891 (cache da topologia com o usuário na chave e Sincronizar que traz de volta a instância offline)."
atualizado: 2026-09-27
---

# Sprint 34 - o que entrega

Porta de entrada da semana de **21 a 27/09**. Quatro frentes, duas tasks avulsas e um resíduo da semana
anterior. As
duas primeiras são do `ms-cameras` e partem de coisa já documentada; a terceira entrou em 22/09 e é
integração nova com sistema de terceiro; a quarta entrou no mesmo dia e é um defeito relatado pelo
dono do produto.

> [!info] A semana não começou com planejamento, começou com uma medição
> O pedido de 21/09 foi validar as conexões de stream nas três telas e anotar os gaps. A primeira
> hora de medição reproduziu, na mesma câmera e no mesmo caminho, o vazamento de publicador que a nota
> [[Plano - Streaming sem vazamento de publicador]] já tinha descrito em 18/09 sem nada implementado.
> A partir daí a semana virou a execução daquele plano.

> [!warning] Estado em 23/09 à noite: as PRs #4403, #4414 e #4433 entraram em conflito de merge com a develop
> As três ficaram `CONFLICTING` depois do volume de merges do fim de tarde/noite de 23/09 (entre eles a
> sincronia da própria #4433 e o avanço geral da develop). Resolvido e pushado nas três nesse mesmo
> horário; CI rodando de novo em todas. A linha da task 30 abaixo, escrita mais cedo no dia, ainda dizia
> "CI verde" para a #4414, não estava mais valendo no momento em que este aviso foi escrito. Registrado
> aqui em vez de silenciado, pelo `CLAUDE.md` do repositório, seção "regra documentada vence o código existente" (o código/
> estado real do GitHub vence a nota).

## As tasks da semana

Uma linha por task, uma nota por linha. Nenhuma task desta semana tem card de ClickUp: o trabalho
nasceu da medição de 21/09 e das issues do rótulo `cameras`, e não de um planejamento de sprint. As
tasks 16 a 29 eram PRs que corriam fora da tabela e ganharam nota em 23/09. As datas de merge estão no
horário de Brasília.

| ID | Task (1 task = 1 ou mais PRs) | Natureza | Pts | PRs | Estado |
| --- | --- | --- | --- | --- | --- |
| S34-01 | [[S34-01 - Câmeras - Streaming - O ciclo de vida do processo de relay\|O processo de relay morre quando mandam morrer, e órfão não sobrevive ao boot]] | `[Back]` | 5 | #4071, #4072, #4074 | **feita**, as três mergeadas (22 e 23/09) |
| S34-02 | [[S34-02 - Câmeras - Streaming - A sessão, a adoção e a reconciliação com o media server\|Sessão adotada solta a câmera, e o media server é reconciliado contra o registro]] | `[Back]` | 5 | #4075, #4077 | **feita**, as duas mergeadas (23/09) |
| S34-03 | [[S34-03 - Câmeras - Streaming - Um ingest por câmera, com a qualidade resolvida\|O pedido de H265 entra na relay H264 viva em vez de abrir um segundo ingest]] | `[Back]` | 5 | #4076, #4079 | **feita**, mergeadas em 22 e 23/09 |
| S34-04 | [[S34-04 - Câmeras - Streaming - Superfície do media server e o HLS em disco morto\|Control API do media server restrita, e o HLS em disco removido]] | `[Back]` | 3 | #4073, #4117 | **feita**, as duas mergeadas (23/09), a #4117 primeiro |
| S34-05 | [[S34-05 - Câmeras - Streaming - Readiness por sessão e o runbook de saturação de ingest\|Um laço de readiness por sessão, e o runbook de saturação de ingest]] | `[Back]` | 3 | #4121 | **feita**, mergeada (22/09) |
| S34-06 | [[S34-06 - Câmeras - VMS - Prévia da ACOM em SECONDARY e URL relativa do player\|Prévia da aba ACOM em SECONDARY e sinalização de vídeo na mesma origem do SPA]] | `[Full]` | 2 | #4082, #4084 | **feita**, as duas mergeadas (22/09) |
| S34-07 | [[S34-07 - Infraestrutura - CI - As duas suítes de web-attlas quebradas na develop\|Destravar as duas suítes de web-attlas quebradas na develop]] | `[Front]` | 2 | #4085 | **feita**, mergeada (22/09) |
| S34-08 | [[S34-08 - Câmeras - Videowall - Coluna No painel e o segundo ícone de limpar\|Coluna No painel à esquerda e um único ícone de limpar na busca]] | `[Front]` | 2 | #4143 | **feita**, mergeada (22/09) |
| S34-09 | [[S34-09 - Câmeras - Eventos, incidentes e alarmes - O segundo ícone de limpar nas buscas\|Um único ícone de limpar nas buscas de Eventos e do Log de Eventos]] | `[Front]` | 2 | #4146 | **feita**, mergeada (22/09) |
| S34-10 | [[S34-10 - Câmeras - Videowall - Título e bordas cortados no painel\|Título do painel e bordas dos campos deixam de ser cortados]] | `[Front]` | 2 | #4147 | **feita**, mergeada (22/09) |
| S34-11 | [[S34-11 - Câmeras - Videowall - Nome de grupo duplicado por capitalização\|Nome de grupo salvo deixa de duplicar por capitalização]] | `[Front]` | 2 | #4148 | **feita**, mergeada (22/09) |
| S34-12 | [[S34-12 - Câmeras - Cadastro - Navegação do cadastro e o dropdown de Modelo\|Navegação do cadastro alinhada à de controladores e dropdown Modelo corrigido]] | `[Front]` | 3 | #4150 | **feita**, mergeada (22/09) |
| S34-13 | [[S34-13 - Câmeras - Videowall - Endereço de rede e porta validados\|Endereço de rede e porta do painel seguem o padrão de validação do sistema]] | `[Front]` | 5 | #4152 | **feita**, mergeada (22/09) |
| S34-14 | [[S34-14 - Analítico - Neural Labs - Integração com o NEURAL SERVER (ANPR)\|Consumir o NEURAL SERVER da Neural Labs, o analítico de placas do cliente]] | `[Full]` | sem estimativa | #4403, #4816, #4887 | #4403 mergeada em 24/09 (backend e switch de LPR); #4816 **mergeada** em 26/09 com a associação ao analítico servidor Neural Labs no cadastro, a tela de mapeamento e o simulador do NEURAL SERVER; #4887 **mergeada** em 26/09 à noite tirou do front a tela e o switch, por decisão do dono (o vínculo vai para Instâncias) |
| S34-15 | [[S34-15 - Analítico - Incidentes - 409 do tratamento, releitura da fila e ATSPM sem vínculo\|409 do tratamento, releitura da fila, ATSPM sem vínculo e ir até a câmera]] | `[Full]` | 3 | #3932 | **feita**, mergeada (23/09) |
| S34-16 | [[S34-16 - Câmeras - Monitoramento - A posição da grade sem transmissão\|A posição da grade sem transmissão diz o que aconteceu, em vez de ficar em branco]] | `[Front]` | 5 | #4165 | **feita**, mergeada (22/09), fecha a 3157 |
| S34-17 | [[S34-17 - Câmeras - Cadastro - Importação em lote só com CSV e XLSX\|A importação em lote anuncia só CSV e XLSX]] | `[Front]` | 1 | #4166 | **feita**, mergeada (22/09) |
| S34-18 | [[S34-18 - Câmeras - Videowall - Mensagens de erro com campo e motivo\|As mensagens de erro do painel dizem campo e motivo]] | `[Full]` | 5 | #4169 | **feita**, mergeada (23/09) |
| S34-19 | [[S34-19 - Câmeras - Cadastro - Estado vazio de Dispositivos e o rótulo de conexão\|Estado vazio de Dispositivos com importação ativa e rótulo próprio para conexão]] | `[Front]` | 5 | #4170 | **feita**, mergeada (23/09) |
| S34-20 | [[S34-20 - Câmeras - Videowall - Preset, geometria e grade de projeção\|Preset, geometria e grade de projeção do painel acompanham o layout]] | `[Front]` | 5 | #4171 | **feita**, mergeada (23/09) |
| S34-21 | [[S34-21 - Câmeras - Monitoramento - Barra de ações do Monitoramento e barra de abas\|Barra de ações do Monitoramento de Vídeo e barra de abas do módulo]] | `[Front]` | 5 | #4172 | **feita**, mergeada (22/09) |
| S34-22 | [[S34-22 - Câmeras - Cadastro - Campos e validação do cadastro e da edição\|Campos e validação do cadastro e da edição de câmera]] | `[Front]` | 5 | #4173 | **feita**, mergeada (22/09) |
| S34-23 | [[S34-23 - Câmeras - Eventos, incidentes e alarmes - Validação do reportar ocorrência\|Reportar ocorrência valida obrigatórios e limita tamanho]] | `[Full]` | 3 | #4174 | **feita**, mergeada (22/09) |
| S34-24 | [[S34-24 - Câmeras - Detalhe da câmera - Aba Analítico no detalhe, só leitura\|Aba Analítico no detalhe da câmera, só leitura]] | `[Front]` | 5 | #4349 | **feita**, mergeada (23/09) |
| S34-25 | [[S34-25 - Analítico - Laço virtual - Célula do detector pelo vínculo do laço\|A célula do detector se ramifica pelo vínculo do laço]] | `[Front]` | 2 | #4178 | **feita**, mergeada (22/09) |
| S34-26 | [[S34-26 - Analítico - ACOM - A fiação da ACOM cria o vínculo região-detector\|A fiação da ACOM cria o vínculo região-detector]] | `[Back]` | 8 | #4256 | **feita**, mergeada (23/09) |
| S34-27 | [[S34-27 - Analítico - Detecção - A faixa da via associada na Detecção\|A faixa da via se associa na Detecção, por select]] | `[Full]` | 5 | #4292 | **feita**, mergeada (23/09) |
| S34-28 | [[S34-28 - Câmeras - Planos de execução - Variáveis de condição de câmera\|Variáveis de condição de câmera no Plano de Execução]] | `[Back]` | 5 | #4298 | **feita**, mergeada (23/09); a issue 4269 segue aberta, atendida em parte |
| S34-29 | [[S34-29 - Analítico - Embarcado - O producer do embarcado religado só pela instalação dona\|Só a instalação dona do analítico embarcado religa o producer]] | `[Back]` | 3 | #4296 | **feita**, mergeada (22/09); a variável de ambiente no dev.v2 não foi conferida |
| S34-30 | [[S34-30 - Analítico - Instâncias - Instâncias ligadas ao backend, descoberta na rede e vínculo do source_id\|Instâncias ligadas ao backend, descoberta de analíticos na rede e vínculo do source_id]] | `[Full]` | 23 | #4414, #4887, #4891 | **feita**, mergeada (24/09, merge `d304f408c4`), junto com o registro de builds do analítico, a regra do verde e o build de dev do front mais leve; em 26/09 o Sincronizar entrou no menu da linha e traz de volta a instância offline, e a remoção da instância órfã deixou de dar 404 (#4887 e #4891) |
| S34-31 | [[S34-31 - Câmeras - Detalhe da câmera - Aba Analítico com indicadores, gráfico e regiões\|Aba Analítico do detalhe da câmera no layout do Figma, com indicadores, gráfico e regiões]] | `[Front]` | 5 | #4676 | **aberta**; review de 25/09 atendido (31 de 31 threads resolvidas), develop mesclada, Lint e Build verdes; aguarda novo review de otavio e igor |
| S34-32 | [[S34-32 - Analítico - Incidentes - Imagem e vídeo do incidente lidos do equipamento\|Imagem e vídeo do incidente na sidebar, lidos do equipamento, e o incidente por objeto do ATSPM 0.10.2]] | `[Full]` | 8 | #4889, #4902 | #4889 **feita** e no ar; a continuação #4902 (cópia perto, caixa do objeto, ao vivo e relacionados paginados) mergeada em 27/09 e no ar no dev.v2 (deploy das 00h31 UTC) |

**Em 23/09: 28 de 30 tasks feitas, 106 de 129 pts, as 34 PRs da tabela mergeadas.** A task 30 entrou no
fim do dia 23/09, com a PR #4414 aberta. Fora ela, só a integração do
NEURAL SERVER segue aberta, e ela ainda é projeto, sem estimativa. Por frente: as tasks 1 a 7 são a de
streaming, com o VMS e as suítes de teste que ela destravou; as 8 a 13, 16 a 23 e a 24 são as issues do
módulo; a 14 é a integração nova; a 15 é o que sobrou da semana passada; as 25 a 27 são o vínculo
região e detector; a 28 é das condicionais do Plano de Execução; e a 29 é do analítico embarcado.

A semana tinha 44 pts em 15 tasks em 22/09. Os 62 pts a mais são as 14 PRs que já corriam em paralelo
e não tinham nota, não escopo novo pedido no meio da semana.

### PRs sem task (23/09)

| PR | O que faz | Onde ficou |
| --- | --- | --- |
| [#4277](https://github.com/atmanadmin/attlas-2026/pull/4277) | Specs de streaming do `ms-cameras` realinhadas ao código da develop, sem código | mergeada em 23/09, é documentação da frente 1 |
| [#4316](https://github.com/atmanadmin/attlas-2026/pull/4316) | Os quatro validadores de PR num job só | mergeada em 22/09, ver a seção do CI abaixo |
| [#4333](https://github.com/atmanadmin/attlas-2026/pull/4333) | Validadores dentro do Lint, integração desligada e log do CI enxuto | mergeada em 23/09, ver a seção do CI abaixo |
| [#4383](https://github.com/atmanadmin/attlas-2026/pull/4383) | ESLint em várias threads | mergeada em 23/09, ver a seção do CI abaixo |
| [#4280](https://github.com/atmanadmin/attlas-2026/pull/4280) | Realce de imagem no player de câmera | rascunho, **não mergear** |

### PRs sem task (26/09)

| PR | O que faz | Onde ficou |
| --- | --- | --- |
| [#4862](https://github.com/atmanadmin/attlas-2026/pull/4862) | Stream de alarmes sem buffer na borda do dev.v2 (`X-Accel-Buffering: no` pelo Kong) | mergeada e no ar em 26/09, com HTTP/2 ligado no nginx do host |
| [#4891](https://github.com/atmanadmin/attlas-2026/pull/4891) | Cache da topologia do `ms-traffic-model` no `ms-cameras`, com o usuário na chave | mergeada em 26/09; a parte do Sincronizar é da task 30 |
| [#4909](https://github.com/atmanadmin/attlas-2026/pull/4909) | Navegação lenta do dev.v2, WebSockets do `ms-cameras` que ninguém fechava e deploy só manual | mergeada às 23:50 de 26/09 (02:50 UTC de 27/09), com Lint e Build verdes; o deploy do dev.v2 agora é manual; ver a atualização de 27/09 |

## Frente 1 - streaming sem vazamento de publicador

Detalhe completo, com as medições e a causa raiz, em
[[Registro - implementação do plano de vazamento de publicador em 21 de setembro]].

O que a bancada mostrou, em três números:

- `ffmpeg` vivo por 17 minutos com o media server em **zero caminhos**, socket para a câmera ainda
  estabelecido e o processo parado em espera de futex. A causa é uma linha: `proc.killed` em Node
  vira verdadeiro no **envio** do sinal e não na morte do processo, então o SIGKILL de reserva nunca
  saía.
- **2,57 Mbps** sustentados num 720p H264 baseline, com keyframe a cada 9 quadros. O orçamento de
  300 ms da INT-024 é o que dobra esse número.
- Queda de **320 para 20 KB/s por 6 segundos** no mesmo relay, com o media server registrando a
  duração de parte indo de 134 ms a 7,1 s. Não é configuração de HLS, é fome de quadro no ingest.

### Como as PRs entraram

As onze PRs da frente estão na develop desde 23/09, e com a #4121 e a #4117 são treze. A ordem prevista
era a #4077 depois da #4074 e da #4075, a #4079 depois da #4076, a #4075 depois da #4071 e a #4117
depois da #4073. Só a última se inverteu: a #4117 entrou primeiro, às 14h02, levando junto o primeiro
commit da #4073, que entrou em seguida. A expulsão de caminho órfão do media server entrou desligada,
em ensaio a seco, e espera o dia de observação antes de ser ligada.

### Quatro descobertas fora do plano

- **O CI não roda teste unitário.** Nem `ci-pr.yml` nem `ci-develop.yml` chamam o alvo de teste, só o
  de integração. Quebra de spec entra na develop sem derrubar check nenhum, que é o que o `CLAUDE.md`
  do repositório já descrevia sobre a PR 315. Duas suítes de `web-attlas` estavam quebradas lá desde
  antes, e a #4085 as destrava. Desde a #4333, de 23/09, a integração também está desligada, então
  nenhuma suíte de teste é gate de merge hoje.
- **A permissão de métricas do media server estava concedida a ninguém.** Ligada desde a PR 566, a
  porta respondia 401 a todo scrape, e ninguém percebeu porque nenhum job de Prometheus aponta para
  lá. A concessão por faixa de IP foi revertida no review por razão certa, porque diverge do CROSS-062,
  que exige token, e a #4073 terminou desligando o listener (`metrics: no`): a porta 9998 não responde
  mais. Segue como pendência de observabilidade, e a seção 6 do runbook de saturação de ingest, no
  repositório, ainda manda ler essa porta.
- **O caminho de HLS em disco é código morto.** O controlador lê um diretório que nada escreve desde
  que o media server passou a servir o HLS.
- **A bancada não tem câmera replicada por tenant.** Três linhas de `Camera`, uma por `streamUrl`, um
  tenant cada, o que torna a convergência multi-tenant inverificável aqui.

### Duas reordenações, com motivo registrado

- **Convergência multi-tenant** saiu da posição 10 e foi para dentro da Fase C. Na arquitetura atual
  ela exigiria um contador de referência de publicador que a Fase C apaga em seguida.
- **Projeção do videowall reusando o relay do operador** foi retirada. O caminho da projeção é
  configuração de pull permanente e o relay do operador é publicação efêmera: apontar um para o outro
  faria a parede do cliente escurecer sempre que ninguém estivesse assistindo no navegador.

A **Fase C** (o media server puxando, no lugar do `ffmpeg` publicando) não começou. É ela que de fato
converge os eixos de ingest que sobraram, e a convergência da #4079 vale num sentido só, com a H264
aberta primeiro. Antes dela, a expulsão de caminho órfão precisa sair do ensaio a seco.

## Frente 2 - issues abertas do módulo de câmeras

Aberta em 22/09 com **28 issues** abertas no rótulo `cameras`, uma delas `critical`, e o plano de fechar
10 na semana. Em 23/09, **27 estavam fechadas**: 26 por uma das 14 PRs da frente, conferidas no evento
de fechamento de cada issue, e a 1869 à mão, em 21/09, com comentário de validação. Só a 1875 segue
aberta, porque depende de decisão de produto. O mapa completo, com o que continua aberto, está em
[[S34-33 - Câmeras - Issues - As issues abertas do módulo]].

A âncora era a [#3157](https://github.com/atmanadmin/attlas-2026/issues/3157), grade de Monitoramento
de Vídeo e videowall ficando em branco. As PRs da frente 1 não a fechavam, porque os critérios de aceite
dela são de tela. Quem fechou foi a #4165, em 22/09: o tile que não abre sessão passa a dizer se está
conectando, se falhou ou se bateu no teto de sessões, em vez de ficar preto.

Depois do levantamento entraram quatro issues: a 4269, das condicionais do Plano de Execução, que a
task 28 atende em parte, e três de tela abertas em 23/09 (4326, 4328 e 4351), ainda sem task.

## Frente 3 - integração com o NEURAL SERVER, o ANPR do cliente

Aberta em 22/09 e redefinida na reunião de 23/09. O servidor físico Neural Labs processa os
analíticos; `ms-video-analytics` integra os resultados, `ms-cameras` mantém a capacidade LPR manual
e observada, e `ms-traffic-model` fornece a definição dos Trajetos. A PR #4403 especifica os
contratos e implementa o backend. O manual documenta TCP/XML e SQL Server para LPR; HTTP e o payload
de incidentes dependem de material do fornecedor. Decisão, cálculo de tempo/velocidade e pendências:
[[Decisão - Neural Labs, LPR e tempo de Trajetos (23-09-2026)]] e
[[S34-14 - Analítico - Neural Labs - Integração com o NEURAL SERVER (ANPR)]].

## Frente 4 - o vínculo da região do analítico com o detector

Aberta em 22/09, a partir do relato do dono do produto: uma região de analítico associada continua
sendo exibida como não relacionada, na câmera `ATMN - DEMO` da `dev2`. Vale para **todas as câmeras**,
não só para aquela.

A causa raiz era de desenho, não de dado. O único write que criava a relação região para detector era o
diálogo de vincular laço a detector da tela de Métricas; a aba de detectores ACOM gravava a fiação da
placa no banco do `ms-controllers`, e a tela de Detecção apenas exibia. Os quatro avisos de ausência
dessas telas leem todos a mesma tabela `VirtualLoopDetectorBinding`, do `ms-cameras`, então associar
em qualquer outro lugar não mudava nenhum deles.

**Corrigida em 23/09**, pelas tasks 25 a 27. A #4178 ramifica a célula do detector pelo vínculo do laço;
a #4256 faz a fiação da ACOM criar o vínculo, e a #4292 deixa a faixa da via ser escolhida na própria
Detecção, por select, indo além do atalho que o plano propunha. O vínculo passou a nascer em três telas,
e os quatro avisos continuam lendo a mesma tabela, que agora recebe as três escritas. A divergência que
parecia existir entre o código e a atômica do selo "Sem detector" da ACOM não existia: o código segue a
atômica, que ganhou a frase dizendo que o vínculo também nasce da fiação.

Ficam de pé os quatro achados secundários do diagnóstico, e um efeito novo: o vínculo criado pela ACOM
não passa pelo cache do front, então Métricas e Detecção só o mostram depois dos 60 segundos de validade
do cache, na mesma sessão. Detalhe, com evidência em arquivo e linha, em
[[Plano - o vínculo da região do analítico com o detector]].

## Condicionais do Plano de Execução e analítico embarcado

Duas tasks que não pertencem a nenhuma das quatro frentes. A **task 28** (#4298) faz as condicionais do
Plano de Execução lerem o estado real da câmera no momento da avaliação, por rota interna do
`ms-cameras`, e responde 7 das 13 perguntas de câmera. As outras 6 seguem sem resposta porque o sistema
não tem o dado, e por isso a issue 4269, do time de planos, continua aberta; o que ela pede e o que
falta está em [[S34-28 - Câmeras - Planos de execução - Variáveis de condição de câmera]]. A **task 29** (#4296) faz só a instalação
dona do equipamento do analítico embarcado religar o producer, fechando o laço de reinício indevido
depois de restart ou de escrita de configuração.

## Resíduo da Sprint 33

A [#3932](https://github.com/atmanadmin/attlas-2026/pull/3932), a única PR minha que vinha da semana
passada, foi mergeada em 23/09, com as 23 threads de review resolvidas. Detalhe em
[[S34-15 - Analítico - Incidentes - 409 do tratamento, releitura da fila e ATSPM sem vínculo]].

## Fora do plano - o CI em 23/09

A VM do CI passou de 32 vCPU e 56 GB para 96 vCPU e 86 GB, e os 14 runners fixos deram lugar a um
runner scale set único, o `sumo-ci-runner`, com 20 vagas. A espera do Lint na fila caiu de 5,7 para
0,3 minuto na mediana. No repositório, a #4333 desligou a integração no CI e levou os validadores para
dentro do job Lint, e a #4383 pôs o ESLint em várias threads. Por isso o check `Integration Test` aparece
pulado em toda PR desde 23/09, e é de propósito. O que aconteceu está em
[[Registro - CI em 23 de setembro, VM ampliada e scale set]], e o que falta para virar serviço
profissional é a task sem prazo [[SP-01 - Infraestrutura - CI - Runner profissional em Kubernetes com ARC]].

Achado à noite, revisando a #4433: o piso de memória (`JOB_MEM_FLOOR_GB=16`) que o governador aplica por
runner ocupado não limita a soma entre eles. Com `ocupados=20` (medido às 17:42-17:43 de 23/09, o
mesmo minuto de três builds de `web-attlas:build:production` mortas sem stack trace, exit code limpo),
o governador aplicou `MemoryHigh=16G` em cada um dos 20 runners ao mesmo tempo: 320G configurados
contra 86G reais na VM. O comentário do próprio script assume que "quem segura a soma é a admissão do
ci-scaleset", mas o `ci-scaleset` (Go, `/opt/ci-scaleset`) não conhece `MemoryHigh`/`MemoryMax`, só
decide por fila e `min-free-gb`. Ainda não corrigido no `ci-runner-governor.sh` da VM (fora do repo);
detalhe e log-fonte no chat da sessão de 23/09, não copiado para nota própria ainda.

## Fontes

- [[Registro - implementação do plano de vazamento de publicador em 21 de setembro]] - o dia da frente 1.
- [[Plano - Streaming sem vazamento de publicador]] - o plano de 18/09 que esta semana executa.
- [[Incidentes - Streaming (ms-cameras)]] - o histórico que sustenta o diagnóstico.
- [[S34-33 - Câmeras - Issues - As issues abertas do módulo]] - o mapa de cobertura da frente 2.
- [[Decisão - Neural Labs, LPR e tempo de Trajetos (23-09-2026)]] - a frente 3, com a regra atual e referência ao manual do fabricante.
- [[Plano - o vínculo da região do analítico com o detector]] - a frente 4, com o diagnóstico ancorado no código e o que as três PRs entregaram.
- [[Registro - CI em 23 de setembro, VM ampliada e scale set]] e [[Server e CI]] - o CI fora do plano.
- [[Sprint 33 - o que entrega]] - a semana anterior.

## Atualização - 24/09, madrugada

O Build das #4403/#4414/#4433 seguia vermelho depois da resincronia com a develop, mas não por causa
delas: `apps/ms-traffic-model/src/domain/nodes/services/detector-address-changes.ts`, que chegou na
develop nos commits de CROSS-146, importava `./detector-measurement-identity` como se fosse vizinho, mas
o arquivo real vive em `domain/shared/services` e é assim que os outros 6 pontos de import do serviço
já o alcançam. Quebra `nx run ms-traffic-model:build` para qualquer PR que sincronize com a develop.

Aberta a [#4449](https://github.com/atmanadmin/attlas-2026/pull/4449), só o import, Build
verde. Enquanto ela não mergeia, as três PRs da sprint continuam com o check vermelho; depois do merge
e de outra resincronia, volta a passar.

## Atualização - 24/09, tarde

A #4414 foi mergeada na develop às 14h51 (merge `d304f408c4`), a pedido do dono e com os dois reviews
ainda em pedido de mudança. A semana fica com **29 de 30 tasks feitas e 129 de 129 pts**; segue aberto só
o NEURAL SERVER, que é projeto sem estimativa. Antes do merge a branch recebeu a develop, que estava 537
commits à frente, com um único conflito no índice de specs.

Além do escopo da task, entraram na mesma PR:

- o registro de builds do analítico embarcado, que diz o que cada app entrega (a DEMO não tem caixa) e o
  pisca da região no primeiro quadro, detalhados em [[Analítico - Embarcado x Servidor]];
- a regra de que nenhuma região é verde, porque o verde é o sinal de detecção;
- o salvar da Detecção sem o PUT do laço num app que não tem laço, e sem gravar vagas numa região sem
  bloco de classificação;
- o build de dev do front sem varrer o monorepo inteiro e com teto de memória, registrado em
  [[Ambiente de validação - Dell]].

Ficou para uma PR nova o que o review recebeu como "próximo commit": status das atômicas em
`in-review`, a reescrita da UC-219, notas nas UC-216 a UC-218, o teste da tomada com o envelope real e
quatro ajustes em arquivos do analítico (texto de erro da soltura de faixa, constantes do publicador de
presença e a extração de colaboradores do consumidor do stream).

## Atualização - 25/09

Três pedidos do dono no Analítico. Dois estão na
[#4688](https://github.com/atmanadmin/attlas-2026/pull/4688) (branch
`analytics/feat/NO-CARD-sincronizar-instancia-e-face-por-camera`, worktree
`.claude/worktrees/analytics-player-sync`), aberta sem prova na tela:

- **Player com detecção reutilizável**: saiu desta PR. Outra sessão abriu no mesmo dia a
  [#4685](https://github.com/atmanadmin/attlas-2026/pull/4685), em que o próprio player desenha o analítico
  por input. A versão com um componente em volta do player (UF-727) foi descartada para não duplicar. O
  "Ampliar" de Métricas com detecção ficou como sugestão para a #4685.
- **Sincronizar a instância** (UC-220, INT-028, UF-729): o card "Equipamento" da instância chama de
  "Sincronizar" o mesmo vínculo quando o equipamento já está vinculado, e o toast diz se regravou source id
  e broker ou só religou o produtor. A causa mais provável do "reconfigurei e o Kafka não voltou": o save de
  regiões e do laço ligava o produtor uma vez, antes do restart do app derrubá-lo. Agora o save espera o
  produtor ficar ligado, com o mesmo laço do vínculo. O reparo automático do dono (INT-026) só roda com
  `ANALYTICS_OWNED_DEVICE_SOURCE_IDS` declarado no host, e a env não está em nenhum arquivo de deploy do repo.
- **Métricas pela câmera** (UF-728): câmera só de Laço Virtual desabilita a sub-aba ATSPM e abre a face do
  laço, e o inverso vale para câmera só de ATSPM. Câmera com os dois, ou com nenhum, não desabilita nada.

## Atualização - 26/09

A [#4688](https://github.com/atmanadmin/attlas-2026/pull/4688) recebeu CHANGES_REQUESTED do igor (2
impeditivos, 9 ajustes, 13 threads) e ficou em conflito com a develop. No mesmo dia: merge da develop
(único conflito no índice de specs do analítico), as 13 threads respondidas e resolvidas, e novo review
pedido só ao igor. O que mudou:

- **Sincronizar**: o botão do card é sempre "Sincronizar", porque o card só monta na página da instância
  embarcada, dona do equipamento. Antes ele virava "Vincular" justamente no caso que motivou a UC-220 (app
  atualizado que perdeu source id e broker).
- **Espera do produtor**: cada leitura ou pedido para ligar recebe só o que resta da janela de 10 s, então
  equipamento lento não estica o save nem estoura o timeout de 30 s do cliente.
- **Métricas**: o `effect` das duas faces virou `toObservable`, o pedido de câmera foi para um helper único
  e as specs prometidas na UF-728 foram escritas.
- **Placa ACOM na Detecção**: a pedido do dono, saiu do cartão solto acima das regiões e virou duas linhas
  do bloco "Métricas de desempenho", junto do detector (UF-727 atualizada).
- A nota do review para separar a UF-728 em outra PR não foi acatada: o dono prefere concentrar nas PRs
  abertas.

A [#4816](https://github.com/atmanadmin/attlas-2026/pull/4816) recebeu CHANGES_REQUESTED do felipe e do igor
(40 threads): contratos importando outros contratos, métodos no `AnalyticTypeCatalog`, campos novos
obrigatórios entre serviços e unidades sem teste. Tudo atendido no mesmo dia (specs novos com mutação no
ms-cameras, integração do INT-004 com Postgres real), 40 threads resolvidas, novo review pedido aos dois e CI
verde. A #4688 foi mergeada às 12:36 com a aprovação do Hadson (o dono decidiu que uma aprovação basta, com o
CHANGES_REQUESTED do igor ainda aberto e todas as threads dele resolvidas); as quatro specs dela foram para
`approved` antes do merge, e a branch e a worktree foram apagadas. A #4816 foi mergeada às 12:44, também com a
aprovação do Hadson e as specs em `approved`; branch e worktree apagadas.

A #4816 também ganhou o `DATABASE_URL` do
`ms-video-analytics` fixado no `docker-compose.yml`: no dev.v2 o container caía em loop no
`prisma migrate deploy` porque o `.env.docker` do servidor não tem a variável. Até o deploy, a correção no
host é acrescentar a linha no `~/apps/ms-video-analytics/.env.docker` e recriar o container.

Deploy no dev.v2 às 13:00 do dia 26/09 (ci-develop verde em `a1b087a03c`, com a #4688 e a #4816): smoke OK, as
migrations `create_camera_server_analytic` (ms-cameras) e `add_unmapped_camera_name` (ms-video-analytics)
aplicadas, e nenhum container parado. O `NEURAL_LPR_ENABLED` segue desligado no servidor.


## Atualização - 26/09, noite

A [#4889](https://github.com/atmanadmin/attlas-2026/pull/4889), task 32, entrou a pedido do dono: a sidebar
do incidente passa a mostrar a imagem que o app ATSPM capturou em cada ocorrência e a gravação que a câmera
fez no SD, lidas do equipamento na hora em que o incidente é aberto. No mesmo dia o dono relatou que o
dev.v2 não mostrava incidente nenhum, e a causa entrou na mesma PR: o ATSPM 0.10.2 manda o incidente por
objeto, em `obj_incidents`, e o consumidor do stream só lia `region_incidents`, que chega vazio. A última
linha de incidente real no dev.v2 era de 04/09.

Antes do merge, a própria PR recebeu review publicada no GitHub, com 23 pontos e três impeditivos (contrato
que importava outro contrato, atômica em rascunho divergindo do código e seis comentários que não se
sustentavam), todos corrigidos e com as threads respondidas e resolvidas. A develop conflitou só no
interceptor de timeout do front, onde a regra do vínculo do analítico tinha entrado no mesmo ponto; as duas
ficaram. Mergeada às 19h07, com a branch e a worktree apagadas. A semana passa a ter 32 tasks e 142 pts.

## Atualização - 26/09, noite

Três PRs do dono entraram na develop na tarde e na noite de 26/09. Horários de Brasília.

- **Lentidão do dev.v2** ([#4862](https://github.com/atmanadmin/attlas-2026/pull/4862), mergeada às 15:38 e no ar no deploy das 15:40). O
  nginx do host segurava o stream de alarmes em buffer e, em HTTPS, só entregava blocos de 16 KiB. O
  heartbeat não chegava, o front reconectava a cada 92 s e baixava o snapshot de novo. O Kong passou a
  devolver `X-Accel-Buffering: no` nas duas rotas de stream, e o nginx do host ganhou HTTP/2. O ranking
  de lentidão de todos os serviços está em
  [[Diagnóstico - Lentidão do dev.v2 por serviço e endpoint (26-09-2026)]].
- **Neural Labs sem tela própria, placa ACOM no detector e Sincronizar na linha** ([#4887](https://github.com/atmanadmin/attlas-2026/pull/4887),
  mergeada às 18:45). Sai do front a tela Analítico, Neural Labs e o switch do analítico servidor no
  cadastro e na edição da câmera, porque a Neural Labs é serviço externo e o vínculo e as regras vão
  para a tela de Instâncias. A placa ACOM da Detecção vira uma linha pequena de leitura dentro do campo
  Detector. O Sincronizar entra no menu da linha de Instâncias, online ou offline.
- **Cache da topologia e a instância offline** ([#4891](https://github.com/atmanadmin/attlas-2026/pull/4891), mergeada às 18:50). O
  `ms-cameras` guarda a árvore do `ms-traffic-model` em Redis por 300 s, com o Sistema e o usuário na
  chave. O Sincronizar reinicia o app do analítico que não responde antes de ler e gravar, e a remoção
  da instância órfã deixou de responder 404. Detalhe na task 30,
  [[S34-30 - Analítico - Instâncias - Instâncias ligadas ao backend, descoberta na rede e vínculo do source_id]].

A #4887 tinha pedido de mudança do Hadson (5 threads) e a aprovação do danielGuerra, e a #4891 pedido de
mudança do danielGuerra (19 threads). Todas foram respondidas e resolvidas, com uma recusa explicada: o
texto "Sem placa ACOM vinculada" não voltou, porque sem placa a linha simplesmente não aparece. As duas
foram mergeadas por ordem do dono e não tinham ido para o dev.v2 até 19:15.

## Atualização - 27/09, madrugada

A lentidão do dev.v2, que o dono descreveu como "o sistema inteiro, até a navegação", não era o Kong nem a
CPU. Medido na noite de 26/09: o Kong gasta de 1 a 13 ms por requisição, e a instância está em `unlimited`,
confirmado pelo Zanini. O tempo se perde no caminho até o Brasil (150 a 290 ms por ida e volta) e no front
repetindo trabalho. O diagnóstico completo, com os números, está em
[[Diagnóstico - Lentidão do dev.v2 por serviço e endpoint (26-09-2026)]], e o Hadson chegou à mesma
leitura por outro caminho, no doc dele.

- **Correção de código** ([#4909](https://github.com/atmanadmin/attlas-2026/pull/4909), aberta às 22:50 de
  26/09, CI verde, sem task). Entraram:
    - o canal de alarmes com graça de 5 s na troca de módulo, que antes rebaixava 1,78 MB a cada troca;
    - gzip de JSON no Kong;
    - o preload por perfil, que estava morto em 17 de 25 módulos;
    - o sino relendo só a contagem com o painel fechado;
    - os serviços de Métricas presos à página, que deixavam o WebSocket do analítico aberto em qualquer tela;
    - o socket do videowall fechando no logout;
    - a corrida de inscrição do painel no `ms-cameras`;
    - o deploy só por disparo manual.
- **Ajustes no host do EC2** (27/09, a pedido do dono):
    - `tcp_slow_start_after_idle=0` e BBR em `/etc/sysctl.d/99-attlas-edge.conf`. O `main.js` de 121 KB
      depois de 3 s de conexão parada caiu de 815 ms para cerca de 270 ms, o mesmo tempo da conexão quente.
    - Encerradas as 4 sessões `redis-cli monitor` abertas havia 55 dias no `attlas-redis-cameras`, as 2
      `PSUBSCRIBE` que a investigação deixou e 2 loops de build esquecidos desde 18/09.
    - O `INTERNAL_SERVICE_TOKEN` do `ms-communication-channels` já estava corrigido desde as 21:19 de
      26/09, ver [[Registro - deriva do env do dev.v2 e deploy quebrado em 26 de setembro]].
- **Pendências que o dono pediu na mesma PR, já nela:**
    - leituras de configuração do `ms-controllers` respondendo do espelho e relendo o campo por trás
      (MOD-063 §3.5);
    - i18n compilado sob demanda;
    - um socket de status por câmera;
    - timer de 1 ms do kafkajs;
    - prisma sem `npx` no boot;
    - healthchecks espaçados.
- **Ficam para depois:**
    - a primeira leva vazia do Painel de Operações, cuja causa não aparece no código e precisa ser
      reproduzida na tela;
    - o shutdown acima de 10 s em quatro serviços, porque falta medir o hook que trava;
    - os outros consumidores do namespace de status;
    - as salas do analítico.
- **Resultado medido depois do deploy** (00:11 de 27/09): respostas grandes da API de 12 a 14 vezes menores, resposta de 215 KB numa conexão parada de 1,1 s para 0,18 s, tela de controlador depois do primeiro minuto de 2,3 s para 37 ms, e serviço parado de 0,07 para 0,01 vCPU. O detalhe está em [[Registro - antes e depois da correção de lentidão do dev.v2 (27-09-2026)]].
- **Conferido e mantido:** o `snapshot.items` do `ms-alarms` é contrato do MOD-006, e o ganho ali é o
  front consumi-lo. Os outros serviços de módulo lazy apontados na auditoria limpam do jeito certo.
