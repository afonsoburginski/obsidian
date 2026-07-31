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
status: validado; PR #1137 recebeu changes-requested em 29/07, 5 bloqueantes corrigidos no mesmo dia, aguardando re-review
sprint: "[[Attlas - Sprint 26]]"
atualizado: 2026-07-29
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

O relatório detalhado da sessão de validação não foi trazido para o vault; o registro é o resumo abaixo.

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
`cameras/fix/SOFTWARE-2317` — commitados e no PR
[#1137](https://github.com/atmanadmin/attlas-2026/pull/1137) (o PR
[#1102](https://github.com/atmanadmin/attlas-2026/pull/1102), aberto na branch antiga antes da
renomeação, foi fechado como substituído por divergir de histórico):

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

## Achados de uma segunda rodada de clique-a-clique (28/07, cadastro de câmera)

Ainda na branch `cameras/fix/SOFTWARE-2317` (renomeada, sem o sufixo `-cadastro-e2e-fixes`):

- [x] **Sem campo de porta no cadastro** — o Step 1 só tinha IP; o `ipv4Validator` rejeita `:`, então
      uma porta diferente de 80 nunca podia ser informada (havia um badge read-only no Step 2 que só
      mostrava o default). Adicionado campo de porta próprio (Step 1), com máscara só-dígitos
      (`PortMaskDirective`, mesma abordagem do `IpMaskDirective`) — trocado de `z-number-input` pra
      input de texto mascarado por pedido explícito. `buildCameraIpAddress(ip, port)` monta
      `ip:porta` só quando a porta difere do default (80); usado tanto na validação ONVIF (Step 2)
      quanto no payload final de criação — conferido ponta a ponta, uma porta diferente realmente
      conecta nela.
- [x] **Autofill do Chrome/Edge com fundo branco no dark mode (Step 2 — credenciais)** — mesma
      correção já usada no `login-form.css` (box-shadow inset na cor do tema), reaplicada aqui.
- [x] **Sem associação a via/interseção/área/subárea (Step 3 — settings)** — os 3 campos existiam só
      como stubs read-only nunca preenchidos (`"comingSoon"`) e o campo `intersection` nem aparecia
      na tela. Investigado: o backend já modela isso (`Camera.trafficElementId` → Node/interseção em
      `ms-traffic-model`, área/subárea/via derivados) e o front já tinha os serviços prontos
      (`ElementSearchService`, `NodeApiService`, `PolygonService`, `LinkApiService`) usados noutros
      módulos — era só ligação, não feature nova. Adicionado campo de busca de interseção (debounce
      + `GET /topology/search`), que ao selecionar resolve e preenche via/área/subárea
      automaticamente; `trafficElementId` agora viaja no `ICreateCameraRequest` (antes existia no
      contrato e no tratamento de erro `TRAFFIC_ELEMENT_NOT_FOUND`, mas nunca era enviado). Ficou de
      fora: os mesmos 3 campos no modal de mapa em tela cheia (`camera-location-modal`) continuam
      stub — não alimentam o submit, então não bloqueiam.

## Achados de uma terceira rodada (28/07 à noite) — PR [#1137](https://github.com/atmanadmin/attlas-2026/pull/1137)

- [x] **Busca de interseção sem dado nenhum pra digitar** — o campo novo (rodada anterior) exigia
      digitar 2+ caracteres pra buscar, mas o operador não tem como saber nome/identificador de uma
      interseção de antemão — abrir o campo já mostrava "nenhuma interseção encontrada" sem nunca ter
      buscado nada. Trocado o comportamento padrão: ao focar o campo vazio, lista as interseções
      **próximas ao pino já colocado no mapa** (bounding box ~2km em volta de lat/lng), rotulado
      "Interseções próximas ao pino"; sem pino ainda, avisa pra posicionar primeiro. Digitar continua
      fazendo busca full-text normal.
- [x] **Câmera cadastrada e online, mas a lista não atualizava status/última conexão** — root cause:
      `CameraHealthBootstrapService` só inicia o monitoramento de saúde (WS Axis/ONVIF PullPoint) uma
      vez, no boot do `ms-cameras` — nada disparava de novo na criação de uma câmera. Uma câmera
      recém-cadastrada nunca escrevia `CameraOperationalSnapshot` (o que a lista lê pra status/última
      conexão) até o serviço reiniciar, mesmo com o dispositivo de verdade online — conectar e
      desconectar do player ao vivo não tem nenhum efeito nisso (é outra tabela/fluxo). Corrigido:
      `CreateCamerasHandler` agora chama `CameraHealthWorker.startMonitoring()` assim que a câmera
      provisiona com sucesso, igual ao bootstrap já faz pras câmeras existentes.
- [x] **Achado de quebra (relacionado)**: o `communicationPort` do `CameraStreamProfile` derivado no
      cadastro vinha sempre fixo em 80, ignorando a porta real informada no campo novo de porta —
      afetaria qualquer câmera cadastrada numa porta diferente da padrão. Corrigido junto (novo
      `splitCameraIpAddress`, reusado também no bootstrap pra não concatenar porta em cima de um
      `ipAddress` que já pode trazer `:porta` embutido).

## Review da PR #1137 (29/07) — 5 bloqueantes, todos fechados

O review pediu mudanças. Os achados eram concretos e o commit `9330ed47d` fecha todos:

- [x] **3 suítes quebradas** (`cameras.repository.spec`, `create-cameras.handler.spec`,
      `camera-creation-device-step.component.spec`) — todas eram assertivas que ficaram para trás
      dos próprios commits desta PR (o `include` novo no `changeState`, o `ipAddress` default do
      helper `cmd()`, o terceiro input do card). Corrigido o lado do teste nas três — nenhuma era
      bug de produção. Viola a regra dura do `CLAUDE.md`, então era bloqueante mesmo.
- [x] **Migration ausente para a BR-CRUD-009** — a PR introduziu a invariante "IP único entre
      câmeras ativas do tenant" só com checagem de aplicação. O reviewer apontou (corretamente) que
      o ciclo shadow do §[DBM] roda contra um Postgres descartável e não dependia do `infra:up`
      estar de pé, que foi a justificativa que eu tinha usado pra postergar. Criado
      `20260729114417_camera_active_ip_unique` com o índice parcial
      `UNIQUE (systemId, ipAddress) WHERE deletedAt IS NULL` (`CONCURRENTLY`) + o índice btree
      `(systemId, ipAddress)` que o parcial não cobre (serve o branch soft-deleted). Ciclo validado:
      dois `--exit-code 0`, e o diff pós-rollback confirmou que o índice parcial é **invisível** ao
      Prisma — que é exatamente o motivo de o ledger existir.
- [x] **`DBM-DRIFT.md` do ms-cameras estava só com o placeholder** "não mapeado ainda" — preenchido
      com a entrada do índice parcial + nota de que o particionamento semanal de telemetria segue
      não auditado (próximo que tocar aquela área deve classificar).
- [x] **Corrida TOCTOU** — a checagem lê fora da transaction de escrita, então dois submits
      concorrentes (duplo-clique, retry após 5xx, import paralelo) podiam ambos inserir. O índice
      fecha a janela; adicionada a tradução do `P2002` → `CAMERA_DUPLICATE_IP` no create **e** no
      update, com narrow no `meta.target` pra não engolir violação de outra constraint. Teste pros
      dois caminhos.
- [x] **A1 (sugestão, mas era bug real)** — `provisioned-bandwidth-collector` concatenava
      `${ipAddress}:${port}` sem `splitCameraIpAddress`, mesma classe de bug que esta PR já corrigia
      noutros pontos: câmera em porta não-padrão viraria `10.1.1.1:8080:80` na leitura de bitrate.
- [x] **A5** — `MOD-001` atualizado (assinatura do `createMany`, métodos de busca por IP, e seção
      nova descrevendo as duas camadas da BR-CRUD-009: quem garante vs quem tipa o erro).

Gate completo (suíte inteira, não afetados): `ms-cameras` 187 suítes/1437 testes, `web-attlas`
920 suítes/9296 testes, lint 0 erros nos dois, build ok.

Ficaram em aberto os 🟡 não-impeditivos. Os mais relevantes: **A2** (reativação não limpa
`CameraStreamProfile`/PTZ/snapshot da encarnação anterior — câmera reativada pode aparecer online
antes do primeiro heartbeat) e **A4** (autocomplete de interseção inoperável por teclado, o `blur`
fecha o painel antes do foco alcançar as opções). Candidatos a card próprio.
