---
tags:
  - doc
  - cameras
  - vms
aliases:
  - "Câmeras - VMS - Arquitetura e estratégias"
  - "Video Wall - Arquitetura e estratégias"
  - "Video Wall - Requisitos e SLA"
  - "VMS - Arquitetura e estratégias"
atualizado: 2026-10-07
banner: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200"
---

# Câmeras - VMS - Arquitetura e estratégias

Volta para [[Câmeras - VMS]].

## Resumo

| Lado | O que faz | O que não faz |
| --- | --- | --- |
| Backend (`ms-cameras`) | Guarda layouts e cenas, oferece o seletor de câmeras, calcula o snapshot de banda, publica auditoria das escritas de cena e ativa a cena num alvo de exibição | Não renderiza vídeo, não roda rotação, não guarda estado PTZ de célula e não devolve URL de stream |
| Frontend (`web-attlas`) | Monta o mosaico redimensionável, roda a rotação, dirige o PTZ por tile, abre a tela cheia e abre uma sessão de vídeo por câmera | Não persiste rotação nem estado PTZ no backend; a rotação vai na URL e a última cena por sistema fica no `localStorage` |

Ativar uma cena sem alvo só marca `isActive`; ativar com `target: VIDEOWALL` projeta a cena no painel físico
([[Câmeras - Videowall]]). O passo a passo está em [[Câmeras - VMS - Fluxos]].

## Onde está no código

| Caminho | Papel |
| --- | --- |
| `apps/ms-cameras/src/video-wall/video-wall.controller.ts` | Rotas `/api/vms/layouts` e `/api/vms/scenes` |
| `apps/ms-cameras/src/video-wall/handlers/` | Handlers de layout e cena; `_helpers/validate-scene-cells.ts` valida a grade |
| `apps/ms-cameras/src/video-wall/repositories/video-wall-scenes.repository.ts` | Persistência da cena e materialização do layout custom (`resolveLayoutId`) |
| `apps/ms-cameras/src/video-wall/video-wall.constants.ts` | `GLOBAL_ORGANIZATION_ID` |
| `apps/ms-cameras/src/video-wall/targets/` | Alvos de exibição: `browser-session/` (mosaico), `novastar-h9/` e os demais do painel físico; seletor em `video-wall-display-target.selector.ts` |
| `apps/ms-cameras/src/video-wall/video-wall-scene.audit.ts` | Auditoria das escritas de cena, publicada por `apps/ms-cameras/src/shared/audit/cameras-audit.publisher.ts` |
| `apps/ms-cameras/src/cameras/handlers/list-video-wall-cameras/` | Seletor de câmeras; rota em `apps/ms-cameras/src/cameras/cameras.controller.ts` |
| `apps/ms-cameras/src/cameras/repositories/cameras.repository.ts` | `buildVideoWallWhere`, o filtro do seletor |
| `apps/ms-cameras/src/dashboard/bandwidth/` | Snapshot de banda ([[Câmeras - Streaming - Banda e bitrate]]) |
| `apps/ms-cameras/src/database/schema/video_wall/` | Modelos de layout, cena e célula |
| `apps/ms-cameras/src/database/seed.ts` | `VIDEO_WALL_LAYOUTS`, os layouts predefinidos |
| `libs/contracts/src/lib/videowall/` | View, célula, rotação, enum de layout e eventos ao vivo |
| `libs/contracts/src/lib/camera/video-wall.validation.ts` | Limites compartilhados entre backend e frontend |
| `apps/web-attlas/src/app/modules/videowall/` | Mosaico; o painel físico fica em `display-target/` |
| `apps/web-attlas/src/app/modules/videowall/pages/videowall/` | A página e os seis stores |
| `apps/web-attlas/src/app/modules/videowall/services/videowall.service.ts` | Só HTTP; converte o view model 0-based no contrato 1-based (`toSceneWrite`) |
| `apps/web-attlas/src/app/modules/videowall/components/mosaic/` | `mosaic-board`, `mosaic-tile`, `mosaic-splitter`, `mosaic-window` e `mosaic-tree.util.ts` |
| `apps/web-attlas/src/app/modules/videowall/utils/videowall-media-key.util.ts` | Chave de mídia `wall:<cameraId>` |
| `apps/web-attlas/src/app/modules/videowall/guards/videowall-dirty.guard.ts` | Confirmação ao sair com edição pendente |

