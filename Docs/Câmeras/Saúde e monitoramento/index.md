---
tags:
  - doc
  - cameras
  - saude
aliases:
  - "Câmeras - Saúde e monitoramento"
  - "Saúde e monitoramento"
  - "00 - Saúde e monitoramento"
  - "Status em tempo real"
  - "00 - Status em tempo real"
  - "Status em tempo real (push)"
atualizado: 2026-10-07
---

# Câmeras - Saúde e monitoramento

## Resumo

Como o [[Câmeras]] sabe, o tempo todo, se cada câmera cadastrada está conectada e com que qualidade de
conexão, como guarda a disponibilidade ao longo do tempo e como entrega o estado ao vivo para a tela. O
`ms-cameras` mantém uma conexão de controle por equipamento, avalia o estado a cada batida, fecha janelas de
5 minutos que viram um resumo diário de 90 dias e empurra cada mudança pelo canal Socket.IO `cameras-status`
e pelo tópico Kafka `attlas.cameras.status-changed`. O resumo diário alimenta a "Saúde da Câmera" na tela e
o relatório de estado das câmeras do `ms-reports`.

Assuntos vizinhos: bitrate medido e provisionado em [[Câmeras - Streaming - Banda e bitrate]], eventos e
incidentes gravados pela saúde em [[Câmeras - Eventos, incidentes e alarmes]], cartões de conectividade em
[[Câmeras - Dashboard]].

## Notas

| Nota | Abra quando |
| --- | --- |
| [[Câmeras - Saúde e monitoramento - Arquitetura e estratégias]] | precisa saber onde está cada peça no código, as rotas, o canal ao vivo, o tópico Kafka, as tabelas, o porquê do desenho e as armadilhas |
| [[Câmeras - Saúde e monitoramento - Fluxos]] | precisa do passo a passo: lease, batida, queda, mudança de estado até a tela, janela de 5 minutos, resumo diário, consulta de métricas, canal ao vivo, contagem e exportação |
| [[Câmeras - Saúde e monitoramento - Requisitos e SLA]] | precisa de uma regra de negócio, um limite, uma retenção, a meta de SLA, a cobertura dos requisitos do módulo ou uma variável de ambiente |
| [[Câmeras - Saúde e monitoramento - Guia de degradação]] | precisa explicar a alguém de fora quando a câmera é Online, Degradada ou Offline; a nota embute o PDF |

## Explicações para usuário

Nenhuma explicação para usuário trata deste subdomínio.

## Diagramas

- [[Câmeras - Saúde e monitoramento - Diagrama.excalidraw]]: desenho do monitoramento, do histórico e da
  entrega ao vivo. Quando o desenho discorda do código, vale o código e depois a nota.
