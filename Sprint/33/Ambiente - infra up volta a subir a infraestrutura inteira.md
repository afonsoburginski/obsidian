---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
  - ambiente
card: SOFTWARE-3199
clickup: https://app.clickup.com/t/86akhpcd5
titulo: "[Infra] `infra:up` não sobe a infraestrutura inteira e falta o `ms-detector-history`"
frente: Plataforma
tamanho: 2 pts
pr: "#3447"
status: "PR #3447 aberta, e a decisão foi manter `infra:up` como `docker compose up -d`: o defeito era um só, `db-detector-history` sendo o único banco de serviço real atrás do profile `full`. São 30 containers agora, que é o número que a documentação já afirmava. O serviço continua no `full`, como todos os microsserviços, e a regra que separa os dois conjuntos passa a estar escrita no `workflow.md`."
sprint: "[[Attlas - Sprint 33]]"
atualizado: 2026-09-13
---

# Ambiente - `infra:up` volta a subir a infraestrutura inteira

`npm run infra:up` passou a nomear cinco serviços na linha de comando, então os bancos e caches que não
estão em profile ficam fora, e o `ms-detector-history` não está na lista. Consequência: a face Métricas
do Laço Virtual responde 502 em toda máquina que subiu o ambiente por ali, porque o único backend que
ela lê não está no ar. O `CLAUDE.md` da raiz e o readme ainda descrevem o comportamento antigo.

## Decisão a tomar

Renomear a pilha mínima para `infra:up:min` e devolver `infra:up` ao `docker compose up -d`, ou manter o
novo significado e corrigir a documentação. Seja qual for, `db-detector-history` e `ms-detector-history`
precisam entrar no caminho padrão.
