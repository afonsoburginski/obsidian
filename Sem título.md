Estado de funcionamento atual:
Ao realizar o espelhamento de tela e enivar ao painel via floating button, é possivel visualizar (se estiver na mesma aba), no player de videowall.

O problema surge quando não é possivel fazer a mesma coisa com duas abas diferentes do sistema, uma espelhando tela e outra assistindo.

Preciso que o canal que está stremando a tela, crie uma assinatura broadcast ou socket ou de webrtc mesmo, para que o videowall possa ver esse video mesmo em outra aba. 

(creio que o mediamtmx ja tenha recursos que possamos utilizar para resolver isto com rooms)


Contexto do repositório (leia antes de propor qualquer coisa)

Branch cameras/feat/SOFTWARE-2519. Módulo videowall do web-attlas, área display-target.

O que JÁ existe e deve ser reusado, não reescrito:
- vms-display-target-dialog/vms-display-target-dialog.component.html
  hospeda <app-videowall-mirror-view />. É este o "dialog de espelhamento".
- videowall-mirror-view/ (UF-031, standalone: true por exceção documentada no próprio arquivo)
  Estados em videowall-mirror-status.enum.ts: READY, PREVIEW, SENDING, MIRRORING,
  DENIED, HELD, ERROR. Não desenha vídeo, e o comentário do topo explica por quê:
  a captura é a própria aba, renderizar dentro dela é recursão. Isso NÃO pode regredir.
- videowall-panel-stage/ (UF-032, standalone: false, declarado no VideowallDisplayTargetModule)
  Já monta a grade a partir de shares, JÁ tem resize por pointer e por teclado
  (onResizeStart/Move/End/Keydown) e JÁ commita em processorService.updateMirrorShare.
  Só resize de spans; não move gridColumn/gridRow, não troca duas telas de lugar.
  Renderiza WHEP por tile, e só sob playground (filtra playbackPath !== undefined).
- videowall-layout-picker/ (UF-007) com EnumVideowallLayout: GRID_1X1..GRID_6X6 e CUSTOM.
  Overlay CDK, seleção idempotente. Hoje serve ao mosaico do VMS, não à parede.
- videowall-occupancy-live.service.ts: a ocupação chega por WebSocket push
  (videowall:occupancy:changed). videowall-processor-state.service.ts guarda o estado.
- videowall-groups-dialog/ e videowall-groups.service.ts (UC-052): salvar, listar e apagar
  arranjos nomeados da parede.
- utils/videowall-stage-grid.util.ts: stageGridLines, clampStageSpan, stageSpanFromDrag.
- constants/videowall-stage.constants.ts: VIDEOWALL_STAGE_GRID_MAX_LINES = 16.

