---
tags:
  - doc
  - ms-cameras
  - cameras
  - vms
aliases:
  - "Video Wall - Arquitetura e estratégias"
  - "Video Wall - Requisitos e SLA"
atualizado: 2026-10-01
---

# VMS - Arquitetura e estratégias

Volta para [[VMS]]. Backend MOD-006 video-wall; frontend `MOD-001-videowall`. Fluxos em [[VMS - Fluxos]];
banda da sessão em [[Streaming - Banda e bitrate]]; painel físico em [[Videowall externo (NovaStar H9)]].
Visual: [[Diagrama - MOD-006 VMS.excalidraw]].

## Nomenclatura

- **VMS** é o interno: o mosaico de feeds ao vivo que o Attlas desenha no navegador, "Monitoramento de
  Vídeo" na interface (chave `camera.navbar.vms`).
- **Videowall** é o externo: o painel físico de Quito, comandado pelo processador NovaStar H9, um **alvo
  de exibição** do VMS (aba "Videowall" do módulo Câmeras, `/cameras/videowall-panel`).
- **NVR** é o gravador externo que recebe o stream primário; o Attlas não o dirige.
- No `ms-pmv`, VMS é Variable Message Sign: colisão resolvida por contexto, sem renome.

O renome para VMS (CROSS-045) atingiu só o observável: rotas `/api/vms/*` e `/api/cameras/vms`, rota do
front `/cameras/vms`, i18n `vms.json`, ícones `vms.*` e `localStorage` `vms.lastSceneBySystem`. **Continuam
dizendo video-wall de propósito**: a pasta `apps/ms-cameras/src/video-wall/` e as classes `VideoWall*`
(operam sobre models `VideoWall*`), os contratos `lib/videowall/` e `IVideoWall*`, as tabelas
`VideoWallLayout`, `VideoWallScene` e `VideoWallSceneCell` (renome custa migration), os valores de
`EnumVideowallLayout` e os `errorCode` `VIDEOWALL_*` (contrato estável), os IDs de spec e a pasta
`modules/videowall/` do front. Se a implementação for renomeada, vai junto da migration das tabelas, num
card só. Os models do alvo externo usam outra grafia (`VideowallProcessor`, `VideowallSession`,
`VideowallGroup`); o schema tem as duas.

## O que o backend faz e não faz

Guarda e serve **layouts** e **cenas**, oferece o **picker** de câmeras, calcula o **snapshot de banda** e
publica auditoria das escritas de cena. A ativação de cena é também a porta do painel físico
(`target: VIDEOWALL`). Não renderiza vídeo, não roda rotação e não guarda estado PTZ de célula. Nenhuma
resposta traz URL de stream: o player resolve o stream sozinho, via [[Streaming]].

## Mapa de código

| Área | Caminho |
| --- | --- |
| Layouts e cenas (MOD-006) | `apps/ms-cameras/src/video-wall/` (controller, handlers, repositórios, `video-wall.module.ts`) |
| Alvos de exibição | `apps/ms-cameras/src/video-wall/targets/` (`browser-session/`, `novastar-h9/` e os demais do painel) |
| Auditoria de cena | `video-wall/video-wall-scene.audit.ts` + `shared/audit/cameras-audit.publisher.ts`, tópico `attlas.audit.cameras` |
| Picker | `apps/ms-cameras/src/cameras/handlers/list-video-wall-cameras/`, rota em `cameras/cameras.controller.ts` |
| Banda (MOD-008) | `apps/ms-cameras/src/dashboard/bandwidth/` |
| Persistência | `apps/ms-cameras/src/database/schema/video_wall/`; seed `VIDEO_WALL_LAYOUTS` em `database/seed.ts` |
| Contratos | `libs/contracts/src/lib/videowall/` (view, célula, rotação, enum) e `libs/contracts/src/lib/camera/video-wall.validation.ts` |
| Frontend | `apps/web-attlas/src/app/modules/videowall/` (mosaico; o painel externo em `display-target/`) |

