---
tags:
  - doc
  - cameras
  - cadastro
aliases:
  - "Cameras - Requisitos e SLA"
atualizado: 2026-10-07
banner: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200"
---

# Câmeras - Cadastro - Requisitos e SLA

Volta para [[Câmeras - Cadastro]].

## Resumo

O cadastro aceita lotes de até 50 câmeras, exige IP único entre as ativas do mesmo sistema e grava a câmera
mesmo quando o equipamento não responde. A sondagem tem 10 s por câmera para a conexão ONVIF. Os quatro estados
andam um passo por vez, mas a máquina de transição só existe na API; o cadastro pela tela decide o estado
sozinho. A meta de latência é p99 abaixo de 100 ms para leituras e escritas com até cinco mil câmeras. A
regra de negócio de origem está em `docs/modules/cameras.md`.

## Regras

| Regra | Valor | Onde no código |
| --- | --- | --- |
| Lote do cadastro e da validação de credenciais | Até 50 itens | `CAMERA_BATCH_MAX_SIZE` em `libs/contracts/src/lib/camera/camera-batch-limit.constant.ts` |
| Leitura em lote e localização em lote | De 1 a 200 câmeras | `CameraValidation.batchIds` em `libs/contracts/src/lib/camera/camera.validation.ts` |
| IP único (BR-CRUD-009) | Um IP por câmera ativa no mesmo sistema, no cadastro e na edição | `create-cameras.handler.ts`, `update-camera.handler.ts`, índice `Camera_active_ip_unique` |
| Reativação | Recadastrar o IP de câmera removida reativa a removida mais recente e limpa os filhos da encarnação anterior | `cameras.repository.ts` (`createMany`) |
| Estado inicial | O enviado pela API; sem o campo, `STOCK`, e promoção a `OPERATIONAL` quando a sondagem acha perfil H264 ou H265 | `camera-provisioning.service.ts` |
| Transição de estado | Um passo por vez, ida e volta, na cadeia `STOCK`, `TESTING`, `IN_FIELD`, `OPERATIONAL` | `lifecycle-transitions.helper.ts` |
| Provisionamento no cadastro (BR-CRUD-001) | Soft-fail: credencial gravada mesmo com sondagem falha; aviso por câmera na resposta | `camera-provisioning.service.ts` |
| PTZ pela sondagem (BR-CRUD-013) | Só faixa real de pan ou tilt marca PTZ; nunca rebaixa | `camera-credential-probe.service.ts`, `camera-provisioning.service.ts` |
| Reprovisionamento na edição (BR-CRUD-016) | Endereço salvo em câmera sem perfil de stream ativo roda o provisionamento do cadastro, sem promover o estado | `update-camera.handler.ts`, `camera-registration-provisioning.service.ts` |
| Perfis derivados | Até três papéis; versão reduzida SECONDARY 1280x720, 30 fps, 2000 kbps e TERTIARY 848x480, 30 fps, 500 kbps | `camera-provisioning.service.ts` |
| Substituição | Velha em `OPERATIONAL` ou `IN_FIELD`; nova em `STOCK` e do mesmo sistema; a nova herda o estado; motivo obrigatório | `replace-camera.handler.ts`, `CAMERA_REPLACEABLE_LIFECYCLE_STATES` |
| Multi-tenant | Escopo pelo header `System-Id`, fail-closed; pertencimento do requisitante pela guarda de classe, da câmera por `CameraTenancyService` ou pelo `where` | `cameras.controller.ts`, `shared/tenancy/camera-tenancy.service.ts` |
| Remoção | Lógica, por `deletedAt`; some das leituras e fica no banco | `soft-delete-camera.handler.ts` |
| Marca nova | Registrada no cadastro, nunca 404 | `manufacturer-resolver.service.ts` |
| Sondagem ONVIF | 10 s por item para a conexão | `PROBE_TIMEOUT_MS` em `camera-credential-probe.service.ts` |
| Detecção do analítico embarcado na sondagem | Orçamento próprio: um timeout de equipamento por candidato de cada dialeto, mais um de folga | `AtmanEndpointConfig.PROBE_CASCADE_BUDGET_MS` em `analytics-realtime/atman-endpoint.config.ts` |
| Latência | p99 abaixo de 100 ms em leituras e escritas, até cinco mil câmeras | `apps/ms-cameras/docs/modules/MOD-001-cameras-crud.md` seção 8 |
| Miniatura | 10 s de cópia fresca e 600 s de cópia velha servida enquanto a nova é buscada | `cameras/services/camera-thumbnail.cache.ts` |

