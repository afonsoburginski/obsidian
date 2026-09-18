# Ajustes do módulo Analítico — 17 e 18 de setembro de 2026

Tudo o que mudou no módulo nos dois dias, por data e por tela. Cada item aponta a decisão em
`decisoes.md`. Referência visual de todos eles: o módulo de Alarmes (`attlas-alarmes.pages.dev`), medido
na tela ou no código publicado, e a tela de Incidentes do produto no dev.v2.

Três PRs mergeadas na `main`: **#278** (17/09, `18c991a6`, 44 arquivos), **#281** (18/09, `2f752d58`,
22 arquivos) e **#283** (18/09, `d240f151`, 11 arquivos). Decisões **ANL-531 a ANL-548**.

---

## 17/09/2026 — PR #278, decisões ANL-531 a ANL-540

### Incidentes · fila (lista)
- As quatro faixas por criticidade viram **um grupo só, "Todos"**, ordenado por data e hora. A pastilha
  da contagem fica no azul primary e o título do cartão sobe para semibold. (ANL-531)
- O status dos dados de exemplo passa a vir da idade do incidente: os mais novos são não reconhecidos,
  os fechados são os velhos; as doze primeiras linhas carregam os quatro níveis. (ANL-531)
- Ao clicar num chip de criticidade, a faixa passa a nomear o corte escolhido e a pílula da contagem
  fica na cor da criticidade. (ANL-531)
- **Menu "…" em cada linha** com a escala inteira em verbos — Devolver à fila · Reconhecer · Iniciar
  tratamento · Resolver · Indicar falso positivo —, glifos lidos do bundle do Alarmes, destinos
  inalcançáveis desabilitados em vez de escondidos. (ANL-532)
- "Atualizar status" sai da barra de seleção; entra **Indicar falso positivo** com tooltip. (ANL-532)
- A regra de transições vira peça única, lida pelo menu da linha, pelo rodapé do painel e pelo cabeçalho
  da página; o editor de status antigo foi apagado. (ANL-532)
- **Rodapé de paginação da lista igual ao da tabela**, medido nela: fundo cinza, select 72×32 branco,
  setas 32×32 com borda; a lista passa a ser paginada e compartilha página e tamanho com a tabela.
  (ANL-537)
- Badge de estado na linha de baixo do cartão, alinhado ao texto. (ANL-536)

### Incidentes · falso positivo
- "Cancelado" passa a chamar-se **Falso positivo**, com badge laranja. (ANL-533)
- O diálogo de confirmação ganha o campo **Motivo** (opcional), que pousa no histórico entre aspas; os
  quatro caminhos até o descarte perguntam igual. (ANL-533)
- Pela barra lateral não abre modal: o rodapé do painel vira o campo, "Marcar" e o x. (ANL-533)
- **Em tratamento** substitui "Em progresso" e é alcançável logo depois de Reconhecer; **Devolver à
  fila** é o desfazer de um falso positivo, e só dele. (ANL-534)

### Incidentes · painel lateral
- Rodapé = **Ver detalhes** (contorno, seta de sair do quadro) + **botão dividido** com o próximo ato e a
  setinha da lista; o bloco "Status do incidente" sai. Sem destino, o botão fica apagado com o nome do
  estado. (ANL-535)
- Dois **cartões-métrica** (Detectado em, Estado) abrem a aba Geral; o local sobe para sob o nome, com o
  olho do mapa. (ANL-536)
- Fim da aba Geral: **Vínculos** (ocorrências do Inventário), **Responsável** (select com os operadores)
  e **Registros** (o histórico feito por pessoa, mais novo em cima). Atribuir responsável gera registro.
  (ANL-536)
- A aba passa a chamar-se **Histórico do evento** e perde a frase explicativa. (ANL-536)

### Incidentes · página do incidente
- O cabeçalho troca o select de status pelo mesmo **botão dividido** do painel. (ANL-535)
- O badge de falso positivo do cabeçalho vai para o laranja, com os demais estados. (ANL-533)

### Incidentes · filtros
- O select de status do popover de Filtros vira **coluna de checkboxes**, todas marcadas por padrão.
  (ANL-538)
- Badge "Em tratamento" no token da casa (`--base-status-em-testes-foreground`). (ANL-538)

### Efeitos no módulo inteiro
- **Rodapé de paginação** do design system restilado na peça compartilhada: as quatro tabelas do módulo
  (Incidentes, Instâncias, incidentes relacionados, tabela bruta do Laço Virtual) ganham o mesmo rodapé.
  (ANL-537)
- **Catálogo de ícones** ganha três chaves (desfazer, tratar, rejeitar), lidas do bundle do Alarmes.
  (ANL-532)
- **Métricas**: a legenda e os rótulos de status do gráfico "Incidentes por status" passam a dizer
  "Em tratamento" e "Falso positivo", acompanhando a renomeação. (ANL-533, ANL-534)
- **Cabeçalho de página compartilhado** (Incidentes e Instâncias): o badge de falso positivo no laranja.
  (ANL-533)

