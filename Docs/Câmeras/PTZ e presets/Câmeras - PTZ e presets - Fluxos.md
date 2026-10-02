---
tags:
  - doc
  - ms-cameras
  - ptz
atualizado: 2026-10-01
aliases:
  - "PTZ e presets - Fluxos"
---

# Câmeras - PTZ e presets - Fluxos

Parte de [[Câmeras - PTZ e presets]]. Mecânica em [[Câmeras - PTZ e presets - Arquitetura e estratégias]]. Diagrama:
[[Câmeras - PTZ e presets - Diagrama.excalidraw|diagrama]].

## Comando manual

Relativo (`POST /cameras/:id/ptz`), absoluto (`/ptz/absolute`), contínuo (`/ptz/continuous`) e stop
(`/ptz/stop`).

| Passo | O quê | Onde | Falha típica |
| --- | --- | --- | --- |
| 1 | Kong valida o JWT; o `JwtClaimsGuard` confere o pertencimento e a chave `cameras.ptz:control` sobre a câmera | `cameras.controller.ts` | 401, 403, 503 `PERMISSION_RESOLVER_UNAVAILABLE` |
| 2 | Confere que a câmera é do `System-Id`; extrai `operatorId` | `CameraTenancyService` | 404 |
| 3 | Handler valida o payload | `handlers/move-*-ptz-camera`, `handlers/stop-ptz-camera` | `PTZ_FIELDS_REQUIRED`, `PTZ_VELOCITY_OUT_OF_RANGE`, `PTZ_PARTIAL_COORDINATE`, `PTZ_TIMEOUT_OUT_OF_RANGE`, `PTZ_STOP_NO_AXIS` |
| 4 | Carrega câmera, credencial e perfil PRIMARY | `findForPtz` | 404 |
| 5 | Guards: ONVIF, PTZ mecânico ou digital, perfil de mídia, credencial | `ptz-guards.helper.ts` | `PTZ_REQUIRES_ONVIF`, `CAMERA_NOT_PTZ`, `PTZ_NOT_SUPPORTED`, `CAMERA_CREDENTIAL_MISSING` |
| 6 | connect, movimentos em sequência, disconnect, sob timeout | `onvif.driver.ts` | `CAMERA_UNREACHABLE` |
| 7 | Linha `PTZ_COMMAND` | `camera-event-log.repository.ts` | - |
| 8 | Registra na sessão de controle; o primeiro comando emite `CAMERA_PTZ_SESSION_STARTED` | `ptz-session.recorder.ts` | nunca falha o comando |

Variações: contínuo só de zoom vai por VAPIX e funciona em câmera fixa com zoom óptico; absoluto sem pan e
tilt vira zoom absoluto por VAPIX; stop para o zoom por VAPIX sempre (sem linha `PTZ_COMMAND`) e pan e tilt por
ONVIF, ignorando câmera fixa, e renova a sessão sem abrir. Sucesso: 204. A sessão fecha por tempo: o
`PtzSessionExpiryWorker` emite `CAMERA_PTZ_SESSION_ENDED` após 120 s sem comando do par câmera e ator.

## Ir para preset

`POST /cameras/:id/presets/:presetId/goto`, handler `go-to-preset`.

1. Chave `cameras.ptz:control` e verificação de sistema.
2. Preset inexistente: 404 `CAMERA_PRESET_NOT_FOUND`.
3. `executeVapixAbsolute` com `panDegrees`, `tiltDegrees` e `presetZoomLevelToVapix(zoomLevel)`.
4. `loadForVapix`: câmera e credencial; falha de rede, `CAMERA_UNREACHABLE`. Grava `PTZ_COMMAND` `ABSOLUTE`.
5. Pela rota humana audita `CAMERA_PTZ_PRESET_RECALLED` com o nome, sem coordenadas e fora da sessão; pelo
   plano não audita aqui. 204.

## Tour

`PATCH /cameras/:id/automations/:automationId/toggle`, handler `toggle-automation`.

1. Chave `cameras.automation:manage` e verificação de sistema.
2. Automação de outra câmera: 404 `CAMERA_AUTOMATION_NOT_FOUND`.
3. Ligando, com operador: `cameras.ptz:control` pelo `PermissionResolver` (403 ou 503).
4. `activateExclusive` (ligar desativa os outros tours, com advisory lock) ou `setActive(false)`.
5. `tourRunner.start` ou `stop`.
6. O runner, sem bloquear a resposta, carrega passos e presets e, a cada passo, chama `executeVapixAbsolute`
   (sem nova checagem; `operatorId` só para a linha `PTZ_COMMAND`), espera transição mais dwell, e ao fim da
   passada espera `intervalMinutes` e recomeça, relendo o tour.
7. Encerra por desligar; tour removido, desativado ou vazio; passada sem movimento; 3 falhas seguidas
   (`AUTOMATION_ABORTED`); shutdown. Parou sozinho, grava `isActive=false`.
