---
tags:
  - doc
  - attlas
  - processo
  - escrita
aliases:
  - "Convenções de escrita"
  - "Como escrever"
atualizado: 2026-07-31
---

# Convenções de escrita

Fonte de verdade de **como escrever** no contexto Attlas: report diário, descrição e título de PR,
comentário de review, e documento de público misto. Saiu da memória do Claude em 31/07/2026 e passou a
morar aqui, porque é conhecimento de projeto e precisa ser lido, revisado e corrigido como qualquer outra
nota, em vez de ficar invisível num arquivo de memória.

O formato do report diário não está repetido aqui: ele vive em [[Report diário]], que é o template mais
completo e mais recente. Esta nota cobre o resto e as regras que valem para tudo.

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
- Nome de servidor em documento formal é o papel, não o apelido interno.

## Relacionado

- [[Report diário]], template e exemplos canônicos do report.
- [[Docs - índice raiz]], convenção de nome e frontmatter das notas deste vault.
