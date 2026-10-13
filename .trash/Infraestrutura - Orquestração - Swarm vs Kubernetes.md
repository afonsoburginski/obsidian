---
tags:
  - doc
  - infra
  - orquestração
  - docker
  - kubernetes
aliases:
  - "Swarm vs K8s"
  - "Docker Swarm"
  - "Orquestração de containers"
atualizado: 2026-10-08
banner: "assets/banners/servers.jpg"
banner_y: 0.3
---

# Swarm vs Kubernetes

Volta para [[Infraestrutura]]

## Resumo

| Pergunta | Resposta |
| --- | --- |
| O que o Swarm faz? | Pega o `docker-compose.yml` existente e distribui entre máquinas |
| O que muda no comando? | `docker-compose up` → `docker stack deploy -c docker-compose.yml projeto` |
| O que o K8s exige? | Traduzir tudo para manifestos próprios (Pods, Deployments, Services, Ingress, ConfigMaps) |
| Qual o custo do K8s? | Devs/engenheiros dedicados só para manter o ambiente |
| Decisão Attlas | Swarm para escalar com a equipe atual; K8s fica no repo `kubernetes` como referência |

## Docker Swarm — usa o que você já sabe

O Swarm é nativo do Docker. O mesmo `docker-compose.yml` que a equipe já domina é reutilizado quase sem alteração. O Swarm pega essa receita e distribui o trabalho entre várias máquinas (Workers).

O que você ganha sem custo adicional:
- Alta disponibilidade
- Balanceamento de carga automático
- Distribuição em múltiplas máquinas

Curva de aprendizado: praticamente zero. Não exige linguagem nova de infraestrutura.

## Kubernetes — poderoso, caro de operar

Padrão absoluto de mercado para grandes corporações, mas com pedágio de complexidade alto.

Pontos de atrito:
- **Não lê** `docker-compose.yml` nativamente — tudo precisa ser traduzido para manifestos K8s
- Introduz um zoológico de abstrações só para o básico rodar: Pods, Deployments, Services, Ingress, ConfigMaps, ReplicaSets
- O control plane exige vários componentes em conjunto (API Server, ETCD, Scheduler) só para manter a fábrica em pé

## Comparação direta

| Aspecto | Swarm | Kubernetes |
| --- | --- | --- |
| Configuração | Reutiliza `docker-compose.yml` | Manifestos próprios (dezenas de arquivos) |
| Curva de aprendizado | Mínima | Alta — conceitos novos em cascata |
| Operação | Equipe existente opera | Exige engenheiros de infra dedicados |
| Salto desde Compose | Passo fluido de evolução | Mudança drástica de paradigma |
| Escalabilidade | Boa para médio porte | Virtualmente ilimitada |
| Ecossistema | Enxuto, estável | Gigantesco (Helm, Istio, Operators, CRDs...) |

## Fluxo de deploy

**Swarm:**
`docker-compose.yml` → `docker stack deploy` → Manager distribui entre Workers → serviço no ar

**Kubernetes:**
`docker-compose.yml` → traduzir para manifestos → `kubectl apply` → API Server → Scheduler aloca Pods → serviço no ar

## Visualização interativa

Toggle entre os dois modelos de deploy; clicar num componente abre a descrição dele.

```widget
src: _widgets/diagrams/orquestracao-swarm-vs-k8s.html
```

Formato e criação de widgets: [[_widgets/README|Widgets HTML]].
