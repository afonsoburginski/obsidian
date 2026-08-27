---
tags:
  - doc
  - ms-cameras
  - cameras
  - eventos
  - analitico
atualizado: 2026-08-25
---

# Eventos, incidentes e alarmes - Catálogo e criticidade

> Submódulo do [[ms-cameras]]. Índice: [[Eventos, incidentes e alarmes]]. Mecânica do pipeline: [[Eventos, incidentes e alarmes - Arquitetura e estratégias]]. Analítico: [[Analítico]].

Catálogo de **todo evento que o módulo Câmeras produz hoje** (câmera e analítico), ordenado por criticidade, com a definição de o que torna um evento crítico neste módulo e onde essa definição vive no código. Levantado por leitura do código em 25/08 na linhagem da branch `cameras/feat/SOFTWARE-2731`.

## 1. O que torna um evento crítico

Não existe um campo `critical` no evento. Criticidade neste módulo é o resultado de **três decisões diferentes**, tomadas em três lugares, e elas não coincidem:

| Eixo | Onde vive | Vocabulário | Quem decide |
| --- | --- | --- | --- |
| Severidade da linha de evento | `CameraEventLog.severity` | `INFO` / `WARN` / `ERROR` | catálogo de marca (`axis-event-catalog.ts`, `hikvision-event-catalog.ts`) ou `resolveEventMeta` do worker de saúde |
| Alarmabilidade | `consumers/emit-alarm/alarm-mapping.ts` (`isAlarmableEvent`) | booleano | `severity === 'ERROR'` sempre, `VAPIX_TAMPERING` sempre, o resto nunca |
| Severidade de negócio (edital 4.13) | `alarm-mapping.mapToAlarm` (alarme) e `correlation-rules.deriveSeverity` (incidente) | `CRITICAL` / `HIGH` / `MEDIUM` / `LOW` | só o `causeCode` e o flag `fromCluster` |

O `ERROR` da primeira coluna é o que a tela chama de "Crítico" no tile de KPI (UC-040, `CameraEventsStatsConfig.SEVERITY_ERROR`). O `CRITICAL` da terceira só nasce depois, quando o evento virou alarme ou incidente. Um evento pode ser "crítico" na tela e não gerar alarme nenhum, e o inverso também acontece (tampering entra como `WARN` e alarma).

### Definição (a regra como o código a aplica)

Um evento de câmera é crítico quando a causa reportada indica **perda de função ou de integridade do equipamento**, não variação de qualidade. Quatro testes, na ordem em que o código os aplica:

1. **Perda de função** - a câmera deixou de entregar imagem ou controle: energia, hardware, rede, perda de sinal de vídeo. Entra como `ERROR`, alarma sempre.
2. **Integridade violada** - alguém mexeu no equipamento: tampering, acesso não autorizado. Único caso em que um `WARN` alarma, porque a categoria do alarme é `ROAD_SAFETY`, não `SYSTEM_FUNCTIONING`.
3. **Precisa de intervenção física** - energia e hardware não se resolvem sozinhos, e são os dois únicos que sobem para `CRITICAL` (o resto para em `HIGH`). É o tier que gera ordem de serviço no Inventário (RF-INC-03).
4. **Escala** - a mesma causa em pelo menos 2 câmeras (ou 3 eventos na mesma câmera) dentro de 60 s promove o cluster e eleva comunicação de `MEDIUM` para `HIGH` (`fromCluster`). Escala é multiplicador de severidade, nunca o gatilho dela.

**Não é crítico, por definição**: qualidade e desempenho (latência, bitrate adaptado, instabilidade parcial), movimento e estado de PTZ, alternância dia/noite, recuperação (`HEALTH_ONLINE`), e re-anúncio de tópico stateful (o device reanuncia o estado atual a cada reconexão do WebSocket, e só transição vale linha).

## 2. Eventos de câmera, do mais crítico ao menos

`Ev.` é a `severity` da linha; `Alarme` é o par categoria/severidade de `mapToAlarm`; `Incidente` é o par tipo/severidade de `deriveIncidentSeverityAndType`; `Corr.` diz se o par `(eventType, causeCode)` está em `CORRELATABLE`.

