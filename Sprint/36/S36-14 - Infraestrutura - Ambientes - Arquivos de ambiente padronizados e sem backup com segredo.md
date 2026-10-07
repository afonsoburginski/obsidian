---
id: S36-14
tags:
  - attlas
  - task
  - sprint-36
  - infraestrutura
  - ambientes
titulo: "[Infra] Arquivos de ambiente padronizados por seção, com a explicação de cada variável no docs/ENV.md, e setup:env sem backup .bak"
frente: Ambientes
pr: "#5998, #6146"
status: "Em andamento. #5998 mergeada em 06/10 às 15h32; #6146 aberta em 07/10 às 09h16, sem review."
sprint: "[[Attlas - Sprint 36]]"
atualizado: 2026-10-07
---

# S36-14 - Infraestrutura - Ambientes - Arquivos de ambiente padronizados e sem backup com segredo

## O que estava errado

- Os `.env.example` dos microsserviços não seguiam a mesma estrutura e misturavam prosa com chave.
- Cada rodada do `setup:env` deixava uma cópia `.bak` com segredo real ao lado do `.env`. Havia cerca de
  200 arquivos `.env*.bak*` no checkout e nas worktrees locais, 104 na EC2 do dev.v2, e três backups
  versionados no repositório.

## O que as PRs entregaram

- **#5998**: os 27 `.env.example` passam a ter só cabeçalho de seção, chave e chave opcional comentada, nas
  mesmas seções e na mesma ordem. Cada serviço ganha um `docs/ENV.md` com padrão, unidade e finalidade de
  cada chave, e o gerador de microsserviço já cria o arquivo inicial.
- **#6146**: o `setup:env` deixa de gravar o `.bak` e os três backups versionados do `ms-execution-plans`
  saem do repositório. Os backups locais e os da EC2 foram apagados à parte, sem tocar em nenhum arquivo de
  ambiente ativo.

## Estado

A #5998 está mergeada. A #6146 está aberta.

## Relacionado

- [[Infraestrutura - Ambientes]]
