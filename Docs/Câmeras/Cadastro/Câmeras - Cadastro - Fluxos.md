---
tags:
  - doc
  - ms-cameras
  - cameras
atualizado: 2026-10-01
aliases:
  - "Cameras - Fluxos"
---

# Câmeras - Cadastro - Fluxos

Parte do domínio [[Câmeras - Cadastro]]. Mecânica e regras em [[Câmeras - Cadastro - Arquitetura e estratégias]]; aqui só a
ordem dos passos. Diagrama: [[Câmeras - Cadastro - Diagrama.excalidraw|diagrama]].

## Cadastro em lote (UC-001)

`POST /cameras`, corpo `ICreateCameraRequest[]`.

1. Guarda de pertencimento e chave `cameras.camera:create`; `@SystemId()` exige o header.
2. Lote acima de 50: 400 `BATCH_LIMIT_EXCEEDED`.
3. Resolve as marcas distintas, registrando as não catalogadas.
4. Confirma cada `replacedByCameraId` (404 se não existe).
5. IP repetido no lote ou já usado por câmera ativa do sistema: 422 `CAMERA_DUPLICATE_IP`. IP de câmera
   removida marca o item para reativação.
6. `createMany` numa `$transaction`: cria os novos e reativa os marcados, limpando antes os filhos da
   encarnação anterior. `lifecycleState` é o enviado ou `STOCK`.
7. Para cada câmera, em paralelo: sondagem e provisionamento (credencial, perfis, promoção a `OPERATIONAL`
   quando o estado não veio e há perfil utilizável, promoção a PTZ quando há faixa real de pan ou tilt);
   câmera que respondeu entra já no monitoramento de saúde; analítico embarcado dispara o vínculo do
   equipamento em segundo plano.
8. Em segundo plano: descoberta de perfis de mídia e publicação de `CREATED` no ciclo de vida.
9. Auditoria por câmera e notificação agregada do lote; invalidação do dashboard (`INVENTORY`).
10. 201 com as câmeras relidas do banco, cada uma com o aviso de provisionamento quando houver.

## Edição (UC-004)

`PATCH /cameras/:id`.

1. Chave `cameras.camera:edit` e `assertCameraInSystem` (404).
2. IP no delta e diferente do atual, já usado por câmera ativa: 422 `CAMERA_DUPLICATE_IP`; o índice único
   fecha a corrida com o mesmo código.
3. Resolve a marca se `manufacturerId` veio; grava só os campos presentes.
4. Pedido com endereço reaponta os perfis de stream; endereço mudado publica `CameraOriginChangedEvent`.
5. Invalida o dashboard, audita o diff, publica `UPDATED` e devolve o detalhe.

## Mudança de estado (UC-005)

`PATCH /cameras/:id/state`, corpo `{ state }`.

1. Chave `cameras.camera:edit` e `assertCameraInSystem`.
2. Câmera inexistente: 404.
3. `assertValidTransition(from, to)`; fora do mapa: 409 `INVALID_STATE_TRANSITION`.
4. Persiste, incrementa `cameras_state_transitions_total{from,to}`, audita, notifica e devolve o detalhe.

Nenhuma tela do `web-attlas` chama esta rota. O aviso de RNF-CAM-10 é do frontend, antes de cada comando,
e hoje só existe no PTZ do VMS.

## Substituição (UC-012)

`POST /cameras/:id/replace`, corpo `{ newCameraId, reason }`.

1. Chave `cameras.camera:edit` e `assertCameraInSystem`.
2. `id` igual a `newCameraId`: 409 `CAMERA_SELF_REPLACE`.
3. Velha inexistente ou removida: 404. Velha fora de `OPERATIONAL` e `IN_FIELD`: 422
   `CAMERA_LIFECYCLE_PRECONDITION_NOT_MET`.
4. Nova inexistente, removida ou de outro sistema: 404. Nova fora de `STOCK`: 409 `STOCK_CAMERA_NOT_FOUND`.
5. `replaceCamera` numa transação: a nova herda estado e localização, recebe os presets default da velha e
   os tours, as cenas do VMS passam a apontar para ela, a velha vai a `STOCK` com `replacedByCameraId`.
6. `CameraReplacedEvent` move o vínculo da Neural Labs; invalida o dashboard; audita com o motivo; notifica.
7. 200 com o detalhe da velha.

## Remoção (UC-006)

