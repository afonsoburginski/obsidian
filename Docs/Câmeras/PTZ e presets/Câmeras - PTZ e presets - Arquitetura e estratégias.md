---
tags:
  - doc
  - cameras
  - ptz
  - ms-cameras
aliases:
  - "PTZ e presets - Arquitetura e estratégias"
atualizado: 2026-10-07
---

# Câmeras - PTZ e presets - Arquitetura e estratégias

Volta para [[Câmeras - PTZ e presets]].

## Resumo

O comando PTZ entra por três portas: rota HTTP do operador, Kafka do `ms-execution-plans` e o tour em
execução. O `PtzService` escolhe o caminho pelo tipo de comando, não pelo fabricante. Movimento em coordenadas
normalizadas vai por ONVIF, numa sessão de controle mantida aberta por câmera. Ir para preset, passo de tour e
zoom vão por VAPIX, em graus e unidades nativas da Axis. A autorização fica onde o gesto entra, e cada comando
executado grava uma linha `PTZ_COMMAND`. O tour roda em uma réplica por vez, guardada por lease no Redis, e
sobrevive a deploy e restart. Os protocolos estão em [[Câmeras - Integração com dispositivo]].

## Onde está no código

Caminhos relativos a `apps/ms-cameras/src/` quando não começam por `apps/` ou `libs/`.

| Caminho | Papel |
| --- | --- |
| `cameras/cameras.controller.ts` | Rotas de PTZ, presets e automações |
| `cameras/handlers/move-relative-ptz-camera/` | Relativo das setas: `PTZAction` por eixo, passo fixo, magnitude ignorada, ONVIF |
| `cameras/handlers/move-absolute-ptz-camera/` | Absoluto ONVIF com pan e tilt; só zoom desvia para VAPIX; pan sem tilt, ou o inverso, é `PTZ_PARTIAL_COORDINATE` |
| `cameras/handlers/move-continuous-ptz-camera/` | Contínuo ONVIF; só zoom desvia para VAPIX; aplica o teto do `timeoutSeconds` |
| `cameras/handlers/stop-ptz-camera/` | Para o zoom por VAPIX e pan e tilt por ONVIF; câmera fixa (`CAMERA_NOT_PTZ`) é ignorada; renova a sessão de auditoria |
| `cameras/handlers/move-ptz-by-delta/` | Relativo do plano de resposta: deltas em graus e porcentagem viram translação ONVIF |
| `cameras/handlers/create-preset/`, `update-preset/`, `delete-preset/` | CRUD de preset; mudar a posição ou remover apaga o enquadramento e as regiões vinculadas |
| `cameras/handlers/go-to-preset/` | Lê o preset e chama `executeVapixAbsolute` |
| `cameras/handlers/capture-preset-snapshot/` | Vai ao preset, captura o enquadramento, grava no object storage e vincula regiões |
| `cameras/handlers/create-automation/`, `update-automation/`, `delete-automation/` | CRUD de tours |
| `cameras/handlers/toggle-automation/` | Liga ou desliga e dirige o `TourRunnerService`; também atende `tour-start` e `tour-stop` do plano |
| `cameras/handlers/list-presets/`, `list-automations/`, `list-preset-regions/` | Leituras |
| `cameras/services/ptz.service.ts` | Caminhos ONVIF e VAPIX e a linha `PTZ_COMMAND` |
| `cameras/services/ptz-driver-pool.service.ts` | Sessão ONVIF de controle aberta por câmera entre comandos |
| `cameras/services/tour-runner.service.ts`, `tour-leases.service.ts`, `tour-lease.constants.ts` | Execução do tour e o lease que garante uma réplica por tour |
| `cameras/helpers/ptz-guards.helper.ts`, `ptz-capability.helper.ts` | Guards antes de qualquer I/O |
| `cameras/services/preset-region-sync.service.ts`, `preset-snapshot-reader.service.ts` | Regiões do analítico vinculadas ao preset e leitura do JPEG |
| `shared/audit/ptz-session.recorder.ts`, `ptz-session.store.ts`, `cameras/workers/ptz-session-expiry.worker.ts` | Sessão de controle da auditoria |
| `events/consumers/execution-plans-ptz-command/` | Comando de plano de resposta, ledger de reentrega e auditoria |
| `internal-api/resources/` | Presets e tours da câmera para a busca de recurso do `ms-execution-plans` |
| `cameras/realtime/camera-ptz-position.events-handler.ts` | Transmite `camera:ptz:position` |
| `health/utils/fetch-axis-ptz-position.utils.ts` | Lê a posição PTZ atual da Axis |
| `libs/contracts/src/lib/camera/ptz-command-validation.ts`, `camera.validation.ts` | Faixas dos comandos, do preset e do movimento relativo por plano |
| `libs/contracts/src/lib/execution-plans/ptz-command-params.constant.ts` | Verbos aceitos no comando de plano |
| `libs/contracts/src/lib/permissions/catalog/cameras.ts` | Chaves de permissão de câmeras |

