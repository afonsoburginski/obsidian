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
atualizado: 2026-08-14
---

# Videowall externo (NovaStar H9)

> **Videowall é o externo**: o painel físico da sala de controle de Quito, comandado por um processador NovaStar Série H (H9), que não é nosso e que o Attlas apenas dirige por API. **VMS é o que temos internamente**, o mosaico de feeds que o Attlas desenha no browser: [[VMS]]. Card: [[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)]]. Nomenclatura decidida na daily de 31/07 e formalizada na spec CROSS-045.
>
> **Desde 10/08 o videowall é alvo de exibição do VMS, e não um módulo irmão** (decisão do user). Isso troca pasta, rota, espaço de ID de requisito e o desenho do front, e está detalhado na seção do desenho mais abaixo.
>
> **Desde 13/08 o propósito mudou: o painel espelha a tela da aplicação, não recebe cena.** O que vai para a parede é a captura da tela do cliente que está acessando o Attlas, entregue ao equipamento como fonte única numa janela em tela cheia. Quem compõe continua sendo o Attlas, e a parede reflete. Isso inverte um invariante que estava declarado em seis documentos, então as seções abaixo que descrevem projeção de cena, fontes por câmera, janelas e presets estão **revisadas ou marcadas como vencidas**. O material que sustenta a decisão está em [[Pesquisa - transporte do espelhamento de tela]].
>
> **Desde 14/08 o painel tem dois modos, e a cláusula do contrato está versionada.** O user trouxe o texto literal da cláusula **16.13, "Módulo de gestión de videowall"**, que era a lacuna de procedência que a seção 3.2 de `cameras.md` declarava: os requisitos estavam parafraseados a partir do levantamento de 15/07 e do refino de 31/07. A citação entrou literal, em espanhol, com as doze obrigações mapeadas uma a uma, e reabriu a decisão do dia 13: a cláusula exige ação automatizada no painel, vinda de plano de resposta e de operação programada, e sob espelhamento não existe tela para espelhar quando não há operador. O painel passa a ter **modo espelho** (com operador) e **modo de projeção nativa** (sem operador), e nos dois a fonte é servida pela plataforma, nunca puxada da câmera, o que preserva o ganho de domínio da revisão anterior. Plano preempta o operador; exibição programada cede a ele. Sobra uma lacuna declarada só: página web na parede sem operador.
>
> **Especificação no repositório, depois da revisão de 13/08**: requisitos na faixa `RF-VW-07` a `RF-VW-20` de `docs/modules/cameras.md` (o merge com a develop renumerou: o 18 da develop, rotação de cenas no painel, entrou como retirado, dono exclusivo virou 19 e exposição virou 20), mais `RNF-CAM-18` e `RNF-CAM-19`; atômicas de backend `UC-049` (cadastro), `INT-011` (codec), `INT-012` (cliente), `INT-016` (a tela como fonte única), `UC-050` (tomar e liberar), `PROJ-019` (expiração de espelho órfão) e `INT-015` (brilho e estado); no frontend, a `UF-031` para a captura da tela. As antigas `INT-013` e `INT-014` foram deletadas. Tabela do que mudou por documento na nota do card.

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

| Capacidade da API | Para que serve com o espelhamento |
| --- | --- |
| `screen/writeShowId`, `screen/brightness` | selecionar tela ativa, brilho do mural |
| `layer/add`, `layer/setInfo`, `layer/changeSource`, `layer/delete`, `layer/list` | a camada única em tela cheia: criar, dimensionar, apontar para o espelho, remover na liberação e reler para reconciliar |
| `ipc/create`, `ipc/update`, `ipc/delete` | registrar **o caminho do espelho** como fonte de rede. A Open API não tem conceito de fonte de rede que não seja fonte IPC, então o espelho entra por aqui. Uma por processador, não uma por câmera |
| `preset/create`, `preset/load`, `preset/read` | **fora do escopo desde 13/08.** Preset é composição salva no equipamento, e a plataforma deixou de compor. O equipamento continua tendo presets próprios, operados na interface dele |
| `schedule` (a validar) | brilho agendado. Exibição agendada caiu junto com a projeção de cena, porque sob espelhamento não há tela sem operador |