`DELETE /cameras/:id`: chave `cameras.camera:delete`, `assertCameraInSystem`, grava `deletedAt`, audita,
notifica, publica `DELETED` e responde 204.

## Validação de credenciais (UC-013)

`POST /cameras/validate-credentials`, corpo `{ items[] }` (`cardId`, `ip`, `username`, `password`), até 50.
Chave `cameras.camera:create` ou `cameras.camera:edit`. Sonda cada item em paralelo e devolve
`{ cardId, ok, device?, errorCode? }` com a arquitetura ARTPEC e a compatibilidade do analítico. Não grava
no banco. A mesma sondagem roda de novo, com gravação, dentro do `POST /cameras`.

## Perfis de mídia (UC-031)

`GET /cameras/:id/media-profiles`, paginada (`page`, `pageSize`, `query`, `sortBy`, `sortOrder`). O handler
lê o inventário já persistido, sem sondagem ao vivo; câmera fora do sistema é 404, câmera sem inventário é
página vazia. Responde `IListMediaProfilesResponse`.

## Leituras em lote para outros módulos (RF-INT-07)

`POST /cameras/validate` (UC-018) e `POST /cameras/batch-get` (UC-019) recebem array cru de UUIDs (1 a
200), removem duplicados, escopam por sistema e `deletedAt: null` e aceitam câmera em qualquer estado.
O primeiro responde 204 ou 404 `CamerasNotFoundBatchException(missingIds)`; o segundo, 200 com
`{ cameras[] }`. Consumidor típico: `ms-traffic-model`, ao validar câmeras de interseção.

## Vínculo com interseção (PROJ-029)

1. O `ms-traffic-model` grava `NodeCamera` e publica `attlas.node-devices.associated`.
2. O listener valida o payload (inválido vai à fila-morta), ignora tipo que não é `CAMERA` e executa
   `AttachCameraToIntersectionCommand`, que grava `trafficElementId` e invalida o dashboard.
3. Na dissociação, `DetachCameraFromIntersectionCommand` limpa o campo só se ainda aponta para o nó.

## Frontend - feature module `cameras`

NgModule em `apps/web-attlas/src/app/modules/cameras/`, rotas em `cameras-routing-module.ts`:

| Rota | Componente | Papel |
| --- | --- | --- |
| `devices` | `CamerasListPageComponent` | Tabela, filtros, colunas e detalhe lateral |
| `devices/:id` | `CameraDetailPageComponent` | Detalhe: cabeçalho, player, saúde, perfis de mídia, presets, eventos, analítico |
| `devices/new`, `devices/:id/edit` | `CamerasFormPlaceholderComponent` | Placeholder; cadastro e edição abrem por painel e sheet |
| `vms`, `videowall-panel` | lazy | [[Câmeras - VMS]] e [[Câmeras - Videowall]] |
| `events` | lazy `CamerasEventsModule` | [[Câmeras - Eventos, incidentes e alarmes]] |
| `dashboard` | lazy `CamerasDashboardModule` | [[Câmeras - Dashboard]] |

Componentes do cadastro e do ciclo de vida:

- `camera-creation-panel`: wizard em quatro passos, `device`, `credentials` (chama `validate-credentials`),
  `settings` e `review`. O passo de configuração não tem campo de estado, e Marca e Modelo vêm da sondagem,
  só leitura. Importação por planilha (`camera-bulk-import.service.ts`) respeita o lote de 50 e envia as
  credenciais da planilha sem exigir Validar.
- `camera-edit-sheet`: edição parcial; separa host e porta, trata IP duplicado; não troca o estado.
- `camera-substitution-dialog`: lista as câmeras em estoque (`listStock`), exige o motivo e chama
  `POST /cameras/:id/replace`; trata `STOCK_CAMERA_NOT_FOUND`.
- `camera-location-modal` e `camera-intersection-picker`: geoposição, azimute e interseção.
- `cameras-filters`, `cameras-table`, `cameras-column-visibility`, `cameras-side-detail`: listagem.

Fluxo de uso: a lista abre o detalhe lateral ou o detalhe completo; o detalhe concentra saúde, perfis,
presets, eventos e PTZ; cadastro, edição, substituição e localização abrem por painel, sheet e diálogos,
cada um ligado à sua rota. Os controles sem permissão aparecem bloqueados em vez de falhar no clique.

O acesso em até dois cliques de RNF-CAM-07 parte do mapa do Painel de Operações, não deste módulo; ver
[[Câmeras - PTZ e presets - Fluxos]].