## Modelo: layout, cena, célula

- **`VideoWallLayout`**: grade `columns x rows`, `isDefault`, `organizationId`. Predefinidos 1x1, 2x2, 3x3 e
  4x4 vêm do seed na organização global `00000000-0000-0000-0000-000000000000` (`GLOBAL_ORGANIZATION_ID`);
  customs pertencem à organização do usuário.
- **`VideoWallScene`**: `layoutId` (FK cascade), `name`, `isActive`, `sortOrder`.
- **`VideoWallSceneCell`**: `cameraId?` (null é slot vazio; FK restrict, não deixa apagar câmera usada em
  cena), `gridColumn`/`gridRow` 1-based, `columnSpan`/`rowSpan` (padrão 1).

Limites da validação compartilhada back e front: `name` de 1 a 120, grade de 1 a 1000x1000, no máximo 100
células por cena. Não existe coluna `version`.

**Custom grid**: a cena informa exatamente um de `layoutId` ou `customGrid` (os dois ou nenhum dá 400
`LAYOUT_SOURCE_AMBIGUOUS`). O `customGrid` é materializado no save, dentro da transação (`resolveLayoutId`
em `video-wall-scenes.repository.ts`): reusa um custom da organização com as mesmas dimensões ou cria
`Custom {C}x{R}`; ao trocar o layout, o custom que fica órfão é removido. A grade vai até 1000x1000 porque o
front projeta a árvore de tiling do mosaico numa grade percentual virtual.

**Validação de células** (`handlers/_helpers/validate-scene-cells.ts`): cabe na grade (409
`CELL_OUT_OF_BOUNDS`/`INVALID_CELL_POSITION`); sem sobreposição, O(n²) sobre no máximo 100 células (409
`CELL_OVERLAP`); toda câmera existe, não está deletada e não é `STOCK` (409 `CAMERA_NOT_ELIGIBLE`). No
`PATCH` só de layout, as células atuais são revalidadas; `cells` no update é substituição total.

## Escopo e autorização

- Layouts e cenas são escopados pela **organização do JWT**; acesso de outra organização dá 404 sem vazar
  existência (BR-VWS-001). A listagem de layouts usa `organizationId IN (org, GLOBAL)`, ordenada por
  `isDefault desc, columns asc, rows asc`; cenas por `sortOrder asc, name asc`.
- Escritas de cena exigem `cameras.videoWall:configure`; ativar e desativar, `cameras.videoWall:operate`;
  leituras não carregam chave (o alcance vem do Alcance Operacional, CROSS-032). Avaliação fail-closed
  contra o `ms-organization` (`enablePermissionEvaluation: true`).
- O `VideoWallController` é o único controller do domínio **sem** `@RequireSystemDuty()` de classe, de
  propósito (CROSS-078): a ativação padrão não exige `System-Id` e precisa ficar idêntica (BR-VWS-007). Com
  `target: VIDEOWALL` o header é lido de forma opcional (malformado dá 400 `SYSTEM_ID_HEADER_INVALID`) e
  exigido só pelo adaptador do painel.
- O picker exige que o requisitante seja membro do sistema do `System-Id` (`@RequireSystemDuty()` de
  classe do `CamerasController`).
- No front, controle sem a permissão fica na tela desabilitado, com cadeado e tooltip (`[permissionBlock]`).

## Superfície HTTP

