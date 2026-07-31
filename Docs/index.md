---
tags:
  - doc
  - attlas
aliases:
  - "Docs - índice raiz"
atualizado: 2026-07-31
---

# Docs - índice raiz

Documentação técnica do Attlas neste vault. Cada pasta tem o seu `index.md`, no estilo `index` de
programação: é a porta de entrada do assunto e não repete o conteúdo das notas filhas.

## Domínios

- [[ms-cameras]] - o serviço de câmeras inteiro: cadastro, saúde, status em tempo real, streaming, PTZ, eventos, VMS e o videowall externo.
- [[Kubernetes e infra]] - cluster, chart Helm, Terraform, KEDA e o que vive no repo `Developer/kubernetes`.
- [[Server e CI]] - acessos SSH e observabilidade do CI.

## Fontes e processo

- [[Convenções de escrita]] - como escrever report, PR, comentário de review e documento de público misto. **Fonte de verdade de estilo**, saiu da memória do Claude em 31/07.
- [[Edital - Attlas nova definição de módulos]] - o edital do cliente. **Fonte de verdade de requisito**, não se edita.
- [[Plano - atualização da documentação do vault]] - o que está defasado, com evidência, e em que ordem consertar. Camada de higiene e lote 0 feitos; lotes 1 a 9 em aberto.

## Convenção

| Papel | Nome do arquivo |
| --- | --- |
| Índice da pasta | `index.md` (H1 = nome do assunto, alias com o nome do assunto) |
| Faceta do assunto | `<Assunto> - Arquitetura e estratégias` · `- Fluxos` · `- Requisitos e SLA` |
| Registro histórico | `Incidente - <assunto>` · `Plano - <assunto>` · `Pesquisa - <assunto>` · `Runbook - <assunto>` |

Frontmatter obrigatório: `tags` em lista YAML (`doc` mais domínio mais assunto) e `atualizado` com a data
da última revisão de **conteúdo**. Prosa sem travessão e sem `§`.
