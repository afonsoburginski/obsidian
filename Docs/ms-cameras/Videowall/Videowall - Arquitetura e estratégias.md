---
tags:
  - doc
  - ms-cameras
  - cameras
  - novastar
  - quito
  - videowall
aliases:
  - "Pesquisa - transporte do espelhamento de tela"
  - "Transporte do espelhamento de tela"
atualizado: 2026-10-01
---

# Videowall - Arquitetura e estratégias

Volta para [[Videowall externo (NovaStar H9)]]. Requisitos e o texto do contrato em
[[Videowall - Requisitos e SLA]]; passo a passo em [[Videowall - Fluxos]]; o sistema do qual o painel é
saída em [[VMS - Arquitetura e estratégias]]. Specs no `ms-cameras`: `MOD-016-videowall-display-target`,
UC-049 (cadastro), UC-050 (tomar e liberar espelho), UC-051 (projetar e liberar cena), UC-052 (grupos),
UC-053 (atualizar processador), INT-011 (codec), INT-012 (cliente), INT-015 (brilho e estado), INT-016 (a
tela da consola como fonte), INT-017 (câmeras da cena como fontes), PROJ-019 (expira espelho órfão),
PROJ-020 (eco do comando de plano); despacho em PROJ-004 no `ms-execution-plans`.

## Dois modos, a fonte sempre servida pela plataforma

| Modo | Quando | Fonte que o equipamento puxa |
| --- | --- | --- |
| Espelho (`MIRROR`) | operador na consola | a captura da aba do Attlas, publicada por WHIP no MediaMTX e lida por RTSP 8554 em `videowall-mirror-*` |
| Projeção nativa (`NATIVE_SCENE`) | cena salva enviada pelo operador, plano de resposta sem operador ou grupo salvo com câmeras | uma fonte por câmera da cena, path `videowall-projection-*` no MediaMTX, puxado sob demanda da câmera |

O equipamento nunca recebe URL nem credencial de câmera: recebe `rtsp://<servidor de mídia>/<caminho>`, e a
URL da câmera fica só na config do path no MediaMTX
(`targets/projection/services/videowall-projection-source-grid.service.ts`, que usa o mesmo
`MediamtxPathConfigService` dos tiers de câmera, com `sourceOnDemand: true`).

## Por que mora no `ms-cameras`, dentro do VMS

- O caminho de mídia do painel é o mesmo MediaMTX, o mesmo cliente de control API e o mesmo resolver de
  fonte do streaming; num serviço separado, cada tomada de espelho seria chamada cross-service.
- Tudo que o painel mostra nasce do VMS: no espelho, a superfície que o operador vê; na projeção, uma cena
  salva do mosaico. Não existe segundo modelo de cena do lado do equipamento: a geometria da parede deriva
  da cena (RF-VW-11), e composição feita à mão na interface do equipamento não é objeto da plataforma. O
  espelhamento é de mão única.
- Consequência de superfície: tudo sob `/api/vms`, o equipamento em `/api/vms/videowall/*`.

## Transporte do espelho: RTSP servido pela plataforma

O H9 não aceita página web nem URL como fonte: a interface web dele é plano de controle, nenhum card de
entrada renderiza HTML e nenhuma capacidade da Open API recebe endereço de página. A tela só chega à parede
como vídeo codificado. Os três caminhos avaliados:

| | RTSP pela plataforma (card `H_2xRJ45 IP`) | NDI (card `H_1xNDI`) | Cabo HDMI/DP |
| --- | --- | --- | --- |
| Banda por espelho 1080p | 4 a 12 Mbps | cerca de 125 Mbps (Full NDI) | não usa rede |
| Teto de decodificação do card | 16x 2Kx1K ou 4x 4Kx2K | 4x 2Kx1K ou 1x 4Kx2K | - |
| Croma | 8 bits subamostrado | 4:2:2 | idêntico ao monitor |
| Atravessa sub-rede | sim | não sem servidor de descoberta | - |
| Espelha de qualquer cliente | sim | não | só daquela máquina |
| A plataforma observa e derruba | sim | não | não |

Escolhido o RTSP: é o único que entrega a tela de qualquer cliente autenticado sem máquina específica,
reusa o MediaMTX e mantém o espelho observável. O NDI esbarra no card (entrou na linha H9 na revisão
V1.14.0 da especificação, de 14/09/2024, depois da entrega do equipamento de Quito em 09/07/2024) e no mDNS,
que exige o intermediário que o RNF-CAM-14 veta. O cabo fica como caminho de comissionamento, para provar a
parede antes de qualquer software. O custo aceito é texto fino com croma subamostrado e cerca de 1 s de
latência, daí o piso de resolução do RNF-CAM-18.

