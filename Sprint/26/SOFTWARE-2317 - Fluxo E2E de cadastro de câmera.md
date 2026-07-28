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
- [x] Clique-a-clique no `web-attlas` (cadastro/edição/player pela interface) — feito em 28/07
      (EC2 dev.v2, instância única). 3 achados novos no player ao vivo, ver abaixo.

## Achados do clique-a-clique (28/07)

Clique-a-clique real na tela de vídeo ao vivo (câmera-detail). Todos os 3 corrigidos na branch
`cameras/fix/SOFTWARE-2317-cadastro-e2e-fixes` (PR #1102), commitados localmente:

- [x] **Número de sessões e bitrate ao vivo não aparecem** — `CameraHealthSummaryComponent` buscava
      os health metrics uma única vez no load da câmera, antes do usuário dar play, e nunca refazia
      a busca depois — ficava preso no snapshot pré-stream (0 sessões, bitrate vazio) mesmo com o
      player rodando. Não é bug de réplica/Kafka (confirmado single-instance). Fix: refetch + polling
      de 15s enquanto `streaming()` está ativo.
- [x] **Em tela cheia, controles do player somem** — 2 causas: (1) o joystick PTZ é renderizado como
      *sibling* do player (`ptzInline=false`, deliberado desde SOFTWARE-1659 pra permitir arrastar
      pela tela toda), fora da subárvore do elemento em fullscreen nativo — fix: fecha o PTZ ao
      entrar em fullscreen; (2) os dropdowns de perfil/resolução/overflow usam CDK Overlay que por
      padrão anexa em `document.body`, também fora do fullscreen — fix: `FullscreenOverlayContainer`
      do CDK em todo o app.
- [x] **Soft-delete + reaproveitar IP/porta** — não havia nenhuma checagem de unicidade de
      `ipAddress` (nem schema, nem app), então duas câmeras ativas podiam ter o mesmo IP. Ajustado
      pra bater com o que o front já esperava (`CAMERA_DUPLICATE_IP`, nunca implementado no
      backend): cadastro/edição rejeitam IP já ativo em outra câmera; se o IP bate com uma câmera
      **soft-deleted**, reativa esse registro em vez de duplicar (preserva histórico). Falta ainda
      o índice único parcial no Postgres (`ipAddress WHERE deletedAt IS NULL`) — não deu pra rodar
      o ciclo de migration porque a infra local estava parada; a checagem de aplicação já cobre o
      fluxo normal via API.
