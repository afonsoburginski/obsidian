---
tags: [doc, cameras, ms-cameras, ptz]
servico: ms-cameras
fonte: apps/ms-cameras/src/cameras
atualizado: 2026-07-03
---

# PTZ e presets

Controle de câmeras móveis (Pan-Tilt-Zoom) do módulo Câmeras: movimentação manual, posições nomeadas (presets), tours/automações e rastreamento de posição em tempo real. Domínio do backend [[ms-cameras - visão geral]]. Visual: [[05 - MOD-004 ptz-presets.excalidraw|diagrama]].

> [!abstract] Escopo
> Cobre **RF-CAM-05** (pan/tilt contínuo, zoom óptico/digital, presets, tours, patrulha, rastreamento). Toda movimentação passa por autorização no módulo Permissões (**RF-INT-06/RNF-CAM-08**). Reposicionamento por Emergências (**RF-INT-04**) e preempção por prioridade são **regra de domínio ainda não implementada** no código — ver [[PTZ e presets - Arquitetura e estratégias]] e [[PTZ e presets - Requisitos e SLA]].

## Como funciona (resumo)

Dois caminhos de hardware coexistem, escolhidos por comando (não por fabricante configurado):

- **ONVIF** (`hardware/drivers/onvif/onvif.driver.ts` → `movePTZ`): movimentos manuais relativo/absoluto/contínuo (pan/tilt) e stop, em **unidades normalizadas ONVIF** (-1..1). Orquestrado por `cameras/services/ptz.service.ts` → `executeOnvifPtz`.
- **VAPIX/Axis** (`cameras/utils/vapix-ptz.utils.ts`, `vapix-zoom.utils.ts`): goto-preset e tours (absoluto em **unidades nativas** — graus + zoom 1..9999), zoom contínuo e zoom-stop. Presets guardam graus/percentual; a conversão vive nos utils VAPIX.

Detalhes de protocolo e integração de hardware: [[00 - Integração com dispositivo]].

## Endpoints

Prefixo `/api`. JWT validado no Kong; `operatorId` vem do `subject` do JWT e o Bearer é propagado ao módulo Permissões. Todos os controllers em `cameras/cameras.controller.ts`.

| Método | Rota | Ação | Status |
| --- | --- | --- | --- |
| `POST` | `/cameras/:id/ptz` | Movimento **relativo** (setas/joystick discreto) | 204 |
| `POST` | `/cameras/:id/ptz/absolute` | Movimento **absoluto** (ONVIF normalizado) | 204 |
| `POST` | `/cameras/:id/ptz/continuous` | Movimento **contínuo** (velocidade + timeout) | 204 |
| `POST` | `/cameras/:id/ptz/stop` | Para pan/tilt e/ou zoom | 204 |
| `GET` | `/cameras/:id/presets` | Lista presets | 200 |
| `POST` | `/cameras/:id/presets` | Cria preset (posição atual nomeada) | 201 |
| `PATCH` | `/cameras/:id/presets/:presetId` | Atualiza preset | 200 |
| `DELETE` | `/cameras/:id/presets/:presetId` | Remove preset | 204 |
| `POST` | `/cameras/:id/presets/:presetId/goto` | Move a câmera até o preset (VAPIX absoluto) | 204 |
| `GET` | `/cameras/:id/automations` | Lista tours/automações | 200 |
| `POST` | `/cameras/:id/automations` | Cria tour | 201 |
| `PUT` | `/cameras/:id/automations/:automationId` | Substitui tour (nome, ordem, intervalo, passos) | 200 |
| `PATCH` | `/cameras/:id/automations/:automationId/toggle` | Play/Pause (`isActive`) | 200 |
| `DELETE` | `/cameras/:id/automations/:automationId` | Remove tour | 204 |

