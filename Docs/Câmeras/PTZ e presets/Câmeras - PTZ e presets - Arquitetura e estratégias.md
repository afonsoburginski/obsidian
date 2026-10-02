---
tags:
  - doc
  - ms-cameras
  - ptz
atualizado: 2026-10-01
aliases:
  - "PTZ e presets - Arquitetura e estratégias"
---

# Câmeras - PTZ e presets - Arquitetura e estratégias

Parte de [[Câmeras - PTZ e presets]]. Caminhos relativos a `apps/ms-cameras/src/` quando não começam por `apps/` ou
`libs/`. Protocolos e drivers em [[Câmeras - Integração com dispositivo]].

## Rotas

Prefixo `/api`, todas em `cameras/cameras.controller.ts`. A classe exige pertencimento ao sistema
(`@RequireSystemDuty()`), toda rota confere que a câmera é do `System-Id` (`assertCameraInSystem`, 404) e as
de escrita declaram a chave que o `ms-organization` avalia antes do handler. `operatorId` é o `subject` do JWT.

| Método | Rota | Ação | Chave | Status |
| --- | --- | --- | --- | --- |
| `POST` | `/cameras/:id/ptz` | Movimento relativo (nenhuma tela usa) | `cameras.ptz:control` | 204 |
| `POST` | `/cameras/:id/ptz/absolute` | Absoluto ONVIF normalizado; sem pan e tilt vira zoom absoluto por VAPIX | `cameras.ptz:control` | 204 |
| `POST` | `/cameras/:id/ptz/continuous` | Contínuo, com velocidade e timeout | `cameras.ptz:control` | 204 |
| `POST` | `/cameras/:id/ptz/stop` | Para pan e tilt e o zoom | `cameras.ptz:control` | 204 |
| `GET` | `/cameras/:id/presets` | Lista presets, com `snapshotCapturedAt` | - | 200 |
| `POST` | `/cameras/:id/presets` | Cria preset com nome e posição no corpo | `cameras.ptzPreset:manage` | 201 |
| `PATCH` | `/cameras/:id/presets/:presetId` | Edita preset | `cameras.ptzPreset:manage` | 200 |
| `DELETE` | `/cameras/:id/presets/:presetId` | Remove preset; 409 `CAMERA_PRESET_IN_USE` se um tour o usa | `cameras.ptzPreset:manage` | 204 |
| `POST` | `/cameras/:id/presets/:presetId/goto` | Leva a câmera ao preset (VAPIX absoluto) | `cameras.ptz:control` | 204 |
| `POST` | `/cameras/:id/presets/:presetId/snapshot` | Vai ao preset, captura o enquadramento, vincula as regiões do analítico | `cameras.ptzPreset:manage` e `cameras.ptz:control` (as duas) | 201 |
| `GET` | `/cameras/:id/presets/:presetId/snapshot` | JPEG do enquadramento guardado | - | 200 |
| `GET` | `/cameras/:id/presets/:presetId/regions` | Regiões do analítico vinculadas ao preset | - | 200 |
| `GET` | `/cameras/:id/automations` | Lista tours | - | 200 |
| `POST` | `/cameras/:id/automations` | Cria tour | `cameras.automation:manage` | 201 |
| `PUT` | `/cameras/:id/automations/:automationId` | Substitui tour (nome, ordem, intervalo, passos) | `cameras.automation:manage` | 200 |
| `PATCH` | `/cameras/:id/automations/:automationId/toggle` | Liga ou desliga (`isActive`); ligar pede também `cameras.ptz:control` no handler | `cameras.automation:manage` | 200 |
| `DELETE` | `/cameras/:id/automations/:automationId` | Remove tour | `cameras.automation:manage` | 204 |

Faixas dos comandos (`libs/contracts/src/lib/camera/ptz-command-validation.ts`): pan e tilt de -1 a 1, zoom
absoluto de 0 a 1, zoom contínuo com sinal de -1 a 1, velocidade de 0 a 1 (default 0,5), `timeoutSeconds` de 1
a 60 (teto em tempo de execução, default 30). Faixas do preset (`CameraValidation.preset` em
`camera.validation.ts`): nome de 1 a 64 caracteres, pan e tilt de -180 a 180 graus, zoom de 0 a 100%.

