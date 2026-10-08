---
tags:
  - doc
  - cameras
  - cadastro
aliases:
  - "Câmeras - Cadastro"
  - "Cameras"
  - "00 - Cameras"
  - "Cameras - cadastro e ciclo de vida"
atualizado: 2026-10-07
banner: "database registry system"
---

# Câmeras - Cadastro

## Resumo

Cadastro e ciclo de vida da entidade `Camera` no domínio [[Câmeras]]: cadastro em lote com sondagem e
provisionamento no mesmo pedido, listagem com filtros, edição, os quatro estados, substituição de equipamento
com herança, remoção lógica, catálogo de marcas e modelos, validação de credenciais e as leituras em lote para
outros serviços. O backend está em `apps/ms-cameras/src/cameras/`, a tela em
`apps/web-attlas/src/app/modules/cameras/` e a regra de negócio em `docs/modules/cameras.md`.

## Notas

| Nota | Abra quando |
| --- | --- |
| [[Câmeras - Cadastro - Arquitetura e estratégias]] | precisa saber onde mora cada peça, as rotas, os tópicos, as tabelas, a máquina de estados, como o provisionamento e a substituição funcionam, ou uma armadilha conhecida |
| [[Câmeras - Cadastro - Fluxos]] | precisa do passo a passo de um caso de uso (cadastro, edição, estado, substituição, remoção, validação de credenciais, perfis de mídia, leituras em lote, vínculo com interseção) ou das telas |
| [[Câmeras - Cadastro - Requisitos e SLA]] | precisa de uma regra, um limite, uma variável de ambiente, uma métrica, um código de erro ou de saber o que o requisito do cliente já cobre |

## Explicações para usuário

| Explicação | Abra quando |
| --- | --- |
| [[Câmeras - Cadastro - Explicação - Estados de cadastro]] | alguém pergunta o que significam Em estoque, Em testes, Em campo e Operativa |

## Diagramas

| Desenho | O que mostra |
| --- | --- |
| [[Câmeras - Cadastro - Diagrama.excalidraw\|Cadastro]] | Cadastro e ciclo de vida; vale o código, depois a nota |
