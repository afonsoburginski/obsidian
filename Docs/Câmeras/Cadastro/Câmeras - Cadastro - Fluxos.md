---
tags:
  - doc
  - cameras
  - cadastro
aliases:
  - "Cameras - Fluxos"
atualizado: 2026-10-07
banner: "database registry system"
---

# Câmeras - Cadastro - Fluxos

Volta para [[Câmeras - Cadastro]].

## Resumo

O porquê de cada passo está em [[Câmeras - Cadastro - Arquitetura e estratégias]]; aqui fica só a ordem.

| Fluxo | Gatilho | Resultado |
| --- | --- | --- |
| Cadastro em lote | `POST /cameras` | Câmeras criadas ou reativadas, sondadas e provisionadas, com aviso por câmera que não respondeu |
| Edição | `PATCH /cameras/:id` | Campos enviados gravados; endereço novo reaponta perfis e reprovisiona câmera sem perfil |
| Mudança de estado | `PATCH /cameras/:id/state` | Estado trocado se a transição é permitida |
| Substituição | `POST /cameras/:id/replace` | Câmera nova herda posição, estado, presets e cenas; a velha volta ao estoque |
| Remoção | `DELETE /cameras/:id` | Câmera marcada como removida, 204 |
| Validação de credenciais | `POST /cameras/validate-credentials` | Resultado da sondagem por item, sem gravar |
| Perfis de mídia | `GET /cameras/:id/media-profiles` | Página do inventário já descoberto |
| Leituras em lote | `POST /cameras/validate`, `POST /cameras/batch-get` | Existência ou dados de exibição de até 200 câmeras |
| Localização em lote | `PUT /cameras/locations` | Posição e azimute gravados, com resultado por câmera |
| Vínculo com interseção | `attlas.node-devices.associated` e `attlas.node-devices.dissociated` | `Camera.trafficElementId` aponta para o nó ou é limpo |

## Cadastro em lote

**Gatilho.** `POST /cameras`, corpo `ICreateCameraRequest[]`; na tela, o passo de revisão do wizard ou a
importação por planilha.

**Passos.**

1. Guarda de pertencimento e chave `cameras.camera:create`; `@SystemId()` exige o header.
2. Lote acima de 50 itens é recusado.
3. Resolve cada marca distinta uma única vez, em sequência, registrando as não catalogadas.
4. Confirma cada `replacedByCameraId` enviado.
5. Recusa IP repetido no lote ou já usado por câmera ativa do sistema; IP de câmera removida marca o item para
   reativação.
6. `createMany` numa `$transaction`: cria os novos e reativa os marcados, limpando antes os filhos da encarnação
   anterior; grava junto as declarações de leitura de placa e de analítico servidor que o item trouxer.
   `lifecycleState` é o enviado ou `STOCK`.
7. Invalida o dashboard (domínio `INVENTORY`).
8. Para cada câmera, em paralelo: sondagem e provisionamento (credencial, perfis, promoção a `OPERATIONAL`
   quando o estado não veio e há perfil H264 ou H265, promoção a PTZ quando há faixa real de pan ou tilt);
   câmera que respondeu entra já no monitoramento de saúde; analítico embarcado dispara o vínculo do equipamento
   em segundo plano.
9. Em segundo plano: descoberta de perfis de mídia, com permissão para ligar o ONVIF de uma Hikvision, e
   publicação de `CREATED` no ciclo de vida.
10. Auditoria por câmera e notificação agregada do lote.
11. Relê as câmeras do banco para a resposta trazer o estado depois do provisionamento.

**Resultado.** 201 com as câmeras, cada uma com o aviso de provisionamento quando a sondagem falhou ou não
achou perfil utilizável.

**Erros.**

| Código | HTTP | Quando |
| --- | --- | --- |
| `BATCH_LIMIT_EXCEEDED` | 400 | Lote acima de 50 |
| `RESOURCE_NOT_FOUND` | 404 | `replacedByCameraId` inexistente |
| `CAMERA_DUPLICATE_IP` | 422 | IP repetido no lote (com `cardIndex`), já ativo no sistema ou perdido na corrida do índice |

## Edição

**Gatilho.** `PATCH /cameras/:id`; na tela, o `camera-edit-sheet`.

**Passos.**

1. Chave `cameras.camera:edit` e `assertCameraInSystem`.
2. Lê a câmera; inexistente responde 404.
3. Com IP no delta e diferente do atual, recusa se outra câmera ativa já usa o IP.
4. Resolve a marca se `manufacturerId` veio e grava só os campos presentes. As chaves de
   `analyticsCapabilities` que a sondagem possui (`hasEmbeddedAnalytics`, `deviceSourceId`,
   `artpecArchitecture`, `artpecArchitectureSource`) são preservadas mesmo que o pedido as omita.
5. Pedido com endereço reaponta a URL de todos os perfis de stream; endereço mudado publica
   `CameraOriginChangedEvent`.
6. Pedido com endereço agenda em segundo plano o reprovisionamento: se a câmera não tem perfil ativo, roda a
   sequência do cadastro com a credencial gravada e o estado atual, mais a descoberta de perfis de mídia.