## Requisitos (resumo)

A numeração autoritativa está em `docs/modules/cameras.md`, seção 3.2, faixa `RF-VW-07` em diante, e foi
revisada em 13/08. Em resumo: cadastrar o processador com o transporte do espelho declarado, espelhar a
tela de um cliente autenticado como fonte única do painel, janela única em tela cheia, sessão de
espelhamento com dono exclusivo, brilho, estado observável, exposição do que a parede mostra, e
gerenciamento global do equipamento sem tenant.

**Revisão de 14/08, com a cláusula 16.13 citada.** O quadro de saídas e lacunas mudou:

| Requisito | Antes de 14/08 | Agora |
| --- | --- | --- |
| Câmera como fonte do painel | Saiu | Volta no modo de projeção nativa, servida pela plataforma |
| Página web como fonte | Saiu, por hardware | Atendida pelo espelho com operador; sem operador é a única lacuna declarada |
| Gestão de janelas | Saiu | Volta como geometria derivada da cena, sem editor à mão |
| Preset de composição | Saiu | Continua fora, agora por containment e não por ausência de geometria |
| Cena por plano de resposta | Lacuna declarada | Atendida pela projeção nativa, com precedência sobre o operador |
| Exibição programada | Lacuna declarada | Atendida, com o relógio na plataforma, cedendo ao operador |
| Sequência de cenas na parede | Retirado | Vivo e diferido |

O que sustentava a lacuna era verdadeiro e continua: sob espelhamento nada aparece na parede sem operador
com sessão aberta. O que mudou é que passou a existir um segundo modo, que não depende de tela nenhuma.

## Desenho fechado em 31/07 (refino, frente comprometida na Sprint 28)

Decisões tomadas no refino, antes de ter acesso ao equipamento. O desenho nasceu no planejamento da
Sprint 27, foi escopado para fora dela no replanejamento do fim do dia 31/07 (ver [[Attlas - Sprint 27]])
e **entrou como frente da [[Attlas - Sprint 28]]** na semana de 10/08: CTX-videowall, especificação do
módulo e codec no comprometido; cadastro, catálogo de capacidades, fontes IPC, layout/preset, brilho e a
tela na fila.

- **Mora como submódulo do VMS dentro do `ms-cameras`**, em `src/video-wall/targets/novastar-h9/`, não
  em módulo irmão, nem serviço novo, nem connector. **Revisado em 10/08**: antes era módulo próprio em
  `src/videowall-processor/`. **Revisado de novo em 13/08 quanto ao argumento**: ele era o RF-2, porque
  montar a URL RTSP da câmera dependia do resolver de fonte de stream e da credencial, todos ali. Esse
  argumento caiu com a fonte por câmera. O argumento novo é mais forte: o caminho de mídia do espelho é o
  mesmo MediaMTX que serve o pipeline de HLS deste serviço, com o mesmo cliente de control API e o mesmo
  registro de sessão, então num serviço separado cada tomada de espelho seria chamada cross-service.
  Precedente do serviço: o ACOM vive dentro do `ms-controllers`.
- **O que sustenta o containment**, revisado em 13/08: o espelho nasce de uma sessão de VMS. O argumento
  anterior era a célula de cena ser geometria proporcional, o que tornava a projeção uma multiplicação
  pela resolução do painel. Isso caiu junto com a projeção. Não existe um segundo modelo de cena porque
  não existe cena nenhuma do lado do equipamento, só uma fonte e uma janela em tela cheia.
