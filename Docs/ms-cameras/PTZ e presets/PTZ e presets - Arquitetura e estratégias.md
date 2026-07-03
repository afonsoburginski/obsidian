---
tags: [doc, cameras, ms-cameras, ptz]
servico: ms-cameras
fonte: apps/ms-cameras/src/cameras
atualizado: 2026-07-03
---

# PTZ e presets - Arquitetura e estratégias

Como o ms-cameras executa, autoriza, audita e observa comandos PTZ. Contexto geral: [[00 - PTZ e presets]]. Visual: [[05 - MOD-004 ptz-presets.excalidraw|diagrama]].

## Dois caminhos de execução: ONVIF e VAPIX

O serviço `cameras/services/ptz.service.ts` expõe dois pipelines, escolhidos por **tipo de comando**, não por fabricante configurado. Integração de hardware detalhada em [[00 - Integração com dispositivo]].

### Pipeline ONVIF — `executeOnvifPtz`

Usado por movimento relativo, absoluto, contínuo (pan/tilt) e stop. Coordenadas **normalizadas ONVIF** (-1..1). Etapas:

1. `camerasRepository.findForPtz(id)` — carrega câmera + credencial + perfil de mídia primário.
2. **Autorização** (ver abaixo) contra o módulo Permissões.
3. **Guards** (`helpers/ptz-guards.helper.ts`): protocolo é ONVIF, `physicalCameraKind` é PTZ, existe `mediaProfileToken`, existe credencial. Falham cedo, antes de qualquer I/O de rede.
4. `driverFactory.createDriver(ProtocolType.ONVIF, ...)` — driver por operação; a porta ONVIF vem do perfil (`communicationPort`, tip. 80) e a RTSP de `RTSP_DEFAULT_PORT` (default 554).
5. `connect()` → aplica os comandos em sequência → `disconnect()` no `finally`. Cada passo I/O corre sob **timeout** (`runWithTimeout`): connect `ONVIF_CONNECT_TIMEOUT_MS` (5000), comando/disconnect `ONVIF_COMMAND_TIMEOUT_MS` (4000). Estouro vira `ExternalServiceException` com `errorCode=CAMERA_UNREACHABLE`.
6. Grava **1 linha de auditoria** em `CameraEventLog`.

No driver (`hardware/drivers/onvif/onvif.driver.ts`), `movePTZ` despacha para `absoluteMove`/`relativeMove`/`continuousMove`/`stop` do ONVIF. O contínuo envia `Timeout` como número (safety-net auto-stop do device); o relativo mapeia `PTZAction` para translations de passo fixo (magnitude ignorada — melhoria futura).

### Pipeline VAPIX/Axis

Usado por goto-preset, tours e zoom (contínuo/stop). Absolutos em **unidades nativas** (graus + zoom `1..9999`), exatamente como os presets armazenam — sem conversão normalizada com perda.

| Método (`ptz.service.ts`) | Util | Uso |
| --- | --- | --- |
| `executeVapixAbsolute` | `vapixAbsolutePtz` (`utils/vapix-ptz.utils.ts`) | goto-preset e cada passo de tour |
| `executeVapixZoom` | `vapixContinuousZoom` (`utils/vapix-zoom.utils.ts`) | contínuo **zoom-only** (funciona em câmera FIXA com zoom óptico) |
| `executeVapixZoomStop` | `vapixZoomStop` | stop de zoom (best-effort, nunca lança) |

Conversões em `utils/vapix-ptz.utils.ts`: `presetZoomLevelToVapix` (0..100% → 1..9999) e `speedPercentToVapix` (0..100% → 1..100, default 50). As chamadas usam digest auth (`health/utils/digest-auth.utils.ts`).

> [!note] Dois espaços de coordenadas
> O endpoint `/ptz/absolute` aceita normalizado (-1..1) e vai por ONVIF; já `goto` de preset usa graus nativos por VAPIX. Presets guardam graus + zoom%. É uma decisão específica do caminho Axis, não uma inconsistência acidental.

## Autorização obrigatória (RF-INT-06 / RNF-CAM-08)

Antes de mover, `PtzService` (`loadAndGuard` e `loadForVapix`) chama `permissions.client.ts` → `assertAllowed({ action: 'cameras:ptz', resourceId: cameraId })`, que faz `GET /api/organization/permissions/check` no **ms-organization**, propagando o Bearer do operador.

