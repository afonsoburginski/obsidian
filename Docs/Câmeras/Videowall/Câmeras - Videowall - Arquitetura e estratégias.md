---
tags:
  - doc
  - cameras
  - videowall
  - novastar
  - quito
aliases:
  - "Câmeras - Videowall - Arquitetura e estratégias"
  - "Pesquisa - transporte do espelhamento de tela"
  - "Transporte do espelhamento de tela"
  - "Videowall - Arquitetura e estratégias"
atualizado: 2026-10-07
banner: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200"
---

# Câmeras - Videowall - Arquitetura e estratégias

Volta para [[Câmeras - Videowall]].

## Resumo

| Modo | Quando | Fonte que o equipamento puxa |
| --- | --- | --- |
| Espelho (`MIRROR`) | Operador na consola | A captura da aba do Attlas, publicada por WHIP no MediaMTX e lida por RTSP na porta 8554 em `videowall-mirror-*` |
| Projeção nativa (`NATIVE_SCENE`) | Cena salva enviada pelo operador, plano de resposta sem operador ou grupo salvo com câmeras | Uma fonte por câmera da cena, path `videowall-projection-*` no MediaMTX, puxado sob demanda da câmera |

O equipamento nunca recebe URL nem credencial de câmera: recebe `rtsp://<servidor de mídia>/<caminho>`, e a
URL da câmera fica só na configuração do path no MediaMTX. O painel tem um ocupante por vez, e o árbitro de
ocupação decide quem desloca quem. O passo a passo está em [[Câmeras - Videowall - Fluxos]]; os requisitos e
o texto do contrato, em [[Câmeras - Videowall - Requisitos e SLA]]; o sistema do qual o painel é saída, em
[[Câmeras - VMS - Arquitetura e estratégias]].

## Onde está no código

| Caminho | Papel |
| --- | --- |
| `apps/ms-cameras/src/video-wall/targets/novastar-h9/` | Codec de assinatura e cifra, catálogo e portão de capacidades, cliente da Open API, endereçamento, fontes IPC, camadas, as três portas de equipamento (espelho, projeção, estado) e o `NovastarH9DisplayTarget` |
| `apps/ms-cameras/src/video-wall/targets/processor/` | Cadastro e edição do processador |
| `apps/ms-cameras/src/video-wall/targets/mirror/` | Espelho: telas publicadas, arranjo, codec enforcer, reaper, notificador e cache de ocupação |
| `apps/ms-cameras/src/video-wall/targets/projection/` | Projeção nativa: árbitro de ocupação, portão de formato, geometria e grade de fontes |
| `apps/ms-cameras/src/video-wall/targets/state/` | Brilho, estado observável e ocupação |
| `apps/ms-cameras/src/video-wall/targets/group/` | Grupos salvos da parede |
| `apps/ms-cameras/src/video-wall/targets/browser-session/` | O alvo do mosaico no navegador ([[Câmeras - VMS]]) |
| `apps/ms-cameras/src/video-wall/targets/playground/` | Painel emulado no processo |
| `apps/ms-cameras/src/events/consumers/execution-plans-videowall-command/` | Consumidor do comando de plano de resposta e eco do desfecho |
| `apps/ms-cameras/src/database/schema/videowall_processor/`, `videowall_mirror/` e `videowall_group/` | Modelos do painel |
| `libs/contracts/src/lib/videowall/` | Requisições, respostas, enums e eventos ao vivo do painel |
| `libs/contracts/src/lib/permissions/catalog/cameras.ts` | `cameras.videoWall:configure` e `cameras.videoWall:operate` |
| `apps/web-attlas/src/app/modules/videowall/display-target/` | Tela do painel, dialogs, serviços e stores do front |
| `apps/web-attlas/src/app/modules/videowall/display-target/pages/videowall-target/videowall-target.page.ts` | A tela `/cameras/videowall-panel` |
| `apps/web-attlas/src/app/modules/videowall/display-target/services/videowall-launcher-branch.adapter.ts` | O ramo "Videowall" do lançador radial |
| `apps/web-attlas/src/app/core/shared/components/system-launcher/` | O lançador radial do layout do sistema |
| `apps/web-attlas/src/app/modules/videowall/display-target/services/videowall-panel-rotation.service.ts` | Rotação de grupos na consola |
| `apps/web-attlas/src/app/modules/videowall/display-target/utils/publish-mirror-whip.util.ts` | Publicação WHIP da captura da aba |