## Variáveis de ambiente

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `CAMERA_LIFECYCLE_PUBLISH_TIMEOUT_MS` | 5000 | Tempo máximo de uma publicação em `attlas.cameras.lifecycle` antes de ir para a fila Redis |
| `CAMERA_LIFECYCLE_BUFFER_MAX_EVENTS` | 20 | Eventos guardados por câmera na fila de reenvio |
| `CAMERA_LIFECYCLE_BUFFER_TTL_MS` | 21600000 (6 h) | Validade da fila de reenvio de uma câmera |
| `CAMERA_LIFECYCLE_BUFFER_DRAIN_INTERVAL_MS` | 30000 | Intervalo da drenagem da fila |
| `CAMERA_LIFECYCLE_BUFFER_DRAIN_BATCH` | 20 | Câmeras drenadas por passada |
| `CAMERA_LIFECYCLE_BUFFER_DRAIN_BUDGET_MS` | 20000 | Orçamento de tempo das publicações de uma passada |
| `CAMERA_LIFECYCLE_BUFFER_DRAIN_LOCK_TTL_SECONDS` | 60 | Validade do lock da drenagem entre réplicas |
| `REDIS_STATUS_CACHE_TTL_SECONDS` | 120 | TTL do cache de status `camera:status:<id>` |
| `MS_TRAFFIC_MODEL_URL`, `MS_TRAFFIC_MODEL_TIMEOUT_MS` | `http://localhost:3010`, 1500 | Interseção de cada linha da listagem e filtro por topologia |
| `MS_ORGANIZATION_INTERNAL_URL`, `CORE_AUTH_PERMISSION_TIMEOUT_MS` | `http://localhost:3001`, 800 | Avaliação de pertencimento e de permissão |
| `SEED_SYSTEM_ID` | `00000000-0000-4000-8000-000000000002` | Sistema das câmeras do seed |
| `SEED_CAMERA_USER`, `SEED_CAMERA_PASSWORD` | `root`, vazio | Credencial das câmeras do seed; sem senha, o seed não grava credencial |
| `SEED_ATMAN_EMBEDDED_SOURCE_ID` | vazio | `source_id` do analítico embarcado da câmera `10.1.1.80` do seed |

As variáveis do ciclo de vida são validadas no boot (`config/environment.ts`): valor que não é inteiro positivo
aborta o boot em vez de cair no padrão.

## Cobertura dos requisitos

Requisitos de `docs/modules/cameras.md` que o cadastro atende. "Frontend" quer dizer restrição de experiência
fora do backend.

| ID | Critério | Situação |
| --- | --- | --- |
| RF-CAM-01 | Cadastrar, listar, editar e remover câmeras com os atributos técnicos e o azimute | Implementado. `CameraType` tem só `PTZ` e `FIXED`; analítica e térmica moram em `analyticsCapabilities`; o codec é texto livre (`videoCodec`) |
| RF-CAM-02 | Quatro estados, transição só manual pelo administrador, aviso fora de Operativa | Parcial. A máquina de estados existe na API, mas nenhuma tela chama a transição, e o cadastro pela tela promove a câmera a Operativa quando acha vídeo |
| RF-CAM-06 | Stream primário e secundário com codec, resolução, fps e bitrate por stream | Implementado. O cadastro grava até três `CameraStreamProfile` a partir da sondagem; a reconfiguração de um stream é de [[Câmeras - Streaming]] e [[Câmeras - Integração com dispositivo]] |
| RF-CAM-07 | Substituição com herança de localização, presets e cenas, cenas atualizadas, substituição registrada | Implementado. Herança completa, estado herdado, motivo obrigatório; o registro permanente é o RNF-CAM-13 |
| RF-CAM-08 | Câmera no mapa com ícone, cone e tooltip, azimute manual, operável em até dois cliques | Parcial. O backend guarda e devolve coordenadas, endereço, interseção e azimute, inclusive em lote; o desenho no mapa e os cliques são do frontend |
| RF-INT-07 | Consulta em lote de existência e de dados de exibição, sem efeito colateral | Implementado (`/cameras/validate` e `/cameras/batch-get`) |
| RF-INT-08 | Localização de várias câmeras em uma operação, com resultado por câmera | Implementado (`PUT /cameras/locations`) |
| RN-CAM-01 | Recorte topológico da câmera nos relatórios | Implementado na parte deste subdomínio: `trafficElementId` segue o vínculo do Modelo de Tráfego |
| RNF-CAM-01 | A rede cresce sem interrupção nem redesenho | Parcial. Paginação, lote atômico e índices sustentam o crescimento; escala horizontal é infraestrutura |
| RNF-CAM-06 | Toda ação de operador registrada com instante e identidade | Implementado: cada gesto publica auditoria com o ator do JWT em `attlas.audit.cameras`, best-effort e sem reenvio |
| RNF-CAM-07 | Stream, PTZ e preset em até dois cliques a partir do mapa | Frontend |
| RNF-CAM-10 | Comando em câmera fora de Operativa exige confirmação | Frontend, só no PTZ do VMS; `assertNotInStock` não tem chamador |
| RNF-CAM-13 | Histórico de substituições permanente, com metadados herdados, instante e operador | Parcial. Ponteiro `replacedByCameraId` mais a linha `CAMERA_REPLACED` com ator e motivo no `ms-audit`; sem tabela de histórico e sem produtor de `attlas.cameras.replaced` |
| UC-076 | Censo interno de câmeras vivas por sistema, previsto na spec de eventos de ciclo de vida | Não implementado: a rota não existe no `ms-cameras` |
| UC-077 | Cadastro recusado acima do teto de dispositivos contratado | Não implementado: o cadastro não confere teto |