## Contratos

### Rotas HTTP

| Método e rota | Autorização | O que faz | Spec |
| --- | --- | --- | --- |
| `GET /api/vms/layouts` | JWT | Layouts da organização mais os globais | UC-015 |
| `POST /api/vms/scenes` | `cameras.videoWall:configure` | Cria cena (`layoutId` ou `customGrid`, mais `cells`) | UC-016 |
| `GET /api/vms/scenes` | JWT | Lista enxuta com contadores | UC-016 |
| `GET /api/vms/scenes/:id` | JWT | Detalhe com layout e células enriquecidas (`ICameraVideoWallItem`) | UC-016 |
| `PATCH /api/vms/scenes/:id` | `cameras.videoWall:configure` | Nome, layout e células | UC-016 |
| `DELETE /api/vms/scenes/:id` | `cameras.videoWall:configure` | Remove (204) | UC-016 |
| `POST /api/vms/scenes/:id/activate` | `cameras.videoWall:operate` | Corpo `{ target?, takeover? }`; sem alvo, `isActive = true`; com `target: VIDEOWALL`, projeta no painel | UC-016, UC-051 |
| `POST /api/vms/scenes/:id/deactivate` | `cameras.videoWall:operate` | Espelho do anterior; com `VIDEOWALL`, limpa a parede | UC-016, UC-051 |
| `GET /api/cameras/vms` | Membro do sistema | Seletor paginado | UC-014 |
| `GET /api/dashboard/bandwidth?cameraIds=` | Membro do sistema | Snapshot de banda | UC-019 |

No Kong, `/api/vms` é a rota `ms-cameras-vms-route`. O seletor tem rota própria, `ms-cameras-vms-picker`
(`~/api/cameras/vms$`, com JWT e `regex_priority: 10`), porque sem ela o allowlist público por id de câmera
casaria `/api/cameras/vms` e a listagem responderia sem JWT.

### Tabelas do banco

| Modelo | Campos | Regras |
| --- | --- | --- |
| `VideoWallLayout` | `columns`, `rows`, `isDefault`, `organizationId` | Predefinidos 1x1, 2x2, 3x3 e 4x4 vêm do seed na organização global `00000000-0000-0000-0000-000000000000`; customs pertencem à organização do usuário |
| `VideoWallScene` | `layoutId` (FK com cascade), `name`, `isActive`, `sortOrder` | Sem coluna `version` |
| `VideoWallSceneCell` | `cameraId` (nulo é slot vazio), `gridColumn` e `gridRow` 1-based, `columnSpan` e `rowSpan` (padrão 1) | FK de câmera com restrict: não deixa apagar câmera usada em cena |

### Limites compartilhados

`VideoWallSceneValidation`, usado pelo backend e pelo frontend:

| Campo | Limite |
| --- | --- |
| `name` | 1 a 120 caracteres |
| Grade | 1 a 1000 colunas e 1 a 1000 linhas |
| Células por cena | No máximo 100 |

### Respostas

- `VideoWallSceneResult` (create, update, activate, list) traz escalares e dois contadores derivados:
  `allocatedCameraCount` (células com câmera) e `onlineCameraCount` (dessas, as com
  `operationalSnapshot.connectionStatus` diferente de `OFFLINE`; sem snapshot conta como não online).
- Item do seletor (`ICameraVideoWallItem`): `id`, `name`, `cameraType`, `lifecycleState`, `ptz`, `status`,
  `intersection` e `hasSecondaryStream`. Filtros: `q` (nome, interseção e IP), `cameraType[]`,
  `lifecycleState[]` e paginação.