## Contratos

### Rotas

Todas sob `/api/vms/videowall`, com filiação ao sistema do header conferida por `@RequireSystemDuty()` de
classe.

| Rota | O que faz | Além da filiação |
| --- | --- | --- |
| `POST /processors` e `PATCH /processors/:id` | Cadastra e edita processador, vínculo de sistema e credencial | `configure` e duty `SYSTEM_ADMIN` |
| `GET /processors/current` | Processador vinculado ao sistema do header | Nenhum |
| `GET /capabilities` | Catálogo com procedência, sem o path da Open API | Nenhum |
| `GET /state` | Estado observável com o frescor de cada informação | Nenhum |
| `GET /occupancy` | Ocupante vigente | Nenhum |
| `PATCH /brightness` | Brilho do painel | `operate` e duty `SYSTEM_ADMIN` |
| `POST /mirror` e `DELETE /mirror` | Toma e libera o espelho, com slot de destino opcional | `operate` |
| `PATCH /mirror/shares/:shareId` | Move ou tira uma tela | `operate` |
| `POST /mirror/publishing` | Avisa que a captura entrou no ar | `operate` |
| `PUT /mirror/arrangement` | Rearranja a parede num gesto | `configure` |
| `GET /groups` | Lista os grupos salvos | Nenhum |
| `POST /groups` e `DELETE /groups/:groupId` | Cria e apaga grupo | `configure` |
| `POST /groups/:groupId/apply` | Aplica grupo como projeção nativa | `operate` |

A projeção nativa não tem rota própria: é `POST /api/vms/scenes/:id/activate` e `/deactivate` com
`target: VIDEOWALL` ([[Câmeras - VMS - Arquitetura e estratégias]]). Sistema sem vínculo recebe 403
(`VIDEOWALL_MIRROR_SYSTEM_NOT_LINKED`, `VIDEOWALL_PROJECTION_SYSTEM_NOT_LINKED`) quando existe processador, e
404 quando não existe nenhum.

### Tópicos Kafka

Constantes em `libs/contracts/src/lib/execution-plans/execution-plans-topics.constant.ts`.

| Tópico | Produtor | Consumidor | Conteúdo |
| --- | --- | --- | --- |
| `attlas.execution-plans.videowall-command` | `ms-execution-plans` | `ms-cameras` | Comando com `commandId`, verbo `project-scene` (com `sceneId`) ou `release-panel` e escopo de sistema |
| `attlas.cameras.videowall-command-executed` | `ms-cameras` | `ms-execution-plans` | Eco de comando executado |
| `attlas.cameras.videowall-command-rejected` | `ms-cameras` | `ms-execution-plans` | Eco de comando recusado, com `errorCode` |

O consumidor atua com ator `PLAN_EXECUTION`. O `eventId` do eco é um UUID v5 sobre
`(commandId:executed|rejected)`, então a reentrega do mesmo comando produz o mesmo eco.

### Canal ao vivo

A sala `videowall:<systemId>` do gateway `cameras-status` (`/api/cameras/status/realtime`,
[[Câmeras - Saúde e monitoramento - Arquitetura e estratégias]]) exige filiação ao sistema.

| Evento | Quando | Conteúdo |
| --- | --- | --- |
| `videowall:occupancy:snapshot` | No `subscribe_videowall`, só ao socket que assinou | Ocupação atual (`IVideowallOccupancyFrame`) |
| `videowall:occupancy:updated` | Todo gesto de espelho, aplicação de grupo, expiração pelo reaper e projeção | Ocupação nova, com `revision` |
| `videowall:brightness:changed` | Brilho alterado | Quadro do brilho |

Cliente com o canal de pé não chama `GET /occupancy`.

### Tabelas do banco