Contratos em libs/contracts/src/lib/videowall/:
- IVideowallOccupancy { ownerKind, ownerId, ownerName, since, sceneId, playbackPath?, shares[] }
- IVideowallMirrorShare { id, gridColumn, gridRow, columnSpan, rowSpan, isActive, playbackPath? }
- IUpdateVideowallMirrorShareRequest { gridColumn?, gridRow?, columnSpan?, rowSpan?, isActive? }
- ITakeVideowallMirrorRequest { shareId?, takeover? }
- IVideowallGroup / IVideowallGroupTile, EnumVideowallLayout, EnumVideowallOccupantKind.
Especificações: UC-050 (tomar e liberar), UC-051 (projetar cena, arbit
UC-052 (curar shares e grupos, endpoints na seção 7), UF-031, UF-032, INT-016, INT-017.

Objetivo
Hoje o operador espelha às cegas: aperta enviar e descobre depois onde a tela caiu e quem
ele atrapalhou. Quero que o dialog de espelhamento mostre a parede com
escolher o destino antes de enviar, e deixe rearranjar a parede ali mesmo.

Entregas

1. Player da parede dentro do dialog, esquemático, em HTML e CSS puros
   Sem vídeo, sem WHEP, sem player. São caixas desenhadas a partir da ocupação viva, na
   proporção real do painel (panelWidth/panelHeight, como o stage já f
   Motivo, e ele precisa estar comentado no código: dentro do dialog a captura é a própria
   aba, então qualquer preview de vídeo é recursivo e não informa nada
   a UF-031 já documenta.
   O componente novo vive ao lado do videowall-panel-stage e compartilha com ele a geometria
   (utils/videowall-stage-grid.util.ts). Se a lógica de grade divergir
   para o util em vez de duplicar. Atenção ao empacotamento: o mirror-view é standalone e o
   stage não é, então o componente novo precisa resolver isso explicitamente, não por acidente.

2. Estados visuais por slot, com padrão de cor documentado.
   No mínimo: livre, ocupado por outro, ocupado pelo próprio operador, selecionado como destino,
   e oculto (isActive: false). Cor nunca sozinha: acompanhar de ícone do catalog.ts de ui-icons
   e de rótulo textual, com contraste AA. Estados vêm de tokens do des

3. Escolha do slot de destino antes do envio.
   Clique e teclado (setas para navegar, Enter para escolher, foco visível). Escolher um slot
   ocupado é permitido e abre confirmação explícita que nomeia quem sa
   O envio (mirror.send) passa a levar o destino escolhido junto, e não pode existir uma janela
   onde a tela aparece no lugar errado na parede e só depois pula para

4. Dropdown de presets de layout da parede, no padrão visual do layout picker do VMS.
   Inclui o caso pedido: mandar a própria tela em 1x1, ocupando a pare
   Aplicar um preset recalcula o retângulo de todas as telas da parede, então isso desloca
   telas de outras pessoas e exige confirmação nomeando o efeito.
   Presets fixos e grupos salvos (UC-052) aparecem no mesmo dropdown, em seções separadas,
   porque para o operador é a mesma pergunta: "que arranjo eu quero agora".

5. Drag and drop no player, além do resize que já existe.
   Arrastar move a tela de slot; soltar sobre uma tela ocupada troca a
   Contrato de payload e comportamento no padrão de videowall-drag-payload.types.ts e
   utils/layout-reflow.ts do mosaico. Limite de 1..16 por eixo, o mesm
   Enquanto o ponteiro arrasta, o desenho é local; a verdade continua sendo a ocupação que
   chega pelo push, exatamente como resizePreview já faz hoje.

6. Amarração nativa NovaStar H9 desde já, mesmo em playground.
   Cuidado, e é por isso que este item está por último: a INT-014, que previa preset.create,
   preset.load e preset.read no equipamento, está marcada como superseded desde 14/08 e o
   motivo declarado é que a plataforma NÃO autora composição no equipamento (RF-VW-13 fora de
   escopo). O cabeçalho dela aponta para uma INT-018 que hoje é outra
   então trate esse ponteiro como quebrado e siga o caminho vivo: INT-017 mais UC-051 seção 3.1.
   Ou seja: "preset" nesta entrega é conceito da plataforma, nunca obj
   Cada gesto da interface tem que descer como reconciliação de camada, layer.list primeiro,
   depois só o que falta, layerId derivado do slot (<prefixo>-r<linha>
   com layer.changeSource em vez de recriar, e nunca escrever sem ler antes.
   Onde o backend ainda não tiver o comando, declare o contrato esperado na spec e falhe de
   forma honesta na tela. Nunca simule sucesso.

Lacunas reais que encontrei. Traga a decisão para mim antes de implementar, não escolha sozinho.

a) Terminologia. Você vai ler "cena" no meu pedido, mas no domínio "cena" já é a cena do VMS
   (UC-016, VideoWallScene), aquilo que a UC-051 projeta como ocupação
   descrevi é slot da parede, que hoje é o retângulo de um share, e no H9 é camada. Feche um
   termo único e use nas três camadas (código, spec, UI). Não reaprove
   coisas.

b) A parede tem um ocupante de cada vez (RF-VW-19, matriz da UC-051 seção 4), e IVideowallOccupancy
   tem UM ownerId. Já IVideowallMirrorShare não tem dono nenhum. Então "slot em uso por fulano"
   não é representável no contrato de hoje. Ou o meu pedido implica vá
   parede (mudança de modelo, não de tela), ou os slots são todos do mesmo dono e a cor de
   "ocupado por outro" só faz sentido no momento da tomada. Decida e me diga qual, porque isso
   define se entra campo aditivo no share ou não.

c) Tomar e sobrescrever hoje são coisas diferentes e com gates diferentes. UC-050 exige
   autoridade administrativa para deslocar dono. BR-VWM-012 da UC-052 diz o contrário para
   curadoria: qualquer membro do sistema pode mexer no arranjo, inclusive ocultar a tela de
   outro, porque "o arranjo é da sala". Sobrescrever um slot ocupado c