## Contratos

### Rotas

Prefixo `/api`. A classe exige pertencimento ao sistema (`@RequireSystemDuty()`), toda rota confere que a câmera
é do `System-Id` (`assertCameraInSystem`, 404), e as de escrita declaram a chave que o `ms-organization` avalia
antes do handler. `operatorId` é o `subject` do JWT.

| Método | Rota | Ação | Permissão | Status |
| --- | --- | --- | --- | --- |
| `POST` | `/cameras/:id/ptz` | Movimento relativo; nenhuma tela usa | `cameras.ptz:control` | 204 |
| `POST` | `/cameras/:id/ptz/absolute` | Absoluto ONVIF normalizado; sem pan e tilt vira zoom absoluto por VAPIX | `cameras.ptz:control` | 204 |
| `POST` | `/cameras/:id/ptz/continuous` | Contínuo, com velocidade e `timeoutSeconds` | `cameras.ptz:control` | 204 |
| `POST` | `/cameras/:id/ptz/stop` | Para pan e tilt e o zoom | `cameras.ptz:control` | 204 |
| `GET` | `/cameras/:id/presets` | Lista presets, com `snapshotCapturedAt` | pertencimento | 200 |
| `POST` | `/cameras/:id/presets` | Cria preset com nome e posição no corpo | `cameras.ptzPreset:manage` | 201 |
| `PATCH` | `/cameras/:id/presets/:presetId` | Edita preset | `cameras.ptzPreset:manage` | 200 |
| `DELETE` | `/cameras/:id/presets/:presetId` | Remove preset; 409 `CAMERA_PRESET_IN_USE` se um tour o usa | `cameras.ptzPreset:manage` | 204 |
| `POST` | `/cameras/:id/presets/:presetId/goto` | Leva a câmera ao preset por VAPIX absoluto | `cameras.ptz:control` | 204 |
| `POST` | `/cameras/:id/presets/:presetId/snapshot` | Vai ao preset, captura o enquadramento e vincula as regiões do analítico | `cameras.ptzPreset:manage` e `cameras.ptz:control` | 201 |
| `GET` | `/cameras/:id/presets/:presetId/snapshot` | JPEG do enquadramento guardado | pertencimento | 200 |
| `GET` | `/cameras/:id/presets/:presetId/regions` | Regiões do analítico vinculadas ao preset | pertencimento | 200 |
| `GET` | `/cameras/:id/automations` | Lista tours | pertencimento | 200 |
| `POST` | `/cameras/:id/automations` | Cria tour | `cameras.automation:manage` | 201 |
| `PUT` | `/cameras/:id/automations/:automationId` | Substitui tour (nome, ordem, intervalo, passos) | `cameras.automation:manage` | 200 |
| `PATCH` | `/cameras/:id/automations/:automationId/toggle` | Liga ou desliga (`isActive`); ligar pede também `cameras.ptz:control` no handler | `cameras.automation:manage` | 200 |
| `DELETE` | `/cameras/:id/automations/:automationId` | Remove tour | `cameras.automation:manage` | 204 |
| `GET` | `/internal/cameras/:id/resources?systemId=` | Presets e tours da câmera, cada um com `kind` (`preset` ou `tour`), para o `ms-execution-plans` | `InternalServiceTokenGuard` | 200 |

Faixas dos comandos (`PtzCommandValidation`): pan e tilt de -1 a 1; zoom absoluto de 0 a 1; zoom contínuo com
sinal, de -1 a 1; velocidade de 0 a 1, padrão 0,5; `timeoutSeconds` de 1 a 60, com teto de execução padrão de 30.
Faixas do preset (`CameraValidation.preset`): nome de 1 a 64 caracteres, pan e tilt de -180 a 180 graus, zoom de
0 a 100%. Faixas do relativo por plano (`CameraValidation.relativeMove`): pan e tilt de -180 a 180 graus, zoom
de -100 a 100%.

