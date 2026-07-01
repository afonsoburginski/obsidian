---
tags:
  - home
---

# Home

Vault focado em: **sprint**, **report diario**, **documentacao de Kubernetes** e **streaming de cameras**.

## Acesso rapido

- [[Attlas - Sprint 22]] - to-do da sprint atual
- [[2026-06-26|Report de hoje]]
- [[00 - Indice|Kubernetes / Infra - indice]]
- [[Docs/Streaming/00 - Indice|Streaming de cameras - indice]]

## Estrutura

| Pasta | Para que serve |
| --- | --- |
| `Sprint` | To-do da sprint, organizado por frente, com checkbox `- [ ]`. |
| `Reports` | Report diario (um por dia) + o modelo `Report diario`. Estrutura fixa: em andamento / iniciadas ontem / revisadas. Cola no Slack. |
| `Docs/Kubernetes` | Documentacao de infra/K8s puxada do repo (visao geral, dimensionamento, producao, CI/CD, helm, terraform, KEDA). |
| `Docs/Streaming` | Pipeline de video das cameras puxado do ms-cameras (HLS, WebRTC/WHEP, mediamtx, ffmpeg) + diagnostico do travamento no WebRTC. |

## To-dos abertos da sprint

Requer o plugin **Tasks** (voce ja instalou).

```tasks
not done
path includes Sprint
group by heading
```

## Como gerar o report do dia

Comando **Daily notes: Open today's note** (ja configurado pra cair em `Reports/` com o template). Depois preencha os PRs com `gh pr view` / reviews.