d) ITakeVideowallMirrorRequest não aceita retângulo de destino. Escolh
   pede campo aditivo no take, ou vira take seguido de PATCH, que são duas idas e um instante
   com a tela no lugar errado, visível na parede. Prefiro o campo adit

e) Não existe escrita em lote. Aplicar preset ou trocar duas telas vir
   e cada um dispara um push de ocupação. Ou aceitamos o estado intermediário aparecendo na
   parede, ou entra endpoint de arranjo em lote no ms-cameras. Sua recomendação, com o custo.

f) Sistemas de coordenadas divergem: IVideowallCell usa row/col base zero, IVideowallMirrorShare
   usa gridColumn/gridRow base um (o CSS já consome assim). Não misture ao reusar o drag do mosaico.

Restrições inegociáveis
- Realtime por WebSocket e broadcast. Polling é proibido, inclusive co
  disfarçado de refetch em cadência fixa.
- Zero mock. Dado sempre de endpoint real. Sem dado, estado vazio hone
  inventado nem controle desabilitado sem explicação.
- Angular 21 no padrão do módulo: signals, computed, OnPush, inject, c
  Zard UI para primitivas e Font Awesome PRO por chave do catalog.ts, nunca ícone solto.
- i18n obrigatório em libs/contracts/src/lib/i18n/locales/<locale>/vms
  namespace que a tela já usa (vms.target.*, vms.mirror.*). Nenhuma string pt-BR no TS ou HTML.
- Imports por alias (@/..., @attlas/..., @web-attlas/...). Nada de caminho relativo profundo.
- Erros ramificam por errorCode, nunca por mensagem. Reuse VideowallGr
  constantes de erro de mirror e projection que já existem em contracts.
- Comentário só onde o comment-guide justifica, com referência de spec no formato
  <ID> secao N (DD-*) - slug em en-US. Comentário que parafraseia códi
- Não rodar test, lint, build nem docker localmente. O CI valida.

Ordem de trabalho
1. Responda as seis lacunas acima com recomendação e custo, e espere minha decisão.
2. Escreva ou atualize a spec atômica (UF-031 e UF-032, ou UF nova se não couber) com fluxo,
   estados, contratos consumidos, erros e critérios de aceite. Me most
3. Só depois implemente, um commit com footer Spec: <ID>.

Critério de pronto
Escolher slot, sobrescrever com confirmação, trocar preset, arrastar e trocar duas telas de
lugar, tudo refletido nas outras abas pelo push de ocupação, sem regressão nos estados
DENIED, HELD e ERROR do espelho, e com teste de integração cobrindo ca
captura, slot tomado no meio do gesto e erro do processador.

O ganho maior sobre a primeira versão é o item 6 e as lacunas b, c, d:ntar seleção de slot em cima de um contrato que não tem dono por slot, e ia mandar comando de preset para um equipamento onde presets foram deliberadamente cortados do escopo.

✻ Brewed for 3m 3s
INT-014 (layers e presets no NovaStar H9), INT-016 (tela do console como fonte).

Objetivo
Transformar a view de espelhamento em uma escolha visual de destino: o operador vê o próprio
videowall como layout, escolhe em qual cena vai espelhar, e envia. Hoj

