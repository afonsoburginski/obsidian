---
tags:
  - doc
  - attlas
aliases:
  - "Docs - índice raiz"
atualizado: 2026-08-25
---

# Docs - índice raiz

Documentação técnica do Attlas neste vault. Cada pasta tem o seu `index.md`, no estilo `index` de
programação: é a porta de entrada do assunto e não repete o conteúdo das notas filhas.

## Domínios

- [[ms-cameras]] - o serviço de câmeras inteiro: cadastro, saúde, status em tempo real, streaming, PTZ, eventos, VMS e o videowall externo.
- [[Analítico]] - módulo de Virtual Loop e ATSPM, dependente de Câmeras mas não parte dela. Hoje quase todo planejamento, com o caminho embarcado provisoriamente dentro do ms-cameras.
  Entrada rápida: [[Analítico - Visão do produto]] (o módulo por inteiro em uma nota).
- [[Server e CI]] - acessos SSH e observabilidade do CI.

## Planejamento

- [[Sprints - índice raiz]] - planejamento semanal do squad 2. Cada sprint tem `index.md` com o que
  aquela semana entrega em feature e em tela, e a nota `Attlas - Sprint NN` com o planejamento
  detalhado. **É aqui que se planeja** - o ClickUp é publicação, não fonte.

## Fontes e processo

- [[Convenções de escrita]] - como escrever report, PR, comentário de review e documento de público misto. **Fonte de verdade de estilo**, saiu da memória do Claude em 31/07.
- [[Edital - Attlas nova definição de módulos]] - o edital do cliente. **Fonte de verdade de requisito**, não se edita.
- [[Plano - atualização da documentação do vault]] - o que está defasado, com evidência, e em que ordem consertar.

## Convenção

| Papel | Nome do arquivo |
| --- | --- |
| Índice da pasta | `index.md` (H1 = nome do assunto, alias com o nome do assunto) |
| Faceta do assunto | `<Assunto> - Arquitetura e estratégias` · `- Fluxos` · `- Requisitos e SLA` |
| Registro histórico | `Incidente - <assunto>` · `Plano - <assunto>` · `Pesquisa - <assunto>` · `Runbook - <assunto>` |

Frontmatter obrigatório: `tags` em lista YAML (`doc` mais domínio mais assunto) e `atualizado` com a data
da última revisão de **conteúdo**. Prosa sem travessão e sem `§`.

> [!info] Domínio Kubernetes removido em 24/08
> A pedido do user, o domínio Kubernetes (índice + 8 notas de faceta) saiu deste vault - foi para a
> trash do MCP (recuperável), não deletado a fio. O repo `Developer/kubernetes` continua sendo a fonte
> de verdade de infraestrutura fora deste vault; se precisar de novo, ver o skill `attlas-kubernetes`
> do Claude Code em vez de reescrever a nota aqui.
