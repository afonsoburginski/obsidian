---
tags:
  - doc
  - analitico
  - neural-labs
aliases:
  - "Neural Labs"
  - "Neural Labs - Índice"
atualizado: 2026-10-01
---

# Neural Labs

A Neural Labs fornece o NEURAL SERVER, o servidor de leitura de placas (LPR) instalado no cliente, que
manda cada leitura ao Attlas por TCP. No [[Analítico]] ele é o analítico servidor em operação: as
leituras alimentam o tempo de viagem dos Trajetos e a capacidade LPR das câmeras. As notas de integração
descrevem o que o Attlas faz; as de referência transcrevem a documentação do fornecedor, que não se
confere no nosso código.

## Notas deste domínio

Integração no Attlas:

- [[Neural Labs - Arquitetura e estratégias]]: ingestão, regras do dado, rotas, como ligar um servidor
  de verdade e pendências.
- [[Neural Labs - Vínculo de câmeras]]: associação e vínculo de cada câmera, como a Neural Labs
  identifica câmeras, rotas e o que perguntar ao fornecedor.
- [[Neural Labs - Tempo de viagem]]: a regra do cálculo e onde o Attlas diverge do documento dos
  gestores.
- [[Neural Labs - Documento dos gestores sobre tempo de recorrido]]: o documento dos gestores, em espanhol.
- [[Neural Labs - Como cada leitura chega na câmera certa]]: explicação com exemplo, para usuário.

Referência do fornecedor:

- [[Neural Labs - Produtos e documentação]]: produtos, documentos recebidos e públicos, canais de
  integração.
- [[Neural Labs - Configuração de câmera no NEURAL SERVER]]: instalação, `ComputerID`, cadastro da
  câmera e integração com VMS.
- [[Neural Labs - Envio XML do NEURAL SERVER]]: quadro `NEURAL`, campos do `<infoplate>`, XML curto e
  triggers.
- [[Neural Labs - Banco de dados do NEURAL SERVER]]: tabelas do SQL Server.
- [[Neural Labs - API Web do NS Backend]]: as rotas da Neural Platform.
- [[Neural Labs - Heartbeat e eventos do Orchestrator]]: estado das câmeras e eventos do Orchestrator.