Entregas
1. Player do videowall dentro do dialog, como layout (grid de cenas em
   espelhando a ocupação real vinda do occupancy live. Cada cena mostra quem ocupa
   (nome da câmera ou do operador que espelha).
2. Estados de cor por cena, com token do design system e contraste acessível:
   livre, ocupada por outro, ocupada pelo próprio operador, selecionada como destino.
   Não usar cor como único sinal: acompanhar de ícone do catálogo ui-i
3. Seleção de cena de destino, com clique e teclado. Cena ocupada é selecionável e dispara
   confirmação explícita de sobrescrita, dizendo quem será deslocado a
4. Dropdown de presets de layout do videowall dentro do dialog, no mesmo padrão visual do
   layout picker do VMS. Reusar o componente existente se ele couber;
   a parte comum em vez de duplicar. Inclui o caso de mandar a própria tela em tela cheia
   (preset 1x1) trocando o layout do videowall no ato do envio.
5. No player, grid redimensionável e drag and drop entre cenas, movend
   com o mesmo contrato de payload e o mesmo reflow já usados no mosaico do VMS.
6. Mapeamento nativo NovaStar H9 desde já, mesmo em playground: cada gesto da interface
   (trocar preset, mover cena, sobrescrever, redimensionar) precisa na
   comando correspondente do processador conforme INT-014 e UC-051. Onde o comando ainda
   não existir no backend, declarar o contrato esperado na spec e falhar de forma honesta
   na interface, nunca simular sucesso.

Restrições
- Realtime por WebSocket e broadcast. Polling é proibido, inclusive co
  em cadência fixa.
- Zero mock. Dado sempre de endpoint real; sem dado, estado vazio honesto, não controle
  desabilitado nem placeholder inventado.
- Angular 21: standalone: false no padrão do módulo, signals, OnPush, inject, control flow novo,
  strict. Zard UI para primitivas, Font Awesome PRO por chave do catalog.ts de ui-icons.
- i18n obrigatório: chaves em libs/contracts/src/lib/i18n/locales/<loc
(@/..., @attlas/..., @web-attlas/...), nunca caminho relativo profundo.
- Comentários seguindo comment-guide, com referência de spec no formato
  <ID> secao N (DD-*) - slug em en-US.
- Não rodar test, lint, build nem docker local. O CI valida.

Antes de codar
Atualizar ou criar a spec atômica correspondente (UF-031 e UF-032, ou UF nova se o escopo
não couber nelas) com fluxo, estados, contratos consumidos e critérios de aceite, e me mostrar
o diff da spec para aprovação. Só depois implementar.

Decisões que preciso que você levante comigo, não assuma
- "Cena" aqui é janela do H9 (layer/preset) ou célula lógica do nosso grid? Definir o termo
  único e usá-lo no código, na spec e na UI.
- Sobrescrever cena ocupada exige autoridade administrativa (como a tomada do HELD em UF-031)
  ou qualquer operador do sistema pode?
- Trocar o preset de layout afeta a parede inteira e todos os ocupantes. Isso pode ser feito
  por qualquer um que esteja espelhando, ou é ação de curadoria restrita?
- Redimensionar e arrastar persistem no processador na hora, ou só no envio confirmado?

Critério de pronto
Espelhamento com cena escolhida, sobrescrita confirmada, preset trocado e cena movida por
drag and drop, tudo refletido na ocupação que chega nas outras abas por WebSocket, com teste
de integração cobrindo o caminho feliz e a recusa de captura, a cena tomada e o erro do
processador.

O que mudei: troquei descrição solta por âncoras de arquivo e spec reais, separei as 6 entregas com critério de aceite, subi as suas regras permanentes (sem mock, sem polling, sem build local, i18n, alias) para dentro do prompt, e transformei as quatro ambiguidades que achei em perguntas explícitas em vez de deixar o agente adivinhar. A maior delas é o significado de "cena", que muda o mapeamento H9 inteiro.

✻ Brewed for 1m 42s

❯ leia de novo e melhore o maximo possível: No dialog de espelhamento:
  Ter o player do videowall (como layout), com as cenas em html, e padrões de cores para os disponíveis e em uso.

  O usuario que está espelhando pode escolher em qual cena ele quer espe uma cena que está ocupada se quiser.

  Ele pode modificar o layout de cenas do videowall (precisamos de um dropdown com alguns presets, como o VMS já tem). Por exemplo ele pode querer enviar a tela dele e exibir em tela cheia no videowall se quiser.

  Já no player do videowall, o grid pode ser resizable, e precisamos implementar drag and drop para mover de um lado ao outro e substituir no player. (ja considerar implementação nativa com o novastar h9, por mais que estamos em playground).

  Ran 12 shell commands

Reli o código de verdade desta vez. Achei três coisas que mudam o prompt: a INT-014 que citei antes está superseded (presets no equipamento foram cortados por decisão de domínio), o videowall-panel-stage já faz resize e já commita via PATCH, e "cena" no domínio já significa outra coisa (cena do VMS, UC-016). O prompt abaixo é reescrito em cima disso.

Contexto do repositório (leia antes de propor qualquer coisa)

Branch cameras/feat/SOFTWARE-2519. Módulo videowall do web-attlas, área display-target.

O que JÁ existe e deve ser reusado, não reescrito:
- vms-display-target-dialog/vms-display-target-dialog.component.html
  hospeda <app-videowall-mirror-view />. É este o "dialog de espelhamento".
- videowall-mirror-view/ (UF-031, standalone: true por exceção documentada no próprio arquivo)
  Estados em videowall-mirror-status.enum.ts: READY, PREVIEW, SENDING, MIRRORING,
  DENIED, HELD, ERROR. Não desenha vídeo, e o comentário do topo explica por quê:
  a captura é a própria aba, renderizar dentro dela é recursão. Isso NÃO pode regredir.
- videowall-panel-stage/ (UF-032, standalone: false, declarado no VideowallDisplayTargetModule)
  Já monta a grade a partir de shares, JÁ tem resize por pointer e por teclado
  (onResizeStart/Move/End/Keydown) e JÁ commita em processorService.up
  Só resize de spans; não move gridColumn/gridRow, não troca duas telas de lugar.
  Renderiza WHEP por tile, e só sob playground (filtra playbackPath !== undefined).
- videowall-layout-picker/ (UF-007) com EnumVideowallLayout: GRID_1X1.
  DENIED, HELD, ERROR. Não desenha vídeo, e o comentário do topo explica por quê:
  a captura é a própria aba, renderizar dentro dela é recursão. Isso NÃO pode regredir.
- videowall-panel-stage/ (UF-032, standalone: false, declarado no Vide
  Já monta a grade a partir de shares, JÁ tem resize por pointer e por teclado
  (onResizeStart/Move/End/Keydown) e JÁ commita em processorService.updateMirrorShare.
  Só resize de spans; não move gridColumn/gridRow, não troca duas telas de lugar.
  Renderiza WHEP por tile, e só sob playground (filtra playbackPath !== undefined).
- videowall-layout-picker/ (UF-007) com EnumVideowallLayout: GRID_1X1..GRID_6X6 e CUSTOM.
  Overlay CDK, seleção idempotente. Hoje serve ao mosaico do VMS, não à parede.
- videowall-occupancy-live.service.ts: a ocupação chega por WebSocket push
  (videowall:occupancy:changed). videowall-processor-state.service.ts guarda o estado.
- videowall-groups-dialog/ e videowall-groups.service.ts (UC-052): salvar, listar e apagar
  arranjos nomeados da parede.
- utils/videowall-stage-grid.util.ts: stageGridLines, clampStageSpan, stageSpanFromDrag.
- constants/videowall-stage.constants.ts: VIDEOWALL_STAGE_GRID_MAX_LINES = 16.

Contratos em libs/contracts/src/lib/videowall/:
- IVideowallOccupancy { ownerKind, ownerId, ownerName, since, sceneId, playbackPath?, shares[] }
- IVideowallMirrorShare { id, gridColumn, gridRow, columnSpan, rowSpan, isActive, playbackPath? }
- IUpdateVideowallMirrorShareRequest { gridColumn?, gridRow?, columnSpan?, rowSpan?, isActive? }
- ITakeVideowallMirrorRequest { shareId?, takeover? }
- IVideowallGroup / IVideowallGroupTile, EnumVideowallLayout, EnumVideowallOccupantKind.
Especificações: UC-050 (tomar e liberar), UC-051 (projetar cena, arbitragem da parede),
UC-052 (curar shares e grupos, endpoints na seção 7), UF-031, UF-032,

Objetivo
Hoje o operador espelha às cegas: aperta enviar e descobre depois onde
ele atrapalhou. Quero que o dialog de espelhamento mostre a parede como layout, deixe ele
escolher o destino antes de enviar, e deixe rearranjar a parede ali mesmo.

Entregas

1. Player da parede dentro do dialog, esquemático, em HTML e CSS puros
   Sem vídeo, sem WHEP, sem player. São caixas desenhadas a partir da ocupação viva, na
   proporção real do painel (panelWidth/panelHeight, como o stage já faz com aspect-ratio).
   Motivo, e ele precisa estar comentado no código: dentro do dialog a captura é a própria
   aba, então qualquer preview de vídeo é recursivo e não informa nada. É a mesma razão que
   a UF-031 já documenta.
   O componente novo vive ao lado do videowall-panel-stage e compartilha com ele a geometria
   (utils/videowall-stage-grid.util.ts). Se a lógica de grade divergir entre os dois, extraia
   para o util em vez de duplicar. Atenção ao empacotamento: o mirror-view é standalone e o
   stage não é, então o componente novo precisa resolver isso explicitamente, não por acidente.

2. Estados visuais por slot, com padrão de cor documentado.
   No mínimo: livre, ocupado por outro, ocupado pelo próprio operador, selecionado como destino,
   e oculto (isActive: false). Cor nunca sozinha: acompanhar de ícone do catalog.ts de ui-icons
   e de rótulo textual, com contraste AA. Estados vêm de tokens do design system, não de hex solto.

3. Escolha do slot de destino antes do envio.
   Clique e teclado (setas para navegar, Enter para escolher, foco visível). Escolher um slot
   ocupado é permitido e abre confirmação explícita que nomeia quem sai antes de confirmar.
   O envio (mirror.send) passa a levar o destino escolhido junto, e nã
   onde a tela aparece no lugar errado na parede e só depois pula para o lugar certo.

4. Dropdown de presets de layout da parede, no padrão visual do layout
   Inclui o caso pedido: mandar a própria tela em 1x1, ocupando a parede inteira.
   Aplicar um preset recalcula o retângulo de todas as telas da parede, então isso desloca
   telas de outras pessoas e exige confirmação nomeando o efeito.
   Presets fixos e grupos salvos (UC-052) aparecem no mesmo dropdown, em seções separadas,
   porque para o operador é a mesma pergunta: "que arranjo eu quero agora".

5. Drag and drop no player, além do resize que já existe.
   Arrastar move a tela de slot; soltar sobre uma tela ocupada troca as duas de lugar.
   Contrato de payload e comportamento no padrão de videowall-drag-pay
   utils/layout-reflow.ts do mosaico. Limite de 1..16 por eixo, o mesmo que o backend valida.
   Enquanto o ponteiro arrasta, o desenho é local; a verdade continua sendo a ocupação que
   chega pelo push, exatamente como resizePreview já faz hoje.

6. Amarração nativa NovaStar H9 desde já, mesmo em playground.
   Cuidado, e é por isso que este item está por último: a INT-014, que previa preset.create,
   preset.load e preset.read no equipamento, está marcada como superseded desde 14/08 e o
   motivo declarado é que a plataforma NÃO autora composição no equipa
   escopo). O cabeçalho dela aponta para uma INT-018 que hoje é outra coisa (Hikvision ISAPI),
   então trate esse ponteiro como quebrado e siga o caminho vivo: INT-
   Ou seja: "preset" nesta entrega é conceito da plataforma, nunca objeto salvo no painel.
   Cada gesto da interface tem que descer como reconciliação de camada
   depois só o que falta, layerId derivado do slot (<prefixo>-r<linha>c<coluna>), trocar fonte
   com layer.changeSource em vez de recriar, e nunca escrever sem ler antes.
   Onde o backend ainda não tiver o comando, declare o contrato espera
   forma honesta na tela. Nunca simule sucesso.

Lacunas reais que encontrei. Traga a decisão para mim antes de implementar, não escolha sozinho.

a) Terminologia. Você vai ler "cena" no meu pedido, mas no domínio "ce
   (UC-016, VideoWallScene), aquilo que a UC-051 projeta como ocupação NATIVE_SCENE. O que eu
   descrevi é slot da parede, que hoje é o retângulo de um share, e no
   termo único e use nas três camadas (código, spec, UI). Não reaproveite "cena" para as duas
   coisas.