7. Invalida o dashboard, audita o diff, notifica e publica `UPDATED` no ciclo de vida.

**Resultado.** 200 com o detalhe da câmera. O resultado do reprovisionamento não volta na resposta: falha vira
aviso no log.

**Erros.**

| Código | HTTP | Quando |
| --- | --- | --- |
| `RESOURCE_NOT_FOUND` | 404 | Câmera inexistente ou de outro sistema |
| `CAMERA_DUPLICATE_IP` | 422 | IP já usado por câmera ativa, ou perdido na corrida do índice |

## Mudança de estado

**Gatilho.** `PATCH /cameras/:id/state`, corpo `{ state }`. Nenhuma tela do `web-attlas` chama esta rota.

**Passos.**

1. Chave `cameras.camera:edit` e `assertCameraInSystem`.
2. Lê a câmera; inexistente responde 404.
3. `assertValidTransition(from, to)`.
4. Persiste, incrementa `cameras_state_transitions_total{from,to}`, invalida o dashboard, audita e notifica.

**Resultado.** 200 com o detalhe da câmera.

**Erros.**

| Código | HTTP | Quando |
| --- | --- | --- |
| `RESOURCE_NOT_FOUND` | 404 | Câmera inexistente ou de outro sistema |
| `INVALID_STATE_TRANSITION` | 409 | Transição fora da máquina de estados |

## Substituição

**Gatilho.** `POST /cameras/:id/replace`, corpo `{ newCameraId, reason }`; na tela, o
`camera-substitution-dialog`.

**Passos.**

1. Chave `cameras.camera:edit` e `assertCameraInSystem`.
2. Recusa `id` igual a `newCameraId`.
3. Lê a velha: inexistente ou removida responde 404; fora de `OPERATIONAL` e `IN_FIELD` é recusada.
4. Lê a nova: inexistente, removida ou de outro sistema responde 404; fora de `STOCK` é recusada.
5. `replaceCamera` numa transação: a nova herda estado e localização, recebe os presets default da velha e os
   tours, as cenas do VMS passam a apontar para ela, a velha vai a `STOCK` com `replacedByCameraId`.
6. Publica `CameraReplacedEvent`, que move o vínculo da Neural Labs; invalida o dashboard; audita com o motivo;
   notifica.

**Resultado.** 200 com o detalhe da câmera velha.

**Erros.**

| Código | HTTP | Quando |
| --- | --- | --- |
| `CAMERA_SELF_REPLACE` | 409 | Câmera substituindo a si mesma |
| `RESOURCE_NOT_FOUND` | 404 | Velha ou nova inexistente, removida ou de outro sistema |
| `CAMERA_LIFECYCLE_PRECONDITION_NOT_MET` | 422 | Velha fora de Operativa e de Em campo |
| `STOCK_CAMERA_NOT_FOUND` | 409 | Nova fora do estoque |

## Remoção

**Gatilho.** `DELETE /cameras/:id`.

**Passos.**

1. Chave `cameras.camera:delete` e `assertCameraInSystem`.
2. Grava `deletedAt` e incrementa `cameras_soft_deleted_total`.
3. Invalida o dashboard, audita, notifica e publica `DELETED` no ciclo de vida.

**Resultado.** 204. A câmera some de todas as leituras e continua no banco.

**Erros.** 404 `RESOURCE_NOT_FOUND` para câmera inexistente, já removida ou de outro sistema.

## Validação de credenciais

**Gatilho.** `POST /cameras/validate-credentials`, corpo `{ items[] }` com `cardId`, `ip`, `username` e
`password`; na tela, o botão Validar do passo de credenciais do wizard.

**Passos.**

1. Chave `cameras.camera:create` ou `cameras.camera:edit`.
2. Recusa lote acima de 50.
3. Sonda cada item em paralelo: conexão ONVIF com teto de 10 s, fallback ISAPI, detecção do analítico embarcado
   e da arquitetura ARTPEC.

**Resultado.** 200 com `{ cardId, ok, device?, errorCode? }` por item. Nada é gravado no banco, mas uma
Hikvision com ONVIF desligado sai da sondagem com o ONVIF ligado. A mesma sondagem roda de novo, com gravação,
dentro do `POST /cameras`.

**Erros.** Lote vazio ou acima de 50 responde 400 `VALIDATION_FAILED`. O erro de cada equipamento vem no
`errorCode` do item, não no status HTTP.

## Perfis de mídia

**Gatilho.** `GET /cameras/:id/media-profiles`, paginada (`page`, `pageSize`, `query`, `sortBy`, `sortOrder`);
na tela, a seção de perfis do detalhe da câmera.

**Passos.**

1. Pertencimento ao sistema.
2. O handler lê o inventário já persistido em `CameraMediaProfile`, sem sondagem ao vivo.

**Resultado.** 200 com `IListMediaProfilesResponse`. Câmera sem inventário devolve página vazia.

**Erros.** 404 `RESOURCE_NOT_FOUND` para câmera fora do sistema.

## Leituras em lote para outros módulos

