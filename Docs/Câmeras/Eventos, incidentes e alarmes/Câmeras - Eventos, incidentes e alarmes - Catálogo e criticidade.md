---
tags:
  - doc
  - cameras
  - eventos
  - analitico
  - ms-cameras
aliases:
  - "Eventos, incidentes e alarmes - Catálogo e criticidade"
atualizado: 2026-10-07
banner: "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=1200"
---

# Câmeras - Eventos, incidentes e alarmes - Catálogo e criticidade

Volta para [[Câmeras - Eventos, incidentes e alarmes]].

## Resumo

Não existe campo `critical`: a criticidade de um evento é o resultado de quatro decisões, tomadas em quatro
lugares do código, que nem sempre coincidem. O código trata como crítico o que indica perda de função ou de
integridade do equipamento, não variação de qualidade. Só energia e hardware chegam a `CRITICAL`, e só
tampering alarma mesmo sendo `WARN`. A mecânica do pipeline está em
[[Câmeras - Eventos, incidentes e alarmes - Arquitetura e estratégias]].

## O que torna um evento crítico

| Eixo | Onde vive | Valores | Quem decide |
| --- | --- | --- | --- |
| Severidade da linha | `CameraEventLog.severity` | `INFO`, `WARN`, `ERROR` | Catálogo da marca (`health/workers/axis-event-catalog.ts`, `hikvision-event-catalog.ts`) ou `resolveEventMeta` do worker |
| Chegada ao tópico | `RecordCameraEventService` | Sim ou não | Evento de saúde só publica com par em `CORRELATABLE` |
| Alarme do evento isolado | `isAlarmableEvent`, `events/consumers/emit-alarm/alarm-mapping.ts` | Sim ou não | `ERROR` sempre; `VAPIX_TAMPERING` sempre; `VAPIX_PTZ_ERROR` a partir de `WARN` |
| Severidade de negócio | `mapToAlarm` (alarme) e `deriveIncidentSeverityAndType` (incidente) | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` | Só o `causeCode` e o flag `fromCluster` |

O `ERROR` da primeira linha é o "Crítico" do tile de KPI da tela de Eventos. O `CRITICAL` da última só nasce
quando o evento vira alarme ou incidente. Por isso um evento pode ser "crítico" na tela sem gerar alarme, e o
inverso também acontece: tampering entra como `WARN` e alarma.

A regra que o código aplica, em quatro degraus:

1. **Perda de função** (energia, hardware, rede, sinal de vídeo) entra como `ERROR`.
2. **Integridade violada** (tampering) é o único `WARN` que alarma isolado, com categoria `ROAD_SAFETY`.
3. **Intervenção física necessária** (energia e hardware) são os únicos que sobem para `CRITICAL`. É o degrau
   que deveria gerar ordem de serviço no Inventário, requisito ainda não atendido.
4. **Escala**: a mesma causa em 2 câmeras ou 3 eventos dentro de 60 s promove o incidente e eleva a
   comunicação de `MEDIUM` para `HIGH`. A escala aumenta a severidade, nunca a cria.

Não é crítico: latência, bitrate adaptado, instabilidade parcial, movimento e estado de PTZ, troca dia e noite,
recuperação (`HEALTH_ONLINE`) e o reenvio periódico de um tópico com estado, porque só a transição grava linha.

## Eventos de câmera

Nas tabelas, `Sev.` é a `severity` da linha, `Corr.` diz se o par está em `CORRELATABLE`, e "Chega ao
`ms-alarms`" considera o worker de saúde, único produtor real hoje.

### Degrau 1: perda de função com intervenção física

| Causa | Evento | Sev. | Categoria | Incidente | Alarme | Corr. | Chega ao `ms-alarms` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `VAPIX_POWER_FAILED` | `cameras.events.power_failed` | `ERROR` | `POWER` | `POWER`, `CRITICAL` | `SYSTEM_FUNCTIONING`, `CRITICAL` | sim | Sim, isolado ou pelo incidente |
| `VAPIX_HW_FAILURE` | `cameras.events.hardware_failure` | `ERROR` | `HARDWARE` | `HARDWARE`, `CRITICAL` | `SYSTEM_FUNCTIONING`, `CRITICAL` | **não** | **Não**, fica fora do tópico |

### Degrau 2: integridade e comunicação

| Causa | Evento | Sev. | Categoria | Incidente | Alarme | Corr. | Chega ao `ms-alarms` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `VAPIX_TAMPERING` | `cameras.events.tampering` | `WARN` | `HARDWARE` | `VANDALISM`, `HIGH` | `ROAD_SAFETY`, `HIGH` | sim | Sim, isolado ou pelo incidente |
| `VAPIX_NETWORK_LOST` | `cameras.events.network_lost` | `ERROR` | `COMMUNICATION` | `COMMUNICATION`, `HIGH` | `SYSTEM_FUNCTIONING`, `MEDIUM` isolado e `HIGH` em incidente | por `CONNECTIVITY_CHANGED` | Só pelo incidente: o `HEALTH_EVENT` fica fora do tópico, e o `CONNECTIVITY_CHANGED` que herda a causa sai como `WARN` ou `INFO` |
| `PROBE_TIMEOUT` | `cameras.events.camera_disconnected` | `WARN` | `COMMUNICATION` | `COMMUNICATION`, `HIGH` | igual a `VAPIX_NETWORK_LOST` | só em `HEALTH_OFFLINE` | **Não**: o worker grava a causa em `CONNECTIVITY_CHANGED`, par fora da lista |
| `PROBE_REFUSED`, `PROBE_UNREACHABLE` | `cameras.events.camera_disconnected` | `WARN` | `COMMUNICATION` | `COMMUNICATION`, `HIGH` | igual a `VAPIX_NETWORK_LOST` | sim | Sem produtor |
| `PUSH_DISCONNECT` | `cameras.events.camera_disconnected` | `WARN` | `COMMUNICATION` | `COMMUNICATION`, `HIGH` | Não alarmável | sim | Não; vira só incidente |

`PUSH_DISCONNECT` é a queda da nossa conexão de eventos com o equipamento (WebSocket da Axis, alertStream da
Hikvision, PullPoint do ONVIF), não uma falha relatada pela câmera. Por isso vira incidente e nunca alarme.

### Degrau 3: função degradada

| Causa | Evento | Sev. | Categoria | Incidente | Alarme | Corr. | Chega ao `ms-alarms` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `VAPIX_PTZ_ERROR` | `cameras.events.ptz_error` | `WARN` | `HARDWARE` | `OPERATIONAL`, `MEDIUM` | `SYSTEM_FUNCTIONING`, `MEDIUM` | não | **Não**: é alarmável isolado, mas o `HEALTH_EVENT` fica fora do tópico |

### Degrau 4: conectividade derivada pelo worker de saúde

Vêm do avaliador de estado, não do equipamento
([[Câmeras - Saúde e monitoramento - Arquitetura e estratégias]]), e saem como `CONNECTIVITY_CHANGED` com a
última causa conhecida.

| Transição | Evento | Sev. | Efeito |
| --- | --- | --- | --- |
| Para `OFFLINE` | `cameras.events.camera_went_offline` | `WARN` | Abre o incidente de conectividade interno |
| Para `UNSTABLE` | `cameras.events.camera_unstable` | `WARN` | Nenhum além da linha |
| Para `PARTIALLY_UNSTABLE` | `cameras.events.camera_partially_unstable` | `INFO` | Nenhum além da linha |
| Para `STABLE` | `cameras.events.camera_recovered` | `INFO` | Fecha o incidente e grava `durationMinutes` |

A mesma transição sai em `attlas.cameras.status-changed`, e é por esse tópico que o `ms-alarms` abre e fecha
`CAM_PARTIALLY_UNSTABLE`, `CAM_UNSTABLE` e `CAM_OFFLINE`.

### Degrau 5: informativos

São `INFO`, nunca alarmam nem correlacionam.

| Marca | Eventos |
| --- | --- |
| Axis | `stream_accessed` (nunca gravado, porque a própria puxada do Attlas o provoca), `ptz_ready`, `ptz_moved`, `ptz_queue_updated`, `bitrate_adapted`, `day_night_switch`, `device_ready`, `camera_connected` |
| Hikvision | `motion_detected`, `line_crossing`, `intrusion` (`regionentrance` e `regionexiting` caem na mesma chave) |
| Tópico desconhecido | `cameras.events.device_event` |

### Hikvision com falha

| Causa | Evento e origem ISAPI | Sev. | Efeito |
| --- | --- | --- | --- |
| `ISAPI_HW_FAILURE` | `hardware_failure` (`diskfull`, `diskerror`, `badblock`) | `ERROR` | Categoria `OPERATIONAL`, sem incidente, sem alarme |
| `ISAPI_NETWORK_LOST` | `network_lost` (`nicbroken`, `ipconflict`) | `ERROR` | Igual ao anterior |
| `ISAPI_TAMPERING` | `tampering` (`shelteralarm`, `scenechangedetection`) | `WARN` | Igual ao anterior; a exceção de tampering só testa o código VAPIX |
| Sem causa | `video_loss`, `illegal_access`, `tampering` (`defocus`) | `WARN` | Informativos na prática |

## Mapa de causa para incidente e alarme

Fontes: `events/consumers/correlate-events/correlation-rules.ts`, `events/incidents/incident-mapping.ts` e
`events/consumers/emit-alarm/alarm-mapping.ts`.

| `causeCode` | Incidente (severidade, tipo) | Alarme (categoria, severidade isolado e em incidente) |
| --- | --- | --- |
| `VAPIX_POWER_FAILED` | `CRITICAL`, `POWER` | `SYSTEM_FUNCTIONING`, `CRITICAL` |
| `VAPIX_HW_FAILURE` | `CRITICAL`, `HARDWARE` | `SYSTEM_FUNCTIONING`, `CRITICAL` |
| `VAPIX_TAMPERING` | `HIGH`, `VANDALISM` | `ROAD_SAFETY`, `HIGH` |
| `VAPIX_NETWORK_LOST`, `PROBE_TIMEOUT`, `PROBE_REFUSED`, `PROBE_UNREACHABLE` | `HIGH`, `COMMUNICATION` | `SYSTEM_FUNCTIONING`, `MEDIUM` isolado e `HIGH` em incidente |
| `PUSH_DISCONNECT` | `HIGH`, `COMMUNICATION` | Não alarmável |
| `VAPIX_PTZ_ERROR` | `MEDIUM`, `OPERATIONAL` | `SYSTEM_FUNCTIONING`, `MEDIUM` |
| Outro ou sem causa | `MEDIUM`, `OPERATIONAL` | Não alarmável |

Os 10 pares correlacionáveis:

| `eventType` | `causeCode` aceitos |
| --- | --- |
| `HEALTH_EVENT` | `VAPIX_POWER_FAILED`, `VAPIX_TAMPERING` |
| `HEALTH_OFFLINE` | `VAPIX_NETWORK_LOST`, `PROBE_TIMEOUT`, `PROBE_REFUSED`, `PROBE_UNREACHABLE`, `PUSH_DISCONNECT` |
| `CONNECTIVITY_CHANGED` | `VAPIX_NETWORK_LOST`, `VAPIX_TAMPERING`, `PUSH_DISCONNECT` |

No `ms-alarms`, as oito causas alarmáveis acima existem em `CAMERA_ALARM_TYPES`
(`libs/contracts/src/lib/alarms/catalog/types/cameras.ts`) com `generatesAlarm: false` e `defaultSeverity`
`MEDIUM`: viram alarme só por regra customizada (`AlarmRule`), que define a severidade. Já
`CAM_PARTIALLY_UNSTABLE` (`LOW`), `CAM_UNSTABLE` (`MEDIUM`) e `CAM_OFFLINE` (`HIGH`), vindos de
`status-changed`, geram alarme por padrão.

> [!warning] A severidade de negócio do `ms-cameras` não chega ao alarme
> O `mapToAlarm` emite `CRITICAL` para energia e hardware, mas o `ms-alarms` classifica pelo `causeCode` e usa
> a severidade da regra, ou a `defaultSeverity` `MEDIUM` do catálogo, sem ler o `severity` do envelope. As
> duas fontes não são confrontadas.

## Eventos do analítico

O caminho embarcado do analítico mora dentro do `ms-cameras` (`apps/ms-cameras/src/analytics-realtime/`); o detalhe está em
[[Analítico - Arquitetura e estratégias]].

| Evento | Onde vive | Criticidade |
| --- | --- | --- |
| `ANALYTICS_INCIDENT` | Linha em `CameraEventLog`, chave `cameras.events.analytics_incident.<tipo>` | `WARN`, categoria `ANALYTICS`, sem correlação; alarma pelo tipo, na tabela abaixo |
| Saúde do analítico | `CameraAnalyticsHealthService`, campo `analyticsHealth` do status | Só leitura; não grava evento na transição |
| `camera:analytics:detection`, `camera:analytics:frame` | WebSocket `cameras-analytics` | Transitórios, não persistem |

Tipos do incidente (`EnumAtmanIncidentType`), com a criticidade padrão (`DEFAULT_INCIDENT_CRITICALITY` em
`libs/contracts/src/lib/camera/default-incident-criticality.constant.ts`, configurável por sistema) e o alarme:

| Tipo | Criticidade padrão | Alarme no domínio `analytics` |
| --- | --- | --- |
| `ANOMALY` | `CRITICAL` | Não |
| `ANIMAL` | `HIGH` | Não |
| `WRONG_WAY` | `MEDIUM` | `ANLT_WRONG_WAY`, `HIGH`, gera alarme por padrão |
| `VIOLATION` | `MEDIUM` | Não |
| `STOPPED_FLOW` | `MEDIUM` | `ANLT_STOPPED_VEHICLE`, `MEDIUM`, só por regra |
| `CONGESTION` | `MEDIUM` | `ANLT_SEVERE_CONGESTION`, `HIGH`, só por regra |
| `SLOW_MOVING` | `LOW` | Não |
| `TIME_EXCEEDED` | `LOW` | Não |

A criticidade do tipo é lida na hora, sem reescrever nenhuma linha de incidente, e aparece na exportação da
fila. Ela não muda a `severity` da linha nem o alarme. A tabela por sistema é lida e substituída por
`GET` e `PUT /cameras/analytics/incident-criticality`.

Os tópicos Kafka que carregam esses eventos estão em
[[Câmeras - Eventos, incidentes e alarmes - Arquitetura e estratégias#Tópicos Kafka|Tópicos Kafka]].

## Lacunas do pipeline de criticidade

- **Falha de hardware e erro de PTZ gravados pelo worker não chegam ao alarme.** `HEALTH_EVENT` com
  `VAPIX_HW_FAILURE` ou `VAPIX_PTZ_ERROR` não está em `CORRELATABLE`, então o ponto de escrita não publica,
  embora o emissor saiba alarmá-los.
- **`PROBE_TIMEOUT` não chega ao tópico.** O worker põe a causa no `CONNECTIVITY_CHANGED`, mas a lista só aceita
  `PROBE_TIMEOUT` em `HEALTH_OFFLINE`, que o worker só grava com `PUSH_DISCONNECT`.
- **As causas ISAPI ficam sem categoria, correlação, incidente e alarme.** Uma falha de hardware numa
  Hikvision aparece como `ERROR` na tela e nada além disso.
- **`ANIMAL` e `ANOMALY`**, as duas criticidades mais altas do padrão do analítico, não têm código de alarme.

## Glossário

| Termo | O que é |
| --- | --- |
| `causeCode` | Código da causa do evento (`VAPIX_*`, `ISAPI_*`, `PROBE_*`, `PUSH_DISCONNECT`), gravado no payload |
| `CORRELATABLE` | Lista de pares `(eventType, causeCode)` que podem abrir ou alimentar incidente e que o worker de saúde publica |
| Incidente correlacionado | `CameraIncident` aberto pela correlação ao juntar eventos da mesma causa |
| `generatesAlarm` | Campo do catálogo de alarmes: `true` gera alarme sem regra, `false` exige uma `AlarmRule` |
| Tampering | Violação física da câmera: cobertura, mudança brusca de cena ou desfoque proposital |
