---
tags:
  - doc
  - ms-cameras
  - eventos
  - analitico
atualizado: 2026-10-01
---

# Eventos, incidentes e alarmes - Catálogo e criticidade

Índice: [[Eventos, incidentes e alarmes]]. Mecânica do pipeline:
[[Eventos, incidentes e alarmes - Arquitetura e estratégias]].

Todo evento que o módulo Câmeras produz hoje, ordenado por criticidade, o que torna um evento crítico e onde
cada decisão mora no código.

## O que torna um evento crítico

Não existe campo `critical`. Criticidade é o resultado de quatro decisões, em quatro lugares, que não
coincidem:

| Eixo | Onde vive | Vocabulário | Quem decide |
| --- | --- | --- | --- |
| Severidade da linha | `CameraEventLog.severity` | `INFO`, `WARN`, `ERROR` | Catálogo de marca (`health/workers/axis-event-catalog.ts`, `hikvision-event-catalog.ts`) ou `resolveEventMeta` do worker |
| Chega ao tópico | `RecordCameraEventService` | Sim ou não | Evento de saúde só com par em `CORRELATABLE` |
| Alarmabilidade isolada | `consumers/emit-alarm/alarm-mapping.ts` (`isAlarmableEvent`) | Sim ou não | `ERROR` sempre; `VAPIX_TAMPERING` sempre; `VAPIX_PTZ_ERROR` a partir de `WARN` |
| Severidade de negócio | `mapToAlarm` (alarme) e `deriveIncidentSeverityAndType` (incidente) | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` | Só o `causeCode` e o flag `fromCluster` |

O `ERROR` da primeira linha é o "Crítico" do tile de KPI (UC-040). O `CRITICAL` da última só nasce quando o
evento vira alarme ou incidente. Um evento pode ser "crítico" na tela sem gerar alarme, e o inverso também
acontece (tampering entra como `WARN` e alarma).

**Definição de negócio aplicada pelo código**: crítico é o que indica perda de função ou de integridade do
equipamento, não variação de qualidade.

1. **Perda de função** (energia, hardware, rede, sinal de vídeo): entra como `ERROR`.
2. **Integridade violada** (tampering): único `WARN` que alarma isolado, com categoria `ROAD_SAFETY`.
3. **Exige intervenção física** (energia e hardware): os únicos que sobem para `CRITICAL`; é o tier que
   deveria gerar OS no Inventário (RF-INC-03, não atendido).
4. **Escala**: a mesma causa em 2 câmeras ou 3 eventos em 60 s promove o cluster e eleva comunicação de
   `MEDIUM` para `HIGH`. Escala multiplica a severidade, nunca a cria.

Não é crítico: latência, bitrate adaptado, instabilidade parcial, movimento e estado de PTZ, dia e noite,
recuperação (`HEALTH_ONLINE`) e o re-anúncio de tópico com estado (só transição vale linha).

## Eventos de câmera

`Ev.` é a `severity` da linha; `Corr.` diz se o par está em `CORRELATABLE`; "Chega ao `ms-alarms`" considera
o worker de saúde, único produtor real hoje.

### Tier 1 - perda de função com intervenção física

| Causa | Evento | Ev. | Categoria | Incidente | Alarme | Corr. | Chega ao `ms-alarms` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `VAPIX_POWER_FAILED` | `cameras.events.power_failed` | `ERROR` | `POWER` | `POWER` / `CRITICAL` | `SYSTEM_FUNCTIONING` / `CRITICAL` | sim | Sim, isolado ou pelo cluster |
| `VAPIX_HW_FAILURE` | `cameras.events.hardware_failure` | `ERROR` | `HARDWARE` | `HARDWARE` / `CRITICAL` | `SYSTEM_FUNCTIONING` / `CRITICAL` | **não** | **Não** (fica fora do tópico) |

### Tier 2 - integridade e comunicação

| Causa | Evento | Ev. | Categoria | Incidente | Alarme | Corr. | Chega ao `ms-alarms` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `VAPIX_TAMPERING` | `cameras.events.tampering` | `WARN` | `HARDWARE` | `VANDALISM` / `HIGH` | `ROAD_SAFETY` / `HIGH` | sim | Sim, isolado ou pelo cluster |
| `VAPIX_NETWORK_LOST` | `cameras.events.network_lost` | `ERROR` | `COMMUNICATION` | `COMMUNICATION` / `HIGH` | `SYSTEM_FUNCTIONING` / `MEDIUM` isolado, `HIGH` em cluster | via `CONNECTIVITY_CHANGED` | Só pelo cluster (o `HEALTH_EVENT` fica fora do tópico e o `CONNECTIVITY_CHANGED` que herda a causa sai como `WARN` ou `INFO`) |
| `PROBE_TIMEOUT` | `cameras.events.camera_disconnected` | `WARN` | `COMMUNICATION` | `COMMUNICATION` / `HIGH` | idem acima | só em `HEALTH_OFFLINE` | **Não** (o worker grava a causa em `CONNECTIVITY_CHANGED`, par fora do catálogo) |
| `PROBE_REFUSED`, `PROBE_UNREACHABLE` | `cameras.events.camera_disconnected` | `WARN` | `COMMUNICATION` | `COMMUNICATION` / `HIGH` | idem acima | sim | Sem produtor |
| `PUSH_DISCONNECT` | `cameras.events.camera_disconnected` | `WARN` | `COMMUNICATION` | `COMMUNICATION` / `HIGH` | Não alarmável (`null`) | sim | Não; vira incidente |

`PUSH_DISCONNECT` é a queda da nossa conexão de eventos (WebSocket Axis, alertStream Hikvision, PullPoint
ONVIF), não falha relatada pelo device: vira incidente, nunca alarme.

### Tier 3 - função degradada

| Causa | Evento | Ev. | Categoria | Incidente | Alarme | Corr. | Chega ao `ms-alarms` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `VAPIX_PTZ_ERROR` | `cameras.events.ptz_error` | `WARN` | `HARDWARE` | `OPERATIONAL` / `MEDIUM` | `SYSTEM_FUNCTIONING` / `MEDIUM` | não | **Não** (alarmável isolado, mas o `HEALTH_EVENT` fica fora do tópico) |

### Tier 4 - conectividade derivada (worker de saúde)

Vêm do evaluator, não do device ([[Saúde e monitoramento - Arquitetura e estratégias#Evaluator|evaluator]]).
Saem como `CONNECTIVITY_CHANGED` com a última causa conhecida.

| Transição | Evento | Ev. | Observação |
| --- | --- | --- | --- |
| para `OFFLINE` | `cameras.events.camera_went_offline` | `WARN` | Abre o incidente de conectividade interno |
| para `UNSTABLE` | `cameras.events.camera_unstable` | `WARN` | |
| para `PARTIALLY_UNSTABLE` | `cameras.events.camera_partially_unstable` | `INFO` | |
| para `STABLE` | `cameras.events.camera_recovered` | `INFO` | Fecha o incidente e grava `durationMinutes` |

A mesma transição sai em `attlas.cameras.status-changed`, e é por ali que o `ms-alarms` abre e fecha
`CAM_PARTIALLY_UNSTABLE`, `CAM_UNSTABLE` e `CAM_OFFLINE`.

### Tier 5 - informativos (`INFO`, nunca alarmam nem correlacionam)

- Axis: `stream_accessed` (nunca gravado, é provocado pela nossa relay), `ptz_ready`, `ptz_moved`,
  `ptz_queue_updated`, `bitrate_adapted`, `day_night_switch`, `device_ready`, `camera_connected`.
- Hikvision: `motion_detected`, `line_crossing`, `intrusion` (`regionentrance` e `regionexiting` caem na
  mesma chave).
- Tópico desconhecido: `cameras.events.device_event`.

### Hikvision com falha (causas ISAPI)

| Causa | Evento | Ev. | Estado |
| --- | --- | --- | --- |
| `ISAPI_HW_FAILURE` | `hardware_failure` (`diskfull`, `diskerror`, `badblock`) | `ERROR` | Categoria `OPERATIONAL`, sem incidente, sem alarme |
| `ISAPI_NETWORK_LOST` | `network_lost` (`nicbroken`, `ipconflict`) | `ERROR` | Idem |
| `ISAPI_TAMPERING` | `tampering` (`shelteralarm`, `scenechangedetection`) | `WARN` | Idem; a exceção de tampering testa só o código VAPIX |
| sem causa | `video_loss`, `illegal_access`, `tampering` (`defocus`) | `WARN` | Informativos na prática |

## Mapa de causa para incidente e alarme

Fontes: `consumers/correlate-events/correlation-rules.ts`, `incidents/incident-mapping.ts`,
`consumers/emit-alarm/alarm-mapping.ts`.

| `causeCode` | Incidente (severidade, tipo) | Alarme (categoria, severidade isolado e em cluster) |
| --- | --- | --- |
| `VAPIX_POWER_FAILED` | `CRITICAL`, `POWER` | `SYSTEM_FUNCTIONING`, `CRITICAL` |
| `VAPIX_HW_FAILURE` | `CRITICAL`, `HARDWARE` | `SYSTEM_FUNCTIONING`, `CRITICAL` |
| `VAPIX_TAMPERING` | `HIGH`, `VANDALISM` | `ROAD_SAFETY`, `HIGH` |
| `VAPIX_NETWORK_LOST`, `PROBE_TIMEOUT`, `PROBE_REFUSED`, `PROBE_UNREACHABLE` | `HIGH`, `COMMUNICATION` | `SYSTEM_FUNCTIONING`, `MEDIUM` isolado e `HIGH` em cluster |
| `PUSH_DISCONNECT` | `HIGH`, `COMMUNICATION` | Não alarmável |
| `VAPIX_PTZ_ERROR` | `MEDIUM`, `OPERATIONAL` | `SYSTEM_FUNCTIONING`, `MEDIUM` |
| Outro ou sem causa | `MEDIUM`, `OPERATIONAL` | Não alarmável |

Pares correlacionáveis (10): `HEALTH_EVENT` com `VAPIX_POWER_FAILED` ou `VAPIX_TAMPERING`; `HEALTH_OFFLINE`
com `VAPIX_NETWORK_LOST`, `PROBE_TIMEOUT`, `PROBE_REFUSED`, `PROBE_UNREACHABLE` ou `PUSH_DISCONNECT`;
`CONNECTIVITY_CHANGED` com `VAPIX_NETWORK_LOST`, `VAPIX_TAMPERING` ou `PUSH_DISCONNECT`.

No `ms-alarms`, todas as causas acima existem em `CAMERA_ALARM_TYPES`
(`libs/contracts/src/lib/alarms/catalog/types/cameras.ts`) com `generatesAlarm: false` e
`defaultSeverity: MEDIUM`: elas só viram alarme por regra customizada (`AlarmRule`), que define a
severidade. Já `CAM_PARTIALLY_UNSTABLE` (`LOW`), `CAM_UNSTABLE` (`MEDIUM`) e `CAM_OFFLINE` (`HIGH`), vindos de
`status-changed`, geram alarme por padrão.

> [!warning] Severidade de negócio do `ms-cameras` não chega ao alarme
> O `mapToAlarm` emite `CRITICAL` para energia e hardware, mas o `ms-alarms` usa a severidade da regra (ou a
> `defaultSeverity` `MEDIUM` do catálogo) e não lê o `severity` do envelope. As duas fontes não são
> confrontadas.

## Eventos do analítico

O caminho embarcado do analítico mora dentro do `ms-cameras` (`src/analytics-realtime/`); detalhe em
[[Analítico - Arquitetura e estratégias]].

| Evento | Onde vive | Criticidade |
| --- | --- | --- |
| `ANALYTICS_INCIDENT` (incidente DAI) | Linha em `CameraEventLog`, `cameras.events.analytics_incident.<tipo>` | `WARN`, categoria `ANALYTICS`, sem correlação; alarma pelo tipo (abaixo) |
| Saúde do analítico | `CameraAnalyticsHealthService` (UC-059), `analyticsHealth` do status | Leitura, não emite evento na transição |
| `camera:analytics:detection`, `camera:analytics:frame` | WebSocket `cameras-analytics` | Transitórios, não persistem |

Tipos do incidente DAI (`EnumAtmanIncidentType`) com a criticidade padrão (`DEFAULT_INCIDENT_CRITICALITY`,
configurável por sistema no UC-227) e o alarme:

| Tipo | Criticidade padrão | Alarme (`ANALYTICS`) |
| --- | --- | --- |
| `ANOMALY` | `CRITICAL` | Não |
| `ANIMAL` | `HIGH` | Não |
| `WRONG_WAY` | `MEDIUM` | `ANLT_WRONG_WAY`, `HIGH`, gera alarme por padrão |
| `VIOLATION` | `MEDIUM` | Não |
| `STOPPED_FLOW` | `MEDIUM` | `ANLT_STOPPED_VEHICLE`, `MEDIUM`, só por regra |
| `CONGESTION` | `MEDIUM` | `ANLT_SEVERE_CONGESTION`, `HIGH`, só por regra |
| `SLOW_MOVING` | `LOW` | Não |
| `TIME_EXCEEDED` | `LOW` | Não |

A criticidade do tipo é lida na hora (nenhuma linha de incidente é reescrita) e aparece na exportação da
fila; ela não muda a `severity` da linha nem o alarme.

## Eventos de integração (Kafka)

Não são eventos de câmera; ficam aqui para não confundir a tela de Eventos com o fio. Tabela completa de
direção e payload em [[Eventos, incidentes e alarmes - Arquitetura e estratégias#Kafka|Kafka]].

| Tópico | Papel |
| --- | --- |
| `attlas.cameras.event-logged` | Fan-out do evento registrado para correlação e alarme |
| `attlas.cameras.incident-created` | Cluster promovido a `DETECTED` |
| `attlas.alarms.alarm-raised` | Alarme com `alarmId` UUID v5 |
| `attlas.cameras.event-ingest` | Ingestão de evento externo, sem produtor |
| `attlas.cameras.status-changed` | Transição de `CameraConnectionStatus` |
| `attlas.cameras.ptz-command-executed` / `-rejected` | Resultado do comando de PTZ de plano |
| `attlas.cameras.videowall-command-executed` / `-rejected` | Resultado do comando de videowall de plano |

## Furos do pipeline de criticidade

- **Falha de hardware e erro de PTZ gravados pelo worker não chegam ao alarme.** `HEALTH_EVENT` com
  `VAPIX_HW_FAILURE` ou `VAPIX_PTZ_ERROR` não está em `CORRELATABLE`, então o seam não publica, apesar de o
  emissor saber alarmá-los.
- **`PROBE_TIMEOUT` não chega ao tópico.** O worker põe a causa no `CONNECTIVITY_CHANGED`, mas o catálogo só
  aceita `PROBE_TIMEOUT` em `HEALTH_OFFLINE`, que o worker só grava com `PUSH_DISCONNECT`.
- **Causas ISAPI são cegas** a categoria, correlação, incidente e alarme: falha de hardware numa Hikvision é
  `ERROR` na tela e nada além disso.
- **`ANIMAL` e `ANOMALY`**, as duas criticidades mais altas do padrão do analítico, não têm código de alarme.
