---
tags:
  - doc
  - ms-cameras
  - cameras
atualizado: 2026-10-01
aliases:
  - "Cameras - Requisitos e SLA"
---

# Câmeras - Cadastro - Requisitos e SLA

Parte do domínio [[Câmeras - Cadastro]]. Cobertura dos requisitos de `docs/modules/cameras.md` pelo cadastro e ciclo
de vida. Legenda: **Implementado**, **Parcial**, **Frontend** (restrição de experiência fora do backend).

## Requisitos funcionais

| ID | Critério | Estado |
| --- | --- | --- |
| RF-CAM-01 | Cadastrar, listar, editar e remover câmeras com os atributos técnicos e o azimute | **Implementado**. `CameraType` tem só `PTZ` e `FIXED`; analítica e térmica moram em `analyticsCapabilities`; o codec é texto livre (`videoCodec`) |
| RF-CAM-02 | Quatro estados, transição só manual pelo administrador, aviso fora de Operativa | **Parcial**. A máquina de estados existe na API, mas nenhuma tela chama a transição, e o cadastro pela tela promove a câmera a Operativa quando acha vídeo. O aviso é do frontend (RNF-CAM-10) |
| RF-CAM-06 | Stream primário e secundário com codec, resolução, fps e bitrate por stream | **Implementado**. O cadastro grava até três `CameraStreamProfile` a partir da sondagem; a reconfiguração de um stream é de [[Câmeras - Streaming]] e [[Câmeras - Integração com dispositivo]] |
| RF-CAM-07 | Substituição com herança de localização, presets e cenas, cenas atualizadas, substituição registrada | **Implementado**. Herança completa, estado herdado, motivo obrigatório; o registro permanente é RNF-CAM-13 |
| RF-CAM-08 | Câmera no mapa com ícone, cone e tooltip, azimute manual, operável em até dois cliques | **Parcial**. O backend guarda e devolve coordenadas, endereço, interseção e azimute (inclusive em lote); o desenho no mapa e os cliques são do frontend |
| RF-INT-07 | Consulta em lote de existência e de dados de exibição, sem efeito colateral | **Implementado** (`/cameras/validate` e `/cameras/batch-get`) |
| RN-CAM-01 | Recorte topológico da câmera nos relatórios | **Implementado** na parte deste domínio: `trafficElementId` segue o vínculo do Modelo de Tráfego (PROJ-029) |

`GET /cameras/:id/media-profiles` (UC-031) não tem RF próprio: é leitura do inventário do equipamento,
sem regra nova sobre a entidade.

## Requisitos não funcionais

| ID | Critério | Estado |
| --- | --- | --- |
| RNF-CAM-01 | A rede cresce sem interrupção nem redesign | **Parcial**. Paginação, lote atômico e índices sustentam o crescimento; escala horizontal é infraestrutura |
| RNF-CAM-06 | Toda ação de operador registrada com instante e identidade | **Implementado** no cadastro: cada gesto publica auditoria com o ator do JWT em `attlas.audit.cameras`. Best-effort, sem reenvio |
| RNF-CAM-07 | Stream, PTZ e preset em até dois cliques a partir do mapa | **Frontend** |
| RNF-CAM-10 | Comando em câmera fora de Operativa exige confirmação | **Frontend**, só no PTZ do VMS; `assertNotInStock` não tem chamador |
| RNF-CAM-13 | Histórico de substituições permanente, com metadados herdados, instante e operador | **Parcial**. Ponteiro `replacedByCameraId` mais a linha `CAMERA_REPLACED` com ator e motivo no `ms-audit`; sem tabela de histórico e sem produtor de `attlas.cameras.replaced` |

## Regras de domínio

- **Estados**: cadeia `STOCK`, `TESTING`, `IN_FIELD`, `OPERATIONAL`, um passo por vez, ida e volta (tabela
  em [[Câmeras - Cadastro - Arquitetura e estratégias]]). Estado inicial escolhido pelo cliente da API ou `STOCK`.
