---
tags:
  - doc
  - attlas
  - processo
  - escrita
aliases:
  - "Convenções de escrita"
  - "Como escrever"
  - "Plano - atualização da documentação do vault"
atualizado: 2026-10-07
---

# Processo - Convenções de escrita

Volta para [[Processo]].

## Resumo

| Texto | Regra principal | Seção |
| --- | --- | --- |
| Nota do vault | esqueleto fixo: Resumo primeiro, seções da faceta na ordem, Glossário no fim; só a verdade atual | [[#Estrutura de toda nota]] |
| Qualquer texto | sem travessão, en-dash, seta e `§`; prosa de dev sênior, sem gíria e sem sigla de spec | [[#Regras que valem para todo texto]] |
| Descrição de PR | link da task, um parágrafo de intenção e o test plan | [[#Descrição de PR]] |
| Título de PR | o nome da task, com o tipo pela natureza do trabalho | [[#Título de PR e assignee]] |
| Review | frase curta de pessoa numa thread, sem formato de ferramenta | [[#Comentário e corpo de review]] |
| Documento para chefe ou time | público misto, sem nada do processo de desenvolvimento | [[#Documento de público misto (infra, capacidade, apresentação)]] |

Fonte de verdade de **como escrever** no contexto Attlas: descrição e título de PR,
comentário de review, documento de público misto e as próprias notas deste vault.

## Notas do vault

- **Só a verdade atual.** `Docs/` guarda o estado de hoje: arquitetura, contratos, fluxos, requisitos,
  regras, armadilhas conhecidas, pendências e runbooks. Decisão superada, registro datado, plano já
  executado, incidente encerrado e pesquisa concluída não ficam como nota: o que ainda vale entra na
  faceta certa (causa de incidente vira item de "Armadilhas conhecidas", conclusão de pesquisa vira o
  "por que assim" da arquitetura, plano não feito vira "Pendências"), e a nota vai para a lixeira com o
  nome dela em `aliases` de quem absorveu.
- **Presente do indicativo, sem história.** Nada de "Estado em DD/MM", "antes era X, agora é Y", "na
  rodada de", lista de PRs ou narrativa de investigação. Divergência atual entre regra e código entra
  curta, num callout `[!warning]`.
- **Um fato, uma nota.** As outras linkam para ela.
- **O código da `develop` vence a nota.** Nota que discorda do código é bug da nota.
- `Sprint/` e `Reports/` são registro do período e ficam como foram escritos.
- **Explicação para usuário fica na raiz do vault**, com nome
  `<Domínio> - <Subdomínio> - Explicação - <pergunta respondida>`, e o `index.md` do domínio linka para ela.
  Não repete a arquitetura: explica com exemplo o que a faceta descreve.
- **Nome e lugar de cada nota** seguem [[Processo - Convenção de nomes]].
- Data e hora no horário de Brasília. Merge do GitHub vem em UTC e cai no dia seguinte se não for convertido.

### Estrutura de toda nota

Toda nota de `Docs/` segue o mesmo esqueleto, para que a resposta esteja sempre no mesmo lugar:

1. Frontmatter (ver [[Processo - Convenção de nomes]]).
2. Título `# ` igual ao nome do arquivo.
3. Uma linha de navegação: `Volta para [[<caminho do domínio>]].` O `index.md` não tem essa linha.
4. `## Resumo`: a resposta direta ao assunto da nota, em até seis linhas ou numa tabela. Quem lê só o
   resumo sai sabendo o essencial.
5. As seções da faceta, na ordem da tabela abaixo.
6. `## Glossário` no fim, quando a nota usa termo técnico que não é óbvio: tabela `Termo | O que é`.

| Faceta | Seções, nesta ordem |
| --- | --- |
| `index.md` | Resumo (o que o domínio é, em duas ou três frases); Notas (tabela `Nota \| Abra quando`); Subdomínios, se houver; Explicações para usuário; Diagramas |
| Visão do produto | Resumo; O que faz; Para quem; Com o que se relaciona; Glossário |
| Arquitetura e estratégias | Resumo; Onde está no código (tabela `Caminho \| Papel`); Contratos (rotas, tópicos Kafka, tabelas do banco, cada um em tabela); Por que é assim; Armadilhas conhecidas |
| Fluxos | Resumo (tabela `Fluxo \| Gatilho \| Resultado`); uma seção por fluxo, sempre com Gatilho, Passos numerados, Resultado e Erros |
| Requisitos e SLA | Resumo; Regras (tabela `Regra \| Valor \| Onde no código`); Variáveis de ambiente (tabela `Variável \| Padrão \| Efeito`) |
| Frontend | Resumo; Telas (tabela `Tela \| Rota \| Componente \| O que mostra`); Comportamentos que não são óbvios |
| Pendências | Resumo; tabela `O que falta \| Por que importa \| Onde` |
| Runbook | Resumo (tabela `Pergunta \| Seção`); uma seção por pergunta ("Como sei se...", "Como faço..."), cada uma com o comando em bloco de código e a leitura do resultado logo abaixo |
| Tema | Resumo; seções próprias do assunto; Glossário |
| Explicação | Resumo em linguagem de usuário; a explicação passo a passo, com um exemplo concreto; sem caminho de código |

Regras de redação que valem dentro desse esqueleto:

- **Uma ideia por parágrafo**, de duas a quatro frases. Comparação, lista de valores e mapa de código vão em
  tabela, não em parágrafo.
- **Sem histórico no texto**: nada de número de PR, hash de commit, "desde 16/09" ou "saiu em". O que mudou
  e não vale mais simplesmente não aparece.
- **Sigla de spec do repositório** (`UC-*`, `MOD-*`, `INT-*`) só na coluna de código das tabelas, como
  ponteiro para achar a spec. No texto corrido, o nome da coisa.
- **Termo técnico explicado na primeira vez** que aparece na nota, em poucas palavras ou no glossário.
- **Link em vez de repetição**: o fato mora numa nota só, e as outras apontam para ela.
- Comando que o leitor vai copiar fica em bloco de código, com o placeholder entre `<>` e a credencial em
  variável (`$CRED`, `$TOKEN`), nunca o valor.

### Revisar uma nota contra o código

Quatro medidas, aplicadas contra `origin/develop`, para a revisão não virar achismo:

1. **Data da nota contra commits no código que ela descreve**: `git log --since=<atualizado>` restrito aos
   caminhos citados. Muito commit em caminho descrito pela nota quer dizer nota defasada.
2. **Referência morta**: todo caminho de repo citado entre crases precisa existir.
3. **Termo do código sem menção no vault**: rota, domínio ou campo que existe hoje e não aparece em nota
   nenhuma. É o sinal mais forte, porque indica assunto ausente, não só desatualizado.
4. **Pergunta fechada ao código, aceitando "não existe" como resposta**: "existe healthcheck do analítico?"
   vale mais que ler a nota antiga e presumir. Afirmação categórica de ausência pede uma segunda busca
   antes de virar premissa, porque grep que conclui cedo demais já produziu nota errada.

O `index.md` em dia não garante que as facetas da mesma pasta estejam: as duas coisas se conferem juntas, e
achado de incidente só vale quando entra na faceta de arquitetura do domínio.

## Regras que valem para todo texto

- **Sem símbolos de IA.** Nada de travessão, en-dash ou `§`. Hífen, vírgula e "exigido pelo contrato"
  resolvem. Emoji e ícone não entram em nenhum canal de trabalho.
- **Voz de dev sênior: formal, natural e tecnicamente correta.** É o meio entre dois erros que já foram
  cometidos e rejeitados: o texto cheio de emoji, seta e código de regra, e a correção que caiu na gíria
  ("ta aprovada", "pra", "dava pra"). O alvo é "está aprovada", "não impede o merge", "daria para usar os
  valores diretamente".
- **Português correto, prosa de verdade, não telegrama.** Frases com sujeito e verbo, pontuação certa.
  Não escrever fragmentos como "Base develop." ou "Reusa X." ou "Só docs.".
- **Não despejar sigla de spec interna.** `MOD-*`, `UC-*`, `INT-*`, `PROJ-*`, `UF-*` e `ATOM-*` ficam
  dentro das specs. O que se referencia para fora é a task do ClickUp (`SOFTWARE-*`) e o número da PR.
- **Sem aposto explicativo condescendente.** "O MediaMTX, que é a fonte real de espectadores" vira só
  "o MediaMTX".

## Descrição de PR

O corpo da PR é leitura de 30 segundos para alguém entender a intenção. Não é changelog, não é narrativa
do que foi descoberto durante a implementação.

**Estrutura mínima**: link da task, um parágrafo de intenção, dependências quando existirem, e um test
plan de uma linha.

- Link clicável da task: `**Tarefa:** [SOFTWARE-NNNN](url)`, com o texto do link sendo só o ID. Não pôr
  `[Back]` nem o nome do módulo dentro do texto do link, porque colchete aninhado quebra o markdown e o
  link desaparece.
- **PR de endpoint é a exceção que pede contrato documentado**: um bloco dedicado de endpoint num code
  fence, com método e caminho, query ou body, `→ 200 <Contrato>` e os erros 4xx, mais uma linha do shape
  da resposta e da paginação. Bloco dedicado, não inline na frase.
- **Não incluir**: item descoberto no teste ponta a ponta, bug colateral corrigido, decisão de bloqueador
  com prós e contras, "aprovado por dois reviewers", tabela de migrations, seção "Como funciona" em prosa,
  nota de validação ao vivo.
- **Não incluir o trailer de geração por Claude Code** no corpo da PR neste repo. O `Co-Authored-By` nos
  commits pode ficar.
- Trade-off não óbvio que o revisor precisa ver cabe em uma frase no parágrafo principal, nunca em seção
  própria.

## Título de PR e assignee

- **O título espelha o nome da task, sem inventar variação.** É o padrão: se a task é
  "[Back] Renome para VMS: fase 1, API e contratos", o título da PR é o tipo mais essa frase. Não
  descrever o conteúdo com outras palavras, não anunciar o recorte técnico que você escolheu, e
  principalmente **não rotular a PR como "spec" quando ela também leva implementação** - quem lê o
  board precisa reconhecer a task no título, e um rótulo de fase que não existe na task só confunde.
  Quando a PR muda de escopo no meio, atualize o título de volta para o nome da task, não para a nova
  descrição.
- **Título pela natureza do trabalho, nunca `docs:`.** Mesmo que a PR contenha só a spec em markdown, o
  tipo reflete o que a task entrega: feature nova é `feat:`, correção é `fix:`, renome é `refactor:`.
  Spec de uma feature é `feat:`.
- **Assignee sempre `afonsoburginski`**, via `gh api repos/atmanadmin/attlas-2026/issues/<N>/assignees`,
  porque o `gh pr edit` quebra neste repo.
- Base sempre `develop`, sem PR empilhada. "Base develop" não vai escrito no corpo, o GitHub já mostra.

## Comentário e corpo de review

Tem que soar como uma pessoa escreveu numa thread, não como relatório de ferramenta.

- Uma frase curta e direta. Se precisar de duas, são duas frases simples, não uma comprida com parênteses
  aninhados.
- Não citar spec a torto e direito. Fala do código em si; ID só se o revisor pediu ou se é indispensável
  para achar o contexto.
- Jeito certo: "Corrigido. O probe usa `video/H265` mesmo, que é o MIME certo do receiver HEVC no WebRTC.
  A spec é que estava errada, ajustei ela para bater com o código."
- **Vale para o corpo do review inteiro, com veredito, e não só para os comentários inline.** As skills de
  review geram formato com emoji, código de regra e `§`; esse formato não vai publicado. Reescrever em
  prosa: se aprovou, o que mudou e o ponto que importa. Achado vira "colocar X aqui faz Y", não
  "RB-36, arquivo, linha".

## Documento de público misto (infra, capacidade, apresentação)

Specs de infra e capacidade são lidas por gente técnica e por gente que tem noção mas não é dev. As duas
precisam entender.

- CPU em **vCPU** ("0,5 vCPU é meio núcleo"), nunca milicore no texto corrido. O `500m` aparece só no YAML
  de configuração, que é o valor que o dev copia.
- Caixa de unidades no topo do documento (vCPU, MB e GB, req/s, p95) antes de qualquer número.
- Traduzir jargão: "autoescalador" em vez de KEDA solto, "fila-morta" em vez de DLQ, "dois donos do mesmo
  dado" em vez de split-brain, "4 vCPU e 8 GB" em vez de "4c/8g".
- Sem analogia caseira. Explicação técnica direta com unidade clara.
- Documento enxuto: o mesmo fato importante não se repete em três seções.
- **Documento que vai para o chefe ou para o time (PDF, apresentação) não leva nada do processo de desenvolvimento**: número de PR, nome de branch, "ainda não está na develop", sigla de spec (`CROSS-*`, `UC-*`, `INT-*`, `UF-*`) e aviso de estado do código ficam no vault e no repositório. O documento explica o que o sistema faz, como usar e onde cada coisa aparece.
- **Formato do PDF corporativo**: curto, cerca de 4 páginas para explicar um fluxo como o da Neural Labs; bloco de título na primeira página no lugar de capa e sumário; seções numeradas em fluxo contínuo, sem forçar página nova por seção; tabelas que quebram entre linhas com cabeçalho repetido; cabeçalho e rodapé com "Página N de M", versão e data; no máximo dois diagramas e uma tela ilustrativa; linguagem impessoal e formal; referência técnica em anexo curto no fim. Número estimado vai rotulado como ilustrativo.
- Nome de servidor em documento formal é o papel, não o apelido interno.

## Relacionado

- [[Processo - Convenção de nomes]], nome, pasta e frontmatter das notas deste vault.
