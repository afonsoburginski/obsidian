---
id: S35-27
tags:
  - attlas
  - task
  - sprint-35
  - cameras
  - dashboard
titulo: "[Full] Banda, disponibilidade e vínculo de detector do dashboard de câmeras com números reais"
frente: Dashboard
pr: "#5526"
status: "Feita. #5526 mergeada em 01/10 às 10h22."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-27 - Câmeras - Dashboard - Banda, disponibilidade e vínculo de detector com números reais

## O que estava errado

No dashboard de câmeras do sistema DMQ:

- **Banda**: câmeras VBR informam "sem limite" como 2147483647 kbps, e o amostrador gravava isso como
  consumo. O card chegou a 8.661.004,98 Mbps.
- **Disponibilidade**: câmera cadastrada no meio do período era penalizada pelo período anterior ao
  cadastro, com 16,8% para uma câmera 100% online.
- **Vínculo de detector**: a trava de contagem dupla recusava com 409 todo detector recém-criado numa UNE,
  porque a UNE reporta contador de todo canal configurado.

## O que a PR entregou

O valor "sem limite" deixa de ser gravado e é descartado na leitura, inclusive nos dados já gravados, e o
cartão "Consumo Atual" vira "Consumo Médio", que é o que o número sempre foi. A disponibilidade conta só a
partir do cadastro da câmera. A trava deixa de recusar o detector do contador da UNE, e o caminho ACP
continua recusado. No cadastro de câmera, sai o campo Estado, e Marca e Modelo ficam só leitura, vindos da
sondagem ONVIF.

## Estado

Mergeada em 01/10.

## Relacionado

- [[Câmeras - Dashboard - Explicação - Como cada número é calculado]]
