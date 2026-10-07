---
id: S35-31
tags:
  - attlas
  - task
  - sprint-35
  - infraestrutura
  - ci
titulo: "[Infra] Pipeline de CI/CD por serviço"
frente: CI
pr: "#5666"
status: "Aberta. #5666 aberta em 01/10 às 22h50, em rascunho e com pedido de mudança de DanielZanotelliAtman."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-31 - Infraestrutura - CI - Plano da pipeline de CI e CD por serviço

## O que estava errado

Quase todo merge na `develop` gera e envia cerca de 21 imagens Docker, e o deploy em dev é disparado à mão
e sobe todos os serviços. Lint e build saem do cache remoto em cerca de 0,3 minuto; o tempo vai no
`docker build`, no teste de subida e no envio das imagens. As causas, medidas entre 25/09 e 02/10:

- a lib de contratos é um projeto só, todos os apps dependem dela, e ela muda em 57 de cada 100 merges;
- todo backend carrega o catálogo de tradução inteiro, então uma linha de tradução afeta todas as imagens;
- `package-lock.json`, `tsconfig.base.json` e qualquer `project.json` tornam os 41 projetos afetados;
- o deploy foi disparado 60 vezes em 7 dias, por 11 pessoas, usa a tag `:dev`, não consulta o
  `/health/ready` e não tem como voltar à versão anterior.

## O que a PR entrega

Só documentação: a spec da pipeline por serviço, com o plano de correção em fases. Nenhum workflow muda.

## Estado

Aberta, em rascunho, com pedido de mudança.

## Relacionado

- [[Infraestrutura - CI e runners]]
