---
tags:
  - attlas
  - task
  - sprint-33
  - analitico
  - frontend
titulo: "[Front] Telas do Analítico - mapa do Laço Virtual, Incidentes paginados, laço que acende por ocupação e sessão presa ao endereço antigo"
frente: Analítico
tamanho: 8 pts
pr: "#3712"
status: "PR #3712 fora de draft e MERGEABLE em 18/09, depois de resolver o conflito de `core.json` nos quatro idiomas. Cresceu além das duas telas: exportação XLS e PDF ponta a ponta (UC-080 na fila de Incidentes e UC-081 nas três faces de Métricas), correção do mapa de fontes do analítico e do arquivo que saía com chave de i18n crua. CI rodando."
sprint: "[[Attlas - Sprint 33]]"
atualizado: 2026-09-18
---

# Telas do Analítico - mapa do Laço Virtual e paginação dos Incidentes

Os ajustes que sobraram das telas do módulo depois que a Detecção fechou. São menores que a frente da
Detecção e não são menos importantes: os dois aparecem no primeiro minuto de uso.

## 1. O mapa não aparece na aba Laço Virtual das Métricas

**Conferido na tela em 16/09**, e não é markup faltando: a aba existe e o `showMap` já está ligado no
`app-atspm-camera-panel` dentro do `virtual-loop-panel.component.html` (linha 129). Clicando em
**Mapa** o container `atspm-panel__door-map` mede **0 x 0**, com **zero** `.leaflet-container`, zero
tiles e zero pinos.

```
tamanho: [0, 0]   leaflet: false   tilesCarregados: 0   marcadores: 0
```

O que isso descreve é o sintoma clássico de mapa montado dentro de container oculto: o painel da aba
nasce com `metrics-panel--hidden` e o Leaflet mede a altura no momento em que monta, ficando com zero
para sempre. Quem já tem o mesmo painel funcionando é a tela de **Detecção**, onde ele monta visível -
o que reforça a hipótese e dá o caso de controle.

**O que tem de valer no fim:** abrir Métricas → Laço Virtual → Mapa mostra os pinos das câmeras com
laço, clicar num pino seleciona a câmera como já faz na Lista, e trocar de aba e voltar não deixa o
mapa cinza.

**Onde olhar:** a hipótese a confirmar antes de escrever código é se o `invalidateSize()` do Leaflet
é chamado quando a aba passa a visível. Se o `ui-map` não expõe isso, a correção é montar o mapa
tarde (só quando a aba fica ativa) em vez de corrigir o tamanho depois - montar tarde é o que não
deixa dívida.

## 2. A lista lateral de Incidentes precisa dos dois modos de paginação

Hoje a `app-incidents-queue` lê **em janelas**: pede a primeira página e vai anexando com "carregar
mais", com `INCIDENTS_DEFAULT_PAGE_SIZE = 20`. Conferido na tela: **50 itens** na lista, **nenhum
paginador**, e o container sem `overflow` próprio (`alturaVisível == alturaTotal`, `overflow:
visible`) - quem rola é a página inteira.

O backend já pagina de verdade: `camera-incidents.service.ts` manda `page` e `pageSize` e lê
`response.pagination.itemsPerPage`, então **nada de novo é preciso no `ms-cameras`**.

**O pedido é ter os dois controles, não escolher um:**

- **Rolagem contínua** - a lista rola dentro da própria lateral (não a página) e busca a próxima
  página ao chegar perto do fim. É o modo de quem trabalha a fila de cima para baixo.
- **Navegação entre páginas** - primeira/anterior/próxima/última com o número da página e o total,
  para quem precisa chegar a um ponto conhecido sem rolar até ele.

**O que tem de valer no fim:** os dois modos sobre a MESMA fonte, sem duas consultas concorrentes;
trocar de modo não perde a posição nem reinicia a lista; filtro ou busca volta para a primeira página
nos dois; e o total de itens aparece para o operador nos dois.

**A decisão que a spec precisa fechar:** se os dois modos convivem ao mesmo tempo (rolagem infinita
COM paginador no rodapé) ou se há um seletor. Convivendo, o paginador tem de significar "pule para a
página N" e limpar a janela acumulada - senão a contagem que o operador lê não bate com o que está na
tela.

## Por que numa PR só

São duas telas diferentes, mas do mesmo módulo, ambas de front, ambas pequenas, e nenhuma depende da
outra. Separar custaria duas rodadas de CI numa fila que já está cheia. Se a investigação do mapa
revelar mudança no `ui-map` (lib compartilhada), aí sim ela sai para uma PR própria - mexer em lib
compartilhada não entra de carona.

