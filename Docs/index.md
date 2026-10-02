---
tags:
  - doc
  - attlas
aliases:
  - "Docs - índice raiz"
atualizado: 2026-10-02
---

# Docs - índice raiz

Documentação técnica do Attlas neste vault, organizada por domínio. Cada pasta é um domínio ou subdomínio,
tem o seu `index.md` como porta de entrada, e o nome de toda nota começa pelo caminho do domínio. A regra
inteira está em [[Processo - Convenção de nomes]].

## Domínios

| Domínio | O que cobre | Subdomínios |
| --- | --- | --- |
| [[Câmeras]] | o módulo Câmeras (CCTV), servido inteiro pelo `ms-cameras` | [[Câmeras - Cadastro\|Cadastro]], [[Câmeras - Dashboard\|Dashboard]], [[Câmeras - Eventos, incidentes e alarmes\|Eventos, incidentes e alarmes]], [[Câmeras - Integração com dispositivo\|Integração com dispositivo]], [[Câmeras - PTZ e presets\|PTZ e presets]], [[Câmeras - Saúde e monitoramento\|Saúde e monitoramento]], [[Câmeras - Streaming\|Streaming]], [[Câmeras - Videowall\|Videowall]], [[Câmeras - VMS\|VMS]] |
| [[Analítico]] | laço virtual, ATSPM e leitura de placas, dependente de Câmeras mas não parte dela; roda no app embarcado da câmera ou no servidor da Neural Labs | [[Analítico - Neural Labs\|Neural Labs]] |
| [[Infraestrutura]] | CI self-hosted, ambientes dev.v2 e Dell, rede, observabilidade e acessos; Kubernetes mora no repositório `Developer/kubernetes` e no skill `attlas-kubernetes` | nenhum |
| [[Processo]] | como o trabalho é feito e contra o quê: convenções e o edital do cliente | nenhum |

Entrada rápida no Analítico: [[Analítico - Visão do produto]]. O `web-attlas` não tem domínio próprio: cada
tela fica no subdomínio de backend que ela serve.

## Explicações para usuário (raiz do vault)

- [[Câmeras - Cadastro - Explicação - Estados de cadastro]] - os quatro estados da câmera e quem decide cada
  transição.
- [[Câmeras - Dashboard - Explicação - Como cada número é calculado]] - de onde sai cada indicador do
  dashboard.
- [[Câmeras - Videowall - Explicação - Vídeo não chega ao painel H9]] - o diagnóstico do H9 de Quito e o que
  falta para o vídeo aparecer.
- [[Analítico - Neural Labs - Explicação - Como cada leitura chega na câmera certa]] - o caminho de uma
  leitura de placa, com exemplo.

## Planejamento

- [[Sprints - índice raiz]] - planejamento semanal do squad 2. Cada sprint é um `index.md` com o que a
  semana entrega, e alias `Attlas - Sprint NN`. **É aqui que se planeja**: o ClickUp é publicação, não
  fonte.
- [[Reports diários]] - o report de cada dia útil. É registro do dia, não fonte de verdade.

## Fontes de verdade

- Nome e lugar de cada nota: [[Processo - Convenção de nomes]].
- Estilo de escrita: [[Processo - Convenções de escrita]].
- Requisito do cliente: [[Processo - Edital do cliente]], que não se edita.
- Comportamento do sistema: o código da `develop`, que vence qualquer nota.
