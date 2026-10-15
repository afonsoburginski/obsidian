---
id: S37-01
tags:
  - attlas
  - task
  - sprint-37
  - infraestrutura
  - servidores
titulo: "[Infra] EC2 do dev limpo do que não serve mais, com o consumo da instância medido"
frente: Servidores
tamanho: 3
pr: "-"
status: "Planejada em 15/10 para 16/10. Nada removido ainda."
sprint: "[[Attlas - Sprint 37]]"
atualizado: 2026-10-15
---

# S37-01 - Infraestrutura - Servidores - Limpeza do EC2 e consumo da instância medido

## Objetivo

Desafogar a instância do EC2 do dev. Primeiro medir o que consome CPU, memória e disco; depois tirar o que
não é mais usado, sem perder nada que alguém ainda use.

## O que já se sabe

| Item | Situação em 15/10 |
| --- | --- |
| Nó do kind | 8 vCPU e 31 GB; 59% de CPU e 40% de memória em uso; limites somados em 190% da CPU e 97% da memória |
| Kafka do dev | 15 GB em disco num volume declarado de 5 GiB, porque o `local-path` não impõe tamanho. A correção é a [[S38-05 - Infraestrutura - Kafka - Retenção do tópico espelhado e disco do broker\|S38-05]] |
| Home do `ubuntu` | `bin`, `docker`, `gitops-edit`, `orbit`, `orbit-backup-20261013-221123`, `orbit-backups`, `orbit-recovery`, `orbit-state`, `projects`, `seed`, `simulador-docker`, `orbit-watchdog.log`, `privatekey`, `publickey` |

## Passos

1. Medir: `df -h`, `free -g`, load, `docker stats --no-stream`, `docker system df`, `du` do home e do
   diretório de dados do kind, e os processos fora do kind.
2. Classificar cada item do home e cada container, imagem e volume em: em uso, de outra pessoa, sobra.
3. Antes de mexer em qualquer coisa do Orbit, foto nova com `~/orbit/local/state-backup.sh`.
4. Sobra do deploy antigo é movida para `~/atman-platform/legacy-compose-<data>/`, não apagada. Imagem e
   cache de build só com `docker image prune -af` e `docker builder prune -af`; volume só depois de listar
   os sem uso.
5. Conferir no fim que o dev.v2 e o Orbit respondem 200.

## Candidatos a conferir

| Item | O que confirmar |
| --- | --- |
| `orbit-backup-20261013-221123` | Se é foto avulsa já coberta pelo `orbit-backups` e pela cópia no PC |
| `orbit-recovery` | Se sobrou de uma recuperação já concluída |
| `gitops-edit` | Se o clone de edição tem algo não enviado ao repo bare |
| `orbit-watchdog.log` | Se tem rotação ou só cresce |
| Imagens e cache de build do Docker | Tamanho pelo `docker system df` |

## Não mexer

Pertencem a outras pessoas ou estão em uso:
`privatekey` e `publickey` (WireGuard), `simulador-docker` e os containers `asc-*` com os volumes deles,
`projects` (attlas-asm), `seed`, o `attlas-coturn` com `~/docker/turnserver.conf` e os certificados dele, e o
`orbit-state`. A tailnet `atmansystems.com` também não entra.

## Estado

Planejada para 16/10.