**Gatilho.** `POST /cameras/validate` e `POST /cameras/batch-get`, corpo array cru de UUIDs; consumidor típico, o
`ms-traffic-model` ao validar câmeras de interseção.

**Passos.**

1. O `UuidArrayBodyPipe` aceita de 1 a 200 UUIDs e remove duplicados.
2. A leitura escopa por sistema e `deletedAt: null`, e aceita câmera em qualquer estado.

**Resultado.** `validate` responde 204 quando todas existem; `batch-get` responde 200 com `{ cameras[] }`.

**Erros.** `validate` responde 404 `CamerasNotFoundBatchException` com `missingIds`; corpo fora do formato
responde 400.

## Localização em lote

**Gatilho.** `PUT /cameras/locations`, corpo `{ cameras[] }` com `id`, `latitude`, `longitude` e `azimuth`
opcional; chamado pelo `ms-traffic-model` ao salvar uma interseção.

**Passos.**

1. Pertencimento ao sistema, sem chave de permissão.
2. Valida de 1 a 200 itens; azimute entre 0 e 360, com 360 normalizado para 0.
3. Recusa o lote inteiro se o mesmo `id` aparece duas vezes.
4. Grava cada câmera do sistema; câmera inexistente ou removida conta como falha daquele item (`NOT_FOUND`).
5. Com ao menos uma câmera gravada, invalida o dashboard; audita uma linha para o lote e notifica uma vez por
   câmera gravada.

**Resultado.** 200 com `results` por câmera, `updated` e `failed`.

**Erros.**

| Código | HTTP | Quando |
| --- | --- | --- |
| `DUPLICATE_CAMERA_IN_BATCH` | 422 | O mesmo `id` repetido no lote |
| `VALIDATION_FAILED` | 400 | Corpo fora do formato |

Falha de um item não vira erro HTTP: sai no `results` daquele item.

## Vínculo com interseção

**Gatilho.** O `ms-traffic-model` grava `NodeCamera` e publica `attlas.node-devices.associated` ou
`attlas.node-devices.dissociated`.

**Passos.**

1. O `NodeCameraAssociationListener` valida o payload e ignora tipo de dispositivo que não é `CAMERA`.
2. Associação executa `AttachCameraToIntersectionCommand`, que grava `trafficElementId` e invalida o dashboard.
3. Dissociação executa `DetachCameraFromIntersectionCommand`, que limpa o campo só se ele ainda aponta para o nó.

**Resultado.** A tela passa a mostrar interseção, área e subárea da câmera, e o filtro de topologia a inclui.

**Erros.** Payload inválido vai para a fila-morta `attlas.dlq.cameras`.

## Telas do web-attlas

NgModule em `apps/web-attlas/src/app/modules/cameras/`, rotas em `cameras-routing-module.ts`.

| Rota | Componente | O que mostra |
| --- | --- | --- |
| `devices` | `CamerasListPageComponent` | Tabela, filtros, colunas e detalhe lateral |
| `devices/:id` | `CameraDetailPageComponent` | Detalhe: cabeçalho, player, saúde, perfis de mídia, presets, eventos, analítico |
| `devices/new`, `devices/:id/edit` | `CamerasFormPlaceholderComponent` | Placeholder; cadastro e edição abrem por painel e sheet |
| `vms`, `videowall-panel` | carregadas sob demanda | [[Câmeras - VMS]] e [[Câmeras - Videowall]] |
| `events` | `CamerasEventsModule`, sob demanda | [[Câmeras - Eventos, incidentes e alarmes]] |
| `dashboard` | `CamerasDashboardModule`, sob demanda | [[Câmeras - Dashboard]] |

| Componente | Papel |
| --- | --- |
| `camera-creation-panel` | Wizard em quatro passos: `device`, `credentials` (chama `validate-credentials`), `settings` e `review`. Não tem campo de estado; Marca e Modelo vêm da sondagem, somente leitura |
| `camera-bulk-import.service.ts` | Importação por planilha: respeita o lote de 50 e envia as credenciais da planilha sem exigir Validar |
| `camera-lpr-switch` | Declaração da capacidade de leitura de placa no cadastro |
| `camera-edit-sheet` | Edição parcial; separa host e porta, trata IP duplicado, não troca o estado |
| `camera-substitution-dialog` | Lista as câmeras em estoque (`listStock`), exige o motivo, chama `POST /cameras/:id/replace` e trata `STOCK_CAMERA_NOT_FOUND` |
| `camera-location-modal`, `camera-intersection-picker`, `camera-topology-fields` | Geoposição, azimute e interseção |
| `cameras-filters`, `cameras-table`, `cameras-column-visibility`, `cameras-side-detail` | Listagem |

A lista abre o detalhe lateral ou o detalhe completo, e o detalhe concentra saúde, perfis, presets, eventos e
PTZ. Os controles sem permissão aparecem bloqueados em vez de falhar no clique. O acesso em até dois cliques
pedido pelo RNF-CAM-07 parte do mapa do Painel de Operações, não deste módulo (ver
[[Câmeras - PTZ e presets - Fluxos]]).
