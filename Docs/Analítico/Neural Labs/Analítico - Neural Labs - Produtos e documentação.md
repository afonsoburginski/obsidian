---
tags:
  - doc
  - analitico
  - neural-labs
aliases:
  - "Produtos Neural Labs"
  - "Documentação da Neural Labs"
  - "Neural Labs - Produtos e documentação"
atualizado: 2026-10-07
---

# Analítico - Neural Labs - Produtos e documentação

Volta para [[Analítico - Neural Labs]].

## Resumo

A **Neural Labs S.L.** é uma empresa espanhola (Barcelona) de reconhecimento de placas e analítica de
tráfego. O produto que o Attlas integra é o NEURAL SERVER, pelo envio de leituras por socket TCP. O Attlas
recebeu três documentos do fabricante (envio e banco do NEURAL SERVER, API da Neural Platform e manual do
Orchestrator), todos transcritos neste vault; o manual público do NEURAL SERVER é de 2018. O XML de saída,
a API e o nome das tabelas não são públicos e só vêm da Neural Labs.

## Contato

| Canal | Valor |
| --- | --- |
| E-mail técnico | support@neurallabs.net |
| Telefone | +34 93 820 56 94 |
| Site | www.neurallabs.net |

## Produtos

| Produto | O que é | Integração documentada |
| --- | --- | --- |
| **NEURAL SERVER** (antes VPAR SERVER) | software de leitura de placas (LPR) e contêineres (ACCR) que puxa câmeras IP e grava num SQL Server | XML ou JSON por socket TCP, heartbeat, sincronização com banco remoto, acesso direto ao SQL Server |
| **Neural Platform** (NS Backend) | backoffice central: busca, sanções, trechos, listas, exportação | API Web `/nlapi/api/v2` |
| **NEURAL ORCHESTR[AI]TOR** | analítica de vídeo por IA (contagem, classes, alarmes de imagem) | heartbeat XML e resumo de eventos em JSON por HTTP, SDK |
| **Neural Edge** | leitura de placas embarcada em câmeras Axis, Vivotek e Hikvision | XML ou JSON por socket, HTTP, eventos ONVIF, FTP, CSV |
| Neural Ghost AI, Neural LPR Box AI, VCOP, Neural Notifier | câmera própria, servidor industrial para controle de acesso, versão embarcada em viatura, avisos por WhatsApp | material comercial |

O motor de leitura **VPAR9** foi anunciado em 07/04/2026 como motor comum de todo o ecossistema.

## Documentos recebidos

Documentos do fabricante que o Attlas recebeu, transcritos neste vault; os PDFs não ficam no vault.

| Documento | Versão | Nota |
| --- | --- | --- |
| NEURAL SERVER Data Integration (espanhol) | v1.17, 27/03/2023 | [[Analítico - Neural Labs - Envio XML do NEURAL SERVER]] (envio e triggers) e [[Analítico - Neural Labs - Banco de dados do NEURAL SERVER]] |
| Neural Platform, NS Backend web API integration | v26.1, revisão 1.7 de 15/05/2026 | [[Analítico - Neural Labs - API Web do NS Backend]] |
| NEURAL ORCHESTRATOR Integration Manual | v3.1, 30/11/2025 | [[Analítico - Neural Labs - Heartbeat e eventos do Orchestrator]] |

O arquivo `neural-server-manual-de-integracao.pdf` é cópia idêntica do "Data Integration" (mesmo md5).

## Documentos públicos

| Documento | Onde | Nota |
| --- | --- | --- |
| NEURAL SERVER Manual del Usuario v.4.2.0.0 (69 p., 2018) | [Casmar](https://www.casmarglobal.com/media/akeneo_connector/media_files/U/G/UG_LPR_BOX_ES_e563.pdf) | [[Analítico - Neural Labs - Configuração de câmera no NEURAL SERVER]] |
| VPAR SERVER User manual (inglês, 50 p., 2017) | [Casmar](https://www.casmarglobal.com/media/akeneo_connector/media_files/U/G/UG_VPAR_EN_b97f.pdf) | mesmo conteúdo, versão antiga |
| Neural Server - Milestone Installation Guide v2 (30/05/2019) | [cópia no Wayback](https://web.archive.org/web/20251008195945id_/https://www.milestonesys.com/globalassets/marketplace/uploaded-assets/0012000000nj46daac/neural-server---milestone-integration-guide.pdf) | exige Neural Server 4.6.2.6 e Neural Plugin 1.2.9.0 |
| Integração com o Nx Witness (ficha 473, 21/08/2025) | [Nx Integrations](https://nxvms.com/integrations/473-neural-labs-smart-mobility--logistics-solutions/how-to-setup) | versão 5.5.1.1, testada no Nx 6.0 |
| Folhetos de produto | [Neural Server](https://www.neurallabs.net/en/solutions/neural-server), [Anixter 2022](https://www.anixter.com/content/dam/Suppliers/Neura-Labs/Literatura/Neural-Server-Access-Control-Bhochure-2022.pdf) | só comercial |

O que **não é público**: o XML de saída, a API do NS Backend, o nome das tabelas do banco, um Swagger ou
OpenAPI e um repositório no GitHub. Os folhetos atuais do site ficam atrás de formulário. Tudo isso só vem
da Neural Labs.

## Canais de integração

| Canal | Como funciona | Uso no Attlas |
| --- | --- | --- |
| Leitura a leitura, empurrada | socket TCP com XML ou JSON, com o NEURAL SERVER como cliente ou como servidor | é o canal do Attlas: NEURAL SERVER como cliente, XML completo |
| Estado | heartbeat XML ou JSON, no NEURAL SERVER e no Orchestrator | não usa |
| Banco | o SQL Server do NEURAL SERVER é declarado aberto ao integrador, e o plugin do Milestone lê dele direto; vários servidores podem sincronizar num banco remoto | não usa; ler o cadastro de câmeras é pendência do vínculo |
| Consulta por HTTP | API Web da Neural Platform: eventos, sanções, imagens, vídeos, trechos | não usa |
| Não documentados | MQTT, Kafka, webhooks e REST de envio | |

A integração do Attlas está em [[Analítico - Neural Labs - Arquitetura e estratégias]], e o que cada
canal diz sobre a câmera em [[Analítico - Neural Labs - Vínculo de câmeras]].

## Glossário

| Termo | O que é |
| --- | --- |
| LPR, ANPR | leitura automática de placa de veículo |
| ACCR | leitura automática de código de contêiner |
| VPAR | nome antigo do NEURAL SERVER e do motor de leitura |
| VMS | sistema de gestão de vídeo, como Milestone e Nx Witness |
| Casmar | distribuidor que publica os manuais públicos do NEURAL SERVER |