## 3. O laço da DEMO não acende quando o objeto passa

A região acende a partir de `litRegions`, que o interpolador define como "regiões com pelo menos um
objeto **desenhado**" - ou seja, a partir das caixas. O laço embarcado da DEMO não reporta caixa
alguma: ele fala o protocolo TCP do `atman_virtual_loop_analytic` e o que responde é **ocupação**, a
bitmask de qual laço está ocupado. A tela pede um sinal que aquele equipamento não produz.

O dado existe: o `RegionOccupancyPublisher` já leva ocupação para `attlas.detectors.raw`, que alimenta
o controlador. `litRegions` passa a ser a união de duas fontes - objetos desenhados e ocupação
reportada -, o que exige um evento de ocupação no gateway, que hoje emite `detection`, `frame`,
`stream` e `health` e nenhum carrega ocupação por região.

## 4. Trocar o endereço da câmera não troca o vídeo entregue

Visto no EC2 em 17/09: corrigido o IP da EMBEDDED, a miniatura passou a mostrar a câmera certa e o
**play seguia entregando a antiga**. O relay vivo mantém a origem com que nasceu, e o caminho no media
server tem o nome do `cameraId` - o player pede o mesmo caminho e recebe o que estiver publicado nele.
A miniatura acerta porque é buscada na hora; o vídeo erra porque vem de um relay que subiu antes.

O endereço é lido ao abrir a sessão, e uma sessão aberta não sabe que a origem mudou - ela só morre
pelo reaper, quando o último espectador sai. Salvar endereço, porta, credencial ou perfil passa a
encerrar a sessão daquela câmera, e só dela. Renomear não encerra nada.

No EC2 isto foi resolvido na mão (relay derrubado, path removido, media server reiniciado); a spec é
para o produto não depender disso.

## A bancada está pronta

O EC2 dev foi alinhado com a local em 17/09 ([[Registro - o EC2 dev alinhado com a bancada local em 17 de setembro]]): três câmeras, analítico só embarcado, consumidor lendo o broker de campo e recebendo
quadros. As duas telas desta task podem ser trabalhadas contra dado real nos dois ambientes - o que
importa sobretudo para a fila de Incidentes, que só tem o que paginar com incidente real chegando.

## O que a PR acabou entregando (18/09)

A task nasceu com duas telas e terminou com quatro frentes, todas no mesmo módulo:

- **Incidentes paginados**: linhas por página abaixo da lista, célula do "selecionar todos" alinhada com a
  coluna, estado de seleção igual ao da referência, e o rodapé com a contagem de volta. O menu de exportar
  agora só habilita com incidente marcado.
- **Exportação XLS e PDF de verdade**, ponta a ponta. A fila de Incidentes ganhou a UC-080 (o servidor lê o
  conjunto filtrado em lotes e transmite o arquivo enquanto lê, com teto de 20 mil linhas recusado antes do
  primeiro byte). As três faces de Métricas (ATSPM, Laço Virtual e Incidentes) ganharam a UC-081: como o
  dado delas é composto no browser a partir do `ms-detector-history`, o serviço que faltava é de
  renderização - a tela manda título, filtros, colunas e linhas, e o servidor devolve o arquivo pelos
  mesmos renderers, sem segunda implementação de xlsx e pdf. O ATSPM exporta em formato longo
  (Intervalo, Métrica, Valor) porque uma coluna por bucket estouraria o teto de colunas já na abertura.
- **Defeito achado na própria UC-080**: nenhuma chave `incidents.report.*` existia em locale nenhum, então
  o arquivo baixado saía com a chave crua no lugar do texto. Corrigido nos quatro idiomas, junto com o
  cabeçalho do PDF que anunciava uma coluna e escrevia outra.
- **Analítico ao vivo**: o mapa que liga o `source_id` do device à câmera só se reconstruía quando chegava
  mensagem, o que virava um ciclo fechado. Ganhou timer próprio de 30s. Detalhe em
  [[Analítico - Arquitetura e estratégias]].

No front, o download deixou de viver preso na tela de Incidentes: blob, `Content-Disposition`, trava de
clique duplo e o aviso de falha viraram uma peça só, usada pelas quatro telas.

## Ver também

[[Detecção - a caixa desliza a sessenta quadros por segundo]] ·
[[Streaming - a queda para HLS e a tela preta que vinha com ela]] ·
[[Registro - o EC2 dev alinhado com a bancada local em 17 de setembro]] ·
[[Validação - as 34 PRs, uma a uma]] ·
[[Métricas - por que as telas não mostram nada no dev2]] ·
[[Plano - Streaming sem vazamento de publicador]]