- **Strategy nos eixos que têm duas implementações reais**, revisado em 13/08: **transporte do espelho**
  (RTSP servido pela plataforma contra HDMI cabeado) e codec da requisição (assinatura simples contra
  corpo cifrado em DES). O alvo de exibição **deixou de ser eixo**: a porta de cena tem uma implementação
  real, o adaptador do browser, porque o painel não renderiza cena. O portão de capacidade nunca foi
  strategy, é um `if` com dois desfechos.
- **Espelhar tem endpoint próprio, e projetar cena no painel é recusado.** O gesto do painel é tomar e
  liberar o espelho, que é recurso com ciclo de vida, então ele é `POST` e `DELETE` num recurso e não um
  booleano dentro da ativação de cena. Ativar cena com alvo videowall passa a ser recusa definitiva,
  apontando o gesto de espelho. O seletor já responde nesse caminho desde a PR #1453.
- **O espelhamento é de mão única**, do VMS para o painel. Composição montada direto no equipamento não
  tem representação do lado da plataforma, então não existe volta. Ler a lista de camadas serve para
  reconciliação e estado observável.
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
- **Requisito entra na seção 3.2 de `docs/modules/cameras.md`**, na faixa **`RF-VW-07` em diante**, no
  mesmo espaço de ID do VMS. **Revisado em 10/08**: antes ia em arquivo próprio `docs/modules/videowall.md`
  (`CTX-videowall`) com IDs `RF-VWP-*`, justamente porque o RF-7 contradizia o enquadramento org e
  system scoped daquele doc. Com o containment, o espaço de ID passa a declarar a relação, e a
  contradição do RF-7 se resolve na própria decisão de tenancy abaixo. A faixa já está reservada no
  doc; escrever os RF é o card 2440, que muda de forma mas continua valendo.
- **RF-7 (global) no schema, com a lacuna de escopo fechada em 10/08**: o **registro do equipamento
  segue global**, sem coluna de tenant, com comentário declarando que a ausência é o requisito e não
  esquecimento, unicidade por host e porta, e autoridade de escrita por duty administrativa verificada
  no banco. O que faltava era onde a tenancy entra, e a resposta é o **vínculo entre alvo e sistema**:
  a pergunta "quem pode dirigir este painel" só existe porque o gesto parte de uma cena, que é
  escopada, então é o vínculo que os caminhos de query escopados atravessam e nenhum repositório fica
  com dois regimes. Seguem rejeitadas a sentinela de organização global do mosaico e o `organizationId`
  nulável. **Revisado em 13/08**: o sistema fica denormalizado **na sessão de espelho**, não na fonte IPC
  nem no processador, e o vínculo deixa de ser só escopo para virar **controle de exposição**, porque a
  parede passa a mostrar o dado do sistema que o operador tem selecionado, numa sala com público.
- **`secretKey` cifrado** com o serviço de cifra do core-common, primeiro uso fora do
  `ms-organization`. A justificativa de texto puro da credencial de câmera não transfere: ONVIF
  converte a senha em digest no handshake, enquanto o `secretKey` entra cru na assinatura, e o raio de
  dano é o mural inteiro da sala de controle. O `pId` fica em claro no banco mas sai mascarado na
  resposta, porque no modo sem cifra ele é efetivamente o segredo.
- **Escrita não é retentada**: criar fonte e adicionar camada não são idempotentes, retry duplica, e
  mesmo trocar a fonte da camada, que é idempotente, produz troca visível na parede se reenviado em
  corrida. Zero retries em escrita, write-lock por processador, reconciliação por listagem. **Revisado em
  13/08**: o mesmo lease passa a ser o **dono do espelho**, sobrevivendo à requisição em vez de ser
  liberado no fim dela.
- **Front entra dentro do feature module do VMS** (a pasta `modules/videowall/` do Angular, que é
  justamente a do mosaico), não em módulo Angular irmão. **Revisado em 10/08**: antes era módulo novo
  `videowall-processor`. Continuam valendo os estados derivados só de dado real e a regra de que sem
  processador cadastrado não há grade desenhada, porque não se inventa 3x3. **Revisado em 13/08**: o front
  ganha responsabilidade nova, a captura da tela, e o argumento do containment fica mais forte, porque a
  captura sai da sessão do browser que esse módulo já é.

