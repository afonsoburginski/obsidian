---
tags:
  - doc
  - ms-cameras
  - ptz
atualizado: 2026-10-01
---

# PTZ e presets - Requisitos e SLA

Parte de [[PTZ e presets]]. Fonte de negócio: `docs/modules/cameras.md`. Legenda: **Implementado**,
**Parcial**, **Não implementado**.

## Requisitos

| ID | Critério | Onde no código | Estado |
| --- | --- | --- | --- |
| RF-CAM-05 | Pan e tilt contínuo, zoom óptico e digital, presets, tours, patrulha e rastreamento | `ptz.service.ts`, `onvif.driver.ts`, utilitários VAPIX, presets, automações, `tour-runner.service.ts` | **Parcial** |
| RF-INT-04 | Reposicionamento por Emergências com prioridade máxima, preemptando sessão ativa | `attlas.emergencies.ptz-command` só declarado, sem consumidor | **Não implementado** |
| RF-INT-06 | Acesso governado por Permissões, com preempção | Chaves `cameras.ptz:control`, `cameras.ptzPreset:manage` e `cameras.automation:manage` por câmera; sem prioridade | **Parcial** |
| RNF-CAM-03 | Latência de PTZ adequada a incidentes | Timeouts curtos (tabela abaixo) | **Parcial** |
| RNF-CAM-06 | Toda ação do operador registrada com instante e identidade | `PTZ_COMMAND` no `CameraEventLog` e auditoria em `attlas.audit.cameras` | **Parcial** |
| RNF-CAM-07 | Stream, PTZ e preset em até dois cliques a partir do mapa | Controle PTZ e presets no popup do Painel de Operações | **Parcial** (frontend) |
| RNF-CAM-08 | Autorização multidimensional com preempção PTZ | Dimensões funcional e espacial pela chave por câmera; sem prioridade nem preempção | **Parcial** |

O que falta em cada um:

- **RF-CAM-05**: patrulha e rastreamento não têm modo dedicado; "rastreamento" hoje é só observar a posição
  (Axis, pelo worker de saúde). O relativo ignora magnitude e não tem tela. Goto e tour são Axis (VAPIX).
- **RF-INT-04**: nenhum consumidor de emergências; o único PTZ automático é o de plano de resposta, sem
  prioridade sobre o operador.
- **RF-INT-06 e RNF-CAM-08**: faltam prioridade, sessão PTZ exclusiva e cessão de controle. As peças existem
  fora do caminho do PTZ (chaves `cameras.ptz:preempt` e `cameras.ptz:release`, `ResourceLockType.PTZ` do
  `ms-organization`, tópico `attlas.cameras.ptz-preempted`) e ninguém as liga.
- **RNF-CAM-06**: criar, substituir e remover tour não deixam registro, só log de aplicação.
- **RNF-CAM-07**: os cliques não foram medidos.

## Limites e timeouts (RNF-CAM-03)

O requisito é qualitativo. Os limites que evitam travamento:

| Parâmetro | Env ou constante | Default | Efeito |
| --- | --- | --- | --- |
| Connect ONVIF | `ONVIF_CONNECT_TIMEOUT_MS` | 5000 ms | `CAMERA_UNREACHABLE` |
| Comando e disconnect ONVIF | `ONVIF_COMMAND_TIMEOUT_MS` | 4000 ms | `CAMERA_UNREACHABLE` |
| Avaliação de permissão (rota e ativação de tour) | `CORE_AUTH_PERMISSION_TIMEOUT_MS` | 800 ms | 503 `PERMISSION_RESOLVER_UNAVAILABLE` |
| Circuit breaker do avaliador | `CORE_AUTH_PERMISSION_CIRCUIT_THRESHOLD`, `CORE_AUTH_PERMISSION_CIRCUIT_OPEN_MS` | 5 falhas, 5000 ms | Nega sem consultar enquanto aberto |
| Teto do `timeoutSeconds` do contínuo | `PTZ_CONTINUOUS_MAX_TIMEOUT_SECONDS` | 30 s (máximo 60) | Auto-stop do equipamento |
| Porta RTSP | `RTSP_DEFAULT_PORT` | 554 | URI RTSP; o ONVIF usa a porta do perfil |
| Leitura da posição | `PTZ_TRACK_INTERVAL_MS` | 750 ms (piso 500) | Cadência enquanto a câmera se move |
| Sessão de controle ociosa | `PtzSessionConfig.IDLE_TTL_SECONDS` | 120 s | Fecha e emite `CAMERA_PTZ_SESSION_ENDED` |
| Eco ao plano de resposta | `PUBLISH_DEADLINE_MS` (`camera-events.publisher.ts`) | 20 s | Handler falha e o Kafka reentrega |
| Ledger do comando por plano | chave `ms-cameras:ptz-command:<commandId>` | 1 h | Reentrega não move de novo |
| Espera antes da captura | `PresetSnapshotCapture.PTZ_SETTLE_MS` | 3 s | A câmera assenta no preset |

O contínuo depende do auto-stop do ONVIF (`Timeout` no envelope) como rede de segurança se o stop se perder;
a tela usa 3 s e renova a cada 1,8 s enquanto o botão está pressionado.