| Modelo | Pasta do schema | Conteúdo |
| --- | --- | --- |
| `VideowallProcessor` | `videowall_processor/` | Global, único por endereço e porta. Credencial cifrada pelo `SecretCipherService` do `@attlas/core-common`; `pId` mascarado na leitura. `systemId` nulável e único é o vínculo com o sistema. `panelWidth` e `panelHeight` lidos do equipamento. Última leitura de firmware, brilho e faixa, geometria e alcance, cada uma com seu instante. `brightnessSetpoint`, `brightnessSetpointAt` e `brightnessSetpointBy` guardam o brilho do operador |
| `VideowallProjectionSource` | `videowall_processor/` | Fonte de uma câmera num processador, criada uma vez e reaproveitada |
| `VideowallSession` | `videowall_mirror/` | A ocupação do painel, uma por processador: tipo `MIRROR` ou `NATIVE_SCENE`, dono `OPERATOR`, `PLAN_EXECUTION` ou `SCHEDULE`, `systemId`, cena, grade (`layout`, um valor de `EnumVideowallLayout`) e árvore de divisão (`arrangement`) |
| `VideowallMirrorShare` | `videowall_mirror/` | Cada tela publicada, com caminho de ingestão e retângulo próprios |
| `VideowallOccupancyClosure` | `videowall_mirror/` | Livro de encerramentos de ocupação |
| `VideowallGroup` e `VideowallGroupTile` | `videowall_group/` | Só geometria e curadoria, nunca stream |

O "preset" gravado na sessão é a grade do VMS, não o preset do equipamento.

### Chaves Redis

| Chave | Conteúdo | TTL |
| --- | --- | --- |
| `cameras:videowall:occupancy:<systemId>` | Cache da ocupação, com compare-and-set por `revision` | 15 s |
| `videowall:processor:write-lock:<processador>` | Lease de escrita no equipamento | Prazo da Open API mais 5 s |
| `cameras:cron:videowall-mirror-reaper` | Réplica que roda o reaper | `VIDEOWALL_MIRROR_REAPER_LEASE_TTL_SECONDS` |
| `cameras:videowall:brightness-reconcile:<processador>` | Réplica que reafirma o brilho | 10 s |

### Open API do H9

Referência: <https://openapi.novastar.tech/en/h/>. HTTP POST com JSON em
`http://{ip}:8000/open/api/<modulo>/<acao>`, envelope `{body, sign, pId, timeStamp}` com o `body` como objeto e
o `timeStamp` em milissegundos como string. O OpenAPI Management do processador emite `pId` e `secretKey` por
requisitante, e o login da interface web não serve como credencial da Open API.

| Modo | Assinatura | Corpo |
| --- | --- | --- |
| Sem cifra (padrão) | `sign = Base64(md5hex(timeStamp + pId))`, conferida contra o exemplo oficial | Objeto JSON |
| Com cifra | `sign = Base64(md5hex(corpoCifrado + timeStamp + pId + secretKey))` | DES em ECB com PKCS5 |

O H9 recusa com HTTP 200 e `status` diferente de 0; o cliente lê o `status` do envelope e transforma a recusa
em `VIDEOWALL_PROCESSOR_REJECTED`, com o código do fabricante.

O catálogo (`apps/ms-cameras/src/video-wall/targets/novastar-h9/capabilities/novastar-capability-catalog.ts`)
é o único lugar onde mora um path da Open API. Tem 17 capacidades, todas `CONFIRMED`:

| Módulo | Capacidades |
| --- | --- |
| `screen` | `writeShowId`, `writeBrightness`, `readList`, `readDetail` |
| `main` | `initStatus` |
| `ipc` | `IPCSourceCreate`, `IPCChannelEdit`, `IPCSourceDelete`, `IPCSourceList`, `IPCChannelList`, `IPCSlotList` |
| `layer` | `create`, `delete`, `detailList`, `writeWindow`, `writeSource`, `writeStreamRule` |

`CONFIRMED` quer dizer que a referência oficial documenta pedido e resposta, e cada descritor leva a URL da
página. `IPCSlotList`, que a referência não detalha, foi confirmada pela resposta do H9 de Quito. Não existe
capacidade de preset nem de agenda: `preset/*` e `schedule` ficam fora do catálogo. No espelho há uma fonte
`ipc` por tela publicada, porque a Open API não tem fonte de rede que não seja IPC; na projeção, uma por
câmera.

## Por que é assim

### Por que mora no `ms-cameras`, dentro do VMS

