---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2283
frente: Infra / deploy dev
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: Closed (mergeada 21/07)
atualizado: 2026-07-24
pr: https://github.com/atmanadmin/attlas-2026/pull/912
---

# SOFTWARE-2283 - Fixar URLs internas de serviço no docker-compose (imune a drift do .env.docker)

O `.env.docker` de cada serviço no EC2 é mantido na mão (o deploy não sincroniza), então toda env nova exigida em produção derrubava um microsserviço no boot pós-deploy: o container subia sem a variável, crashava e levava dependentes junto (caso clássico: `AUDIT_IP_HASH_KEY` derrubou o ms-organization e o login inteiro).

O fix move as URLs internas de serviço-a-serviço para o próprio `docker-compose.yml` (service names fixos), tirando essa classe de configuração do `.env.docker` mutável. Env nova de URL interna deixou de ser motivo de crash em deploy.

Frente: infra do ambiente dev (EC2).