Kafka: consome `attlas.execution-plans.ptz-command` e responde em `attlas.cameras.ptz-command-executed` ou
`attlas.cameras.ptz-command-rejected`. `attlas.emergencies.ptz-command` está só declarado em
`libs/contracts/src/lib/camera/cameras-topics.constant.ts`, sem consumidor.

## Handlers e serviços

| Tipo | Handler (`cameras/handlers/`) | Papel |
| --- | --- | --- |
| Command | `move-relative-ptz-camera` | `PTZAction` por eixo, passo fixo (magnitude ignorada), ONVIF |
| Command | `move-absolute-ptz-camera` | Absoluto ONVIF com pan e tilt; só zoom desvia para VAPIX; pan sem tilt, ou o inverso, é `PTZ_PARTIAL_COORDINATE` |
| Command | `move-continuous-ptz-camera` | Contínuo ONVIF; só zoom desvia para VAPIX; valida o teto do timeout |
| Command | `stop-ptz-camera` | Zoom stop por VAPIX e pan e tilt stop por ONVIF (câmera fixa, `CAMERA_NOT_PTZ`, é ignorada); renova a sessão de controle |
| Command | `create-preset`, `update-preset`, `delete-preset` | CRUD; mudar a posição ou remover apaga o enquadramento e as regiões vinculadas |
| Command | `go-to-preset` | Lê o preset e chama `executeVapixAbsolute` |
| Command | `capture-preset-snapshot` | UC-060: goto, captura, grava no object storage, vincula regiões |
| Command | `create-automation`, `update-automation`, `delete-automation` | CRUD de tours |
| Command | `toggle-automation` | Liga ou desliga e dirige o `TourRunnerService`; também é o alvo de `tour-start` e `tour-stop` do plano |
| Query | `list-presets`, `list-automations`, `list-preset-regions` | Leitura |

Serviços: `cameras/services/ptz.service.ts` (pipelines e linha `PTZ_COMMAND`), `tour-runner.service.ts`,
`helpers/ptz-guards.helper.ts` e `ptz-capability.helper.ts`, `preset-region-sync.service.ts` e
`preset-snapshot-reader.service.ts`, `shared/audit/ptz-session.recorder.ts` e
`cameras/workers/ptz-session-expiry.worker.ts`, e `events/consumers/execution-plans-ptz-command/`.

## Persistência

Schema em `database/schema/ptz/`; repositórios `cameras/repositories/presets.repository.ts` e
`automations.repository.ts`.

| Model | Campos | Notas |
| --- | --- | --- |
| `CameraPtzPreset` | `panDegrees` e `tiltDegrees` `Decimal(6,3)`, `zoomLevel` `Decimal(5,2)` em %, `isDefault`, `sortOrder`, `snapshotStorageKey`, `snapshotCapturedAt` | Posição em graus nativos; `onDelete: Cascade` com a câmera; `CameraAnalyticRegion.presetId` aponta para ele com `SetNull` |
| `CameraPtzTour` | `isActive`, `randomOrder`, `intervalMinutes`, `repeatCount` | `repeatCount` é gravado como 0 e não é usado; `intervalMinutes` é a espera entre passadas |
| `CameraPtzTourStep` | `presetId`, `dwellTimeSeconds`, `transitionSeconds`, `speedPercent`, `sortOrder` | `onDelete: Restrict` no preset; `(tourId, sortOrder)` é índice comum |

A posição PTZ observada fica em `CameraOperationalSnapshot` (`ptzPan`, `ptzTilt`, `ptzZoom`).

## Dois caminhos de execução

O `PtzService` escolhe o caminho pelo tipo de comando, não pelo fabricante.

### ONVIF (`executeOnvifPtz`)

Movimento relativo, absoluto com pan e tilt, contínuo de pan e tilt e stop de pan e tilt, em coordenadas
normalizadas de -1 a 1. Cada handler valida o próprio payload antes (`PTZ_FIELDS_REQUIRED`,
`PTZ_VELOCITY_OUT_OF_RANGE`, `PTZ_PARTIAL_COORDINATE`, `PTZ_TIMEOUT_OUT_OF_RANGE`, `PTZ_STOP_NO_AXIS`).