b) A parede tem um ocupante de cada vez (RF-VW-19, matriz da UC-051 seção 4), e IVideowallOccupancy
   tem UM ownerId. Já IVideowallMirrorShare não tem dono nenhum. Então
   não é representável no contrato de hoje. Ou o meu pedido implica vários donos simultâneos na
   parede (mudança de modelo, não de tela), ou os slots são todos do mesmo dono e a cor de
   "ocupado por outro" só faz sentido no momento da tomada. Decida e m
   define se entra campo aditivo no share ou não.

c) Tomar e sobrescrever hoje são coisas diferentes e com gates diferen
   autoridade administrativa para deslocar dono. BR-VWM-012 da UC-052 diz o contrário para
   curadoria: qualquer membro do sistema pode mexer no arranjo, inclusive ocultar a tela de
   outro, porque "o arranjo é da sala". Sobrescrever um slot ocupado c

d) ITakeVideowallMirrorRequest não aceita retângulo de destino. Escolher o slot antes de enviar
   pede campo aditivo no take, ou vira take seguido de PATCH, que são
   com a tela no lugar errado, visível na parede. Prefiro o campo aditivo; confirme.

e) Não existe escrita em lote. Aplicar preset ou trocar duas telas vir
   outro, porque "o arranjo é da sala". Sobrescrever um slot ocupado cai em qual dos dois?

