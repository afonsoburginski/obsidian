---
tags:
  - doc
  - ms-cameras
  - cameras
  - novastar
  - quito
  - videowall
aliases:
  - "Videowall externo (NovaStar H9)"
  - "00 - Videowall externo (NovaStar H9)"
atualizado: 2026-07-31
---

# Videowall externo (NovaStar H9)

> **Videowall** = o painel físico externo, comandado por um processador NovaStar Série H (H9) na sala de controle de Quito. O mosaico de feeds no browser é o **[[VMS]]** (Video Monitoring System), assunto diferente. Card: [[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)]]. Decisão de nomenclatura: [[Attlas - Sprint 27]].

Exigido pelo contrato de Quito (Módulo de Gestão de Videowall): o Attlas precisa comandar o equipamento
**direto da consola, por Ethernet/TCP-IP**, sem interface intermediária nem dispositivo dedicado. Hoje
**não existe uma linha de código NovaStar/H9 no repo**: é integração a construir, adaptador de saída novo
(atômica `INT-*`, provável em `ms-cameras`).

## O equipamento (foto de 31/07)

![[videowall-h9-quito.png]]

| Dado | Valor | Como sabemos |
| --- | --- | --- |
| Modelo | **H9 Video Wall Splicer** (NovaStar Série H) | rótulo do chassi na foto |
| Firmware | **V1.9.7.1** (dígito do meio borrado, pode ser `V1.5.7.1`) | tela de identificação do equipamento |
| Fabricante | NovaStar (`www.novastar.tech`, `support@novastar.tech`) | tela de identificação |
| Patrimônio | `N10P 45815` (etiqueta manuscrita) / código `00048815` | chassi + acta de entrega |
| Acta de entrega | EPMMOP Quito, `VD-12407-80-10`, emissão **2024-07-09** | documento na foto |
| Descrição no inventário | `CONTROLADOR` / `PROCESADOR DE VIDEO WALL H9` | acta de entrega |
| Fornecedor | SMARTCOGROUP CIA LTDA | acta de entrega |

Isso **confirma o modelo** (Série H, H9) e a idade do equipamento (2024), o que sustenta a premissa de
firmware recente. **Falta confirmar** o firmware exato e se o OpenAPI Management está habilitado, o que
depende de acesso.

## Acesso: pendente

Decidido na daily de 31/07: requisitar uma **máquina virtual que alcance o equipamento**. O gestor vai
solicitar acesso remoto a uma das máquinas que já têm acesso ao dispositivo. Sem isso não se obtém
`pId`/`secretKey` nem se travam os paths exatos da API.

## A Open API do H9

Documentação: <https://openapi.novastar.tech/en/h/>.

- **Protocolo**: HTTP POST com JSON. Raiz `http://{ip}:8000/open/api`, caminhos `/open/api/<modulo>/<acao>`.
- **Auth**: o OpenAPI Management do processador emite `pId` e `secretKey` por requisitante. Assinatura por request: sem cifra, `sign = Base64(MD5(timeStamp + pId))`; com cifra entra o `secretKey` e o corpo pode ir em DES (ECB/PKCS5). Sem OAuth nem JWT.
- **Confirmado com corpo exato**: `POST /open/api/screen/writeShowId {deviceId, screenIdEnable}`. O resto do catálogo tem capacidade confirmada pelas release notes do firmware, mas path e payload precisam ser travados na doc ou no equipamento.

| Capacidade da API | Atende no contrato |
| --- | --- |
| `screen/writeShowId`, `screen/brightness` | selecionar tela ativa, brilho do mural |
| `layer/add`, `layer/delete`, `layer/list`, `layer/setInfo`, `layer/changeSource` | layouts e cenários dinâmicos (janelas, geometria, trocar câmera na janela) |
| `ipc/create`, `ipc/update`, `ipc/delete` | câmeras IP e RTSP/H.264 (o H9 puxa o stream da câmera direto) |
| `preset/create`, `preset/load`, `preset/read` | cenas e reproduções predefinidas |
| `preset/load` disparado por plano | operações programadas por planos de resposta |
| `schedule` (a validar) | operações agendadas de cena e brilho |

## Requisitos (resumo)

Detalhe e rastreabilidade no card [[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)]]:
cadastrar o processador como dispositivo externo (RF-1), publicar as câmeras do Attlas como fontes IPC
(RF-2), montar e alterar layout (RF-3), salvar/aplicar preset (RF-4), disparar cena por plano de resposta
(RF-5), brilho (RF-6) e **gerenciamento global** do equipamento, não por sistema/tenant (RF-7, novo na
daily de 31/07, escopo a detalhar).

## Desenho fechado em 31/07 (refino, sprint a definir)

Decisões tomadas no refino, antes de ter acesso ao equipamento. O desenho nasceu no planejamento da
Sprint 27, mas a frente foi escopada para outra sprint no replanejamento do fim do dia 31/07, que deixou
a 27 com foco único no analítico desacoplado (ver [[Attlas - Sprint 27]]). Nada aqui se perdeu: quando a
frente entrar, é planejamento e não retrabalho.

- **Mora em módulo novo dentro do `ms-cameras`** (`src/videowall-processor/`), não serviço novo nem
  connector. Precedente: o ACOM vive dentro do `ms-controllers` (integração TCP com equipamento de
  terceiro embutida no ms de domínio). O argumento decisivo é o RF-2: montar a URL RTSP da câmera
  depende do resolver de fonte de stream, do helper de RTSP e da credencial, todos no `ms-cameras`.
  Fora dele, isso viraria chamada cross-service em todo sync de fonte. Connector serve para
  multiplexar protocolo em escala, e aqui é um equipamento por cidade, HTTP stateless, sem polling.