- O caminho de mídia do painel é o mesmo MediaMTX, o mesmo cliente de control API e o mesmo resolver de fonte
  do streaming. A grade de projeção (`videowall-projection-source-grid.service.ts`) usa o mesmo
  `MediamtxPathConfigService` dos tiers de câmera, com `sourceOnDemand: true`. Num serviço separado, cada
  tomada de espelho seria chamada entre serviços.
- Tudo que o painel mostra nasce do VMS: no espelho, a superfície que o operador vê; na projeção, uma cena
  salva do mosaico. Não existe segundo modelo de cena do lado do equipamento: a geometria da parede deriva da
  cena, e composição feita à mão na interface do equipamento não é objeto da plataforma. O espelhamento é de
  mão única.
- Consequência de superfície: tudo fica sob `/api/vms`, e o equipamento sob `/api/vms/videowall/*`.

### Transporte do espelho: RTSP servido pela plataforma

O H9 não aceita página web nem URL como fonte: a interface web dele é plano de controle, nenhum card de
entrada renderiza HTML e nenhuma capacidade da Open API recebe endereço de página. A tela só chega à parede
como vídeo codificado. Os três caminhos avaliados:

| Critério | RTSP pela plataforma (card `H_2xRJ45 IP`) | NDI (card `H_1xNDI`) | Cabo HDMI ou DP |
| --- | --- | --- | --- |
| Banda por espelho 1080p | 4 a 12 Mbps | Cerca de 125 Mbps (Full NDI) | Não usa rede |
| Teto de decodificação do card | 16 de 2Kx1K ou 4 de 4Kx2K | 4 de 2Kx1K ou 1 de 4Kx2K | Não se aplica |
| Croma | 8 bits subamostrado | 4:2:2 | Idêntico ao monitor |
| Atravessa sub-rede | Sim | Não, sem servidor de descoberta | Não se aplica |
| Espelha de qualquer cliente | Sim | Não | Só daquela máquina |
| A plataforma observa e derruba | Sim | Não | Não |

O RTSP é o único que entrega a tela de qualquer cliente autenticado sem máquina específica, reusa o MediaMTX e
mantém o espelho observável. O NDI esbarra no card, que entrou na linha H9 na revisão V1.14.0 da especificação
(14/09/2024), depois da entrega do equipamento de Quito (09/07/2024), e no mDNS, que exige o intermediário que
o RNF-CAM-14 veta. O cabo fica como caminho de comissionamento, para provar a parede antes de qualquer
software. O custo aceito é texto fino com croma subamostrado e cerca de 1 s de latência, daí o piso de
resolução do RNF-CAM-18.

Duas regras saem desse desenho:

1. **H.264 fixado na ingestão; publicação fora disso é recusada, nunca transcodificada.** O
   `VideowallMirrorCodecEnforcerService` (`targets/mirror/services/`) lê `/v3/paths/list` a cada 5 s e
   derruba o publicador de `videowall-mirror-*` com codec diferente de H.264, porque o MediaMTX não tem
   allowlist de codec por path e a imagem `FROM scratch` não roda `runOnReady`.
2. **A vida da sessão é presença de publicação, nunca contagem de espectadores.** O equipamento puxando RTSP
   não se anuncia como espectador. O `VideowallMirrorReaperService` (`targets/mirror/workers/`, a cada 15 s,
   com lease fixa e fail-closed) expira a ocupação de espelho sem publicação por
   `VIDEOWALL_MIRROR_UNPUBLISHED_GRACE_MS`.

### Árbitro de ocupação

`VideowallOccupancyArbiter` (`targets/projection/services/videowall-occupancy.arbiter.ts`) decide sem I/O:

| Quem pede | Painel livre ou do mesmo ocupante | Painel com operador | Painel com projeção de plano |
| --- | --- | --- | --- |
| Plano de resposta (`PLAN_EXECUTION`) | Segue | Desloca | Desloca |
| Programação (`SCHEDULE`) | Segue | Cede | Cede |
| Operador sem `takeover` | Segue | Recusa, dizendo quem detém e desde quando | Recusa (`VIDEOWALL_PROJECTION_HELD_BY_PLAN`) |
| Operador com `takeover` | Segue | Desloca, se tiver duty administrativo | Desloca, só com a confirmação |

