---
tags:
  - handoff
date: 2026-10-13
---

# Continuar em 14/10 — CI, dev2 e Orbit

## Feito em 13/10
- CI: token do ci-scaleset trocado (PAT do gestor); 8 runners para PRs + 2 só da develop (`ci-develop`), `cancel-in-progress: false` (#7077).
- dev2 na imagem `53afa500` com o fix do PTZ (#6932).
- PRs mergeadas: #7000, #7077, #7098 (videowall: streams ao criar cena e câmera em estoque), #7099 (queda do Redis não derruba o processo).
- gitops (host atman, `~/gitops-edit`, remoto `~/orbit/state/gitops/attlas-gitops.git`):
  - `485796d` redis-video-analytics: cache LRU 160 MB, sem snapshot, limite 256Mi (era OOMKilled 70x).
  - `d3559c3` chart atman-service 0.7.1: probes com timeout 5s, liveness 6 falhas.
- Orbit (main/master):
  - `5a6a098` Pipelines: rodando e na fila separados.
  - `50052aa` CD automático em ondas (CD_WAVE_SIZE=4, CD_WAVE_TIMEOUT_MS=10min, CD_MIN_INTERVAL_MS=15min, web-attlas por último).

## A verificar primeiro
1. Primeiro deploy em ondas real: o run do ci-develop que inclui #7098/#7099 (`8b42210d` ou posterior). Ver na tela de deploys do Orbit se as ondas avançaram e se o dev2 ficou estável durante.
2. Videowall no dev2: criar cena sem os slots apagarem; câmera em STOCK fora do painel.
3. `ms-video-analytics` sem restarts com o Redis caindo (`kubectl -n attlas-dev get pods`).

## Em andamento (Claude Code, worktrees locais no Mac)
- **Por que todo merge redeploya ~23 serviços — investigado (#7107, só docs).** O build é determinístico. O skip do `push-images.sh` não dispara porque todo backend embute todos os catálogos i18n (`TRANSLATION_CATALOGS`) e o `ErrorCode` compartilhado: qualquer mensagem nova muda o `main.js` de todos.
  **Decisão pendente (Afonso):** cada backend embutir só `core.json` + catálogos do próprio módulo (os que traduzem chaves de outros módulos, como notifications, reports e audit, seguem com todos). Muda a regra do CLAUDE.md e do `contracts.md`, então precisa de spec CROSS. Até lá o CD em ondas segura a estabilidade.
- **Autocorreção no Orbit** — `~/.hermes/cache/scratch/orbit-remed`, branch `feat/auto-remediation`.
  OOMKilled sobe o limite de memória via gitops (x1.5, teto, cooldown); crash loop após onda reverte a tag. Brief: `~/.hermes/cache/scratch/orbit-remed-brief.md`. Falta: revisar, push na main/master e deploy (rsync de console/ para `atman:orbit/console/` + `docker restart orbit`).

## Próximos passos do "ambiente que se ajusta sozinho"
- Ajuste à carga do host: o Orbit lê a carga e reduz a onda / pausa o CD / pausa os simuladores (`asc-simulador-*`, simulação Python ~3 GB) quando o host satura (load chegou a 117 em 8 cores).
- Limites de memória automáticos: VPA em modo recomendação, e o Orbit commita os limites semanalmente.

## Pendências menores
- Runner manual `sumo-manual-restore-01` registrado e parado: remover no GitHub (Settings → Actions → Runners).
- `console/public/index.html` no clone `~/Developer/orbit-src` tem mudanças não commitadas que não são deste trabalho (estilos `cv-fx`, `cv-lat`, `cv-card`): confirmar a origem antes de descartar.
- #5666 (pipeline de CI/CD por serviço) segue em rascunho.
