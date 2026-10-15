---
id: S38-10
tags:
  - attlas
  - task
  - sprint-38
  - infraestrutura
  - orbit
  - observabilidade
titulo: "[Infra] MCP do Orbit lê o histórico e a observação do ambiente, e filtra por mais de um nome"
frente: Orbit
tamanho: 3
pr: "-"
status: "Planejada em 15/10. Sem PR."
sprint: "[[Attlas - Sprint 38]]"
atualizado: 2026-10-15
---

# S38-10 - Infraestrutura - Orbit - MCP do Orbit com leitura autenticada e filtros que funcionam

## O que está errado

A medição de 15/10 que gerou esta sprint não conseguiu ler o histórico de 24 horas nem o resumo do ambiente
pelo MCP, e precisou de SSH direto para o resto.

| Ferramenta | Falha |
| --- | --- |
| `orbit_api` | Faz `curl -sf` sem sessão. Só `/healthz` responde; `/api/envobs/dev`, `/api/envobs/dev/history` e `/api/environments` falham |
| `pod_list`, `resource_usage`, `pod_logs` | O filtro é `grep -i` simples: `a\|b` não casa nada, e filtro sem resultado volta como erro |
| `kubectl` | `;` e `[]` somem do argumento, então `jsonpath` com `range` e `node -e` com mais de uma instrução quebram |

O servidor MCP é `~/.hermes/mcp_servers/attlas-platform/server.mjs`, fora de qualquer repositório.

## O que a task entrega

- Credencial só de leitura para o MCP no Orbit, sem a senha do dono: token com papel de observação, guardado
  em `~/orbit-state/secrets/`, e o `orbit_api` usando ele.
- Filtro por expressão regular estendida e resultado vazio como lista vazia.
- Argumentos do `kubectl` passados sem shell no meio.
- O servidor MCP versionado no repo `orbit`.

## Estado

Planejada. Commits no repo `orbit`.