O mesmo ator pedindo de novo (recarregar a consola, reativar a mesma cena) não é deslocamento. Deslocar a
projeção de um plano pede só a confirmação, sem duty administrativo, para a sala não ficar presa depois do
incidente; deslocar uma pessoa pede o duty administrativo.

### Escrita no equipamento

- Escrita nunca é retentada: criar fonte e adicionar camada não são idempotentes. Há um lease de escrita por
  processador (`targets/novastar-h9/client/novastar-open-api.client.ts`), liberado no `finally`; divergência se
  resolve relendo. A posse do painel é a linha `VideowallSession`, não o lease.
- A cifra fica desligada por padrão (`VIDEOWALL_CODEC_CIPHER_ENABLED=false`); a chave DES chega explícita por
  `VIDEOWALL_CODEC_CIPHER_KEY` (16 hexadecimais), porque a derivação a partir do `secretKey` não está
  documentada.
- Endereçamento: `deviceId`, `screenId` e slot da placa IP vêm de `VIDEOWALL_NOVASTAR_DEVICE_ID`,
  `VIDEOWALL_NOVASTAR_SCREEN_ID` e `VIDEOWALL_NOVASTAR_IPC_SLOT_ID`, ou são lidos do processador
  (`addressing/novastar-addressing.service.ts`).
- Fontes e camadas são achadas pelo nome, nunca por id guardado no banco: `attlas-mirror-<shareId>` no espelho
  e `attlas-cam-<fonte>` na projeção (`layers/novastar-layer-names.ts`). No espelho, `syncMirror` reconcilia
  todas as telas ativas a cada gesto, uma fonte e uma camada por tela, no retângulo dela no palco.
- A camada nasce já ligada à fonte IPC: `layer/create` com `sourceType 3`, `interfaceType 13`, `inputId 255` e
  o `streamId` do stream principal (`novastar-protocol.constants.ts`). Trocar de fonte apaga e recria a camada,
  porque `layer/writeSource` responde 0 sem ligar a fonte neste firmware.
- Fonte cujo endereço mudou (servidor de mídia trocado, `MEDIAMTX_RTSP_URL` alterada) é substituída.
- O endereço RTSP que vai ao equipamento é `MEDIAMTX_RTSP_URL`, que o `docker-compose.yml` lê de
  `VIDEOWALL_RTSP_BASE_URL` (padrão `rtsp://mediamtx:8554`).
- A projeção serve o tier `VIDEOWALL_PROJECTION_STREAM_TYPE` (padrão `PRIMARY`) e recusa câmera abaixo de 480
  linhas quando a resolução é conhecida.

### Brilho, ocupação e estado observável

- **Brilho** é controle global do painel. O setpoint do operador fica gravado por equipamento, separado da
  última leitura, e o `VideowallBrightnessReconciler` (`targets/state/services/`) o reafirma quando uma leitura
  diverge ou quando o painel é tomado ou recebe projeção (`VideowallWallOccupiedEvent`), com lease no Redis
  entre réplicas e sem retentativa.
- **Ocupação**: todo gesto de espelho, aplicação de grupo, expiração pelo reaper e projeção empurra
  `videowall:occupancy:updated` e atualiza o cache Redis com compare-and-set por `revision`.
- **Estado observável** (`targets/state/services/videowall-state-reader.service.ts`): a leitura sempre
  consulta o equipamento e grava o que voltou, com o instante de cada informação. Uma leitura por processador
  por vez: quem chega com uma leitura em andamento recebe a mesma resposta. Falha do equipamento
  (indisponível, timeout, recusa ou recusa em HTTP 200) não é erro da requisição: a resposta diz "não lido",
  nada é gravado e o frescor da última leitura válida se preserva. Capacidade não verificada dá "não
  tentado". Erro do próprio serviço, como falha do Prisma, propaga. A mesma leitura de `screen.readList`
  descobre a geometria do painel.

### Capacidades e playground

