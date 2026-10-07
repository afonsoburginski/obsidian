---
tags:
  - doc
  - analitico
  - frontend
aliases:
  - "Analítico - Frontend do attlas-design"
  - "Analítico - Tela de Métricas no web-attlas"
  - "Tela de Métricas no web-attlas"
  - "Métricas do Analítico - estado da tela"
  - "Registro - ajustes do módulo em 17 e 18 de setembro"
atualizado: 2026-10-07
---

# Analítico - Frontend

Volta para [[Analítico]].

## Resumo

O módulo vive em `/analytics` no `web-attlas`, com quatro abas: Detecção, Instâncias, Incidentes e Métricas, cada
uma um módulo lazy. A Detecção é o único lugar que escreve região, laço e configuração do equipamento; as outras
telas leem. O detalhe da câmera tem uma aba Analítico só de leitura. As rotas do backend estão em
[[Analítico - Arquitetura e estratégias#Rotas REST]], e a ordem dos passos, em [[Analítico - Fluxos]].

## Telas

| Tela | Rota | Componente | O que mostra |
| --- | --- | --- | --- |
| Entrada do módulo | `/analytics` | redireciona | Abre em Incidentes |
| Detecção, escolha | `/analytics/detection` | `CameraPickerPage` com `detectionLandingGuard` | Abre direto na primeira câmera que tem analítico; sem nenhuma, fica a lista com os estados vazio e de erro |
| Detecção | `/analytics/detection/:cameraId` | `DetectionPage` | Vídeo com regiões, laço, caixas e cards de métricas; os blocos de configuração de cada região; o painel lateral de câmeras |
| Instâncias | `/analytics/instances` | `InstancesPage` | Unidades embarcadas e Neural Labs na mesma lista, e o painel "Adicionar analítico" (descoberta na rede, registro manual e "Cadastrar servidor Neural Labs") |
| Instância | `/analytics/instances/:instanceId` | `InstanceDetailPage` | Cartão do equipamento com Vincular e Sincronizar, edição, remoção (só no banco), câmeras vinculadas, placa ACOM vinculada e, na Neural Labs, o par `ComputerID` e `CamID` de cada câmera |
| Incidentes | `/analytics/incidents` | `IncidentsPageComponent` | Fila em Lista ou Tabela com mapa, painel lateral, chips de filtro, faixa de criticidade, ação em massa com resultado por item e atualização ao vivo pelo canal do Sistema |
| Incidente | `/analytics/incidents/:id` | `IncidentDetailPageComponent` | O incidente com imagem e vídeo lidos do equipamento e o tratamento |
| Métricas | `/analytics/metrics?subtab=<face>` | `MetricsPageComponent` | Três faces: `atspm`, `virtualLoop` e `incidents`. Exportar gera XLS ou PDF |
| Aba Analítico do detalhe da câmera | `/cameras/devices/:id` | `CameraAnalyticsTabComponent` | Estado do analítico e regiões pintadas pelo modo de analítico do player, só leitura |

Peças compartilhadas:

| Peça | Caminho |
| --- | --- |
| Abas do módulo | `apps/web-attlas/src/app/modules/analytics/constants/analytics-nav.constant.ts` |
| Endereços das telas | `apps/web-attlas/src/app/modules/analytics/constants/analytics-routes.constant.ts` |
| Componentes comuns às abas (painel de câmeras `atspm-camera-panel`, placa ACOM, painel de criação de instância) | `apps/web-attlas/src/app/modules/analytics/components/` |
| Desenho sobre o vídeo do player compartilhado | `apps/web-attlas/src/app/core/shared/components/camera-stream-player/analytics/`, alimentado pela porta `PLAYER_ANALYTICS_FEED` ligada ao `CameraAnalyticsLiveService` |
| Specs das telas | `apps/web-attlas/docs/modules/analytics/atomic/` (UF-042 a UF-062, UF-722, UF-725 a UF-730). O `scripts/spec-id.mjs` tira o namespace do caminho de docs, então spec nova vai nessa pasta |
| Traduções | `libs/contracts/src/lib/i18n/locales/<locale>/analytics.json` |

## Comportamentos que não são óbvios

### Detecção

- **Sem autoplay.** A sessão de vídeo abre por gesto do operador, e quem decide é a página, não o player.
- **A edição congela o quadro do preset ativo.** A imagem entra assim que os presets respondem, antes da
  configuração, e só o tipo de analítico da câmera é lido ao abrir.
- **Os blocos aparecem conforme o build.** Classificação, laço com a linha ativadora, incidentes, métricas de
  desempenho com a faixa associada e a placa ACOM seguem o descritor de capacidade; caixa só com `FRAME_REPORTING`.
- **Linha ativadora e traçado do recuo só na edição.** Na edição, a barra à direita do player ajusta o recuo da
  região entre duas setas (0,05 por clique, 0,01 pela rolagem).
- **Cards de métricas sobre o vídeo.** Um card por faixa (ativos, volume, fluxo, velocidade média, tempo de
  percurso, tempo parado e paradas), o agregado da aproximação, a lista de objetos rastreados e o objeto
  selecionado. Todos são calculados no navegador a partir das caixas ao vivo. Um switch no menu de métricas da
  barra do player liga os cards, que se arrastam entre quatro zonas (laterais, topo e base) e recolhem.
- **Celular e tablet.** No celular os cards saem de cima do vídeo e viram uma faixa deslizável abaixo dele; no tablet
  abrem recolhidos e mais estreitos, e o arraste no toque pede toque longo.
- **Cores das classes.** O botão de paleta no bloco de detecção e classificação abre "Cores das classes". A cor de
  cada classe pinta as caixas e o ponto da lista de objetos rastreados; objeto parado fica âmbar.
- **A visão é salva por usuário e câmera.** Cards, zonas, camadas e cores vão para
  `PUT /api/cameras/:id/view-preferences` 600 ms depois da última mudança, e a tela lê uma vez por câmera. Uma
  cópia no navegador pinta na hora e segura a visão quando o `ms-cameras` está fora; a do serviço vence quando é
  mais nova. Se a rota responde 404, a tela segue só com a cópia local pelo resto da visita.
- **A caixa é um sólido em perspectiva.** A face de trás encolhe em direção ao ponto de fuga da câmera, aprendido do
  próprio tráfego (mediana de três trilhas ou mais); câmera que não calibra fica com a caixa plana. Um filtro de
  Kalman de velocidade constante suaviza centro e tamanho. O chip mostra classe e velocidade, e o objeto parado
  mostra os segundos parados.
- **A região é pintada no chão.** Toda camada de região é mascarada na face da frente de cada veículo, para passar
  por baixo do carro. A região acesa fica verde, e verde é só o sinal de detecção.
- **Pausa segura o quadro.** Com o vídeo pausado, cards, caixas e regiões ficam no instante da pausa.
- **O estado na badge é do analítico.** A badge diz "Analítico offline", "Não monitorado" e equivalentes, para não ser
  lida como a câmera fora do ar.

### Player compartilhado

O player expõe o estado da imagem (`none`, `loading`, `live`, `paused`, `failed`) lido do próprio `<video>`. O modo de
analítico do player compartilhado, usado pela aba Analítico do detalhe da câmera, só desenha em `live`; a Detecção
desenha por conta própria.

### Instâncias, Incidentes e Métricas

- A face de Métricas só abre para o analítico que a câmera tem.
- As Métricas releem por socket (`camera:analytics:metrics` e ocupação), sem polling.
- Na fila de Incidentes, escolher um nível na faixa de criticidade filtra a fila, mas a faixa mantém o total e a
  contagem de cada nível.

### A referência visual

O módulo foi desenhado e codado antes no repositório `atmanadmin/attlas-design`, em
`modulo-analitico/entrega-frontend/`: um Angular 21 por módulo, com dados de mentira (interceptor HTTP local, sem
backend, sem testes, texto pt-BR fixo). Porta-se HTML, CSS e fluxo de interação; serviços e interfaces são reescritos
contra `@attlas/contracts`. As decisões de interface do módulo (fila, falso positivo, menus de status, paginação,
mapas) estão no `decisoes.md` daquele repositório, com IDs `ANL-*`. Para igualar uma tela, ver a skill
`attlas-web-ui`.

### Armadilhas conhecidas

- **Serviço com socket, timer ou polling nunca vai em `providers` de módulo lazy.** O injector de módulo lazy não é
  destruído, então o `DestroyRef` não dispara e a tela segue inscrita depois de sair. `MetricsCacheStore`,
  `MetricsLiveService` e `MetricsCameraCatalog` ficam nos `providers` do `MetricsPageComponent`.
- **O painel de câmeras é compartilhado entre as faces.** Perder um atributo no mount de uma face (o `showMap`, por
  exemplo) não quebra a outra nem acende teste.
- **Porte grande do protótipo pede auditoria própria**, não review de tela: o porte de Instâncias e Incidentes trouxe
  regressão de paginação, rótulos trocados e um defeito no `ModulePage` compartilhado.
- **Veredito de "não portar" se confere** contra o serviço que serve o dado e contra o diretório que nasceu no
  produto, nunca pelo nome da tela ou pela árvore do protótipo.

## Glossário

| Termo | O que é |
| --- | --- |
| Módulo lazy | Módulo Angular carregado só quando a rota abre |
| Face | Uma das três sub-abas de Métricas |
| Ponto de fuga | Ponto da imagem para onde convergem as linhas paralelas da via; dá a profundidade da caixa |
| Filtro de Kalman | Estimador que suaviza posição e tamanho da caixa entre relatórios do equipamento |
| Recuo do laço | Fração de 0 a 1 que afasta a linha ativadora da borda da frente da região em direção à borda do fundo (`loop_offset` no equipamento, `loopOffset` no contrato) |
| `FRAME_REPORTING` | Capacidade do build de mandar as caixas de cada quadro |