### Tier 1 - CRITICAL (perda de função, exige intervenção física)

| Causa | Evento | Ev. | Categoria | Alarme | Incidente | Corr. |
| --- | --- | --- | --- | --- | --- | --- |
| `VAPIX_POWER_FAILED` | `cameras.events.power_failed` | `ERROR` | `POWER` | `SYSTEM_FUNCTIONING` / `CRITICAL` | `POWER` / `CRITICAL` | sim |
| `VAPIX_HW_FAILURE` | `cameras.events.hardware_failure` | `ERROR` | `HARDWARE` | `SYSTEM_FUNCTIONING` / `CRITICAL` | `HARDWARE` / `CRITICAL` | **não** |

### Tier 2 - HIGH (integridade e comunicação)

| Causa | Evento | Ev. | Categoria | Alarme | Incidente | Corr. |
| --- | --- | --- | --- | --- | --- | --- |
| `VAPIX_TAMPERING` | `cameras.events.tampering` | `WARN` | `HARDWARE` | `ROAD_SAFETY` / `HIGH` | `VANDALISM` / `HIGH` | sim |
| `VAPIX_NETWORK_LOST` | `cameras.events.network_lost` | `ERROR` | `COMMUNICATION` | `SYSTEM_FUNCTIONING` / `MEDIUM` isolado, `HIGH` em cluster | `COMMUNICATION` / `HIGH` | sim |
| `PROBE_TIMEOUT` | `cameras.events.camera_disconnected` | `WARN` | `COMMUNICATION` | idem acima | `COMMUNICATION` / `HIGH` | sim |
| `PROBE_REFUSED` | `cameras.events.camera_disconnected` | `WARN` | `COMMUNICATION` | idem acima | `COMMUNICATION` / `HIGH` | sim |
| `PROBE_UNREACHABLE` | `cameras.events.camera_disconnected` | `WARN` | `COMMUNICATION` | idem acima | `COMMUNICATION` / `HIGH` | sim |
| `PUSH_DISCONNECT` | `cameras.events.camera_disconnected` | `WARN` | `COMMUNICATION` | **não alarmável** (`null` no mapa) | `COMMUNICATION` / `HIGH` | sim |

`PUSH_DISCONNECT` é a queda da nossa própria conexão de eventos (WebSocket Axis, alertStream Hikvision, PullPoint ONVIF), não uma falha reportada pelo device. Por isso vira incidente mas nunca alarme.

### Tier 3 - MEDIUM (função degradada)

| Causa | Evento | Ev. | Categoria | Alarme | Incidente | Corr. |
| --- | --- | --- | --- | --- | --- | --- |
| `VAPIX_PTZ_ERROR` | `cameras.events.ptz_error` | `WARN` | `HARDWARE` | `SYSTEM_FUNCTIONING` / `MEDIUM` | `OPERATIONAL` / `MEDIUM` | não |

### Tier 4 - conectividade derivada (worker de saúde, nunca alarma)

Vêm do `ConnectivityHealthEvaluator`, não do device: janela de 3 amostras, score `Q = (latência + 3 × perda) / 4`, `Q ≥ 0,875` é `STABLE`, `Q ≥ 0,5` é `PARTIALLY_UNSTABLE`, abaixo disso `UNSTABLE`; offline exige 2 falhas consecutivas para sair. Limiares em env (`LATENCY_STABLE_MS=100`, `LATENCY_UNSTABLE_MS=300`, `LOSS_UNSTABLE_PCT=10`).

| Transição | Evento | Ev. | Observação |
| --- | --- | --- | --- |
| para `OFFLINE` | `cameras.events.camera_went_offline` | `WARN` | abre incidente de conectividade interno (contagem de duração) |
| para `UNSTABLE` | `cameras.events.camera_unstable` | `WARN` | |
| para `PARTIALLY_UNSTABLE` | `cameras.events.camera_partially_unstable` | `INFO` | |
| para `STABLE` | `cameras.events.camera_recovered` / `camera_recovered_duration` | `INFO` | fecha o incidente e grava `durationMinutes` |