### Auditoria

As escritas de cena (`@Audited`) e a ativação por operador publicam no tópico `attlas.audit.cameras`, com o
antes e o depois de `isActive` na ativação. A projeção disparada por plano de resposta não publica.

## Por que é assim

### Nomenclatura

| Termo | O que é |
| --- | --- |
| VMS | O mosaico interno no navegador, "Monitoramento de Vídeo" na interface (chave `camera.navbar.vms`), rota `/cameras/vms` |
| Videowall | O painel físico de Quito, comandado pelo processador NovaStar H9; é um alvo de exibição do VMS, na aba "Videowall" do módulo Câmeras (`/cameras/videowall-panel`) |
| NVR | O gravador externo que recebe o stream primário; o Attlas não o dirige |
| VMS no `ms-pmv` | Variable Message Sign; a colisão se resolve por contexto, sem renome |

O renome para VMS atingiu só o que o usuário e o cliente da API observam: rotas `/api/vms/*` e
`/api/cameras/vms`, rota do front `/cameras/vms`, catálogo i18n `vms.json`, ícones `vms.*` e a chave de
`localStorage` `vms.lastSceneBySystem`. Continuam dizendo video-wall de propósito: a pasta
`apps/ms-cameras/src/video-wall/` e as classes `VideoWall*` (operam sobre os models `VideoWall*`), os contratos
`libs/contracts/src/lib/videowall/` e `IVideoWall*`, as tabelas `VideoWallLayout`, `VideoWallScene` e
`VideoWallSceneCell` (renome custa migration), os valores de `EnumVideowallLayout` e os `errorCode`
`VIDEOWALL_*` (contrato estável), os IDs de spec e a pasta `modules/videowall/` do front. Se a implementação
for renomeada, vai junto da migration das tabelas, num card só. Os models do painel físico usam outra grafia
(`VideowallProcessor`, `VideowallSession`, `VideowallGroup`), e o schema tem as duas.

### Layout custom e validação de células

A cena informa exatamente um de `layoutId` ou `customGrid`; os dois ou nenhum dão 400
`LAYOUT_SOURCE_AMBIGUOUS`. O `customGrid` é materializado no save, dentro da transação (`resolveLayoutId`):
reusa um custom da organização com as mesmas dimensões ou cria `Custom {C}x{R}`, e ao trocar o layout o custom
que fica órfão é removido. A grade vai até 1000x1000 porque o front projeta a árvore de tiling do mosaico numa
grade percentual virtual.

A validação de células confere que cada uma cabe na grade (409 `CELL_OUT_OF_BOUNDS` ou
`INVALID_CELL_POSITION`), que nenhuma sobrepõe outra (409 `CELL_OVERLAP`, comparação O(n²) sobre no máximo
100 células) e que toda câmera existe, não está apagada e não é `STOCK` (409 `CAMERA_NOT_ELIGIBLE`). No
`PATCH` só de layout, as células atuais são revalidadas; `cells` no `PATCH` substitui o conjunto inteiro.

### Escopo e autorização

- Layouts e cenas são escopados pela organização do JWT; acesso de outra organização dá 404 sem revelar que
  o recurso existe. A listagem de layouts usa `organizationId IN (org, GLOBAL)`, ordenada por
  `isDefault desc, columns asc, rows asc`; cenas por `sortOrder asc, name asc`.
- Escritas de cena exigem `cameras.videoWall:configure`; ativar e desativar exigem
  `cameras.videoWall:operate`; leituras não pedem chave, e o alcance vem do Alcance Operacional. A avaliação é
  fail-closed contra o `ms-organization` (`enablePermissionEvaluation: true` em
  `apps/ms-cameras/src/app.module.ts`).
- O `VideoWallController` é o único controller do domínio sem `@RequireSystemDuty()` de classe, de propósito:
  a ativação padrão não exige `System-Id` e precisa continuar idêntica. Com `target: VIDEOWALL` o header é lido
  de forma opcional (malformado dá 400 `SYSTEM_ID_HEADER_INVALID`) e exigido só pelo adaptador do painel.
