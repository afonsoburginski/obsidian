---
tags:
  - attlas
  - card
  - backlog
  - sem-prazo
card: SOFTWARE-2201
clickup: https://app.clickup.com/t/86ajj1zdg
lista_clickup: Sprint 25 (20/7/26 - 26/7/26)
sprint: "[[00 - Sem prazo (backlog)]]"
status: backlog, sem prazo - requisitos levantados (2026-07-15), a quebrar em atômica INT SDD. Daily de 31/07 acrescentou o RF-7 (gerenciamento global), a renomeação do mosaico atual para VMS e a confirmação do modelo H9 por foto; acesso ao equipamento (VM) a requisitar.
atualizado: 2026-07-31
---

# SOFTWARE-2201 - Integração videowall externo (NovaStar H9)

Fazer o Attlas **comandar o videowall físico existente**, um processador **NovaStar Série H (H9)**, direto da consola por Ethernet/TCP-IP, sem interface intermediária nem dispositivo dedicado. Exigido pelo contrato de Quito (módulo de Gestão de Videowall): câmeras IP e páginas web no mural, layouts, cenários dinâmicos, RTSP/H.264, reproduções predefinidas e operações programadas por planos de resposta.

Documentação da Open API: <https://openapi.novastar.tech/en/h/>.

## Cuidado: são três "videowall" diferentes

Não confundir. O 2201 é só o terceiro.

1. **Video Wall mosaico no browser** (o que já existe). Módulo `ms-cameras/video-wall` + contratos `libs/contracts/videowall`. Desenha os feeds como uma grade HLS **dentro do navegador** do operador. Cenas, layouts e células no Postgres, PTZ inline e rotação são 100% frontend, e o `activate` só grava um booleano `isActive`. **Não comanda nenhum hardware.**
2. **VMS externo** (sistema de gravação). Recebe o stream primário de alta resolução e **armazena**. O Attlas não dirige o VMS, é só um destino do stream, fronteira de domínio documentada.
3. **NovaStar H9** (este card). **Processador de videowall físico** que aciona uma parede de LED/monitores. O Attlas vira **cliente** da Open API do equipamento e manda nele: janelas, fontes de câmera, presets, troca de cena no hardware. **Não existe uma linha de código NovaStar/H9 no repo hoje.**

O eixo que separa: onde o vídeo aparece e quem manda. (1) desenha no browser, (2) recebe e grava, (3) o Attlas dirige um processador que projeta numa parede física. Só (3) precisa de um adaptador de saída novo.

> [!important] Decisão de nomenclatura (daily de 31/07)
> O mosaico no browser, item (1), passa a se chamar **VMS (Video Monitoring System)** no produto, e
> **videowall** fica reservado para o item (3), o painel físico externo de Quito. A renomeação atinge
> front, backend, rotas (`/cameras/videowall` vira `/cameras/vms`, `/api/video-wall` vira `/api/vms`),
> contratos e i18n, e é candidata a card próprio; escopo arquivo por arquivo em [[VMS]]. Antes de
> aplicar, resolver o choque com o item (2), que estas notas chamavam de "VMS externo" (sistema de
> gravação): passam a existir dois "VMS" e o contexto tem de ficar explícito.
> Ver [[Attlas - Sprint 27]], onde a daily ficou registrada, e a nota de domínio do equipamento,
> [[Videowall externo (NovaStar H9)]] (com a foto do H9).

## A Open API do H9

- **Protocolo**: HTTP POST com JSON. Raiz `http://{ip}:8000/open/api`, caminhos no formato `/open/api/<modulo>/<acao>`.
- **Auth**: OpenAPI Management no processador emite `pId` e `secretKey` por requisitante. Assinatura por request: sem cifra, `sign = Base64(MD5(timeStamp + pId))`; com cifra, entra o `secretKey` e o corpo pode ir em DES (ECB/PKCS5). Sem OAuth/JWT. Exige o OpenAPI Management habilitado no equipamento.
- **Confirmado com corpo exato**: `POST /open/api/screen/writeShowId {deviceId, screenIdEnable}`. O restante do catálogo tem a **capacidade confirmada** pelas release notes do firmware (esquema IPC otimizado, até 2000 presets, brilho e brilho agendado, reprodução agendada de playlist de presets), mas o path e o payload de cada um precisam ser travados na doc ou batendo no equipamento.

### Catálogo mapeado ao contrato

| Capacidade da API | Atende no contrato |
| --- | --- |
| `screen/writeShowId`, `screen/brightness` | selecionar tela ativa, brilho do mural |
| `layer/add`, `layer/delete`, `layer/list`, `layer/setInfo`, `layer/changeSource` | layouts e cenários dinâmicos (janelas, geometria, trocar câmera na janela) |
| `ipc/create`, `ipc/update`, `ipc/delete` | câmeras IP e RTSP/H.264 (o H9 puxa o stream da câmera direto, sem intermediário) |
| `preset/create`, `preset/load`, `preset/read` | cenas e reproduções predefinidas (salvar, aplicar, listar) |
| `preset/load` disparado por plano | operações programadas por planos de resposta |
| `schedule` (a validar) | operações programadas/agendadas de cena e brilho |