8. Estado mudou e veio da rota humana: audita `CAMERA_AUTOMATION_TOGGLED` e notifica
   `cameras.automation.changed`.

## Comando por plano de resposta (Kafka)

1. O `ms-execution-plans` publica `IPtzCommandEvent` em `attlas.execution-plans.ptz-command`.
2. Sem `commandId` ou `cameraId`: descartado sem eco. Verbo fora de `move-to-preset`, `tour-start` e
   `tour-stop`: eco rejeitado `EXECUTION_PLANS_PTZ_UNSUPPORTED_PARAMS`.
3. Sem `systemId`, ou câmera de outro sistema: eco rejeitado `EXECUTION_PLANS_PTZ_CROSS_TENANT`.
4. Ledger já marca o `commandId`: pula para o eco.
5. Executa `GoToPresetCommand` ou `ToggleAutomationCommand.forEngine`, sem token nem operador; falha vira eco
   rejeitado `EXECUTION_PLANS_PTZ_EXECUTION_FAILED`.
6. Marca o ledger, audita, publica o eco em `attlas.cameras.ptz-command-executed`. Eco que não sai em 20 s
   derruba o handler e o Kafka reentrega; o ledger impede o movimento repetido.

## Capturar o enquadramento do preset (UC-060)

1. `POST /cameras/:id/presets/:presetId/snapshot`, com `cameras.ptzPreset:manage` e `cameras.ptz:control`, e a
   verificação de sistema.
2. Preset inexistente: 404 `CAMERA_PRESET_NOT_FOUND`.
3. `GoToPresetCommand`; falha de movimento aborta antes de capturar.
4. Espera 3 s e busca um quadro em resolução cheia; sem quadro, `CAMERA_STREAM_UNAVAILABLE`.
5. Grava o JPEG e a chave no preset; se o preset sumiu nesse meio tempo, apaga o objeto e devolve o erro.
6. Vincula as regiões do analítico ATSPM lidas do equipamento, em best-effort.
7. Audita `CAMERA_PTZ_PRESET_SNAPSHOT_CAPTURED`; 201 com `snapshotUrl`, `capturedAt` e `regionsSynced`.

Quem chama é a tela de Detecção do Analítico (ver [[Analítico]]).

## Tela: detalhe da câmera

No detalhe (`apps/web-attlas/src/app/modules/cameras/pages/camera-detail/`), o controle PTZ
(`components/cameras-ptz-control/`) abre pelo joystick do player quando a capability `ptz` está ativa, e o
painel lateral (`components/camera-presets-panel/`) traz saúde, presets e automação.

- As setas mandam movimento contínuo com `timeoutSeconds` de 3 s, renovado a cada 1,8 s enquanto pressionadas
  (`PtzControlDefaults` em `cameras-ptz-control.constants.ts`); soltar manda stop. O botão central só manda
  stop dos dois eixos.
- O slider de zoom manda zoom absoluto sem pan e tilt, no máximo um comando a cada 150 ms durante o arraste.
  Velocidade e precisão ficam salvas no navegador
  (`components/cameras-ptz-control/utils/ptz-control-preference-storage.util.ts`).
- O `CamerasService` do frontend só chama `/ptz/continuous`, `/ptz/stop` e `/ptz/absolute`; o relativo não tem
  tela.
- A posição exibida vem do WebSocket (`camera:ptz:position`); criar ou editar preset grava essa posição no
  corpo; clicar num preset dispara o goto; a aba de automação cria, edita, liga, desliga e remove tours.
- O detalhe não pede a confirmação de RNF-CAM-10.

O mesmo controle é montado na tela de Detecção do Analítico e no painel de câmera do ATSPM
(`apps/web-attlas/src/app/modules/analytics-detection/`,
`apps/web-attlas/src/app/modules/analytics/components/atspm-camera-panel/`).

## Tela: PTZ no VMS (RF-VW-04)

No mosaico, um único controle PTZ flutuante opera a célula selecionada, sem trocar de tela
(`apps/web-attlas/src/app/modules/videowall/pages/videowall/videowall-ptz.store.ts`); um segundo toque no
joystick da mesma célula fecha o controle. Antes do primeiro comando numa câmera que não está `OPERATIONAL`,
o store pede a confirmação de RNF-CAM-10, uma vez por célula na sessão. Layout e células são do [[Câmeras - VMS]].

## Tela: até dois cliques a partir do mapa (RNF-CAM-07)

No Painel de Operações, o popup expandido da câmera abre o mesmo controle PTZ, renderizado uma vez na raiz
da página do mapa (`apps/web-attlas/src/app/modules/operations-panel/services/ops-camera-ptz.service.ts`,
`pages/operations-map/operations-map.page.html`), e o painel de câmera da interseção embute presets e
automação sem a aba de saúde (`components/camera-device-panel/`). A contagem de cliques é restrição de
experiência: o código mostra onde está o controle, não mede os cliques.
