---
tags: [doc, cameras, ms-cameras, ptz]
servico: ms-cameras
fonte: apps/ms-cameras/src/cameras
atualizado: 2026-07-03
---

# PTZ e presets - Fluxos

Fluxos de use case (backend) e de usuário (frontend). Contexto e endpoints: [[00 - PTZ e presets]]. Arquitetura: [[PTZ e presets - Arquitetura e estratégias]]. Visual: [[05 - MOD-004 ptz-presets.excalidraw|diagrama]].

## UC — Comando PTZ manual (autorização → driver → device)

Vale para relativo (`POST /cameras/:id/ptz`), absoluto (`/ptz/absolute`), contínuo (`/ptz/continuous`) e stop (`/ptz/stop`). Caminho ONVIF em `ptz.service.ts → executeOnvifPtz`.

| # | Passo | Onde | Falha típica |
| --- | --- | --- | --- |
| 1 | Kong valida o JWT; controller extrai `operatorId` (subject) e Bearer | `cameras.controller.ts` | 401 no gateway |
| 2 | Handler valida payload (≥1 eixo não-zero; timeout ≤ cap) | `handlers/move-*-ptz-camera` | `PTZ_VELOCITY_OUT_OF_RANGE`, `PTZ_TIMEOUT_OUT_OF_RANGE` |
| 3 | `findForPtz` carrega câmera + credencial + perfil | `cameras.repository.ts` | `ResourceNotFoundException` (câmera) |
| 4 | **Autorização** `assertAllowed('cameras:ptz')` | `permissions.client.ts` | `FORBIDDEN` (403) · `PERMISSIONS_SERVICE_UNAVAILABLE` (fail-closed) |
| 5 | Guards: ONVIF, PTZ, perfil de mídia, credencial | `ptz-guards.helper.ts` | `PTZ_REQUIRES_ONVIF`, `CAMERA_NOT_PTZ`, `PTZ_NOT_SUPPORTED`, `CAMERA_CREDENTIAL_MISSING` |
| 6 | `connect` → `movePTZ` (seq.) → `disconnect`, cada um sob timeout | `onvif.driver.ts` | `CAMERA_UNREACHABLE` (timeout/erro) |
| 7 | Grava auditoria `PTZ_COMMAND` (`subType`, `operatorId`) | `camera-event-log.repository.ts` | — |

**Variações**: contínuo **zoom-only** (só `velocity.zoom`) desvia para VAPIX (`executeVapixZoom`) — funciona em câmera FIXA com zoom óptico. **Stop** para zoom via VAPIX sempre e pan/tilt via ONVIF; se a câmera não é PTZ (`CAMERA_NOT_PTZ`), o stop de pan/tilt é no-op silencioso. Resposta de sucesso: `204 No Content`.

## UC — Ir para preset (`POST /cameras/:id/presets/:presetId/goto`)

Caminho VAPIX absoluto. Handler `handlers/go-to-preset`.

1. `presetsRepository.findById(cameraId, presetId)` → 404 `CAMERA_PRESET_NOT_FOUND` se não existe.
2. `ptz.executeVapixAbsolute` com `pan=panDegrees`, `tilt=tiltDegrees`, `zoom=presetZoomLevelToVapix(zoomLevel)`, `speed=undefined`.
3. Dentro de `loadForVapix`: câmera não encontrada, credencial ausente e **autorização** `cameras:ptz` são checadas aqui (mesmas regras do fluxo manual).
4. Falha de rede → `CAMERA_UNREACHABLE`. Grava `PTZ_COMMAND` subType `ABSOLUTE`. Sucesso: `204`.

## UC — Execução de tour (`PATCH …/automations/:automationId/toggle`)

Handler `handlers/toggle-automation` + `services/tour-runner.service.ts`.

1. Confere que a automação pertence à câmera → 404 se não.
2. Se ativando (`isActive=true`) e há operador: **gate único** `cameras:ptz` com token vivo.
3. Persistência atômica: `activateExclusive` (ativar desativa os demais tours da câmera; advisory lock) ou `setActive(false)`.
4. `tourRunner.start(...)` ou `.stop(...)`.
5. **Runner** (fire-and-forget): carrega passos e mapa de presets; a cada passo `executeVapixAbsolute` (sem re-check de permissão — `requesterToken: null`; `operatorId` só para auditoria), dorme `transition + dwell`.
6. Encerramento: budget `intervalMinutes` esgota, passada única concluída, Pause, ou **circuit-breaker** (3 falhas → `AUTOMATION_ABORTED`). Reconcilia `isActive=false`.

## User flow — controle no detalhe da câmera

Superfície principal do feature module `cameras` (frontend). Controles manuais (setas/joystick, zoom, speed) → endpoints PTZ; lista/gestão de presets e tours → endpoints de presets/automations; a **posição PTZ atual** atualiza via Socket.IO (`camera:ptz:position`, ver [[Status em tempo real (push)]]). Criar preset captura a posição corrente; um clique em preset dispara `goto`.

## User flow — PTZ inline no Video Wall (RF-VW-04)

O controle PTZ fica disponível via overlay em qualquer célula do Video Wall, **sem trocar de tela**, e o **estado da sessão PTZ é mantido por célula ativa**. Os comandos usam os mesmos endpoints PTZ desta nota; a orquestração de layout/células pertence ao [[00 - Video Wall]].

## User flow — acesso em ≤ 2 cliques a partir do mapa (RNF-CAM-07)

A partir do mapa operacional (Painel de Operações / Modelo de Trafego), stream, **controle PTZ e ativação de preset** devem ser alcançáveis em **no máximo 2 cliques** (via popup da câmera). É restrição de UX do frontend/módulos de mapa sobre os mesmos endpoints; o backend só expõe as rotas. Ver [[PTZ e presets - Requisitos e SLA]].

## Ver também

- [[00 - PTZ e presets]] · [[PTZ e presets - Arquitetura e estratégias]] · [[PTZ e presets - Requisitos e SLA]]
- [[00 - Video Wall]] · [[Status em tempo real (push)]] · [[00 - Integração com dispositivo]]
