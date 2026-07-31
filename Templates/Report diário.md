---
tags:
  - template
---

# Report diário - {{date:DD/MM/YYYY}}

Salvar o arquivo do dia como `Reports/{{date:YYYY-MM-DD}}.md` com frontmatter `tags: [report]` e `date`. O conteúdo vai dentro do code block, texto puro pronto para colar no Slack.

## Regras

- Sem ícones, emoji, em-dash (`—`) ou link markdown. Hífen e vírgula resolvem.
- Não citar ID de spec interna (`UC-*`, `PROJ-*`, `UF-*`, `MOD-*`) no corpo. Só `SOFTWARE-*` / `CROSS-*` / `#NN` no header do tópico.
- Português formal e técnico, primeira pessoa. Sem gíria ("o grosso", "pra", "fechar o fix").
- Não citar processo de gestão (replanejamento de sprint, troca de prioridade, item que voltou ao backlog).
- Escopo é o dia inteiro, não só o que foi colado no rascunho. Puxar de `git log --all --since` (autor afonso) e do `gh`.
- Status de PR vem do `gh`, nunca da memória, e filtrado pela data exata do dia: `mergedAt[0:10]` para merge, `submitted_at` do review para revisão. `updatedAt` não prova nada.
- **Número de PR aparece uma vez só.** Só pôr `#NN` no header do tópico quando os tópicos são PRs **diferentes**. Se o dia inteiro está numa PR única, citar ela na intro ("Tudo concentrado na #NNNN") e deixar os headers apenas com o tema, senão o mesmo número repetido em vários headers mais a lista final se lê como se fossem várias PRs em andamento. A lista `PRs em andamento` é a contagem real.

## Bullets

Um fato concluído por bullet, verbo de ação no passado, variando o verbo (corrigi, adicionei, movi, unifiquei, padronizei, passei a). O teste: **o user consegue responder um follow-up do gestor amanhã só com o que está escrito?** Então o bullet carrega o que foi feito e a causa concreta, em 1 ou 2 linhas, sem jargão de arquivo ou classe.

- Bom: "Corrigi a reconexão do WebSocket no frontend: três serviços congelavam o token no boot, e a primeira reconexão após a expiração era recusada para sempre."
- Ruim: "Corrigi a reconexão do WebSocket." (não explica nada)
- Ruim: "Front: token do socket." (rótulo com substantivo solto)

**Cortar o que é condescendente ou dispensável.** Causa concreta fica; o resto sai:

- Racional de design ("o selo só tinha espaço para o percentual, então as contagens não tinham onde aparecer") -> só o que foi feito.
- Justificativa do óbvio ("já que os filtros agem sobre a tabela e não sobre os cards").
- Opinião e avaliação ("o comportamento está correto, mas confunde na tela", "destoava das demais colunas").
- Sugestão de processo ("vale um card próprio", "não escalar antes disso").
- Detalhe de implementação do conserto ("reaproveitando a implementação que já funcionava no worker").
- Aposto explicativo ("o MediaMTX, que é a fonte real de espectadores") -> citar e seguir.

## Densidade

Dia com entrega real de código leva tópicos com bullets. **Dia leve** (majoritariamente review, sem código) corta os tópicos e entrega só a intro mais as listas de PRs. Trabalho que foi apenas spec e abertura de PR colapsa num tópico único, um bullet por PR.

```
Report Diário - {{date:DD/MM/YYYY}}

Intro de 1 a 2 frases: foco do dia e o que foi entregue. Formal, sem narrativa. Se o dia todo foi numa PR única, dizer aqui ("Tudo concentrado na #NNNN") e omitir o número dos headers abaixo.

<Tema do tópico>:
- <O que fiz>, <causa em termos simples>: <efeito>.
- <...>

<Outro tema>:
- <...>

Débitos técnicos identificados (a tratar):
- <O que está quebrado ou faltando>, <por que>, <o que exige para resolver>.

PRs mergeadas:
- `NNN - <título> (SOFTWARE-XXXX)`

PRs revisadas:
- `NNN - <título curto do que foi revisado>`

PRs em andamento:
- `NNN - <título> (SOFTWARE-XXXX)`
```

Exemplos canônicos para espelhar: `2026-07-30.md` (dia com código e débitos), `2026-07-28.md` (várias frentes), `2026-07-27.md` (dia de validação e review).