- O seletor exige que o requisitante seja membro do sistema do `System-Id` (`@RequireSystemDuty()` de classe
  do `CamerasController`).
- No front, controle sem a permissão aparece desabilitado, com cadeado e tooltip (`[permissionBlock]`).

### Ativação por alvo, não exclusiva

O `SetVideoWallSceneActiveHandler` pede ao `VideoWallDisplayTargetSelector` o alvo do campo `target`
(`VideoWallDisplayTarget`, padrão `BROWSER_SESSION`):

| Alvo | Código | O que faz |
| --- | --- | --- |
| `BROWSER_SESSION` | `apps/ms-cameras/src/video-wall/targets/browser-session/browser-session-display.target.ts` | `setSceneActive` só alterna `isActive` da cena; ativar uma não desativa as outras, e exclusividade e rotação são do front |
| `VIDEOWALL` | `apps/ms-cameras/src/video-wall/targets/novastar-h9/novastar-h9-display.target.ts` | Projeta a cena salva no painel externo, ou limpa a parede no `deactivate`; nunca escreve `isActive`. `takeover` confirma deslocar quem ocupa o painel |

O 404 de cena ausente ou de outra organização é decidido no handler, para os dois alvos. O que o painel
mostra fica na ocupação do alvo externo, não em `VideoWallScene`.

### Seletor mais estreito que a cena

Sem `lifecycleState` o seletor lista só câmeras `OPERATIONAL`; com o filtro, aceita os estados pedidos menos
`STOCK` (`buildVideoWallWhere`). A cena aceita qualquer câmera não apagada fora de `STOCK`, então uma cena
pode conter câmera que o seletor, sem filtro, não mostra.

### Frontend em camadas

- **Vocabulário.** O operador salva visualizações (`IVideowallView`), que no backend são cenas.
- **Rota.** `/cameras/vms` e `/cameras/vms/:viewId` resolvem o mesmo `VideowallPageComponent`;
  `videowallDirtyGuard` pede confirmação ao sair com edição pendente.
- **Camadas.** A página só orquestra; o estado vive em seis stores `@Injectable()` com `signal` e `computed`,
  providos no `providers` da página. É o padrão de camadas a seguir em feature module grande do front.

  | Store | Estado |
  | --- | --- |
  | `videowall-stream-session.store.ts` | Sessões de vídeo por câmera, degrau de qualidade por tile, codec pedido e servido, veredito de abertura |
  | `videowall-camera-directory.store.ts` | Catálogo de câmeras do seletor |
  | `videowall-mosaic-scene.store.ts` | Geometria viva do mosaico |
  | `videowall-immersive.store.ts` | Tela cheia |
  | `videowall-ptz.store.ts` | Qual tile o controle PTZ compartilhado dirige |
  | `videowall-view-catalog.store.ts` | Catálogo de visualizações, persistência e envio ao painel |

- **Layouts.** `EnumVideowallLayout` vai de `GRID_1X1` a `GRID_6X6`, mais `CUSTOM`. Preset sem layout
  predefinido no seed (5x5 e 6x6) vira `customGrid` quadrado em `toSceneWrite`. "Mandar para a grade"
  dimensiona o menor preset quadrado que cabe na seleção, até 6x6, e descarta o excedente avisando.
- **Rotação.** `IRotationConfig` (`items[] {viewId, dwellSeconds}`, `loop`) vai na URL e não tem endpoint;
  timer local, `dwellSeconds` mínimo de 5 s e presets de 10, 20, 30, 60 e 120 s.
- **Vídeo.** Uma sessão por câmera, compartilhada pelos tiles da mesma câmera, no perfil secundário, com
  degrau de qualidade adaptativo e histerese. O tile pede AV1 primeiro enquanto a aba tiver vaga de
  decodificação AV1 por software, que tem teto por aba; o backend só serve AV1 com `STREAM_AV1_ENABLED`
  ligado (padrão `false`) e o tile registra o codec servido, liberando a vaga que não usou. Falha de
  decodificação de H.265 ou AV1 rebaixa o codec ([[Câmeras - Streaming - Codecs]]). Tile cuja abertura falha
  mostra "Sem sinal" sobre a miniatura e libera a vaga de AV1; o 429 do teto de sessões vira o estado
  `cap-reached`.