Duas regras que o desenho impõe:

1. **H.264 fixado na ingestão, publicação fora disso é recusada, nunca transcodificada.**
   `VideowallMirrorCodecEnforcerService` (`targets/mirror/services/`) lê `/v3/paths/list` a cada 5 s e
   derruba o publicador de `videowall-mirror-*` com codec não aceito, porque o MediaMTX não tem allowlist de
   codec por path e a imagem `FROM scratch` não roda `runOnReady`.
2. **Vida da sessão é presença de publicação, nunca contagem de espectadores.** O equipamento puxando RTSP
   não se anuncia como espectador. `VideowallMirrorReaperService` (`targets/mirror/workers/`, PROJ-019,
   a cada 15 s com lease fixo e fail-closed) expira a ocupação de espelho sem publicação por
   `VIDEOWALL_MIRROR_UNPUBLISHED_GRACE_MS` (60 s).

## Código (`apps/ms-cameras/src/video-wall/targets/`)

| Pasta | Responsabilidade |
| --- | --- |
| `novastar-h9/` | codec de assinatura e cifra, catálogo e portão de capacidades, cliente da Open API, as três portas de equipamento (espelho, projeção, estado) e o `NovastarH9DisplayTarget` |
| `processor/` | cadastro e edição do processador |
| `mirror/` | espelho, telas publicadas, arranjo, codec enforcer, reaper, notificador e cache de ocupação |
| `projection/` | projeção nativa, árbitro de ocupação, geometria e grade de fontes |
| `state/` | brilho, estado observável e ocupação |
| `group/` | grupos salvos da parede |
| `browser-session/` | o alvo do mosaico no navegador |
| `playground/` | painel emulado em processo |

Todas as rotas exigem membership do sistema do header (`@RequireSystemDuty()` de classe); permissões
`cameras.videoWall:configure` e `cameras.videoWall:operate` (`libs/contracts/src/lib/permissions/catalog/cameras.ts`).

| Rota (`/api/vms/videowall`) | O que faz | Além da membership |
| --- | --- | --- |
| `POST /processors`, `PATCH /processors/:id` | cadastra e edita processador, vínculo de sistema e credencial | `configure` e duty `SYSTEM_ADMIN` |
| `GET /processors/current` | processador vinculado ao sistema do header | - |
| `GET /capabilities` | catálogo com procedência, sem o path da Open API | - |
| `GET /state`, `GET /occupancy` | estado observável com frescor por informação e ocupante vigente | - |
| `PATCH /brightness` | brilho do painel | `operate` e duty `SYSTEM_ADMIN` |
| `POST /mirror`, `DELETE /mirror` | toma e libera o espelho, com slot de destino opcional | `operate` |
| `PATCH /mirror/shares/:shareId`, `POST /mirror/publishing` | move ou tira uma tela; avisa que a captura entrou no ar | `operate` |
| `PUT /mirror/arrangement` | rearranja a parede num gesto | `configure` |
| `GET /groups`, `POST /groups`, `POST /groups/:groupId/apply`, `DELETE /groups/:groupId` | grupos salvos | `configure` para criar e apagar, `operate` para aplicar |

A projeção nativa não tem rota própria: é `POST /api/vms/scenes/:id/activate` e `/deactivate` com
`target: VIDEOWALL` ([[VMS - Arquitetura e estratégias]]). O plano de resposta chega pelo consumidor de
`attlas.execution-plans.videowall-command` (verbos `project-scene` e `release-panel`,
`apps/ms-cameras/src/events/consumers/execution-plans-videowall-command/`), com ator `PLAN_EXECUTION`, e o
eco sai em `attlas.cameras.videowall-command-executed` ou `attlas.cameras.videowall-command-rejected`
(`libs/contracts/src/lib/execution-plans/execution-plans-topics.constant.ts`).

### Persistência (`apps/ms-cameras/src/database/schema/`)

- `VideowallProcessor` (`videowall_processor/`): global, único por endereço e porta, credencial cifrada pelo
  `SecretCipherService` do `@attlas/core-common` (o `secretKey` entra cru na assinatura e o dano é o mural
  inteiro), `pId` mascarado na leitura (no modo sem cifra ele é o segredo). `systemId` nulável e único é o
  vínculo com o sistema. `panelWidth` e `panelHeight` nuláveis, lidos do equipamento; sem eles espelho e
  projeção são recusados (`VIDEOWALL_MIRROR_PANEL_GEOMETRY_UNKNOWN`, `VIDEOWALL_PROJECTION_PANEL_GEOMETRY_UNKNOWN`).
  `brightnessSetpoint`, `brightnessSetpointAt` e `brightnessSetpointBy` guardam o brilho do operador.
