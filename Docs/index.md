---
tags:
  - doc
  - attlas
aliases:
  - "Docs - índice raiz"
atualizado: 2026-10-01
---

# Docs - índice raiz

Documentação técnica do Attlas neste vault. Cada pasta tem o seu `index.md`, no estilo `index` de
programação: é a porta de entrada do assunto e não repete o conteúdo das notas filhas.

## Domínios

- [[ms-cameras]] - o serviço de câmeras inteiro: cadastro, saúde, status em tempo real, streaming, PTZ,
  eventos, VMS e o videowall externo.
- [[Analítico]] - módulo de laço virtual, ATSPM e leitura de placas, dependente de Câmeras mas não parte
  dela. O processamento roda no app embarcado da câmera ou no servidor da Neural Labs. Entrada rápida:
  [[Analítico - Visão do produto]].
- [[Server e CI]] - CI self-hosted, ambientes dev.v2 e Dell, rede, observabilidade e acessos.
  Kubernetes não mora aqui: a fonte é o repositório `Developer/kubernetes` e o skill `attlas-kubernetes`.

O `web-attlas` não tem domínio próprio: cada tela fica no domínio de backend que ela serve, como o VMS e o
videowall dentro de [[ms-cameras]].

## Explicações para usuário (raiz do vault)

- [[Câmeras - Estados de cadastro]] - os quatro estados da câmera e quem decide cada transição.
- [[Dashboard de câmeras - Como cada número é calculado]] - de onde sai cada indicador do dashboard.
- [[Neural Labs - Como cada leitura chega na câmera certa]] - o caminho de uma leitura de placa, com exemplo.
- [[Videowall H9 - vídeo não chega ao painel]] - o diagnóstico do H9 de Quito e o que falta para o vídeo
  aparecer.

## Planejamento

- [[Sprints - índice raiz]] - planejamento semanal do squad 2. Cada sprint é um `index.md` com o que a
  semana entrega, e alias `Attlas - Sprint NN`. **É aqui que se planeja**: o ClickUp é publicação, não
  fonte.
- [[Reports diários]] - o report de cada dia útil. É registro do dia, não fonte de verdade.

## Fontes e processo

- [[Convenções de escrita]] - como escrever PR, comentário de review, documento de público misto e as
  notas deste vault, inclusive como revisar uma nota contra o código. **Fonte de verdade de estilo.**
- [[Edital - Attlas nova definição de módulos]] - o edital do cliente. **Fonte de verdade de requisito**,
  não se edita.

## Convenção de nomes

| Papel | Nome do arquivo |
| --- | --- |
| Índice da pasta | `index.md` (H1 = nome do assunto, alias com o nome do assunto) |
| Faceta do assunto | `<Assunto> - Arquitetura e estratégias` · `- Fluxos` · `- Requisitos e SLA`, mais uma temática quando o assunto pedir |
| Runbook | `Runbook - <assunto>` |
| Explicação para usuário | `<Assunto> - <pergunta respondida>`, na raiz do vault |

Frontmatter obrigatório: `tags` em lista YAML (`doc` mais domínio mais assunto) e `atualizado` com a data
da última revisão de **conteúdo**. Prosa sem travessão e sem `§`. Registro datado, plano executado e
incidente encerrado não viram nota: o que ainda vale entra na faceta certa (ver [[Convenções de escrita]]).