### Método
- Regra registrada, dita três vezes no dia: **parar de deduzir — procurar a peça que já existe, seguir o
  design system ou a referência enviada e medir nela** antes de escrever. (ANL-539)
- Ficou em aberto (ANL-540): menu antigo na face de tabela, "Ao cancelar" no corpo do falso positivo,
  rótulos do popover e quatro badges fora dos tokens, rodapé quebrando abaixo de ~600px.

---

## 18/09/2026 — PRs #281 e #283, decisões ANL-541 a ANL-548

### Efeitos no módulo inteiro
- **A base de todos os mapas** (Incidentes, painel lateral, página do incidente, Métricas ATSPM e Laço
  Virtual) passa a ser a do Painel de Operações, lida no bundle do Alarmes: Mapbox Standard em tema
  padrão, luz dia/noite pelo tema, volumes 3D, ícones de marco, rótulos de rua e de lugar. Pinos, calor e
  zonas não mudam. Peça nova ao lado do `ui-map`; a receita do Modelo de Tráfego ficou intacta. (ANL-542)

### Incidentes · mapa
- O mapa de Incidentes abre em **370px** e a fila toma o resto; só nesta tela. (ANL-541)

### Incidentes · Lista e Tabela
- O formato de cartões passa a chamar-se **Lista** e é o padrão em qualquer largura. (ANL-543)
- A face de **Tabela** volta ao lado da lista, conforme a tela do produto no dev.v2, lida no bundle: Tipo
  com a bolinha da criticidade, Data e hora com o relógio e o tempo decorrido. (ANL-543)
- Mesmo corte, mesma página e mesma seleção nas duas faces; o par Tabela/Lista volta à barra; o botão de
  colunas só aparece na tabela. (ANL-543)
- Rodapé da tabela colado no pé do cartão mesmo com poucas linhas; a contagem "10 de 229 incidentes"
  volta ao rodapé da lista. (ANL-543)
- Barra da esquerda da tabela **pela criticidade, em 2px**, como a lista (era o status, em 4px).
  (ANL-543)
- Registrado para decidir: a tabela mede 984px numa coluna de 882 e rola para o lado, como a do produto.
  (ANL-543)
- **Pílula de criticidade antes do título** em cada cartão, nas medidas do cartão do Alarmes (2×8 de
  respiro, texto 12 em 500, vão 6 até o título), na mesma receita de cor da pílula de estado. (ANL-546)
- **Calendário ao lado da data**, no mesmo tamanho e vão do relógio. (ANL-546)

### Incidentes · menu de status (linha, painel e página)
- **Devolver à fila** passa para o fim do menu, depois de Indicar falso positivo. (ANL-544)
- **Tooltip em todos os itens**, inclusive os desabilitados, azul primary, à esquerda, 320px: o
  disponível diz o que a ação faz, o cinza diz por que não. Os itens cinza recuperam o ponteiro sem
  recuperar o clique. (ANL-544)

### Incidentes · textos
- "Status" vira **Estado** no popover de Filtros. (ANL-545)
- Diálogo do falso positivo: título **Marcar como falso positivo** (sem identificador nem contagem);
  corpo "Ao cancelar, o incidente **é marcado** como falso positivo. A detecção continua no registro do
  analítico."; a nota fica 8px mais perto da frase; o tooltip do Motivo fica com uma frase só. (ANL-545)

### Incidentes · página do incidente
- Tabela de incidentes relacionados: barra da esquerda em **2px**, baixa no cinza da borda, badge de
  criticidade na receita da tabela principal (badge e barra na mesma cor). (ANL-547)
- Costura do botão dividido do cabeçalho em 1px, como no painel. (ANL-548)

### Incidentes · rodapé do painel
- Costura do botão dividido em **1px**: a seta perde a borda esquerda e fica só o pixel de fundo que o
  botão do ato já deixa passar, como o `z-button-group` do Alarmes. (ANL-548)
- **Ver detalhes** nas medidas do Alarmes: 32 de altura, 10 nas laterais, vão 4 entre glifo e palavra,
  texto 12,8 em 500, glifo 11px. (ANL-548)

### Ficou registrado, sem mexer
- Badge de Status da tabela de relacionados nos tons genéricos; a palavra "Status" no cabeçalho da coluna,
  em Detalhes gerais e nos relacionados.
- Itens de ANL-540 ainda abertos: menu antigo na face de tabela; rótulos do popover e badges fora dos
  tokens; rodapé quebrando abaixo de ~600px.

---

## Fora da tela, nos dois dias
- CI do GitHub parado por cobrança da conta desde 17/09 18:59: as PRs foram mergeadas com portão, tipos e
  119 testes verdes localmente; o Pages não publica até a cobrança destravar.
- Telas sem mudança nos dois dias: Detecção, Instâncias (só o rodapé de paginação e o badge do cabeçalho
  compartilhado, acima) e o resto de Métricas além do mapa e dos rótulos de status.