`GET /cameras/:id/media-profiles` não tem requisito próprio: é leitura do inventário do equipamento, sem regra
nova sobre a entidade.

## Erros

| `errorCode` ou detalhe | HTTP | Quando |
| --- | --- | --- |
| `BATCH_LIMIT_EXCEEDED` (detalhe de `INVALID_INPUT`) | 400 | Lote acima de 50 |
| `VALIDATION_FAILED` | 400 | Corpo ou query fora do formato |
| `RESOURCE_NOT_FOUND` | 404 | Câmera inexistente, removida ou de outro sistema |
| `CAMERA_DUPLICATE_IP` | 422 | IP repetido no lote, já ativo no sistema, ou perdido na corrida do índice |
| `DUPLICATE_CAMERA_IN_BATCH` | 422 | Mesmo `id` repetido na localização em lote |
| `INVALID_STATE_TRANSITION` (detalhe de `BUSINESS_RULE_VIOLATION`) | 409 | Transição fora da máquina de estados |
| `CAMERA_SELF_REPLACE` | 409 | Câmera substituindo a si mesma |
| `CAMERA_LIFECYCLE_PRECONDITION_NOT_MET` | 422 | Substituir câmera que não está Operativa nem Em campo |
| `STOCK_CAMERA_NOT_FOUND` | 409 | Substituta fora do estoque |
| `FORBIDDEN_ACTION` | 403 | Requisitante fora do sistema ou sem a chave |
| `PERMISSION_RESOLVER_UNAVAILABLE` | 503 | Avaliador de permissão fora do ar |

O `errorCode` é estável e nunca traduzido; a `message` sai traduzida pela `translationKey`.

## Métricas

| Métrica | O que conta |
| --- | --- |
| `cameras_created_total` | Câmeras criadas |
| `cameras_state_transitions_total{from,to}` | Transições de estado |
| `cameras_soft_deleted_total` | Remoções |
| `camera_lifecycle_publish_failures_total` | Publicações de ciclo de vida que falharam no Kafka |
| `camera_lifecycle_buffered_total` | Eventos que foram para a fila Redis |
| `camera_lifecycle_dropped_total` | Eventos descartados (falha no Kafka e no Redis) |
| `camera_lifecycle_buffer_depth` | Profundidade atual da fila de reenvio |

Nomes em `apps/ms-cameras/src/cameras/cameras.metrics.ts`.

## Referências

| O quê | Onde |
| --- | --- |
| Regra de negócio | `docs/modules/cameras.md` |
| Specs de módulo | `apps/ms-cameras/docs/modules/`: `MOD-001-cameras-crud.md`, `MOD-011-tenant-scoping.md`, `MOD-012-camera-media-profiles.md`, `MOD-019-cameras-audit-notification.md`, `MOD-020-camera-lifecycle-events.md` |
| Specs atômicas | `apps/ms-cameras/docs/atomic/`: UC-001 a UC-006, UC-012, UC-013, UC-015, UC-018 a UC-020, UC-031, PROJ-029, INT-022, INT-025 |
| Specs do frontend | `apps/web-attlas/docs/modules/cameras/atomic/`: `UF-013-creation-panel.md`, `UF-013-camera-edit.md`, `UF-016-camera-settings.md`, `UF-021-camera-substitution-dialog.md` |
