---
tags:
  - doc
  - cameras
  - videowall
aliases:
  - "Câmeras - Videowall - Fluxos"
  - "Videowall - Fluxos"
atualizado: 2026-10-07
banner: "led video wall display"
---

# Câmeras - Videowall - Fluxos

Volta para [[Câmeras - Videowall]].

## Resumo

| Fluxo | Gatilho | Resultado |
| --- | --- | --- |
| [[#Cadastrar ou editar o processador]] | Administrador salva o formulário do processador | Processador cadastrado, credencial cifrada, vínculo com o sistema |
| [[#Espelhar a tela da consola]] | Espelhar no lançador radial | A aba do operador na parede |
| [[#Liberar ou expirar o espelho]] | Liberar, fim do compartilhamento ou 60 s sem publicação | Painel livre |
| [[#Projetar uma cena]] | "Enviar ao painel" no VMS | Uma camada por câmera da cena na parede |
| [[#Plano de resposta]] | Comando do `ms-execution-plans` | Cena projetada ou painel liberado, com eco |
| [[#Grupos salvos]] | "Salvar grupo" ou Aplicar | Geometria guardada, ou grupo projetado |
| [[#Rotação de grupos]] | Botão "Rotação" | Grupos aplicados um por vez |
| [[#Brilho]] | `PATCH /api/vms/videowall/brightness` | Setpoint gravado e escrito no painel |
| [[#Leitura do estado observável]] | `GET /api/vms/videowall/state` | Estado com o instante de cada informação, ou "não lido" |

Mecanismos e rotas: [[Câmeras - Videowall - Arquitetura e estratégias]]. Regras de precedência:
[[Câmeras - Videowall - Requisitos e SLA]].

## Cadastrar ou editar o processador

**Gatilho.** O administrador do sistema salva o formulário do processador na tela `/cameras/videowall-panel`.

**Passos.**

1. O front valida IPv4, faixa de porta e nome até 120 caracteres, campo a campo.
2. `POST /api/vms/videowall/processors` (ou `PATCH /processors/:id`) exige filiação, duty `SYSTEM_ADMIN` e
   `cameras.videoWall:configure`.
3. O handler confere que endereço e porta não estão cadastrados e que o sistema não está vinculado a outro
   processador.
4. Cifra o `secretKey` com o `SecretCipherService` e grava o processador com o `pId` e o vínculo de sistema.
5. Publica a auditoria só com identificador, nome e modelo: credencial e endereço de rede não viajam.
6. A geometria do painel não vem do formulário: a primeira leitura de estado a descobre.

**Resultado.** Processador cadastrado e vinculado ao sistema.

**Erros.** Endereço e porta já cadastrados: 409 `VIDEOWALL_PROCESSOR_ADDRESS_PORT_ALREADY_REGISTERED`. Sistema
já vinculado: `VIDEOWALL_PROCESSOR_SYSTEM_ID_ALREADY_LINKED`. Par de credenciais incompleto:
`VIDEOWALL_PROCESSOR_CREDENTIAL_PAIR_REQUIRED`. Salvar com o IP da placa ou com o login da interface web no
lugar do `pId` grava sem erro e deixa o processador inalcançável.

## Espelhar a tela da consola

**Gatilho.** O operador escolhe Espelhar no lançador radial.

**Passos.**

1. O dialog mostra o estado atual do painel e deixa escolher layout e posição.
2. "Enviar ao painel" pede ao navegador a captura da própria aba; a confirmação do navegador é obrigatória.
3. Liberada a captura, o front chama `POST /api/vms/videowall/mirror` (slot opcional). O backend arbitra a
   ocupação.
4. O front publica por WHIP em `<MEDIAMTX_WEBRTC_BASE_URL>/videowall-mirror-<caminho>/whip` e avisa
   `POST /api/vms/videowall/mirror/publishing` quando a conexão sobe.
5. O codec enforcer derruba publicação fora de H.264 em até 5 s.
6. O backend cria no H9 uma fonte IPC e uma camada por tela publicada; o equipamento puxa
   `<MEDIAMTX_RTSP_URL>/videowall-mirror-<caminho>` com a credencial de leitor do espelho.
7. Sem sessão prévia, a divisão escolhida é gravada logo depois do envio (`PUT /mirror/arrangement`).
8. Cada passo empurra `videowall:occupancy:updated` às outras telas do sistema.

**Resultado.** A aba do operador aparece na parede, e o lançador mostra o ponto de alerta de espelho em
andamento.

**Erros.**

| Situação | Resposta |
| --- | --- |
| Captura recusada no navegador | Nenhuma chamada; o painel fica intocado |
| Painel ocupado por outra pessoa, sem `takeover` | 409 `VIDEOWALL_MIRROR_ALREADY_HELD`, dizendo quem detém e desde quando |
| `takeover` sobre pessoa sem duty administrativo | `VIDEOWALL_MIRROR_TAKEOVER_REQUIRES_ADMIN` |
| Sistema sem vínculo, com processador cadastrado | 403 `VIDEOWALL_MIRROR_SYSTEM_NOT_LINKED` |
| Nenhum processador | 404 |
| Geometria do painel desconhecida | `VIDEOWALL_MIRROR_PANEL_GEOMETRY_UNKNOWN` |
| Publicação em codec diferente de H.264 | Publicador derrubado pelo codec enforcer |

Tomada administrativa (`takeover`) sobre outro operador avisa o deslocado com
`cameras.videowallMirror.takenOver`.

## Liberar ou expirar o espelho

**Gatilho.** "Liberar" no lançador, "Retirar do painel" na tela, fim do compartilhamento pelo controle do
navegador, ou o caminho de publicação parado.

**Passos.**

1. Liberar chama `DELETE /api/vms/videowall/mirror`; o backend remove as camadas e as fontes do espelho.
2. Se o painel está com uma cena projetada, o Liberar do lançador usa a rota de cena
   (`POST /api/vms/scenes/:id/deactivate` com `target: VIDEOWALL`), porque a rota de espelho recusaria.
3. Sem ação do operador, o reaper confere a cada 15 s as sessões de espelho e expira a que está sem
   publicação há `VIDEOWALL_MIRROR_UNPUBLISHED_GRACE_MS` (60 s).
4. A ocupação nova vai para `videowall:occupancy:updated`.

**Resultado.** Painel livre.

**Erros.** Quem não é dono do espelho recebe `VIDEOWALL_MIRROR_NOT_OWNER`. Redis do lease do reaper fora: o
reaper não roda (fail-closed) e a expiração espera o Redis voltar.

## Projetar uma cena

**Gatilho.** No VMS, "Enviar ao painel".

**Passos.**

1. O front salva a cena se há edição pendente e chama `POST /api/vms/scenes/:id/activate` com
   `target: VIDEOWALL`.
2. O `NovastarH9DisplayTarget` confere o vínculo do sistema e a geometria do painel, passa pelo portão de
   formato (`VideowallProjectionFormatGate`) e pelo árbitro de ocupação.
3. Para cada câmera, garante o path `videowall-projection-*` sob demanda no MediaMTX e a
   `VideowallProjectionSource` reaproveitada, e monta as camadas a partir da geometria da cena
   (`videowall-projection-geometry.ts`), sob o lease de escrita do processador.
4. Grava a ocupação `NATIVE_SCENE`, empurra `videowall:occupancy:updated` e publica
   `VideowallWallOccupiedEvent`, que dispara a reaplicação do brilho. `isActive` da cena não muda.

`POST /api/vms/scenes/:id/deactivate` com o mesmo alvo limpa a parede.

**Resultado.** Uma camada por câmera da cena na parede, e o palco da tela mostra a cena câmera por célula.

**Erros.**

| Situação | Código |
| --- | --- |
| Painel com outra pessoa, sem `takeover` | 409 `VIDEOWALL_MIRROR_ALREADY_HELD`, com quem detém e desde quando (o mesmo código do espelho) |
| Painel com projeção de plano, sem `takeover` | `VIDEOWALL_PROJECTION_HELD_BY_PLAN` |
| `takeover` sobre pessoa sem duty administrativo | `VIDEOWALL_PROJECTION_TAKEOVER_REQUIRES_ADMIN` |
| Sem `System-Id` | `VIDEOWALL_PROJECTION_SYSTEM_REQUIRED` |
| Sistema sem vínculo, com processador cadastrado | 403 `VIDEOWALL_PROJECTION_SYSTEM_NOT_LINKED` |
| Geometria do painel desconhecida | `VIDEOWALL_PROJECTION_PANEL_GEOMETRY_UNKNOWN` |
| Cena sem câmera | `VIDEOWALL_PROJECTION_SCENE_EMPTY` |
| Câmera em formato que não é H.264 ou abaixo de 480 linhas | `VIDEOWALL_PROJECTION_CAMERA_FORMAT_UNSUPPORTED` ou `VIDEOWALL_PROJECTION_CAMERA_RESOLUTION_BELOW_FLOOR` |
| Câmera indisponível | `VIDEOWALL_PROJECTION_CAMERA_UNAVAILABLE` |
| Pedido simultâneo | `VIDEOWALL_PROJECTION_CONCURRENT_CHANGE` |
| Equipamento recusa, não responde ou está fora | `VIDEOWALL_PROCESSOR_REJECTED`, `VIDEOWALL_PROCESSOR_TIMEOUT` (408) ou `VIDEOWALL_PROCESSOR_UNAVAILABLE` |

## Plano de resposta

**Gatilho.** O `ms-execution-plans` publica em `attlas.execution-plans.videowall-command` um comando
`project-scene` ou `release-panel`.

**Passos.**

1. O `ms-cameras` consome o comando com ator `PLAN_EXECUTION`.
2. Antes de tocar a parede, recusa verbo desconhecido, comando sem escopo de sistema, `project-scene` sem
   `sceneId` e cena fora do sistema.
3. `release-panel` com a parede já livre é executado sem escrita.
4. `project-scene` segue o fluxo [[#Projetar uma cena]]; o plano desloca quem estiver no painel, inclusive
   quem espelha.
5. O desfecho ecoa em `attlas.cameras.videowall-command-executed` ou
   `attlas.cameras.videowall-command-rejected`, com `eventId` determinístico por comando.

**Resultado.** Cena projetada ou painel liberado, e o motor de planos sabe o desfecho.

**Erros.** As recusas do passo 2 e os erros do equipamento saem no eco `rejected`, com `errorCode`. A
projeção por plano não emite auditoria de operador, e o deslocado não recebe aviso.

## Grupos salvos

**Gatilho.** "Salvar grupo" na tela do painel, ou Aplicar num grupo da aba "Grupos salvos".

**Passos.**

1. **Salvar** (`POST /api/vms/videowall/groups`, `configure`): guarda geometria e curadoria da parede, nunca
   stream; grupo salvo sobre uma cena leva as câmeras dela.
2. **Aplicar** (`POST /api/vms/videowall/groups/:groupId/apply`, `operate`): projeta como cena nativa, pela
   mesma arbitragem; grupo só com geometria recebe as câmeras da cena em exibição, na ordem de leitura. A cena
   guardada no VMS não é reescrita.
3. **Apagar** (`DELETE /api/vms/videowall/groups/:groupId`, `configure`).

**Resultado.** Grupo guardado, aplicado na parede ou removido.

**Erros.** Nome repetido no sistema: `VIDEOWALL_GROUP_NAME_TAKEN`; a tela recusa também o nome que difere só
por capitalização. Nada para salvar: `VIDEOWALL_GROUP_NOTHING_TO_SAVE`. Aplicar recebe as mesmas recusas de
[[#Projetar uma cena]].

## Rotação de grupos

**Gatilho.** O operador abre "Rotação" no card "Projetar no painel" e inicia.

**Passos.**

1. O dialog de rotação do VMS lista os grupos salvos, com o tempo de cada um.
2. A consola aplica um grupo por vez com a mesma chamada do Aplicar, no tempo de cada grupo
   (`videowall-panel-rotation.service.ts`).
3. O operador vê o contador e pode pausar, retomar e parar.

**Resultado.** A parede alterna entre os grupos enquanto a consola está aberta.

**Erros.** A rotação para quando um plano ou uma programação assume o painel, na troca de sistema, depois de
três recusas seguidas, em "Retirar do painel" e na troca de layout.

## Brilho

**Gatilho.** O operador `SYSTEM_ADMIN` com `operate` ajusta o brilho na tela ou no lançador.

**Passos.**

1. `PATCH /api/vms/videowall/brightness` grava o setpoint no processador (`brightnessSetpoint`, quando e por
   quem).
2. Escreve o brilho no equipamento (`screen/writeBrightness`).
3. Emite `videowall:brightness:changed` na sala do sistema e publica a auditoria.
4. O reconciliador reafirma o setpoint quando uma leitura de estado diverge e quando o painel é tomado ou
   projetado.

**Resultado.** Brilho do painel inteiro ajustado e mantido.

**Erros.** Valor fora da faixa lida do equipamento: `VIDEOWALL_BRIGHTNESS_OUT_OF_RANGE`. Faixa ainda não
lida: `VIDEOWALL_BRIGHTNESS_RANGE_UNKNOWN`. No H9 de Quito, firmware 1.9.7.1, `screen/writeBrightness` responde
500 e o ajuste falha.

## Leitura do estado observável

**Gatilho.** A tela do painel ou o dialog pede `GET /api/vms/videowall/state`.

**Passos.**

1. Se já há leitura em andamento para o processador, o pedido recebe a mesma resposta.
2. Senão, consulta o equipamento e grava firmware, brilho e faixa, geometria e alcance, cada um com o instante
   da leitura.
3. Depois da leitura, o reconciliador de brilho confere o setpoint.

**Resultado.** O estado com o frescor de cada informação.

**Erros.** Equipamento indisponível, sem resposta, recusando ou recusando em HTTP 200: a resposta diz "não
lido", sem erro HTTP, e o frescor da última leitura válida se preserva. Capacidade não verificada: "não
tentado". Falha interna do serviço, como a do banco, propaga como erro.