### Tópicos Kafka

| Direção | Tópico | Papel |
| --- | --- | --- |
| Consome | `attlas.execution-plans.ptz-command` | Comando do plano de resposta, `IPtzCommandEvent` |
| Produz | `attlas.cameras.ptz-command-executed` | Eco de sucesso, chave `commandId` |
| Produz | `attlas.cameras.ptz-command-rejected` | Eco de recusa, chave `commandId`, com `errorCode` e, quando é recurso ausente, `reason: RESOURCE_NOT_FOUND` |
| Produz | `attlas.audit.cameras` | Auditoria de sessão, preset, tour e comando por plano |

`attlas.emergencies.ptz-command` está declarado em `libs/contracts/src/lib/camera/cameras-topics.constant.ts` e
em `docker/kafka-topics.list`, sem consumidor no `ms-cameras`. `attlas.cameras.ptz-preempted` é consumido pelo
`ms-execution-plans` e não é publicado pelo `ms-cameras`.

### Tabelas do banco

Schema em `database/schema/ptz/`; repositórios em `cameras/repositories/presets.repository.ts` e
`automations.repository.ts`.

| Modelo | Campos | Notas |
| --- | --- | --- |
| `CameraPtzPreset` | `panDegrees` e `tiltDegrees` `Decimal(6,3)`, `zoomLevel` `Decimal(5,2)` em %, `isDefault`, `sortOrder`, `snapshotStorageKey`, `snapshotCapturedAt` | Posição em graus nativos; `onDelete: Cascade` com a câmera; `CameraAnalyticRegion.presetId` aponta para ele com `SetNull` |
| `CameraPtzTour` | `isActive`, `randomOrder`, `intervalMinutes`, `repeatCount` | `isActive` é a intenção do operador; `repeatCount` é gravado como 0 e não é usado; `intervalMinutes` é a espera entre passadas |
| `CameraPtzTourStep` | `presetId`, `dwellTimeSeconds`, `transitionSeconds`, `speedPercent`, `sortOrder` | `onDelete: Restrict` no preset; `(tourId, sortOrder)` é índice comum |

A posição observada fica em `CameraOperationalSnapshot` (`ptzPan`, `ptzTilt`, `ptzZoom`).

### Chaves no Redis

| Chave | Validade | Papel |
| --- | --- | --- |
| `cameras:audit:ptz-session:<cameraId>:<ator>` e o índice ordenado | 120 s sem comando | Sessão de controle da auditoria |
| `ms-cameras:ptz-command:<commandId>` | 1 h | Marca que o comando de plano já chegou ao equipamento |
| `camera:ptz-tour:lease:<automationId>` | 30 s, renovada a cada 10 s | Réplica que conduz o tour |

### Canal WebSocket

`camera:ptz:position` na sala `camera:<id>`, com a posição observada; o cliente recebe a posição inicial em
`camera:status:snapshot`.

## Por que é assim

### Dois caminhos de execução

**ONVIF (`executeOnvifPtz`).** Relativo, absoluto com pan e tilt, contínuo de pan e tilt e stop de pan e tilt, em
coordenadas normalizadas de -1 a 1. Cada handler valida o próprio payload antes (`PTZ_FIELDS_REQUIRED`,
`PTZ_VELOCITY_OUT_OF_RANGE`, `PTZ_PARTIAL_COORDINATE`, `PTZ_TIMEOUT_OUT_OF_RANGE`, `PTZ_STOP_NO_AXIS`). Depois:

1. `findForPtz`: câmera não removida, credencial e perfil PRIMARY; ausente, 404.
2. Guards de `ptz-guards.helper.ts`, antes de qualquer I/O: protocolo ONVIF (`PTZ_REQUIRES_ONVIF`); câmera capaz
   de PTZ (`CAMERA_NOT_PTZ`), o que aceita `physicalCameraKind` PTZ e também a câmera fixa com `ptz: true` em
   `analyticsCapabilities`, o PTZ digital; `mediaProfileToken` (`PTZ_NOT_SUPPORTED`); credencial
   (`CAMERA_CREDENTIAL_MISSING`).
3. Sessão de controle do `PtzDriverPool`, aberta no primeiro comando e reaproveitada por até 120 s ociosa;
   comandos em sequência, cada um sob timeout. Falha descarta a sessão. Detalhe em
   [[Câmeras - Integração com dispositivo - Arquitetura e estratégias]].
