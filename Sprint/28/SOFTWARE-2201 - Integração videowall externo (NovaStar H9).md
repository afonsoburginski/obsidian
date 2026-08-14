---
tags:
  - attlas
  - card
  - sprint-28
card: SOFTWARE-2201
clickup: https://app.clickup.com/t/86ajj1zdg
lista_clickup: Sprint 28 (10/8/26 - 16/8/26), movido em 10/08
titulo: "[Back] Videowall externo: especificação do módulo (NovaStar H9)"
sprint: "[[Attlas - Sprint 28]]"
tamanho: 3 pts
status: comprometido na Sprint 28 (10/08 a 16/08, to do no ClickUp). Em 13/08 passou a carregar o replanejamento da regra de negócio do videowall, que deixa de projetar cena e passa a espelhar a tela da aplicação, e absorveu o 2440. Requisitos levantados em 15/07; daily de 31/07 acrescentou o RF-7 (gerenciamento global), o renome do mosaico para VMS e a confirmação do modelo H9 por foto; revisão de 10/08 fez o painel virar alvo de exibição do VMS; acesso ao equipamento (VM) segue a requisitar. Saiu do sem prazo em 10/08. **Em 14/08 passou a carregar a reconciliação com a cláusula 16.13 do contrato de Quito**: citação literal em `cameras.md`, tabela das doze obrigações, dois modos de exibição no painel, e RF-VW-14 e RF-VW-15 saindo de não atendidos.
atualizado: 2026-08-14
---

# SOFTWARE-2201 - Integração videowall externo (NovaStar H9)

Fazer o Attlas **comandar o videowall físico existente**, um processador **NovaStar Série H (H9)**, direto da consola por Ethernet/TCP-IP, sem interface intermediária nem dispositivo dedicado. Exigido pelo contrato de Quito (módulo de Gestão de Videowall).

> [!important] Revisão de 14/08: a cláusula 16.13 do contrato chegou, e o painel ganhou dois modos
> O user trouxe o texto literal da cláusula 16.13, "Módulo de gestión de videowall", que era exatamente a
> lacuna de procedência declarada na seção 3.2 de `cameras.md`: os requisitos estavam parafraseados a partir
> do levantamento de 15/07 e do refino de 31/07, e a nota dizia que fechar a lacuna exigia obter a cláusula.
> Ela está citada literalmente agora, em espanhol, com as doze obrigações mapeadas uma a uma.
>
> O primeiro parágrafo da cláusula exige ação automatizada no painel, vinda de plano de resposta e de
> operação programada, e espelhamento de tela não atende isso: plano executa sem operador na frente, e sem
> operador não existe tela para espelhar. O painel passa a ter **modo espelho**, com operador, e **modo de
> projeção nativa**, sem operador, e nos dois a fonte é servida pela plataforma, nunca puxada da câmera, o
> que preserva o ganho de domínio do replanejamento do dia 13. Plano preempta o operador, com registro e
> aviso; exibição programada cede a ele.
>
> Sobra uma lacuna declarada só: página web na parede sem operador, porque nenhum card do chassi renderiza
> HTML. `RF-VW-13` continua fora do escopo, agora com argumento novo, porque o antigo tinha ficado falso.
> A reconciliação inteira está na PR #1592, que ganhou também a citação e a tabela de obrigações.

Documentação da Open API: <https://openapi.novastar.tech/en/h/>.