- `VideowallProjectionSource`: a fonte de uma câmera num processador, criada uma vez e reaproveitada.
- `VideowallSession` (`videowall_mirror/`): a ocupação do painel, uma por processador, tipo `MIRROR` ou
  `NATIVE_SCENE`, dono `OPERATOR`, `PLAN_EXECUTION` ou `SCHEDULE`, `systemId`, grade (`layout`, um valor de
  `EnumVideowallLayout`) e árvore de divisão (`arrangement`). O "preset" gravado é a grade do VMS, não o
  preset do equipamento.
- `VideowallMirrorShare`: cada tela publicada, com caminho de ingestão e retângulo próprios.
- `VideowallOccupancyClosure`: livro de encerramentos de ocupação.
- `VideowallGroup` e `VideowallGroupTile` (`videowall_group/`): só geometria e curadoria, nunca stream.

Sistema sem vínculo recebe 403 (`VIDEOWALL_MIRROR_SYSTEM_NOT_LINKED`, `VIDEOWALL_PROJECTION_SYSTEM_NOT_LINKED`)
quando existe processador, e 404 quando não existe nenhum.

### Capacidades e playground

`targets/novastar-h9/capabilities/novastar-capability-catalog.ts` tem 18 capacidades (`screen`, `main`,
`ipc` e `layer`), todas `CONFIRMED`: `CONFIRMED` quer dizer que a referência oficial da Open API documenta
pedido e resposta, e cada descritor leva a URL da página. `IPC_SLOT_LIST`, que a referência não detalha, foi
confirmada pela resposta do H9 de Quito. Não existe capacidade de preset nem de agenda. O
`NovastarCapabilityGate` recusa capacidade `PRESUMED` com 501 `VIDEOWALL_CAPABILITY_UNVERIFIED`, a menos que
`VIDEOWALL_PRESUMED_CAPABILITIES_ENABLED` (comissionamento) ou `VIDEOWALL_PLAYGROUND_ENABLED` estejam
ligadas; as duas vêm `false`. Com o playground ligado, as três portas trocam no boot por um painel emulado
(`targets/playground/videowall-equipment-port.provider.ts`), cada sistema com câmeras ganha um processador
automático (`videowall-playground-bootstrap.service.ts`) e `GET /capabilities` responde tudo como
`CONFIRMED`.

### Escrita no equipamento

- Escrita nunca é retentada (RNF-CAM-16): criar fonte e adicionar camada não são idempotentes. Há um lease
  de escrita por processador (`targets/novastar-h9/client/novastar-open-api.client.ts`), liberado no
  `finally`; divergência se resolve relendo. A posse do painel é a linha `VideowallSession`, não o lease.
- Codec da Open API: modo cifrado desligado por padrão (`VIDEOWALL_CODEC_CIPHER_ENABLED=false`); a chave DES
  chega explícita por `VIDEOWALL_CODEC_CIPHER_KEY` (16 hexadecimais), porque a derivação a partir do
  `secretKey` não está documentada.
- O cliente lê o `status` do envelope: o H9 recusa com HTTP 200 e `status` diferente de 0, que vira
  `VIDEOWALL_PROCESSOR_REJECTED` com o código do fabricante.
- Endereçamento: `deviceId`, `screenId` e slot da placa IP vêm de `VIDEOWALL_NOVASTAR_DEVICE_ID`,
  `VIDEOWALL_NOVASTAR_SCREEN_ID` e `VIDEOWALL_NOVASTAR_IPC_SLOT_ID`, ou são lidos do processador
  (`addressing/novastar-addressing.service.ts`).
- Fontes e camadas são achadas pelo nome, nunca por id guardado no banco: `attlas-mirror-<shareId>` no
  espelho e `attlas-cam-<fonte>` na projeção (`layers/novastar-layer-names.ts`). No espelho,
  `syncMirror` reconcilia todas as telas ativas a cada gesto, uma fonte e uma camada por tela, no
  retângulo dela no palco.
- A camada nasce já ligada à fonte IPC (`layer/create` com `sourceType 3`, `interfaceType 13`, `inputId 255`
  e o `streamId` do stream principal). Trocar de fonte apaga e recria a camada, porque `layer/writeSource`
  responde 0 sem ligar a fonte neste firmware.