d) ITakeVideowallMirrorRequest não aceita retângulo de destino. Escolher o slot antes de enviar
   pede campo aditivo no take, ou vira take seguido de PATCH, que são duas idas e um instante
   com a tela no lugar errado, visível na parede. Prefiro o campo aditivo; confirme.

e) Não existe escrita em lote. Aplicar preset ou trocar duas telas vira N PATCHes sem transação,
   e cada um dispara um push de ocupação. Ou aceitamos o estado intermediário aparecendo na
   parede, ou entra endpoint de arranjo em lote no ms-cameras. Sua recomendação, com o custo.

f) Sistemas de coordenadas divergem: IVideowallCell usa row/col base zero, IVideowallMirrorShare
   usa gridColumn/gridRow base um (o CSS já consome assim). Não misture ao reusar o drag do mosaico.

Restrições inegociáveis
- Realtime por WebSocket e broadcast. Polling é proibido, inclusive como fallback e inclusive
  disfarçado de refetch em cadência fixa.
- Zero mock. Dado sempre de endpoint real. Sem dado, estado vazio honesto, nunca placeholder
  inventado nem controle desabilitado sem explicação.
- Angular 21 no padrão do módulo: signals, computed, OnPush, inject, c
  Zard UI para primitivas e Font Awesome PRO por chave do catalog.ts, nunca ícone solto.