### Três lacunas de requisito achadas ao confrontar os RF com o contrato

- **Página web como fonte no mural**: o contrato pede "câmeras IP e páginas web", e isso não estava nos
  RF-1 a RF-7. **Fechada em 13/08, e a resposta é não**: o equipamento não renderiza página web em nenhum
  modelo da família. A interface web dele é o plano de controle, e não existe fonte HTML. A suspeita
  registrada aqui em 31/07, de que a página entraria por captura de uma workstation, estava certa, e virou
  o propósito da frente inteira. Detalhe em [[Pesquisa - transporte do espelhamento de tela]].
- **Estado observável do processador**: alcançabilidade, firmware lido, camadas conhecidas e frescor de
  cada informação. É pré-requisito do estado vazio honesto na tela, e não existia como requisito. Ganhou
  em 13/08 mais um item, o espelho vigente com dono e início, e a distinção entre espelho tomado e espelho
  de fato no ar.
- **Reproduções agendadas**: o contrato pede operações programadas. O recurso existe no firmware, mas não
  se sabe se é exposto pela Open API. **Parcialmente fechada em 13/08**: brilho agendado continua
  possível, exibição agendada não, porque sob espelhamento não há tela sem operador. Fica como não
  atendido, com o motivo.

## Relação com o VMS: containment, não reúso

Até 09/08 isto era descrito como reúso entre dois módulos. **Desde 10/08 é containment**, e desde 13/08 o
containment se sustenta por outro caminho: o painel é uma saída da **sessão** do VMS, não do modelo de
cena. O modelo de cena, layout e célula (`VideoWallScene`, `VideoWallSceneCell`, `EnumVideowallLayout`)
continua sendo o modelo do mosaico, e o painel simplesmente mostra o que o mosaico está desenhando. O
catálogo de câmeras e os perfis de stream continuam alimentando o mosaico, e **deixam de alimentar o
equipamento**: nenhuma URL RTSP de câmera é enviada ao painel, o que é ganho de segurança e não só de
simplificação.

Consequência prática de superfície: **tudo fica sob `/api/vms`**, com o equipamento em
`/api/vms/videowall/*`. Foi por isso que o renome do caminho tinha de vir antes do H9 nascer, o
namespace do pai precisa existir para o alvo morar debaixo dele. Ver [[VMS - Arquitetura e estratégias]].

## Desenho do frontend, fechado em 10/08

> [!important] Revisão de 13/08, a segunda do dia: a superfície virou uma só
> A rota de configuração morreu. O que sobrou depois do replanejamento (um formulário raro, um controle
> de brilho, uma leitura de estado e o gesto de espelhar) não sustenta uma página, então **tudo vive num
> dialog compartilhado** aberto pelo lançador radial sobre o mosaico, com quatro views: espelhar,
> processador, brilho e estado. Sem navegação interna: o arco é a navegação. A rota
> `/cameras/vms/videowall` e a page entregues na PR #1529 serão removidas pelo card 2437, e o formulário
> de cadastro entregue é reaproveitado como view. Em telefone o alvo de exibição não existe, porque o
> lançador já era oculto lá e captura de tela em telefone não é cenário do produto. Specs: `UF-024`
> (dialog), `UF-031` (espelhar com preview).

A superfície era **dupla** no desenho de 10/08, dividida entre configurar (rota própria com abas, seis, e
depois três) e operar (o lançador radial). O callout acima registra a fusão: sobrou só o operar, com o
configurar dentro do mesmo dialog.

O lançador existe porque a toolbar do VMS já tem onze controles e um menu de overflow que colapsa itens
por medição de largura: somar gestos ali empurraria tudo para o overflow e o gesto novo custaria dois
cliques dentro de um menu de reticências. Nenhum item sai da toolbar. Os itens do arco: espelhar, liberar,
brilho, estado e configurar, cada um abrindo o dialog na view correspondente; o indicador persistente de
espelho ativo vive no próprio lançador.