- O endereço RTSP que vai ao equipamento é `MEDIAMTX_RTSP_URL`, que o `docker-compose.yml` lê de
  `VIDEOWALL_RTSP_BASE_URL`; no dev.v2, `rtsp://3.15.199.101:8554`.

### Brilho e ocupação em tempo real

- **Brilho** (INT-015) é controle global do painel: o setpoint do operador fica gravado por equipamento,
  separado da última leitura, e o `VideowallBrightnessReconciler` (`targets/state/services/`) o reafirma
  quando uma leitura diverge ou quando o painel é tomado ou recebe projeção (`VideowallWallOccupiedEvent`),
  com lease no Redis entre réplicas e sem retentativa. A leitura de estado sempre consulta o equipamento.
- **Ocupação**: todo gesto de espelho, aplicação de grupo, reaper e projeção empurra
  `videowall:occupancy:updated` (`IVideowallOccupancyFrame` com `revision`). O cache fica no Redis em
  `cameras:videowall:occupancy:<systemId>`, TTL de 15 s, com compare-and-set por `revision`. O
  `subscribe_videowall` do gateway de status (`/api/cameras/status/realtime`) responde
  `videowall:occupancy:snapshot` no join, então cliente com o canal de pé não chama `GET /occupancy`.

### Auditoria e aviso

Os cinco gestos de controle exclusivo do espelho emitem trilha (UC-066); cadastro, brilho, grupos e cenas
também (UC-069); cena projetada por plano não deixa linha. O único aviso do domínio é
`cameras.videowallMirror.takenOver`, um `DIRECTED_NOTICE` para o operador que perdeu o espelho numa tomada
administrativa.

## Frontend (`apps/web-attlas/src/app/modules/videowall/display-target/`)

- **Tela do painel**: aba "Videowall" do módulo Câmeras, `/cameras/videowall-panel`, módulo Angular próprio
  carregado sob demanda e rota irmã de `vms` (`pages/videowall-target/videowall-target.page.ts`). Palco da
  parede com as telas espelhadas e a cena projetada, escolha de grade, brilho, "Salvar grupo", "Retirar do
  painel", abas "Transmissões" (telas espelhadas e, em linhas só leitura, as câmeras da cena projetada) e
  "Grupos salvos", estado observável, cadastro e configuração do processador.
- **Lançador radial** (`components/vms-display-target-launcher/`, menu `ZardRadialMenu` de `libs/ui-shared`):
  montado no layout do sistema, flutua sobre qualquer tela menos a do painel e abaixo de 768 px some; itens
  Espelhar, Liberar (só com o painel ocupado), Brilho, Rotação, Configurar (navega para a tela) e Ocultar
  (também Alt+Shift+V). Espelhar, Brilho e Rotação abrem o `vms-display-target-dialog` nas views `MIRROR`,
  `BRIGHTNESS` e `STATE`.
- **Espelhar**: o dialog abre no estado atual do painel (posições do grupo em exibição ou o último layout),
  o layout pode ser trocado antes da captura e qualquer posição aceita clique. "Enviar ao painel" pede a
  captura da própria aba e, assim que o navegador libera, toma o painel e publica; não há etapa de revisão
  entre a liberação do navegador e o envio. Sem sessão, o layout escolhido é rascunho local gravado logo
  depois do envio. Num painel real, que não recebe layout, a escolha de divisão fica travada.
- **Rotação de grupos**: o botão "Rotação" do card "Projetar no painel" abre o dialog de rotação do VMS com
  os grupos salvos e a consola aplica um grupo por vez com a mesma escrita do Aplicar
  (`services/videowall-panel-rotation.service.ts`), com contador, pausar, retomar e parar. Para quando um
  plano ou uma programação assume o painel, na troca de sistema, depois de três recusas seguidas, em
  "Retirar do painel" e na troca de layout.
- **Grade do palco**: a parede grava retângulos numa grade fixa de 16 trilhas (`STAGE_GRID_RESOLUTION`); a
  tabela de telas mostra posição e tamanho nas células do preset em vigor (`stageRectInLayoutCells`), e em
  `CUSTOM` diz "de 16". A grade de projeção monta trilhas só nas fronteiras que as células declaram
  (`buildSceneGrid`).
- **Formulários**: IPv4 e faixa de porta validados por campo; nome de processador e de grupo até 120
  caracteres; recusa do serviço lida por `errors[].field` e `errors[].context.constraint`, sem frase do
  class-validator na tela; nome de grupo repetido só por capitalização é recusado na tela, mas o banco
  compara `(systemId, name)` byte a byte.
- Nenhuma tela desenha mural presumido: sem processador cadastrado não há grade.

