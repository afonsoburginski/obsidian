---
tags:
  - qa
date: 2026-10-21
---

# QA: issues trabalhadas em 21/10/2026

Legenda: `[x]` feito e mergeado na `develop` · `[ ]` pendente (não feito).
Importante para a QA: **nada foi testado localmente** (sem teste, lint ou build rodados) e o CI da `develop` estava vermelho por módulos que não são destes. Todo `[x]` precisa de validação no dev.v2. Itens visuais não foram vistos em navegador.

## Fechadas (issue encerrada)

- [x] **#8234** Evento de câmera lista acionamento de incidente de câmera de outro Sistema. PR #8544. Testar: com dois Sistemas, câmeras caindo pela mesma causa em até 60 s; no Sistema B, "Acionamentos Relacionados" só mostra incidentes do próprio Sistema.
- [x] **#8231** "Enviar ao painel" sem processador de videowall. PR #8545. Testar: num Sistema sem processador, aparece "Não há painel de videowall conectado a este Sistema." (sem nome de classe nem ID) e o mosaico permanece.
- [x] **#8225** Filtros Área e Subárea de Eventos com opções que não existem. PR #8626. Os dois filtros saíram da tela enquanto o catálogo for mock. Testar: Câmeras > Eventos > Filtros sem Área nem Subárea.
- [x] **#8232** "Conexão Intermitente" com média "0.0" e câmera sem queda como "Mais instável". PR #8628. Testar: sem quedas aparece "Nenhuma queda no período", "Pior dia" mostra "—", média no formato do idioma.
- [x] **#8236** Câmera PTZ com selo na lista e chave desligada na edição. PR #8628. Testar: a chave PTZ do formulário acompanha o selo da lista.

## Feitas em parte (a issue continua aberta)

- [x] **#8230** Coluna Acionamentos "1 acionamentos". PR #8632. Plural correto.
- [x] **#8229** Detalhe do evento "ACCC8E4B2E10 - undefined". PR #8632. Sem "undefined" quando falta o endereço (vale também para o diálogo "Reportar ocorrência").
- [x] **#8223** Mensagem técnica em inglês "timeout of 5000ms exceeded". PR #8632. Mensagem em português.
- [x] **#8289** Ajustes visuais de Eventos (lista, filtros e detalhe). PR #8632. Badges, estados vazios, cards sem header, card de Observações. Conferir contra o screenshot da issue.
- [x] **#3023** Novo layout no Videowall não atualiza o campo. PR #8633. O rótulo do layout agora acompanha a divisão local.
  - [ ] Reorganizar as câmeras corretamente ao trocar de layout (não confirmado).
- [x] **#8288** Tabs e menu do player fora do padrão no Videowall. PR #8633. Tabs do card do processador em underline.
  - [ ] Texto de "Realce automático" no menu do player (o toggle foi removido pela UF-044; não existe nesta base).
- [x] **#8284** Ajustes visuais no detalhe da câmera. PR #8634. Menu ⋮ com "Configurar detecção", painel de abas sempre visível com estado vazio, métricas de saúde, badge das regiões.
  - [ ] Item 10: coluna "Table select" nas tabelas.
- [x] **#8285** Ajustes visuais no Monitoramento de Vídeo. PR #8635. Divisória do mosaico alinhada ao padrão e checkbox sem sombra (**vale para todos os checkboxes do app: conferir outras telas**).
  - [ ] Item 2: espaço em branco entre posições (causa não achada).
  - [ ] Item 9: estados de hover, renomear e excluir do card (depende de decisão de produto).
- [x] **#8291** Ajustes visuais e modal vazia em "Comparar por filtro". PR #8636. Estado vazio na modal, tooltips das roscas e do heatmap, barra fixa.
  - [ ] Item 10 da issue.
- [x] **#8292** Ajustes no player, cards e navegação da Detecção. PR #8637. Tooltip do botão de métricas avançadas em primary, botões do cartão centralizados, vídeo até a borda esquerda no desktop (conferir se não surgiu scroll horizontal).
- [x] **#6741** Cartão da câmera exibe `{value}` em "Última atualização". Verificado: já estava corrigida na base (há teste). Confirmar no ambiente e fechar.
- [x] **#8433** Configuração da detecção. PR #8743.
  - [x] Laço virtual: o dropdown de classes reflete as classes da detecção antes do primeiro Salvar.
  - [x] Vínculo faixa/detector aparece na hora, sem esperar o Salvar.
  - [x] Desativar a métrica de desempenho de uma região funciona (mostra erro se a leitura não traz o analítico).
  - [ ] "Puxa detectores de entrada e saída": a lista de faixas mistura as duas mãos de via de propósito (regra de 28/09, UF-722). Depende de decisão de produto e do traffic-model.

## Sem issue (pedidos diretos)

- [x] **Player: "Semáforos visíveis" listava todos os grupos.** PR #8546. Agora só os grupos do controlador virtual da interseção; sem controlador virtual o botão não aparece.
- [x] **Espelho de console no videowall (H9).** PR #8567, em cima da #8500 do Otávio (aprovada). Código entregue (tela única, take sem slot, captura 1080p/30 fps, fontes órfãs, validação da senha do leitor no boot). **Não validado com o H9 nem em sandbox.**
- [x] **Simulador de PMV** atualizado no dev.v2 (perfil com 50 PMVs; imagem anterior guardada como `pmv-simulator:previous`).
- [x] **Chronos Quito** (TCA, TCM, TPE): conferido na 1.0.4 (`7bdbd08a`), já em execução.
- [x] **Revisão de PRs de outros:** #8500 (aprovada), #8651, #8642, #8525, #8522, #8643 e #8659 (comentários postados).

## Follow-ups abertos

- #8629: falha transitória do lookup do Sistema fragmenta incidentes na correlação.
- Secret `VIDEOWALL_MIRROR_READER_PASSWORD` do dev.v2 (`ms-cameras-env`) está com 32 caracteres e não é só alfanumérica; a validação nova do boot recusa isso. Precisa de ajuste antes do próximo deploy do `ms-cameras`.
