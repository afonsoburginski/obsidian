---
id: S38-09
tags:
  - attlas
  - task
  - sprint-38
  - infraestrutura
  - ambientes
  - seguranca
titulo: "[Infra] DATABASE_URL com senha só no Secret, no Compose e no gerador do GitOps"
frente: Ambientes
tamanho: 1
pr: "-"
status: "Planejada em 15/10. Sem PR."
sprint: "[[Attlas - Sprint 38]]"
atualizado: 2026-10-15
---

# S38-09 - Infraestrutura - Ambientes - Senha de banco fora do ConfigMap

## O que está errado

O ConfigMap `ms-video-analytics-env` do dev guarda a `DATABASE_URL` com a senha do banco. Qualquer um com
leitura de ConfigMap no namespace lê a senha. É o único ConfigMap do namespace com `DATABASE_URL`, conferido
em 15/10.

| Onde | O que tem |
| --- | --- |
| `docker-compose.yml` do monorepo, linha 1305 | `DATABASE_URL` literal no `environment:` do `ms-video-analytics`. As linhas 1507 (`ms-emergencies`) e 1547 (`ms-adaptive-control`) seguem o mesmo padrão |
| `tools/compose_to_gitops.py` do Orbit | Só trata como segredo o valor no formato `${VAR}`; literal vai para o `envVars` |
| `gitops/attlas/services/ms-video-analytics/values.yaml`, linha 15 | O resultado, que vira ConfigMap |

## O que a task entrega

- As três `DATABASE_URL` do Compose saem do `environment:` e passam a vir do `.env.docker` do serviço.
- O gerador recusa literal sensível (URL com senha e os nomes que o Orbit já trata como sensíveis), para o
  mesmo erro não voltar por outro serviço.
- `envVars` do `ms-video-analytics` sem a `DATABASE_URL` e o Secret do dev conferido.

## Estado

Planejada. Uma PR no monorepo e um commit no repo `orbit`.