- **IP único por sistema (BR-CRUD-009)**: entre câmeras ativas do mesmo `systemId`; recadastrar o IP de uma
  removida reativa a linha e limpa os filhos anteriores. `CAMERA_DUPLICATE_IP` no cadastro e na edição.
- **Provisionamento no cadastro (BR-CRUD-001)**: soft-fail; a credencial é gravada mesmo com sondagem falha.
- **PTZ pela sondagem (BR-CRUD-013)**: só faixa real de pan ou tilt marca PTZ; nunca rebaixa.
- **Substituição**: velha em Operativa ou Em campo, nova em estoque e do mesmo sistema; a nova herda o estado.
- **Multi-tenant**: escopo sempre pelo header `System-Id`, fail-closed; pertencimento do requisitante pela
  guarda de classe, pertencimento da câmera por `CameraTenancyService` ou pelo `where`.
- **Remoção lógica**: `deletedAt`; some das leituras, fica no banco.
- **Marca nova**: registrada no cadastro, nunca 404.

## Limites e SLA

- Lote de 50 itens no cadastro e na validação de credenciais (`CameraCreateConfig.MAX_BATCH_SIZE`); 1 a 200
  UUIDs em `validate` e `batch-get`.
- Sondagem: 10 s para a conexão ONVIF por item; a detecção do analítico e o caminho ISAPI têm orçamento
  próprio.
- Latência esperada (MOD-001 seção 8, até cinco mil linhas): leituras e escritas abaixo de 100 ms no p99.
- Métricas Prometheus: `cameras_created_total`, `cameras_state_transitions_total{from,to}`,
  `cameras_soft_deleted_total`, mais as do ciclo de vida (`camera_lifecycle_publish_failures_total`,
  `camera_lifecycle_buffered_total`, `camera_lifecycle_dropped_total`, `camera_lifecycle_buffer_depth`).

## Erros

| `errorCode` ou detalhe | HTTP | Quando |
| --- | --- | --- |
| `BATCH_LIMIT_EXCEEDED` (detalhe de `INVALID_INPUT`) | 400 | Lote acima de 50 |
| `RESOURCE_NOT_FOUND` | 404 | Câmera inexistente, removida ou de outro sistema |
| `CAMERA_DUPLICATE_IP` | 422 | IP repetido no lote, já ativo no sistema, ou corrida no índice |
| `INVALID_STATE_TRANSITION` (detalhe de `BUSINESS_RULE_VIOLATION`) | 409 | Transição fora da máquina |
| `CAMERA_SELF_REPLACE` | 409 | Câmera substituindo a si mesma |
| `CAMERA_LIFECYCLE_PRECONDITION_NOT_MET` | 422 | Substituir câmera que não está Operativa nem Em campo |
| `STOCK_CAMERA_NOT_FOUND` | 409 | Substituta fora do estoque |
| `FORBIDDEN_ACTION` | 403 | Requisitante fora do sistema ou sem a chave |
| `PERMISSION_RESOLVER_UNAVAILABLE` | 503 | Avaliador de permissão fora do ar |

`errorCode` é estável e nunca traduzido; `message` sai traduzida pela `translationKey`.

## Referências

- Negócio: `docs/modules/cameras.md`.
- Specs: `apps/ms-cameras/docs/modules/MOD-001-cameras-crud.md`, `MOD-011-tenant-scoping.md`,
  `MOD-012-camera-media-profiles.md`, `MOD-019-cameras-audit-notification.md`,
  `MOD-020-camera-lifecycle-events.md`; atômicas UC-001 a UC-006, UC-012, UC-013,
  UC-015, UC-018 a UC-020, UC-031, PROJ-029, INT-022, INT-025.
- Frontend: `apps/web-attlas/docs/modules/cameras/` (`UF-013-camera-edit`, `UF-016-camera-settings`, `UF-021-camera-substitution-dialog`).
