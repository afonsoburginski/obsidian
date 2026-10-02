---
tags:
  - doc
  - analitico
aliases:
  - "Analítico"
  - "Analítico de vídeo"
  - "VL e ATSPM"
atualizado: 2026-10-01
---

# Analítico

Módulo próprio do edital (seção 4.6) que transforma o vídeo das câmeras em dado de tráfego: laço
virtual, detecção automática de incidentes (DAI), métricas de desempenho semafórico (ATSPM) e, pela
Neural Labs, leitura de placas para tempo de viagem. O processamento roda fora do Attlas: no app
embarcado da Atman dentro da câmera Axis, ou no servidor de placas da Neural Labs. O Attlas configura,
recebe, guarda e mostra. Regra de negócio no repositório: `docs/modules/analitico.md`.

## Notas deste domínio

- [[Analítico - Visão do produto]]: o módulo por inteiro para quem chega, as duas famílias de
  analítico (embarcado e servidor), a matriz de compatibilidade e com o que o módulo se relaciona.
- [[Analítico - Arquitetura e estratégias]]: onde mora cada peça no código, builds do app embarcado,
  contratos, rotas, tópicos e eventos de socket, e as armadilhas conhecidas.
- [[Analítico - Fluxos]]: cadastro e vínculo do analítico, os caminhos do dado (tela ao vivo,
  incidente, ocupação, métricas) e o vínculo região-detector.
- [[Analítico - Requisitos e SLA]]: as regras de negócio e o estado de cada uma no código.
- [[Analítico - O que falta para fechar o módulo]]: pendências por recurso do edital.
- [[Analítico - Frontend]]: as quatro abas do módulo no `web-attlas` e a referência visual do
  `attlas-design`.
- [[Analítico - Vínculo com a ACOM]]: a placa ACOM como transporte do laço virtual até o controlador.
- [[Runbook - analítico embarcado]]: diagnosticar e reprovisionar o app na câmera, e a bancada.
- [[Neural Labs]]: a integração com o servidor de placas da Neural Labs e a documentação do
  fornecedor.
