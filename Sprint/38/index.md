---
tags:
  - attlas
  - sprint-38
  - moc
  - cameras
  - analitico
  - infraestrutura
aliases:
  - "Attlas - Sprint 38"
  - "Sprint 38 - o que entrega"
sprint: Sprint 38 (19/10/26 - 25/10/26)
status: "PLANEJADA em 15/10. 10 tasks, 30 pts. A S38-01 já tem PR (#7688); as outras não têm spec nem PR."
atualizado: 2026-10-15
---

# Sprint 38 - o que entrega

Porta de entrada da semana de **19 a 25/10**, montada em 15/10. Uma task é pedido do Daniel Zanotelli; as
outras nove saíram da medição do dev em 15/10, entre 19h e 19h45, feita pelo MCP do Orbit e por SSH.

> [!info] Nenhuma task desta semana tem card no ClickUp
> Os pontos abaixo são estimativa própria, na mesma escala da Sprint 32.

## O que a semana entrega

- **Pedido do Daniel.** O status da câmera, no GET e no socket, informa o preset em vigor (S38-01).
- **ms-cameras estável sob carga.** Os jobs de incidente sem transação expirada (S38-02), o pool do banco, a
  readiness e o deadlock do snapshot (S38-03), e o consumer Kafka no padrão do `core-messaging` (S38-04).
  Os erros dessas três continuam com o pod estável, fora do deploy.
- **Infraestrutura do dev.** Retenção e disco do Kafka (S38-05), deploy do ambiente sem derrubar as sondas
  (S38-06), reserva do mediamtx (S38-07) e senha de banco fora do ConfigMap (S38-09).
- **Analítico.** O diagnóstico do stream sem o falso "desabilitado" no boot (S38-08).
- **Ferramenta.** O MCP do Orbit lendo o histórico e filtrando direito (S38-10).

## As tasks da semana

| ID | Task (1 task = 1 ou mais PRs) | Natureza | Pts | PRs | Estado |
| --- | --- | --- | --- | --- | --- |
| S38-01 | [[S38-01 - Câmeras - Saúde e monitoramento - Preset em vigor no status da câmera\|Status da câmera (GET e socket) informa o preset em vigor]] | `[Back]` | 3 | #7688 | **PR aberta** em 15/10, antecipada; revisor Daniel Zanotelli |
| S38-02 | [[S38-02 - Câmeras - Eventos, incidentes e alarmes - Housekeeping e reconciliação de incidentes dentro do prazo da transação\|Housekeeping e reconciliação de incidentes dentro do prazo da transação]] | `[Back]` | 3 | - | **planejada** |
| S38-03 | [[S38-03 - Câmeras - Saúde e monitoramento - Pool do banco, readiness e deadlock do ms-cameras sob carga\|Pool do banco, readiness e deadlock do ms-cameras sob carga]] | `[Full]` | 5 | - | **planejada**; depende da S38-02 |
| S38-04 | [[S38-04 - Câmeras - Kafka - Consumer do ms-cameras no padrão do core-messaging\|Consumer Kafka do ms-cameras no padrão do core-messaging]] | `[Back]` | 3 | - | **planejada** |
| S38-05 | [[S38-05 - Infraestrutura - Kafka - Retenção do tópico espelhado e disco do broker\|Retenção do tópico espelhado e disco do broker]] | `[Infra]` | 3 | - | **planejada** |
| S38-06 | [[S38-06 - Infraestrutura - Ambientes - Deploy do ambiente inteiro sem derrubar as sondas\|Deploy do ambiente inteiro sem derrubar as sondas]] | `[Infra]` | 5 | - | **planejada**; depende da S37-01 |
| S38-07 | [[S38-07 - Câmeras - Streaming - Reserva de CPU do mediamtx pelo uso medido\|Reserva de CPU do mediamtx pelo uso medido]] | `[Infra]` | 2 | - | **planejada** |
| S38-08 | [[S38-08 - Analítico - Detecção - Diagnóstico do stream sem o falso desabilitado no boot\|Diagnóstico do stream sem o falso desabilitado no boot]] | `[Back]` | 2 | - | **planejada** |
| S38-09 | [[S38-09 - Infraestrutura - Ambientes - Senha de banco fora do ConfigMap\|Senha de banco fora do ConfigMap]] | `[Infra]` | 1 | - | **planejada** |
| S38-10 | [[S38-10 - Infraestrutura - Orbit - MCP do Orbit com leitura autenticada e filtros que funcionam\|MCP do Orbit com leitura autenticada e filtros que funcionam]] | `[Infra]` | 3 | - | **planejada** |