| Método e rota | UC | Autorização | O que faz |
| --- | --- | --- | --- |
| `GET /api/vms/layouts` | UC-015 | JWT | layouts da organização mais os globais |
| `POST /api/vms/scenes` | UC-016 | `configure` | cria cena (`layoutId` XOR `customGrid`, mais `cells`) |
| `GET /api/vms/scenes` | UC-016 | JWT | lista slim com contadores |
| `GET /api/vms/scenes/:id` | UC-016 | JWT | detalhe com layout e células enriquecidas (`ICameraVideoWallItem`) |
| `PATCH /api/vms/scenes/:id` | UC-016 | `configure` | nome, layout e células |
| `DELETE /api/vms/scenes/:id` | UC-016 | `configure` | remove (204) |
| `POST /api/vms/scenes/:id/activate` | UC-016, UC-051 | `operate` | corpo `{ target?, takeover? }`; sem alvo, `isActive = true`; com `target: VIDEOWALL`, projeta no painel |
| `POST /api/vms/scenes/:id/deactivate` | UC-016, UC-051 | `operate` | espelho do anterior; com `VIDEOWALL`, limpa a parede |
| `GET /api/cameras/vms` | UC-014 | membro do sistema | picker paginado |
| `GET /api/dashboard/bandwidth?cameraIds=` | UC-019 | membro do sistema | snapshot de banda ([[Streaming - Banda e bitrate]]) |

No Kong, `/api/vms` é a rota `ms-cameras-vms-route`, e o picker tem rota própria, `ms-cameras-vms-picker`
(`~/api/cameras/vms$`, com JWT e `regex_priority: 10`), porque sem ela o allowlist público por id de câmera
casaria `/api/cameras/vms` e a listagem responderia sem JWT.

## Ativação por alvo, não exclusiva

O `SetVideoWallSceneActiveHandler` pede ao `VideoWallDisplayTargetSelector` o alvo do campo `target`
(`VideoWallDisplayTarget`, padrão `BROWSER_SESSION`):

| Alvo | O que faz |
| --- | --- |
| `BROWSER_SESSION` (`targets/browser-session/`) | `setSceneActive` só alterna `isActive` da cena; ativar uma **não desativa** as outras, e exclusividade e rotação são do front |
| `VIDEOWALL` (`targets/novastar-h9/novastar-h9-display.target.ts`) | projeta a cena salva no painel externo, ou limpa a parede no `deactivate`; nunca escreve `isActive`. `takeover` confirma deslocar quem ocupa o painel |

O 404 de cena ausente ou de outra organização é decidido no handler, para os dois alvos. A ativação por
operador emite auditoria com o antes e o depois de `isActive`; a projeção disparada por plano não emite.
O que o painel mostra fica na ocupação do alvo externo, não em `VideoWallScene`.

## Respostas e picker

- `VideoWallSceneResult` (create, update, activate, list) traz escalares e dois contadores derivados:
  `allocatedCameraCount` (células com câmera) e `onlineCameraCount` (dessas, as com
  `operationalSnapshot.connectionStatus` diferente de `OFFLINE`; sem snapshot conta como não online).
- Picker `GET /api/cameras/vms`: filtros `q` (nome, interseção e IP), `cameraType[]`, `lifecycleState[]`,
  paginação. Sem `lifecycleState` lista só `OPERATIONAL`; com o filtro aceita os estados pedidos menos
  `STOCK` (`buildVideoWallWhere` em `cameras/repositories/cameras.repository.ts`). A regra é mais estreita
  que a da cena, que aceita qualquer câmera não deletada fora de `STOCK`. Item: `id`, `name`, `cameraType`,
  `lifecycleState`, `ptz`, `status`, `intersection`, `hasSecondaryStream`.

## Frontend (`apps/web-attlas/src/app/modules/videowall/`)

- **Vocabulário**: o operador salva **visualizações** (`IVideowallView`), que no backend são cenas.
- **Rota**: `/cameras/vms` e `/cameras/vms/:viewId` resolvem o mesmo `VideowallPageComponent`;
  `videowallDirtyGuard` (UF-011) pede confirmação ao sair com edição pendente.
- **Camadas**: a página só orquestra; o estado vive em seis stores `@Injectable()` com `signal` e
  `computed`, providas no `providers` da página (`pages/videowall/`): `videowall-stream-session.store.ts`
  (sessões de vídeo por câmera, degrau de qualidade por tile e o veredito de abertura `streamStatus`),
  `videowall-camera-directory.store.ts`, `videowall-mosaic-scene.store.ts` (geometria viva),
  `videowall-immersive.store.ts`, `videowall-ptz.store.ts` (qual tile o controle PTZ compartilhado dirige) e
  `videowall-view-catalog.store.ts` (catálogo, persistência e envio ao painel). `services/videowall.service.ts`
  só fala HTTP e converte o view model 0-based no contrato 1-based. É o padrão de camadas a seguir em
  feature module grande do front.