4. Uma linha `PTZ_COMMAND` em `CameraEventLog`.
5. De volta ao handler, o comando entra na sessão de auditoria depois do movimento, para comando recusado não
   abrir sessão.

**VAPIX (Axis).** Ir para preset, passo de tour e zoom (contínuo, stop e absoluto sem pan e tilt), em unidades
nativas (graus, zoom de 1 a 9999), exatamente como o preset guarda. `loadForVapix` só exige câmera e credencial.

| Método | Utilitário | Uso | Linha `PTZ_COMMAND` |
| --- | --- | --- | --- |
| `executeVapixAbsolute` | `vapixAbsolutePtz` | Ir para preset e passo de tour | `ABSOLUTE` |
| `executeVapixAbsoluteZoom` | `vapixAbsoluteZoom` | Absoluto só de zoom, o slider da tela | `ABSOLUTE` |
| `executeVapixZoom` | `vapixContinuousZoom` | Contínuo só de zoom; funciona em câmera fixa com zoom óptico | `CONTINUOUS_START` |
| `executeVapixZoomStop` | `vapixZoomStop` | Parada do zoom, sem falhar | Nenhuma |

Há dois espaços de coordenadas: `/ptz/absolute` com pan e tilt recebe valor normalizado e vai por ONVIF; o ir
para preset usa graus nativos por VAPIX. O absoluto sem pan e tilt vai por VAPIX porque o `AbsoluteMove` ONVIF
não é confiável nas Axis em uso, segundo o handler.

### Autorização onde o gesto entra

1. **Pertencimento**: `@RequireSystemDuty()` na classe.
2. **Chave da rota**: `@RequirePermission`, avaliado pelo `JwtClaimsGuard` contra o `ms-organization`, com
   escopo espacial pelo `:id` (`targetResourceType: 'device'`). Negação é 403; avaliador fora do ar é 503
   `PERMISSION_RESOLVER_UNAVAILABLE`, e nada se move. Toda rota que move a câmera pede `cameras.ptz:control`,
   inclusive a captura de enquadramento, que move antes de capturar.
3. **Escopo da câmera**: `assertCameraInSystem`.
4. **Ativação de tour**: a rota pede `cameras.automation:manage`; ao ligar com operador, o
   `ToggleAutomationHandler` pergunta também `cameras.ptz:control` ao `PermissionResolver` do `core-auth`, uma
   vez, antes de gravar, porque o tour roda depois sem operador. Desligar não pede, porque para o equipamento.

Os passos seguintes do tour não conferem nada, para que uma sessão que expira não interrompa um tour longo; uma
revogação vale na próxima ativação. O caminho do plano de resposta não tem JWT e não passa por essas camadas:
quem autoriza é o motor de planos, e o listener faz a própria guarda de sistema.

### Comando por plano de resposta

`events/consumers/execution-plans-ptz-command/execution-plans-ptz-command.listener.ts` consome
`attlas.execution-plans.ptz-command`.

| Verbo em `params.command` | Parâmetros | Vira |
| --- | --- | --- |
| `move-to-preset` | `presetId` | `GoToPresetCommand` |
| `relative-move` | `pan`, `tilt`, `zoom` com sinal, dentro de `CameraValidation.relativeMove`, ao menos um eixo diferente de zero | `MovePtzByDeltaCommand` |
| `tour-start` | `automationId` | `ToggleAutomationCommand.forEngine(..., true)` |
| `tour-stop` | `automationId` | `ToggleAutomationCommand.forEngine(..., false)` |

- O relativo do plano divide cada delta pelo limite do eixo (180 graus, 100%) e o leva à translação ONVIF de -1 a
  1, com o sinal do tilt igual ao das setas; roda com a velocidade padrão e sem sessão de auditoria do operador.
- Guarda de sistema: sem `systemId`, ou câmera de outro sistema, o comando é recusado antes de tocar o
  equipamento.
- Ledger de reentrega: a chave `ms-cameras:ptz-command:<commandId>` marca que o comando chegou ao equipamento, e
  uma reentrega só republica o eco. Com o Redis fora, a leitura dá "não executado" e a câmera se move de novo; um
  `tour-start` reentregue com outro `commandId` depois de um `tour-stop` também não é coberto.
- Eco com `eventId` UUID v5 do `commandId` e sufixo distinto para sucesso e recusa. O eco espera até 20 s e, se
  falha, derruba o handler para o Kafka reentregar; o ledger impede o movimento repetido.