O `NovastarCapabilityGate` recusa capacidade `PRESUMED` com 501 `VIDEOWALL_CAPABILITY_UNVERIFIED`, a menos que
`VIDEOWALL_PRESUMED_CAPABILITIES_ENABLED` (comissionamento) ou `VIDEOWALL_PLAYGROUND_ENABLED` estejam ligadas;
as duas vêm `false`. Com o playground ligado, as três portas trocam no boot por um painel emulado
(`targets/playground/videowall-equipment-port.provider.ts`), cada sistema com câmeras ganha um processador
automático (`videowall-playground-bootstrap.service.ts`) e `GET /capabilities` responde tudo como
`CONFIRMED`.

### Auditoria e aviso

Os cinco gestos de controle exclusivo do espelho emitem trilha; cadastro, brilho, grupos e cenas também.
Cena projetada por plano não deixa linha. O único aviso do domínio é `cameras.videowallMirror.takenOver`, um
`DIRECTED_NOTICE` para o operador que perdeu o espelho numa tomada administrativa.

### Frontend

- **Tela do painel.** Aba "Videowall" do módulo Câmeras, `/cameras/videowall-panel`, módulo Angular próprio
  carregado sob demanda e rota irmã de `vms`. Tem o palco da parede com as telas espelhadas e a cena
  projetada, escolha de grade, brilho, "Salvar grupo", "Retirar do painel", as abas "Transmissões" (telas
  espelhadas e, em linhas só leitura, as câmeras da cena projetada) e "Grupos salvos", o estado observável e o
  cadastro e a configuração do processador.
- **Palco com painel real.** O palco toca o vídeo das telas espelhadas só no playground. Com painel real, o
  endereço do caminho do espelho não sai do backend e a Open API não devolve imagem do painel, então o palco
  mostra os retângulos das telas sem vídeo. A cena projetada aparece desenhada pela plataforma, câmera por
  célula.
- **Lançador radial.** O `app-system-launcher` (`z-radial-menu`) fica no layout do sistema, arrastável, e tem o
  ramo "Videowall" registrado por `VideowallLauncherBranchAdapter`. Os itens são Espelhar (desabilitado sem
  processador), Liberar (só com o painel ocupado; libera a cena projetada pela rota de cena ou o espelho pela
  rota de espelho), Brilho, Rotação e Configurar (navega para a tela do painel e some quando o operador já está
  nela). Ocultar some e volta com Alt+Shift+V. O lançador não existe abaixo de 768 px de largura nem em
  paisagem com até 500 px de altura. Um ponto de alerta no botão indica espelho em andamento. Espelhar, Brilho e
  Rotação abrem o `vms-display-target-dialog` nas views `MIRROR`, `BRIGHTNESS` e `STATE`.
- **Espelhar.** O dialog abre no estado atual do painel (posições do grupo em exibição ou o último layout); o
  layout pode ser trocado antes da captura e qualquer posição aceita clique. "Enviar ao painel" pede a captura
  da própria aba e, assim que o navegador libera, toma o painel e publica, sem etapa de revisão entre a
  liberação e o envio. Sem sessão, o layout escolhido é rascunho local gravado logo depois do envio. Num painel
  real, que não recebe layout, a escolha de divisão fica travada. O endereço de publicação e a conexão nunca
  ficam em signal, template ou atributo do DOM.
- **Rotação de grupos.** O botão "Rotação" do card "Projetar no painel" abre o dialog de rotação do VMS com os
  grupos salvos, e a consola aplica um grupo por vez com a mesma escrita do Aplicar, com contador, pausar,
  retomar e parar. A rotação para quando um plano ou uma programação assume o painel, na troca de sistema,
  depois de três recusas seguidas, em "Retirar do painel" e na troca de layout.
- **Grade do palco.** A parede grava retângulos numa grade fixa de 16 trilhas (`STAGE_GRID_RESOLUTION`); a
  tabela de telas mostra posição e tamanho nas células do preset em vigor (`stageRectInLayoutCells`) e, em
  `CUSTOM`, diz "de 16". A grade de projeção monta trilhas só nas fronteiras que as células declaram
  (`buildSceneGrid`).
- **Formulários.** IPv4 e faixa de porta validados por campo; nome de processador e de grupo até 120
  caracteres; recusa do serviço lida por `errors[].field` e `errors[].context.constraint`, sem frase do
  class-validator na tela. Nome de grupo repetido só por capitalização é recusado na tela, mas o banco compara
  `(systemId, name)` byte a byte.
