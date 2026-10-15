---
id: S38-06
tags:
  - attlas
  - task
  - sprint-38
  - infraestrutura
  - ambientes
  - orbit
titulo: "[Infra] Deploy do ambiente inteiro no dev sem sondas falhando nem serviço preso fora do ar"
frente: Ambientes
tamanho: 5
pr: "-"
status: "Planejada em 15/10. Sem PR."
sprint: "[[Attlas - Sprint 38]]"
atualizado: 2026-10-15
---

# S38-06 - Infraestrutura - Ambientes - Deploy do ambiente inteiro sem derrubar as sondas

## O que está errado

O deploy dos 23 serviços para a mesma imagem, em 15/10, andou em 6 ondas de 3 a 4 serviços, uma a cada 5
minutos, e levou cerca de 25 minutos. Mesmo em ondas, o dev sofreu.

| Sinal | Medido em 15/10 |
| --- | --- |
| Serviços com sonda de readiness, startup ou liveness falhando | 17, mais 2 bancos (`db-controllers`, `db-emergencies`) |
| Fora do ar 34 minutos depois | `ms-inventory` (0 de 1) e `ms-simulation` (0 de 1, 2 reinícios) |
| Uso do nó | 59% de CPU e 40% de memória |
| Limites somados no nó | 190% da CPU e 97% da memória |
| Reserva do mediamtx | 1500 m de CPU, 30% de toda a reserva do nó (ver [[S38-07 - Câmeras - Streaming - Reserva de CPU do mediamtx pelo uso medido|S38-07]]) |

As sondas do chart `atman-service` usam `timeoutSeconds: 5`, startup com 60 tentativas a cada 10 s e
`maxSurge: 1`, então cada onda põe dois pods de cada serviço rodando ao mesmo tempo.

## O que a task entrega

- Medição da CPU do nó e do load do EC2 durante uma onda, para separar falta de CPU de bug do serviço.
- Tamanho e intervalo de onda do Orbit (`planWaves`) ajustados pela medição.
- Limites do template dev revistos para caber na máquina, pelo card Dimensionamento do Orbit.
- Os serviços que ficaram fora do ar sem relação com carga viram issue para o dono (ver o `index.md`).

## Estado

Planejada. Trabalho no repo `orbit` e no GitOps, sem PR no monorepo. Depende da limpeza do EC2 da
[[S37-01 - Infraestrutura - Servidores - Limpeza do EC2 e consumo da instância medido|S37-01]], que muda a
carga de base da máquina.