1. `findForPtz`: câmera não removida, credencial, perfil PRIMARY; ausente, 404.
2. Guards (`ptz-guards.helper.ts`), antes de qualquer I/O: protocolo ONVIF (`PTZ_REQUIRES_ONVIF`); câmera
   capaz de PTZ (`CAMERA_NOT_PTZ`), que aceita o `physicalCameraKind` PTZ e também a câmera fixa com
   `ptz: true` em `analyticsCapabilities`, o PTZ digital de BR-CRUD-005; `mediaProfileToken`
   (`PTZ_NOT_SUPPORTED`); credencial (`CAMERA_CREDENTIAL_MISSING`).
3. Driver por operação, connect, comandos em sequência e disconnect, cada passo sob timeout; estouro vira
   `CAMERA_UNREACHABLE`.
4. Uma linha `PTZ_COMMAND` em `CameraEventLog`.
5. De volta no handler, o comando entra na sessão de controle da auditoria, depois do movimento, para comando
   recusado não abrir sessão.

### VAPIX (Axis)

Goto de preset, passos de tour e zoom (contínuo, stop e absoluto sem pan e tilt), em unidades nativas
(graus e zoom de 1 a 9999), exatamente como o preset guarda. `loadForVapix` só exige câmera e credencial.

| Método | Utilitário | Uso | Linha `PTZ_COMMAND` |
| --- | --- | --- | --- |
| `executeVapixAbsolute` | `vapixAbsolutePtz` | goto e passo de tour | `ABSOLUTE` |
| `executeVapixAbsoluteZoom` | `vapixAbsoluteZoom` | absoluto só de zoom, o slider da tela | `ABSOLUTE` |
| `executeVapixZoom` | `vapixContinuousZoom` | contínuo só de zoom, funciona em câmera fixa com zoom óptico | `CONTINUOUS_START` |
| `executeVapixZoomStop` | `vapixZoomStop` | stop de zoom, best-effort | nenhuma |

> [!note] Dois espaços de coordenadas
> `/ptz/absolute` com pan e tilt recebe normalizado e vai por ONVIF; o goto usa graus nativos por VAPIX. O
> absoluto sem pan e tilt vai por VAPIX porque o `AbsoluteMove` ONVIF não é confiável nas Axis em uso,
> segundo o handler; o comentário do DTO (`cameras/dtos/move-absolute-ptz-camera.dto.ts`) ainda diz ONVIF,
> e quem decide é o handler.

## Autorização (RF-INT-06, RNF-CAM-08)

A autorização fica onde o gesto entra:

1. **Pertencimento**: `@RequireSystemDuty()` na classe.
2. **Chave da rota**: `@RequirePermission`, avaliado pelo `JwtClaimsGuard` contra o `ms-organization` (chaves em
   `libs/contracts/src/lib/permissions/catalog/cameras.ts`, escopo espacial pelo `:id`,
   `targetResourceType: 'device'`). Negação é 403; avaliador fora do ar é 503
   `PERMISSION_RESOLVER_UNAVAILABLE`, e nada se move. Toda rota que move a câmera pede `cameras.ptz:control`
   (CROSS-160), inclusive a captura de enquadramento, que move antes de capturar.
3. **Escopo da câmera**: `assertCameraInSystem`.
4. **Ativação de tour**: a rota pede `cameras.automation:manage`; ao ligar com operador, o
   `ToggleAutomationHandler` pergunta também `cameras.ptz:control` ao `PermissionResolver` do `core-auth`, uma
   vez, antes de gravar, porque o tour roda depois sem operador. Desligar não pede, porque para o equipamento.

Consequências:

- Os passos seguintes do tour não checam nada, para uma sessão que expira não abortar um tour longo.
- O caminho de plano de resposta (Kafka) não tem JWT e não passa por essas camadas; quem autoriza é o motor de
  planos, e o listener faz a própria guarda de sistema.

> [!warning] Preempção por prioridade não existe no caminho do PTZ
> As portas são allow ou deny. Não há prioridade, sessão exclusiva nem cessão de controle entre operadores.
> As peças existem fora daqui e ninguém do PTZ as liga: as chaves `cameras.ptz:preempt` e
> `cameras.ptz:release` no catálogo, o `ResourceLockType.PTZ` com TTL de 120 s no `ms-organization`
> (`apps/ms-organization/src/permissions/locks/`) e o tópico `attlas.cameras.ptz-preempted`, que o
> `ms-execution-plans` consome e o `ms-cameras` não publica. No frontend, o `ResourceLockService` só é usado no
> modo tempo real de controladores.

## Reposicionamento por Emergências (RF-INT-04)