## O equipamento

![[videowall-h9-quito.png]]

| Dado | Valor |
| --- | --- |
| Modelo | H9 Video Wall Splicer (NovaStar Série H), pelo rótulo do chassi |
| Firmware | V1.9.7.1, lido do equipamento |
| Controlador | `10.200.0.51`, Open API na porta `8000`, interface web na `80` |
| Tela | screen 0, 4992x2808, na posição (2290, 1075) do canvas |
| Placa de vídeo IP | slot 6, `H_2xRJ45 IP`: porta 0 em `10.200.4.202/24` (rede das câmeras de Quito), porta 1 em `10.200.0.53/24` |
| Patrimônio | `N10P 45815` / código `00048815` |
| Acta de entrega | EPMMOP Quito, `VD-12407-80-10`, 2024-07-09, "PROCESADOR DE VIDEO WALL H9", fornecedor SMARTCOGROUP CIA LTDA |

**Open API** (<https://openapi.novastar.tech/en/h/>): HTTP POST com JSON em `http://{ip}:8000/open/api/<modulo>/<acao>`,
envelope `{body, sign, pId, timeStamp}` com o `body` como objeto e o `timeStamp` em milissegundos como string.
O OpenAPI Management do processador emite `pId` e `secretKey` por requisitante; sem cifra,
`sign = Base64(md5hex(timeStamp + pId))`, conferida contra o exemplo oficial; com cifra,
`sign = Base64(md5hex(corpoCifrado + timeStamp + pId + secretKey))` e o corpo vai em DES (ECB/PKCS5). O login
da interface web não serve como credencial da Open API. No espelho há uma fonte `ipc` por tela publicada (a
Open API não tem fonte de rede que não seja IPC); na projeção, uma por câmera. `preset/*` e `schedule` ficam
fora do catálogo.

## Lacunas e armadilhas

- **O vídeo ainda não chega ao painel de Quito**: comando, fonte e camada funcionam no H9 real, mas a placa
  IP nunca abriu a conexão RTSP até o MediaMTX. Diagnóstico, rede e próximos passos em
  [[Videowall H9 - vídeo não chega ao painel]].
- **Brilho e regra de stream não funcionam no firmware 1.9.7.1**: `screen/writeBrightness` e
  `layer/writeStreamRule` respondem 500, assim como `device/readDetail` e `device/readIp`. No H9 de Quito, o
  `PATCH /brightness` falha.
- **Ativação repetida com o H9 fora esconde o timeout**: duas ativações seguidas da mesma cena respondem
  `RECORD_NOT_FOUND` (404) em vez de `VIDEOWALL_PROCESSOR_TIMEOUT` (408), porque o desfazer da segunda não
  acha o registro que a primeira já apagou.
- **Testes desalinhados do adaptador**: só os de protocolo (assinatura, envelope, cliente e catálogo)
  descrevem o adaptador atual; os unitários das portas e dos handlers do videowall e as suítes de
  integração ainda descrevem o antigo.
- `VideowallMirrorShare.layerId` e `setShareLayerId` existem sem chamador: a camada é achada pelo nome.
- **O formulário do processador derruba o cadastro**: salvar com o IP da placa (`10.200.0.53`) ou com o
  login da interface web no lugar do `pId` deixa o processador inalcançável.
- **Exibição programada não tem produtor**: o árbitro cede a ator `SCHEDULE`
  (`targets/projection/services/videowall-occupancy.arbiter.ts`), mas o código só cria `OPERATOR` e
  `PLAN_EXECUTION`. Brilho programado também não existe.
- **Quem é deslocado por plano não é avisado**: a projeção grava `takenFromId`/`takenFromName` e conta
  `taken_over` em `ms_cameras_videowall_occupancy_total`, sem aviso, e encerramento de projeção nativa não
  entra no `VideowallOccupancyClosure` (só o repositório do espelho escreve nele).
- **Sem redundância de entrada**: o equipamento não aceita backup para fonte IPC nem NDI; queda do espelho é
  falha visível e aparece como tal no estado observável.

> [!warning] Colisão do ID `INT-018` no repositório
> `INT-014-videowall-layers-and-presets`, o `apps/ms-cameras/docs/SPEC.md` e a `MOD-016` apontam a `INT-018`
> como substituta das janelas, mas a `INT-018` do videowall nunca virou arquivo; o arquivo com esse ID é
> `INT-018-hikvision-isapi-provisioning`. Quem substitui a `INT-014` é a `UC-051`, com a geometria em
> `targets/projection/services/videowall-projection-geometry.ts`.
