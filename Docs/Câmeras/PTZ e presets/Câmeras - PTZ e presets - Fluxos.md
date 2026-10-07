---
tags:
  - doc
  - cameras
  - ptz
  - ms-cameras
aliases:
  - "PTZ e presets - Fluxos"
atualizado: 2026-10-07
---

# Câmeras - PTZ e presets - Fluxos

Volta para [[Câmeras - PTZ e presets]].

## Resumo

Mecânica, contratos e o porquê de cada etapa estão em [[Câmeras - PTZ e presets - Arquitetura e estratégias]].

| Fluxo | Gatilho | Resultado |
| --- | --- | --- |
| [[#1. Comando manual]] | Operador usa setas, slider de zoom ou parada | Câmera se move, linha `PTZ_COMMAND` e sessão de auditoria aberta ou renovada |
| [[#2. Ir para preset]] | Operador clica num preset | Câmera no preset por VAPIX e `CAMERA_PTZ_PRESET_RECALLED` |
| [[#3. Tour]] | Operador liga ou desliga uma automação | Laço de presets em uma réplica, ou laço encerrado |
| [[#4. Comando por plano de resposta]] | `IPtzCommandEvent` em `attlas.execution-plans.ptz-command` | Câmera movida ou tour alterado, e eco ao motor de planos |
| [[#5. Capturar o enquadramento do preset]] | Tela de Detecção do Analítico pede a captura | JPEG do preset guardado e regiões vinculadas |
| [[#6. Operar PTZ pelo detalhe da câmera]] | Operador abre o detalhe de uma câmera PTZ | Controle PTZ, presets e automação na mesma tela |
| [[#7. Operar PTZ pelo VMS]] | Operador seleciona uma célula do mosaico | Controle flutuante opera a câmera da célula |
| [[#8. Operar PTZ pelo mapa]] | Operador abre o popup de câmera no Painel de Operações | Controle PTZ e presets a partir do mapa |

## 1. Comando manual

**Gatilho.** `POST /cameras/:id/ptz` (relativo), `/ptz/absolute`, `/ptz/continuous` ou `/ptz/stop`.

**Passos.**

1. O Kong valida o JWT, e o `JwtClaimsGuard` confere o pertencimento e a chave `cameras.ptz:control` sobre a
   câmera (`cameras.controller.ts`).
2. `CameraTenancyService` confere que a câmera é do `System-Id` e extrai o `operatorId`.
3. O handler (`handlers/move-*-ptz-camera`, `handlers/stop-ptz-camera`) valida o payload.
4. `findForPtz` carrega câmera, credencial e perfil PRIMARY.
5. Guards de `ptz-guards.helper.ts`: ONVIF, PTZ mecânico ou digital, perfil de mídia e credencial.
6. O `PtzDriverPool` devolve a sessão ONVIF de controle da câmera, abrindo-a se preciso, e os movimentos rodam
   em sequência sob timeout (`onvif.driver.ts`).
7. Grava a linha `PTZ_COMMAND` (`camera-event-log.repository.ts`).
8. Registra o comando na sessão de auditoria (`ptz-session.recorder.ts`); o primeiro comando emite
   `CAMERA_PTZ_SESSION_STARTED`.

Variações: o contínuo só de zoom vai por VAPIX e funciona em câmera fixa com zoom óptico; o absoluto sem pan e
tilt vira zoom absoluto por VAPIX; o stop sempre para o zoom por VAPIX (sem linha `PTZ_COMMAND`) e pan e tilt
por ONVIF, ignorando câmera fixa, e renova a sessão sem abrir.

**Resultado.** 204. A sessão de auditoria fecha por tempo: o `PtzSessionExpiryWorker` emite
`CAMERA_PTZ_SESSION_ENDED` depois de 120 s sem comando do par câmera e ator.

**Erros.**

| Passo | Erro |
| --- | --- |
| 1 | 401, 403, 503 `PERMISSION_RESOLVER_UNAVAILABLE` |
| 2 e 4 | 404 |
| 3 | `PTZ_FIELDS_REQUIRED`, `PTZ_VELOCITY_OUT_OF_RANGE`, `PTZ_PARTIAL_COORDINATE`, `PTZ_TIMEOUT_OUT_OF_RANGE`, `PTZ_STOP_NO_AXIS` |
| 5 | `PTZ_REQUIRES_ONVIF`, `CAMERA_NOT_PTZ`, `PTZ_NOT_SUPPORTED`, `CAMERA_CREDENTIAL_MISSING` |
| 6 | `CAMERA_UNREACHABLE` no timeout; `EXTERNAL_SERVICE_ERROR` em outro erro de I/O; a sessão é descartada |
| 8 | Nunca falha o comando; Redis fora só perde a trilha |

## 2. Ir para preset

**Gatilho.** `POST /cameras/:id/presets/:presetId/goto`, handler `go-to-preset`.

**Passos.**

1. Chave `cameras.ptz:control` e verificação de sistema.
2. Lê o preset.
3. `executeVapixAbsolute` com `panDegrees`, `tiltDegrees` e `presetZoomLevelToVapix(zoomLevel)`.
4. `loadForVapix` carrega câmera e credencial; grava `PTZ_COMMAND` `ABSOLUTE`.
5. Pela rota humana, audita `CAMERA_PTZ_PRESET_RECALLED` com o nome do preset, sem coordenadas e fora da
   sessão; pelo plano, não audita aqui.

**Resultado.** 204, câmera na posição do preset.

**Erros.** Preset inexistente é 404 `CAMERA_PRESET_NOT_FOUND`. Falha de rede é `CAMERA_UNREACHABLE`.

## 3. Tour

**Gatilho.** `PATCH /cameras/:id/automations/:automationId/toggle`, handler `toggle-automation`.

**Passos.**

1. Chave `cameras.automation:manage` e verificação de sistema.
2. Ligando com operador: pergunta `cameras.ptz:control` ao `PermissionResolver`.
3. `activateExclusive` (ligar desativa os outros tours da câmera, sob advisory lock) ou `setActive(false)`.
4. `tourRunner.start` ou `stop` na réplica que recebeu a requisição.
5. O runner espera o laço anterior do mesmo tour liberar o lease, toma o lease no Redis e, sem bloquear a
   resposta, carrega passos e presets.
6. A cada passo, chama `executeVapixAbsolute` sem nova checagem de permissão (`operatorId` só para a linha
   `PTZ_COMMAND`) e espera transição mais permanência. No fim da passada, espera `intervalMinutes`, relê o tour
   e recomeça.
7. A cada 10 s, renova o lease e relê o tour; desativado, trocado ou removido, encerra o laço.
8. Se o estado mudou e veio da rota humana, audita `CAMERA_AUTOMATION_TOGGLED` e notifica
   `cameras.automation.changed`.

**Resultado.** 200. O tour roda em uma réplica e continua depois de deploy ou restart: cada réplica procura a
cada 15 s os tours ativos sem condutor e os assume.

**Erros.** Automação de outra câmera é 404 `CAMERA_AUTOMATION_NOT_FOUND`. Sem permissão de controle, 403; com o
avaliador fora, 503. Três falhas seguidas de movimento abortam o tour (`AUTOMATION_ABORTED`) e gravam
`isActive=false`, assim como tour sem passos ou passada sem nenhum movimento.

## 4. Comando por plano de resposta

**Gatilho.** O `ms-execution-plans` publica `IPtzCommandEvent` em `attlas.execution-plans.ptz-command`.

**Passos.**

1. Sem `commandId` ou `cameraId`, descarta sem eco.
2. Resolve o verbo: `move-to-preset`, `relative-move`, `tour-start` ou `tour-stop`.
3. Sem `systemId`, ou câmera de outro sistema, recusa antes de tocar o equipamento.
4. Se o ledger já marca o `commandId`, pula para o passo 6.
5. Executa `GoToPresetCommand`, `MovePtzByDeltaCommand` ou `ToggleAutomationCommand.forEngine`, sem token nem
   operador, e marca o ledger.
6. Audita e publica o eco em `attlas.cameras.ptz-command-executed`.

**Resultado.** Câmera movida, ou tour ligado ou desligado, e eco que fecha a ação no motor de planos.

**Erros.**

| Situação | Eco |
| --- | --- |
| Verbo desconhecido, parâmetro ausente, delta fora da faixa ou todos os eixos zero | Recusado, `EXECUTION_PLANS_PTZ_UNSUPPORTED_PARAMS` |
| Sem `systemId` ou câmera de outro sistema | Recusado, `EXECUTION_PLANS_PTZ_CROSS_TENANT` |
| Falha ao executar | Recusado, `EXECUTION_PLANS_PTZ_EXECUTION_FAILED`; preset ou tour inexistente leva também `reason: RESOURCE_NOT_FOUND` |
| Eco que não sai em 20 s | Handler falha e o Kafka reentrega; o ledger impede o movimento repetido |

## 5. Capturar o enquadramento do preset

**Gatilho.** `POST /cameras/:id/presets/:presetId/snapshot`, chamado pela tela de Detecção do [[Analítico]].

**Passos.**

1. Exige `cameras.ptzPreset:manage` e `cameras.ptz:control`, mais a verificação de sistema.
2. Despacha `GoToPresetCommand`.
3. Espera 3 s e busca um quadro em resolução cheia.
4. Grava o JPEG e anota a chave no preset; se o preset sumiu nesse meio tempo, apaga o objeto e devolve o erro.
5. Vincula as regiões do analítico ATSPM lidas do equipamento, sem falhar a captura se o equipamento não
   responde.
6. Audita `CAMERA_PTZ_PRESET_SNAPSHOT_CAPTURED`.

**Resultado.** 201 com `snapshotUrl`, `capturedAt` e `regionsSynced`.

**Erros.** Preset inexistente é 404 `CAMERA_PRESET_NOT_FOUND`. Falha de movimento interrompe antes da captura.
Sem quadro, `CAMERA_STREAM_UNAVAILABLE`.

## 6. Operar PTZ pelo detalhe da câmera

**Gatilho.** O operador abre o detalhe (`apps/web-attlas/src/app/modules/cameras/pages/camera-detail/`) de uma
câmera com a capacidade `ptz` ativa.

**Passos.**

1. O joystick do player abre o controle PTZ (`components/cameras-ptz-control/`).
2. Segurar uma seta manda movimento contínuo com `timeoutSeconds` de 3 s, renovado a cada 1,8 s enquanto o botão
   está pressionado (`PtzControlDefaults` em `cameras-ptz-control.constants.ts`); soltar manda stop. O botão
   central só manda stop dos dois eixos.
3. Início e parada vão numa fila, na ordem em que foram pressionados, para que a parada de um toque rápido nunca
   chegue à câmera antes do início.
4. O indicador de posição anda de forma estimada desde o primeiro clique e é corrigido pela posição real que
   chega em `camera:ptz:position`.
5. O slider de zoom manda zoom absoluto sem pan e tilt, no máximo um comando a cada 150 ms durante o arraste, e
   um comando final exato ao soltar. Velocidade e precisão ficam salvas no navegador
   (`components/cameras-ptz-control/utils/ptz-control-preference-storage.util.ts`).
6. O card lateral (`components/camera-presets-panel/`) tem as abas Saúde, Presets, Automação e Analítico, sempre
   visíveis. Presets e Automação ficam desabilitadas sem PTZ ativo, e Analítico sem analítico.
7. Criar ou editar preset grava a posição exibida; editar abre o controle PTZ para ajustar. Clicar num preset
   dispara o ir para preset. A aba Automação cria, edita, liga, desliga e remove tours.

**Resultado.** O operador move a câmera, salva presets e opera tours na mesma tela. O `CamerasService` do
frontend só chama `/ptz/continuous`, `/ptz/stop` e `/ptz/absolute`; o relativo não tem tela.

**Erros.** Sem a permissão, cada controle fica na tela desabilitado, com cadeado e tooltip nomeando o acesso que
falta. Os códigos `CAMERA_UNREACHABLE`, `PTZ_NOT_SUPPORTED`, `PTZ_REQUIRES_ONVIF` e `CAMERA_NOT_PTZ` viram
mensagens próprias; os demais, a mensagem genérica. O detalhe não pede a confirmação de câmera fora de operação
(RNF-CAM-10).

O mesmo controle é montado na tela de Detecção do Analítico
(`apps/web-attlas/src/app/modules/analytics-detection/`) e no painel de câmera do ATSPM
(`apps/web-attlas/src/app/modules/analytics/components/atspm-camera-panel/`).

## 7. Operar PTZ pelo VMS

**Gatilho.** O operador seleciona uma célula do mosaico e toca o joystick
(`apps/web-attlas/src/app/modules/videowall/pages/videowall/videowall-ptz.store.ts`).

**Passos.**

1. Um único controle PTZ flutuante passa a operar a câmera da célula, sem trocar de tela.
2. Se a câmera não está `OPERATIONAL`, o store pede confirmação antes do primeiro comando, uma vez por célula na
   sessão.
3. Um segundo toque no joystick da mesma célula fecha o controle.

**Resultado.** PTZ operado dentro do mosaico. Layout e células são do [[Câmeras - VMS]].

**Erros.** Os mesmos do fluxo 1, exibidos no controle flutuante.

## 8. Operar PTZ pelo mapa

**Gatilho.** No Painel de Operações, o operador expande o popup de uma câmera no mapa.

**Passos.**

1. O popup abre o mesmo controle PTZ, renderizado uma vez na raiz da página do mapa
   (`apps/web-attlas/src/app/modules/operations-panel/services/ops-camera-ptz.service.ts`,
   `pages/operations-map/operations-map.page.html`).
2. O painel de câmera da interseção embute presets e automação, sem a aba de saúde
   (`components/camera-device-panel/`).

**Resultado.** Stream, PTZ e preset ficam alcançáveis a partir do mapa. A contagem de até dois cliques é
restrição de experiência: o código mostra onde está o controle, não mede os cliques.

**Erros.** Os mesmos do fluxo 1.