## Requisitos

- **RF-1** Cadastrar o processador H9 como dispositivo externo (host, porta, `pId`/`secretKey`, modelo, firmware) e autenticar na Open API.
- **RF-2** Cadastrar as câmeras do Attlas como fontes IPC no H9 (URL RTSP, credenciais, codec), reaproveitando os perfis de stream que o `ms-cameras` já conhece.
- **RF-3** Montar e alterar layout: criar/remover/reposicionar janelas e trocar a fonte de uma janela.
- **RF-4** Salvar, listar e aplicar preset (cena) no hardware, com troca instantânea de composição.
- **RF-5** Disparar uma cena no mural a partir de um plano de resposta (operação programada).
- **RF-6** Ajustar brilho da tela.
- **RF-7** (daily de 31/07, a detalhar) Gerenciamento **global** do videowall externo: o equipamento é gerenciado de forma única, não isolado por sistema/tenant. Falta definir o que "global" abrange na prática (uma instância de gerenciamento independente do sistema selecionado no header).
- **RNF** Comunicação direta com o equipamento por TCP-IP, sem interface intermediária nem dispositivo dedicado (exigido pelo contrato). Erros tratados com `DomainException`, ações de operador auditáveis, `SPEC.md` mínimo no primeiro PR.

## O que é novo vs o que reusa

**Novo** (adaptador de saída, atômica `INT-*`, provável em `ms-cameras`):

- Cliente da NovaStar Open API (assinatura, DES opcional, chamadas de screen/layer/ipc/preset).
- Registro do H9 como driver no padrão de fabricantes que o `ms-cameras` já usa.
- Contratos novos em `@attlas/contracts` para config do processador e o mapeamento cena Attlas para preset/layout do H9, distinto do `IVideowallView` do mosaico browser.
- Persistência do cadastro do H9 e da associação cena para preset.
- Comando de "enviar cena ao painel físico" (ou estender o `activate` para também despachar ao H9).

**Reusa**:

- Modelo de cena/layout/célula que já existe (`VideoWallScene`, `VideoWallSceneCell`, `EnumVideowallLayout`), que descreve "qual câmera em qual posição" e vira fonte de verdade do que empurrar ao processador.
- Gesto de ativar cena (`POST /api/video-wall/scenes/:id/activate`) como ponto natural onde pendurar o push ao H9.
- Catálogo de câmeras e perfis de stream do `ms-cameras` para as URLs RTSP das fontes IPC.
- `ms-cameras` como backend único do domínio, com Kong/JWT, observabilidade e o registry de drivers de fabricante.

## Validações em aberto (não bloqueiam o escopo)

- ~~Confirmar modelo do processador em Quito~~ **confirmado em 31/07 por foto do equipamento**: chassi "H9 VIDEO WALL SPLICER", acta de entrega da EPMMOP/Quito (VD-12407-80-10, emissão 2024-07-09) descrevendo `PROCESADOR DE VIDEO WALL H9`, patrimônio `N10P 45815` / código `00048815`. Firmware lido na tela como `V1.9.7.1` (dígito do meio borrado, pode ser `V1.5.7.1`), **a confirmar na máquina**; equipamento de 2024, então a premissa de firmware recente se sustenta. Foto e detalhes em [[Videowall externo (NovaStar H9)]].
- Confirmar OpenAPI Management habilitado e obter `pId`/`secretKey`, e definir corpo cifrado (DES) ou texto puro. **Depende do acesso**: em 31/07 ficou de requisitar uma VM que alcance o equipamento (o gestor vai pedir acesso remoto a uma das máquinas que já têm acesso).
- A doc oficial é uma SPA em JS: o protocolo e a auth saem por `doc-7540897`, mas os paths exatos de layer/preset/ipc/brightness precisam ser travados abrindo a doc no browser ou batendo no equipamento.
- Agendamento: o recurso existe no firmware, mas não está claro se é exposto pela Open API ou só pela UI. Alternativa: o Attlas agenda no próprio scheduler e chama `preset/load` na hora.
- Páginas web no mural: a Série H ingere HDMI/SDI/IPC. Confirmar se há fonte web nativa ou se a página entra por captura de uma workstation (provável), o que pode ficar fora da Open API.
- Existe um protocolo de controle legado (token, `admin/admin`, `/api/preset/play`) usado por integrações de terceiros. Ficar no OpenAPI (`/open/api`), que é o pedido.

## Referências

- Domínio de câmeras e Video Wall browser: `docs/modules/cameras.md` e `ms-cameras/docs` MOD-006.
- Contexto do contrato de Quito e viabilidade da integração: memória do projeto (videowall H9).
