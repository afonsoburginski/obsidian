---
tags:
  - doc
  - analitico
  - neural-labs
aliases:
  - "Analítico - Neural Labs"
  - "Neural Labs"
  - "Neural Labs - Índice"
atualizado: 2026-10-06
---

# Analítico - Neural Labs

A Neural Labs fornece o NEURAL SERVER, o servidor de leitura de placas (LPR) instalado no cliente, que
manda cada leitura ao Attlas por TCP. No [[Analítico]] ele é o analítico servidor em operação: as
leituras alimentam o tempo de viagem dos Trajetos e a capacidade LPR das câmeras. As notas de integração
descrevem o que o Attlas faz; as de referência transcrevem a documentação do fornecedor, que não se
confere no nosso código.

## Notas deste domínio

Integração no Attlas:

- [[Analítico - Neural Labs - Arquitetura e estratégias]]: ingestão, regras do dado, rotas, como ligar um servidor
  de verdade e pendências.
- [[Analítico - Neural Labs - Vínculo de câmeras]]: associação e vínculo de cada câmera, como a Neural Labs
  identifica câmeras, rotas e o que perguntar ao fornecedor.
- [[Analítico - Neural Labs - Tempo de viagem]]: a regra do cálculo e onde o Attlas diverge do documento dos
  gestores.
- [[Analítico - Neural Labs - Documento dos gestores sobre tempo de recorrido]]: o documento dos gestores, em espanhol.
- [[Analítico - Neural Labs - Explicação - Como cada leitura chega na câmera certa]]: explicação com exemplo, para usuário.
- [[Analítico - Neural Labs - Explicação - Como cadastrar a Neural Labs]]: onde e quando aparece o cadastro, o que preencher e como
  saber que funcionou, para usuário.

Referência do fornecedor:

- [[Analítico - Neural Labs - Produtos e documentação]]: produtos, documentos recebidos e públicos, canais de
  integração.
- [[Analítico - Neural Labs - Configuração de câmera no NEURAL SERVER]]: instalação, `ComputerID`, cadastro da
  câmera e integração com VMS.
- [[Analítico - Neural Labs - Envio XML do NEURAL SERVER]]: quadro `NEURAL`, campos do `<infoplate>`, XML curto e
  triggers.
- [[Analítico - Neural Labs - Banco de dados do NEURAL SERVER]]: tabelas do SQL Server.
- [[Analítico - Neural Labs - API Web do NS Backend]]: as rotas da Neural Platform.
- [[Analítico - Neural Labs - Heartbeat e eventos do Orchestrator]]: estado das câmeras e eventos do Orchestrator.
