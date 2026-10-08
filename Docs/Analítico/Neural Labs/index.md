---
tags:
  - doc
  - analitico
  - neural-labs
aliases:
  - "Analítico - Neural Labs"
  - "Neural Labs"
  - "Neural Labs - Índice"
atualizado: 2026-10-07
---

# Analítico - Neural Labs

## Resumo

A Neural Labs fornece o NEURAL SERVER, o servidor de leitura de placas (LPR) instalado no cliente, que
manda cada leitura ao Attlas por TCP. No [[Analítico]] ele é o analítico servidor em operação: as leituras
alimentam o tempo de viagem dos Trajetos e a capacidade LPR das câmeras. As notas de integração descrevem
o que o Attlas faz e se conferem contra o código; as de referência transcrevem a documentação do
fornecedor.

## Notas

### Integração no Attlas

| Nota | Abra quando |
| --- | --- |
| [[Analítico - Neural Labs - Payloads e endpoints]] | **comece por aqui**: o que o equipamento manda (XML e JSON), as rotas, a medição do trajeto que a tela recebe, as variáveis e o teste de ponta a ponta |
| [[Analítico - Neural Labs - Arquitetura e estratégias]] | precisa saber onde mora cada peça, as rotas, as tabelas, as variáveis e as métricas |
| [[Analítico - Neural Labs - Pendências]] | quer saber o que falta na integração: decisões da empresa, primeira captura real, perguntas ao fornecedor e ajustes de produto |
| [[Analítico - Neural Labs - Runbook]] | vai ligar um NEURAL SERVER real: ambiente, porta, cadastro e conferência |
| [[Analítico - Neural Labs - Vínculo de câmeras]] | quer entender associação e vínculo, como a Neural Labs identifica câmeras, a lista do equipamento, o que a página da instância mostra e o que perguntar ao fornecedor |
| [[Analítico - Neural Labs - Tempo de viagem]] | quer a regra do cálculo, os status de um trecho e onde o Attlas diverge do documento dos gestores |
| [[Analítico - Neural Labs - Documento dos gestores sobre tempo de recorrido]] | precisa da regra do tempo de viagem que os gestores pediram, no original em espanhol |

Anexo: [[Analítico - Neural Labs - Vínculo de câmeras.pdf]], o documento técnico-funcional da associação e
do vínculo para gestão, produto, operação e engenharia.

### Referência do fornecedor

| Nota | Abra quando |
| --- | --- |
| [[Analítico - Neural Labs - Produtos e documentação]] | quer saber quem é a Neural Labs, os produtos, os documentos recebidos e públicos e os canais de integração |
| [[Analítico - Neural Labs - Configuração de câmera no NEURAL SERVER]] | precisa da instalação, do `ComputerID`, do cadastro da câmera no equipamento ou da integração com VMS |
| [[Analítico - Neural Labs - Envio XML do NEURAL SERVER]] | precisa do quadro `NEURAL`, dos campos do `<infoplate>`, do XML curto ou dos triggers |
| [[Analítico - Neural Labs - Banco de dados do NEURAL SERVER]] | precisa das tabelas do SQL Server do equipamento |
| [[Analítico - Neural Labs - API Web do NS Backend]] | precisa das rotas da Neural Platform |
| [[Analítico - Neural Labs - Heartbeat e eventos do Orchestrator]] | precisa do estado das câmeras e dos eventos do Orchestrator |

## Explicações para usuário

| Explicação | Responde |
| --- | --- |
| [[Analítico - Neural Labs - Explicação - Como cadastrar a Neural Labs]] | onde e quando aparece o cadastro, o que preencher, o que configurar no equipamento e como saber que funcionou |
| [[Analítico - Neural Labs - Explicação - Como cada leitura chega na câmera certa]] | como uma leitura acha a câmera do Attlas, com exemplo, e o único ponto que pode dar errado |