### Tier 5 - operacionais informativos (`INFO`, nunca alarmam, nunca correlacionam)

Axis: `stream_accessed` (nunca gravado, é auto-provocado pelo nosso relay), `ptz_ready`, `ptz_moved`, `ptz_queue_updated`, `bitrate_adapted`, `day_night_switch`, `device_ready`, `camera_connected`.

Hikvision: `motion_detected`, `line_crossing`, `intrusion` (`regionentrance` e `regionexiting` caem na mesma chave).

Fallback de tópico desconhecido: `cameras.events.device_event` em `INFO`.

### Hikvision com falha (causas ISAPI)

| Causa | Evento | Ev. | Estado hoje |
| --- | --- | --- | --- |
| `ISAPI_HW_FAILURE` | `hardware_failure` (`diskfull`, `diskerror`, `badblock`) | `ERROR` | categoria cai em `OPERATIONAL`, sem alarme, sem incidente |
| `ISAPI_NETWORK_LOST` | `network_lost` (`nicbroken`, `ipconflict`) | `ERROR` | idem |
| `ISAPI_TAMPERING` | `tampering` (`shelteralarm`, `scenechangedetection`) | `WARN` | idem, e não pega a exceção de tampering (ela testa só o código VAPIX) |
| sem causa | `video_loss`, `illegal_access`, `defocus` | `WARN` | informativos na prática |

## 3. Eventos do analítico, do mais crítico ao menos

O caminho embarcado do analítico mora provisoriamente dentro do `ms-cameras` (`src/analytics-realtime/`), consumindo do broker Kafka do próprio device ATMAN Traffic Edge.

| Evento | Onde vive | Persiste | Criticidade hoje |
| --- | --- | --- | --- |
| `ANALYTICS_INCIDENT` (incidente DAI) | linha em `CameraEventLog`, `cameras.events.analytics_incident` | sim | `WARN`, categoria `ANALYTICS`, **sem alarme e sem correlação** |
| Saúde do analítico | `CameraAnalyticsHealthService` (Redis + UC-059) | não, é leitura | `HEALTHY` até 30 s, `DEGRADED` até 180 s, `OFFLINE` acima, `NOT_CONFIGURED` sem analítico; **não emite evento na transição** |
| `camera:analytics:detection` | WebSocket `cameras-analytics` | não | transitório, acende a região no player |
| `camera:analytics:frame` | WebSocket `cameras-analytics` | não | transitório, caixas por objeto no overlay |
| `ANLT_SEVERE_CONGESTION` | catálogo de alarmes (`ANALYTICS_ALARM_TYPES`) | - | `HIGH` declarado, **sem produtor no repo** |

O incidente DAI vem do campo `region_incidents` do frame, é normalizado contra `EnumAtmanIncidentType` (token desconhecido é descartado como dado, não como bug) e deduplicado por `(câmera, região, tipo)` numa janela de 30 s (`ANALYTICS_INCIDENT_DEDUP_WINDOW_MS`, env) - sem isso uma condição levantada geraria uma linha por frame.

### Os 8 tipos de incidente DAI

Todos entram como `WARN` no mesmo evento; **o código não diferencia criticidade entre eles**. Ordem proposta, para quando alguém for atribuir severidade por tipo:

| Ordem proposta | Tipo | Por quê |
| --- | --- | --- |
| 1 | `WRONG_WAY` | contramão, risco de colisão frontal |
| 2 | `ANIMAL` | animal na via, risco imediato e imprevisível |
| 3 | `STOPPED_FLOW` | fluxo parado, veículo imobilizado na pista |
| 4 | `VIOLATION` | infração, exige registro e eventualmente autuação |
| 5 | `TIME_EXCEEDED` | permanência acima do limite na região |
| 6 | `CONGESTION` | congestionamento, operacional e não de segurança |
| 7 | `SLOW_MOVING` | tráfego lento, sintoma do anterior |
| 8 | `ANOMALY` | genérico, sem semântica definida no device |

## 4. Eventos de integração (Kafka), não são eventos de câmera

