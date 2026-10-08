---
tags:
  - doc
  - attlas
aliases:
  - "Docs - índice raiz"
atualizado: 2026-10-07
banner: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200"
banner_y: 0.4
---

# Docs - índice raiz

## Resumo

Documentação técnica do Attlas, organizada por domínio. Cada pasta é um domínio ou subdomínio, com um
`index.md` de porta de entrada, e o nome de toda nota começa pelo caminho do domínio. Toda nota abre com
um Resumo, que já responde o essencial. Para achar algo rápido, use a tabela "Onde encontro" logo abaixo.

## Onde encontro

| Preciso de | Abra |
| --- | --- |
| Um comando de ferramenta (Docker, ffmpeg, ONVIF, VAPIX, ISAPI, psql, Kafka, SSH, gh) | [[Infraestrutura - Runbook - Comandos]] |
| Entrar num servidor | [[Infraestrutura - Acessos SSH]] |
| Saber onde roda cada coisa (local, dev.v2, Dell, sumo) | [[Infraestrutura - Ambientes]] |
| Entender um CI vermelho, lento ou parado | [[Infraestrutura - CI e runners]] |
| Diagnosticar o dev.v2 lento | [[Infraestrutura - Runbook - Desempenho do dev.v2]] |
| Ver logs e métricas da aplicação | [[Infraestrutura - Observabilidade]] |
| Rotas, tópicos Kafka e tabelas do `ms-cameras` | [[Câmeras - Arquitetura e estratégias]] |
| Diagnosticar vídeo que não abre, trava ou fica preto | [[Câmeras - Streaming - Runbook]] |
| Falar direto com uma câmera (ONVIF, VAPIX, ISAPI, RTSP) | [[Câmeras - Integração com dispositivo - Runbook]] |
| Liberar o vídeo ao vivo num servidor novo | [[Câmeras - Streaming - Explicação - Como liberar o WebRTC num servidor novo]] |
| Codec, banda e qualidade de imagem | [[Câmeras - Streaming - Codecs]], [[Câmeras - Streaming - Banda e bitrate]], [[Câmeras - Streaming - Qualidade de imagem na câmera]] |
| Como a saúde e a disponibilidade da câmera são calculadas | [[Câmeras - Saúde e monitoramento - Arquitetura e estratégias]] |
| Eventos, incidentes, alarmes e criticidade | [[Câmeras - Eventos, incidentes e alarmes - Catálogo e criticidade]] |
| O que falta no Analítico | [[Analítico - Pendências]] |
| Operar o analítico embarcado na câmera | [[Analítico - Runbook - Embarcado]] |
| Integração com a Neural Labs (leitura de placa) | [[Analítico - Neural Labs - Arquitetura e estratégias]] |
| Neural Labs: payloads, rotas e teste de ponta a ponta | [[Analítico - Neural Labs - Payloads e endpoints]] |
| O que o cliente exige | [[Processo - Edital do cliente]] |
| Como nomear uma nota ou uma task | [[Processo - Convenção de nomes]] |
| Como escrever nota, PR ou review | [[Processo - Convenções de escrita]] |
| O que a semana entrega | [[Sprints - índice raiz]] |

## Domínios

| Domínio | O que cobre | Subdomínios |
| --- | --- | --- |
| [[Câmeras]] | o módulo Câmeras (CCTV), servido inteiro pelo `ms-cameras` | [[Câmeras - Cadastro\|Cadastro]], [[Câmeras - Dashboard\|Dashboard]], [[Câmeras - Eventos, incidentes e alarmes\|Eventos, incidentes e alarmes]], [[Câmeras - Integração com dispositivo\|Integração com dispositivo]], [[Câmeras - PTZ e presets\|PTZ e presets]], [[Câmeras - Saúde e monitoramento\|Saúde e monitoramento]], [[Câmeras - Streaming\|Streaming]], [[Câmeras - Videowall\|Videowall]], [[Câmeras - VMS\|VMS]] |
| [[Analítico]] | laço virtual, ATSPM e leitura de placas, no app embarcado da câmera ou no servidor da Neural Labs | [[Analítico - Neural Labs\|Neural Labs]] |
| [[Infraestrutura]] | CI self-hosted, ambientes, rede, observabilidade, acessos e a referência de comandos | nenhum |
| [[Processo]] | convenções de nome e de escrita, e o edital do cliente | nenhum |

O `web-attlas` não tem domínio próprio: cada tela fica no subdomínio de backend que ela serve.

## Explicações para usuário

Notas na raiz do vault, em linguagem de usuário final, para repassar a outra pessoa.

| Explicação | Responde |
| --- | --- |
| [[Câmeras - Cadastro - Explicação - Estados de cadastro]] | os quatro estados da câmera e quem decide cada mudança |
| [[Câmeras - Dashboard - Explicação - Como cada número é calculado]] | de onde sai cada indicador do dashboard |
| [[Câmeras - Streaming - Explicação - Como liberar o WebRTC num servidor novo]] | portas e configuração para o vídeo ao vivo funcionar num servidor novo |
| [[Câmeras - Videowall - Explicação - Vídeo não chega ao painel H9]] | como o vídeo deveria chegar ao painel H9 de Quito e onde ele para |
| [[Analítico - Neural Labs - Explicação - Como cada leitura chega na câmera certa]] | o caminho de uma leitura de placa, com exemplo |
| [[Analítico - Neural Labs - Explicação - Como cadastrar a Neural Labs]] | o passo a passo do cadastro da Neural Labs no Attlas |

## Planejamento

- [[Sprints - índice raiz]]: planejamento semanal do squad 2. Cada sprint é um `index.md` com alias
  `Attlas - Sprint NN`, e cada task tem um ID fixo no nome (`S34-03 - Câmeras - Streaming - ...`). É aqui que
  se planeja: o ClickUp é publicação, não fonte.
- [[Reports diários]]: o report de cada dia útil. É registro do dia, não fonte de verdade.

## Fontes de verdade

| Assunto | Fonte |
| --- | --- |
| Comportamento do sistema | o código da `develop`, que vence qualquer nota |
| Requisito do cliente | [[Processo - Edital do cliente]], que não se edita |
| Nome e lugar de cada nota e task | [[Processo - Convenção de nomes]] |
| Estrutura e estilo de escrita | [[Processo - Convenções de escrita]] |