**30 pts em 10 tasks.** A limpeza do EC2 não está aqui: é a
[[S37-01 - Infraestrutura - Servidores - Limpeza do EC2 e consumo da instância medido|S37-01]], de 16/10.

## Planejamento

### Ordem

| Dia | Tasks | Por quê |
| --- | --- | --- |
| 19/10 | S38-01, S38-09 | O pedido do Daniel tem gente esperando; a S38-09 é pequena e fecha um vazamento de senha |
| 20/10 | S38-02, S38-04 | Atacam os erros do `ms-cameras` que se repetem todo minuto |
| 21/10 | S38-03 | Mede o pool já sem o housekeeping segurando conexão |
| 22/10 | S38-05, S38-07 | Liberam disco e reserva de CPU antes de mexer no deploy |
| 23/10 | S38-06 | Usa a máquina já limpa (S37-01) e com as reservas novas |
| 24/10 | S38-08, S38-10 | Não bloqueiam nada |

### PRs

| Repo | Tasks |
| --- | --- |
| `attlas-2026` | S38-01, S38-02, S38-03 (código), S38-04, S38-05 (Compose), S38-08, S38-09 (Compose) |
| `orbit` e GitOps do hub | S38-03 (pool), S38-05, S38-06, S38-07, S38-09 (gerador), S38-10 |

Toda PR no `attlas-2026` precisa da spec atômica antes do código.

### Riscos e decisões em aberto

| Item | Efeito |
| --- | --- |
| Push do preset no socket (S38-01) | Resolvido na PR #7688: o status é reenviado quando a câmera para e no CRUD de preset |
| Heartbeat do Kafka (S38-04) | Se o event loop não estiver travado, a causa é outra e a task não fecha o sintoma sozinha |
| Valor da retenção (S38-05) | Depende de quanto tempo o analítico precisa reler o tópico espelhado |
| Credencial do MCP (S38-10) | O Orbit não tem token de leitura hoje; nasce nesta task |

## Fora do squad: issues para os donos

Problemas de serviços que não são do Afonso. Viram issue no repositório, atribuída ao dono, não task.

| Serviço | Evidência em 15/10 | Dono pelo histórico do Git |
| --- | --- | --- |
| `ms-inventory` | 0 de 1 pronto por 34 minutos depois do deploy; atraso de 8.916 mensagens em `attlas.alarms.state-changed` e 850 em `attlas.alarms.created`, parado entre duas leituras com 90 s de intervalo | danielfaria-at |
| `ms-simulation` | 0 de 1 pronto por 25 minutos, 2 reinícios, membro removido do grupo Kafka por heartbeat | GuilhermeMoreiraAtman |
| `ms-selective-priority` | 2.729 mensagens no tópico `attlas.dlq.selective-priority` | GuilhermeMoreiraAtman |

Antes de abrir, ler o log de erro de cada um: a evidência acima é só o sintoma.

## O que a medição não cobriu

| Lacuna | Por quê |
| --- | --- |
| Histórico de 24 horas e 7 dias do Orbit | A API autenticada não responde pelo MCP; resolvido pela S38-10 |
| Causa dos heartbeats expirados do `ms-cameras` | A hipótese do event loop travado não foi medida; entra na S38-04 |

## Fontes

- Medição do dev em 15/10 pelo MCP `attlas-platform` e por SSH no EC2: pods, uso de recursos, eventos do
  Kubernetes, logs, métricas do kafka-exporter em duas leituras com 90 s de intervalo, API do mediamtx,
  `pg_stat_activity` do `db-cameras` e disco do broker.
- Código da `develop` em 15/10, com os caminhos citados em cada task.
- Pedido da S38-01: mensagem recebida em 15/10, do squad do Daniel Zanotelli.
- Contexto: [[Infraestrutura - Observabilidade]] e [[Infraestrutura - Orbit]].