- Auditoria no listener: `CAMERA_PTZ_COMMANDED` (preset e relativo), `CAMERA_PTZ_TOUR_STARTED` ou
  `CAMERA_PTZ_TOUR_STOPPED`, com ator de sistema, plano no payload e sem coordenadas. Por isso
  `GoToPresetHandler` e `ToggleAutomationHandler` não auditam quando `operatorId` é nulo.

### Tour que sobrevive a deploy

`cameras/services/tour-runner.service.ts` percorre os passos por `executeVapixAbsolute`.

- `isActive` é a intenção do operador, não o espelho de um processo. O desligamento do serviço cancela os laços e
  libera os leases, sem mexer em `isActive`.
- Cada réplica procura, no boot e a cada 15 s, os tours ativos que nenhum processo conduz e tenta assumi-los. O
  lease Redis de 30 s, renovado a cada 10 s, garante uma réplica por tour e entrega o tour de uma réplica que
  morreu.
- A cada renovação, o heartbeat relê o tour e cancela o laço se ele foi desativado, trocado por outro tour da
  câmera ou removido. Pausa feita em outra réplica vale em até 10 s. Falha de banco nessa leitura não para o tour.
- Um novo Play num tour já ativo assume na hora: o laço novo espera o anterior terminar e liberar o lease, e roda
  com o operador que apertou Play. Tour retomado pela varredura roda sem operador, porque quem ativou não é
  guardado.
- Ligar inicia um laço contínuo; `intervalMinutes` é a espera entre uma passada completa e a próxima (0 emenda).
  `randomOrder` embaralha os passos a cada passada, e `transitionSeconds` mais `dwellTimeSeconds` dão a espera
  entre passos, interrompível.
- Um tour ativo por câmera: ativar desativa os outros numa transação com `pg_advisory_xact_lock`
  (`activateExclusive`) e cancela o laço anterior da câmera.
- Três falhas seguidas abortam o tour e gravam `PTZ_COMMAND` com subtipo `AUTOMATION_ABORTED` (`WARN`). Passo
  com preset inexistente é pulado sem contar falha; passada só de pulos encerra o tour.
- O runner grava `isActive=false` só quando o tour não tem como continuar: sem passos, abortado pelas falhas ou
  sem nenhum movimento na passada. Pausa, desligamento do serviço, perda de lease e erro de banco no meio da
  passada deixam `isActive` como está.

### Rastreabilidade em dois registros

**`CameraEventLog`, uma linha por comando executado** (`events/recording/camera-event-log.repository.ts`):
`eventType` `PTZ_COMMAND`, `subType` `ABSOLUTE`, `RELATIVE`, `CONTINUOUS_START`, `CONTINUOUS_STOP` ou
`AUTOMATION_ABORTED`, severidade, resumo, payload com eixos e velocidade, `operatorId` (nulo no plano e no tour
retomado) e `occurredAt`. A parada do zoom não grava linha. A linha aparece no log de eventos da câmera
([[Câmeras - Eventos, incidentes e alarmes]]).

**Auditoria da plataforma, um fato por gesto** (`attlas.audit.cameras`):

- **Sessão de controle**: os quatro movimentos registram o comando numa sessão por câmera e ator no Redis. Só o
  primeiro emite `CAMERA_PTZ_SESSION_STARTED`; os seguintes renovam; o stop renova sem abrir. O
  `PtzSessionExpiryWorker` (cron por minuto) fecha a sessão parada há mais de 120 s e emite
  `CAMERA_PTZ_SESSION_ENDED` com contagem e duração; o `ZREM` do índice garante um único emissor entre réplicas.
  Redis fora custa a trilha, nunca o comando.
- **Presets e tours**: `CAMERA_PTZ_PRESET_CREATED`, `_UPDATED` (com `framingMoved` e o diff), `_DELETED`,
  `_RECALLED` (ir para preset humano, fora da sessão), `_SNAPSHOT_CAPTURED` e `CAMERA_AUTOMATION_TOGGLED` (só
  quando o estado muda e só pela rota humana). Criar, editar e remover preset e ligar ou desligar tour também
  notificam (`cameras.ptzPreset.changed`, `cameras.automation.changed`).
- Nenhum payload leva pan, tilt ou zoom: a trilha responde quem agiu, não para onde a câmera apontou.

### Posição ao vivo pelo worker de saúde

A posição é lida pelo worker de saúde, não pelo caminho de comando, e só na Axis.

