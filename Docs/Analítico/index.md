---
tags:
  - doc
  - analitico
aliases:
  - "Analítico"
  - "Analítico de vídeo"
  - "VL e ATSPM"
atualizado: 2026-10-07
---

# Analítico

## Resumo

Módulo próprio do edital (seção 4.6) que transforma o vídeo das câmeras em dado de tráfego: laço virtual, detecção
automática de incidentes (DAI), métricas de desempenho semafórico (ATSPM) e, pela Neural Labs, leitura de placas para
tempo de viagem. O processamento roda fora do Attlas, no app embarcado da Atman dentro da câmera Axis ou no servidor
de placas da Neural Labs; o Attlas configura, recebe, guarda e mostra. A regra de negócio do repositório está em
`docs/modules/analitico.md`.

## Notas

| Nota | Abra quando |
| --- | --- |
| [[Analítico - Visão do produto]] | Precisa do módulo por inteiro: capacidades, as duas famílias (embarcado e servidor), a matriz de compatibilidade e com o que o módulo se relaciona |
| [[Analítico - Arquitetura e estratégias]] | Precisa saber onde mora cada peça no código, os builds do app embarcado, rotas, tópicos, eventos de socket, tabelas e as armadilhas |
| [[Analítico - Fluxos]] | Precisa da ordem dos passos: pôr uma câmera para funcionar, tela ao vivo, incidente, ocupação até o detector, métricas e vínculo região-detector |
| [[Analítico - Requisitos e SLA]] | Precisa de um limite, de um prazo, de uma variável de ambiente ou do estado de um requisito do edital |
| [[Analítico - Frontend]] | Vai mexer nas quatro abas do `web-attlas` ou igualar uma tela ao `attlas-design` |
| [[Analítico - Pendências]] | Quer saber o que falta para o módulo fechar |
| [[Analítico - Runbook - Embarcado]] | Precisa conferir ou reprovisionar o app dentro da câmera, ou consultar a bancada |
| [[Analítico - Vínculo com a ACOM]] | Vai mexer na placa ACOM como transporte do laço virtual até o controlador |

## Subdomínios

| Subdomínio | Abra quando |
| --- | --- |
| [[Analítico - Neural Labs]] | Vai mexer na integração com o servidor de placas da Neural Labs ou consultar a documentação do fornecedor |

## Explicações para usuário

| Nota | Abra quando |
| --- | --- |
| [[Analítico - Neural Labs - Explicação - Como cadastrar a Neural Labs]] | Precisa explicar onde e quando aparece o cadastro da Neural Labs, o que preencher e como saber que funcionou |
| [[Analítico - Neural Labs - Explicação - Como cada leitura chega na câmera certa]] | Precisa explicar, com exemplo, como uma leitura de placa encontra a câmera do Attlas |
