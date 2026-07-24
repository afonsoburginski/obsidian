---
tags:
  - attlas
  - sprint-25
  - card
card: SOFTWARE-2201
sprint: Sprint 25 (20/7/26 - 26/7/26)
status: backlog - requisitos levantados (2026-07-15), a quebrar em atômica INT SDD
atualizado: 2026-07-17
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

- Confirmar modelo e firmware do processador em Quito (Série H, ex H9) e que roda versão recente, o esquema IPC otimizado e o brilho/preset agendado só existem em firmware novo.
- Confirmar OpenAPI Management habilitado e obter `pId`/`secretKey`, e definir corpo cifrado (DES) ou texto puro.
- A doc oficial é uma SPA em JS: o protocolo e a auth saem por `doc-7540897`, mas os paths exatos de layer/preset/ipc/brightness precisam ser travados abrindo a doc no browser ou batendo no equipamento.
- Agendamento: o recurso existe no firmware, mas não está claro se é exposto pela Open API ou só pela UI. Alternativa: o Attlas agenda no próprio scheduler e chama `preset/load` na hora.
- Páginas web no mural: a Série H ingere HDMI/SDI/IPC. Confirmar se há fonte web nativa ou se a página entra por captura de uma workstation (provável), o que pode ficar fora da Open API.
- Existe um protocolo de controle legado (token, `admin/admin`, `/api/preset/play`) usado por integrações de terceiros. Ficar no OpenAPI (`/open/api`), que é o pedido.

## Referências

- Domínio de câmeras e Video Wall browser: `docs/modules/cameras.md` e `ms-cameras/docs` MOD-006.
- Contexto do contrato de Quito e viabilidade da integração: memória do projeto (videowall H9).
