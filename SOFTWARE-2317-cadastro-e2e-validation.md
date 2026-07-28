# SOFTWARE-2317 - Relatorio de validacao E2E (cadastro de camera)

Task: [[SOFTWARE-2317 - Fluxo E2E de cadastro de câmera]] (Sprint 26).

Validacao manual do fluxo de cadastro de camera (cadastro, validacao de credenciais, edicao,
transicao de estado, remocao) ponta a ponta - dados exibidos vs persistidos no banco. Primeira
leva de QA antes do QA dedicado entrar no time (semana de 2026-08-03). SOFTWARE-2318 (dashboard) e
SOFTWARE-2319 (eventos) sao a mesma leva de trabalho mas ainda nao foram validados nesta sessao.

- Ambiente: local (`nvm 22.22.1` / node 22.23.1 via brew), `ms-cameras` servido direto via `nx serve`.
- Data: 2026-07-27.
- Metodo: chamadas HTTP diretas em `ms-cameras` (porta 3300) cruzadas com `psql` na base
  `attlas_cameras`. Autenticacao: o login via `ms-organization` ficou bloqueado por um problema de
  infra local (ver F1) - contornado assinando um JWT de teste manualmente com o `JWT_SECRET`
  compartilhado (`libs/core-auth`/`JwtSignerService`, claims do usuario Master seed). O fluxo real
  de login/refresh **nao foi exercitado** por essa via.
- Nao testado: sessao HLS com camera transmitindo de verdade (sem hardware/RTSP disponivel no
  ambiente; testado apenas o caminho 409 `STREAM_PROFILE_NOT_CONFIGURED`), e o clique-a-clique pela
  interface `web-attlas` (sem ferramenta de automacao de browser nesta sessao - fica para conferencia
  manual).

## Scorecard (SOFTWARE-2317 + MOD-001-cameras-crud)

| # | Criterio | Veredito | Evidencia |
|---|----------|----------|-----------|
| 1 | `POST /cameras` (batch) -> `lifecycleState=STOCK`, `manufacturerId` resolvido por nome | PASS | Criada camera via `manufacturerId:"Axis"` -> resolveu para o id seedado, `lifecycleState=STOCK`. |
| 2 | Probe ONVIF falho -> soft-fail com `provisioningWarning` | PASS | IP fake -> `provisioningWarning.errorCode=CAMERA_UNREACHABLE`, camera persistida mesmo assim. |
| 3 | Dado da API bate com o banco | PASS | `Camera`, `CameraCredential` conferidos via `psql` - identicos a resposta. |
| 4 | `POST /cameras/validate-credentials`: array vazio -> 400 | PASS | `VALIDATION_FAILED`. |
| 5 | `validate-credentials`: IP inalcancavel -> `ok:false` | PASS | `errorCode=CAMERA_UNREACHABLE`. |
| 6 | `GET /cameras/:id` | PASS | Espelha o banco, `manufacturerName` presente. |
| 7 | `GET /cameras?q=...` (busca livre) | PASS* | *Precisou usar `q=` flat, nao `filters[q]=` - spec desatualizada (F5). |
| 8 | `PATCH /cameras/:id` (update parcial) | PASS | So o campo enviado mudou; `manufacturerName` preservado na resposta. |
| 9 | `PATCH /cameras/:id/state`: transicao invalida (`STOCK->OPERATIONAL`) | PASS | 409 `BUSINESS_RULE_VIOLATION`/`INVALID_STATE_TRANSITION`. |
| 10 | `PATCH .../state`: transicao valida (`STOCK->TESTING`) | PASS/FAIL | 200 e estado mudou, mas resposta veio com `manufacturerName:null` (F4, corrigido). |
| 11 | `GET /cameras/:id/hls` sem `CameraStreamProfile` | PASS | 409 `STREAM_PROFILE_NOT_CONFIGURED`. |
| 12 | `DELETE /cameras/:id` (soft) + `GET` 404 depois + `deletedAt` no banco | PASS | Confirmado nos tres pontos. |

## Achados

### F1 (alto, infra local - nao resolvido) - Kafka local nunca fica saudavel

O container `attlas-kafka` (`confluentinc/cp-kafka:7.0.1`) sobe mas o preflight "Check if Zookeeper
is healthy" nunca completa - o `kafka-init` (que pre-cria os topicos) falha depois de esperar o
broker por 120s. Isso ja acontecia ha 46h (antes desta sessao). `ms-organization` tem fail-fast de
Kafka (decisao recente, ver commit "restaura fail-fast do Kafka") e morre no boot por causa disso,
bloqueando login/JWT reais.