- **Chave de mídia.** `wall:<cameraId>` é a chave do `LiveMediaRegistry` no mosaico e nas células de cena do
  palco do painel, para trocar de tela sem renegociar o WebRTC; o palco do espelho usa `vw-stage:<shareId>`.
- **Enviar ao painel.** O botão da toolbar chama `sendToPanel`, que ativa a cena salva com
  `target: VIDEOWALL`, salvando antes se há edição pendente, porque o painel recebe o que está persistido.

### Requisitos que o desenho atende

Regra de negócio em `docs/modules/cameras.md`, seção 3.2 e seção 9.

| ID | Requisito | Onde vive | Estado |
| --- | --- | --- | --- |
| RF-VW-01 | Layouts configuráveis | Backend | Predefinidos 1x1 a 4x4 e custom por organização; 5x5 e 6x6 como `customGrid` |
| RF-VW-02 | Cenas ativáveis em ação única | Backend | CRUD e `activate` num POST, que também projeta no painel |
| RF-VW-03 | Rotação automática | Front | Timer, ordem e `dwellSeconds` no cliente |
| RF-VW-04 | PTZ por célula | Front | Um controle compartilhado dirige o tile escolhido, com a confirmação do RNF-CAM-10 fora de `OPERATIONAL`; comandos via [[Câmeras - PTZ e presets]] |
| RF-VW-05 | Popup de detalhe e tela cheia | Parcial | Backend dá cena e detalhe da câmera; o popup é do cliente |
| RF-VW-06 | Monitoramento de banda | Parcial | Só o snapshot provisionado no backend, sem tela ([[Câmeras - Streaming - Banda e bitrate]]) |
| RNF-CAM-04 | Desempenho do mosaico | Parcial | Respostas enxutas, validação limitada a 100 células, vídeo fora do `ms-cameras`; o limite prático é o navegador (players simultâneos, GPU) |
| RNF-CAM-12 | Alertas de banda | Parcial | Total e `alertLevel` no backend; por câmera e proativo, não |

## Armadilhas conhecidas

- **Ativar uma cena no alvo padrão não desativa as outras.** Não existe "cena ativa única" no backend; quem
  garante exclusividade é o front.
- **O painel recebe a cena persistida, não a que está na tela.** Por isso "Enviar ao painel" salva antes.
- **A cena guarda células 1-based e o front trabalha 0-based.** A conversão mora só em
  `videowall.service.ts`.

> [!warning] `IVideowallView.version` sem semântica
> O contrato documenta `version` como `If-Match` de um `PUT /api/video-wall/scenes/:id`, rota que não
> existe. O backend só tem `PATCH`, sem coluna `version`; o front não manda `If-Match` e ecoa `version: 0`.
> Candidato a limpeza no contrato.

> [!warning] Spec do front defasada
> `apps/web-attlas/docs/modules/videowall/MOD-001-videowall.md` ainda descreve `/cameras/videowall` e
> `/api/video-wall/*` no corpo.

## Glossário

| Termo | O que é |
| --- | --- |
| Cena | Arranjo salvo de câmeras numa grade; no front se chama visualização |
| Célula | Posição da grade, com câmera ou vazia, que pode ocupar várias colunas e linhas |
| Layout | Grade de colunas e linhas; predefinido (global) ou custom (da organização) |
| Alvo de exibição | Onde a ativação de uma cena tem efeito: a sessão do navegador ou o painel físico |
| Tiling | Divisão redimensionável da tela em tiles por uma árvore de divisões |
| Seletor | Lista paginada de câmeras elegíveis para o mosaico (`GET /api/cameras/vms`) |
