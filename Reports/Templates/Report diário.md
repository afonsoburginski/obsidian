---
tags:
  - template
---

# Report diário - {{date:DD/MM/YYYY}}

Salvar o arquivo do dia como `Reports/{{date:YYYY-MM-DD}}.md` com frontmatter `tags: [report]` e `date`. O conteúdo vai dentro do code block, texto puro pronto para colar no Slack. **Nada fora do bloco** além do frontmatter e do título.

## Regras

- Sem ícones, emoji, em-dash (`—`) ou link markdown. Hífen e vírgula resolvem.
- Não citar ID de spec interna (`UC-*`, `PROJ-*`, `UF-*`, `MOD-*`) no corpo. Só `SOFTWARE-*` / `CROSS-*` / `#NN` quando for indispensável.
- Português formal e técnico, primeira pessoa. Sem gíria ("o grosso", "pra", "fechar o fix").
- Não citar processo de gestão (replanejamento de sprint, troca de prioridade, item que voltou ao backlog).
- Escopo é o dia inteiro, não só o que foi colado no rascunho. Puxar de `git log --all --since` (autor afonso) e do `gh`.
- Status de PR vem do `gh`, nunca da memória, e filtrado pela data exata do dia: `mergedAt[0:10]` para merge, `submitted_at` do review para revisão. `updatedAt` não prova nada.
- **Número de PR aparece uma vez só**, na intro, e só quando o dia inteiro está numa PR única ("Tudo concentrado na #NNNN").

## Estrutura

Intro curta (`Resumo:`), tópicos nomeados com bullets, e as três contagens fechando. **As contagens são nuas**: listar as PRs uma a uma, com número e título, deixa o report longo demais e não é o que se lê.

```
Report Diário - {{date:DD/MM/YYYY}}

Resumo:
Uma a duas frases: foco do dia e o que foi entregue. Sem narrativa.

<Tema do tópico>:
- <O que fiz>, <causa concreta>: <efeito>.

<Outro tema>:
- <...>

Pendências:
- <O que está quebrado ou faltando, e o que exige para resolver.>

PRs mergeadas: N
PRs revisadas: N
PRs em andamento: N
```

## Densidade

**O report é um resumo pequeno para o gerente ler e entender.** O bloco inteiro cabe em cerca de 1,5 KB: três ou quatro tópicos, um ou dois bullets cada, **no máximo 6 bullets no dia inteiro**. Detalhe fino de implementação fica na nota da sprint, nunca aqui.

O filtro é utilidade para quem lê, não completude do dia: **achado que não muda decisão de ninguém não entra**. Dia leve (majoritariamente review, sem código) corta os tópicos e entrega só o resumo mais as contagens.

## Bullets

Um fato concluído por bullet, verbo de ação no passado, variando o verbo (corrigi, adicionei, movi, unifiquei, padronizei, passei a). Uma frase, com o defeito e a correção. O teste: **o user consegue responder um follow-up do gestor amanhã só com o que está escrito?**

- Bom: "Corrigi a reconexão do WebSocket no frontend: três serviços congelavam o token no boot, e a primeira reconexão após a expiração era recusada para sempre."
- Ruim: "Corrigi a reconexão do WebSocket." (não explica nada)
- Ruim: "Front: token do socket." (rótulo com substantivo solto)

**Cortar o que é condescendente ou dispensável.** Causa concreta fica; o resto sai:

- Racional de design e justificativa do óbvio.
- Opinião e avaliação ("está correto, mas confunde na tela").
- Sugestão de processo ("vale um card próprio").
- Detalhe de implementação do conserto, nome de arquivo, classe ou constante.
- Aposto explicativo ("o MediaMTX, que é a fonte real de espectadores") -> citar e seguir.

Exemplo canônico para espelhar: `2026-09-17.md`.