- Nenhuma tela desenha mural presumido: sem processador cadastrado não há grade.

### O equipamento de Quito

![[Câmeras - Videowall - Painel H9 de Quito.png]]

| Dado | Valor |
| --- | --- |
| Modelo | H9 Video Wall Splicer (NovaStar Série H), pelo rótulo do chassi |
| Firmware | V1.9.7.1, lido do equipamento |
| Controlador | `10.200.0.51`, Open API na porta `8000`, interface web na `80` |
| Credencial da Open API | `pId` `YzFk`, criada em Settings, OpenAPI Management, sem cifra |
| Login da interface web | Usuário `attlas`; não serve como credencial da Open API |
| Tela | screen 0, 4992x2808, na posição (2290, 1075) do canvas do processador |
| Placa de vídeo IP | Slot 6, `H_2xRJ45 IP` |
| Patrimônio | `N10P 45815`, código `00048815` |
| Acta de entrega | EPMMOP Quito, `VD-12407-80-10`, 2024-07-09, "PROCESADOR DE VIDEO WALL H9", fornecedor SMARTCOGROUP CIA LTDA |
| Cadastro no Attlas | Sistema DMQ, processador `10.200.0.51:8000` com o `pId` acima |

| Porta da placa IP | IP | Gateway | Uso |
| --- | --- | --- | --- |
| 0 | `10.200.4.202/24` | `10.200.4.1` | Rede das câmeras de Quito (as 20 fontes Est1 a Est9 e Admin) |
| 1 | `10.200.0.53/24` | `10.200.0.1` | Rede do H9 |

A saída padrão da placa (`wanId`) está em 255, sem porta escolhida. Gravar gateway vazio na porta 0 ou
`wanId = 1` pela API web é aceito com `status 0`, mas a placa mantém a configuração anterior.

| Operação no H9 real | Resultado |
| --- | --- |
| Criar, listar, ler o canal e apagar fonte IPC (`ipc/IPCSourceCreate`, `IPCSourceList`, `IPCChannelList`, `IPCSourceDelete`) | Funciona |
| `layer/create` com a fonte IPC (`sourceType 3`, `slotId 6`, `interfaceType 13`, `inputId 255`, `streamId` do principal) | Funciona |
| Mover (`layer/writeWindow`) e apagar (`layer/delete`) camada | Funciona |
| `layer/writeSource` | Responde 0 e não liga a fonte |
| `layer/writeStreamRule`, `screen/writeBrightness`, `device/readDetail` e `device/readIp` | Respondem 500 neste firmware |

### Rede até o H9

O `ms-cameras` do dev.v2 fala com o H9 por um túnel WireGuard até a rede de Quito.

| Ponta | IP no túnel | `AllowedIPs` no concentrador |
| --- | --- | --- |
| Concentrador | `18.216.165.106:51820`, chave pública `/HHq9akJprOvstVC2XTH+0D/YEMeL9Lj3VNRhY6F8kc=` | Não se aplica |
| Servidor do Attlas (dev.v2) | `192.168.10.16` | `192.168.10.16/32` |
| PC do Afonso | `192.168.10.29`, chave pública `2QYdpY7H3EiHpF/zwo3j8OYvXVSKG06kYbaAteza3Uc=`, configuração em `~/.config/wireguard/wg-quito.conf` | `192.168.10.29/32` |
| Quito | `192.168.10.10`; roteador MikroTik em `10.200.0.1` | `192.168.10.10/32, 10.200.0.0/24, 192.168.8.0/24` |

| Configuração do dev.v2 | Valor |
| --- | --- |
| `VIDEOWALL_RTSP_BASE_URL` em `/home/ubuntu/.env` | `rtsp://3.15.199.101:8554`, o IP público do dev.v2 |
| Porta `8554` | Aberta no Security Group da AWS; responde de fora com o vídeo H.264 |
| MediaMTX | Entrega RTSP só por TCP |
| Playground | Desligado |
| `VIDEOWALL_NOVASTAR_IPC_SLOT_ID` e `VIDEOWALL_NOVASTAR_SCREEN_ID` | `6` e `0` |

Ambientes e acessos em geral: [[Infraestrutura - Ambientes]].