**Responsabilidade nova do front**: pedir a captura da tela ao browser, **mostrar o preview no dialog
antes de qualquer byte ir à parede**, e publicar só na confirmação. A ordem é regra: captura, preview,
tomada, publicação. Capturar é local e reversível; tomar é posse exclusiva, então o painel nunca fica
reservado a quem nega a captura ou desiste olhando o preview, e o preview é o momento de consciência da
exposição (RF-VW-20). Os dois estados que são do usuário e não do equipamento continuam: recusa do diálogo
de compartilhamento deixa o painel intocado, e encerrar pelo controle do browser libera o painel.

O menu radial é **primitivo compartilhado** em `libs/ui-shared`, não componente do módulo, porque a mesma
affordance é pedida pelo mapa do Painel de Operações e pelo mapa do modelo de tráfego. Reusa o overlay e o
hover do menu linear que já existe; o que é novo é a geometria do arco, deduzida do quadrante que o botão
ocupa na viewport.

Três descobertas ao escrever as specs, e nenhuma era óbvia no planejamento:

1. **Cena com edição não salva não era projetável**, porque o backend projetava a cena persistida e a
   parede mostraria uma versão diferente da que o operador estava vendo. **Vencida em 13/08, e vencida
   pelo lado bom**: com espelhamento a parede mostra exatamente a tela do operador, edição pendente
   incluída, então o problema deixa de existir. É o efeito colateral mais agradável da mudança de
   propósito.
2. **O containment dá preservação de estado de graça.** O serviço de edição do mosaico é escopado ao
   módulo Angular, e a rota de configuração vive no mesmo módulo, então ir configurar e voltar preserva a
   composição, e o guarda de descarte já libera a transição por comparação de prefixo. Num módulo irmão
   nada disso seria de graça, o injetor seria outro.
3. **A rota estática tem de vir antes da paramétrica de cena**, senão o caminho da configuração é
   capturado como se fosse uma cena chamada "videowall". Mesma armadilha que o backend resolve com a rota
   do picker, e só o teste de rota protege.

Nenhuma tela trabalha com mock: uma tela que desenha mural presumido é pior que uma tela vazia, porque o
operador decidiria olhando composição inventada. Oito cards, todos em `backlog` até o backend liberar, na
[[Attlas - Sprint 28]].

## Cuidado com o vocabulário

São três coisas distintas, e agora com nome estável:

1. **VMS (Video Monitoring System)** - o mosaico no browser, `ms-cameras` + front. Não comanda hardware. [[VMS]]
2. **NVR (Network Video Recorder)** - o gravador externo que recebe o stream primário e armazena. O Attlas não o dirige, só entrega stream (RF-INT-01, RNF-CAM-11). Era chamado de "VMS externo" até 10/08, e a CROSS-045 resolveu a colisão renomeando para NVR, que é o termo de mercado e não colide com nada.
3. **Videowall** - este documento. Processador físico que exibe numa parede de LED/monitores, com o Attlas como cliente da Open API. **É um alvo de exibição do VMS**, submódulo dele, e não um módulo paralelo: o item 1 é o sistema, o item 3 é uma das saídas do item 1. Desde 13/08 o que ele exibe é a tela da aplicação espelhada, não câmera nem cena.

A colisão que **permanece** é outra: no `ms-pmv`, VMS é Variable Message Sign, com cerca de 90 ocorrências
em testes. Essa se resolve por contexto, não por renome, porque é outro módulo, outro serviço e outro
vocabulário de tela.

## Relacionados

[[VMS]] · [[Pesquisa - transporte do espelhamento de tela]] · [[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)]] · [[SOFTWARE-2315 - Comparativo Attlas 25x26 - video wall]] · [[ms-cameras]] · [[Streaming]] · [[Cláusula 16.13 do contrato de Quito]]