- **Catálogo de capacidades é o que impede a semana de travar.** Cada capacidade da Open API é um
  descriptor com path, status (CONFIRMED ou PRESUMED), se é escrita, procedência e firmware mínimo.
  Hoje só `screen/writeShowId` é CONFIRMED. O cliente consulta o descriptor antes de chamar: capacidade
  presumida com o flag de ambiente desligado responde **501 `VIDEOWALL_CAPABILITY_UNVERIFIED`** e conta
  na métrica. Toda a superfície REST, os handlers e a tela existem e funcionam; o que toca o mural
  responde código estável e traduzido, que a tela mostra como "capacidade não verificada no
  equipamento". Honesto, e não é mock.
- **Fecho quando o acesso chegar**: uma PR que só troca PRESUMED por CONFIRMED e adiciona golden
  vectors reais. Se precisar mexer em handler, schema ou tela, o isolamento falhou.
- **Codec fecha sem equipamento.** Assinatura MD5 e cifra DES são funções puras, testáveis com golden
  vectors, confinadas numa pasta `codec/` com aviso de protocolo imposto pelo fornecedor e nunca
  reusado para segredo interno do Attlas. **A derivação da chave DES de 8 bytes a partir do
  `secretKey` não está documentada**: fica em constante marcada como presumida e o modo cifrado nasce
  desligado, porque o modo sem cifra é o caminho confirmado.
- **Requisito vai em arquivo próprio** `docs/modules/videowall.md` (`CTX-videowall`), com IDs
  `RF-VWP-*` e `RNF-VWP-*`, e não em seção de `cameras.md`: aquele doc está `completed` e enquadra todo
  o domínio como org e system scoped, o que o RF-7 (gestão global) contradiz frontalmente. Em
  `cameras.md` entram só três edições cirúrgicas (linha na tabela de integrações, duas no glossário,
  nota na tabela de feature modules).
- **RF-7 (global) no schema**: sem coluna de tenant, com comentário declarando que a ausência é o
  requisito e não esquecimento, unicidade por host e porta, e autoridade de escrita por duty
  administrativa com verificação no banco. Rejeitadas a sentinela de organização global do mosaico
  (finge escopo que não existe e amarra ao módulo que está sendo renomeado) e o `organizationId`
  nulável (cria dois regimes de query no mesmo repositório). A câmera continua system-scoped, então o
  sistema fica denormalizado **na fonte IPC**, não no processador.
- **`secretKey` cifrado** com o serviço de cifra do core-common, primeiro uso fora do
  `ms-organization`. A justificativa de texto puro da credencial de câmera não transfere: ONVIF
  converte a senha em digest no handshake, enquanto o `secretKey` entra cru na assinatura, e o raio de
  dano é o mural inteiro da sala de controle. O `pId` fica em claro no banco mas sai mascarado na
  resposta, porque no modo sem cifra ele é efetivamente o segredo.
- **Escrita não é retentada**: criar fonte IPC e adicionar janela não são idempotentes, retry duplica.
  Zero retries em escrita, write-lock por processador, reconciliação por listagem.
- **Front é módulo novo** `videowall-processor` (não tela dentro do mosaico, que está virando VMS), com
  sete estados derivados só de dado real. Sem processador cadastrado não há grade desenhada: não se
  inventa 3x3.

### Três lacunas de requisito achadas ao confrontar os RF com o contrato

- **Página web como fonte no mural**: o contrato pede "câmeras IP e páginas web", e isso não estava nos
  RF-1 a RF-7. A Série H ingere HDMI, SDI e IPC; se não houver fonte web nativa, a página entra por
  captura de uma workstation, o que pode ficar fora da Open API. Entra como capacidade dependente de
  confirmação.
- **Estado observável do processador**: alcançabilidade, firmware lido, mapa de janelas conhecido e
  frescor de cada informação. É pré-requisito do estado vazio honesto na tela, e não existia como
  requisito.
- **Reproduções agendadas**: o contrato pede operações programadas. O recurso existe no firmware, mas
  não se sabe se é exposto pela Open API. Alternativa registrada: o Attlas agenda no próprio scheduler
  e chama o preset na hora.

## O que reusa do VMS

O modelo de cena/layout/célula que já existe (`VideoWallScene`, `VideoWallSceneCell`,
`EnumVideowallLayout`) descreve "qual câmera em qual posição" e é a fonte natural do que empurrar ao
processador; o gesto de ativar cena (`POST /api/video-wall/scenes/:id/activate`, futuro `/api/vms/...`) é
o ponto onde pendurar o push ao H9. O catálogo de câmeras e os perfis de stream dão as URLs RTSP das
fontes IPC. Ver [[VMS - Arquitetura e estratégias]].

## Cuidado com o vocabulário

São três coisas distintas, e agora com nome estável:

1. **VMS (Video Monitoring System)** - o mosaico no browser, `ms-cameras` + front. Não comanda hardware. [[VMS]]
2. **VMS externo / Video Management System** - o sistema de gravação que recebe o stream primário e armazena. O Attlas não o dirige, só entrega stream (RF-INT-01, RNF-CAM-11). Mesma sigla, sentido diferente: colisão a resolver no glossário.
3. **Videowall** - este documento. Processador físico que projeta numa parede de LED/monitores, com o Attlas como cliente da Open API.

## Relacionados

[[VMS]] · [[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)]] · [[SOFTWARE-2315 - Comparativo Attlas 25x26 - video wall]] · [[ms-cameras]] · [[Streaming]]
