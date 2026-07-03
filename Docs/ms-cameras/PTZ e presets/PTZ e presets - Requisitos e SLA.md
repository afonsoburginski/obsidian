---
tags: [doc, cameras, ms-cameras, ptz]
servico: ms-cameras
fonte: docs/modules/cameras.md
atualizado: 2026-07-03
---

# PTZ e presets - Requisitos e SLA

Rastreabilidade dos RF/RNF de PTZ para o código, com estado de implementação. Fonte de negócio: `docs/modules/cameras.md`. Implementação: [[PTZ e presets - Arquitetura e estratégias]] e [[00 - PTZ e presets]].

## Requisitos funcionais e não-funcionais

Legenda de estado: ✅ implementado · 🟡 parcial · ❌ não implementado (regra de domínio).

| ID | Critério (domínio) | Onde no código | Estado |
| --- | --- | --- | --- |
| RF-CAM-05 | Pan/tilt contínuo, zoom óptico/digital, presets nomeados, tours, patrulha, rastreamento | `ptz.service.ts`, `onvif.driver.ts`, `vapix-*`, presets/automations, `tour-runner.service.ts` | 🟡 |
| RF-INT-04 | Reposicionamento PTZ por Emergências com prioridade máxima, preemptando sessão ativa | Consumidor Kafka `attlas.emergencies.ptz-command` **declarado no SPEC, sem `@EventPattern`** | ❌ |
| RF-INT-06 | Acesso governado por Permissões (funcional/espacial/recurso/prioridade) + preempção PTZ | `permissions.client.ts` (`cameras:ptz`) — só allow/deny booleano | 🟡 |
| RNF-CAM-03 | Latência de PTZ baixa o bastante para uso durante incidentes | Timeouts curtos em ONVIF/permissões (ver SLA abaixo) | 🟡 |
| RNF-CAM-06 | Toda ação de operador registrada com timestamp e identidade | `CameraEventLog` `PTZ_COMMAND` (`subType`, `operatorId`, `occurredAt`) | ✅ |
| RNF-CAM-07 | Stream, PTZ e preset em ≤ 2 cliques a partir do mapa | Restrição de UX do frontend (feature modules de mapa) sobre os endpoints PTZ | 🟡 (frontend) |
| RNF-CAM-08 | Autorização multidimensional com suporte a preempção PTZ | Dimensão de recurso via `cameras:ptz`; sem prioridade/preempção no backend | 🟡 |

### Detalhamento do que está e do que falta

- **RF-CAM-05 (🟡)**: pan/tilt (relativo, absoluto, contínuo), zoom, stop, presets nomeados (CRUD + goto) e tours (CRUD + play/pause com scheduler) existem. **Patrulha/rastreamento contínuos** não têm modo dedicado — o "rastreamento" hoje é apenas **observação** de posição (leitura via worker de saúde, Axis/VAPIX), não seguimento automático de alvo. Movimento relativo ignora magnitude (passo fixo). Presets/tours no caminho absoluto são **Axis/VAPIX**.
- **RF-INT-04 (❌)**: nenhum `@EventPattern` de emergências em ms-cameras (só `EVENT_INGEST`, `EVENT_LOGGED`, `INCIDENT_CREATED`). Sem prioridade máxima nem preempção por emergência. Confirme no código antes de assumir cobertura.
- **RF-INT-06 / RNF-CAM-08 (🟡)**: autorização por recurso funciona e é **fail-closed**. Faltam a dimensão de **prioridade**, o conceito de **sessão PTZ ativa** e a **preempção/cessão** de controle entre operadores — delegados ao módulo Permissões/frontend; o backend só concede ou nega.
- **RNF-CAM-07 (🟡, frontend)**: contrato de UX; backend só expõe as rotas de PTZ/preset consumíveis pelo popup do mapa.

## SLA e limites de latência (RNF-CAM-03)

O requisito é **qualitativo** ("baixa o suficiente para uso operacional") — não há número contratual. Os guardrails implementados que limitam a latência/travamento:

| Parâmetro | Env | Default | Efeito |
| --- | --- | --- | --- |
| Timeout de connect ONVIF | `ONVIF_CONNECT_TIMEOUT_MS` | 5000 ms | Estouro → `CAMERA_UNREACHABLE` |
| Timeout de comando/disconnect ONVIF | `ONVIF_COMMAND_TIMEOUT_MS` | 4000 ms | Idem, por comando |
| Timeout do check de permissão | `PERMISSIONS_CHECK_TIMEOUT_MS` | 1500 ms | Abort → fail-closed `PERMISSIONS_SERVICE_UNAVAILABLE` |
| Cap de `timeoutSeconds` do contínuo | `PTZ_CONTINUOUS_MAX_TIMEOUT_SECONDS` | 30 s (hard max 60 s) | Auto-stop do device se não chegar novo comando |
| Porta RTSP | `RTSP_DEFAULT_PORT` | 554 | Monta URI RTSP correta (ONVIF/HTTP usa a porta do perfil) |

Notas:
- O contínuo depende do **auto-stop ONVIF** (`Timeout` no envelope SOAP) como rede de segurança — evita movimento perpétuo se o `/ptz/stop` se perder.
- A posição PTZ observada não é comando: é polling do worker de saúde (intervalo próprio), com dedup de posição inalterada — ver [[Status em tempo real (push)]].

## Ver também

- [[00 - PTZ e presets]] · [[PTZ e presets - Arquitetura e estratégias]] · [[PTZ e presets - Fluxos]]
- [[00 - Eventos, incidentes e alarmes]] · [[Status em tempo real (push)]] · [[ms-cameras - visão geral]]