## Armadilhas conhecidas

- **O vídeo ainda não chega ao painel de Quito.** Comando, fonte e camada funcionam no H9 real, mas a placa IP
  não abre a conexão RTSP até o MediaMTX. Diagnóstico e próximos passos em
  [[Câmeras - Videowall - Explicação - Vídeo não chega ao painel H9]].
- **No WireGuard, cada faixa de `AllowedIPs` vale para um peer só.** Colocar `10.200.0.0/24` também no peer
  do Attlas faz o concentrador devolver ao dev.v2 o tráfego destinado a Quito, e os pings para `10.200.0.51`
  voltam do próprio dev.v2 em menos de 1 ms. A faixa fica só no peer de Quito.
- **Brilho e regra de stream não funcionam no firmware 1.9.7.1.** `screen/writeBrightness` e
  `layer/writeStreamRule` respondem 500; no H9 de Quito, o `PATCH /brightness` falha e o brilho só funciona no
  painel emulado.
- **O formulário do processador derruba o cadastro.** Salvar com o IP da placa (`10.200.0.53`) ou com o login
  da interface web no lugar do `pId` deixa o processador inalcançável.
- **Ativação repetida com o H9 fora esconde o timeout.** Duas ativações seguidas da mesma cena respondem
  `RECORD_NOT_FOUND` (404) em vez de `VIDEOWALL_PROCESSOR_TIMEOUT` (408), porque o desfazer da segunda não acha
  o registro que a primeira já apagou.
- **Testes desalinhados do adaptador.** Só os testes de protocolo (assinatura, envelope, cliente e catálogo)
  descrevem o adaptador atual; os unitários das portas e dos handlers do videowall e as suítes de integração
  ainda descrevem o adaptador antigo.
- **Código sem chamador.** `VideowallMirrorShare.layerId` e `setShareLayerId` existem, mas a camada é achada
  pelo nome.
- **Exibição programada não tem produtor.** O árbitro cede ao ator `SCHEDULE`, mas o código só cria
  `OPERATOR` e `PLAN_EXECUTION`. Brilho programado também não existe.
- **Quem é deslocado por plano não é avisado.** A projeção grava `takenFromId` e `takenFromName` e conta
  `taken_over` em `ms_cameras_videowall_occupancy_total`, sem aviso; e o encerramento de projeção nativa não
  entra no `VideowallOccupancyClosure`, que só o repositório do espelho escreve.
- **Sem redundância de entrada.** O equipamento não aceita fonte reserva para IPC nem NDI; queda do espelho é
  falha visível e aparece como tal no estado observável.

> [!warning] Identificador de spec repetido no repositório
> Três documentos apontam uma atômica de janelas que nunca virou arquivo, com um ID que hoje pertence a outra
> spec. Quem substitui a spec de janelas é a de projeção nativa, com a geometria em
> `apps/ms-cameras/src/video-wall/targets/projection/services/videowall-projection-geometry.ts`.
>
> | Documento | Aponta | Arquivo real com esse ID |
> | --- | --- | --- |
> | `INT-014-videowall-layers-and-presets`, `apps/ms-cameras/docs/SPEC.md` e `MOD-016` | `INT-018` como substituta das janelas | `INT-018-hikvision-isapi-provisioning` |
> | Substituta de fato | `UC-051` | Projeção nativa |

## Glossário

| Termo | O que é |
| --- | --- |
| Processador | O NovaStar H9, que recebe as fontes e compõe a imagem da parede |
| Fonte IPC | Entrada de rede do H9 que puxa um stream RTSP; a única fonte de rede da Open API |
| Camada | Janela na tela do H9 ligada a uma fonte, com posição e tamanho |
| Ocupação | Quem detém o painel agora: espelho ou projeção, e de qual dono |
| WHIP | Protocolo HTTP para publicar WebRTC num servidor de mídia |
| Playground | Painel emulado dentro do `ms-cameras`, para usar a tela sem equipamento |
| Procedência | Se a capacidade da Open API é documentada pelo fabricante (`CONFIRMED`) ou presumida (`PRESUMED`) |
| `AllowedIPs` | No WireGuard, as faixas que cada peer pode enviar e receber; funciona como tabela de rotas |
