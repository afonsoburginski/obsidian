---
tags:
  - attlas
  - sprint-26
  - task
  - cameras
  - qa
card: SOFTWARE-2317
clickup: https://app.clickup.com/t/86ajpntyc
titulo: "[QA] Fluxo E2E de câmera — cadastro, validação, player e edição (dados vs banco)"
frente: Cadastro/CRUD
tamanho: a estimar
status: validado
sprint: "[[Attlas - Sprint 26]]"
atualizado: 2026-07-27
---

# Fluxo E2E de cadastro de câmera

> Validação manual ponta a ponta do fluxo de câmera: cadastro, validação de credenciais, assistir
> (player), editar. Conferir se o estado exibido bate com o banco (`ms-cameras`). Insumo pro
> relatório de QA repassado ao QA que entra semana que vem (~03/08).

## Objetivo

Validar cadastro, validate-credentials, listagem/get, edição, transição de estado, sessão HLS e
remoção de câmera — dado exibido vs persistido no Postgres — e corrigir ajustes pontuais encontrados
no caminho.

## Resultado

Relatório completo: [[SOFTWARE-2317-cadastro-e2e-validation]].

Todos os critérios de aceitação passaram (create, validate-credentials, get, list, update, state
transitions, HLS sem stream profile, soft-delete). 3 bugs de código encontrados e corrigidos:

- `KAFKA_BROKERS` errado no `.env` local do `ms-cameras` (`localhost:1` → `localhost:9092`).
- `ProvisionedBandwidthCollectorService` travava o boot do serviço por minutos com câmeras
  offline/lentas (`await` sequencial virou `void`, igual ao worker irmão).
- `PATCH /cameras/:id/state` não retornava `manufacturerName` (faltava `include` no repositório).

Mais 1 doc corrigida: `MOD-001-cameras-crud.md` descrevia filtros de query aninhados
(`filters[q]=...`) que não existem mais na implementação real (query flat).

## Pendências

- [ ] Kafka local não sobe (possível imagem `cp-kafka` emulada em arm64/Colima) — bloqueia login
      real via `ms-organization` e o clique-a-clique completo no `web-attlas`. Ver
      `local_dev_machine_setup` (memória) — decisão de infra pendente.
- [ ] Validar "assistir" (HLS) com câmera transmitindo de verdade — sem hardware/RTSP disponível
      neste ambiente, só o caminho 409 foi validado.
- [ ] Clique-a-clique no `web-attlas` (cadastro/edição/player pela interface) — sessão sem
      ferramenta de browser; front confirmado compilando e com proxy correto pro `ms-cameras`.