Não implementado. `attlas.emergencies.ptz-command` está nos contratos e em `docker/kafka-topics.list`, mas
nenhum código do `ms-cameras` o consome; prioridade máxima e preempção da sessão do operador não existem. O
único caminho automático de PTZ é o de plano de resposta, sem prioridade sobre o operador.

## Comando por plano de resposta (PROJ-015)

`events/consumers/execution-plans-ptz-command/execution-plans-ptz-command.listener.ts` consome
`attlas.execution-plans.ptz-command`:

- Três verbos em `params.command` (`libs/contracts/src/lib/execution-plans/ptz-command-params.constant.ts`):
  `move-to-preset` com `presetId` vira `GoToPresetCommand`; `tour-start` e `tour-stop` com `automationId` viram
  `ToggleAutomationCommand.forEngine`. Outro formato: rejeitado com `EXECUTION_PLANS_PTZ_UNSUPPORTED_PARAMS`.
  Sem `commandId` ou `cameraId`: descartado sem eco.
- Guarda de sistema: sem `systemId`, ou câmera de outro sistema, rejeitado com
  `EXECUTION_PLANS_PTZ_CROSS_TENANT` antes de tocar o equipamento.
- Sem JWT: `operatorId` nulo, nenhuma checagem de permissão.
- Ledger de reentrega (BR-PTZ-LEDGER): a chave Redis `ms-cameras:ptz-command:<commandId>`, com TTL de 1 h,
  marca que o comando chegou ao equipamento, e uma reentrega só republica o eco. Redis fora lê como não
  executado e a câmera se move de novo; um `tour-start` reentregue com outro `commandId` depois de um
  `tour-stop` não é coberto.
- Eco em `attlas.cameras.ptz-command-executed` ou `-rejected`, `eventId` UUID v5 do `commandId`, chave de
  partição igual ao `commandId`. Não é best-effort: `CameraEventsPublisher.publishOrThrow` espera até 20 s e,
  se falha, derruba o handler para o Kafka reentregar; o ledger impede o movimento repetido.
- Auditoria no listener: `CAMERA_PTZ_COMMANDED`, `CAMERA_PTZ_TOUR_STARTED` ou `CAMERA_PTZ_TOUR_STOPPED`, ator de
  sistema, plano no payload, sem coordenadas. Por isso `GoToPresetHandler` e `ToggleAutomationHandler` não
  auditam com `operatorId` nulo.

## Tour

`cameras/services/tour-runner.service.ts`, agendador em processo que percorre os passos por `executeVapixAbsolute`.

- Ligar inicia um laço contínuo; `intervalMinutes` é a espera entre uma passada completa e a próxima (0 emenda).
  O laço para ao desligar, ao remover, desativar ou esvaziar o tour (relido antes de cada passada depois da
  primeira), numa passada sem nenhum movimento, pelo circuit-breaker ou no shutdown.
- Uma ativa por câmera: ativar desativa os outros tours numa transação com `pg_advisory_xact_lock`
  (`activateExclusive`) e cancela o laço anterior da câmera.
- Circuit-breaker: 3 falhas seguidas abortam o tour e gravam `PTZ_COMMAND` com subType `AUTOMATION_ABORTED`
  (WARN). Passo com preset inexistente é pulado sem contar falha; passada só de pulos encerra o tour.
- `randomOrder` embaralha os passos a cada passada; `dwellTimeSeconds` mais `transitionSeconds` dão a espera
  entre passos, interrompível.
- Parou por conta própria, o runner grava `isActive=false`.
- Limitação: roda na memória do processo; restart perde os tours em voo, e o shutdown grava `isActive=false`
  para o banco não anunciar tour que não roda.

## Rastreabilidade (RNF-CAM-06)

Dois registros com papéis diferentes.

**`CameraEventLog`, uma linha por comando executado** (`events/recording/camera-event-log.repository.ts`):
`eventType=PTZ_COMMAND`, `subType` em `ABSOLUTE`, `RELATIVE`, `CONTINUOUS_START`, `CONTINUOUS_STOP` ou
`AUTOMATION_ABORTED`, severidade, resumo, payload com eixos e velocidade, `operatorId` (nulo no plano) e
`occurredAt`. O stop de zoom não grava linha. Alimenta o log de eventos da câmera
([[Câmeras - Eventos, incidentes e alarmes]]).

