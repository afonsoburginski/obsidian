---
id: S35-29
tags:
  - attlas
  - task
  - sprint-35
  - cameras
  - videowall
  - backend
titulo: "[Back] NovaStar H9 segue a Open API oficial, com o endereço RTSP do ambiente e a camada aberta direto no stream"
frente: Videowall
pr: "#5584, #5586, #5589"
status: "Feita. #5584 mergeada em 01/10 às 12h54, #5586 às 13h00 e #5589 às 13h07."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-29 - Câmeras - Videowall - NovaStar H9 pela Open API oficial

## O que estava errado

O adaptador do processador de videowall NovaStar H9 foi escrito sobre caminhos e corpos presumidos e não
funcionaria com o equipamento real:

- a assinatura era o Base64 dos bytes do MD5, e a documentação pede o Base64 do MD5 em hexadecimal;
- o cliente só olhava o HTTP, mas o H9 recusa com HTTP 200 e `status` diferente de 0;
- 10 das 11 capacidades usavam caminho errado, e faltavam `deviceId` e `screenId` nos corpos;
- no espelho, só a última tela chegava ao painel real;
- o endereço RTSP que o H9 puxa era o nome do serviço no compose, que ele não resolve;
- abrir a camada vazia e ligar a fonte depois deixava a camada vazia no H9 real de Quito.

## O que as PRs entregaram

- **#5584**: codec, cliente e catálogo pela Open API oficial, com cinco capacidades novas, recusa do
  fabricante tratada como erro com o código dele, e o espelho de várias telas chegando ao painel.
- **#5586**: o endereço RTSP do videowall vem de `VIDEOWALL_RTSP_BASE_URL`, no `.env` raiz do servidor.
- **#5589**: a camada é criada já no stream IPC da câmera, como o teste no H9 real mostrou que funciona.

## Estado

As três mergeadas em 01/10.

## Relacionado

- [[Câmeras - Videowall - Explicação - Vídeo não chega ao painel H9]]
- [[Câmeras - Videowall - Arquitetura e estratégias]]
