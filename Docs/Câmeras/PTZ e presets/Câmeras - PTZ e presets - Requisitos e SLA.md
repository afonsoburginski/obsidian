---
tags:
  - doc
  - cameras
  - ptz
  - ms-cameras
aliases:
  - "PTZ e presets - Requisitos e SLA"
atualizado: 2026-10-07
banner: "ptz camera security"
---

# Câmeras - PTZ e presets - Requisitos e SLA

Volta para [[Câmeras - PTZ e presets]].

## Resumo

Fonte de negócio: `docs/modules/cameras.md`. Nenhum requisito de PTZ está completo: faltam prioridade e preempção,
o reposicionamento por Emergências e modos de patrulha e rastreamento.

| Requisito | Estado | O que o código faz e o que falta |
| --- | --- | --- |
| RF-CAM-05 Pan e tilt contínuo, zoom óptico e digital, presets, tours, patrulha e rastreamento | **Parcial** | Contínuo, absoluto, relativo, zoom, presets e tours existem. Patrulha e rastreamento não têm modo dedicado; "rastreamento" hoje é só observar a posição da Axis. O relativo ignora a magnitude e não tem tela. Ir para preset e tour são só Axis |
| RF-INT-04 Reposicionamento por Emergências com prioridade máxima, preemptando sessão ativa | **Não implementado** | `attlas.emergencies.ptz-command` só declarado, sem consumidor; o único PTZ automático é o de plano de resposta, sem prioridade sobre o operador |
| RF-INT-06 Acesso governado por Permissões, com preempção | **Parcial** | Chaves `cameras.ptz:control`, `cameras.ptzPreset:manage` e `cameras.automation:manage` por câmera; faltam prioridade, sessão exclusiva e cessão de controle |
| RNF-CAM-03 Latência de PTZ adequada a incidentes | **Parcial** | Timeouts curtos e sessão ONVIF de controle reaproveitada; não há meta numérica |
| RNF-CAM-06 Toda ação do operador registrada com instante e identidade | **Parcial** | `PTZ_COMMAND` no `CameraEventLog` e auditoria em `attlas.audit.cameras`; criar, substituir e remover tour não deixam registro |
| RNF-CAM-07 Stream, PTZ e preset em até dois cliques a partir do mapa | **Parcial**, só frontend | Controle PTZ e presets no popup do Painel de Operações; os cliques não foram medidos |
| RNF-CAM-08 Autorização multidimensional com preempção PTZ | **Parcial** | Dimensões funcional e espacial pela chave por câmera; sem prioridade nem preempção. As peças existem fora do PTZ (`cameras.ptz:preempt`, `cameras.ptz:release`, `ResourceLockType.PTZ` do `ms-organization`, `attlas.cameras.ptz-preempted`) e ninguém as liga |
| RNF-CAM-10 Confirmação antes de operar câmera fora de operação | **Parcial** | O VMS pede a confirmação; o detalhe da câmera não pede |

## Regras