- i18n obrigatório em libs/contracts/src/lib/i18n/locales/<locale>/vms.json, nas chaves do
  namespace que a tela já usa (vms.target.*, vms.mirror.*). Nenhuma st
- Imports por alias (@/..., @attlas/..., @web-attlas/...). Nada de caminho relativo profundo.
- Erros ramificam por errorCode, nunca por mensagem. Reuse VideowallGroupErrorCodes e os
  constantes de erro de mirror e projection que já existem em contract
- Comentário só onde o comment-guide justifica, com referência de spec no formato
  <ID> secao N (DD-*) - slug em en-US. Comentário que parafraseia código é reprovado.
- Não rodar test, lint, build nem docker localmente. O CI valida.

Ordem de trabalho
1. Responda as seis lacunas acima com recomendação e custo, e espere minha decisão.
2. Escreva ou atualize a spec atômica (UF-031 e UF-032, ou UF nova se
   estados, contratos consumidos, erros e critérios de aceite. Me mostre o diff da spec.
3. Só depois implemente, um commit com footer Spec: <ID>.

Critério de pronto
Escolher slot, sobrescrever com confirmação, trocar preset, arrastar e trocar duas telas de
lugar, tudo refletido nas outras abas pelo push de ocupação, sem regre
lugar, tudo refletido nas outras abas pelo push de ocupação, sem regressão nos estados
DENIED, HELD e ERROR do espelho, e com teste de integração cobrindo caminho feliz, recusa de
captura, slot tomado no meio do gesto e erro do processador.

O ganho maior sobre a primeira versão é o item 6 e as lacunas b, c, d:ntar seleção de slot em cima de um contrato que não tem dono por slot, e ia mandar comando de preset para um equipamento onde presets foram deliberadamente cortados do escopo.