Recriei `kafka`+`zookeeper` do zero (containers + volumes) e o problema persistiu identico - nao e
corrupcao de dado, e algo mais estrutural. Suspeita forte: a imagem `cp-kafka:7.0.1` nao tem build
nativo arm64 (`docker compose up` avisa "requested image's platform (linux/amd64) does not match
... arm64/v8") e roda emulada via Colima/QEMU; o Zookeeper (imagem `zookeeper:3.8.3`, essa sim com
build arm64 nativo) sobe limpo e rapido, so o Kafka trava.

Recomendacao: nao e algo pra resolver sozinho numa sessao de QA - e mudanca de imagem compartilhada
por todo mundo que roda a stack local em Apple Silicon. Vale abrir uma task separada pra trocar a
imagem (`cp-kafka` multi-arch mais nova, ou `apache/kafka`/`bitnami/kafka` nativos arm64) e confirmar
com quem mais desenvolve em M1/M2/M3 se sente o mesmo sintoma.

### F2 (medio, corrigido) - `KAFKA_BROKERS` local do ms-cameras apontava pra porta errada

`apps/ms-cameras/.env` tinha `KAFKA_BROKERS=localhost:1` (deveria ser `localhost:9092`, como no
`.env.example` e no `ms-organization/.env`). Corrigido localmente (arquivo fora do git).

### F3 (alto, corrigido) - boot do ms-cameras travava por minutos com camera offline

`ProvisionedBandwidthCollectorService.onApplicationBootstrap()` fazia `await this.collectAll()`, que
varre TODAS as cameras OPERATIONAL/TESTING **sequencialmente** lendo bitrate via HTTP/VAPIX. Com as
14 cameras seed (IPs fake, nao roteaveis), cada uma estoura timeout antes da proxima rodar, travando
`app.listen()` por varios minutos. O worker irmao (`CameraMediaProfileDiscoveryWorker`) ja tinha sido
corrigido pra isso ("Fire the initial pass without awaiting so boot is not blocked by slow/mute
devices") - esse ficou pra tras. Troquei `await` por `void`, espelhando o padrao do irmao.
Consequencia em producao (nao so local): qualquer boot/restart do `ms-cameras` com camera(s)
lenta(s)/offline atrasa a disponibilidade HTTP do servico inteiro - risco de resiliencia real, nao so
incomodo de dev local.

### F4 (baixo, corrigido) - `PATCH /cameras/:id/state` nao retornava `manufacturerName`

`CamerasRepository.changeState()` fazia o `prisma.camera.update()` sem `include: { manufacturer,
operationalSnapshot }`, diferente de `update()`/`findById()` (que ate tem comentario dizendo pra
espelhar a projecao). Resultado: toda resposta de `PATCH .../state` vinha com `manufacturerName:null`
e sem status de conectividade, embora o dado no banco estivesse correto (nao e corrupcao, e so a
resposta HTTP incompleta). Corrigido replicando o `include`.

### F5 (baixo, corrigido - documentacao) - MOD-001-cameras-crud.md descrevia filtros aninhados que nao existem mais

A spec documentava `GET /cameras?filters[q]=...`, `filters[connectionStatus]=...`,
`filters[lastConnection][startDate/endDate]=...`. A implementacao real (contrato
`IListCamerasFilters`, `ms-cameras` e `web-attlas`, os tres alinhados) usa query flat: `q`,
`connectionStatus` (CSV), `lastConnectionFrom`/`lastConnectionUntil`. O contrato ate documenta
explicitamente "wire flat, sem brackets aninhados" - so a spec do modulo ficou pra tras num refactor
anterior. Corrigi o texto da spec (secoes 3 e 7) pra bater com o real.

## Veredito

Cadastro de camera (SOFTWARE-2317) esta correto ponta a ponta no nivel de API+banco: create,
validate-credentials, get, list (com o filtro certo), update, state transitions e soft-delete
passaram em todos os criterios, e o unico bug real de comportamento encontrado (F4) ja foi corrigido
e reverificado. HLS sem perfil de stream se comporta como esperado (409); nao consegui validar o
caminho feliz de "assistir" de verdade por falta de camera/RTSP real no ambiente.

O que falta pra fechar 100% essa leva de QA: (1) decidir o que fazer com o Kafka local (F1) pra
liberar login real e o clique-a-clique completo no `web-attlas`, e (2) alguem passar pela UI de fato
(cadastro/edicao/assistir via navegador) - essa parte ficou fora do alcance desta sessao.