- **Mosaico**: `mosaic-board`, `mosaic-tile`, `mosaic-splitter` (tiling redimensionável,
  `mosaic-tree.util.ts`), painel lateral, seletor de layout e diálogos.
- **Presets**: `EnumVideowallLayout` vai de `GRID_1X1` a `GRID_6X6` mais `CUSTOM`; preset sem layout seedado
  (5x5 e 6x6) vira `customGrid` quadrado (`toSceneWrite`). "Mandar para a grade" dimensiona o menor preset
  quadrado que cabe na seleção, até 6x6, e descarta o excedente avisando.
- **Rotação**: `IRotationConfig` (`items[] {viewId, dwellSeconds}`, `loop`) vai na URL e não tem endpoint;
  timer local, `dwellSeconds` mínimo de 5 s, presets de 10 a 120 s.
- **Vídeo**: uma sessão por câmera, compartilhada pelos tiles da mesma câmera, no perfil secundário e com
  degrau adaptativo com histerese. Tile cuja abertura falha mostra "Sem sinal" sobre a miniatura; o 429 do
  teto vira o estado `cap-reached`.
- **Chave de mídia**: `wall:<cameraId>` é a chave do `LiveMediaRegistry` tanto no mosaico quanto nas
  células de cena do palco do painel (`modules/videowall/utils/videowall-media-key.util.ts`), para trocar
  de tela sem renegociar o WebRTC; o espelho usa `vw-stage:<shareId>`.
- **Enviar ao painel**: o botão da toolbar chama `sendToPanel`, que ativa a cena salva com
  `target: VIDEOWALL`, salvando antes se há edição pendente, porque o painel recebe o que está persistido.

## Requisitos e estado

Regra de negócio em `docs/modules/cameras.md`, seção 3.2 (RF-VW-01 a RF-VW-06) e seção 9.

| ID | Requisito | Onde vive | Estado |
| --- | --- | --- | --- |
| RF-VW-01 | Layouts configuráveis | backend | predefinidos 1x1 a 4x4 e custom por organização; 5x5 e 6x6 como `customGrid` |
| RF-VW-02 | Cenas ativáveis em ação única | backend | CRUD e `activate` num POST, que também projeta no painel |
| RF-VW-03 | Rotação automática | front | timer, ordem e `dwellSeconds` no cliente |
| RF-VW-04 | PTZ inline por célula | front | um controle compartilhado dirige o tile escolhido, com a confirmação do RNF-CAM-10 fora de `OPERATIONAL`; comandos via [[PTZ e presets]] |
| RF-VW-05 | Popup de detalhe e tela cheia | parcial | backend dá cena e detalhe da câmera; popup é do cliente |
| RF-VW-06 | Monitoramento de banda | parcial | só o snapshot provisionado no backend, sem tela ([[Streaming - Banda e bitrate]]) |
| RNF-CAM-04 | Desempenho do mosaico | parcial | respostas slim, validação limitada a 100 células, vídeo fora do `ms-cameras`; o limite prático é o navegador (players simultâneos, GPU) |
| RNF-CAM-12 | Alertas de banda | parcial | total e `alertLevel` no backend; por câmera e proativo, não |

> [!warning] `IVideowallView.version` sem semântica
> O contrato documenta `version` como `If-Match` de um `PUT /api/video-wall/scenes/:id`, rota que não
> existe. O backend só tem `PATCH`, sem coluna `version`, e o front não manda `If-Match` e ecoa
> `version: 0`. Candidato a limpeza no contrato.

> [!warning] Spec do front defasada
> `apps/web-attlas/docs/modules/videowall/MOD-001-videowall.md` ainda descreve `/cameras/videowall` e
> `/api/video-wall/*` no corpo.