Faixas de entrada (fonte única `libs/contracts/src/lib/camera/ptz-command-validation.ts`): pan/tilt `-1..1`, zoom absoluto `0..1`, zoom contínuo (com sinal) `-1..1`, speed `0..1` (default `0.5`), `timeoutSeconds` `1..60` (cap runtime default `30`).

## Handlers CQRS

Sob `cameras/handlers/`. Comandos comandam o hardware/mutam presets/tours; queries só leem.

| Tipo | Handler | Papel |
| --- | --- | --- |
| Command | `move-relative-ptz-camera` | Deriva `PTZAction` por eixo (pan→tilt→zoom, magnitude ignorada) → ONVIF |
| Command | `move-absolute-ptz-camera` | Absoluto ONVIF normalizado |
| Command | `move-continuous-ptz-camera` | Contínuo ONVIF; **zoom-only** desvia para VAPIX; valida timeout cap |
| Command | `stop-ptz-camera` | Zoom stop via VAPIX + pan/tilt stop via ONVIF (silencia `CAMERA_NOT_PTZ`) |
| Command | `create-preset` / `update-preset` / `delete-preset` | CRUD de posições nomeadas |
| Command | `go-to-preset` | Carrega preset → `executeVapixAbsolute` |
| Command | `create-automation` / `update-automation` / `delete-automation` | CRUD de tours |
| Command | `toggle-automation` | Gate `cameras:ptz` na ativação + dirige `TourRunnerService` (start/stop) |
| Query | `list-presets` / `list-automations` | Leitura |

Serviços de apoio: `cameras/services/ptz.service.ts` (pipeline de execução + audit), `cameras/services/tour-runner.service.ts` (scheduler in-process de tours), `cameras/clients/permissions.client.ts` (`assertAllowed('cameras:ptz')`), `cameras/helpers/ptz-guards.helper.ts` (ONVIF/PTZ/perfil de mídia/credencial).

## Persistência (Prisma)

Schema em `src/database/schema/ptz/`. Repositórios: `cameras/repositories/presets.repository.ts`, `automations.repository.ts`.

| Modelo | Campos-chave | Notas |
| --- | --- | --- |
| `CameraPtzPreset` | `panDegrees` `Decimal(6,3)`, `tiltDegrees` `Decimal(6,3)`, `zoomLevel` `Decimal(5,2)` (%), `isDefault`, `sortOrder` | Posição em graus nativos; zoom em percentual. `onDelete: Cascade` com a câmera |
| `CameraPtzTour` | `isActive`, `randomOrder`, `intervalMinutes`, `repeatCount` | `repeatCount` é persistido como `0` fixo e **não é usado** pelo runner (itera por budget de `intervalMinutes`) |
| `CameraPtzTourStep` | `presetId`, `dwellTimeSeconds`, `transitionSeconds`, `speedPercent`, `sortOrder` | `onDelete: Restrict` no preset (não apaga preset em uso); único `(tourId, sortOrder)` |

A auditoria de cada comando cai em `CameraEventLog` (`eventType='PTZ_COMMAND'`) — ver [[PTZ e presets - Arquitetura e estratégias]] e [[00 - Eventos, incidentes e alarmes]]. A posição PTZ observada é gravada em `CameraOperationalSnapshot` (`ptzPan/ptzTilt/ptzZoom`) — ver [[Status em tempo real (push)]].

## Ver também

- [[PTZ e presets - Arquitetura e estratégias]] — pipeline ONVIF/VAPIX, autorização, tour-runner, auditoria, posição em tempo real.
- [[PTZ e presets - Fluxos]] — comando PTZ, goto preset, tour; user flows (detalhe da câmera, Video Wall, mapa).
- [[PTZ e presets - Requisitos e SLA]] — RF/RNF cobertos, estado de implementação, SLA de latência.
- Relacionados: [[00 - Integração com dispositivo]] · [[Status em tempo real (push)]] · [[00 - Eventos, incidentes e alarmes]] · [[00 - Video Wall]].
