---
id: S35-12
tags:
  - attlas
  - task
  - sprint-35
  - infraestrutura
  - ambientes
  - deploy
titulo: "[Infra] Imagem :dev parte do último run que publicou, e o deploy recusa env faltando no host de dev"
frente: Ambientes
pr: "#5151, #5152"
issues: "#3608, #3609"
status: "Feita. #5151 mergeada em 29/09 às 13h51 e #5152 às 13h52; as duas issues fechadas no mesmo dia."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-12 - Infraestrutura - Ambientes - Deploy do dev.v2 com a imagem certa e sem env faltando

## O que estava errado

- **#3608**: numa rajada de merges, os runs do CI da develop se cancelavam e o run verde seguinte só
  publicava as imagens `:dev` do último merge. O `nx-set-shas` só aceita como base um run entre os 100
  commits mais novos da develop e, fora dessa janela, cai no `HEAD~1`. Os serviços mexidos nos runs
  cancelados ficavam com imagem velha no dev sem aviso.
- **#3609**: o `.env.docker` de cada serviço vive só no host de dev, e uma env nova num `.env.example` não
  chegava lá. O serviço subia verde e só falhava no uso; foi assim que o `ms-simulation` ficou sem onze
  chaves e o congelamento de cenário respondia 503.

## O que as PRs entregaram

- **#5151**: um script devolve o commit do último run da develop com Build & Push verde, ancestral do
  `HEAD`, e o affected parte dele. Sem essa base, o job publica todas as imagens e avisa no log. O passo
  roda com `pipefail`, então uma falha do `nx` derruba o job.
- **#5152**: o deploy compara, no host e antes do `pull`, as chaves do `env_file` de cada serviço com o
  `.env.example` e falha listando as que faltam, só pelo nome. O `ms-simulation` passa a exigir no boot as
  URLs e o object storage sem os quais a rota morre, e o deploy roda o `minio-init` para criar bucket novo.

## Estado

As duas mergeadas e as duas issues fechadas em 29/09.

## Relacionado

- [[Infraestrutura - Ambientes]]