**Auditoria da plataforma, um fato por gesto** (`attlas.audit.cameras`):

- Sessão de controle (UC-070): os quatro movimentos registram o comando numa sessão por câmera e ator no Redis
  (`cameras:audit:ptz-session:<cameraId>:<ator>`, com índice ordenado), em `shared/audit/ptz-session.store.ts`
  e `ptz-session.recorder.ts`. Só o primeiro comando emite `CAMERA_PTZ_SESSION_STARTED`; os seguintes renovam;
  o stop renova sem abrir. O `PtzSessionExpiryWorker` (cron por minuto) fecha a sessão parada há mais de 120 s
  e emite `CAMERA_PTZ_SESSION_ENDED` com contagem e duração; o `ZREM` do índice garante um emissor só entre
  réplicas. Redis fora custa a trilha, nunca o comando.
- Presets e tours (UC-068): `CAMERA_PTZ_PRESET_CREATED`, `_UPDATED` (com `framingMoved` e o diff), `_DELETED`,
  `_RECALLED` (goto humano, fora da sessão), `_SNAPSHOT_CAPTURED` e `CAMERA_AUTOMATION_TOGGLED` (só quando o
  estado muda e só pela rota humana). Criar, editar e remover preset e ligar ou desligar tour também notificam
  (`cameras.ptzPreset.changed`, `cameras.automation.changed`).
- Nenhum payload leva pan, tilt ou zoom: a trilha responde autoria, não para onde a câmera apontou.

> [!warning] Lacuna de trilha
> Criar, substituir e remover tour não deixam registro na auditoria nem no `CameraEventLog`, só log de
> aplicação; a UC-068 deixa esses três gestos fora do escopo dela.

## Posição PTZ ao vivo

Lida pelo worker de saúde, não pelo caminho de comando, e só em Axis:

- Quando o tópico `Move/Channel_1` do WebSocket de eventos reporta `is_moving=1`,
  `health/workers/camera-health.worker.ts` inicia `startPtzTrackLoop`, que lê
  `GET /axis-cgi/com/ptz.cgi?query=position` (`health/utils/fetch-axis-ptz-position.utils.ts`) a cada
  `PTZ_TRACK_INTERVAL_MS` (750 ms, piso de 500 ms), uma leitura só depois da outra. Em `is_moving=0`, e no
  evento de PTZ pronto, lê a posição final uma vez.
- Posição inalterada não grava nem transmite.
- Grava em `CameraOperationalSnapshot` e publica `CameraPtzPositionChangedEvent`, que
  `cameras/realtime/camera-ptz-position.events-handler.ts` transmite como `camera:ptz:position` na sala
  `camera:<id>`; como a conexão é uma por equipamento, o evento sai para cada linha `Camera` do mesmo
  equipamento.
- No frontend, `CameraLiveStatusService.watchPtzPosition` (semeado por `camera:status:snapshot`) alimenta o
  indicador do controle PTZ e é a posição que o painel de presets grava. Canal ao vivo em
  [[Câmeras - Saúde e monitoramento]].

## Enquadramento do preset e regiões do analítico (UC-060)

- **Captura**: despacha o mesmo `GoToPresetCommand` do goto, espera `PresetSnapshotCapture.PTZ_SETTLE_MS`
  (3 s), busca um quadro em resolução cheia pelo `CameraThumbnailService` (sem quadro,
  `CAMERA_STREAM_UNAVAILABLE`), grava o JPEG pelo `@attlas/core-storage` em
  `camera-preset-snapshot/<cameraId>/<presetId>.jpg` (sobrescrito, sem histórico) e anota a chave e o instante
  no preset. Por fim vincula ao preset as regiões do analítico ATSPM lidas do equipamento
  (`preset-region-sync.service.ts`), em best-effort: equipamento mudo devolve `regionsSynced: 0` sem desfazer a
  captura.
- **Leitura**: `GET .../snapshot` serve o JPEG (404 sem captura); `GET .../regions?analyticType=` lê do cache
  local as regiões com `presetId` do preset, sem falar com o equipamento.
- **Invalidação**: mudar pan, tilt ou zoom apaga o enquadramento, o objeto e as regiões vinculadas; remover o
  preset apaga regiões e objeto.
- **Quem usa**: a tela de Detecção do Analítico, não o painel de presets da câmera (ver [[Analítico]]).