- Só verifica quando há `operatorId` **e** `requesterToken` (chamadas internas/workers sem token pulam a checagem).
- **Fail-closed**: `MS_ORGANIZATION_URL` ausente, erro de rede, 5xx ou 408 → `ExternalServiceException` (`errorCode=PERMISSIONS_SERVICE_UNAVAILABLE`). Timeout `PERMISSIONS_CHECK_TIMEOUT_MS` (default 1500ms).
- **403** → `ForbiddenActionException` (`errorCode=FORBIDDEN`). **404** (recurso sem política registrada) → **permite** (sem deny explícito), apenas loga warning.
- Em tours, o gate roda **uma vez** na ativação (`toggle-automation.handler.ts`), com o token vivo; os movimentos subsequentes do runner **não** re-checam (para uma sessão que expira não abortar um tour longo).

> [!warning] Preempção por prioridade — não implementada
> `cameras:ptz` é um check booleano allow/deny. **Não há** dimensão de prioridade, conceito de sessão PTZ ativa, nem cessão/preempção de controle entre operadores no código de ms-cameras (confirme: nenhuma referência a `preempt`/`priority` fora do Prisma gerado). A preempção descrita em RF-INT-06/RNF-CAM-08 é **regra de domínio** delegada ao módulo Permissões e ao frontend; hoje o backend só concede ou nega.

## Reposicionamento por Emergências (RF-INT-04) — não implementado

O consumidor Kafka de comandos de emergência (`attlas.emergencies.ptz-command`) está **declarado no SPEC mas SEM `@EventPattern` implementado** (confirmado: os únicos `@EventPattern` de ms-cameras são `EVENT_INGEST`, `EVENT_LOGGED` ×2 e `INCIDENT_CREATED`). Logo, prioridade máxima e preempção de sessão de operador por emergência **ainda não existem** no código. Ver [[00 - Eventos, incidentes e alarmes]] para os consumidores Kafka ativos.

## Tour-runner (execução de tours)

`cameras/services/tour-runner.service.ts` — scheduler **in-process** que percorre os passos do tour via `executeVapixAbsolute`.

- **Play** (`toggle isActive=true`) inicia um loop; auto-para quando o budget `intervalMinutes` esgota. `intervalMinutes=0` → uma única passada. **Pause** (`isActive=false`) para cedo.
- Invariante **single-active** por câmera: ativar um tour desativa os demais (transação + advisory lock em `activateExclusive`); iniciar um novo cancela o que rodava na mesma câmera.
- **Circuit-breaker**: 3 falhas consecutivas de move abortam o tour e gravam `CameraEventLog` subType `AUTOMATION_ABORTED` (severidade WARN). Passo com preset inexistente é pulado sem tripar o breaker.
- `randomOrder` embaralha os passos (Fisher–Yates) a cada passada; `dwellTimeSeconds + transitionSeconds` definem o dwell entre passos (interrompível pelo Pause).
- **Limitação**: roda na memória do processo — restart perde os tours em voo (não retomam). No shutdown, cancela os loops e reconcilia `isActive=false` para o DB não anunciar tour que não roda.

## Rastreabilidade — evento `PTZ_COMMAND` (RNF-CAM-06)

Cada execução grava uma linha em `CameraEventLog` via `camera-event-log.repository.ts`:

- `eventType='PTZ_COMMAND'`, `subType ∈ { ABSOLUTE, RELATIVE, CONTINUOUS_START, CONTINUOUS_STOP, AUTOMATION_ABORTED }`, `severity` (INFO / WARN no abort), `summary`, `payload` (eixos/velocidade/timeout), `operatorId`, `occurredAt`.
- Os subTypes granulares seguem convenção CloudEvents/OpenTelemetry (um por operação lógica) e permitem detectar movimentos órfãos por SQL sem varrer o JSON.
- Esses registros alimentam o log de eventos da câmera — ver [[00 - Eventos, incidentes e alarmes]].

## Posição PTZ em tempo real

Rastreada pelo **worker de saúde**, não pelo caminho de comando (Axis/VAPIX apenas):

- `health/workers/camera-health.worker.ts` → `startPtzTrackLoop`/`capturePtzPosition` faz polling de `health/utils/fetch-axis-ptz-position.utils.ts` (`GET /axis-cgi/com/ptz.cgi?query=position`).
- Dedup: posição inalterada não gera escrita nem broadcast (evita spam durante dwell).
- Persiste em `CameraOperationalSnapshot` (`ptzPan/ptzTilt/ptzZoom`) e publica `CameraPtzPositionChangedEvent` no EventBus in-process → `cameras/realtime/camera-ptz-position.events-handler.ts` → Socket.IO evento `camera:ptz:position` na room `camera:<id>`.
- Fluxo completo do tempo real em [[Status em tempo real (push)]].

## Ver também

- [[00 - PTZ e presets]] · [[PTZ e presets - Fluxos]] · [[PTZ e presets - Requisitos e SLA]]
- [[00 - Integração com dispositivo]] · [[Status em tempo real (push)]] · [[00 - Eventos, incidentes e alarmes]]