Ficam aqui para não confundir a leitura da tela de Eventos com o fio.

| Tópico | Direção | Papel |
| --- | --- | --- |
| `attlas.cameras.event-logged` | produz | fan-out de cada evento registrado com `source: 'ingest'`, consumido pela correlação e pelo emissor de alarme |
| `attlas.cameras.incident-created` | produz | cluster promovido a `DETECTED` |
| `attlas.alarms.alarm-raised` | produz | alarme, com `alarmId` UUID v5 determinístico |
| `attlas.cameras.event-ingest` | consome | ingestão de evento de fora do serviço, sem produtor no repo |
| `attlas.cameras.status-changed` | produz | transição de `CameraConnectionStatus` |
| `attlas.execution-plans.cameras.ptz-command-{executed,rejected}` | produz | resultado de comando PTZ vindo de plano de resposta |
| `attlas.execution-plans.cameras.videowall-command-{executed,rejected}` | produz | idem para o videowall |
| `attlas.cameras.lifecycle` e `attlas.cameras.areaChanged` | produz | ciclo de vida e mudança de área do dispositivo |

## 5. Furos que este levantamento expôs

> [!warning] O offline detectado pela plataforma nunca gera alarme
> Evento com `source: 'health'` persiste e vai por WebSocket, mas **não** é publicado em `event-logged`. Todo o Tier 4 (e os eventos do catálogo de marca gravados pelo worker) fica fora da correlação e do alarme. Na prática, o pipeline de criticidade hoje só é alimentado por `event-ingest`, que não tem produtor no repo. Mecânica em [[Eventos, incidentes e alarmes - Arquitetura e estratégias]] seção 2.

> [!warning] Duas fontes de verdade divergentes para severidade
> `CAMERA_ALARM_TYPES` (`libs/contracts/.../alarms/catalog/types/cameras.ts`) declara `defaultSeverity: MEDIUM` e `generatesAlarm: false` para as 8 causas, inclusive energia e hardware. O `alarm-mapping` do `ms-cameras` emite `CRITICAL` para essas duas. O emissor já loga divergência entre mapping e incidente e faz o mapping vencer, mas ninguém confronta o catálogo.

> [!warning] Causas ISAPI são cegas ao pipeline de criticidade
> `ISAPI_HW_FAILURE`, `ISAPI_NETWORK_LOST` e `ISAPI_TAMPERING` existem no enum e nos catálogos de marca, mas estão fora de `derive-camera-event-category`, de `mapToAlarm`, de `CORRELATABLE` e de `deriveIncidentType`. Falha de hardware numa Hikvision é `ERROR` na tela e nada além disso.

> [!warning] `VAPIX_HW_FAILURE` alarma `CRITICAL` mas não correlaciona
> Fica fora de `CORRELATABLE`, então falha de hardware em N câmeras gera N alarmes isolados e nenhum cluster. Energia, ao lado dela no Tier 1, correlaciona.

> [!warning] O analítico não tem caminho de criticidade
> `ANALYTICS_INCIDENT` é `WARN` e não tem `causeCode`, então `isAlarmableEvent` responde não e `mapToAlarm` não teria entrada. Contramão e animal na via, que são os dois eventos mais graves que o módulo consegue detectar, não chegam ao módulo Alarmes. O único alarme de analítico previsto (`ANLT_SEVERE_CONGESTION`) não tem produtor.

> [!info] Estado do produtor de `ANALYTICS`
> A nota de arquitetura afirmava (24/08) que a categoria `ANALYTICS` não tem produtor. Passou a ter em `6bc94d324d` (PROJ-021, `AnalyticsIncidentRecorder`), que está na linhagem `SOFTWARE-2676` e **ainda não na `develop`**. Enquanto não mergear, as duas afirmações valem, cada uma para uma base.

## Relacionados

[[Eventos, incidentes e alarmes - Arquitetura e estratégias]] · [[Eventos, incidentes e alarmes - Fluxos]] · [[Eventos, incidentes e alarmes - Requisitos e SLA]] · [[Saúde e monitoramento]] · [[Analítico]]
