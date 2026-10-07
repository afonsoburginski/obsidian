---
id: S35-16
tags:
  - attlas
  - task
  - sprint-35
  - infraestrutura
  - observabilidade
titulo: "[Infra] Logs dos microsserviços e do front no Grafana com Loki, separados por serviço e nível"
frente: Observabilidade
pr: "#5158"
issues: "#4997"
status: "Feita. #5158 mergeada em 29/09 às 14h31; a issue fechada no mesmo dia."
sprint: "[[Attlas - Sprint 35]]"
atualizado: 2026-10-07
---

# S35-16 - Infraestrutura - Observabilidade - Logs no Grafana com Loki

## O que se pediu

Os logs dos microsserviços e do front ficavam soltos nos containers, em JSON extenso, e os avisos e erros
se perdiam no meio. A issue pedia organizá-los por serviço, tipo, rota e categoria, e um comentário do
Hadson descartou a saída provisória em arquivos de texto. O stack de observabilidade tinha só Prometheus e
Grafana, e nada coletava log.

## O que a PR entregou

Dois serviços novos no stack `docker/observability`: o Loki, sem porta publicada no host, e o Alloy, que
descobre a cada 5 s os containers da rede do Attlas e manda a saída deles para o Loki. Os rótulos
indexados são `service`, `level` e `env`. O nível numérico do pino é convertido no coletor, e o formato do
log nos serviços não mudou.

## Estado

Mergeada e issue fechada em 29/09.

## Relacionado

- [[Infraestrutura - Observabilidade]]