| Regra | Valor | Onde no código |
| --- | --- | --- |
| Pan e tilt do comando manual | -1 a 1, normalizado | `PtzCommandValidation`, `libs/contracts/src/lib/camera/ptz-command-validation.ts` |
| Zoom absoluto | 0 a 1 | `PtzCommandValidation.zoom` |
| Zoom contínuo | -1 a 1, com sinal | `PtzCommandValidation.velocity` |
| Velocidade | 0 a 1, padrão 0,5 | `PtzCommandValidation.defaultSpeed` |
| `timeoutSeconds` do contínuo | 1 a 60 no contrato, teto de execução padrão 30 | `PtzCommandValidation.timeoutSeconds`, `move-continuous-ptz-camera.handler.ts` |
| Preset | nome de 1 a 64 caracteres, pan e tilt de -180 a 180 graus, zoom de 0 a 100% | `CameraValidation.preset`, `libs/contracts/src/lib/camera/camera.validation.ts` |
| Relativo por plano | pan e tilt de -180 a 180 graus, zoom de -100 a 100%, ao menos um eixo diferente de zero | `CameraValidation.relativeMove` |
| Zoom VAPIX | 1 a 9999; preset de 0 a 100% convertido por `presetZoomLevelToVapix` | `cameras/utils/vapix-ptz.utils.ts` |
| Sessão ONVIF de controle | 5 s para abrir, 4 s por comando, descartada após 120 s ociosa | `ptz.service.ts`, `PTZ_DRIVER_IDLE_TTL_MS` |
| Avaliação de permissão (rota e ativação de tour) | 800 ms | `DEFAULT_PERMISSION_RESOLVER_HTTP_TIMEOUT_MS`, `libs/core-auth` |
| Circuito do avaliador de permissão | abre após 5 falhas, por 5000 ms, negando sem consultar | `libs/core-auth/src/lib/permissions/permission-resolver.constants.ts` |
| Leitura da posição enquanto a câmera se move | a cada 750 ms, mínimo 500 ms | `PtzTrackConfig`, `health/workers/camera-health.worker.ts` |
| Sessão de auditoria ociosa | 120 s, depois emite `CAMERA_PTZ_SESSION_ENDED` | `PtzSessionConfig.IDLE_TTL_SECONDS`, `shared/audit/ptz-session.constants.ts` |
| Eco ao plano de resposta | 20 s, depois o handler falha e o Kafka reentrega | `PUBLISH_DEADLINE_MS`, `events/publishing/camera-events.publisher.ts` |
| Ledger do comando por plano | 1 h | `ptz-command-ledger.service.ts` |
| Lease do tour | 30 s, renovado a cada 10 s | `TourLeaseTiming`, `cameras/services/tour-lease.constants.ts` |
| Varredura de tours sem condutor | a cada 15 s e no boot | `TourLeaseTiming.SWEEP_INTERVAL_MS` |
| Falhas seguidas que abortam o tour | 3 | `TourRunnerService.MAX_CONSECUTIVE_FAILURES` |
| Espera antes da captura do enquadramento | 3 s | `PresetSnapshotCapture.PTZ_SETTLE_MS`, `cameras/cameras.constants.ts` |
| Contínuo da tela | `timeoutSeconds` de 3 s, renovado a cada 1,8 s; o auto-stop do ONVIF para a câmera se a parada se perder | `PtzControlDefaults`, `cameras-ptz-control.constants.ts` |
| Slider de zoom da tela | no máximo um comando a cada 150 ms | `cameras-ptz-control.component.ts` |

## Variáveis de ambiente

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `ONVIF_CONNECT_TIMEOUT_MS` | 5000 | Prazo para abrir a sessão ONVIF de controle; estouro é `CAMERA_UNREACHABLE` |
| `ONVIF_COMMAND_TIMEOUT_MS` | 4000 | Prazo de cada comando ONVIF; estouro é `CAMERA_UNREACHABLE` |
| `PTZ_CONTINUOUS_MAX_TIMEOUT_SECONDS` | 30 (máximo 60) | Teto do `timeoutSeconds` aceito no contínuo |
| `RTSP_DEFAULT_PORT` | 554 | Porta RTSP nas opções de conexão; o ONVIF usa a porta do perfil |
| `PTZ_TRACK_INTERVAL_MS` | 750 (mínimo 500) | Intervalo da leitura de posição enquanto a câmera se move |
| `CORE_AUTH_PERMISSION_TIMEOUT_MS` | 800 | Prazo da avaliação de permissão; estouro é 503 `PERMISSION_RESOLVER_UNAVAILABLE` |
| `CORE_AUTH_PERMISSION_CIRCUIT_THRESHOLD` | 5 | Falhas do avaliador que abrem o circuito |
| `CORE_AUTH_PERMISSION_CIRCUIT_OPEN_MS` | 5000 | Tempo em que o circuito fica aberto negando sem consultar |