> [!important] Revisão de 13/08: este card passa a carregar o replanejamento da regra de negócio
> Decisão do user. **O propósito do videowall não é stremar câmera direto por RTSP, é compartilhar a tela
> da aplicação Attlas do cliente que está acessando o sistema.** A parede exibe a captura dessa tela como
> fonte única numa janela em tela cheia, e quem compõe continua sendo o Attlas.
>
> O achado que obrigou a decisão de transporte: **o H9 não aceita página web nem URL como fonte**, a
> interface web dele é o plano de controle. A tela só chega como vídeo codificado. Transporte escolhido:
> o browser captura com `getDisplayMedia`, publica por WHIP no MediaMTX que já está no stack, e o
> equipamento puxa RTSP unicast pelo card `H_2xRJ45 IP`, com H.264 fixado na oferta para não pagar
> transcodificação. NDI ficou fora porque o card entrou na linha H9 depois da entrega do equipamento de
> Quito e porque a descoberta dele não atravessa sub-rede. Comparação completa em
> [[Pesquisa - transporte do espelhamento de tela]].
>
> **O que este card entrega**: a revisão dos requisitos em `docs/modules/cameras.md`, da CROSS-045, do
> MOD-016, do MOD-006, da SPEC do `ms-cameras`, das atômicas de backend e das notas deste vault. Absorve
> o [[SOFTWARE-2440 - Requisitos do videowall externo em arquivo próprio|2440]].
>
> **O que morreu**: publicar câmera como fonte, página web como fonte, gestão de janelas e preset de
> composição. **O que ficou como não atendido, com o motivo escrito**: cena no painel por plano de resposta
> e exibição programada por horário, porque sob espelhamento nada aparece na parede sem um operador com
> sessão aberta.
>
> **O que ninguém precisa desfazer**: não existe uma linha de código do adaptador NovaStar no repo. O que
> está mergeado é a porta de cena com o adaptador do browser (PR #1453) e o cadastro do processador
> (SOFTWARE-2432, em revisão), e os dois continuam válidos.

## A revisão de 13/08 no repositório

Escrita na branch `cameras/docs/SOFTWARE-2201`, base `develop`, sem código de produção.

| Documento | O que mudou |
| --- | --- |
| `docs/modules/cameras.md` | faixa `RF-VW-07` a `RF-VW-19`, versão 1.2. Retirados o 10 (página web), o 11 (janelas) e o 13 (preset); reescritos o 09 (a tela como fonte única) e o 12 (espelhamento); novos o 18 (dono exclusivo) e o 19 (exposição da parede). `RNF-CAM-18` (formato fixado, sem conversão) e `RNF-CAM-19` (endereço do espelho é segredo) nasceram aqui |
| `CROSS-045` | a justificativa de containment era a célula ser geometria normalizada, e caiu junto com a projeção de cena. Agora o containment se sustenta por o painel não ter composição própria, e a tenancy passou a viver na sessão de espelhamento |
| `MOD-016` | reescrito. Saíram a projeção de geometria e as capacidades de preset; ficaram `ipc.*` e `layer.*`, porque o espelho é registrado como fonte e apontado por uma camada. Ganhou a separação entre o que o equipamento aceita, que é fato confirmado pela especificação do fabricante, e o caminho da Open API, que segue presumido |
| `MOD-006` fase 4 e `SPEC.md` | rota de fontes, de layout e de presets saíram; entraram `POST` e `DELETE` de espelho e o `GET` de estado. Ativar cena com alvo videowall passou a ser recusa definitiva, com código estável, mantendo o valor do enum por compatibilidade |
| Atômicas de backend | `INT-013` e `INT-014` deletadas. Criadas `INT-016` (a tela como fonte única e a camada em tela cheia), `UC-050` (tomar e liberar, com dono exclusivo) e `PROJ-019` (expiração de espelho órfão). Revisadas `UC-049`, `INT-012` e `INT-015` |
| `MOD-001-videowall` do frontend | fase 9 com seis abas viraram três, `UF-027` e `UF-028` retiradas, `UF-031` criada para a captura da tela e a sessão de espelho |

Duas escolhas de identificador que valem registrar, porque o guard de spec cobrou: `PROJ-018` já estava
reservado por uma PR aberta, então a expiração ficou como `PROJ-019`. E a UF nova é a `UF-031`, porque a
numeração do frontend é por feature module.

## Cuidado: são três "videowall" diferentes

Não confundir. O 2201 é só o terceiro.

1. **Video Wall mosaico no browser** (o que já existe). Módulo `ms-cameras/video-wall` + contratos `libs/contracts/videowall`. Desenha os feeds como uma grade HLS **dentro do navegador** do operador. Cenas, layouts e células no Postgres, PTZ inline e rotação são 100% frontend, e o `activate` só grava um booleano `isActive`. **Não comanda nenhum hardware.**
2. **VMS externo** (sistema de gravação). Recebe o stream primário de alta resolução e **armazena**. O Attlas não dirige o VMS, é só um destino do stream, fronteira de domínio documentada.
3. **NovaStar H9** (este card). **Processador de videowall físico** que aciona uma parede de LED/monitores. O Attlas vira **cliente** da Open API do equipamento e manda nele: a fonte única do espelho, a camada em tela cheia, o brilho e a leitura de estado. Desde 13/08 não manda mais janela, fonte de câmera nem preset. **Não existe uma linha de código NovaStar/H9 no repo hoje.**

O eixo que separa: onde o vídeo aparece e quem manda. (1) desenha no browser, (2) recebe e grava, (3) o Attlas dirige um processador que projeta numa parede física. Só (3) precisa de um adaptador de saída novo.

> [!important] Revisão de 10/08: (3) é alvo de exibição de (1), não um módulo paralelo
> Decisão do user. (1) e (3) deixam de ser irmãos: o VMS é o sistema, e o painel físico é uma das
> **saídas** dele. Consequências para a especificação deste card:
>
> - O módulo mora em `src/video-wall/targets/novastar-h9/`, submódulo do VMS, e não em
>   `src/videowall-processor/`.
> - A superfície pública fica sob `/api/vms/videowall/*`, e **projetar cena não ganha endpoint
>   próprio**: é a ativação de cena com o alvo pedido, resolvida por strategy.
> - Strategy nos três eixos com duas implementações reais: alvo de exibição, codec da requisição e
>   portão de capacidade. Fornecedor é porta, não strategy, porque só tem uma implementação.
> - Requisito na faixa `RF-VW-07` em diante dentro da seção 3.2 de `cameras.md`, em vez de `RF-VWP-*`
>   em arquivo próprio (ver [[SOFTWARE-2440 - Requisitos do videowall externo em arquivo próprio|2440]]).
> - Tenancy: registro do equipamento global sem coluna de tenant, e a tenancy no **vínculo entre alvo e
>   sistema**, o que fecha a lacuna que o RF-7 deixava como escopo a detalhar.
>
> O que sustenta tudo isso é a célula de cena já ser geometria proporcional, então projetar no painel é
> multiplicar pela resolução do equipamento. Aplicado nas specs em 10/08 pela PR
> [#1438](https://github.com/atmanadmin/attlas-2026/pull/1438); desenho completo em
> [[Videowall externo (NovaStar H9)]].

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

Revisado em 13/08 conforme o espelhamento.

| Capacidade da API | Para que serve com o espelhamento |
| --- | --- |
| `screen/writeShowId`, `screen/brightness` | selecionar tela ativa, brilho do mural |
| `layer/add`, `layer/setInfo`, `layer/changeSource`, `layer/delete`, `layer/list` | a camada única em tela cheia: criar, dimensionar, apontar para o espelho, remover na liberação e reler para reconciliar |
| `ipc/create`, `ipc/update`, `ipc/delete` | registrar **o caminho do espelho** como fonte de rede, uma por processador. A Open API não tem fonte de rede que não seja fonte IPC |
| `preset/create`, `preset/load`, `preset/read` | **fora do escopo.** Preset é composição salva no equipamento, e a plataforma deixou de compor |
| `schedule` (a validar) | brilho agendado. Exibição agendada caiu com a projeção de cena |

## Requisitos

Numeração autoritativa em `docs/modules/cameras.md`, seção 3.2, faixa `RF-VW-07` em diante. A lista abaixo
é o resumo revisado em 13/08, e substitui a numeração local `RF-1` a `RF-7` que este card usava.

- **Cadastro do processador**: host, porta, `pId`/`secretKey`, modelo, firmware, resolução do painel e o
  **transporte do espelho**, declarado e nunca detectado.
- **Espelho da tela como fonte do painel**: a tela de um cliente autenticado é a única fonte que a
  plataforma publica no equipamento. O operador autoriza o espelhamento da própria sessão, sem informar
  endereço nem credencial de fonte.
- **Janela única em tela cheia**: a plataforma não gerencia janelas. Compor a parede é operação do
  equipamento, na interface dele.
- **Sessão de espelhamento com dono**: exclusiva, um cliente por painel, com tomar, liberar e tomada
  administrativa registrada. Sem dono, a parede não tem conteúdo da plataforma.
- **Brilho** dentro da faixa que o equipamento aceita.
- **Estado observável**: alcance, firmware lido, camadas reportadas, brilho vigente e o espelho vigente com
  dono e início, cada um com frescor próprio. Espelho tomado e espelho de fato no ar são coisas distintas.
- **Exposição do que a parede mostra**: a parede passa a exibir tudo o que o operador vê, numa sala com
  público, então o vínculo entre sistema e painel é controle de exposição e liberar deixa a parede sem
  conteúdo em vez de congelar a última imagem.
- **Gerenciamento global** do equipamento, sem coluna de tenant, com a tenancy no vínculo entre painel e
  sistema. Era o RF-7 da daily de 31/07, e o escopo dele ficou fechado em 10/08.
- **RNF**: o **comando** vai direto por TCP-IP sem intermediário, e o **vídeo** do espelho é produzido e
  servido pela própria plataforma, o que não introduz equipamento novo na sala. Mais piso de resolução e
  bitrate para o texto ser legível na parede, o codec imposto pelo card, e a ausência de redundância de
  entrada declarada em vez de mascarada.

**Não atendidos, com o motivo escrito**: cena no painel por plano de resposta e exibição programada por
horário. Plano executa sem operador na frente, e sob espelhamento não há tela para espelhar. Dependem de um
renderizador sem operador, que a plataforma não tem.

## O que é novo vs o que reusa

Revisado em 13/08.

**Novo** (em `ms-cameras`, `src/video-wall/targets/novastar-h9/`):

- Cliente da NovaStar Open API dirigido pelo catálogo de capacidades, com assinatura MD5 e DES opcional.
- Sessão de espelhamento com dono no lease, tomando e liberando o painel.
- Registro do caminho do espelho como fonte única e a camada em tela cheia apontada para ela.
- Worker que expira espelho órfão pela ausência de publicação.
- Contratos novos em `@attlas/contracts` para o processador, o transporte e a sessão de espelho.
- No frontend: a captura da tela, publicar, e tratar recusa e encerramento pelo controle do browser.

**Reusa**:

- **O MediaMTX que já serve o pipeline de HLS deste serviço**, com o mesmo cliente de control API. É o
  argumento novo do containment, e substitui o argumento antigo, que era o resolver de fonte RTSP.
- A porta de cena, o seletor e o adaptador do browser, já mergeados na PR #1453, que continuam servindo o
  mosaico.
- O lease de dispositivo, que passa a ser o dono do espelho.
- `ms-cameras` como backend único do domínio, com Kong/JWT e observabilidade.

**O que deixou de ser reúso**: o catálogo de câmeras e os perfis de stream continuam alimentando o mosaico
e **deixam de alimentar o equipamento**. Nenhuma URL RTSP de câmera é enviada ao painel, o que retira desta
frente a superfície de segurança mais delicada que ela tinha.

## Validações em aberto (não bloqueiam o escopo)

- ~~Confirmar modelo do processador em Quito~~ **confirmado em 31/07 por foto do equipamento**: chassi "H9 VIDEO WALL SPLICER", acta de entrega da EPMMOP/Quito (VD-12407-80-10, emissão 2024-07-09) descrevendo `PROCESADOR DE VIDEO WALL H9`, patrimônio `N10P 45815` / código `00048815`. Firmware lido na tela como `V1.9.7.1` (dígito do meio borrado, pode ser `V1.5.7.1`), **a confirmar na máquina**; equipamento de 2024, então a premissa de firmware recente se sustenta. Foto e detalhes em [[Videowall externo (NovaStar H9)]].
- Confirmar OpenAPI Management habilitado e obter `pId`/`secretKey`, e definir corpo cifrado (DES) ou texto puro. **Depende do acesso**: em 31/07 ficou de requisitar uma VM que alcance o equipamento (o gestor vai pedir acesso remoto a uma das máquinas que já têm acesso).
- A doc oficial é uma SPA em JS: o protocolo e a auth saem por `doc-7540897`, mas os paths exatos de layer/preset/ipc/brightness precisam ser travados abrindo a doc no browser ou batendo no equipamento.
- Agendamento: o recurso existe no firmware, mas não está claro se é exposto pela Open API ou só pela UI. **Parcialmente fechado em 13/08**: vale para brilho, e exibição agendada caiu com a projeção de cena.
- ~~Páginas web no mural~~ **fechado em 13/08, e a resposta é não**: nenhum modelo da família renderiza página web, a interface web do equipamento é o plano de controle. A suspeita registrada aqui, de que a página entraria por captura de uma workstation, estava certa e virou o propósito da frente inteira.
- **Inventário de cards do chassi de Quito**: nenhum documento disponível diz quais cards de entrada estão instalados, e a foto mostra só o painel frontal. O card `H_2xRJ45 IP` é o mais provável e é o que o transporte escolhido exige, mas confirma-se lendo o monitoramento de entradas na interface do equipamento. Bloqueio de comissionamento, não de spec.
- Existe um protocolo de controle legado (token, `admin/admin`, `/api/preset/play`) usado por integrações de terceiros. Ficar no OpenAPI (`/open/api`), que é o pedido.

## Referências

- Domínio de câmeras e Video Wall browser: `docs/modules/cameras.md` e `ms-cameras/docs` MOD-006.
- Contexto do contrato de Quito e viabilidade da integração: memória do projeto (videowall H9).