- Quando o tópico `Move/Channel_1` do WebSocket de eventos informa `is_moving=1`, o worker inicia
  `startPtzTrackLoop`, que lê `GET /axis-cgi/com/ptz.cgi?query=position` a cada `PTZ_TRACK_INTERVAL_MS`
  (750 ms, mínimo 500 ms), uma leitura depois da outra. Em `is_moving=0`, e no evento de PTZ pronto, lê a posição
  final uma vez.
- Posição inalterada não grava nem transmite.
- Grava em `CameraOperationalSnapshot` e publica `CameraPtzPositionChangedEvent`, transmitido como
  `camera:ptz:position`. Como a conexão é uma por equipamento, o evento sai para cada linha `Camera` do mesmo
  equipamento.
- No frontend, `CameraLiveStatusService.watchPtzPosition` alimenta o indicador do controle PTZ e é a posição que
  o painel de presets grava. O canal ao vivo está em [[Câmeras - Saúde e monitoramento]].

### Enquadramento do preset e regiões do analítico

- **Captura**: despacha o mesmo `GoToPresetCommand` do ir para preset, espera
  `PresetSnapshotCapture.PTZ_SETTLE_MS` (3 s), busca um quadro em resolução cheia pelo `CameraThumbnailService`,
  grava o JPEG pelo `@attlas/core-storage` em `camera-preset-snapshot/<cameraId>/<presetId>.jpg` (sobrescrito,
  sem histórico) e anota a chave e o instante no preset. Por fim vincula ao preset as regiões do analítico
  ATSPM lidas do equipamento (`preset-region-sync.service.ts`); equipamento mudo devolve `regionsSynced: 0` sem
  desfazer a captura.
- **Leitura**: `GET .../snapshot` serve o JPEG (404 sem captura); `GET .../regions?analyticType=` lê do cache
  local as regiões com `presetId` do preset, sem falar com o equipamento.
- **Invalidação**: mudar pan, tilt ou zoom apaga o enquadramento, o objeto e as regiões vinculadas; remover o
  preset apaga regiões e objeto.
- **Quem usa**: a tela de Detecção do [[Analítico]], não o painel de presets da câmera.

## Armadilhas conhecidas

- **Não há preempção nem prioridade no PTZ.** As portas são permitir ou negar. Não existe prioridade, sessão
  exclusiva nem cessão de controle entre operadores. As peças existem fora daqui e ninguém do PTZ as liga: as
  chaves `cameras.ptz:preempt` e `cameras.ptz:release` no catálogo, o `ResourceLockType.PTZ` com 120 s no
  `ms-organization` (`apps/ms-organization/src/permissions/locks/`) e o tópico `attlas.cameras.ptz-preempted`.
  No frontend, o `ResourceLockService` só é usado no modo tempo real de controladores.
- **Reposicionamento por Emergências não existe.** Nenhum código do `ms-cameras` consome
  `attlas.emergencies.ptz-command`. O único PTZ automático é o de plano de resposta, sem prioridade sobre o
  operador.
- **Tour é só Axis.** Ir para preset e passo de tour usam VAPIX; numa câmera de outro fabricante, o tour falha
  três vezes e aborta.
- **Criar, substituir e remover tour não deixam trilha.** Só o log de aplicação registra esses três gestos; a
  auditoria de presets e tours os deixa fora do escopo.
- **Comentário do DTO desatualizado.** `cameras/dtos/move-absolute-ptz-camera.dto.ts` diz que o zoom absoluto vai
  pelo driver ONVIF; quem decide é o handler, que manda por VAPIX.

## Glossário

| Termo | O que é |
| --- | --- |
| PTZ | Pan (giro horizontal), tilt (inclinação vertical) e zoom |
| Coordenada normalizada | Valor de -1 a 1 (zoom de 0 a 1) que o ONVIF converte para a faixa física da câmera |
| Unidade nativa | Graus de pan e tilt e zoom de 1 a 9999, como a Axis os recebe no VAPIX |
| Tour (automação) | Sequência de presets percorrida em laço, com espera em cada um |
| Lease | Chave no Redis com validade curta que só uma réplica consegue manter; quem a renova conduz o tour |
| Sessão de controle | Na auditoria, o período de comandos de um operador numa câmera; no driver, a conexão ONVIF reaproveitada |
| Ledger de reentrega | Marca no Redis que impede o comando de plano reentregue pelo Kafka de mover a câmera de novo |
